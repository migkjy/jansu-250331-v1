import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/src/db"
import { users } from "@/src/db/schema"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // 필수 필드 검증
    if (!name || !email || !password) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 })
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 최소 8자 이상이어야 합니다." }, { status: 400 })
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "유효한 이메일 주소를 입력해주세요." }, { status: 400 })
    }

    // 이메일 중복 확인
    const existingUser = await db.select().from(users).where(eq(users.email, email))

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 })
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10)

    // 사용자 생성
    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashedPassword,
        role: "user",
        hourlyRate: "9000", // 기본 시급
      })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role })

    // 민감한 정보를 제외하고 응답
    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: {
          id: newUser[0].id,
          name: newUser[0].name,
          email: newUser[0].email,
          role: newUser[0].role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("회원가입 오류:", error)
    return NextResponse.json({ error: "회원가입 중 오류가 발생했습니다." }, { status: 500 })
  }
}
