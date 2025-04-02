import bcrypt from "bcryptjs"
import { and, eq, ne } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { db } from "@/src/db"
import { users } from "@/src/db/schema"

// 표준 타입 정의 - Next.js가 내부적으로 사용하는 params 타입
type DynamicRouteParams = {
  params: {
    id: string
  }
}

// 특정 사용자 조회 API
export async function GET(
  request: NextRequest,
  context: DynamicRouteParams
) {
  const id = context.params.id

  try {
    // 권한 확인 (관리자만 접근 가능)
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 })
    }

    const userData = verifyJwtToken(token)

    if (!userData) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    // 요청한 사용자가 관리자인지 또는 자신의 정보를 요청하는지 확인
    const requestingUser = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userData.id))

    if (requestingUser.length === 0) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
    }

    const user = requestingUser[0]
    const isAdmin = user?.role === "admin"
    const isSelf = user?.id === id

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
    }

    // 특정 사용자 정보 조회
    const userInfo = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        hourlyRate: users.hourlyRate,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))

    if (userInfo.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    return NextResponse.json(userInfo[0])
  } catch (error) {
    console.error("사용자 조회 오류:", error)
    return NextResponse.json({ error: "사용자 정보를 조회하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}

interface UpdateUserData {
  name?: string
  email?: string
  passwordHash?: string
  role?: string
  hourlyRate?: string
  phoneNumber?: string
}

interface RequestData {
  name?: string
  email?: string
  password?: string
  role?: string
  hourlyRate?: number
  phoneNumber?: string
}

// 사용자 정보 수정 API
export async function PUT(
  request: NextRequest,
  context: DynamicRouteParams
) {
  const id = context.params.id

  try {
    // 권한 확인 (관리자만 접근 가능)
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 })
    }

    const userData = verifyJwtToken(token)

    if (!userData) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    // 요청한 사용자가 관리자인지 또는 자신의 정보를 수정하는지 확인
    const requestingUser = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userData.id))

    if (requestingUser.length === 0) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
    }

    const user = requestingUser[0]
    const isAdmin = user?.role === "admin"
    const isSelf = user?.id === id

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
    }

    // 수정할 사용자가 존재하는지 확인
    const existingUser = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.id, id))

    if (existingUser.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    // 요청 데이터 파싱
    const requestData = (await request.json()) as RequestData
    const { name, email, password, role, hourlyRate, phoneNumber } = requestData

    // 수정할 데이터 준비
    const updateData: UpdateUserData = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email

    // 시급 처리 - null, undefined, 또는 숫자값 허용
    if (hourlyRate !== undefined) {
      if (hourlyRate === null) {
        // null인 경우 - 데이터베이스에서도 null로 설정
        updateData.hourlyRate = null
      } else {
        // 숫자인 경우 - 소수점 제거하고 문자열로 변환
        const rateAsInt = Math.floor(hourlyRate)
        updateData.hourlyRate = rateAsInt.toString()
      }
    }

    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber

    // 관리자만 다른 사용자의 역할을 변경할 수 있음
    if (role !== undefined && isAdmin) {
      updateData.role = role
    }

    // 비밀번호가 제공된 경우 해싱하여 업데이트
    if (password) {
      const salt = await bcrypt.genSalt(10)
      updateData.passwordHash = await bcrypt.hash(password, salt)
    }

    // 이메일이 변경된 경우, 중복 확인
    if (email) {
      // and 함수를 사용하여 '자신이 아닌 + 동일 이메일' 조건 구현
      const emailExists = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, id)))

      if (emailExists.length > 0) {
        return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 })
      }
    }

    // 업데이트할 데이터가 있는지 확인
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 })
    }

    // 사용자 정보 업데이트
    const updatedUser = await db.update(users).set(updateData).where(eq(users.id, id)).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      hourlyRate: users.hourlyRate,
      phoneNumber: users.phoneNumber,
    })

    return NextResponse.json({
      message: "사용자 정보가 성공적으로 업데이트되었습니다.",
      user: updatedUser[0],
    })
  } catch (error) {
    console.error("사용자 정보 수정 오류:", error)
    return NextResponse.json({ error: "사용자 정보를 수정하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// 사용자 삭제 API
export async function DELETE(
  request: NextRequest,
  context: DynamicRouteParams
) {
  const id = context.params.id

  try {
    // 권한 확인 (관리자만 접근 가능)
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 })
    }

    const userData = verifyJwtToken(token)

    if (!userData) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    // 관리자 권한 확인
    const adminUser = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userData.id))

    if (adminUser.length === 0) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    }

    const admin = adminUser[0]
    const isAdmin = admin?.role === "admin"

    if (!isAdmin) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    }

    // 자기 자신을 삭제하려는 경우 방지
    if (userData.id === id) {
      return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다." }, { status: 400 })
    }

    // 사용자 존재 여부 확인
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, id))

    if (existingUser.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    // 사용자 삭제
    await db.delete(users).where(eq(users.id, id))

    return NextResponse.json({ message: "사용자가 성공적으로 삭제되었습니다." })
  } catch (error) {
    console.error("사용자 삭제 오류:", error)
    return NextResponse.json({ error: "사용자를 삭제하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
