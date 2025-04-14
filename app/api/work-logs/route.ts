import { and, asc, desc, eq, gte, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { createClient } from "@/lib/db"
import { db as drizzleDb } from "@/src/db"
import { users, workLogs } from "@/src/db/schema"

// Helper function to calculate net work hours
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
    if (grossWorkMs < 0) grossWorkMs = 0 // Handle overnight or invalid times

    let breakMs = 0
    if (breakStartTime && breakEndTime) {
      const breakStart = new Date(`${today}T${breakStartTime}Z`).getTime()
      const breakEnd = new Date(`${today}T${breakEndTime}Z`).getTime()
      if (breakEnd > breakStart) {
        breakMs = breakEnd - breakStart
      }
    }

    const netWorkMs = Math.max(0, grossWorkMs - breakMs)
    return Math.round((netWorkMs / (1000 * 60 * 60)) * 100) / 100 // Hours rounded to 2 decimal places
  } catch (error) {
    console.error("Error calculating work hours:", error)
    return 0
  }
}

// GET /api/work-logs - 근무내역 목록 조회 (휴게 시간 포함)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "인증되지 않았습니다." }, { status: 401 })
    }

    const { id, role } = authResult.user
    const { searchParams } = new URL(request.url)

    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const queryUserId = searchParams.get("userId")

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "시작일과 종료일이 필요합니다." }, { status: 400 })
    }

    let query = drizzleDb
      .select({
        id: workLogs.id,
        userId: workLogs.userId,
        userName: users.name,
        workDate: workLogs.workDate,
        startTime: workLogs.startTime,
        endTime: workLogs.endTime,
        breakStartTime: workLogs.breakStartTime,
        breakEndTime: workLogs.breakEndTime,
        workHours: workLogs.workHours,
        hourlyRate: workLogs.hourlyRate,
        paymentAmount: workLogs.paymentAmount,
        memo: workLogs.memo,
      })
      .from(workLogs)
      .innerJoin(users, eq(workLogs.userId, users.id))
      .where(and(gte(workLogs.workDate, startDateParam), lte(workLogs.workDate, endDateParam)))
      .orderBy(desc(workLogs.workDate), asc(workLogs.startTime))

    // 관리자 권한 확인 (DB에서 재확인)
    const dbUser = await drizzleDb.query.users.findFirst({
      where: eq(users.id, id),
      columns: { role: true },
    })
    const isAdmin = dbUser?.role === "admin"

    if (isAdmin) {
      if (queryUserId && queryUserId.trim() !== "") {
        query = query.where(
          and(
            gte(workLogs.workDate, startDateParam),
            lte(workLogs.workDate, endDateParam),
            eq(workLogs.userId, queryUserId)
          )
        )
      }
      // No extra condition if admin and no specific userId
    } else {
      // 일반 사용자: 자신의 것만
      query = query.where(
        and(gte(workLogs.workDate, startDateParam), lte(workLogs.workDate, endDateParam), eq(workLogs.userId, id))
      )
    }

    const result = await query

    return NextResponse.json(result)
  } catch (error) {
    console.error("근무내역 조회 오류:", error)
    return NextResponse.json(
      {
        error: "근무내역 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// POST /api/work-logs - 근무내역 추가 (휴게 시간 반영)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "인증되지 않았습니다." }, { status: 401 })
    }

    const { id: requesterId, role: requesterRole } = authResult.user
    const data = (await request.json()) as {
      userId: string
      workDate: string
      startTime: string
      endTime: string
      breakStartTime?: string | null
      breakEndTime?: string | null
      includeBreak?: boolean // Flag to indicate if break time is provided
      hourlyRate?: number
      memo?: string | null
    }

    // 관리자 권한 확인
    const dbUser = await drizzleDb.query.users.findFirst({
      where: eq(users.id, requesterId),
      columns: { role: true, hourlyRate: true },
    })
    const isAdmin = dbUser?.role === "admin"

    if (!isAdmin && data.userId !== requesterId) {
      return NextResponse.json({ error: "다른 사용자의 근무내역을 추가할 권한이 없습니다." }, { status: 403 })
    }

    // 데이터 유효성 검사
    if (!data.userId || !data.workDate || !data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: "필수 필드(사용자ID, 근무일, 시작/종료시간)가 누락되었습니다." },
        { status: 400 }
      )
    }

    // 대상 사용자의 시급 가져오기 (관리자가 다른 사람 것을 추가할 경우)
    let hourlyRate = data.hourlyRate
    if (hourlyRate === undefined || hourlyRate <= 0) {
      const targetUser =
        requesterId === data.userId
          ? dbUser
          : await drizzleDb.query.users.findFirst({ where: eq(users.id, data.userId), columns: { hourlyRate: true } })
      if (!targetUser?.hourlyRate) {
        return NextResponse.json(
          {
            error: "유효한 시급 정보가 없습니다. 관리자에게 문의하세요.",
            isWarning: true,
          },
          { status: 400 }
        )
      }
      hourlyRate = Number(targetUser.hourlyRate)
    }
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      return NextResponse.json(
        {
          error: "유효한 시급 정보가 없습니다. 관리자에게 시급 정보 설정을 요청하세요.",
          isWarning: true,
        },
        { status: 400 }
      )
    }

    // 휴게 시간 처리
    let breakStartTime = null
    let breakEndTime = null
    if (data.includeBreak && data.breakStartTime && data.breakEndTime) {
      breakStartTime = data.breakStartTime
      breakEndTime = data.breakEndTime
      // TODO: Add validation for break time format and logic (end > start)
    }

    // 근무 시간 계산 (휴게 시간 제외)
    const netWorkHours = calculateNetWorkHours(data.startTime, data.endTime, breakStartTime, breakEndTime)
    if (netWorkHours <= 0 && data.startTime !== data.endTime) {
      // 0시간 근무 허용, 단 시작/종료 같지 않을때만 오류
      // Consider allowing 0 hours if start/end are the same? Depends on policy.
      return NextResponse.json(
        { error: "종료 시간은 시작 시간보다 늦어야 하며, 휴게 시간은 총 근무 시간보다 짧아야 합니다." },
        { status: 400 }
      )
    }

    const paymentAmount = Math.round(netWorkHours * hourlyRate)

    // 중복 체크 (같은 날짜, 같은 사용자의 겹치는 시간대 체크)
    const existingLog = await drizzleDb.query.workLogs.findFirst({
      where: and(
        eq(workLogs.userId, data.userId),
        eq(workLogs.workDate, data.workDate),
        // 시간 겹침 체크: 새 근무 시간이 기존 근무 시간과 겹치는지 확인
        or(
          // 새 근무의 시작 시간이 기존 근무 시간대 내에 있는 경우
          and(
            gte(sql`${data.startTime}::time`, sql`${workLogs.startTime}::time`),
            lt(sql`${data.startTime}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 새 근무의 종료 시간이 기존 근무 시간대 내에 있는 경우
          and(
            gt(sql`${data.endTime}::time`, sql`${workLogs.startTime}::time`),
            lte(sql`${data.endTime}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 새 근무가 기존 근무를 완전히 포함하는 경우
          and(
            lte(sql`${data.startTime}::time`, sql`${workLogs.startTime}::time`),
            gte(sql`${data.endTime}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 기존 근무가 새 근무를 완전히 포함하는 경우 (이 경우 추가)
          and(
            gte(sql`${data.startTime}::time`, sql`${workLogs.startTime}::time`),
            lte(sql`${data.endTime}::time`, sql`${workLogs.endTime}::time`)
          ),
          // 시작 시간이 정확히 같은 경우
          eq(sql`${data.startTime}::time`, sql`${workLogs.startTime}::time`),
          // 종료 시간이 정확히 같은 경우
          eq(sql`${data.endTime}::time`, sql`${workLogs.endTime}::time`)
        )
      ),
    })

    if (existingLog) {
      return NextResponse.json(
        {
          error: "이미 같은 날짜와 시간에 중복된 근무 기록이 있습니다. 시간이 겹치지 않도록 조정해주세요.",
          isWarning: true,
        },
        { status: 400 }
      )
    }

    // 데이터 삽입
    const newWorkLog = await drizzleDb
      .insert(workLogs)
      .values({
        userId: data.userId,
        workDate: data.workDate,
        startTime: data.startTime,
        endTime: data.endTime,
        breakStartTime: breakStartTime,
        breakEndTime: breakEndTime,
        workHours: netWorkHours,
        hourlyRate: hourlyRate,
        paymentAmount: paymentAmount,
        memo: data.memo,
      })
      .returning()

    if (!newWorkLog || newWorkLog.length === 0) {
      throw new Error("Failed to insert work log.")
    }

    // 사용자 이름 포함하여 반환
    const user = await drizzleDb.query.users.findFirst({
      where: eq(users.id, newWorkLog[0].userId),
      columns: { name: true },
    })

    const responseData = {
      ...newWorkLog[0],
      userName: user?.name ?? "Unknown",
      workHours: Number(newWorkLog[0].workHours), // Ensure number type
      hourlyRate: Number(newWorkLog[0].hourlyRate),
      paymentAmount: Number(newWorkLog[0].paymentAmount),
    }

    return NextResponse.json(
      {
        message: "근무내역이 추가되었습니다.",
        workLog: responseData,
      },
      { status: 201 }
    )
  } catch (error) {
    console.warn("근무내역 추가 알림:", error)
    // Handle potential unique constraint violation or other DB errors
    if (error instanceof Error && error.message.includes("duplicate key value violates unique constraint")) {
      return NextResponse.json(
        {
          error: "해당 날짜와 시간에 이미 근무 기록이 존재합니다. 시간이 겹치지 않도록 조정해주세요.",
          isWarning: true,
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      {
        error: "서버 작업 중 예상치 못한 문제가 발생했습니다. 입력 내용을 확인하고 다시 시도해 주세요.",
        details: error instanceof Error ? error.message : String(error),
        isWarning: true,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/work-logs/:id - 근무내역 삭제
export async function DELETE(request: NextRequest) {
  try {
    // JWT 검증 및 사용자 정보 가져오기
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "사용자 정보를 가져올 수 없습니다." }, { status: 401 })
    }

    const { id, role } = authResult.user
    const workLogId = request.nextUrl.pathname.split("/").pop() || ""

    if (!workLogId) {
      return NextResponse.json({ error: "근무내역 ID가 필요합니다." }, { status: 400 })
    }

    const db = createClient()

    // 근무내역 존재 여부 및 권한 확인
    const checkQuery = "SELECT user_id FROM work_logs WHERE id = $1"
    const checkResult = await db.query(checkQuery, [workLogId])

    if (checkResult.rowCount === 0) {
      return NextResponse.json({ error: "해당 근무내역이 존재하지 않습니다." }, { status: 404 })
    }

    const workLogUserId = checkResult.rows[0].user_id

    if (role !== "admin" && workLogUserId !== id) {
      return NextResponse.json({ error: "다른 사용자의 근무내역을 삭제할 권한이 없습니다." }, { status: 403 })
    }

    // 근무내역 삭제
    const query = "DELETE FROM work_logs WHERE id = $1"
    const result = await db.query(query, [workLogId])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "근무내역 삭제 실패" }, { status: 500 })
    }

    return NextResponse.json({ message: "근무내역이 성공적으로 삭제되었습니다." })
  } catch (error) {
    console.error("근무내역 삭제 오류:", error)
    return NextResponse.json(
      {
        error: "근무내역을 삭제하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
