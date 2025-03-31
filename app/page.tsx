"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// 사용자 타입 정의
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

export default function HomePage() {
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
          console.log("홈페이지에서 사용자 정보 확인:", userData)
          setUser(userData.user)

          // 관리자인 경우 관리자 페이지로 리다이렉트
          if (userData.user.role === "admin") {
            console.log("관리자 권한입니다. 관리자 페이지로 이동합니다.")
            window.location.href = "/admin"
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="mb-4 text-2xl font-bold">장수도시락 급여관리 시스템</h1>
          <button onClick={handleLogout} className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
            로그아웃
          </button>
        </div>

        {user && (
          <div className="mb-4">
            <p className="text-lg font-medium">안녕하세요, {user.name}님!</p>
            <p className="text-gray-600">역할: {user.role === "admin" ? "관리자" : "일반 사용자"}</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Link
            href="/work-logs"
            className="rounded-lg bg-blue-100 p-4 text-center shadow transition hover:bg-blue-200"
          >
            <h2 className="font-bold">근무 내역</h2>
            <p className="text-sm text-gray-600">내 근무 기록 확인하기</p>
          </Link>

          <Link
            href="/salary-slip"
            className="rounded-lg bg-green-100 p-4 text-center shadow transition hover:bg-green-200"
          >
            <h2 className="font-bold">급여 명세서</h2>
            <p className="text-sm text-gray-600">월별 급여 명세서 확인</p>
          </Link>

          <Link
            href="/profile"
            className="rounded-lg bg-purple-100 p-4 text-center shadow transition hover:bg-purple-200"
          >
            <h2 className="font-bold">내 프로필</h2>
            <p className="text-sm text-gray-600">개인정보 관리</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
