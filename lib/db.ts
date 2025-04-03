import { Pool } from "pg"

// 환경 변수로부터 DB 연결 정보 가져오기
const connectionString = process.env.DATABASE_URL

// DB 연결 풀 생성
let pool: Pool | null = null

export function createClient() {
  if (!pool) {
    if (!connectionString) {
      throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다.")
    }

    console.log("PostgreSQL에 연결 시도 중...")

    try {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 20, // 최대 연결 수
        idleTimeoutMillis: 30000, // 미사용 연결이 풀에서 제거되기 전 시간(ms)
      })

      // 연결 성공 여부 확인
      pool.on("connect", async (client) => {
        console.log("PostgreSQL에 성공적으로 연결되었습니다.")

        // 모든 새 연결에 대해 타임존을 'Asia/Seoul'로 설정
        try {
          await client.query("SET timezone = 'Asia/Seoul';")
          console.log("PostgreSQL 세션 타임존을 Asia/Seoul로 설정했습니다.")
        } catch (error) {
          console.error("타임존 설정 오류:", error)
        }
      })

      // 연결 오류 리스너
      pool.on("error", (err) => {
        console.error("PostgreSQL 연결 오류:", err)
      })

      // 모든 쿼리 실행 후 로깅 (개발 환경에서만 활성화)
      if (process.env.NODE_ENV !== "production") {
        const originalQuery = pool.query.bind(pool)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pool.query = (...args: any[]) => {
          const queryText = typeof args[0] === "string" ? args[0] : args[0]?.text
          console.log("DB 쿼리 실행:", queryText)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return originalQuery(...(args as [any, ...any[]])).catch((error: Error) => {
            console.error("DB 쿼리 오류:", error.message, "\n쿼리:", queryText)
            throw error
          })
        }
      }
    } catch (error) {
      console.error("PostgreSQL 풀 생성 오류:", error)
      throw error
    }
  }

  return pool
}

// 애플리케이션 종료 시 풀 정리
process.on("SIGTERM", () => {
  console.log("DB 연결 풀 종료 중...")
  if (pool) {
    pool.end().catch((err) => {
      console.error("DB 연결 풀 종료 오류:", err)
    })
  }
})
