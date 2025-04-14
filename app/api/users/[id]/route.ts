import bcrypt from "bcryptjs"
import { and, eq, ne } from "drizzle-orm"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { getErrorResponse } from "@/lib/utils"
import { db } from "@/src/db"
import { users } from "@/src/db/schema"
import { Role } from "@/types/auth"

// 특정 사용자 조회 API
export async function GET(request: Request) {
  try {
    // URL에서 id 추출
    const pathParts = new URL(request.url).pathname.split("/")
    const id = pathParts[pathParts.length - 1]

    if (!id) {
      return NextResponse.json({ error: "유효하지 않은 사용자 ID입니다." }, { status: 400 })
    }

    // 권한 확인 (관리자만 접근 가능)
    const cookieHeader = request.headers.get("cookie") || ""
    const tokenMatch = cookieHeader.match(/token=([^;]+)/)
    const token = tokenMatch ? tokenMatch[1] : null

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
      .where(eq(users.id, userData.id as string))

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
        defaultBreakStartTime: users.defaultBreakStartTime,
        defaultBreakEndTime: users.defaultBreakEndTime,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id as string))

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
  hourlyRate?: string | null
  phoneNumber?: string
  defaultBreakStartTime?: string
  defaultBreakEndTime?: string
}

interface RequestData {
  name?: string
  email?: string
  password?: string
  role?: string
  hourlyRate?: number | null
  phoneNumber?: string
  defaultBreakStartTime?: string
  defaultBreakEndTime?: string
}

// Route handler context type
type RouteContext = {
  params: {
    id: string
  }
}

// 사용자 정보 수정 API
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // ID 유효성 검사
    const userId = context.params.id
    if (!userId) {
      return getErrorResponse(400, "사용자 ID가 필요합니다.")
    }

    // 토큰 추출 및 검증
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value || ""
    console.log("토큰 쿠키 값:", token)

    const verifiedToken = await verifyJwtToken(token)
    if (!verifiedToken) {
      console.error("유효하지 않은 토큰입니다.")
      return getErrorResponse(401, "인증되지 않았습니다.")
    }

    // 관리자 권한 또는 본인 확인
    if (verifiedToken.role !== Role.ADMIN && verifiedToken.id !== userId) {
      console.error("권한이 없습니다. 요청한 사용자:", verifiedToken.id, "대상 사용자:", userId)
      return getErrorResponse(403, "다른 사용자 정보를 수정할 권한이 없습니다.")
    }

    const requestBody = await request.json()
    const { name, email, password, role, hourlyRate, phoneNumber, defaultBreakStartTime, defaultBreakEndTime } =
      requestBody

    console.log("요청 데이터:", requestBody)
    console.log("defaultBreakStartTime:", defaultBreakStartTime, "defaultBreakEndTime:", defaultBreakEndTime)

    // 업데이트할 데이터 준비
    const updateData: Record<string, string | number> = {}

    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role && (role === "admin" || role === "user")) updateData.role = role
    if (hourlyRate) updateData.hourlyRate = hourlyRate
    if (phoneNumber) updateData.phoneNumber = phoneNumber
    if (defaultBreakStartTime === null || defaultBreakEndTime === null) {
      updateData.defaultBreakStartTime = null
      updateData.defaultBreakEndTime = null
      console.log("휴게 시간 필드가 null로 설정됩니다.")
    } else {
      updateData.defaultBreakStartTime = defaultBreakStartTime
      updateData.defaultBreakEndTime = defaultBreakEndTime
    }

    console.log("최종 업데이트 데이터:", updateData)

    // 사용자 업데이트
    let userData
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.passwordHash = hashedPassword
      const user = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId as string))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          hourlyRate: users.hourlyRate,
        })

      userData = user[0]
    } else {
      const user = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId as string))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          hourlyRate: users.hourlyRate,
        })

      userData = user[0]
    }

    return NextResponse.json({ message: "사용자가 업데이트되었습니다.", user: userData })
  } catch (error: unknown) {
    console.error("사용자 업데이트 오류:", error)
    return NextResponse.json(
      {
        error: "사용자 수정 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    )
  }
}

// 사용자 삭제 API
export async function DELETE(request: Request) {
  try {
    // URL에서 id 추출
    const pathParts = new URL(request.url).pathname.split("/")
    const id = pathParts[pathParts.length - 1]

    if (!id) {
      return NextResponse.json({ error: "유효하지 않은 사용자 ID입니다." }, { status: 400 })
    }

    // 권한 확인 (관리자만 접근 가능)
    const cookieHeader = request.headers.get("cookie") || ""
    const tokenMatch = cookieHeader.match(/token=([^;]+)/)
    const token = tokenMatch ? tokenMatch[1] : null

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
      .where(eq(users.id, userData.id as string))

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
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id as string))

    if (existingUser.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    // 사용자 삭제
    await db.delete(users).where(eq(users.id, id as string))

    return NextResponse.json({ message: "사용자가 성공적으로 삭제되었습니다." })
  } catch (error) {
    console.error("사용자 삭제 오류:", error)
    return NextResponse.json({ error: "사용자를 삭제하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
