import { and, asc, eq, gte, lte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import PDFDocument from "pdfkit"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { UserPayload } from "@/lib/auth/types"
import { db } from "@/src/db"
import { users, workLogs } from "@/src/db/schema"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // 1. Verify Token and Get User Info
  const token = request.cookies.get("token")?.value
  if (!token) {
    return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 })
  }

  let requesterPayload: UserPayload
  try {
    const payload = await verifyJwtToken(token)
    if (!payload) {
      throw new Error("Invalid token")
    }
    requesterPayload = payload as UserPayload
  } catch (error) {
    console.error("Token verification failed:", error)
    return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
  }

  // 2. Authorization Check
  const requestedUserId = await params.id
  // Handle "me" as a special case
  const effectiveUserId = requestedUserId === "me" ? requesterPayload.id : requestedUserId

  // Allow access if the requester is an admin OR if the requester is asking for their own data
  if (requesterPayload.role !== "admin" && requesterPayload.id !== effectiveUserId) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  // 3. Get Month from Query Parameters
  const searchParams = request.nextUrl.searchParams
  const month = searchParams.get("month") // Expected format: YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "유효하지 않은 월 형식입니다. (YYYY-MM)" }, { status: 400 })
  }

  // 4. Calculate Start and End Dates
  const year = parseInt(month.split("-")[0], 10)
  const monthIndex = parseInt(month.split("-")[1], 10) - 1

  if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return NextResponse.json({ error: "유효하지 않은 날짜입니다." }, { status: 400 })
  }

  const startDate = new Date(Date.UTC(year, monthIndex, 1))
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0))
  const startDateStr = startDate.toISOString().split("T")[0]
  const endDateStr = endDate.toISOString().split("T")[0]

  try {
    // 5. Fetch User Info
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, effectiveUserId),
      columns: { id: true, name: true, hourlyRate: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    // 6. Fetch Work Logs for the User and Month
    const logs = await db
      .select({
        date: workLogs.workDate,
        startTime: workLogs.startTime,
        endTime: workLogs.endTime,
        breakStartTime: workLogs.breakStartTime,
        breakEndTime: workLogs.breakEndTime,
        workHours: workLogs.workHours,
        hourlyRate: workLogs.hourlyRate,
        dailyPayment: workLogs.paymentAmount,
        memo: workLogs.memo,
      })
      .from(workLogs)
      .where(
        and(
          eq(workLogs.userId, effectiveUserId),
          gte(workLogs.workDate, startDateStr),
          lte(workLogs.workDate, endDateStr)
        )
      )
      .orderBy(asc(workLogs.workDate))

    // 7. Calculate Summary
    const totalWorkDays = new Set(logs.map((log) => log.date)).size
    const totalWorkHours = logs.reduce((sum, log) => sum + Number(log.workHours), 0)
    const totalPayment = logs.reduce((sum, log) => sum + Number(log.dailyPayment), 0)

    // 8. Generate PDF
    const pdfBuffer = await generatePDF({
      user: {
        id: targetUser.id,
        name: targetUser.name,
        hourlyRate: Number(targetUser.hourlyRate),
      },
      month,
      details: logs.map((log) => ({
        date: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        breakStartTime: log.breakStartTime,
        breakEndTime: log.breakEndTime,
        workHours: Number(log.workHours),
        hourlyRate: Number(log.hourlyRate),
        dailyPayment: Number(log.dailyPayment),
        memo: log.memo ?? "",
      })),
      summary: {
        totalWorkDays,
        totalWorkHours,
        totalPayment,
      },
    })

    // 9. Return the PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="급여명세서_${targetUser.name}_${month}.pdf"`,
      },
    })
  } catch (error) {
    console.error(`Error generating PDF for user ${effectiveUserId}, month ${month}:`, error)
    return NextResponse.json({ error: "급여 명세서 PDF 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// Helper function to format a date string (YYYY-MM-DD) to MM/DD
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// Helper function to format hours in decimal to HH:MM
function formatTimeHHMM(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

// Calculate time difference between two time strings (HH:MM)
function calculateTimeDiff(start: string, end: string): number {
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

  return (endTotalMinutes - startTotalMinutes) / 60
}

// Calculate break time from start and end times
function calculateBreakTime(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  return calculateTimeDiff(start, end)
}

interface PDFData {
  user: {
    id: string
    name: string
    hourlyRate: number
  }
  month: string
  details: Array<{
    date: string
    startTime: string
    endTime: string
    breakStartTime?: string | null
    breakEndTime?: string | null
    workHours: number
    hourlyRate: number
    dailyPayment: number
    memo?: string | null
  }>
  summary: {
    totalWorkDays: number
    totalWorkHours: number
    totalPayment: number
  }
}

async function generatePDF(data: PDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `급여명세서_${data.user.name}_${data.month}`,
          Author: "장수도시락",
        },
      })

      // Collect PDF data
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", (err) => reject(err))

      // Title
      doc.fontSize(20).font("Helvetica-Bold").text(`${data.month} 급여명세서`, { align: "center" })
      doc.moveDown()

      // User info
      doc.fontSize(12).font("Helvetica-Bold").text("직원 정보", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10).font("Helvetica").text(`이름: ${data.user.name}`)
      doc.text(`기준 시급: ${data.user.hourlyRate.toLocaleString()}원`)
      doc.moveDown()

      // Summary
      doc.fontSize(12).font("Helvetica-Bold").text("급여 요약", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10).font("Helvetica").text(`총 근무일수: ${data.summary.totalWorkDays}일`)
      doc.text(`총 근무시간: ${formatTimeHHMM(data.summary.totalWorkHours)}`)
      doc.text(`총 급여: ${data.summary.totalPayment.toLocaleString()}원`)
      doc.moveDown()

      // Details table
      doc.fontSize(12).font("Helvetica-Bold").text("근무 상세내역", { underline: true })
      doc.moveDown(0.5)

      // Table header
      const startX = 50
      let currentY = doc.y

      // Draw table header
      const headers = ["날짜", "출근", "퇴근", "총시간(A)", "휴게시간", "근무시간", "시급", "일급"]
      const columnWidths = [60, 50, 50, 60, 60, 60, 60, 60]

      doc.fontSize(8).font("Helvetica-Bold")

      // Draw header background
      doc.rect(startX, currentY, doc.page.width - 100, 20).fill("#f3f4f6")

      // Draw headers
      headers.forEach((header, i) => {
        let xPos = startX
        for (let j = 0; j < i; j++) {
          xPos += columnWidths[j]
        }
        doc.fillColor("black").text(header, xPos, currentY + 5, {
          width: columnWidths[i],
          align: i > 2 ? "right" : "left",
        })
      })

      currentY += 20
      doc.fontSize(8).font("Helvetica")

      // Draw details rows
      data.details.forEach((detail, index) => {
        const totalTime = calculateTimeDiff(detail.startTime, detail.endTime)
        const breakTime = calculateBreakTime(detail.breakStartTime || null, detail.breakEndTime || null)

        // Alternate row background for better readability
        if (index % 2 === 0) {
          doc.rect(startX, currentY, doc.page.width - 100, 20).fill("#f9fafb")
        }

        // Add a new page if we're running out of space
        if (currentY > doc.page.height - 50) {
          doc.addPage()
          currentY = 50
        }

        // Draw row data
        const rowData = [
          formatDate(detail.date),
          detail.startTime,
          detail.endTime,
          formatTimeHHMM(totalTime),
          formatTimeHHMM(breakTime),
          formatTimeHHMM(detail.workHours),
          `${detail.hourlyRate.toLocaleString()}원`,
          `${detail.dailyPayment.toLocaleString()}원`,
        ]

        rowData.forEach((text, i) => {
          let xPos = startX
          for (let j = 0; j < i; j++) {
            xPos += columnWidths[j]
          }
          doc.fillColor("black").text(text, xPos, currentY + 5, {
            width: columnWidths[i],
            align: i > 2 ? "right" : "left",
          })
        })

        currentY += 20
      })

      // Draw table border
      doc.rect(startX, doc.y - currentY + 50, doc.page.width - 100, currentY - 50).stroke()

      // Add footer
      doc.fontSize(8).text("장수도시락 급여명세서", 50, doc.page.height - 50, {
        align: "center",
      })

      // Finalize PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
