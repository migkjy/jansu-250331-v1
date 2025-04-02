"use client"

import { Calendar, ClipboardCheck, DollarSign, FileText, UserCircle, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// 사용자 타입 정의
interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

interface AuthResponse {
  user: User
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (response.ok) {
          const data = (await response.json()) as AuthResponse
          setUser(data.user)
        }
      } catch (error) {
        console.error("사용자 인증 확인 오류:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-6 text-3xl font-bold">근무시간 관리 시스템</h1>
        <p className="mb-8 max-w-md text-gray-600">
          근무시간을 기록하고 급여를 계산하는 간편한 시스템입니다. 시작하려면 로그인하세요.
        </p>
        <div className="space-x-4">
          <Link href="/auth/login" className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
            로그인
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-100"
          >
            회원가입
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between pb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">근무시간 관리 시스템</h1>
            <p className="mt-2 text-gray-600">
              안녕하세요, <span className="font-medium">{user.name}</span>님! 무엇을 도와드릴까요?
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/profile"
              className="flex items-center rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              <UserCircle className="mr-1 h-4 w-4" />내 프로필
            </Link>
            <button
              onClick={() => {
                fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                }).then(() => {
                  setUser(null)
                  router.push("/auth/login")
                })
              }}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* 일반 사용자 메뉴 */}
          <Link
            href="/work-logs"
            className="flex flex-col rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">근무 기록</h2>
            <p className="flex-grow text-gray-600">근무 시간을 기록하고 관리하세요.</p>
          </Link>

          <Link
            href="/salary-slip"
            className="flex flex-col rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">급여 명세서</h2>
            <p className="flex-grow text-gray-600">월별 급여 명세서를 확인하세요.</p>
          </Link>

          {/* 관리자 메뉴 */}
          {user.role === "admin" && (
            <>
              <Link
                href="/admin/users"
                className="flex flex-col rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <Users className="h-6 w-6" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">직원 관리</h2>
                <p className="flex-grow text-gray-600">직원을 추가, 수정, 삭제할 수 있습니다.</p>
              </Link>

              <Link
                href="/admin/work-logs"
                className="flex flex-col rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">근무내역 관리</h2>
                <p className="flex-grow text-gray-600">모든 직원의 근무내역을 관리합니다.</p>
              </Link>

              <Link
                href="/admin/salary-report"
                className="flex flex-col rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <FileText className="h-6 w-6" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">급여 보고서</h2>
                <p className="flex-grow text-gray-600">직원별 급여 현황을 확인합니다.</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
