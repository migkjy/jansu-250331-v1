import "styles/tailwind.css"
import { Inter } from "next/font/google"

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
