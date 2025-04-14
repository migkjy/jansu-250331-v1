import "styles/tailwind.css"
import { Metadata } from "next"
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import { Inter } from "next/font/google"
import { cookies, RequestCookies } from "next/headers"
import AdminSidebar from "@/components/AdminSidebar"
import MainLayout from "@/components/MainLayout"
import UserSidebar from "@/components/UserSidebar"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { UserPayload } from "@/lib/auth/types"

// Force dynamic rendering for this layout
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "장수도시락 급여관리",
  description: "장수도시락 직원 급여관리 시스템",
}

const inter = Inter({ subsets: ["latin"] })

// Helper function to get user role from token value
async function getUserRoleFromToken(token: string | undefined): Promise<"admin" | "user" | null> {
  if (!token) {
    return null
  }
  try {
    const decoded = await verifyJwtToken<UserPayload>(token)
    return decoded.role
  } catch (error) {
    // Don't log error here in production, could be expected (e.g., expired token)
    // console.error("Token verification failed:", error)
    return null
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  // Read cookies at the top level asynchronously
  const tokenValue = await cookieStore.get("token")?.value
  const currentPath = (await cookieStore.get("next-url")?.value) || ""

  // Get user role by passing the token value
  const userRole = await getUserRoleFromToken(tokenValue)

  // Calculate derived state
  const isAuthPage = currentPath.startsWith("/auth")
  const showSidebar = userRole && !isAuthPage

  return (
    <html lang="ko" className={`${inter.className} h-full bg-gray-100`}>
      <body className="h-full antialiased">
        <MainLayout userRole={userRole} showSidebar={showSidebar}>
          {children}
        </MainLayout>
      </body>
    </html>
  )
}
