import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

// JWT 비밀키 - 환경 변수에서 불러오거나 기본값 사용
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// 환경 변수 확인 로그
console.log("JWT 설정 확인:", {
  secretExists: !!process.env.JWT_SECRET,
  secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
  usingDefault: !process.env.JWT_SECRET,
})

export type TokenPayload = {
  id: string
  email: string
  role: string
}

// JWT 토큰 생성 함수
export function signJwtToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

// JWT 토큰 검증 함수
export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    console.log("JWT 토큰 검증 시도, 토큰 길이:", token.length)
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    console.log("JWT 토큰 검증 성공:", {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    })
    return decoded
  } catch (error) {
    console.error("JWT 토큰 검증 실패:", error instanceof Error ? error.message : String(error))
    return null
  }
}

// 쿠키에서 토큰 가져오기 (비동기 처리)
export async function getTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get("token")
  return tokenCookie?.value
}

// 토큰에서 사용자 정보 가져오기 (비동기 처리)
export async function getUserFromToken(): Promise<TokenPayload | null> {
  const token = await getTokenFromCookies()
  if (!token) return null

  return verifyJwtToken(token)
}
