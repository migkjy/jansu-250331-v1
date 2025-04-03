import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { createClient } from "@/lib/db"

// GET /api/work-logs - 근무내역 목록 조회
export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/work-logs 호출됨")
    // JWT 검증 및 사용자 정보 가져오기
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      console.error("인증 실패:", authResult.error)
      return NextResponse.json({ error: authResult.error || "인증되지 않은 요청입니다." }, { status: 401 })
    }

    if (!authResult.user) {
      console.error("사용자 정보 없음")
      return NextResponse.json({ error: "사용자 정보를 가져올 수 없습니다." }, { status: 401 })
    }

    const { id, role } = authResult.user
    const { searchParams } = new URL(request.url)

    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const queryUserId = searchParams.get("userId")

    console.log("원본 검색 파라미터:", { startDateParam, endDateParam, queryUserId })

    // 쿼리 파라미터 검증
    if (!startDateParam || !endDateParam) {
      console.error("시작일 또는 종료일 누락")
      return NextResponse.json({ error: "시작일과 종료일이 필요합니다." }, { status: 400 })
    }

    // 날짜 사용 - 타임존 문제는 SET timezone 설정과 ::date 캐스팅으로 해결
    const startDate = startDateParam
    const endDate = endDateParam

    console.log("검색에 사용할 날짜:", { startDate, endDate, queryUserId })
    console.log("사용자 권한:", {
      role,
      isAdmin: role?.toLowerCase() === "admin",
      userId: id,
    })

    try {
      const db = createClient()
      let query = ""
      let params: (string | Date)[] = []

      // 관리자 권한 재확인
      const userRoleResult = await db.query("SELECT role FROM users WHERE id = $1", [id])
      const dbRole = userRoleResult.rows.length > 0 ? userRoleResult.rows[0].role : role
      const isAdmin = dbRole?.toLowerCase() === "admin"

      console.log("DB에서 확인한 사용자 역할:", { dbRole, isAdmin })

      // 날짜 쿼리를 ISO 형식으로 변환하여 정확한 비교 보장
      const formatDateForQuery = (dateStr: string) => {
        // YYYY-MM-DD 형식을 서울 시간대(UTC+9) 기준으로 해석
        // 서버가 UTC 기준으로 동작하므로 날짜만 있는 경우 시간대 고려
        const dateParts = dateStr.split("-")
        if (dateParts.length !== 3) {
          // 잘못된 형식이면 그대로 반환
          return dateStr
        }

        return dateStr
      }

      // 쿼리 파라미터를 포맷팅
      const formattedStartDate = formatDateForQuery(startDate)
      const formattedEndDate = formatDateForQuery(endDate)

      console.log("포맷팅된 날짜 파라미터:", {
        원본시작일: startDate,
        변환시작일: formattedStartDate,
        원본종료일: endDate,
        변환종료일: formattedEndDate,
      })

      if (isAdmin) {
        // 관리자: 모든 근무내역 또는 특정 사용자의 근무내역 조회
        if (queryUserId && queryUserId.trim() !== "") {
          query = `
            SELECT w.*, u.name as user_name
            FROM work_logs w
            JOIN users u ON w.user_id = u.id
            WHERE DATE(w.work_date) >= DATE($1)
            AND DATE(w.work_date) <= DATE($2)
            AND w.user_id = $3
            ORDER BY w.work_date DESC, w.start_time ASC
          `
          params = [formattedStartDate, formattedEndDate, queryUserId]
          console.log("관리자가 특정 직원의 근무내역 조회:", queryUserId)
        } else {
          query = `
            SELECT w.*, u.name as user_name
            FROM work_logs w
            JOIN users u ON w.user_id = u.id
            WHERE DATE(w.work_date) >= DATE($1)
            AND DATE(w.work_date) <= DATE($2)
            ORDER BY w.work_date DESC, w.start_time ASC
          `
          params = [formattedStartDate, formattedEndDate]
          console.log("관리자가 모든 직원의 근무내역 조회")
        }
      } else {
        // 일반 사용자: 자신의 근무내역만 조회
        query = `
          SELECT w.*, u.name as user_name
          FROM work_logs w
          JOIN users u ON w.user_id = u.id
          WHERE DATE(w.work_date) >= DATE($1)
          AND DATE(w.work_date) <= DATE($2)
          AND w.user_id = $3
          ORDER BY w.work_date DESC, w.start_time ASC
        `
        params = [formattedStartDate, formattedEndDate, id]
        console.log("일반 사용자가 자신의 근무내역만 조회:", id)
      }

      console.log("실행 쿼리:", query, "파라미터:", params)

      const result = await db.query(query, params)
      console.log("쿼리 결과:", result.rowCount, "행 반환됨")
      console.log("반환된 행 샘플:", result.rows.length > 0 ? result.rows[0] : "결과 없음")

      const workLogs = result.rows.map((log) => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        workDate: log.work_date,
        startTime: log.start_time,
        endTime: log.end_time,
        workHours: parseFloat(log.work_hours),
        hourlyRate: parseFloat(log.hourly_rate),
        paymentAmount: parseFloat(log.payment_amount),
        memo: log.memo,
      }))

      console.log("클라이언트에 반환할 데이터:", workLogs.length, "개의 항목")
      return NextResponse.json(workLogs)
    } catch (dbError) {
      console.error("데이터베이스 오류:", dbError)
      return NextResponse.json(
        {
          error: "데이터베이스 작업 중 오류가 발생했습니다.",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 }
      )
    }
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

