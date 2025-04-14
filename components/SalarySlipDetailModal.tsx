"use client"

import { X } from "lucide-react"

interface SalarySlipDetail {
  user: {
    id: string
    name: string
    hourlyRate: number | string // Can be string from DB
  }
  month: string // YYYY-MM
  details: Array<{
    date: string // YYYY-MM-DD
    startTime: string // HH:MM
    endTime: string // HH:MM
    breakStartTime?: string | null // HH:MM
    breakEndTime?: string | null // HH:MM
    workHours: number
    hourlyRate: number | string // Can be string from DB
    dailyPayment: number | string // Can be string from DB
    memo?: string | null
  }>
  summary: {
    totalWorkDays: number
    totalWorkHours: number
    totalPayment: number | string // Can be string from DB
  }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  slipData: SalarySlipDetail | null
  isLoading: boolean
  error: string | null
}

// Helper to format date string YYYY-MM-DD to MM/DD
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr + "T00:00:00") // Assume local time if no timezone
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${month}/${day}`
  } catch (e) {
    return dateStr // Return original if formatting fails
  }
}

// Convert hours to HH:MM format
const formatTimeHHMM = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60)
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

// Calculate time difference between two time strings (HH:MM)
const calculateTimeDiff = (start: string, end: string): number => {
  if (!start || !end) return 0

  const startParts = start.split(":")
  const endParts = end.split(":")

  if (startParts.length < 2 || endParts.length < 2) return 0

  const startHours = Number(startParts[0]) || 0
  const startMinutes = Number(startParts[1]) || 0
  const endHours = Number(endParts[0]) || 0
  const endMinutes = Number(endParts[1]) || 0

  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes

  // Return difference in hours (as decimal)
  return (endTotalMinutes - startTotalMinutes) / 60
}

export default function SalarySlipDetailModal({ isOpen, onClose, slipData, isLoading, error }: Props) {
  if (!isOpen) return null

  const formatCurrency = (value: number | string | undefined | null): string => {
    const num = Number(value)
    return isNaN(num) ? "0" : num.toLocaleString()
  }

  const formatHours = (value: number | undefined | null): string => {
    const num = Number(value)
    return isNaN(num) ? "0.00" : num.toFixed(2)
  }

  // Prevent closing modal when clicking inside the modal content
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    // Overlay div: Use RGBA for explicit transparency
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)] p-4" // Use RGBA for background and opacity
      onClick={onClose} // Close modal when overlay is clicked
      aria-modal="true"
      role="dialog"
    >
      {/* Modal Content div */}
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={handleContentClick} // Stop click from bubbling to overlay
      >
        {/* Modal Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {slipData ? `${slipData.user.name} (${slipData.month}) 급여 명세서` : "급여 명세서 로딩 중..."}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <p className="text-gray-500">명세서 정보를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-100 p-4 text-center text-red-700">오류: {error}</div>
          ) : slipData ? (
            <div className="space-y-6">
              {/* User Info and Summary */}
              <div className="grid grid-cols-1 gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">직원명</p>
                  <p className="text-lg font-semibold text-gray-900">{slipData.user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">기준 시급</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(slipData.user.hourlyRate)}원</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">대상 월</p>
                  <p className="text-lg font-semibold text-gray-900">{slipData.month}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">총 근무일수</p>
                  <p className="text-lg font-semibold text-gray-900">{slipData.summary.totalWorkDays}일</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">총 근무시간</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTimeHHMM(slipData.summary.totalWorkHours)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">총 지급액</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(slipData.summary.totalPayment)}원
                  </p>
                </div>
              </div>

              {/* Details Table */}
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        날짜
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        출근
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        퇴근
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                        총시간
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                        휴게시간
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                        근무시간
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                        적용시급
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                        일 지급액
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {slipData.details.length > 0 ? (
                      slipData.details.map((log, index) => {
                        // Calculate time differences
                        const totalTime = calculateTimeDiff(log.startTime, log.endTime)
                        const breakTime =
                          log.breakStartTime && log.breakEndTime
                            ? calculateTimeDiff(log.breakStartTime, log.breakEndTime)
                            : 0

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm whitespace-nowrap text-gray-900">
                              {formatDate(log.date)}
                            </td>
                            <td className="px-4 py-2 text-sm whitespace-nowrap text-gray-500">{log.startTime}</td>
                            <td className="px-4 py-2 text-sm whitespace-nowrap text-gray-500">{log.endTime}</td>
                            <td className="px-4 py-2 text-right text-sm whitespace-nowrap text-gray-500">
                              {formatTimeHHMM(totalTime)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm whitespace-nowrap text-gray-500">
                              {formatTimeHHMM(breakTime)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm whitespace-nowrap text-gray-500">
                              {formatTimeHHMM(log.workHours)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm whitespace-nowrap text-gray-500">
                              {formatCurrency(log.hourlyRate)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-medium whitespace-nowrap text-gray-900">
                              {formatCurrency(log.dailyPayment)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-sm text-gray-500">
                          해당 월의 근무 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center">
              <p className="text-gray-500">명세서 데이터를 표시할 수 없습니다.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 text-right">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
