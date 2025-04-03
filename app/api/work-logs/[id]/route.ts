import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { createClient } from "@/lib/db"

// GET /api/work-logs/:id - 특정 근무내역 조회
export async function GET(request: NextRequest) {
  try {
    // URL에서 id 추출
    const pathParts = request.nextUrl.pathname.split("/")
    const workLogId = pathParts[pathParts.length - 1]

    console.log("GET /api/work-logs/:id 호출됨, ID:", workLogId)

    // JWT 검증 및 사용자 정보 가져오기
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error || "인증되지 않은 요청입니다." }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "사용자 정보를 가져올 수 없습니다." }, { status: 401 })
    }

    const { id, role } = authResult.user

    const db = createClient()

    // 근무내역 존재 여부 확인
    const checkResult = await db.query(
      `
      SELECT w.*, u.name as user_name
      FROM work_logs w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = $1
    `,
      [workLogId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "해당 근무내역을 찾을 수 없습니다." }, { status: 404 })
    }

    // 접근 권한 확인 (관리자이거나 본인의 근무내역만 조회 가능)
    const workLog = checkResult.rows[0]

    if (role !== "admin" && workLog.user_id !== id) {
      return NextResponse.json({ error: "이 근무내역에 접근할 권한이 없습니다." }, { status: 403 })
    }

    const formattedWorkLog = {
      id: workLog.id,
      userId: workLog.user_id,
      userName: workLog.user_name,
      workDate: workLog.work_date,
      startTime: workLog.start_time,
      endTime: workLog.end_time,
      workHours: parseFloat(workLog.work_hours),
      hourlyRate: parseFloat(workLog.hourly_rate),
      paymentAmount: parseFloat(workLog.payment_amount),
      memo: workLog.memo,
    }

    return NextResponse.json(formattedWorkLog)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "근무내역 조회 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// PUT /api/work-logs/:id - 근무내역 수정
export async function PUT(request: NextRequest) {
  try {
    // URL에서 id 추출
    const pathParts = request.nextUrl.pathname.split("/")
    const workLogId = pathParts[pathParts.length - 1]

    // JWT 토큰 검증
    const authResult = await verifyAuth(request)

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error || "인증되지 않은 요청입니다." }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "사용자 정보를 가져올 수 없습니다." }, { status: 401 })
    }

    const { id: userID, role: _role } = authResult.user // userId 대신 id 사용

    const db = createClient()

    // DB에서 사용자 실제 역할 재확인
    const userRoleResult = await db.query("SELECT role FROM users WHERE id = $1", [userID])

    if (userRoleResult.rows.length === 0) {
      console.error("사용자를 찾을 수 없음:", userID)
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    const dbRole = userRoleResult.rows[0].role
    console.log("DB에서 확인한 실제 사용자 역할:", dbRole)

    // 대소문자 무관하게 'admin' 역할 확인 (DB 값 우선)
    const isAdmin = dbRole?.toLowerCase() === "admin"

    // 근무내역 존재 여부 확인
    const checkResult = await db.query("SELECT user_id FROM work_logs WHERE id = $1", [workLogId])

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "해당 근무내역을 찾을 수 없습니다." }, { status: 404 })
    }

    // 접근 권한 확인 (관리자이거나 본인의 근무내역만 수정 가능)
    const workLogUserId = checkResult.rows[0].user_id

    if (!isAdmin && workLogUserId !== userID) {
      return NextResponse.json({ error: "이 근무내역을 수정할 권한이 없습니다." }, { status: 403 })
    }

    // 요청 데이터 가져오기
    const data = (await request.json()) as {
      work_date?: string
      start_time?: string
      end_time?: string
      work_hours?: number
      hourly_rate?: number
      payment_amount?: number
      memo?: string | null
    }

    // 필수 필드 검증
    if (
      !data.work_date ||
      !data.start_time ||
      !data.end_time ||
      !data.work_hours ||
      !data.hourly_rate ||
      data.payment_amount === undefined
    ) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 })
    }

    // 근무내역 수정
    const result = await db.query(
      `
      UPDATE work_logs
      SET work_date = $1, start_time = $2, end_time = $3, work_hours = $4, hourly_rate = $5, payment_amount = $6, memo = $7
      WHERE id = $8
      RETURNING *
    `,
      [
        data.work_date,
        data.start_time,
        data.end_time,
        data.work_hours,
        data.hourly_rate,
        data.payment_amount,
        data.memo,
        workLogId,
      ]
    )

    return NextResponse.json({
      message: "근무내역이 수정되었습니다.",
      workLog: {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        workDate: result.rows[0].work_date,
        startTime: result.rows[0].start_time,
        endTime: result.rows[0].end_time,
        workHours: parseFloat(result.rows[0].work_hours),
        hourlyRate: parseFloat(result.rows[0].hourly_rate),
        paymentAmount: parseFloat(result.rows[0].payment_amount),
        memo: result.rows[0].memo,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "근무내역 수정 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// DELETE /api/work-logs/:id - 근무내역 삭제
export async function DELETE(request: NextRequest) {
  try {
    // URL에서 id 추출
    const pathParts = request.nextUrl.pathname.split("/")
    const workLogId = pathParts[pathParts.length - 1]

    console.log("DELETE /api/work-logs/:id 호출됨, ID:", workLogId)

    // JWT 검증 및 사용자 정보 가져오기
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error || "인증되지 않은 요청입니다." }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "사용자 정보를 가져올 수 없습니다." }, { status: 401 })
    }

    const { id, role: _role } = authResult.user

    const db = createClient()

    // DB에서 사용자 실제 역할 재확인
    const userRoleResult = await db.query("SELECT role FROM users WHERE id = $1", [id])

    if (userRoleResult.rows.length === 0) {
      console.error("사용자를 찾을 수 없음:", id)
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    const dbRole = userRoleResult.rows[0].role
    console.log("DB에서 확인한 실제 사용자 역할:", dbRole)

    // 대소문자 무관하게 'admin' 역할 확인 (DB 값 우선)
    const isAdmin = dbRole?.toLowerCase() === "admin"

    // 근무내역 존재 여부 확인
    const checkResult = await db.query("SELECT user_id FROM work_logs WHERE id = $1", [workLogId])

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "해당 근무내역을 찾을 수 없습니다." }, { status: 404 })
    }

    // 접근 권한 확인 (관리자이거나 본인의 근무내역만 삭제 가능)
    const workLogUserId = checkResult.rows[0].user_id

    if (!isAdmin && workLogUserId !== id) {
      return NextResponse.json({ error: "이 근무내역을 삭제할 권한이 없습니다." }, { status: 403 })
    }

    // 근무내역 삭제
    await db.query("DELETE FROM work_logs WHERE id = $1", [workLogId])

    return NextResponse.json({ message: "근무내역이 삭제되었습니다." })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "근무내역 삭제 중 오류가 발생했습니다." }, { status: 500 })
  }
}
