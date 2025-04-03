"use client"

import { ArrowLeft, Download } from "lucide-react"
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

interface SalaryData {
  userId: string
  userName: string
  month: string
  totalHours: number
  hourlyRate: number
  totalSalary: number
}

export default function SalaryReportPage() {
  const [_user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [salaryData, setSalaryData] = useState<SalaryData[]>([])
  const [month, setMonth] = useState("2023-09")
  const [generating, setGenerating] = useState(false)
  const [_setSuccess, setSuccess] = useState(false)

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

        // 초기 월급 데이터 샘플 (실제로는 API에서 가져와야 함)
        setSalaryData([
          {
            userId: "1",
            userName: "홍길동",
            month: "2023-09",
            totalHours: 160,
            hourlyRate: 15000,
            totalSalary: 2400000,
          },
          {
            userId: "2",
            userName: "김철수",
            month: "2023-09",
            totalHours: 140,
            hourlyRate: 14000,
            totalSalary: 1960000,
          },
          {
            userId: "3",
            userName: "이영희",
            month: "2023-09",
            totalHours: 170,
            hourlyRate: 16000,
            totalSalary: 2720000,
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

  const generateReport = async () => {
    setGenerating(true)
    // 실제로는 이 부분에서 API 호출을 통해 보고서 생성
    setTimeout(() => {
      setGenerating(false)
      setSuccess(true)

      // 성공 메시지 3초 후 사라짐
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  const totalHours = salaryData.reduce((sum, item) => sum + item.totalHours, 0)
  const totalSalary = salaryData.reduce((sum, item) => sum + item.totalSalary, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <Link
                href="/admin"
                className="mr-4 flex items-center rounded-md bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                <ArrowLeft className="mr-1 h-5 w-5" />
                뒤로
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">급여 보고서</h1>
            </div>
            <p className="mt-2 text-gray-600">직원들의 근무시간과 급여를 확인하고 보고서를 생성합니다.</p>
          </div>
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-red-300"
          >
            <Download className="mr-2 h-4 w-4" />
            {generating ? "생성 중..." : "보고서 다운로드"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="month" className="block text-sm font-medium text-gray-700">
            월 선택
          </label>
          <div className="mt-1">
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-red-500 focus:ring-red-500 focus:outline-none sm:text-sm"
            >
              <option value="2023-09">2023년 9월</option>
              <option value="2023-08">2023년 8월</option>
              <option value="2023-07">2023년 7월</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">급여 요약</h2>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-sm text-gray-500">직원 수</p>
                <p className="text-2xl font-bold text-blue-600">{salaryData.length}명</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-sm text-gray-500">총 근무시간</p>
                <p className="text-2xl font-bold text-green-600">{totalHours}시간</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-sm text-gray-500">총 급여</p>
                <p className="text-2xl font-bold text-red-600">{totalSalary.toLocaleString()}원</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    직원명
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    근무 시간
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
                    총 급여
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {salaryData.map((data) => (
                  <tr key={data.userId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{data.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.totalHours}시간</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.hourlyRate.toLocaleString()}원</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{data.totalSalary.toLocaleString()}원</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
