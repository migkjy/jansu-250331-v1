"use client"

import { ArrowLeft, Copy, Edit, Pencil, Plus, PlusCircle, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import AdminLayout from "../components/AdminLayout"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  hourlyRate?: number
  defaultBreakStartTime?: string
  defaultBreakEndTime?: string
}

interface WorkLog {
  id: string
  userId: string
  userName: string
  workDate: string // YYYY-MM-DD
  startTime: string // HH:MM or HH:MM:SS
  endTime: string // HH:MM or HH:MM:SS
  breakStartTime?: string | null // HH:MM or HH:MM:SS
  breakEndTime?: string | null // HH:MM or HH:MM:SS
  includeBreak?: boolean
  workHours: number
  hourlyRate: number
  paymentAmount: number
  memo?: string | null
}

interface ApiErrorResponse {
  error?: string
  details?: string
  message?: string
}

interface WorkLogResponse {
  message: string
  workLog: WorkLog // Assuming API returns the full WorkLog object
  error?: string
  isWarning?: boolean
}

// Define a type for error response
interface ErrorResponse {
  error: string
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayLocalDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = (today.getMonth() + 1).toString().padStart(2, "0") // Months are 0-indexed
  const day = today.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to format decimal hours to HH:MM
const formatHoursMinutes = (hours: number): string => {
  if (isNaN(hours) || hours < 0) return "00:00"
  const totalMinutes = Math.round(hours * 60)
  const hh = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0")
  const mm = (totalMinutes % 60).toString().padStart(2, "0")
  return `${hh}:${mm}`
}

// Helper function to format time to 'HH:MM' format
const formatTimeString = (timeStr: string | undefined | null): string => {
  if (!timeStr) return ""

  // If it's already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr

  // If it's in HH:MM:SS format, strip the seconds
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr.substring(0, 5)

  return timeStr
}

export default function AdminWorkLogsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [selectedWorkLog, setSelectedWorkLog] = useState<WorkLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [success, setSuccess] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [openMemoId, setOpenMemoId] = useState<string | null>(null)
  const [_popupDirection, _setPopupDirection] = useState<"up" | "down">("down")
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const memoRef = useRef<HTMLDivElement>(null)
  const initialLoadRef = useRef(false)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 초기 필터 값을 설정하는 함수
  const getInitialFilterDates = (): { startDate: string; endDate: string } => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const today = `${year}-${month}-${day}`

