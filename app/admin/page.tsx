"use client"

import { Calendar, FileText, Home, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

interface AuthResponse {
  user: User
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (!response.ok) {
          window.location.href = "/auth/login"
          return
        }

        const data = (await response.json()) as AuthResponse

        if (data.user.role !== "admin") {
          window.location.href = "/"
          return
        }

        setUser(data.user)
      } catch (err) {
        console.error("관리자 인증 오류:", err)
        setError(err instanceof Error ? err.message : "관리자 인증 중 오류가 발생했습니다.")
        window.location.href = "/auth/login"
      } finally {
        setLoading(false)
      }
    }

    checkAdminAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="mt-2 text-gray-600">
              안녕하세요, <span className="font-medium">{user?.name}</span>님! 어떤 작업을 하시겠습니까?
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            <Home className="mr-1 h-4 w-4" />
            홈으로
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="bg-purple-50 p-5">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="p-5">
              <h2 className="mb-2 text-xl font-bold">직원 관리</h2>
              <p className="mb-4 text-gray-600">직원을 추가, 수정, 삭제하거나 권한을 관리합니다.</p>
              <Link
                href="/admin/users"
                className="inline-block rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                직원 관리
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="bg-yellow-50 p-5">
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="p-5">
              <h2 className="mb-2 text-xl font-bold">근무내역 관리</h2>
              <p className="mb-4 text-gray-600">직원들의 근무시간을 확인하고 관리합니다.</p>
              <Link
                href="/admin/work-logs"
                className="inline-block rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
              >
                근무내역 관리
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="bg-red-50 p-5">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <div className="p-5">
              <h2 className="mb-2 text-xl font-bold">급여 보고서</h2>
              <p className="mb-4 text-gray-600">직원별 급여 현황을 확인하고 보고서를 생성합니다.</p>
              <Link
                href="/admin/salary-report"
                className="inline-block rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                급여 보고서
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">빠른 통계</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-sm text-gray-500">이번 달 총 근무일수</p>
              <p className="text-2xl font-bold text-blue-600">계산 중...</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-sm text-gray-500">이번 달 총 근무시간</p>
              <p className="text-2xl font-bold text-green-600">계산 중...</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-4 text-center">
              <p className="text-sm text-gray-500">이번 달 총 지급 급여</p>
              <p className="text-2xl font-bold text-indigo-600">계산 중...</p>
            </div>
          </div>
          <p className="mt-4 text-right text-sm text-gray-500">* 실시간 데이터는 각 페이지에서 확인할 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
}
