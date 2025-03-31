import "styles/tailwind.css"
import { Metadata } from "next"
import { Inter } from "next/font/google"

export const metadata: Metadata = {
  title: "장수도시락 급여관리",
  description: "장수도시락 직원 급여관리 시스템",
}

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={inter.className}>
      <body className="antialiased">
        <main>{children}</main>
      </body>
    </html>
  )
}
