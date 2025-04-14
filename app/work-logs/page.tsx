"use client"

import { useEffect, useState } from "react"
import UserLayout from "../components/UserLayout"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  hourlyRate: number
}

interface WorkLog {
  id: string
  userId: string
  workDate: string
  startTime: string
  endTime: string
  workHours: number
  hourlyRate: number
  paymentAmount: number
  memo: string
}

// API 응답 타입 정의
interface MeApiResponse {
  user: User
}

export default function WorkLogsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [success, setSuccess] = useState("")
  const [filter, setFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0], // 이번 달 1일
    endDate: new Date().toISOString().split("T")[0], // 오늘
  })

  useEffect(() => {
    // 유저 정보 및 근무내역 가져오기
    const fetchData = async () => {
      try {
        // 유저 정보 가져오기
        const userResponse = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (!userResponse.ok) {
          window.location.href = "/auth/login"
          return
        }

        const userData = (await userResponse.json()) as MeApiResponse
        setUser(userData.user)

        // 일반 사용자 페이지이므로 관리자는 관리자 페이지로 리다이렉션
        if (userData.user.role === "admin") {
          window.location.href = "/admin/work-logs"
          return
        }

        // 근무내역 가져오기
        fetchWorkLogs()
      } catch (err) {
        console.error("데이터 로드 오류:", err)
        setError(err instanceof Error ? err.message : "데이터를 가져오는데 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchWorkLogs = async () => {
    setLoading(true)
    try {
      const url = `/api/work-logs?startDate=${filter.startDate}&endDate=${filter.endDate}`

      console.log("근무내역 API 요청:", url)
      console.log("쿠키 확인:", document.cookie.includes("token") ? "토큰 있음" : "토큰 없음")

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const responseData = (await response.json()) as { error?: string; details?: string }
      console.log("API 응답:", response.status, responseData)

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.details || "근무내역을 가져오는데 실패했습니다."

        // 401 오류일 경우 로그인 페이지로 리다이렉트
        if (response.status === 401) {
          console.error("인증 오류 발생, 로그인 페이지로 리다이렉트합니다.")
          window.location.href = "/auth/login"
          return
        }

        throw new Error(errorMessage)
      }

      setWorkLogs(responseData as WorkLog[])
    } catch (err) {
      console.error("근무내역 로드 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역을 가져오는데 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilter((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSearch = () => {
    fetchWorkLogs()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // 총 근무시간 및 급여 계산
  const calculateTotals = () => {
    if (workLogs.length === 0) return { totalHours: 0, totalPayment: 0 }

    const totalHours = workLogs.reduce((acc, log) => acc + Number(log.workHours), 0)
    const totalPayment = workLogs.reduce((acc, log) => acc + Number(log.paymentAmount), 0)

    return { totalHours, totalPayment }
  }

  const { totalHours, totalPayment } = calculateTotals()

  // 필터 액션 버튼
  const filterActions = (
    <div className="flex flex-wrap items-center gap-4">
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
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex items-end">
        <button
          onClick={handleSearch}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
        >
          조회
        </button>
      </div>
    </div>
  )

  return (
    <UserLayout
      title="근무내역"
      error={error}
      warning={warning}
      success={success}
      isLoading={loading && !user}
      actions={filterActions}
    >
      {/* 사용자 및 요약 정보 카드 */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-md">
          <h2 className="mb-2 text-lg font-medium text-gray-900">내 정보</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">이름:</span> {user?.name}
            </p>
            <p>
              <span className="font-medium">이메일:</span> {user?.email}
            </p>
            <p>
              <span className="font-medium">시급:</span>{" "}
              {user?.hourlyRate ? Math.round(user.hourlyRate).toLocaleString() : 0}원
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-md">
          <h2 className="mb-2 text-lg font-medium text-gray-900">이번 달 요약</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">근무일수:</span> {workLogs.length}일
            </p>
            <p>
              <span className="font-medium">총 근무시간:</span> {Number(totalHours).toFixed(2)}시간
            </p>
            <p>
              <span className="font-medium">총 급여:</span> {Math.round(Number(totalPayment)).toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      {/* 근무내역 테이블 */}
      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                근무일
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                출근시간
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                퇴근시간
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {workLogs.length > 0 ? (
              workLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(log.workDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.startTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.endTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.workHours}시간</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {Math.round(Number(log.hourlyRate)).toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {Math.round(Number(log.paymentAmount)).toLocaleString()}원
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  등록된 근무내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </UserLayout>
  )
}
