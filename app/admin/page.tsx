"use client"

import { Calendar, FileText, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import AdminLayout from "./components/AdminLayout"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

interface AuthResponse {
  user: User
}

interface DashboardStats {
  totalEmployees: number
  totalHours: number
  totalPayment: number
  currentMonth: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState("")

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
        
        // Once authenticated, fetch the stats
        await fetchStats()
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
  
  const fetchStats = async () => {
    setStatsLoading(true)
    setStatsError("")
    
    try {
      const response = await fetch("/api/admin/stats", {
        credentials: "include"
      })
      
      if (!response.ok) {
        throw new Error("통계 데이터를 불러오는데 실패했습니다.")
      }
      
      const data = await response.json() as DashboardStats
      setStats(data)
    } catch (err) {
      console.error("통계 데이터 로드 오류:", err)
      setStatsError(err instanceof Error ? err.message : "통계 데이터를 가져오는데 오류가 발생했습니다.")
    } finally {
      setStatsLoading(false)
    }
  }

  // Format the month in Korean
  const formatMonth = (dateStr: string) => {
    const [year, month] = dateStr.split("-")
    return `${year}년 ${month}월`
  }

  if (loading) {
    return (
      <AdminLayout title="관리자 대시보드" isLoading={true}>
        {/* AdminLayout handles loading state */}
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="관리자 대시보드" error={error || statsError}>
      <div className="mb-8">
        <p className="mt-2 text-gray-600">
          안녕하세요, <span className="font-medium">{user?.name}</span>님! 환영합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow transition-transform hover:scale-105">
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
              직원 관리 바로가기
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow transition-transform hover:scale-105">
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
              근무내역 관리 바로가기
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow transition-transform hover:scale-105">
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
              급여 보고서 바로가기
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">
          {stats?.currentMonth ? `${formatMonth(stats.currentMonth)} 통계` : "빠른 통계"}
        </h2>
        
        {statsLoading ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-gray-500">통계 데이터를 불러오는 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4 text-center transition-transform hover:scale-105">
              <p className="text-sm text-gray-500">총 직원 수</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.totalEmployees || 0}명</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center transition-transform hover:scale-105">
              <p className="text-sm text-gray-500">이번 달 총 근무시간</p>
              <p className="text-2xl font-bold text-green-600">{stats?.totalHours?.toFixed(1) || "0"} 시간</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-4 text-center transition-transform hover:scale-105">
              <p className="text-sm text-gray-500">이번 달 총 지급 급여</p>
              <p className="text-2xl font-bold text-indigo-600">{(stats?.totalPayment || 0).toLocaleString()} 원</p>
            </div>
          </div>
        )}
        
        {!statsLoading && (
          <p className="mt-4 text-right text-sm text-gray-500">* {stats?.currentMonth ? `${formatMonth(stats.currentMonth)}` : "이번 달"} 기준 데이터입니다.</p>
        )}
      </div>
    </AdminLayout>
  )
}
