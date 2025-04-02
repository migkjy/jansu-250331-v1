import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AdminUsersPage from "../page"

// API 호출을 모킹합니다
global.fetch = jest.fn()

describe("AdminUsersPage 컴포넌트", () => {
  const mockUsers = [
    {
      id: "1",
      name: "관리자",
      email: "admin@test.com",
      role: "admin",
      hourlyRate: 10000,
      phoneNumber: "010-1234-5678",
    },
    {
      id: "2",
      name: "일반 직원",
      email: "user@test.com",
      role: "user",
      hourlyRate: null,
      phoneNumber: null,
    },
  ]

  const mockAdminUser = {
    id: "1",
    name: "관리자",
    email: "admin@test.com",
    role: "admin",
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // /api/auth/me 엔드포인트 모킹
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ user: mockAdminUser }),
    })

    // /api/users 엔드포인트 모킹 (사용자 목록 가져오기)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockUsers),
    })
  })

  test("컴포넌트가 정상적으로 렌더링되고 사용자 목록을 표시해야 함", async () => {
    render(<AdminUsersPage />)

    // 로딩 상태가 표시되는지 확인
    expect(screen.getByText("로딩 중...")).toBeInTheDocument()

    // 사용자 목록이 렌더링될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByText("직원 관리")).toBeInTheDocument()
    })

    // 테이블 행을 기준으로 사용자 정보 확인
    const rows = screen.getAllByRole("row")
    expect(rows.length).toBe(3) // 헤더 + 2명의 사용자

    // 테이블 셀을 가져와서 확인
    const cells = screen.getAllByRole("cell")

    // 이메일로 사용자 확인 (이메일은 고유하므로 안전함)
    expect(screen.getByText("admin@test.com")).toBeInTheDocument()
    expect(screen.getByText("user@test.com")).toBeInTheDocument()

    // 시급 및 핸드폰번호 확인
    expect(screen.getByText("10,000원")).toBeInTheDocument()
    expect(screen.getByText("010-1234-5678")).toBeInTheDocument()
    expect(screen.getAllByText("-")).toHaveLength(2) // 핸드폰 번호와 시급이 null인 항목

    // 사용자 권한 확인
    const adminBadge = screen.getByText("관리자", { selector: "span" })
    const userBadge = screen.getByText("일반 사용자", { selector: "span" })

    expect(adminBadge).toBeInTheDocument()
    expect(userBadge).toBeInTheDocument()
  })

  test("직원 추가 버튼 클릭 시 모달이 열려야 함", async () => {
    render(<AdminUsersPage />)

    // 목록이 로드될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByText("직원 관리")).toBeInTheDocument()
    })

    // 직원 추가 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: /직원 추가/i }))

    // 모달이 열렸는지 확인
    const modal = await screen.findByText("신규 직원 등록")
    expect(modal).toBeInTheDocument()

    // 모달 내부의 요소들을 확인 - within을 사용하여 모달 내부에서만 검색
    const modalElement = modal.closest("div.inline-block") || document.body
    const modalContainer = within(modalElement)

    expect(modalContainer.getByText(/이름/i, { selector: "label" })).toBeInTheDocument()
    expect(modalContainer.getByText(/이메일/i, { selector: "label" })).toBeInTheDocument()
    expect(modalContainer.getByText(/비밀번호/i, { selector: "label" })).toBeInTheDocument()

    // 등록 버튼 확인
    expect(modalContainer.getByRole("button", { name: "등록" })).toBeInTheDocument()
  })

  test("수정 버튼 클릭 시 모달이 열려서 해당 사용자 정보가 표시되어야 함", async () => {
    render(<AdminUsersPage />)

    // 목록이 로드될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByText("직원 관리")).toBeInTheDocument()
    })

    // 수정 버튼 찾기 및 클릭 (첫 번째 사용자)
    const editButtons = Array.from(screen.getAllByRole("button")).filter((button) =>
      button.querySelector("svg.lucide-pencil")
    )

    if (editButtons[0]) {
      fireEvent.click(editButtons[0])
    }

    // 모달이 열렸는지 확인
    const modal = await screen.findByText("직원 정보 수정")
    expect(modal).toBeInTheDocument()

    // 모달 내부의 요소들을 확인 - within을 사용하여 모달 내부에서만 검색
    const modalElement = modal.closest("div.inline-block") || document.body

    // form 요소가 없을 수 있으므로 직접 input 요소를 찾음
    const nameInput = modalElement.querySelector('input[name="name"]') as HTMLInputElement
    const emailInput = modalElement.querySelector('input[name="email"]') as HTMLInputElement

    expect(nameInput.value).toBe("관리자")
    expect(emailInput.value).toBe("admin@test.com")
  })

  test("새 직원 추가 폼 제출 시 API 호출이 발생해야 함", async () => {
    // 사용자 생성 API 모킹
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockAdminUser }),
        })
      } else if (url === "/api/users") {
        if (
          (global.fetch as jest.Mock).mock.calls.find((call) => call[0] === "/api/users" && call[1]?.method === "POST")
        ) {
          // POST 요청 모킹
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                message: "사용자가 성공적으로 생성되었습니다.",
                user: {
                  id: "3",
                  name: "새직원",
                  email: "new@test.com",
                  role: "user",
                  hourlyRate: null,
                },
              }),
          })
        } else {
          // GET 요청 모킹
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUsers),
          })
        }
      }
      return Promise.reject(new Error("API 호출이 모킹되지 않았습니다"))
    })

    render(<AdminUsersPage />)

    // 목록이 로드될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByText("직원 관리")).toBeInTheDocument()
    })

    // 직원 추가 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: /직원 추가/i }))

    // 모달이 열렸는지 확인
    const modal = await screen.findByText("신규 직원 등록")
    const modalElement = modal.closest("div.inline-block") || document.body

    // 폼 입력 - querySelector를 사용하여 요소 찾기
    const nameInput = modalElement.querySelector('input[name="name"]') as HTMLInputElement
    const emailInput = modalElement.querySelector('input[name="email"]') as HTMLInputElement
    const passwordInput = modalElement.querySelector('input[name="password"]') as HTMLInputElement

    fireEvent.change(nameInput, { target: { value: "새직원" } })
    fireEvent.change(emailInput, { target: { value: "new@test.com" } })
    fireEvent.change(passwordInput, { target: { value: "password123" } })

    // 폼 제출
    const registerButton = within(modalElement).getByRole("button", { name: "등록" })
    fireEvent.click(registerButton)

    // API 호출이 발생했는지 확인
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "새직원",
          email: "new@test.com",
          password: "password123",
          role: "user",
          hourlyRate: null,
          phoneNumber: "",
        }),
        credentials: "include",
      })
    })

    // 성공 메시지가 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText("사용자가 성공적으로 생성되었습니다.")).toBeInTheDocument()
    })
  })

  test("삭제 확인 모달이 열리고 삭제 기능이 작동해야 함", async () => {
    // 삭제 API 모킹
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockAdminUser }),
        })
      } else if (url === "/api/users") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        })
      } else if (url.includes("/api/users/") && url.includes("2")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "사용자가 성공적으로 삭제되었습니다." }),
        })
      }
      return Promise.reject(new Error("API 호출이 모킹되지 않았습니다"))
    })

    render(<AdminUsersPage />)

    // 목록이 로드될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByText("직원 관리")).toBeInTheDocument()
    })

    // 두 번째 사용자(일반 직원)의 삭제 버튼 클릭
    const rows = screen.getAllByRole("row")
    const secondRow = rows[2] // 첫 번째는 헤더, 두 번째는 관리자, 세 번째가 일반 직원

    // secondRow 내에서 button 요소들을 찾고 svg.lucide-trash2를 포함한 버튼을 찾습니다
    const buttons = within(secondRow).getAllByRole("button")
    const deleteButton = Array.from(buttons).find((button) => button.querySelector("svg.lucide-trash2"))

    if (deleteButton) {
      fireEvent.click(deleteButton)
    }

    // 삭제 확인 모달이 열렸는지 확인
    const confirmModal = await screen.findByText("직원 삭제 확인")
    expect(confirmModal).toBeInTheDocument()

    // 삭제 모달의 텍스트 확인
    const modalElement = confirmModal.closest("div.inline-block") || document.body
    const modalText = modalElement.textContent || ""

    expect(modalText).toContain("정말")
    expect(modalText).toContain("일반 직원")
    expect(modalText).toContain("삭제하시겠습니까")

    // 삭제 버튼 클릭
    const deleteConfirmButton = within(modalElement).getByRole("button", { name: "삭제" })
    fireEvent.click(deleteConfirmButton)

    // API 호출이 발생했는지 확인
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/users/2", {
        method: "DELETE",
        credentials: "include",
      })
    })

    // 성공 메시지가 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText("사용자가 성공적으로 삭제되었습니다.")).toBeInTheDocument()
    })
  })

  test("관리자 본인은 삭제할 수 없어야 함", async () => {
    render(<AdminUsersPage />)

    // 목록이 로드될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByText("직원 관리")).toBeInTheDocument()
    })

    // 첫 번째 사용자(관리자 본인)의 삭제 버튼 찾기
    const rows = screen.getAllByRole("row")
    const firstRow = rows[1] // 첫 번째는 헤더, 두 번째가 관리자

    // 관리자 행에서 삭제 버튼 찾기
    const buttons = within(firstRow).getAllByRole("button")
    const deleteButton = Array.from(buttons).find((button) => button.querySelector("svg.lucide-trash2"))

    // 버튼이 비활성화되어 있는지 확인
    if (deleteButton) {
      expect(deleteButton).toBeDisabled()
    }
  })
})
