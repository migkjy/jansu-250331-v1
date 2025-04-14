import { NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { createClient } from "@/lib/db"
import { applyKoreanFontToTable, createKoreanPdf } from "@/lib/pdf"

// Define proper interfaces
interface RequestData {
  userIds: string[]
  month: string // YYYY-MM 형식
}

interface WorkLogData {
  id: string
  user_id: string
  work_date: string
  start_time: string
  end_time: string
  work_hours: number
  hourly_rate: number
  payment_amount: number
  memo: string | null
}

interface UserData {
  id: string
  name: string
  email: string
  hourly_rate: number
}

// Define row types to match what comes from the database
interface UserRow {
  id: string | number
  name: string
  hourly_rate: number | null
}

interface WorkLogRow {
  work_date: string | Date
  start_time: string | null
  end_time: string | null
  work_hours: number | null
  hourly_rate: number | null
  payment_amount: number | null
  memo: string | null
}

// Helper function to safely convert potentially undefined values to string
const safeString = (value: string | null | undefined): string => {
  return value !== null && value !== undefined ? String(value) : ""
}

// 시간 포맷팅 - 초 제거
const formatTime = (timeStr: string): string => {
  if (!timeStr) return ""
  // HH:MM:SS 형식에서 HH:MM만 추출
  const match = timeStr.match(/^(\d{2}:\d{2}):/)
  return match && match[1] ? match[1] : timeStr
}

// 날짜 포맷팅 - YYYY-MM-DD로 변환
const formatDate = (dateStr: string): string => {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
      2,
      "0"
    )}`
  } catch (error) {
    return dateStr
  }
}

/**
 * Generate PDF salary slips for selected users
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the request
    const token = request.cookies.get("token")?.value || ""
    if (!token) {
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 })
    }

    const payload = verifyJwtToken(token)
    if (!payload) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    // 2. Parse request parameters
    const requestData = (await request.json()) as RequestData
    const { userIds, month } = requestData

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "올바른 월 형식이 아닙니다. YYYY-MM 형식이어야 합니다." }, { status: 400 })
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "사용자를 선택해주세요." }, { status: 400 })
    }

    // 일반 사용자는 자신의 데이터만 접근 가능하도록 수정
    // 관리자는 모든 사용자의 데이터에 접근 가능
    if (payload.role !== "admin") {
      // 일반 사용자가 자신의 데이터만 요청하는지 확인
      if (userIds.length !== 1 || userIds[0] !== payload.id) {
        return NextResponse.json({ error: "자신의 급여 명세서만 다운로드할 수 있습니다." }, { status: 403 })
      }
    }

    // 3. Calculate date range
    const [yearStr, monthStr] = month.split("-")
    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: "유효하지 않은 월 형식입니다. (YYYY-MM)" }, { status: 400 })
    }

    const year = parseInt(yearStr)
    const monthNum = parseInt(monthStr)
    const startDateStr = `${year}-${monthStr.padStart(2, "0")}-01`
    const endDay = new Date(year, monthNum, 0).getDate() // Last day of the month
    const endDateStr = `${year}-${monthStr.padStart(2, "0")}-${endDay.toString().padStart(2, "0")}`

    // 4. Get user data - userIds를 개별적으로 파라미터화하여 안전하게 쿼리
    const db = createClient()
    const placeholders = userIds.map((userId, i) => `$${i + 1}`).join(", ")
    const usersResult = await db.query(
      `SELECT id, name, email, hourly_rate FROM users WHERE id IN (${placeholders})`,
      userIds
    )

    if (!usersResult.rows || usersResult.rows.length === 0) {
      return NextResponse.json({ error: "선택한 직원을 찾을 수 없습니다." }, { status: 404 })
    }

    // 5. Generate PDF - 한글이 지원되는 PDF 생성
    const doc = createKoreanPdf({ orientation: "landscape" })

    // 한글 텍스트
    const koreanLabels = {
      title: "급여 명세서",
      employeeInfo: "직원 정보",
      name: "이름",
      email: "이메일",
      hourlyRate: "시급",
      won: "원",
      periodLabel: "기간",
      salaryDetails: "급여 내역",
      workDaysLabel: "총 근무일수",
      days: "일",
      workHoursLabel: "총 근무시간",
      hours: "시간",
      totalAmountLabel: "총 급여",
      tableHeaders: ["날짜", "출근 시간", "퇴근 시간", "휴게 시간", "근무 시간", "시급", "일급"],
      noWorkRecords: "해당 기간에 근무 기록이 없습니다.",
      page: "페이지",
      of: "/",
    }

    let currentPage = 1

    // Process each user
    for (let i = 0; i < usersResult.rows.length; i++) {
      const rawUser = usersResult.rows[i]
      const user = {
        id: String(rawUser.id || ""),
        name: String(rawUser.name || ""),
        email: String(rawUser.email || ""),
        hourly_rate: Number(rawUser.hourly_rate || 0),
      }

      // 새 페이지 시작 (첫 유저 제외)
      if (i > 0) {
        doc.addPage()
        currentPage++
      }

      // 타이틀
      doc.setFontSize(20)
      doc.setFont("NanumGothic", "normal")
      doc.text(koreanLabels.title, doc.internal.pageSize.getWidth() / 2, 20, { align: "center" })

      // 페이지 너비 계산 (mm 단위)
      const pageWidth = doc.internal.pageSize.getWidth()
      const middleX = pageWidth / 2

      // 근무 기록 가져오기
      const logsResult = await db.query(
        `SELECT id, user_id, work_date, start_time, end_time, break_start_time, break_end_time, work_hours, hourly_rate, payment_amount, memo 
         FROM work_logs 
         WHERE user_id = $1 
           AND work_date >= $2 
           AND work_date <= $3
         ORDER BY work_date ASC`,
        [user.id, startDateStr, endDateStr]
      )

      // 급여 요약 정보 계산
      const logs = logsResult.rows.map((row) => ({
        work_date: String(row.work_date || ""),
        start_time: String(row.start_time || ""),
        end_time: String(row.end_time || ""),
        break_start_time: row.break_start_time ? String(row.break_start_time) : null,
        break_end_time: row.break_end_time ? String(row.break_end_time) : null,
        work_hours: Number(row.work_hours || 0),
        hourly_rate: Number(row.hourly_rate || 0),
        payment_amount: Number(row.payment_amount || 0),
        memo: row.memo,
      }))

      const totalWorkDays = logs.length
      const totalWorkHours = logs.reduce((sum, log) => sum + log.work_hours, 0)
      const totalPayment = logs.reduce((sum, log) => sum + log.payment_amount, 0)

      // 2열 레이아웃으로 직원 정보와 급여 내역 표시
      // 첫 번째 열: 직원 정보
      doc.setFontSize(14)
      doc.text(koreanLabels.employeeInfo, 15, 40)
      doc.setFontSize(12)
      doc.text(`${koreanLabels.name}: ${user.name}`, 20, 50)
      doc.text(`${koreanLabels.email}: ${user.email}`, 20, 60)
      doc.text(`${koreanLabels.hourlyRate}: ${user.hourly_rate.toLocaleString()}${koreanLabels.won}`, 20, 70)
      doc.text(`${koreanLabels.periodLabel}: ${startDateStr} ~ ${endDateStr}`, 20, 80)

      // 두 번째 열: 급여 내역
      doc.setFontSize(14)
      doc.text(koreanLabels.salaryDetails, middleX + 15, 40)
      doc.setFontSize(12)
      doc.text(`${koreanLabels.workDaysLabel}: ${totalWorkDays}${koreanLabels.days}`, middleX + 20, 50)
      doc.text(`${koreanLabels.workHoursLabel}: ${totalWorkHours.toFixed(1)}${koreanLabels.hours}`, middleX + 20, 60)
      doc.text(
        `${koreanLabels.totalAmountLabel}: ${totalPayment.toLocaleString()}${koreanLabels.won}`,
        middleX + 20,
        70
      )

      // 근무 내역 테이블
      if (logs.length > 0) {
        const tableRows = logs.map((log) => {
          // 휴게시간 계산
          let breakTimeDisplay = "-"
          if (log.break_start_time && log.break_end_time) {
            // 휴게시간을 시간 단위로 계산
            try {
              const breakStartTime = new Date(`1970-01-01T${log.break_start_time}`)
              const breakEndTime = new Date(`1970-01-01T${log.break_end_time}`)
              const breakDurationMs = breakEndTime.getTime() - breakStartTime.getTime()
              const breakHours = breakDurationMs / (1000 * 60 * 60)
              breakTimeDisplay = `${breakHours.toFixed(1)}${koreanLabels.hours}`
            } catch (error) {
              console.error("휴게시간 계산 오류:", error)
              breakTimeDisplay = "1.0시간" // 계산 오류 시 기본값 사용
            }
          }

          return [
            formatDate(log.work_date),
            formatTime(log.start_time),
            formatTime(log.end_time),
            breakTimeDisplay,
            `${log.work_hours.toFixed(1)}${koreanLabels.hours}`,
            `${log.hourly_rate.toLocaleString()}${koreanLabels.won}`,
            `${log.payment_amount.toLocaleString()}${koreanLabels.won}`,
          ]
        })

        // 테이블 생성
        applyKoreanFontToTable(doc, {
          head: [koreanLabels.tableHeaders],
          body: tableRows,
          startY: 95,
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [200, 200, 200],
            halign: "center",
            valign: "middle",
          },
          tableWidth: "auto",
          margin: { left: 10, right: 10 },
          columnStyles: {
            0: { cellWidth: "auto", halign: "right" }, // 날짜
            1: { cellWidth: "auto", halign: "right" }, // 출근 시간
            2: { cellWidth: "auto", halign: "right" }, // 퇴근 시간
            3: { cellWidth: "auto", halign: "right" }, // 휴게 시간
            4: { cellWidth: "auto", halign: "right" }, // 근무 시간
            5: { cellWidth: "auto", halign: "right" }, // 시급
            6: { cellWidth: "auto", halign: "right" }, // 일급
          },
        })
      } else {
        // 근무 기록이 없는 경우
        doc.setFontSize(12)
        doc.text(koreanLabels.noWorkRecords, 20, 100)
      }

      // 페이지 번호 (마지막 페이지인 경우 총 페이지 수 표시)
      const totalPages = usersResult.rows.length
      doc.setFontSize(10)
      doc.text(
        `${koreanLabels.page} ${currentPage}${koreanLabels.of}${totalPages}`,
        pageWidth - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: "right" }
      )
    }

    // PDF 내용을 버퍼로 변환
    const pdfBuffer = Buffer.from(await doc.output("arraybuffer"))

    // PDF 반환
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=salary_slips_${month}.pdf`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// 해당 월의 날짜 수를 반환하는 유틸리티 함수
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