    return {
      startDate: today,
      endDate: today,
    }
  }

  const [filter, setFilter] = useState<{
    userId: string
    startDate: string
    endDate: string
    nameSearch: string
  }>({
    userId: "",
    ...getInitialFilterDates(),
    nameSearch: "",
  })

  const [filteredWorkLogs, setFilteredWorkLogs] = useState<WorkLog[]>([])

  // --- formData state update ---
  const initialFormData: Partial<WorkLog> & { includeBreak: boolean } = {
    userId: "",
    workDate: getTodayLocalDate(),
    startTime: "09:00",
    endTime: "18:00",
    includeBreak: false,
    breakStartTime: "12:00",
    breakEndTime: "13:00",
    hourlyRate: 0,
    memo: "",
  }
  const [formData, setFormData] = useState<Partial<WorkLog> & { includeBreak: boolean }>(initialFormData)

  const closeToast = () => {
    setError("")
    setSuccess("")
  }

  useEffect(() => {
    if (error || success) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(closeToast, 5000)
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [error, success])

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        if (!response.ok) throw new Error("Auth failed")
        const data = (await response.json()) as { user: User & { role: string } } | { error: string }
        if ("error" in data) throw new Error(data.error || "Authentication failed")
        if (!data.user || data.user.role !== "admin") throw new Error("Not admin")
        setUser(data.user as User)
        await fetchUsers()
      } catch (err) {
        console.error("관리자 인증 오류:", err)
        setError(err instanceof Error ? err.message : "관리자 인증 중 오류가 발생했습니다.")
        window.location.href = "/auth/login"
      } finally {
        // setLoading is handled after initial fetchWorkLogs
      }
    }
    checkAdminAuth()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", { credentials: "include" })
      if (!response.ok) throw new Error("사용자 목록을 가져오는데 실패했습니다.")
      const data = await response.json()
      setUsers(data as User[])
    } catch (err) {
      console.error("사용자 목록 로드 오류:", err)
      setError(err instanceof Error ? err.message : "사용자 목록을 가져오는데 오류가 발생했습니다.")
    }
  }

  // --- fetchWorkLogs refactored with null checks and proper typing ---
  const fetchWorkLogs = async (currentFilter?: {
    userId: string
    startDate: string
    endDate: string
    nameSearch?: string
  }) => {
    const filterToUse = currentFilter || filter
    console.log("Fetching with filter:", filterToUse)
    setLoading(true)
    setError("")
    try {
      // Convert string date format safely with null checking
      const convertDateFormat = (dateStr: string | undefined): string => {
        if (!dateStr) return ""

        // Check if the date is in Korean format (YYYY년 MM월 DD일)
        if (dateStr.includes("년") && dateStr.includes("월") && dateStr.includes("일")) {
          const parts = dateStr.split(/년|월|일/).filter(Boolean)
          if (parts.length >= 3) {
            // Safely access array elements with null checking
            const year = parts[0] ? parts[0].trim() : ""
            const month = parts[1] ? parts[1].trim().padStart(2, "0") : ""
            const day = parts[2] ? parts[2].trim().padStart(2, "0") : ""
            if (year && month && day) {
              return `${year}-${month}-${day}`
            }
          }
        }
        return dateStr // Return as is if not in Korean format
      }

      // Safely access filter properties with default empty strings
      const startDate = convertDateFormat(filterToUse?.startDate || "")
      const endDate = convertDateFormat(filterToUse?.endDate || "")

      if (!startDate || !endDate) {
        throw new Error("시작일과 종료일을 선택해주세요.")
      }

      let url = `/api/work-logs?startDate=${startDate}&endDate=${endDate}`
      if (filterToUse?.userId) url += `&userId=${filterToUse.userId}`

      const response = await fetch(url, { credentials: "include" })
      const responseData: unknown = await response.json()

      if (!response.ok) {
        let errorMessage = "근무내역을 가져오는데 실패했습니다."

        if (responseData && typeof responseData === "object") {
          if ("error" in responseData && typeof responseData.error === "string") {
            errorMessage = responseData.error
          } else if ("message" in responseData && typeof responseData.message === "string") {
            errorMessage = responseData.message
          } else if ("details" in responseData && typeof responseData.details === "string") {
            errorMessage = responseData.details
          }
        }

        throw new Error(errorMessage)
      }

      if (!Array.isArray(responseData)) {
        console.error("API Success Response is not an array:", responseData)
        throw new Error("근무 내역 형식이 올바르지 않습니다.")
      }

      const sortedWorkLogs = (responseData as WorkLog[]).sort((a, b) => {
        const dateComparison = new Date(a.workDate).getTime() - new Date(b.workDate).getTime()
        if (dateComparison !== 0) return dateComparison
        return (a.startTime || "").localeCompare(b.startTime || "")
      })

      setWorkLogs(sortedWorkLogs)

      // Apply name search filter if it exists
      if (filterToUse?.nameSearch && filterToUse.nameSearch.trim() !== "") {
        setFilteredWorkLogs(
          sortedWorkLogs.filter((log) => log.userName.toLowerCase().includes(filterToUse.nameSearch!.toLowerCase()))
        )
      } else {
        setFilteredWorkLogs(sortedWorkLogs)
      }
    } catch (err) {
      console.error("근무내역 로드 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역을 가져오는데 오류가 발생했습니다.")
      setWorkLogs([])
      setFilteredWorkLogs([])
    } finally {
      setLoading(false)
    }
  }
  // --- End fetchWorkLogs refactoring ---

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target
    setFilter((prev) => ({ ...prev, [name]: value }))
  }

  const handleSearch = () => {
    fetchWorkLogs(filter) // Pass the current filter state
  }

  // Add a function to filter work logs by employee name
  const handleNameSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setFilter((prev) => ({ ...prev, nameSearch: searchTerm }))

    // Apply filtering to the current work logs based on name search
    if (searchTerm.trim() === "") {
      setFilteredWorkLogs(workLogs) // Show all if search is empty
    } else {
      const filtered = workLogs.filter((log) => log.userName.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredWorkLogs(filtered)
    }
  }

  // --- handleInputChange adjusted for break times and checkbox ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const isCheckbox = type === "checkbox"

    if (name === "userId" && value) {
      const selectedUser = users.find((u) => u.id === value)
      if (selectedUser) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          hourlyRate: selectedUser.hourlyRate || 0,
          breakStartTime: selectedUser.defaultBreakStartTime
            ? formatTimeString(selectedUser.defaultBreakStartTime)
            : "12:00",
          breakEndTime: selectedUser.defaultBreakEndTime ? formatTimeString(selectedUser.defaultBreakEndTime) : "13:00",
        }))
        return // Exit early after setting user-specific data
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    }))
  }
  // --- End handleInputChange adjustment ---

  // --- calculateHours adjusted for break times ---
  const calculateHours = (
    start: string,
    end: string,
    includeBreak?: boolean,
    breakStart?: string | null,
    breakEnd?: string | null
  ): number => {
    try {
      if (!start || !end) return 0
      const today = "1970-01-01"
      const startTimeMs = new Date(`${today}T${start}Z`).getTime()
      const endTimeMs = new Date(`${today}T${end}Z`).getTime()

      if (isNaN(startTimeMs) || isNaN(endTimeMs) || endTimeMs <= startTimeMs) {
        return 0
      }

      const grossWorkMs = endTimeMs - startTimeMs

      let breakMs = 0
      if (includeBreak && breakStart && breakEnd) {
        const breakStartTimeMs = new Date(`${today}T${breakStart}Z`).getTime()
        const breakEndTimeMs = new Date(`${today}T${breakEnd}Z`).getTime()
        if (!isNaN(breakStartTimeMs) && !isNaN(breakEndTimeMs) && breakEndTimeMs > breakStartTimeMs) {
          breakMs = breakEndTimeMs - breakStartTimeMs
        }
      }

      const netWorkMs = Math.max(0, grossWorkMs - breakMs)
      const netWorkHours = netWorkMs / (1000 * 60 * 60)

      return Math.round(netWorkHours * 100) / 100
    } catch (error) {
      console.error("시간 계산 오류:", error)
      return 0
    }
  }
  // --- End calculateHours adjustment ---

  // --- handleAddWorkLog adjusted for break times ---
  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setWarning("")
    setSuccess("")

    // Assert formData types more strictly if needed, or use defaults
    const currentFormData = formData as Partial<WorkLog> & { includeBreak: boolean }

    const calculatedHours = calculateHours(
      currentFormData.startTime ?? "00:00", // Provide default if potentially undefined
      currentFormData.endTime ?? "00:00",
      currentFormData.includeBreak,
      currentFormData.breakStartTime,
      currentFormData.breakEndTime
    )

    if (calculatedHours <= 0 && currentFormData.startTime !== currentFormData.endTime) {
      setError("종료 시간은 시작 시간보다 늦어야 하며, 유효한 근무 시간이 산출되어야 합니다.")
      return
    }

    if (!currentFormData.hourlyRate || currentFormData.hourlyRate <= 0) {
      const selectedUser = users.find((u) => u.id === currentFormData.userId)
      if (!selectedUser?.hourlyRate) {
        setWarning("선택한 직원의 시급 정보가 없습니다. 직원 정보에서 시급을 설정해주세요.")
        return
      }
      // Use selected user's rate if input is invalid
      currentFormData.hourlyRate = selectedUser.hourlyRate
    }

    const paymentAmount = Math.round(calculatedHours * currentFormData.hourlyRate)

    const workLogData = {
      user_id: currentFormData.userId,
      work_date: currentFormData.workDate,
      start_time: currentFormData.startTime,
      end_time: currentFormData.endTime,
      break_start_time: currentFormData.includeBreak ? currentFormData.breakStartTime : null,
      break_end_time: currentFormData.includeBreak ? currentFormData.breakEndTime : null,
      include_break: currentFormData.includeBreak,
      work_hours: calculatedHours,
      hourly_rate: currentFormData.hourlyRate,
      payment_amount: paymentAmount,
      memo: currentFormData.memo,
    }

    try {
      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workLogData),
        credentials: "include",
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Check if response has isWarning flag
        if (responseData && typeof responseData === "object" && "isWarning" in responseData) {
          setWarning(
            responseData &&
              typeof responseData === "object" &&
              "error" in responseData &&
              typeof responseData.error === "string"
              ? responseData.error
              : "시급 정보가 없습니다. 직원 정보에서 시급을 설정해주세요."
          )
          return
        }
        // Regular errors
        throw new Error(
          responseData &&
          typeof responseData === "object" &&
          "error" in responseData &&
          typeof responseData.error === "string"
            ? responseData.error
            : "근무기록을 저장할 수 없습니다. 입력 정보를 확인해 주세요."
        )
      }

      // Success, show message and update UI
      setSuccess("근무내역이 성공적으로 추가되었습니다.")
      setShowAddModal(false)
      setFormData(initialFormData) // Reset form
      fetchWorkLogs() // Refresh list using current state filter
    } catch (err) {
      console.error("근무내역 추가 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역 추가 중 오류가 발생했습니다.")
    }
  }
  // --- End handleAddWorkLog adjustment ---

  // --- handleEditWorkLog adjusted for break times ---
  const handleEditWorkLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkLog) return

    setError("")
    setSuccess("")
    setWarning("") // Clear any previous warnings

    const currentFormData = formData as Partial<WorkLog> & { includeBreak: boolean }

    const calculatedHours = calculateHours(
      currentFormData.startTime ?? "00:00",
      currentFormData.endTime ?? "00:00",
      currentFormData.includeBreak,
      currentFormData.breakStartTime,
      currentFormData.breakEndTime
    )

    if (calculatedHours <= 0 && currentFormData.startTime !== currentFormData.endTime) {
      setError("종료 시간은 시작 시간보다 늦어야 하며, 유효한 근무 시간이 산출되어야 합니다.")
      return
    }

    if (!currentFormData.hourlyRate || currentFormData.hourlyRate <= 0) {
      setError("유효한 시급을 입력해주세요.")
      return
    }

    const paymentAmount = Math.round(calculatedHours * currentFormData.hourlyRate)

    const workLogData = {
      work_date: currentFormData.workDate,
      start_time: currentFormData.startTime,
      end_time: currentFormData.endTime,
      break_start_time: currentFormData.includeBreak ? currentFormData.breakStartTime : null,
      break_end_time: currentFormData.includeBreak ? currentFormData.breakEndTime : null,
      include_break: currentFormData.includeBreak,
      work_hours: calculatedHours,
      hourly_rate: currentFormData.hourlyRate,
      payment_amount: paymentAmount,
      memo: currentFormData.memo,
    }

    try {
      const response = await fetch(`/api/work-logs/${selectedWorkLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workLogData),
        credentials: "include",
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Check if response has isWarning flag
        if (
          responseData &&
          typeof responseData === "object" &&
          "isWarning" in responseData &&
          responseData.isWarning === true
        ) {
          // Display warning but keep the modal open
          setWarning(
            responseData &&
              typeof responseData === "object" &&
              "error" in responseData &&
              typeof responseData.error === "string"
              ? responseData.error
              : "근무시간이 기존의 다른 근무기록과 겹칩니다. 시간을 조정해주세요."
          )
          // Do not close the modal
          return
        }
        // Regular errors
        throw new Error(
          responseData &&
          typeof responseData === "object" &&
          "error" in responseData &&
          typeof responseData.error === "string"
            ? responseData.error
            : "근무내역 수정 중 오류가 발생했습니다."
        )
      }

      setSuccess("근무내역이 성공적으로 수정되었습니다.")
      setShowEditModal(false)
      setSelectedWorkLog(null)
      fetchWorkLogs() // Refresh list using current state filter
    } catch (err) {
      console.warn("근무내역 수정 알림:", err)
      setError(err instanceof Error ? err.message : "근무내역 수정 중 문제가 발생했습니다. 입력 시간을 확인해 주세요.")
    }
  }
  // --- End handleEditWorkLog adjustment ---

  const handleDeleteWorkLog = async (id: string) => {
    if (!confirm("정말로 이 근무내역을 삭제하시겠습니까?")) return

    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/work-logs/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorDetails = responseData as ErrorResponse
        throw new Error(
          (errorDetails && typeof errorDetails === "object" && "error" in errorDetails && errorDetails.error) ||
            "근무내역을 삭제할 수 없습니다. 잠시 후 다시 시도해 주세요."
        )
      }

      setSuccess("근무내역이 성공적으로 삭제되었습니다.")
      fetchWorkLogs() // Refresh list
    } catch (err) {
      console.error("근무내역 삭제 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역을 삭제할 수 없습니다. 잠시 후 다시 시도해 주세요.")
    }
  }

  // --- handleEditClick adjusted for break times ---
  const handleEditClick = (workLog: WorkLog) => {
    setSelectedWorkLog(workLog)
    const hasBreak = !!(workLog.breakStartTime && workLog.breakEndTime)

    // Ensure all required fields are present, using defaults for safety
    setFormData({
      id: workLog.id,
      userId: workLog.userId,
      userName: workLog.userName,
      workDate: workLog.workDate, // Use workDate directly without formatting
      startTime: formatTimeString(workLog.startTime) || "00:00",
      endTime: formatTimeString(workLog.endTime) || "00:00",
      includeBreak: hasBreak,
      breakStartTime: formatTimeString(workLog.breakStartTime) || "12:00",
      breakEndTime: formatTimeString(workLog.breakEndTime) || "13:00",
      workHours: workLog.workHours ?? 0,
      hourlyRate: workLog.hourlyRate ?? 0,
      paymentAmount: workLog.paymentAmount ?? 0,
      memo: workLog.memo || "",
    })
    setShowEditModal(true)
  }
  // --- End handleEditClick adjustment ---

  // --- formatDateString adjusted for potential invalid dates ---
  const formatDateString = (dateStr?: string | Date): string => {
    if (!dateStr) return ""

    try {
      if (dateStr instanceof Date) {
        // Handle Date object
        const y = dateStr.getFullYear()
        const m = String(dateStr.getMonth() + 1).padStart(2, "0")
        const d = String(dateStr.getDate()).padStart(2, "0")
        return `${y}년 ${m}월 ${d}일`
      } else {
        // Handle string
        // Try to parse ISO format first (YYYY-MM-DD)
        if (dateStr.includes("-")) {
          const parts = dateStr.split("-")
          if (parts.length === 3) {
            const [year, month, day] = parts
            // Check for valid month/day numbers if needed
            if (year && month && day) {
              const date = new Date(Number(year), Number(month) - 1, Number(day))
              return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월 ${String(
                date.getDate()
              ).padStart(2, "0")}일`
            }
          }
        }
        return dateStr // Return as is if can't parse
      }
    } catch (error) {
      console.error("Date formatting error:", error)
      return dateStr.toString() // Return original as string
    }
  }
  // --- End formatDateString adjustment ---

  // 화면 로딩 시 근무내역 자동 로드를 위한 useEffect
  useEffect(() => {
    if (!initialLoadRef.current && user && users.length > 0) {
      console.log("Initial fetchWorkLogs trigger")
      fetchWorkLogs() // Fetch logs based on initial state filter
      initialLoadRef.current = true
    }
  }, [user, users])

  // 날짜 프리셋 핸들러 추가
  const handleDatePreset = (preset: "today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth") => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (preset) {
      case "today":
        startDate = today
        endDate = today
        break
      case "yesterday":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        endDate = new Date(startDate)
        break
      case "last7days":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 6)
        endDate = today
        break
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case "lastMonth":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        endDate = new Date(today.getFullYear(), today.getMonth(), 0)
        break
    }

    const startDateFormatted = formatDateString(startDate)
    const endDateFormatted = formatDateString(endDate)

    const newFilter = {
      ...filter,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
    }

    setFilter(newFilter) // Update the state for UI consistency

    // Fetch logs immediately with the new filter for the preset
    fetchWorkLogs(newFilter)
  }

  // --- handleCopyToToday adjusted for break times ---
  const handleCopyToToday = async (log: WorkLog) => {
    const todayFormatted = getTodayLocalDate()
    const logDateFormatted = formatDateString(log.workDate)

    if (logDateFormatted === todayFormatted) {
      setError("이미 오늘 날짜의 근무내역입니다.")
      return
    }

    const existingLogsForToday = workLogs.filter(
      (existingLog) => formatDateString(existingLog.workDate) === todayFormatted && existingLog.userId === log.userId
    )
    const hasTimeConflict = existingLogsForToday.some((existingLog) => {
      // Ensure start/end times exist before comparing
      const newStart = log.startTime || ""
      const newEnd = log.endTime || ""
      const existingStart = existingLog.startTime || ""
      const existingEnd = existingLog.endTime || ""
      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      )
    })
    if (hasTimeConflict) {
      setError("해당 직원의 오늘 날짜에 이미 겹치는 시간대의 근무내역이 있습니다.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const selectedUser = users.find((u) => u.id === log.userId)
      if (!selectedUser?.hourlyRate) {
        setError("직원의 현재 시급 정보를 찾을 수 없습니다.")
        return
      }

      // Calculate hours using potentially null break times from original log
      const calculatedHours = calculateHours(
        log.startTime,
        log.endTime,
        !!(log.breakStartTime && log.breakEndTime),
        log.breakStartTime,
        log.breakEndTime
      )
      const paymentAmount = Math.round(calculatedHours * selectedUser.hourlyRate)

      const workLogData = {
        user_id: log.userId,
        work_date: todayFormatted,
        start_time: log.startTime,
        end_time: log.endTime,
        break_start_time: log.breakStartTime,
        break_end_time: log.breakEndTime,
        include_break: !!(log.breakStartTime && log.breakEndTime), // Derive from existence of break times
        work_hours: calculatedHours,
        hourly_rate: selectedUser.hourlyRate,
        payment_amount: paymentAmount,
        memo: log.memo || "", // Ensure memo is string
      }

      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workLogData),
        credentials: "include",
      })

      const data = (await response.json()) as WorkLogResponse | ApiErrorResponse

      if (!response.ok) {
        const errorDetails = data as ApiErrorResponse
        let errorMessage = errorDetails.error || "근무내역 복사 중 오류가 발생했습니다."
        if (response.status === 409) {
          errorMessage = errorDetails.error || "해당 시간대에 이미 근무내역이 존재합니다."
        }
        throw new Error(errorMessage)
      }

      setSuccess("근무내역이 오늘 날짜로 성공적으로 복사되었습니다.")
      fetchWorkLogs() // Refresh list
    } catch (err) {
      console.error("근무내역 복사 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역 복사 중 오류가 발생했습니다.")
    }
  }
  // --- End handleCopyToToday adjustment ---

  // --- handleMemoClick adjusted ---
  const handleMemoClick = (id: string, event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top

    let top = rect.bottom + window.scrollY + 5 // Default position below
    let left = rect.left + window.scrollX

    // Estimate popup height (adjust as needed)
    const estimatedPopupHeight = 100

    if (spaceBelow < estimatedPopupHeight && spaceAbove > spaceBelow) {
      // Position above if not enough space below
      top = rect.top + window.scrollY - estimatedPopupHeight - 5
    }

    // Prevent popup going off-screen horizontally
    const estimatedPopupWidth = 250 // Adjust as needed
    if (left + estimatedPopupWidth > window.innerWidth) {
      left = window.innerWidth - estimatedPopupWidth - 10 // Adjust with some padding
    }
    if (left < 0) left = 10 // Prevent going off left

    setPopupPosition({ top, left })
    setOpenMemoId(openMemoId === id ? null : id)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMemoId && memoRef.current && !memoRef.current.contains(event.target as Node)) {
        // Check if click is on the memo trigger itself before closing
        const memoTriggers = document.querySelectorAll("[data-memo-id]")
        let clickedOnTrigger = false
        memoTriggers.forEach((trigger) => {
          if (trigger.contains(event.target as Node)) {
            clickedOnTrigger = true
          }
        })
        // Only close if the click was outside AND not on another trigger
        if (!clickedOnTrigger) {
          setOpenMemoId(null)
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openMemoId])
  // --- End handleMemoClick adjustment ---

  // --- Modal open handlers ---
  const handleAddModalOpen = () => {
    setFormData(initialFormData) // Reset form to initial state
    setShowAddModal(true)
  }
  // --- End modal open handlers ---

  if (loading && !user) {
    return (
      <AdminLayout title="근무내역 관리" isLoading={true}>
        {/* AdminLayout handles loading state */}
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="근무내역 관리" error={error} warning={warning} success={success}>
      <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
              직원
            </label>
            <select
              id="userId"
              name="userId"
              value={filter.userId}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">모든 직원</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
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

          <div>
            <label htmlFor="nameSearch" className="block text-sm font-medium text-gray-700">
              이름 검색
            </label>
            <input
              type="text"
              id="nameSearch"
              name="nameSearch"
              value={filter.nameSearch}
              onChange={handleNameSearch}
              placeholder="직원 이름 검색"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="flex-grow rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
            >
              조회
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <button
            onClick={() => handleDatePreset("today")}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            오늘
          </button>
          <button
            onClick={() => handleDatePreset("yesterday")}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            어제
          </button>
          <button
            onClick={() => handleDatePreset("last7days")}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            지난 7일
          </button>
          <button
            onClick={() => handleDatePreset("thisMonth")}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            이번 달
          </button>
          <button
            onClick={() => handleDatePreset("lastMonth")}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            지난 달
          </button>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={handleAddModalOpen}
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
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">날짜</th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">직원</th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                출근시간
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                퇴근시간
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                휴게시간
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                근무시간
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">시급</th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">급여</th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">메모</th>
              <th className="px-3 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredWorkLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900">{formatDateString(log.workDate)}</td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900">{log.userName}</td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900">{formatTimeString(log.startTime)}</td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900">{formatTimeString(log.endTime)}</td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                  {log.breakStartTime && log.breakEndTime
                    ? `${formatTimeString(log.breakStartTime)} - ${formatTimeString(log.breakEndTime)}`
                    : "-"}
                </td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900">{log.workHours}시간</td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900">
                  {log.hourlyRate.toLocaleString()}원
                </td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900">
                  {log.paymentAmount.toLocaleString()}원
                </td>
                <td className="max-w-[150px] truncate px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                  {log.memo ? (
                    <div
                      className="cursor-pointer underline decoration-dotted"
                      onClick={(e) => handleMemoClick(log.id, e)}
                      title={log.memo}
                      data-memo-id={log.id}
                    >
                      {log.memo}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-4 text-center text-sm font-medium whitespace-nowrap">
                  <button
                    onClick={() => handleEditClick(log)}
                    className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                    title="수정"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCopyToToday(log)}
                    className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-green-50 p-1 text-green-600 hover:bg-green-100"
                    title="오늘로 복사"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWorkLog(log.id)}
                    className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-50 p-1 text-red-600 hover:bg-red-100"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredWorkLogs.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  조회된 근무내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={5} className="px-3 py-3 text-right font-medium">
                총 직원: {new Set(filteredWorkLogs.map((log) => log.userId)).size}명
              </td>
              <td className="px-3 py-3 text-left font-medium">
                {formatHoursMinutes(filteredWorkLogs.reduce((sum, log) => sum + Number(log.workHours), 0))}
              </td>
              <td className="px-3 py-3 text-left font-medium"></td>
              <td className="px-3 py-3 text-left font-medium">
                {Math.round(filteredWorkLogs.reduce((sum, log) => sum + Number(log.paymentAmount), 0)).toLocaleString()}
                원
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 근무내역 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-black opacity-50 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowAddModal(false)}
            />
            {/* Modal content */}
            <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">근무내역 추가</h3>
                <div className="mt-4">
                  <form onSubmit={handleAddWorkLog} className="space-y-4">
                    {/* User Select */}
                    <div>
                      <label htmlFor="add-userId" className="block text-sm font-medium text-gray-700">
                        직원
                      </label>
                      <select
                        id="add-userId"
                        name="userId"
                        value={formData.userId || ""} // Handle potential undefined
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="">직원 선택</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Work Date */}
                    <div>
                      <label htmlFor="add-workDate" className="block text-sm font-medium text-gray-700">
                        근무일
                      </label>
                      <input
                        type="date"
                        id="add-workDate"
                        name="workDate"
                        value={formData.workDate || ""} // Handle potential undefined
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    {/* Start & End Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="add-startTime" className="block text-sm font-medium text-gray-700">
                          출근 시간
                        </label>
                        <input
                          type="time"
                          id="add-startTime"
                          name="startTime"
                          value={formData.startTime || ""} // Handle potential undefined
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="add-endTime" className="block text-sm font-medium text-gray-700">
                          퇴근 시간
                        </label>
                        <input
                          type="time"
                          id="add-endTime"
                          name="endTime"
                          value={formData.endTime || ""} // Handle potential undefined
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                    {/* Break Time Section */}
                    <div className="space-y-2 rounded-md border border-gray-200 p-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="add-includeBreak"
                          name="includeBreak"
                          checked={!!formData.includeBreak} // Ensure boolean
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="add-includeBreak" className="ml-2 block text-sm text-gray-900">
                          휴게 시간 포함
                        </label>
                      </div>
                      {!!formData.includeBreak && (
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <div>
                            <label htmlFor="add-breakStartTime" className="block text-xs font-medium text-gray-500">
                              휴게 시작
                            </label>
                            <input
                              type="time"
                              id="add-breakStartTime"
                              name="breakStartTime"
                              value={formData.breakStartTime || ""} // Handle null/undefined
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              required={!!formData.includeBreak}
                            />
                          </div>
                          <div>
                            <label htmlFor="add-breakEndTime" className="block text-xs font-medium text-gray-500">
                              휴게 종료
                            </label>
                            <input
                              type="time"
                              id="add-breakEndTime"
                              name="breakEndTime"
                              value={formData.breakEndTime || ""} // Handle null/undefined
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              required={!!formData.includeBreak}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Hourly Rate */}
                    <div>
                      <label htmlFor="add-hourlyRate" className="block text-sm font-medium text-gray-700">
                        시급
                      </label>
                      <input
                        type="number"
                        id="add-hourlyRate"
                        name="hourlyRate"
                        value={formData.hourlyRate ?? ""} // Handle null/undefined for number input
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="직원 선택 시 자동 입력"
                        step="10"
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        직원 선택 시 해당 직원의 시급이 자동 입력됩니다. 직접 수정할 수도 있습니다.
                      </p>
                    </div>
                    {/* Memo */}
                    <div>
                      <label htmlFor="add-memo" className="block text-sm font-medium text-gray-700">
                        메모
                      </label>
                      <textarea
                        id="add-memo"
                        name="memo"
                        rows={3}
                        value={formData.memo || ""} // Handle null/undefined for textarea
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    {/* Action Buttons */}
                    <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="mr-2 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                      >
                        추가
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 근무내역 수정 모달 */}
      {showEditModal && selectedWorkLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-black opacity-50 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowEditModal(false)}
            />
            {/* Modal content */}
            <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">근무내역 수정</h3>
                <div className="mt-4">
                  <form onSubmit={handleEditWorkLog} className="space-y-4">
                    {/* User Display (Readonly) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">직원</label>
                      <p className="mt-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-900">
                        {users.find((u) => u.id === formData.userId)?.name || formData.userId}
                      </p>
                    </div>
                    {/* Work Date */}
                    <div>
                      <label htmlFor="edit-workDate" className="block text-sm font-medium text-gray-700">
                        근무일
                      </label>
                      <input
                        type="date"
                        id="edit-workDate"
                        name="workDate"
                        value={formData.workDate || ""} // Handle potential undefined
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    {/* Start & End Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-startTime" className="block text-sm font-medium text-gray-700">
                          출근 시간
                        </label>
                        <input
                          type="time"
                          id="edit-startTime"
                          name="startTime"
                          value={formData.startTime || ""} // Handle potential undefined
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-endTime" className="block text-sm font-medium text-gray-700">
                          퇴근 시간
                        </label>
                        <input
                          type="time"
                          id="edit-endTime"
                          name="endTime"
                          value={formData.endTime || ""} // Handle potential undefined
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                    {/* Break Time Section */}
                    <div className="space-y-2 rounded-md border border-gray-200 p-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="edit-includeBreak"
                          name="includeBreak"
                          checked={!!formData.includeBreak} // Ensure boolean
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="edit-includeBreak" className="ml-2 block text-sm text-gray-900">
                          휴게 시간 포함
                        </label>
                      </div>
                      {!!formData.includeBreak && (
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <div>
                            <label htmlFor="edit-breakStartTime" className="block text-xs font-medium text-gray-500">
                              휴게 시작
                            </label>
                            <input
                              type="time"
                              id="edit-breakStartTime"
                              name="breakStartTime"
                              value={formData.breakStartTime || ""} // Handle null/undefined
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              required={!!formData.includeBreak}
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-breakEndTime" className="block text-xs font-medium text-gray-500">
                              휴게 종료
                            </label>
                            <input
                              type="time"
                              id="edit-breakEndTime"
                              name="breakEndTime"
                              value={formData.breakEndTime || ""} // Handle null/undefined
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              required={!!formData.includeBreak}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Hourly Rate */}
                    <div>
                      <label htmlFor="edit-hourlyRate" className="block text-sm font-medium text-gray-700">
                        시급
                      </label>
                      <input
                        type="number"
                        id="edit-hourlyRate"
                        name="hourlyRate"
                        value={formData.hourlyRate ?? ""} // Handle null/undefined for number input
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        step="10"
                        min="0"
                        required
                      />
                    </div>
                    {/* Memo */}
                    <div>
                      <label htmlFor="edit-memo" className="block text-sm font-medium text-gray-700">
                        메모
                      </label>
                      <textarea
                        id="edit-memo"
                        name="memo"
                        rows={3}
                        value={formData.memo || ""} // Handle null/undefined for textarea
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required={!!formData.includeBreak}
                      />
                    </div>
                    {/* Action Buttons */}
                    <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="mr-2 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                      >
                        수정 저장
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
