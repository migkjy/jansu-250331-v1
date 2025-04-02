"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  hourlyRate: number | null
  phoneNumber?: string
}

interface AdminUser {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

// API 응답 타입 정의
interface MeApiResponse {
  user: {
    id: string
    name: string
    email: string
    role: "admin" | "user"
  }
}

interface CreateUserResponse {
  user: User
  message: string
}

interface UpdateUserResponse {
  user: User
  message: string
}

interface DeleteUserResponse {
  message: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    hourlyRate: null as number | null,
    phoneNumber: "",
  })

  useEffect(() => {
    // 관리자 권한 확인 및 사용자 목록 가져오기
    const fetchData = async () => {
      try {
        // 현재 로그인한 관리자 정보 가져오기
        const adminResponse = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (!adminResponse.ok) {
          window.location.href = "/auth/login"
          return
        }

        const adminData = await adminResponse.json() as MeApiResponse

        if (adminData.user.role !== "admin") {
          window.location.href = "/"
          return
        }

        setAdminUser(adminData.user)

        // 사용자 목록 가져오기
        const usersResponse = await fetch("/api/users", {
          credentials: "include",
        })

        if (usersResponse.ok) {
          const usersData = await usersResponse.json() as User[]
          setUsers(usersData)
        } else {
          throw new Error("사용자 목록을 가져오는데 실패했습니다.")
        }
      } catch (err) {
        console.error("데이터 로드 오류:", err)
        setError(err instanceof Error ? err.message : "데이터를 가져오는데 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddUserClick = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "user",
      hourlyRate: null,
      phoneNumber: "",
    })
    setShowAddUserModal(true)
  }

  const handleEditUserClick = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // 수정 시 비밀번호는 필수가 아님
      role: user.role,
      hourlyRate: user.hourlyRate,
      phoneNumber: user.phoneNumber || "",
    })
    setShowEditUserModal(true)
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setShowDeleteConfirm(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "hourlyRate" ? (value ? parseInt(value, 10) : null) : value,
    }))
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      })

      const data = await response.json() as CreateUserResponse

      if (!response.ok) {
        throw new Error(data.message || "사용자 생성 중 오류가 발생했습니다.")
      }

      // 성공 시 목록에 추가
      setUsers((prev) => [...prev, data.user])
      setSuccess("사용자가 성공적으로 생성되었습니다.")
      setShowAddUserModal(false)
    } catch (err) {
      console.error("사용자 생성 오류:", err)
      setError(err instanceof Error ? err.message : "사용자 생성 중 오류가 발생했습니다.")
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!selectedUser) return

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        hourlyRate: formData.hourlyRate,
        phoneNumber: formData.phoneNumber,
      }

      // 비밀번호가 입력된 경우에만 포함
      if (formData.password) {
        Object.assign(updateData, { password: formData.password })
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
        credentials: "include",
      })

      const data = await response.json() as UpdateUserResponse

      if (!response.ok) {
        throw new Error(data.message || "사용자 업데이트 중 오류가 발생했습니다.")
      }

      // 성공 시 목록 업데이트
      setUsers((prev) => prev.map((user) => (user.id === selectedUser.id ? { ...user, ...data.user } : user)))
      setSuccess("사용자가 성공적으로 업데이트되었습니다.")
      setShowEditUserModal(false)
    } catch (err) {
      console.error("사용자 업데이트 오류:", err)
      setError(err instanceof Error ? err.message : "사용자 업데이트 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json() as DeleteUserResponse

      if (!response.ok) {
        throw new Error(data.message || "사용자 삭제 중 오류가 발생했습니다.")
      }

      // 성공 시 목록에서 제거
      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id))
      setSuccess("사용자가 성공적으로 삭제되었습니다.")
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error("사용자 삭제 오류:", err)
      setError(err instanceof Error ? err.message : "사용자 삭제 중 오류가 발생했습니다.")
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">직원 관리</h1>
          <p className="mt-1 text-gray-600">시스템의 사용자 계정을 관리합니다.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleAddUserClick}
            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="mr-1 h-4 w-4" />
            직원 추가
          </button>
          <Link href="/admin" className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                이름
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                이메일
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                핸드폰번호
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                권한
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                시급
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{user.phoneNumber || "-"}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {user.role === "admin" ? (
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                        관리자
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        일반 사용자
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {user.hourlyRate ? Math.floor(Number(user.hourlyRate)).toLocaleString() + "원" : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUserClick(user)}
                        className="rounded bg-gray-100 p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="rounded bg-gray-100 p-1 text-red-600 hover:bg-red-100 hover:text-red-900"
                        disabled={user.id === adminUser?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 사용자 추가 모달 */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">신규 직원 등록</h3>
                <div className="mt-4">
                  <form onSubmit={handleAddUser}>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">이름</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">이메일</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">비밀번호</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">권한</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="user">일반 사용자</option>
                        <option value="admin">관리자</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">시급 (원)</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate === null ? "" : formData.hourlyRate}
                        onChange={handleInputChange}
                        placeholder="선택 사항"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">핸드폰번호</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="선택 사항"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        등록
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 수정 모달 */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">직원 정보 수정</h3>
                <div className="mt-4">
                  <form onSubmit={handleUpdateUser}>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">이름</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">이메일</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        비밀번호 (변경 시에만 입력)
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">권한</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        disabled={selectedUser.id === adminUser?.id}
                      >
                        <option value="user">일반 사용자</option>
                        <option value="admin">관리자</option>
                      </select>
                      {selectedUser.id === adminUser?.id && (
                        <p className="mt-1 text-xs text-red-500">* 자신의 관리자 권한은 변경할 수 없습니다.</p>
                      )}
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">시급 (원)</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate === null ? "" : formData.hourlyRate}
                        onChange={handleInputChange}
                        placeholder="선택 사항"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">핸드폰번호</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="선택 사항"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowEditUserModal(false)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        수정
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">직원 삭제 확인</h3>
                <p className="mb-6 text-gray-600">
                  정말 <span className="font-bold">{selectedUser.name}</span> 직원을 삭제하시겠습니까? 이 작업은 취소할
                  수 없습니다.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
