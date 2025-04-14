"use client"

import { useState } from "react"
import { Button } from "@/components/Button/Button"

export default function PrintTestPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGeneratePDF = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/pdf-test", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || "PDF 생성 실패")
      }

      const blob = await response.blob()
      // PDF 다운로드
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `한글테스트_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setSuccess(true)
    } catch (err) {
      console.error("PDF 생성 오류:", err)
      setError(err instanceof Error ? err.message : "PDF 생성 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="p-6">
          <h2 className="mb-2 text-xl font-bold">한글 PDF 출력 테스트</h2>
          <p className="mb-4 text-gray-600">이 페이지는 PDF에 한글이 제대로 출력되는지 테스트하기 위한 페이지입니다.</p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGeneratePDF}
                disabled={loading}
                className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "생성 중..." : "한글 테스트 PDF 생성"}
              </button>
            </div>

            {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}

            {success && (
              <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-600">
                PDF가 성공적으로 생성되었습니다. 다운로드가 시작되었습니다.
              </div>
            )}

            <div className="mt-4">
              <h3 className="mb-2 font-semibold">테스트 내용:</h3>
              <p>PDF에는 다음과 같은 한글 텍스트가 포함됩니다:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>장수도시락 급여명세서</li>
                <li>직원 정보: 홍길동</li>
                <li>급여 요약</li>
                <li>총 근무일수: 20일</li>
                <li>총 근무시간: 160시간</li>
                <li>시급: 9,000원</li>
                <li>총 급여: 1,440,000원</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
