"use client"

import { ArrowLeft, Download, Eye } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import SalarySlipDetailModal from "@/components/SalarySlipDetailModal"
import AdminLayout from "../components/AdminLayout"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

interface AuthResponse {
  user: User
}

// Matches the summary API response (/api/salary-report)
interface SalaryReportItem {
  userId: string
  userName: string
  totalDays: number
  totalHours: number
  hourlyRate: number | string // User's current rate for reference
  totalSalary: number | string
}

// Matches the detail API response (/api/users/[id]/salary-slip)
interface SalarySlipDetailData {
  user: {
    id: string
    name: string
    hourlyRate: number | string
  }
  month: string
  details: Array<{
    date: string
    startTime: string
    endTime: string
    breakStartTime?: string | null
    breakEndTime?: string | null
    workHours: number
    hourlyRate: number | string
    dailyPayment: number | string
    memo?: string | null
  }>
  summary: {
    totalWorkDays: number
    totalWorkHours: number
    totalPayment: number | string
  }
}

export default function SalaryReportPage() {
  const [_user, setUser] = useState<User | null>(null)
  const [loadingReport, setLoadingReport] = useState(true)
  const [reportError, setReportError] = useState("")
  const [salaryReportData, setSalaryReportData] = useState<SalaryReportItem[]>([])
  const [filteredReportData, setFilteredReportData] = useState<SalaryReportItem[]>([])
  const [nameSearch, setNameSearch] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    return `${year}-${month}`
  })
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSlipData, setModalSlipData] = useState<SalarySlipDetailData | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Add a handler for the name search input
  const handleNameSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setNameSearch(searchTerm)

    // Filter the salary report data based on the search term
    if (searchTerm.trim() === "") {
      setFilteredReportData(salaryReportData) // Show all if search is empty
    } else {
      const filtered = salaryReportData.filter((item) => item.userName.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredReportData(filtered)
    }
  }

  // Fetch main salary report summary data
  const fetchSalaryReport = async (month: string) => {
    setLoadingReport(true)
    setReportError("")
    setSalaryReportData([]) // Clear previous data
    setFilteredReportData([]) // Clear filtered data
    try {
      const response = await fetch(`/api/salary-report?month=${month}`, {
        credentials: "include",
      })
      const data = (await response.json()) as SalaryReportItem[] | { error: string }

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "급여 보고서 요약 정보를 가져오는데 실패했습니다.")
      }
      setSalaryReportData(data as SalaryReportItem[])
      setFilteredReportData(data as SalaryReportItem[]) // Initialize filtered data with all data
    } catch (err) {
      console.error("급여 보고서 요약 로드 오류:", err)
      setReportError(err instanceof Error ? err.message : "급여 보고서 요약 정보를 가져오는데 실패했습니다.")
      setSalaryReportData([])
      setFilteredReportData([])
    } finally {
      setLoadingReport(false)
    }
  }

  // Fetch detailed salary slip data for the modal
  const fetchSalarySlipDetail = async (userId: string, month: string) => {
    setModalLoading(true)
    setModalError(null)
    setModalSlipData(null)
    setIsModalOpen(true) // Open modal immediately to show loading state
    try {
      const response = await fetch(`/api/users/${userId}/salary-slip?month=${month}`, {
        credentials: "include",
      })
      const data = (await response.json()) as SalarySlipDetailData | { error: string }

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "상세 급여명세서 정보를 가져오는데 실패했습니다.")
      }
      setModalSlipData(data as SalarySlipDetailData)
    } catch (err) {
      console.error(`상세 명세서 로드 오류 (User: ${userId}, Month: ${month}):`, err)
      setModalError(err instanceof Error ? err.message : "상세 명세서 정보를 가져오는데 실패했습니다.")
      setModalSlipData(null) // Clear data on error
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    // Initial authentication check
    const checkAdminAuth = async () => {
      setLoadingReport(true) // Use the report loading state
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
        // Fetch initial report after auth success
        fetchSalaryReport(selectedMonth)
      } catch (err) {
        console.error("관리자 인증 오류:", err)
        setReportError(err instanceof Error ? err.message : "관리자 인증 중 오류가 발생했습니다.")
        window.location.href = "/auth/login"
        setLoadingReport(false)
      }
    }
    checkAdminAuth()
  }, []) // Runs only on mount

  useEffect(() => {
    // Fetch report data when selectedMonth changes (but not on initial mount)
    // The initial fetch is handled after auth check
    if (_user) {
      // Ensure user is set before fetching based on month change
      fetchSalaryReport(selectedMonth)
      setSelectedUserIds(new Set()) // Reset selection
    }
  }, [selectedMonth, _user]) // Depend on _user to avoid fetch before auth

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allUserIds = new Set(filteredReportData.map((item) => item.userId))
      setSelectedUserIds(allUserIds)
    } else {
      setSelectedUserIds(new Set())
    }
  }

  const handleSelectUser = (userId: string, isSelected: boolean) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev)
      if (isSelected) {
        newSet.add(userId)
      } else {
        newSet.delete(userId)
      }
      return newSet
    })
  }

  const handleDownloadSelected = async () => {
    if (selectedUserIds.size === 0) {
      setReportError("다운로드할 직원을 선택하세요.")
      return
    }
    setGeneratingPdf(true)
    setReportError("")
    setSuccessMsg("")
    console.log("Downloading PDFs for users:", Array.from(selectedUserIds), "Month:", selectedMonth)

    try {
      const response = await fetch("/api/salary-slips/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds), month: selectedMonth }),
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
      a.download = `급여명세서_${selectedMonth}_${selectedUserIds.size}명.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setSuccessMsg(`${selectedUserIds.size}명의 급여명세서 PDF 다운로드를 완료했습니다.`)
      setSelectedUserIds(new Set()) // Clear selection
    } catch (err) {
      console.error("PDF 다운로드 오류:", err)
      setReportError(err instanceof Error ? err.message : "PDF 다운로드 중 오류가 발생했습니다.")
    } finally {
      setGeneratingPdf(false)
      setTimeout(() => setSuccessMsg(""), 5000)
    }
  }

  const handleViewDetails = (userId: string) => {
    // Call the function to fetch details and open the modal
    fetchSalarySlipDetail(userId, selectedMonth)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalSlipData(null)
    setModalError(null)
  }

  // Memoize summary calculations
  const summary = useMemo(() => {
    return {
      totalEmployees: filteredReportData.length,
      totalHours: filteredReportData.reduce((sum, item) => sum + Number(item.totalHours || 0), 0),
      totalSalary: filteredReportData.reduce((sum, item) => sum + Number(item.totalSalary || 0), 0),
    }
  }, [filteredReportData])

  const isAllSelected = filteredReportData.length > 0 && selectedUserIds.size === filteredReportData.length

  // Combined loading state for initial page load
  const initialLoading = loadingReport && !_user

  // Add a new action button component for the AdminLayout
  const actionButtons = null // Remove the download button from here

  if (initialLoading) {
    return (
      <AdminLayout title="급여 보고서" isLoading={true}>
        {/* AdminLayout handles loading state */}
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="급여 보고서" error={reportError} success={successMsg} actions={actionButtons}>
      <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                조회 월
              </label>
              <input
                type="month"
                id="month"
                name="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="nameSearch" className="block text-sm font-medium text-gray-700">
                이름 검색
              </label>
              <input
                type="text"
                id="nameSearch"
                value={nameSearch}
                onChange={handleNameSearch}
                placeholder="직원 이름 검색"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleDownloadSelected}
            disabled={generatingPdf || selectedUserIds.size === 0}
            className={`flex items-center rounded-md px-4 py-2 text-white ${
              generatingPdf || selectedUserIds.size === 0
                ? "cursor-not-allowed bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none"
            }`}
          >
            <Download className="mr-2 h-4 w-4" />
            {generatingPdf
              ? "PDF 생성 중..."
              : `선택한 직원 명세서 다운로드 ${selectedUserIds.size > 0 ? `(${selectedUserIds.size}명)` : ""}`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected && filteredReportData.length > 0}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">직원</th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                총 근무일수
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                총 근무시간
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                시급 (참고용)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                총 급여
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loadingReport ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                  급여 데이터를 불러오는 중...
                </td>
              </tr>
            ) : filteredReportData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                  선택한 기간에 급여 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredReportData.map((item) => (
                <tr key={item.userId} className="hover:bg-gray-50">
                  <td className="w-12 px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(item.userId)}
                      onChange={(e) => handleSelectUser(item.userId, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.userName}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.totalDays || 0}일</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{Number(item.totalHours).toFixed(2)}시간</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{Number(item.hourlyRate).toLocaleString()}원</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {Number(item.totalSalary).toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => fetchSalarySlipDetail(item.userId, selectedMonth)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                      title="상세 보기"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-4 py-3 text-right font-medium" colSpan={2}>
                총계: {filteredReportData.length}명
              </td>
              <td className="px-4 py-3 text-left font-medium">
                {filteredReportData.reduce((sum, item) => sum + Number(item.totalDays || 0), 0)}일
              </td>
              <td className="px-4 py-3 text-left font-medium">
                {filteredReportData.reduce((sum, item) => sum + Number(item.totalHours), 0).toFixed(2)}시간
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-left font-medium" colSpan={2}>
                {filteredReportData.reduce((sum, item) => sum + Number(item.totalSalary), 0).toLocaleString()}원
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Salary Slip Detail Modal */}
      <SalarySlipDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        slipData={modalSlipData}
        isLoading={modalLoading}
        error={modalError}
      />
    </AdminLayout>
  )
}
