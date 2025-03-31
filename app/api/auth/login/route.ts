import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { signJwtToken } from "@/lib/auth/jwt"
import { db } from "@/src/db"
import { users } from "@/src/db/schema"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    console.log(`로그인 요청: ${email}`)

    // 필수 필드 검증
    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 모두 입력해주세요." }, { status: 400 })
    }

    // 사용자 찾기
    const user = await db.select().from(users).where(eq(users.email, email))

    if (user.length === 0) {
      console.log(`로그인 실패: 사용자 없음 - ${email}`)
      return NextResponse.json({ error: "이메일 또는 비밀번호가 일치하지 않습니다." }, { status: 401 })
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user[0].passwordHash)

    if (!isPasswordValid) {
      console.log(`로그인 실패: 비밀번호 불일치 - ${email}`)
      return NextResponse.json({ error: "이메일 또는 비밀번호가 일치하지 않습니다." }, { status: 401 })
    }

    console.log(`로그인 성공: ${email}, 역할: ${user[0].role}`)

    // JWT 토큰 생성
    const token = signJwtToken({
      id: user[0].id,
      email: user[0].email,
      role: user[0].role,
    })

    // 응답 생성
    const response = NextResponse.json({
      message: "로그인 성공",
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        role: user[0].role,
        hourlyRate: user[0].hourlyRate,
      },
    })

    // 쿠키에 토큰 저장 (7일간 유효)
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    })

    console.log("JWT 토큰 쿠키 설정 완료")
    return response
  } catch (error) {
    console.error("로그인 오류:", error)
    return NextResponse.json({ error: "로그인 중 오류가 발생했습니다." }, { status: 500 })
  }
}
