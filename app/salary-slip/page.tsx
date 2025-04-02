"use client"

import { ArrowLeft, Download } from "lucide-react"
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
  userId: string
  workDate: string
  startTime: string
  endTime: string
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

export default function SalarySlipPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7))
  const [salaryData, setSalaryData] = useState<SalarySlip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState<User | null>(null)

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

        const data = await response.json()
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

      const data = await response.json()
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
    try {
      const response = await fetch(`/api/users/me/salary-slip/pdf?month=${selectedMonth}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("PDF 생성에 실패했습니다.")
      }

      // PDF 다운로드 처리
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `급여명세서_${selectedMonth}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF 다운로드 오류:", err)
      setError(err instanceof Error ? err.message : "PDF 생성 중 오류가 발생했습니다.")
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="mr-4 rounded-full p-2 text-gray-600 hover:bg-gray-200">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">나의 급여 명세서</h1>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        {error ? <div className="mb-6 rounded-md bg-red-50 p-4 text-red-600">{error}</div> : null}

        {salaryData ? (
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
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          메모
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
                            {workLog.hourlyRate.toLocaleString()}원
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                            {workLog.paymentAmount.toLocaleString()}원
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{workLog.memo || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={downloadPdf}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF 다운로드
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-lg text-gray-600">{error ? error : "선택한 월의 급여 정보가 없습니다."}</p>
          </div>
        )}
      </div>
    </div>
  )
}
