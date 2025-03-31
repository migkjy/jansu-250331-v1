import { NextRequest, NextResponse } from "next/server"

// 공개 경로 (로그인 없이 접근 가능)
const publicPaths = ["/auth/login", "/auth/signup"]

// 관리자 전용 경로
const adminPaths = ["/admin"]

// 인증이 필요한 경로 (로그인 필요)
const authRequiredPaths = ["/", "/profile", "/work-logs", "/salary-slip"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 토큰 확인 (쿠키에서 직접 가져오기)
  const hasToken = request.cookies.has("token")

  console.log(`미들웨어에서 토큰 확인:`, hasToken)

  // 로그인 페이지에 접근할 때 토큰이 있으면 홈페이지로 리다이렉트
  if (publicPaths.some((path) => pathname.startsWith(path)) && hasToken) {
    console.log("로그인된 사용자가 공개 페이지 접근, 홈페이지로 리다이렉트")
    // 관리자/일반 사용자 구분은 클라이언트 측에서 처리
    return NextResponse.redirect(new URL("/", request.url))
  }

  // 인증이 필요한 페이지에 미인증 사용자가 접근할 경우 로그인 페이지로 리다이렉트
  if (authRequiredPaths.some((path) => pathname === path || pathname.startsWith(path + "/")) && !hasToken) {
    console.log("미인증 사용자가 인증 필요 페이지 접근, 로그인 페이지로 리다이렉트")
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // 관리자 경로에 대한 권한 검증은 클라이언트 측에서 처리
  // 클라이언트 컴포넌트에서 useEffect로 admin 권한이 없으면 리다이렉트

  return NextResponse.next()
}

// 미들웨어가 실행될 경로 패턴 설정
export const config = {
  matcher: [
    /*
     * 모든 페이지에 대해 미들웨어를 실행
     * 아래는 미들웨어 실행 대상 경로:
     * - 모든 공개 경로 (로그인, 회원가입)
     * - 인증 필요 경로 (홈, 프로필 등)
     * - 관리자 전용 경로
     * - API 경로 제외
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
