import { eq } from "drizzle-orm"
import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"
import { TokenPayload } from "@/lib/auth/jwt"
import { db } from "@/src/db"
import { users } from "@/src/db/schema"

// JWT 비밀키 - 환경 변수에서 불러오거나 기본값 사용
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// 토큰 직접 검증
function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    console.error("토큰 검증 실패:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("ME API 엔드포인트 호출됨")

    // 요청에서 직접 토큰 가져오기
    const token = request.cookies.get("token")?.value

    console.log("쿠키에서 토큰 확인:", !!token)

    if (!token) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 })
    }

    // 토큰 검증
    const userData = verifyToken(token)

    console.log("사용자 토큰 검증 결과:", !!userData)

    if (!userData) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    // 데이터베이스에서 최신 사용자 정보 조회
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        hourlyRate: users.hourlyRate,
      })
      .from(users)
      .where(eq(users.id, userData.id))

    console.log("데이터베이스에서 사용자 조회 결과:", user.length > 0)

    if (user.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    return NextResponse.json({
      user: user[0],
    })
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error)
    return NextResponse.json({ error: "사용자 정보를 조회하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
