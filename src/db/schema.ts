import { sql } from "drizzle-orm"
import { date, numeric, pgTable, text, time, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

// 사용자(직원) 테이블
export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 200 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().$type<"admin" | "user">(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  defaultBreakStartTime: time("default_break_start_time").default(sql`'12:00:00'`),
  defaultBreakEndTime: time("default_break_end_time").default(sql`'13:00:00'`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 근무내역 테이블
export const workLogs = pgTable("work_logs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  workDate: date("work_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  breakStartTime: time("break_start_time"),
  breakEndTime: time("break_end_time"),
  workHours: numeric("work_hours", { precision: 4, scale: 2 }).notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }).notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
