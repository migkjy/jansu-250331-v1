import { NextResponse } from "next/server"

export async function POST() {
  try {
    // 토큰 쿠키를 제거하여 로그아웃 처리
    const response = NextResponse.json({
      message: "로그아웃되었습니다.",
    })

    // 쿠키 삭제
    response.cookies.set({
      name: "token",
      value: "",
      httpOnly: true,
      expires: new Date(0), // 즉시 만료
      path: "/",
    })

    return response
  } catch (error) {
    console.error("로그아웃 오류:", error)
    return NextResponse.json({ error: "로그아웃 중 오류가 발생했습니다." }, { status: 500 })
  }
}
