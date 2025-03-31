"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  hourlyRate: number
}

// API 응답 타입 정의
interface MeResponse {
  user: User
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const _router = useRouter()

  useEffect(() => {
    // 사용자 정보 가져오기
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (response.ok) {
          const userData = (await response.json()) as MeResponse
          console.log("관리자 페이지에서 사용자 정보 확인:", userData)
          setUser(userData.user)

          // 일반 사용자인 경우 메인 페이지로 리다이렉트
          if (userData.user.role !== "admin") {
            console.log("관리자 권한이 아닙니다. 홈페이지로 이동합니다.")
            window.location.href = "/"
            return
          }
        } else {
          console.error("로그인이 필요합니다.")
          window.location.href = "/auth/login"
          return
        }
      } catch (error) {
        console.error("사용자 정보 조회 실패:", error)
        window.location.href = "/auth/login"
        return
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        window.location.href = "/auth/login"
      }
    } catch (error) {
      console.error("로그아웃 오류:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    // useEffect에서 리다이렉트 처리되므로 여기에서는 리다이렉트 처리가 완료될 때까지 로딩 표시
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">권한 확인 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="mb-4 text-2xl font-bold">관리자 대시보드</h1>
          <button onClick={handleLogout} className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
            로그아웃
          </button>
        </div>

        {user && (
          <div className="mb-4">
            <p className="text-lg font-medium">안녕하세요, {user.name} 관리자님!</p>
            <p className="text-gray-600">관리자 권한으로 로그인하셨습니다</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Link
            href="/admin/users"
            className="rounded-lg bg-indigo-100 p-4 text-center shadow transition hover:bg-indigo-200"
          >
            <h2 className="font-bold">직원 관리</h2>
            <p className="text-sm text-gray-600">직원 등록 및 관리</p>
          </Link>

          <Link
            href="/admin/work-logs"
            className="rounded-lg bg-blue-100 p-4 text-center shadow transition hover:bg-blue-200"
          >
            <h2 className="font-bold">근무내역 관리</h2>
            <p className="text-sm text-gray-600">전체 직원 근무 기록 관리</p>
          </Link>

          <Link
            href="/admin/salary-report"
            className="rounded-lg bg-green-100 p-4 text-center shadow transition hover:bg-green-200"
          >
            <h2 className="font-bold">급여 보고서</h2>
            <p className="text-sm text-gray-600">급여 명세서 관리 및 다운로드</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
