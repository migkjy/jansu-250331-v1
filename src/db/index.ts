import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { env } from "@/env.mjs"
import * as schema from "./schema"

const sql = neon(env.DATABASE_URL)
export const db = drizzle(sql, { schema })

// 타입 익스포트
export type UsersTable = typeof schema.users.$inferSelect
export type NewUser = typeof schema.users.$inferInsert

export type WorkLogsTable = typeof schema.workLogs.$inferSelect
export type NewWorkLog = typeof schema.workLogs.$inferInsert
