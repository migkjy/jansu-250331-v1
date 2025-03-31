import { Metadata } from "next"

export const metadata: Metadata = {
  title: "장수도시락 급여관리 - 인증",
  description: "장수도시락 급여관리 시스템의 인증 페이지입니다.",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">{children}</div>
}
