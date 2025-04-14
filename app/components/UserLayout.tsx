import { Calendar, FileText, Home } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

interface UserLayoutProps {
  children?: React.ReactNode
  title: string
  error?: string
  warning?: string
  success?: string
  isLoading?: boolean
  actions?: React.ReactNode
}

export default function UserLayout({
  children,
  title,
  error,
  warning,
  success,
  isLoading = false,
  actions,
}: UserLayoutProps) {
  const pathname = usePathname()

  const navItems = [
    { path: "/work-logs", label: "근무내역", icon: <Calendar className="mr-2 h-5 w-5" /> },
    { path: "/salary-slip", label: "급여 명세서", icon: <FileText className="mr-2 h-5 w-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <div className="flex space-x-2">
              <Link
                href="/"
                className="flex items-center rounded-md bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                <Home className="mr-1 h-5 w-5" />
                홈으로
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap ${
                  pathname === item.path
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:border-b-2 hover:border-gray-300"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {warning && (
          <div className="mb-4 rounded-md bg-amber-50 p-4">
            <div className="text-sm text-amber-700">{warning}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {/* Action buttons */}
        {actions && <div className="mb-6 flex items-center justify-end space-x-3">{actions}</div>}

        {/* Loading state or content */}
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-lg text-gray-600">로딩 중...</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
