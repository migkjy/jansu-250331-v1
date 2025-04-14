"use client"

import { CalendarClock, FileText, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function UserSidebar() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/auth/login")
      } else {
        console.error("Logout failed:", response.statusText)
      }
    } catch (error) {
      console.error("An error occurred during logout:", error)
    }
  }

  // TODO: Add active link styling based on current route
  const linkClasses =
    "flex items-center space-x-3 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  const activeLinkClasses = "flex items-center space-x-3 rounded-md bg-yellow-100 px-3 py-2 text-yellow-700" // Example active style

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex flex-col p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">사용자 메뉴</h2>
        <nav className="flex-1 space-y-1">
          <Link href="/work-logs" className={linkClasses}>
            <CalendarClock className="h-5 w-5" />
            <span>나의 근무내역</span>
          </Link>
          <Link href="/salary-slip" className={linkClasses}>
            <FileText className="h-5 w-5" />
            <span>급여 명세서</span>
          </Link>
        </nav>
      </div>
      <div className="mt-auto p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5" />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  )
}
