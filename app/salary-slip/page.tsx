"use client"

import { Download } from "lucide-react"
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
  breakStartTime?: string | null
  breakEndTime?: string | null
  workHours: number
  hourlyRate: number
  paymentAmount: number
  memo: string | null
}

interface SalarySlip {
  user: {
    id: string
    name: string
    hourlyRate: number
  }
  month: string
  details: WorkLog[]
  summary: {
    totalWorkDays: number
    totalWorkHours: number
    totalPayment: number
  }
}

// API 응답 타입 정의
interface MeApiResponse {
  user: User
}

export default function SalarySlipPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7))
  const [salaryData, setSalaryData] = useState<SalarySlip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    // 사용자 인증 확인
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (!response.ok) {
          window.location.href = "/auth/login"
          return
        }

        const data = (await response.json()) as MeApiResponse
        setUser(data.user)
        await fetchSalaryData(selectedMonth)
      } catch (err) {
        console.error("인증 확인 오류:", err)
        setError(err instanceof Error ? err.message : "인증 확인 중 오류가 발생했습니다.")
        setLoading(false)
      }
    }

    checkAuth()
  }, [selectedMonth])

  const fetchSalaryData = async (month: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/users/me/salary-slip?month=${month}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`급여 정보를 가져오는데 실패했습니다 (${response.status})`)
      }

      const data = (await response.json()) as SalarySlip
      setSalaryData(data)
    } catch (err) {
      console.error("급여 정보 로드 오류:", err)
      setError(err instanceof Error ? err.message : "급여 정보를 가져오는데 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value)
  }

  const downloadPdf = async () => {
    if (!user) return

    setGeneratingPdf(true)
    setError("")
    setSuccess("")

    try {
      // 어드민 페이지와 동일한 방식으로 구현 - 단일 사용자 PDF 다운로드 요청
      const response = await fetch(`/api/salary-slips/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [user.id], month: selectedMonth }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || "PDF 다운로드 실패")
      }

      const blob = await response.blob()
      // Trigger file download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `급여명세서_${selectedMonth}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setSuccess("급여명세서 PDF 다운로드가 완료되었습니다.")
      setTimeout(() => setSuccess(""), 5000)
    } catch (err) {
      console.error("PDF 다운로드 오류:", err)
      setError(err instanceof Error ? err.message : "PDF 다운로드 중 오류가 발생했습니다.")
    } finally {
      setGeneratingPdf(false)
    }
  }

  // 월 이름 포맷팅 함수
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    return `${year}년 ${month}월`
  }

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // Action buttons
  const actionButtons = (
    <>
      <div className="flex items-center space-x-4">
        <input
          type="month"
          value={selectedMonth}
          onChange={handleMonthChange}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
        {salaryData && (
          <button
            onClick={downloadPdf}
            disabled={generatingPdf}
            className={`flex items-center rounded-md px-4 py-2 text-white ${
              generatingPdf ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Download className="mr-2 h-4 w-4" />
            {generatingPdf ? "PDF 생성 중..." : "PDF 다운로드"}
          </button>
        )}
      </div>
    </>
  )

  return (
    <UserLayout title="급여 명세서" error={error} success={success} isLoading={loading} actions={actionButtons}>
      {salaryData && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">{formatMonth(selectedMonth)} 급여 명세서</h2>
              <p className="text-sm text-gray-500">
                {salaryData.user.name} ({user?.email})
              </p>
            </div>
            <div className="p-6">
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-sm font-medium text-blue-800">총 근무일수</p>
                  <p className="text-2xl font-bold text-blue-600">{salaryData.summary.totalWorkDays}일</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-sm font-medium text-green-800">총 근무시간</p>
                  <p className="text-2xl font-bold text-green-600">{salaryData.summary.totalWorkHours}시간</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 text-center">
                  <p className="text-sm font-medium text-purple-800">총 급여</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {salaryData.summary.totalPayment.toLocaleString()}원
                  </p>
                </div>
              </div>

              <div className="mb-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        날짜
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        출근
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        퇴근
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        근무시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        시급
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        일급
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {salaryData.details.map((workLog) => (
                      <tr key={workLog.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {formatDate(workLog.workDate)}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{workLog.startTime}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{workLog.endTime}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{workLog.workHours}시간</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {Math.round(Number(workLog.hourlyRate)).toLocaleString()}원
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                          {Math.round(Number(workLog.paymentAmount)).toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  )
}