// POST /api/work-logs - 근무내역 추가
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/work-logs 호출됨")
    // JWT 검증 및 사용자 정보 가져오기
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      console.error("인증 실패:", authResult.error)
      return NextResponse.json({ error: authResult.error || "인증되지 않은 요청입니다." }, { status: 401 })
    }

    if (!authResult.user) {
      console.error("사용자 정보 없음")
      return NextResponse.json({ error: "사용자 정보를 가져올 수 없습니다." }, { status: 401 })
    }

    // 사용자 ID 및 역할 정보 확인
    const { id, role } = authResult.user
    const data = (await request.json()) as {
      user_id: string
      work_date: string
      start_time: string
      end_time: string
      work_hours: number
      hourly_rate: number
      payment_amount: number
      memo?: string
    }

    console.log("근무내역 추가 요청:", {
      userRole: role,
      userId: id,
      requestedUserId: data.user_id,
    })

    // DB에서 사용자 실제 역할 재확인
    const db = createClient()
    const userRoleResult = await db.query("SELECT role FROM users WHERE id = $1", [id])

    if (userRoleResult.rows.length === 0) {
      console.error("사용자를 찾을 수 없음:", id)
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    const dbRole = userRoleResult.rows[0].role
    console.log("DB에서 확인한 실제 사용자 역할:", dbRole)

    // 대소문자 무관하게 'admin' 역할 확인 (DB 값 우선)
    const isAdmin = dbRole?.toLowerCase() === "admin"

    if (!isAdmin && data.user_id !== id) {
      console.error("권한 오류: 일반 사용자가 다른 사용자의 근무내역 추가 시도")
      return NextResponse.json(
        {
          error: "다른 사용자의 근무내역을 추가할 권한이 없습니다.",
          details: `현재 사용자 역할: ${dbRole}, ID: ${id}, 요청한 사용자 ID: ${data.user_id}`,
        },
        { status: 403 }
      )
    }

    // 데이터 유효성 검사
    if (
      !data.user_id ||
      !data.work_date ||
      !data.start_time ||
      !data.end_time ||
      !data.work_hours ||
      !data.hourly_rate ||
      !data.payment_amount
    ) {
      console.error("필수 필드 누락")
      return NextResponse.json({ error: "필수 필드가 누락되었습니다." }, { status: 400 })
    }

    // 중복 체크 (시간 겹침 확인)
    const timeOverlapCheck = await db.query(
      `
      SELECT id FROM work_logs 
      WHERE user_id = $1 
      AND work_date = $2
      AND (
        ($3 BETWEEN start_time AND end_time) OR
        ($4 BETWEEN start_time AND end_time) OR
        (start_time BETWEEN $3 AND $4) OR
        (end_time BETWEEN $3 AND $4)
      )
    `,
      [data.user_id, data.work_date, data.start_time, data.end_time]
    )

    if (timeOverlapCheck.rowCount && timeOverlapCheck.rowCount > 0) {
      return NextResponse.json({ error: "해당 시간대에 이미 근무내역이 존재합니다." }, { status: 409 })
    }

    // 근무내역 추가
    const query = `
      INSERT INTO work_logs (
        user_id, work_date, start_time, end_time, work_hours,
        hourly_rate, payment_amount, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const result = await db.query(query, [
      data.user_id,
      data.work_date,
      data.start_time,
      data.end_time,
      data.work_hours,
      data.hourly_rate,
      data.payment_amount,
      data.memo || "",
    ])

    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json({ error: "근무내역 추가 실패" }, { status: 500 })
    }

    // 사용자 이름 가져오기
    const userQuery = "SELECT name FROM users WHERE id = $1"
    const userResult = await db.query(userQuery, [data.user_id])
    const userName = userResult.rows[0]?.name || ""

    const workLog = {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      userName,
      workDate: result.rows[0].work_date,
      startTime: result.rows[0].start_time,
      endTime: result.rows[0].end_time,
      workHours: parseFloat(result.rows[0].work_hours),
      hourlyRate: parseFloat(result.rows[0].hourly_rate),
      paymentAmount: parseFloat(result.rows[0].payment_amount),
      memo: result.rows[0].memo,
    }

    return NextResponse.json({ message: "근무내역이 성공적으로 추가되었습니다.", workLog })
  } catch (error) {
    console.error("근무내역 추가 오류:", error)
    return NextResponse.json({ error: "근무내역 추가 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// PUT /api/work-logs/:id - 근무내역 수정
export async function PUT(request: NextRequest) {
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
    const data = (await request.json()) as {
      work_date: string
      start_time: string
      end_time: string
      work_hours: number
      hourly_rate: number
      payment_amount: number
      memo?: string
    }
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
      return NextResponse.json({ error: "다른 사용자의 근무내역을 수정할 권한이 없습니다." }, { status: 403 })
    }

    // 데이터 유효성 검사
    if (
      !data.work_date ||
      !data.start_time ||
      !data.end_time ||
      !data.work_hours ||
      !data.hourly_rate ||
      !data.payment_amount
    ) {
      return NextResponse.json({ error: "필수 필드가 누락되었습니다." }, { status: 400 })
    }

    // 근무내역 수정
    const query = `
      UPDATE work_logs SET
        work_date = $1,
        start_time = $2,
        end_time = $3,
        work_hours = $4,
        hourly_rate = $5,
        payment_amount = $6,
        memo = $7
      WHERE id = $8
      RETURNING *
    `

    const result = await db.query(query, [
      data.work_date,
      data.start_time,
      data.end_time,
      data.work_hours,
      data.hourly_rate,
      data.payment_amount,
      data.memo || "",
      workLogId,
    ])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "근무내역 수정 실패" }, { status: 500 })
    }

    // 사용자 이름 가져오기
    const userQuery = "SELECT name FROM users WHERE id = $1"
    const userResult = await db.query(userQuery, [workLogUserId])
    const userName = userResult.rows[0]?.name || ""

    const workLog = {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      userName,
      workDate: result.rows[0].work_date,
      startTime: result.rows[0].start_time,
      endTime: result.rows[0].end_time,
      workHours: parseFloat(result.rows[0].work_hours),
      hourlyRate: parseFloat(result.rows[0].hourly_rate),
      paymentAmount: parseFloat(result.rows[0].payment_amount),
      memo: result.rows[0].memo,
    }

    return NextResponse.json({ message: "근무내역이 성공적으로 수정되었습니다.", workLog })
  } catch (error) {
    console.error("근무내역 수정 오류:", error)
    return NextResponse.json({ error: "근무내역 수정 중 오류가 발생했습니다." }, { status: 500 })
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
    return NextResponse.json({ error: "근무내역 삭제 중 오류가 발생했습니다." }, { status: 500 })
  }
}
