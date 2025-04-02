"use client"

import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  hourlyRate: number
}

interface WorkLog {
  id: string
  user_id: string
  work_date: string
  start_time: string
  end_time: string
  work_hours: number
  hourly_rate: number
  payment_amount: number
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
  const [success, setSuccess] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    work_date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "18:00",
    memo: "",
  })
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

        const userData = await userResponse.json() as MeApiResponse
        setUser(userData.user)

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
    if (!user) return

    setLoading(true)
    try {
      const url = `/api/work-logs?userId=${user.id}&startDate=${filter.startDate}&endDate=${filter.endDate}`

      const response = await fetch(url, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json() as WorkLog[]
        setWorkLogs(data)
      } else {
        throw new Error("근무내역을 가져오는데 실패했습니다.")
      }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const calculateHours = (start: string, end: string): number => {
    try {
      // Date 객체를 사용하여 시간 차이 계산
      const today = new Date().toISOString().split('T')[0]; // 오늘 날짜만 추출
      const startTime = new Date(`${today}T${start}`);
      const endTime = new Date(`${today}T${end}`);
      
      // 유효한 날짜인지 확인
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return 0;
      }
      
      // 시간 차이 계산 (밀리초 -> 시간)
      const diffMs = endTime.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return diffHours <= 0 ? 0 : Math.round(diffHours * 100) / 100;
    } catch (error) {
      console.error('시간 계산 오류:', error);
      return 0;
    }
  }

  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setError("")
    setSuccess("")

    // 시간 유효성 검사
    if (formData.end_time <= formData.start_time) {
      setError("퇴근 시간은 출근 시간보다 늦어야 합니다.")
      return
    }

    const hours = calculateHours(formData.start_time, formData.end_time)
    const payment = Math.round(hours * user.hourlyRate)

    try {
      const workLogData = {
        user_id: user.id,
        work_date: formData.work_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        work_hours: hours,
        hourly_rate: user.hourlyRate,
        payment_amount: payment,
        memo: formData.memo,
      }

      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workLogData),
        credentials: "include",
      })

      const data = await response.json() as { message: string, workLog: WorkLog }

      if (!response.ok) {
        throw new Error(data.message || "근무내역 추가 중 오류가 발생했습니다.")
      }

      // 성공 시 목록 업데이트
      setSuccess("근무내역이 성공적으로 추가되었습니다.")
      setShowAddModal(false)

      // 폼 초기화
      setFormData({
        work_date: new Date().toISOString().split("T")[0],
        start_time: "09:00",
        end_time: "18:00",
        memo: "",
      })

      fetchWorkLogs() // 목록 새로고침
    } catch (err) {
      console.error("근무내역 추가 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역 추가 중 오류가 발생했습니다.")
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // 총 근무시간 및 급여 계산
  const calculateTotals = () => {
    if (workLogs.length === 0) return { totalHours: 0, totalPayment: 0 }

    const totalHours = workLogs.reduce((acc, log) => acc + log.work_hours, 0)
    const totalPayment = workLogs.reduce((acc, log) => acc + log.payment_amount, 0)

    return { totalHours, totalPayment }
  }

  const { totalHours, totalPayment } = calculateTotals()

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 근무내역</h1>
        <Link href="/" className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
          돌아가기
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

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
              <span className="font-medium">시급:</span> {user?.hourlyRate.toLocaleString()}원
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
              <span className="font-medium">총 근무시간:</span> {totalHours.toFixed(2)}시간
            </p>
            <p>
              <span className="font-medium">총 급여:</span> {totalPayment.toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
        <div className="mb-4 flex flex-wrap items-end gap-4">
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

          <button
            onClick={handleSearch}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
          >
            조회
          </button>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          근무내역 추가
        </button>
      </div>

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
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                메모
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {workLogs.length > 0 ? (
              workLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(log.work_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.start_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.end_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.work_hours}시간</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.hourly_rate.toLocaleString()}원</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.payment_amount.toLocaleString()}원</td>
                  <td className="px-6 py-4">{log.memo || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  등록된 근무내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 근무내역 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">근무내역 추가</h3>
                <div className="mt-4">
                  <form onSubmit={handleAddWorkLog}>
                    <div className="mb-4">
                      <label htmlFor="work_date" className="block text-sm font-medium text-gray-700">
                        근무일
                      </label>
                      <input
                        type="date"
                        id="work_date"
                        name="work_date"
                        value={formData.work_date}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                          출근 시간
                        </label>
                        <input
                          type="time"
                          id="start_time"
                          name="start_time"
                          value={formData.start_time}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                          퇴근 시간
                        </label>
                        <input
                          type="time"
                          id="end_time"
                          name="end_time"
                          value={formData.end_time}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
                        메모
                      </label>
                      <textarea
                        id="memo"
                        name="memo"
                        value={formData.memo}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
