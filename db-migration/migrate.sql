-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
  phone_number VARCHAR(20),
  hourly_rate NUMERIC(10,2) NOT NULL,
  default_break_start_time TIME DEFAULT '12:00:00',
  default_break_end_time TIME DEFAULT '13:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create work_logs table
CREATE TABLE IF NOT EXISTS work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start_time TIME,
  break_end_time TIME,
  work_hours NUMERIC(4,2) NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL,
  payment_amount NUMERIC(10,2) NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, work_date);

-- 4. Insert default admin user if not exists
INSERT INTO users (name, email, password_hash, role, hourly_rate)
SELECT 
  '관리자', 
  'admin@example.com', 
  '$2b$10$UwLPbmLiMmxpbWMEkTD1E.xt7MWtzPu/Td26hXFYPpz9EUgKVOY9y', -- Password is 'admin123'
  'admin', 
  10000.00
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@example.com'
); 