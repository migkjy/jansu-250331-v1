import { and, eq, gt, gte, lt, lte, ne, or, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { db as drizzleDb } from "@/src/db"
import { users, workLogs } from "@/src/db/schema"

// Helper function (assuming it's defined elsewhere or copied here)
const calculateNetWorkHours = (
  startTime: string | null,
  endTime: string | null,
  breakStartTime: string | null,
  breakEndTime: string | null
): number => {
  if (!startTime || !endTime) return 0
  try {
    const today = "1970-01-01" // Use a fixed date for time calculations
    const start = new Date(`${today}T${startTime}Z`).getTime()
    const end = new Date(`${today}T${endTime}Z`).getTime()
    let grossWorkMs = end - start
    if (grossWorkMs < 0) grossWorkMs = 0
    let breakMs = 0
    if (breakStartTime && breakEndTime) {
      const breakStart = new Date(`${today}T${breakStartTime}Z`).getTime()
      const breakEnd = new Date(`${today}T${breakEndTime}Z`).getTime()
      if (breakEnd > breakStart) breakMs = breakEnd - breakStart
    }
    const netWorkMs = Math.max(0, grossWorkMs - breakMs)
    return Math.round((netWorkMs / (1000 * 60 * 60)) * 100) / 100
  } catch (error) {
    console.error("Error calculating work hours:", error)
    return 0
  }
}

// GET /api/work-logs/:id - 특정 근무내역 조회 (Drizzle ORM 사용)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workLogId = params.id
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "인증되지 않았습니다." }, { status: 401 })
    }
    const { id: requesterId, role: requesterRole } = authResult.user

    const result = await drizzleDb.query.workLogs.findFirst({
      where: eq(workLogs.id, workLogId),
      with: {
        user: { columns: { name: true } },
      },
    })

    if (!result) {
      return NextResponse.json({ error: "해당 근무내역을 찾을 수 없습니다." }, { status: 404 })
    }

    // 관리자 또는 본인 확인
    const dbUser = await drizzleDb.query.users.findFirst({ where: eq(users.id, requesterId), columns: { role: true } })
    const isAdmin = dbUser?.role === "admin"

    if (!isAdmin && result.userId !== requesterId) {
      return NextResponse.json({ error: "이 근무내역에 접근할 권한이 없습니다." }, { status: 403 })
    }

    // Format response
    const formattedWorkLog = {
      ...result,
      userName: result.user.name,
      workHours: Number(result.workHours),
      hourlyRate: Number(result.hourlyRate),
      paymentAmount: Number(result.paymentAmount),
    }
    // delete (formattedWorkLog as any).user; // Remove nested user object if not needed

    return NextResponse.json(formattedWorkLog)
  } catch (error) {
    console.error(`Error fetching work log ${params.id}:`, error)
    return NextResponse.json({ error: "근무내역 조회 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// PUT /api/work-logs/:id - 근무내역 수정 (Drizzle ORM, 휴게 시간 반영)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workLogId = params.id
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "인증되지 않았습니다." }, { status: 401 })
    }
    const { id: requesterId } = authResult.user

    const data = (await request.json()) as {
      user_id?: string // Optional: Admin might change the user?
      work_date: string
      start_time: string
      end_time: string
      break_start_time?: string | null
      break_end_time?: string | null
      include_break?: boolean
      hourly_rate?: number
      memo?: string | null
    }

    // Fetch the existing work log to check ownership and get user ID
    const existingWorkLog = await drizzleDb.query.workLogs.findFirst({
      where: eq(workLogs.id, workLogId),
      columns: { userId: true },
    })

    if (!existingWorkLog) {
      return NextResponse.json({ error: "해당 근무내역을 찾을 수 없습니다." }, { status: 404 })
    }

    // 관리자 권한 확인
    const dbUser = await drizzleDb.query.users.findFirst({
      where: eq(users.id, requesterId),
      columns: { role: true, hourlyRate: true },
    })
    const isAdmin = dbUser?.role === "admin"

    // 권한 확인: 관리자가 아니면 본인 것만 수정 가능
    if (!isAdmin && existingWorkLog.userId !== requesterId) {
      return NextResponse.json({ error: "이 근무내역을 수정할 권한이 없습니다." }, { status: 403 })
    }

    // 필수 데이터 확인
    if (!data.work_date || !data.start_time || !data.end_time) {
      return NextResponse.json({ error: "근무일, 시작 시간, 종료 시간은 필수입니다." }, { status: 400 })
    }

    // 시급 처리: 입력값이 없거나 유효하지 않으면 해당 직원의 현재 시급 사용
    let hourlyRate = data.hourly_rate
    const targetUserId = data.user_id ?? existingWorkLog.userId // Use provided user_id if admin changes it, else existing
    if (hourlyRate === undefined || hourlyRate <= 0) {
      const targetUser =
        isAdmin && data.user_id && data.user_id !== existingWorkLog.userId
          ? await drizzleDb.query.users.findFirst({ where: eq(users.id, data.user_id), columns: { hourlyRate: true } })
          : await drizzleDb.query.users.findFirst({
              where: eq(users.id, existingWorkLog.userId),
              columns: { hourlyRate: true },
            })

      if (!targetUser?.hourlyRate) {
        return NextResponse.json({ error: "해당 직원의 시급 정보를 찾을 수 없습니다." }, { status: 400 })
      }
      hourlyRate = Number(targetUser.hourlyRate)
    }
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      return NextResponse.json({ error: "유효한 시급 정보가 없습니다." }, { status: 400 })
    }

    // 휴게 시간 처리
    let breakStartTime = data.break_start_time === undefined ? null : data.break_start_time
    let breakEndTime = data.break_end_time === undefined ? null : data.break_end_time
    if (!data.include_break || !breakStartTime || !breakEndTime) {
      breakStartTime = null
      breakEndTime = null
    }

    // 근무 시간 및 급여 계산
    const netWorkHours = calculateNetWorkHours(data.start_time, data.end_time, breakStartTime, breakEndTime)
    if (netWorkHours <= 0 && data.start_time !== data.end_time) {
      return NextResponse.json(
        { error: "종료 시간은 시작 시간보다 늦어야 하며, 휴게 시간은 총 근무 시간보다 짧아야 합니다." },
        { status: 400 }
      )
    }
    const paymentAmount = Math.round(netWorkHours * hourlyRate)

    // 중복 체크 (같은 날짜, 같은 사용자의 겹치는 시간대 체크)
    const existingLog = await drizzleDb.query.workLogs.findFirst({
      where: and(
        eq(workLogs.userId, data.user_id),
        eq(workLogs.workDate, data.work_date),
        ne(workLogs.id, params.id), // 자신을 제외한 다른 레코드 검색
        // 시간 겹침 체크: 새 근무 시간이 기존 근무 시간과 겹치는지 확인
        or(
          // 새 근무의 시작 시간이 기존 근무 시간대 내에 있는 경우
          and(
            gte(sql`${data.start_time}::time`, sql`${workLogs.startTime}::time`),
            lt(sql`${data.start_time}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 새 근무의 종료 시간이 기존 근무 시간대 내에 있는 경우
          and(
            gt(sql`${data.end_time}::time`, sql`${workLogs.startTime}::time`),
            lte(sql`${data.end_time}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 새 근무가 기존 근무를 완전히 포함하는 경우
          and(
            lte(sql`${data.start_time}::time`, sql`${workLogs.startTime}::time`),
            gte(sql`${data.end_time}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 기존 근무가 새 근무를 완전히 포함하는 경우
          and(
            gte(sql`${data.start_time}::time`, sql`${workLogs.startTime}::time`),
            lte(sql`${data.end_time}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 시작 시간이 정확히 같은 경우
          eq(sql`${data.start_time}::time`, sql`${workLogs.startTime}::time`),
          // 종료 시간이 정확히 같은 경우
          eq(sql`${data.end_time}::time`, sql`${workLogs.endTime}::time`)
        )
      ),
    })

    if (existingLog) {
      return NextResponse.json(
        {
          error: "수정된 시간이 다른 근무 기록과 겹칩니다. 시간이 겹치지 않도록 조정해주세요.",
          isWarning: true,
          details: "같은 날짜에 동일 직원의 다른 근무 내역과 시간이 겹치면 안됩니다.",
        },
        { status: 400 }
      )
    }

    // 데이터 업데이트
    const updatedResult = await drizzleDb
      .update(workLogs)
      .set({
        userId: isAdmin && data.user_id ? data.user_id : undefined, // Allow admin to change user ID
        workDate: data.work_date,
        startTime: data.start_time,
        endTime: data.end_time,
        breakStartTime: breakStartTime,
        breakEndTime: breakEndTime,
        workHours: netWorkHours,
        hourlyRate: hourlyRate,
        paymentAmount: paymentAmount,
        memo: data.memo,
      })
      .where(eq(workLogs.id, workLogId))
      .returning()

    if (!updatedResult || updatedResult.length === 0) {
      throw new Error("Failed to update work log.")
    }

    // 사용자 이름 포함하여 반환
    const user = await drizzleDb.query.users.findFirst({
      where: eq(users.id, updatedResult[0].userId),
      columns: { name: true },
    })

    const responseData = {
      ...updatedResult[0],
      userName: user?.name ?? "Unknown",
      workHours: Number(updatedResult[0].workHours),
      hourlyRate: Number(updatedResult[0].hourlyRate),
      paymentAmount: Number(updatedResult[0].paymentAmount),
    }

    return NextResponse.json({
      message: "근무내역이 수정되었습니다.",
      workLog: responseData,
    })
  } catch (error) {
    console.warn(`Work log update notification ${params.id}:`, error)
    // Handle potential unique constraint violation or other DB errors
    if (error instanceof Error && error.message.includes("duplicate key value violates unique constraint")) {
      return NextResponse.json(
        { error: "수정하려는 시간에 다른 근무 기록이 존재합니다.", isWarning: true },
        { status: 409 }
      )
    }
    return NextResponse.json(
      {
        error: "근무내역을 수정하는 중 문제가 발생했습니다. 입력한 시간을 확인하고 다시 시도해 주세요.",
        details: error instanceof Error ? error.message : String(error),
        isWarning: true,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/work-logs/:id - 근무내역 삭제 (Drizzle ORM 사용)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workLogId = params.id
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "인증되지 않았습니다." }, { status: 401 })
    }
    const { id: requesterId } = authResult.user

    // Fetch the existing work log to check ownership
    const existingWorkLog = await drizzleDb.query.workLogs.findFirst({
      where: eq(workLogs.id, workLogId),
      columns: { userId: true },
    })

    if (!existingWorkLog) {
      return NextResponse.json({ error: "해당 근무내역을 찾을 수 없습니다." }, { status: 404 })
    }

    // 관리자 권한 확인
    const dbUser = await drizzleDb.query.users.findFirst({ where: eq(users.id, requesterId), columns: { role: true } })
    const isAdmin = dbUser?.role === "admin"

    // 권한 확인: 관리자가 아니면 본인 것만 삭제 가능
    if (!isAdmin && existingWorkLog.userId !== requesterId) {
      return NextResponse.json({ error: "이 근무내역을 삭제할 권한이 없습니다." }, { status: 403 })
    }

    // 근무내역 삭제
    const deleteResult = await drizzleDb
      .delete(workLogs)
      .where(eq(workLogs.id, workLogId))
      .returning({ deletedId: workLogs.id })

    if (!deleteResult || deleteResult.length === 0) {
      throw new Error("Failed to delete work log.")
    }

    return NextResponse.json({ message: "근무내역이 삭제되었습니다." })
  } catch (error) {
    console.error(`Error deleting work log ${params.id}:`, error)
    return NextResponse.json(
      {
        error: "근무내역을 삭제하는 중 문제가 발생했습니다. 다른 데이터와 연결되어 있거나 서버 문제일 수 있습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
