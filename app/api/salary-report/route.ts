import { and, eq, gte, lte, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { UserPayload } from "@/lib/auth/types" // Assuming you have a types file
import { db } from "@/src/db"
import { users, workLogs } from "@/src/db/schema"

export async function GET(request: NextRequest) {
  // 1. Verify Admin Token
  const token = request.cookies.get("token")?.value
  if (!token) {
    return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 })
  }

  let userPayload: UserPayload
  try {
    userPayload = await verifyJwtToken<UserPayload>(token)
    if (!userPayload || userPayload.role !== "admin") {
      throw new Error("권한 없음")
    }
  } catch (error) {
    console.error("Token verification failed:", error)
    return NextResponse.json({ error: "유효하지 않은 토큰 또는 권한 없음." }, { status: 403 })
  }

  // 2. Get Month from Query Parameters
  const searchParams = request.nextUrl.searchParams
  const month = searchParams.get("month") // Expected format: YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "유효하지 않은 월 형식입니다. (YYYY-MM)" }, { status: 400 })
  }

  // 3. Calculate Start and End Dates for the Month
  const year = parseInt(month.split("-")[0], 10)
  const monthIndex = parseInt(month.split("-")[1], 10) - 1 // Month is 0-indexed

  if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return NextResponse.json({ error: "유효하지 않은 날짜입니다." }, { status: 400 })
  }

  const startDate = new Date(Date.UTC(year, monthIndex, 1))
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0)) // Last day of the month

  // Format dates for SQL query (YYYY-MM-DD)
  const startDateStr = startDate.toISOString().split("T")[0]
  const endDateStr = endDate.toISOString().split("T")[0]

  console.log(`Fetching salary report for ${month} (${startDateStr} to ${endDateStr})`) // For debugging

  try {
    // 4. Query Database for Aggregated Data
    const salaryReport = await db
      .select({
        userId: users.id,
        userName: users.name,
        totalDays: sql<number>`count(distinct ${workLogs.workDate})`.mapWith(Number),
        totalHours: sql<number>`sum(${workLogs.workHours})`.mapWith(Number),
        // Note: hourlyRate needs careful handling if it can change per log
        // Fetching the user's current rate as a representative value
        hourlyRate: users.hourlyRate,
        totalSalary: sql<number>`sum(${workLogs.paymentAmount})`.mapWith(Number),
      })
      .from(workLogs)
      .innerJoin(users, eq(workLogs.userId, users.id))
      .where(and(gte(workLogs.workDate, startDateStr), lte(workLogs.workDate, endDateStr)))
      .groupBy(users.id, users.name, users.hourlyRate)
      .orderBy(users.name)

    return NextResponse.json(salaryReport, { status: 200 })
  } catch (error) {
    console.error("Error fetching salary report:", error)
    return NextResponse.json({ error: "급여 보고서 조회 중 오류가 발생했습니다." }, { status: 500 })
  }
}
