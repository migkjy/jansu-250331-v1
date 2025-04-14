import { and, asc, desc, eq, gte, lte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
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
        id: workLogs.id,
        userId: workLogs.userId,
        date: workLogs.workDate,
        startTime: workLogs.startTime,
        endTime: workLogs.endTime,
        breakStartTime: workLogs.breakStartTime,
        breakEndTime: workLogs.breakEndTime,
        workHours: workLogs.workHours,
        hourlyRate: workLogs.hourlyRate, // Use the rate logged at the time
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
      .orderBy(asc(workLogs.workDate), asc(workLogs.startTime)) // Order by date, then start time

    // 7. Calculate Summary
    const totalWorkDays = new Set(logs.map((log) => log.date)).size
    const totalWorkHours = logs.reduce((sum, log) => sum + Number(log.workHours), 0)
    const totalPayment = logs.reduce((sum, log) => sum + Number(log.dailyPayment), 0)

    // 8. Format Response
    const responsePayload = {
      user: {
        id: targetUser.id,
        name: targetUser.name,
        // Report the user's current hourly rate in the summary part
        hourlyRate: targetUser.hourlyRate,
      },
      month: month,
      details: logs.map((log) => ({
        // Ensure details match the expected format
        id: log.id,
        userId: log.userId,
        workDate: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        breakStartTime: log.breakStartTime,
        breakEndTime: log.breakEndTime,
        workHours: Number(log.workHours),
        hourlyRate: Number(log.hourlyRate),
        paymentAmount: Number(log.dailyPayment),
        memo: log.memo ?? "",
      })),
      summary: {
        totalWorkDays: totalWorkDays,
        totalWorkHours: totalWorkHours,
        totalPayment: totalPayment,
      },
    }

    return NextResponse.json(responsePayload, { status: 200 })
  } catch (error) {
    console.error(`Error fetching salary slip for user ${effectiveUserId}, month ${month}:`, error)
    return NextResponse.json({ error: "급여 명세서 조회 중 오류가 발생했습니다." }, { status: 500 })
  }
}
