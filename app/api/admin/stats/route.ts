import { NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { createClient } from "@/lib/db"
import { UserPayload } from "@/lib/auth/types"

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Token and Check Admin Role
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 })
    }

    let userPayload: UserPayload
    try {
      const payload = await verifyJwtToken(token)
      if (!payload) {
        throw new Error("Invalid token")
      }
      userPayload = payload as UserPayload
    } catch (error) {
      console.error("Token verification failed:", error)
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    // Only allow admin access
    if (userPayload.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    }

    // 2. Connect to the database
    const db = createClient()

    // 3. Get total employee count
    const totalEmployeesResult = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'user'")
    const totalEmployees = parseInt(totalEmployeesResult.rows[0]?.count?.toString() || "0")

    // 4. Get current month's data
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // JavaScript months are 0-indexed
    
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate() // Get last day of current month
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`

    // 5. Get total work hours for current month
    const totalHoursResult = await db.query(
      `SELECT SUM(work_hours) as total FROM work_logs 
       WHERE work_date >= $1 AND work_date <= $2`,
      [startDate, endDate]
    )
    const totalHours = parseFloat(totalHoursResult.rows[0]?.total?.toString() || "0")

    // 6. Get total payment amount for current month
    const totalPaymentResult = await db.query(
      `SELECT SUM(payment_amount) as total FROM work_logs 
       WHERE work_date >= $1 AND work_date <= $2`,
      [startDate, endDate]
    )
    const totalPayment = parseFloat(totalPaymentResult.rows[0]?.total?.toString() || "0")

    // 7. Return the stats
    return NextResponse.json({
      totalEmployees,
      totalHours,
      totalPayment,
      currentMonth: `${year}-${month.toString().padStart(2, '0')}`
    })

  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "통계 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
} 