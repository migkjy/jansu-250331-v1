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

    console.log("쿠키에서 토큰 확인:", !!token, token ? `길이: ${token.length}` : "없음")

    if (!token) {
      console.error("토큰이 없습니다.")
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다.", details: "토큰이 제공되지 않았습니다." },
        { status: 401 }
      )
    }

    // 토큰 검증
    try {
      const userData = verifyToken(token)
      console.log("사용자 토큰 검증 결과:", !!userData, userData ? `사용자 ID: ${userData.id}` : "실패")

      if (!userData) {
        console.error("유효하지 않은 토큰입니다.")
        return NextResponse.json(
          { error: "유효하지 않은 토큰입니다.", details: "토큰이 유효하지 않거나 만료되었습니다." },
          { status: 401 }
        )
      }

      console.log("데이터베이스에서 사용자 조회 시도, ID:", userData.id)

      // 데이터베이스에서 최신 사용자 정보 조회
      try {
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

        console.log(
          "데이터베이스에서 사용자 조회 결과:",
          user.length > 0,
          user.length > 0 ? `이메일: ${user[0]?.email}` : "없음"
        )

        if (user.length === 0) {
          console.error("데이터베이스에서 사용자를 찾을 수 없습니다.")
          return NextResponse.json(
            {
              error: "사용자를 찾을 수 없습니다.",
              details: "토큰은 유효하지만 해당 사용자가 데이터베이스에 존재하지 않습니다.",
            },
            { status: 404 }
          )
        }

        return NextResponse.json({
          user: user[0],
        })
      } catch (dbError) {
        console.error("데이터베이스 쿼리 오류:", dbError)
        return NextResponse.json(
          {
            error: "데이터베이스 오류가 발생했습니다.",
            details: dbError instanceof Error ? dbError.message : String(dbError),
          },
          { status: 500 }
        )
      }
    } catch (tokenError) {
      console.error("토큰 검증 과정에서 오류 발생:", tokenError)
      return NextResponse.json(
        {
          error: "토큰 검증 중 오류가 발생했습니다.",
          details: tokenError instanceof Error ? tokenError.message : String(tokenError),
        },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("사용자 정보 조회 중 예상치 못한 오류:", error)
    return NextResponse.json(
      {
        error: "사용자 정보를 조회하는 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
