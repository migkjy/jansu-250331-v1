import { date, numeric, pgTable, text, time, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

// 사용자(직원) 테이블
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 200 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 0 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// 근무내역 테이블
export const workLogs = pgTable("work_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  workDate: date("work_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  workHours: numeric("work_hours", { precision: 4, scale: 2 }).notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }).notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
