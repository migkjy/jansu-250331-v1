import { NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { UserPayload } from "@/lib/auth/types"

export async function GET(request: NextRequest) {
  // 1. Verify Token and Get User Info
  const token = request.cookies.get("token")?.value
  if (!token) {
    return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 })
  }

  let userPayload: UserPayload
  try {
    const payload = await verifyJwtToken(token)
    if (!payload) {
      throw new Error("Invalid token")
    }
    userPayload = payload as UserPayload
  } catch (error) {
    console.error("Token verification failed:", error)
    return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
  }

  // 2. Forward the request to the [id]/pdf route with the current user's ID
  const userId = userPayload.id
  const searchParams = request.nextUrl.searchParams
  const month = searchParams.get("month") // Expected format: YYYY-MM

  // Construct URL to the [id]/pdf API with the current user's ID
  const idApiUrl = new URL(`/api/users/${userId}/salary-slip/pdf`, request.url)
  if (month) {
    idApiUrl.searchParams.set("month", month)
  }

  // Forward the request to the [id]/pdf API
  const response = await fetch(idApiUrl.toString(), {
    headers: {
      Cookie: `token=${token}`, // Pass the token to maintain authentication
    },
  })

  // Check if the response is a PDF
  if (response.headers.get("Content-Type") === "application/pdf") {
    const pdfBlob = await response.blob()
    // Return the PDF data with the correct content type
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="salary-slip-${month}.pdf"`,
      },
    })
  }

  // If not a PDF, just forward the JSON response
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
