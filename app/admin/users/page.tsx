"use client"

import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import AdminLayout from "../components/AdminLayout"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  hourlyRate: number | null
  phoneNumber?: string
  defaultBreakStartTime?: string
  defaultBreakEndTime?: string
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
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [nameSearch, setNameSearch] = useState<string>("")
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
    includeDefaultBreak: false,
    defaultBreakStartTime: "12:00",
    defaultBreakEndTime: "13:00",
  })

  const handleNameSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setNameSearch(searchTerm)

    if (searchTerm.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredUsers(filtered)
    }
  }

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

        const adminData = (await adminResponse.json()) as MeApiResponse

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
          const usersData = (await usersResponse.json()) as User[]
          setUsers(usersData)
          setFilteredUsers(usersData)
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
      includeDefaultBreak: false,
      defaultBreakStartTime: "12:00",
      defaultBreakEndTime: "13:00",
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
      includeDefaultBreak: !!(user.defaultBreakStartTime && user.defaultBreakEndTime),
      defaultBreakStartTime: user.defaultBreakStartTime || "12:00",
      defaultBreakEndTime: user.defaultBreakEndTime || "13:00",
    })
    setShowEditUserModal(true)
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setShowDeleteConfirm(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const isCheckbox = type === "checkbox"

    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox
        ? (e.target as HTMLInputElement).checked
        : name === "hourlyRate"
        ? value
          ? parseInt(value, 10)
          : null
        : value,
    }))
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      // 체크박스 상태에 따라 휴게시간 값 조정
      const dataToSend = {
        ...formData,
        defaultBreakStartTime: formData.includeDefaultBreak ? formData.defaultBreakStartTime : null,
        defaultBreakEndTime: formData.includeDefaultBreak ? formData.defaultBreakEndTime : null,
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
        credentials: "include",
      })

      const data = (await response.json()) as CreateUserResponse

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

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      // 현재 편집 중인 사용자의 ID 가져오기
      const userId = selectedUser?.id

      if (!userId) {
        throw new Error("사용자 ID가 없습니다.")
      }

      // includeDefaultBreak가 false인 경우 휴게 시간을 null로 설정
      const defaultBreakStartTime = formData.includeDefaultBreak ? formData.defaultBreakStartTime : null
      const defaultBreakEndTime = formData.includeDefaultBreak ? formData.defaultBreakEndTime : null

      console.log("User update form data:", {
        ...formData,
        defaultBreakStartTime,
        defaultBreakEndTime,
      })

      const updatedData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        hourlyRate: formData.hourlyRate,
        phoneNumber: formData.phoneNumber,
        defaultBreakStartTime,
        defaultBreakEndTime,
      }

      // 사용자 업데이트 요청
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 쿠키를 포함시킴
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("User update error:", response.status, errorData)
        throw new Error(`사용자 업데이트 중 오류가 발생했습니다. (${response.status})`)
      }

      const data = await response.json()

      // 성공 시 목록 업데이트
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...data.user } : user)))
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

      const data = (await response.json()) as DeleteUserResponse

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

  // Add a new action button component for the AdminLayout
  const actionButtons = (
    <button
      onClick={handleAddUserClick}
      className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
    >
      <Plus className="mr-2 h-4 w-4" />
      직원 추가
    </button>
  )

  if (loading && !adminUser) {
    return (
      <AdminLayout title="직원 관리" isLoading={true}>
        {/* AdminLayout handles loading state */}
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="직원 관리" error={error} success={success} actions={actionButtons}>
      <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full md:w-72">
            <label htmlFor="nameSearch" className="block text-sm font-medium text-gray-700">
              이름 검색
            </label>
            <input
              type="text"
              id="nameSearch"
              value={nameSearch}
              onChange={handleNameSearch}
              placeholder="직원 이름 검색"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
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
                역할
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
                기본 휴게 시간
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase"
              >
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{user.phoneNumber || "-"}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {user.role === "admin" ? (
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs leading-5 font-semibold text-purple-800">
                        관리자
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs leading-5 font-semibold text-blue-800">
                        일반 사용자
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {user.hourlyRate ? Math.floor(Number(user.hourlyRate)).toLocaleString() + "원" : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {user.defaultBreakStartTime && user.defaultBreakEndTime
                      ? `${user.defaultBreakStartTime.substring(0, 5)} ~ ${user.defaultBreakEndTime.substring(0, 5)}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium whitespace-nowrap">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEditUserClick(user)}
                        className="rounded bg-gray-100 p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        title="수정"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* 관리자 본인은 삭제 불가 */}
                      {user.id !== adminUser?.id && (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="rounded bg-gray-100 p-1 text-red-600 hover:bg-red-100 hover:text-red-900"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
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
                    <div className="mb-4">
                      <div className="mb-2 flex items-center">
                        <input
                          type="checkbox"
                          id="includeDefaultBreak"
                          name="includeDefaultBreak"
                          checked={formData.includeDefaultBreak}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="includeDefaultBreak" className="ml-2 block text-sm font-medium text-gray-700">
                          기본 휴게 시간 설정
                        </label>
                      </div>

                      {formData.includeDefaultBreak && (
                        <>
                          <div className="flex items-center space-x-2">
                            <input
                              type="time"
                              name="defaultBreakStartTime"
                              value={formData.defaultBreakStartTime}
                              onChange={handleInputChange}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                            <span className="text-gray-500">~</span>
                            <input
                              type="time"
                              name="defaultBreakEndTime"
                              value={formData.defaultBreakEndTime}
                              onChange={handleInputChange}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            *직원의 기본 휴게 시간입니다. 근무내역 추가 시 자동 적용됩니다.
                          </p>
                        </>
                      )}
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
                    <div className="mb-4">
                      <div className="mb-2 flex items-center">
                        <input
                          type="checkbox"
                          id="includeDefaultBreakEdit"
                          name="includeDefaultBreak"
                          checked={formData.includeDefaultBreak}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="includeDefaultBreakEdit"
                          className="ml-2 block text-sm font-medium text-gray-700"
                        >
                          기본 휴게 시간 설정
                        </label>
                      </div>

                      {formData.includeDefaultBreak && (
                        <>
                          <div className="flex items-center space-x-2">
                            <input
                              type="time"
                              name="defaultBreakStartTime"
                              value={formData.defaultBreakStartTime}
                              onChange={handleInputChange}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                            <span className="text-gray-500">~</span>
                            <input
                              type="time"
                              name="defaultBreakEndTime"
                              value={formData.defaultBreakEndTime}
                              onChange={handleInputChange}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            *직원의 기본 휴게 시간입니다. 근무내역 추가 시 자동 적용됩니다.
                          </p>
                        </>
                      )}
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
    </AdminLayout>
  )
}
