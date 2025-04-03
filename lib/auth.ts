import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"
import { createClient } from "./db"

// JWT 설정 확인 로그
console.log("lib/auth.ts 로드됨, JWT 환경 변수 확인:", {
  secretExists: !!process.env.JWT_SECRET,
  secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
})

// JWT 토큰에서 사용자 정보 가져오기
export interface JwtPayload {
  id: string
  email: string
  role: "admin" | "user"
}

// 검증 응답 타입
interface VerifyResult {
  success: boolean
  user?: JwtPayload
  error?: string
  details?: string
}

// 쿠키에서 JWT 토큰 가져오기 및 검증
export async function verifyAuth(_request: NextRequest): Promise<VerifyResult> {
  try {
    console.log("인증 검증 시작")

    // 쿠키에서 토큰 가져오기
    const token = _request.cookies.get("token")?.value

    if (!token) {
      console.error("인증 토큰 없음")
      return { success: false, error: "인증 토큰이 없습니다." }
    }

    console.log("토큰 찾음, 길이:", token.length)

    // JWT 시크릿 확인
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error("JWT_SECRET 환경 변수가 설정되지 않았습니다.")
      return { success: false, error: "서버 설정 오류" }
    }

    console.log("JWT 시크릿 확인됨, 길이:", jwtSecret.length)

    // 토큰 검증
    try {
      console.log("JWT 토큰 검증 시도")
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload

      if (!decoded || !decoded.id) {
        console.error("토큰 검증 실패: 유효하지 않은 페이로드")
        return { success: false, error: "유효하지 않은 토큰입니다." }
      }

      console.log("토큰 검증 성공:", decoded.id, decoded.role)

      // 사용자가 DB에 존재하는지 확인
      try {
        const db = createClient()
        const result = await db.query("SELECT id, email, role FROM users WHERE id = $1", [decoded.id])

        if (result.rows.length === 0) {
          console.error("DB에서 사용자를 찾을 수 없음:", decoded.id)
          return { success: false, error: "사용자를 찾을 수 없습니다." }
        }

        console.log("사용자 검증 완료:", result.rows[0].email, result.rows[0].role)

        return {
          success: true,
          user: {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
          },
        }
      } catch (dbError) {
        console.error("DB 검증 오류:", dbError)
        return {
          success: false,
          error: "사용자 정보 검증 중 데이터베이스 오류가 발생했습니다.",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        }
      }
    } catch (jwtError) {
      console.error("JWT 검증 오류:", jwtError)
      return {
        success: false,
        error: "인증 토큰이 만료되었거나 유효하지 않습니다.",
        details: jwtError instanceof Error ? jwtError.message : String(jwtError),
      }
    }
  } catch (error) {
    console.error("인증 처리 중 예상치 못한 오류:", error)
    return {
      success: false,
      error: "인증 처리 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

// 새 JWT 토큰 생성
export function generateToken(payload: JwtPayload): string {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error("JWT_SECRET 환경 변수가 설정되지 않았습니다.")
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" })
}
