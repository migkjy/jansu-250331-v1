"use client"

import { ArrowLeft, User } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: string
  hourlyRate?: number
}

interface AuthResponse {
  user: User
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (!response.ok) {
          window.location.href = "/auth/login"
          return
        }

        const data = (await response.json()) as AuthResponse
        setUser(data.user)
        setFormValues({
          ...formValues,
          name: data.user.name,
          email: data.user.email,
        })
      } catch (err) {
        console.error("사용자 정보 로드 오류:", err)
        setError(err instanceof Error ? err.message : "사용자 정보를 가져오는데 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formValues.newPassword && formValues.newPassword !== formValues.confirmPassword) {
      setError("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.")
      return
    }

    try {
      // 실제로는 API 호출을 통해 프로필 정보 업데이트
      alert("프로필 정보가 업데이트되었습니다. (실제로는 API 호출이 이루어질 예정입니다)")
    } catch (err) {
      console.error("프로필 업데이트 오류:", err)
      setError(err instanceof Error ? err.message : "프로필 정보 업데이트 중 오류가 발생했습니다.")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center">
            <Link href="/" className="mr-4 flex items-center text-gray-500 hover:text-gray-700">
              <ArrowLeft className="mr-1 h-5 w-5" />
              홈으로
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">내 프로필</h1>
          </div>
          <p className="mt-2 text-gray-600">개인정보와 비밀번호를 관리할 수 있습니다.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
              <User className="h-8 w-8 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-gray-500">{user?.email}</p>
              <p className="mt-1 text-sm text-gray-500">
                계정 타입: {user?.role === "admin" ? "관리자" : "일반 사용자"}
              </p>
              {user?.hourlyRate && (
                <p className="mt-1 text-sm text-gray-500">시급: {user.hourlyRate.toLocaleString()}원</p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium">계정 정보 수정</h3>
            <form onSubmit={handleProfileUpdate} className="mt-4 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium">비밀번호 변경</h3>
                <p className="mt-1 text-sm text-gray-500">
                  비밀번호를 변경하려면 현재 비밀번호를 입력하고 새 비밀번호를 설정하세요.
                </p>
              </div>

              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formValues.currentPassword}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formValues.newPassword}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">비밀번호는 8자 이상이어야 합니다.</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formValues.confirmPassword}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href="/"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </Link>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
