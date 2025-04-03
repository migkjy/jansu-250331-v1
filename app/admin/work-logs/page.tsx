"use client"

import { ArrowLeft, Copy, Pencil, Plus, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  hourlyRate?: number
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
  memo: string | null
}

interface ApiErrorResponse {
  error?: string
  details?: string
}

interface WorkLogResponse {
  message: string
  workLog: WorkLog
}

// Define a type for error response
interface ErrorResponse {
  error: string
}

export default function AdminWorkLogsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedWorkLog, setSelectedWorkLog] = useState<WorkLog | null>(null)

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
  }>({
    userId: "",
    ...getInitialFilterDates(),
  })
  const [formData, setFormData] = useState({
    userId: "",
    workDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "18:00",
    hourlyRate: 0,
    memo: "",
  })
  const [openMemoId, setOpenMemoId] = useState<string | null>(null)
  const [_popupDirection, _setPopupDirection] = useState<"up" | "down">("down")
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const memoRef = useRef<HTMLDivElement>(null)
  // API 호출 중복 방지를 위한 ref
  const initialLoadRef = useRef(false)

  // 토스트 자동 닫힘 타이머를 위한 ref 추가
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 토스트 메시지 닫기 함수
  const closeToast = () => {
    setError("")
    setSuccess("")
  }

  // useEffect로 토스트 메시지 자동 닫힘 설정
  useEffect(() => {
    if (error || success) {
      // 이전 타이머가 있으면 제거
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }

      // 5초 후 메시지 자동 닫힘
      toastTimerRef.current = setTimeout(() => {
        closeToast()
      }, 5000)
    }

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [error, success])

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

        const data = (await response.json()) as {
          user: { id: string; name: string; email: string; role: "admin" | "user" }
        }

        if (data.user.role !== "admin") {
          window.location.href = "/"
          return
        }

        setUser(data.user as User)
        await fetchUsers()
        // fetchWorkLogs는 아래 useEffect에서 처리
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

  // 사용자 목록 가져오기
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("사용자 목록을 가져오는데 실패했습니다.")
      }

      const data = (await response.json()) as User[]
      setUsers(data)
    } catch (err) {
      console.error("사용자 목록 로드 오류:", err)
      setError(err instanceof Error ? err.message : "사용자 목록을 가져오는데 오류가 발생했습니다.")
    }
  }

  // 근무내역 가져오기
  const fetchWorkLogs = async () => {
    console.log("fetchWorkLogs 호출됨")
    setLoading(true)
    try {
      let url = `/api/work-logs?startDate=${filter.startDate}&endDate=${filter.endDate}`
      if (filter.userId) {
        url += `&userId=${filter.userId}`
      }

      console.log("근무내역 API 요청:", url)
      console.log("필터 정보:", {
        userId: filter.userId ? filter.userId : "모든 직원",
        startDate: filter.startDate,
        endDate: filter.endDate,
      })
      console.log("쿠키 확인:", document.cookie.includes("token") ? "토큰 있음" : "토큰 없음")

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const responseData = await response.json()
      console.log("API 응답:", response.status, responseData)
      console.log(
        "응답 데이터 타입:",
        Array.isArray(responseData) ? "배열(길이: " + responseData.length + ")" : typeof responseData
      )

      if (!response.ok) {
        const errorMessage =
          (responseData as ApiErrorResponse).error ||
          (responseData as ApiErrorResponse).details ||
          "근무내역을 가져오는데 실패했습니다."
        throw new Error(errorMessage)
      }

      setWorkLogs(
        (responseData as WorkLog[]).sort((a, b) => new Date(a.workDate).getTime() - new Date(b.workDate).getTime())
      )
    } catch (err) {
      console.error("근무내역 로드 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역을 가져오는데 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target
    setFilter((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSearch = () => {
    fetchWorkLogs()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // 사용자 선택 시 시급 자동 설정
    if (name === "userId" && value) {
      const selectedUser = users.find((u) => u.id === value)
      if (selectedUser && selectedUser.hourlyRate) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          hourlyRate: selectedUser.hourlyRate || 0, // undefined 방지
        }))
        return
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const calculateHours = (start: string, end: string): number => {
    try {
      // Date 객체를 사용하여 시간 차이 계산
      const today = new Date().toISOString().split("T")[0] // 오늘 날짜만 추출
      const startTime = new Date(`${today}T${start}`)
      const endTime = new Date(`${today}T${end}`)

      // 유효한 날짜인지 확인
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return 0
      }

      // 시간 차이 계산 (밀리초 -> 시간)
      const diffMs = endTime.getTime() - startTime.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      return diffHours <= 0 ? 0 : Math.round(diffHours * 100) / 100
    } catch (error) {
      console.error("시간 계산 오류:", error)
      return 0
    }
  }

  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.userId) {
      setError("직원을 선택해주세요.")
      return
    }

    setError("")
    setSuccess("")

    // 시간 유효성 검사
    if (formData.endTime <= formData.startTime) {
      setError("퇴근 시간은 출근 시간보다 늦어야 합니다.")
      return
    }

    try {
      // 시급 정보 확인
      let hourlyRate = formData.hourlyRate

      // 시급이 입력되지 않았거나 0인 경우, 직원의 기본 시급 사용
      if (!hourlyRate || hourlyRate <= 0) {
        const selectedUser = users.find((u) => u.id === formData.userId)
        if (!selectedUser || !selectedUser.hourlyRate) {
          setError("직원 정보를 찾을 수 없습니다.")
          return
        }
        hourlyRate = selectedUser.hourlyRate
      }

      const hours = calculateHours(formData.startTime, formData.endTime)
      const payment = Math.round(hours * hourlyRate)

      const workLogData = {
        user_id: formData.userId,
        work_date: formData.workDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        work_hours: hours,
        hourly_rate: hourlyRate,
        payment_amount: payment,
        memo: formData.memo,
      }

      console.log("근무내역 추가 요청 데이터:", workLogData)
      console.log("현재 로그인 사용자:", user)

      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workLogData),
        credentials: "include",
      })

      const data = await response.json()
      console.log("근무내역 추가 응답:", response.status, data)

      // 시간 겹침은 일반 알림으로 처리 (오류가 아님)
      if (response.status === 409) {
        setError((data as ErrorResponse).error || "해당 시간대에 이미 근무내역이 존재합니다.")
        return
      }

      if (!response.ok) {
        throw new Error((data as ErrorResponse).error || "근무내역 추가 중 오류가 발생했습니다.")
      }

      // 성공 시 목록 업데이트
      setSuccess("근무내역이 성공적으로 추가되었습니다.")
      setShowAddModal(false)

      // 폼 초기화
      setFormData({
        userId: "",
        workDate: getTodayLocalDate(),
        startTime: "09:00",
        endTime: "18:00",
        hourlyRate: 0,
        memo: "",
      })

      fetchWorkLogs() // 목록 새로고침
    } catch (err) {
      console.error("근무내역 추가 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역 추가 중 오류가 발생했습니다.")
    }
  }

  const handleEditWorkLog = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedWorkLog) return

    setError("")
    setSuccess("")

    // 시간 유효성 검사
    if (formData.endTime <= formData.startTime) {
      setError("퇴근 시간은 출근 시간보다 늦어야 합니다.")
      return
    }

    try {
      // 사용자 입력 시급 유효성 검사
      if (!formData.hourlyRate || formData.hourlyRate <= 0) {
        setError("유효한 시급을 입력해주세요.")
        return
      }

      const hours = calculateHours(formData.startTime, formData.endTime)
      // 사용자가 입력한 시급을 사용
      const payment = Math.round(hours * formData.hourlyRate)

      const workLogData = {
        user_id: formData.userId,
        work_date: formData.workDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        work_hours: hours,
        hourly_rate: formData.hourlyRate, // 사용자 입력 시급 사용
        payment_amount: payment,
        memo: formData.memo,
      }

      const response = await fetch(`/api/work-logs/${selectedWorkLog.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workLogData),
        credentials: "include",
      })

      const _data = (await response.json()) as WorkLogResponse | ApiErrorResponse

      if (!response.ok) {
        const errorMessage = "error" in _data ? _data.error : "근무내역 수정 중 오류가 발생했습니다."
        throw new Error(errorMessage || "근무내역 수정 중 오류가 발생했습니다.")
      }

      // 성공 시 목록 업데이트
      setSuccess("근무내역이 성공적으로 수정되었습니다.")
      setShowEditModal(false)
      setSelectedWorkLog(null)

      fetchWorkLogs() // 목록 새로고침
    } catch (err) {
      console.error("근무내역 수정 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역 수정 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteWorkLog = async (id: string) => {
    if (!confirm("정말로 이 근무내역을 삭제하시겠습니까?")) {
      return
    }

    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/work-logs/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || "근무내역 삭제 중 오류가 발생했습니다.")
      }

      setSuccess("근무내역이 성공적으로 삭제되었습니다.")
      fetchWorkLogs() // 목록 새로고침
    } catch (err) {
      console.error("근무내역 삭제 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleEditClick = (workLog: WorkLog) => {
    console.log("수정할 근무 데이터:", workLog)

    // 먼저 selectedWorkLog 설정
    setSelectedWorkLog(workLog)

    // 안전하게 날짜 형식 변환
    const formattedDate = formatDateString(workLog.workDate)

    // 폼 데이터 설정
    setFormData({
      userId: workLog.userId,
      workDate: formattedDate,
      startTime: workLog.startTime,
      endTime: workLog.endTime,
      hourlyRate: workLog.hourlyRate,
      memo: workLog.memo || "",
    })

    // 모달 열기
    setShowEditModal(true)
  }

  // ISO 문자열을 YYYY-MM-DD 형식으로 변환하는 유틸리티 함수 수정
  const formatDateString = (dateStr?: string): string => {
    if (!dateStr) return ""

    // UTC 날짜를 로컬 시간대로 변환
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  // 현재 날짜를 로컬 시간대로 가져오는 함수 개선
  const getTodayLocalDate = (): string => {
    // 브라우저 기준 오늘 날짜
    const now = new Date()

    // UTC 날짜로 변환 (서버와 일치시키기 위해)
    // 현재 시간을 UTC+0 기준으로 설정
    const nowUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0))

    // 9시간(UTC+9)을 추가하여 한국 시간 자정으로 맞춤
    nowUTC.setUTCHours(nowUTC.getUTCHours() + 9)

    const year = nowUTC.getUTCFullYear()
    const month = String(nowUTC.getUTCMonth() + 1).padStart(2, "0")
    const day = String(nowUTC.getUTCDate()).padStart(2, "0")

    const formattedDate = `${year}-${month}-${day}`
    console.log("🔍 현재 날짜 계산 (UTC+9 고려):", formattedDate)
    return formattedDate
  }

  // 화면 로딩 시 근무내역 자동 로드를 위한 useEffect
  useEffect(() => {
    if (!initialLoadRef.current && user) {
      // 데이터 로드 (약간 지연)
      setTimeout(() => {
        console.log("📊 초기 데이터 로드 시작:", filter.startDate)
        fetchWorkLogs()
      }, 150)

      initialLoadRef.current = true
    }
  }, [user])

  // 날짜 프리셋 핸들러 추가
  const handleDatePreset = (preset: "today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth") => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (preset) {
      case "today":
        // 오늘 (시작일 = 종료일 = 오늘)
        startDate = today
        endDate = today
        break
      case "yesterday":
        // 어제 (시작일 = 종료일 = 어제)
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        endDate = new Date(startDate)
        break
      case "last7days":
        // 지난 7일 (시작일 = 오늘 - 6일, 종료일 = 오늘)
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 6)
        endDate = today
        break
      case "thisMonth":
        // 이번 달 (시작일 = 이번 달 1일, 종료일 = 이번 달 마지막 날)
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // 다음 달의 0일은 이번 달의 마지막 날
        break
      case "lastMonth":
        // 지난 달 (시작일 = 지난 달 1일, 종료일 = 지난 달 마지막 일)
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        endDate = new Date(today.getFullYear(), today.getMonth(), 0)
        break
    }

    // 날짜를 YYYY-MM-DD 형식으로 변환
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    const startDateFormatted = formatDate(startDate)
    const endDateFormatted = formatDate(endDate)

    // 필터 업데이트
    setFilter({
      ...filter,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
    })
  }

  // 근무내역 "오늘로 복사" 핸들러 수정
  const handleCopyToToday = async (log: WorkLog) => {
    // 오늘 날짜를 로컬 시간대로 가져옴
    const todayFormatted = getTodayLocalDate()
    const logDateFormatted = formatDateString(log.workDate)

    console.log("오늘로 복사 시도:", {
      로그날짜: log.workDate,
      로그날짜_포맷: logDateFormatted,
      오늘날짜_포맷: todayFormatted,
    })

    // 형식화된 날짜로 비교
    if (logDateFormatted === todayFormatted) {
      setError("이미 오늘 날짜의 근무내역입니다.")
      return
    }

    // 시간대가 겹치는지 확인
    const existingLogsForToday = workLogs.filter(
      (existingLog) => formatDateString(existingLog.workDate) === todayFormatted && existingLog.userId === log.userId
    )

    // 시간대 중복 검사
    const hasTimeConflict = existingLogsForToday.some((existingLog) => {
      return (
        (log.startTime >= existingLog.startTime && log.startTime < existingLog.endTime) ||
        (log.endTime > existingLog.startTime && log.endTime <= existingLog.endTime) ||
        (log.startTime <= existingLog.startTime && log.endTime >= existingLog.endTime)
      )
    })

    if (hasTimeConflict) {
      setError("해당 직원의 오늘 날짜에 이미 겹치는 시간대의 근무내역이 있습니다.")
      return
    }

    setError("")
    setSuccess("")

    try {
      // 선택된 직원의 시급 가져오기
      const selectedUser = users.find((u) => u.id === log.userId)
      if (!selectedUser || !selectedUser.hourlyRate) {
        setError("직원 정보를 찾을 수 없습니다.")
        return
      }

      const workLogData = {
        user_id: log.userId,
        work_date: todayFormatted, // 로컬 날짜 사용
        start_time: log.startTime,
        end_time: log.endTime,
        work_hours: log.workHours,
        hourly_rate: log.hourlyRate,
        payment_amount: log.paymentAmount,
        memo: log.memo,
      }

      console.log("오늘로 복사 데이터:", workLogData)

      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workLogData),
        credentials: "include",
      })

      // 응답 상태 먼저 확인
      if (!response.ok) {
        let errorMessage = "근무내역 복사 중 오류가 발생했습니다."

        try {
          // 응답 데이터 파싱 시도
          const data = await response.json()
          console.log("서버 응답:", response.status, data)

          if (data && typeof data === "object" && "error" in data) {
            errorMessage = (data as ErrorResponse).error
          } else if (response.status === 409) {
            errorMessage = "해당 시간대에 이미 근무내역이 존재합니다."
          }
        } catch (parseError) {
          // JSON 파싱 실패 시 상태 코드 기반 에러 처리
          console.log("응답 파싱 오류:", parseError)
          if (response.status === 409) {
            errorMessage = "해당 시간대에 이미 근무내역이 존재합니다."
          } else {
            errorMessage = `서버 오류 (${response.status})`
          }
        }

        setError(errorMessage)
        return
      }

      // 성공 응답 처리
      const _data = await response.json()

      // 성공 시 목록 업데이트
      setSuccess("근무내역이 오늘 날짜로 성공적으로 복사되었습니다.")
      fetchWorkLogs() // 목록 새로고침
    } catch (err) {
      console.error("근무내역 복사 오류:", err)
      setError(err instanceof Error ? err.message : "근무내역 복사 중 오류가 발생했습니다.")
    }
  }

  // 메모 클릭 핸들러 수정
  const handleMemoClick = (logId: string, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    e.preventDefault()

    // 이미 열려있는 메모를 클릭한 경우 닫기
    if (openMemoId === logId) {
      setOpenMemoId(null)
      return
    }

    setOpenMemoId(logId)

    // 팝업 위치 계산
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    // 위치 설정 (위 또는 아래)
    if (spaceBelow < 200 && spaceAbove > 200) {
      _setPopupDirection("up") // 아래 공간이 적으면 위로 표시
      setPopupPosition({
        top: rect.top - 10,
        left: rect.left,
      })
    } else {
      _setPopupDirection("down") // 기본적으로 아래로 표시
      setPopupPosition({
        top: rect.bottom + 10,
        left: rect.left,
      })
    }
  }

  // 기존 document 클릭 이벤트 리스너 제거하고 ref 사용
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memoRef.current && !memoRef.current.contains(event.target as Node)) {
        setOpenMemoId(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // 새로운 useEffect 추가 - 모달이 열릴 때 workDate 값을 설정
  useEffect(() => {
    if (showEditModal && selectedWorkLog) {
      console.log("수정 모달 열림, 근무일 설정:", selectedWorkLog.workDate)

      // 안전하게 날짜 형식 변환
      const formattedDate = formatDateString(selectedWorkLog.workDate)

      // 즉시 설정 시도
      const dateInput = document.getElementById("edit-workDate") as HTMLInputElement
      if (dateInput) {
        dateInput.value = formattedDate
      }

      // 약간의 지연 후 다시 시도
      const timerId = setTimeout(() => {
        const dateInput = document.getElementById("edit-workDate") as HTMLInputElement
        if (dateInput) {
          dateInput.value = formattedDate
          console.log("지연 후 근무일 설정:", dateInput.value)
        }
      }, 100)

      return () => clearTimeout(timerId)
    }
  }, [showEditModal, selectedWorkLog])

  // 추가 모달 오픈 핸들러 추가
  const handleAddModalOpen = () => {
    // 폼 데이터 초기화
    setFormData({
      userId: "",
      workDate: getTodayLocalDate(), // 새 Date().toISOString() 대신 로컬 날짜 함수 사용
      startTime: "09:00",
      endTime: "18:00",
      hourlyRate: 0,
      memo: "",
    })

    // 모달 열기
    setShowAddModal(true)
  }

  if (loading && !user) {
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
              <Link
                href="/admin"
                className="mr-4 flex items-center rounded-md bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                <ArrowLeft className="mr-1 h-5 w-5" />
                뒤로
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">근무내역 관리</h1>
            </div>
            <p className="mt-2 text-gray-600">직원들의 근무시간과 급여를 확인하고 관리합니다.</p>
          </div>
          <button
            onClick={handleAddModalOpen}
            className="flex items-center rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            근무내역 추가
          </button>
        </div>

        {/* 토스트 메시지 컴포넌트 - 화면 하단에 고정 */}
        {(error || success) && (
          <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 transform">
            <div
              className={`flex items-center justify-between rounded-md p-4 shadow-lg ${
                error ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <div className={`text-sm ${error ? "text-red-700" : "text-green-700"}`}>{error || success}</div>
              <button onClick={closeToast} className="rounded-full p-1 hover:bg-gray-200">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="mb-4 text-lg font-medium">근무내역 필터</h2>
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none sm:text-sm"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none sm:text-sm"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none sm:text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
              >
                검색
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
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
              이번달
            </button>
            <button
              onClick={() => handleDatePreset("lastMonth")}
              className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
            >
              지난달
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
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
                    일급여
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    메모
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {workLogs.length > 0 ? (
                  workLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDateString(log.workDate)}</div>
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
                      <td className="overflow-visible px-6 py-4">
                        <div ref={memoRef} className="relative text-sm text-gray-900">
                          <div
                            onClick={(e) => log.memo && handleMemoClick(log.id, e)}
                            className={log.memo ? "max-w-[150px] cursor-pointer truncate" : ""}
                          >
                            {log.memo || "-"}
                          </div>
                          {log.memo && openMemoId === log.id && (
                            <div
                              className="fixed z-[99999] rounded-md border border-gray-200 bg-white shadow-xl"
                              style={{
                                top: `${popupPosition.top}px`,
                                left: `${popupPosition.left}px`,
                                minWidth: "250px",
                                maxWidth: "400px",
                                maxHeight: "250px",
                                overflowY: "auto",
                                width: "max-content",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="p-4 text-sm break-words whitespace-pre-wrap text-gray-800">
                                {log.memo}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleCopyToToday(log)}
                            className="group relative rounded-md bg-green-100 p-1 text-green-600 hover:bg-green-200"
                            aria-label="오늘로 복사"
                          >
                            <Copy className="h-4 w-4" />
                            <div
                              style={{
                                visibility: "hidden",
                                position: "absolute",
                                left: "50%",
                                bottom: "100%",
                                transform: "translateX(-50%)",
                                zIndex: 9999,
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "black",
                                color: "white",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                lineHeight: "1rem",
                                whiteSpace: "nowrap",
                                opacity: 0,
                                transition: "opacity 0.2s ease-in-out",
                              }}
                              className="pointer-events-none mt-[-8px] group-hover:!visible group-hover:!opacity-100"
                            >
                              오늘로 복사
                            </div>
                          </button>
                          <button
                            onClick={() => handleEditClick(log)}
                            className="group relative rounded-md bg-blue-100 p-1 text-blue-600 hover:bg-blue-200"
                            aria-label="수정"
                          >
                            <Pencil className="h-4 w-4" />
                            <div
                              style={{
                                visibility: "hidden",
                                position: "absolute",
                                left: "50%",
                                bottom: "100%",
                                transform: "translateX(-50%)",
                                zIndex: 9999,
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "black",
                                color: "white",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                lineHeight: "1rem",
                                whiteSpace: "nowrap",
                                opacity: 0,
                                transition: "opacity 0.2s ease-in-out",
                              }}
                              className="pointer-events-none mt-[-8px] group-hover:!visible group-hover:!opacity-100"
                            >
                              수정
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteWorkLog(log.id)}
                            className="group relative rounded-md bg-red-100 p-1 text-red-600 hover:bg-red-200"
                            aria-label="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                            <div
                              style={{
                                visibility: "hidden",
                                position: "absolute",
                                left: "50%",
                                bottom: "100%",
                                transform: "translateX(-50%)",
                                zIndex: 9999,
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "black",
                                color: "white",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                lineHeight: "1rem",
                                whiteSpace: "nowrap",
                                opacity: 0,
                                transition: "opacity 0.2s ease-in-out",
                              }}
                              className="pointer-events-none mt-[-8px] group-hover:!visible group-hover:!opacity-100"
                            >
                              삭제
                            </div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      {loading ? "근무내역을 불러오는 중..." : "등록된 근무내역이 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 요약 정보 추가 */}
          {workLogs.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 p-5">
              <h3 className="mb-3 text-base font-medium text-gray-800">요약 정보</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
                  <p className="text-xs text-gray-500">총 직원 수</p>
                  <p className="mt-1 text-base font-medium text-gray-800">
                    {new Set(workLogs.map((log) => log.userId)).size}명
                  </p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
                  <p className="text-xs text-gray-500">총 근무일자</p>
                  <p className="mt-1 text-base font-medium text-gray-800">
                    {new Set(workLogs.map((log) => log.workDate)).size}일
                  </p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
                  <p className="text-xs text-gray-500">총 근무시간</p>
                  <p className="mt-1 text-base font-medium text-gray-800">
                    {workLogs.reduce((sum, log) => sum + log.workHours, 0).toFixed(1)}시간
                  </p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
                  <p className="text-xs text-gray-500">총 급여 합계</p>
                  <p className="mt-1 text-base font-medium text-gray-800">
                    {workLogs.reduce((sum, log) => sum + log.paymentAmount, 0).toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 근무내역 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity"
                aria-hidden="true"
                onClick={() => setShowAddModal(false)}
              >
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
                        <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                          직원
                        </label>
                        <select
                          id="userId"
                          name="userId"
                          value={formData.userId}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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

                      <div className="mb-4">
                        <label htmlFor="workDate" className="block text-sm font-medium text-gray-700">
                          근무일
                        </label>
                        <input
                          type="date"
                          id="workDate"
                          name="workDate"
                          value={formData.workDate}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                            출근 시간
                          </label>
                          <input
                            type="time"
                            id="startTime"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                            퇴근 시간
                          </label>
                          <input
                            type="time"
                            id="endTime"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                          시급
                        </label>
                        <input
                          type="number"
                          id="hourlyRate"
                          name="hourlyRate"
                          value={formData.hourlyRate}
                          onChange={handleInputChange}
                          placeholder="비워두면 직원 기본 시급이 적용됩니다"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          min="0"
                        />
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
                          className="inline-flex w-full justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
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

        {/* 근무내역 수정 모달 */}
        {showEditModal && selectedWorkLog && (
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity"
                aria-hidden="true"
                onClick={() => setShowEditModal(false)}
              >
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">근무내역 수정</h3>
                  <div className="mt-4">
                    <form onSubmit={handleEditWorkLog}>
                      <div className="mb-4">
                        <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                          직원
                        </label>
                        <select
                          id="userId"
                          name="userId"
                          value={formData.userId}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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

                      <div className="mb-4">
                        <label htmlFor="edit-workDate" className="block text-sm font-medium text-gray-700">
                          근무일
                        </label>
                        <input
                          type="date"
                          id="edit-workDate"
                          name="workDate"
                          value={formData.workDate}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                            출근 시간
                          </label>
                          <input
                            type="time"
                            id="startTime"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                            퇴근 시간
                          </label>
                          <input
                            type="time"
                            id="endTime"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                          시급
                        </label>
                        <input
                          type="number"
                          id="hourlyRate"
                          name="hourlyRate"
                          value={formData.hourlyRate}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          required
                          min="0"
                        />
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
                          className="inline-flex w-full justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
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
    </div>
  )
}
