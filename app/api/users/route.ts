import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { db } from "@/src/db"
import { users } from "@/src/db/schema"

interface CreateUserRequest {
  name: string
  email: string
  password: string
  role?: string
  hourlyRate?: number
  phoneNumber?: string
}

// 사용자 목록 조회 API
export async function GET(request: NextRequest) {
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

    // 데이터베이스에서 로그인한 사용자 정보 확인
    const adminUser = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userData.id as string))

    // 사용자가 존재하지 않거나 관리자가 아닌 경우
    if (adminUser.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    const userRole = adminUser[0]?.role

    if (userRole !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    }

    // 모든 사용자 조회
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        hourlyRate: users.hourlyRate,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt)

    return NextResponse.json(allUsers)
  } catch (error) {
    console.error("사용자 목록 조회 오류:", error)
    return NextResponse.json({ error: "사용자 목록을 조회하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// 사용자 생성 API
export async function POST(request: NextRequest) {
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
      .where(eq(users.id, userData.id as string))

    // 사용자가 존재하지 않거나 관리자가 아닌 경우
    if (adminUser.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    const userRole = adminUser[0]?.role

    if (userRole !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    }

    // 요청 데이터 파싱
    const requestData = (await request.json()) as CreateUserRequest
    const { name, email, password, role, hourlyRate } = requestData

    // 필수 필드 확인
    if (!name || !email || !password) {
      return NextResponse.json({ error: "모든 필수 필드를 입력해주세요." }, { status: 400 })
    }

    // 이메일 중복 확인
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email))

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 })
    }

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // 기본 사용자 데이터
    const userDataToInsert = {
      name,
      email,
      passwordHash,
      role: role || "user",
    }

    // 시급이 있는 경우만 포함
    if (hourlyRate !== undefined && hourlyRate !== null) {
      // 소수점 제거하고 정수로 저장
      const rateAsInt = Math.floor(hourlyRate)
      Object.assign(userDataToInsert, { hourlyRate: rateAsInt.toString() }) // 정수 문자열로 저장
    }

    // 사용자 생성
    const createdUser = await db.insert(users).values(userDataToInsert).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      hourlyRate: users.hourlyRate,
    })

    return NextResponse.json({ message: "사용자가 성공적으로 생성되었습니다.", user: createdUser[0] }, { status: 201 })
  } catch (error) {
    console.error("사용자 생성 오류:", error)
    return NextResponse.json({ error: "사용자를 생성하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
