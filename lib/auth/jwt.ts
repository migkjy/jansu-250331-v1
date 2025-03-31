import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

// JWT 비밀키 - 환경 변수에서 불러오거나 기본값 사용
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

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
    return jwt.verify(token, JWT_SECRET) as TokenPayload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
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
