import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "장수도시락 급여관리",
  description: "장수도시락 직원 급여관리 시스템",
}

export default function HomePage() {
  redirect("/auth/login")
}
