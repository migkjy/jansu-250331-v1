"use client"

import { ArrowLeft, Plus } from "lucide-react"
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

interface WorkLog {
  id: string
  userId: string
  userName: string
  workDate: string
  startTime: string
  endTime: string
  workHours: number
  hourlyRate: number
  paymentAmount: number
  memo: string
}

export default function WorkLogsPage() {
  const [_user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState({
    userId: "",
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0], // 이번 달 1일
    endDate: new Date().toISOString().split("T")[0], // 오늘
  })

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

        // 초기 근무 기록 샘플 (실제로는 API에서 가져와야 함)
        setWorkLogs([
          {
            id: "1",
            userId: "1",
            userName: "홍길동",
            workDate: "2023-09-01",
            startTime: "09:00",
            endTime: "18:00",
            workHours: 8,
            hourlyRate: 15000,
            paymentAmount: 120000,
            memo: "정상 근무",
          },
          {
            id: "2",
            userId: "2",
            userName: "김철수",
            workDate: "2023-09-01",
            startTime: "09:30",
            endTime: "18:30",
            workHours: 8,
            hourlyRate: 14000,
            paymentAmount: 112000,
            memo: "정상 근무",
          },
          {
            id: "3",
            userId: "3",
            userName: "이영희",
            workDate: "2023-09-02",
            startTime: "09:00",
            endTime: "15:00",
            workHours: 5,
            hourlyRate: 16000,
            paymentAmount: 80000,
            memo: "조퇴",
          },
        ])

        // 사용자 목록 샘플
        setUsers([
          {
            id: "1",
            name: "홍길동",
            email: "hong@example.com",
            role: "user",
          },
          {
            id: "2",
            name: "김철수",
            email: "kim@example.com",
            role: "user",
          },
          {
            id: "3",
            name: "이영희",
            email: "lee@example.com",
            role: "user",
          },
        ])
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

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFilter((prev) => ({ ...prev, [name]: value }))
  }

  const handleSearch = () => {
    // 실제로는 여기서 필터를 사용해 API 호출을 수행하게 됩니다
    console.log("검색 필터:", filter)
  }

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
            <div className="flex items-center">
              <Link href="/admin" className="mr-4 flex items-center text-gray-500 hover:text-gray-700">
                <ArrowLeft className="mr-1 h-5 w-5" />
                뒤로
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">근무내역 관리</h1>
            </div>
            <p className="mt-2 text-gray-600">직원들의 근무시간과 급여를 확인하고 관리합니다.</p>
          </div>
          <Link
            href="/admin/work-logs/create"
            className="flex items-center rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            근무내역 추가
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">근무내역 필터</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                직원
              </label>
              <select
                id="userId"
                name="userId"
                value={filter.userId}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none sm:text-sm"
              >
                <option value="">모든 직원</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                시작일
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filter.startDate}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                종료일
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filter.endDate}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none sm:text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
              >
                검색
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  날짜
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  직원
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  시작시간
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  종료시간
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  근무시간
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  시급
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  급여
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  메모
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {workLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{new Date(log.workDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.startTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.endTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.workHours}시간</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.hourlyRate.toLocaleString()}원</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.paymentAmount.toLocaleString()}원</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{log.memo || "-"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
