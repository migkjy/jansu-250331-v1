import { NextRequest, NextResponse } from "next/server"
import { applyKoreanFontToTable, createKoreanPdf } from "@/lib/pdf"

/**
 * 한글 폰트를 사용한 PDF 생성 테스트
 */
export async function GET(request: NextRequest) {
  try {
    // 한글 폰트가 적용된 PDF 문서 생성
    const doc = createKoreanPdf()

    // 한글 텍스트
    const koreanTexts = {
      title: "장수도시락 급여명세서",
      employeeInfo: "직원 정보",
      name: "이름: 홍길동",
      email: "이메일: hong@example.com",
      hourlyRate: "시급: 9,000원",
      salaryDetails: "급여 요약",
      workDaysLabel: "총 근무일수:",
      workDays: "20일",
      workHoursLabel: "총 근무시간:",
      workHours: "160.0시간",
      totalAmountLabel: "총 급여:",
      totalAmount: "1,440,000원",
      periodLabel: "기간:",
      period: "2023-04-01 ~ 2023-04-30",
    }

    // 타이틀 작성
    doc.setFontSize(24)
    doc.text(koreanTexts.title, doc.internal.pageSize.getWidth() / 2, 20, { align: "center" })

    // 페이지 너비 계산 (mm 단위)
    const pageWidth = doc.internal.pageSize.getWidth()
    const middleX = pageWidth / 2

    // 첫 번째 열: 직원 정보
    doc.setFontSize(14)
    doc.text(koreanTexts.employeeInfo, 15, 40)
    doc.setFontSize(12)
    doc.text(koreanTexts.name, 20, 50)
    doc.text(koreanTexts.email, 20, 60)
    doc.text(koreanTexts.hourlyRate, 20, 70)
    doc.text(koreanTexts.periodLabel + " " + koreanTexts.period, 20, 80)

    // 두 번째 열: 급여 요약
    doc.setFontSize(14)
    doc.text(koreanTexts.salaryDetails, middleX + 15, 40)
    doc.setFontSize(12)
    doc.text(koreanTexts.workDaysLabel + " " + koreanTexts.workDays, middleX + 20, 50)
    doc.text(koreanTexts.workHoursLabel + " " + koreanTexts.workHours, middleX + 20, 60)
    doc.text(koreanTexts.totalAmountLabel + " " + koreanTexts.totalAmount, middleX + 20, 70)

    // 테이블 헤더와 데이터
    const tableColumn = ["날짜", "출근 시간", "휴게 시간", "퇴근 시간", "근무 시간", "시급", "일급"]
    const tableRows = [
      ["2023-04-01", "09:00", "1.0시간", "18:00", "8.0시간", "9,000원", "72,000원"],
      ["2023-04-02", "09:00", "1.0시간", "18:00", "8.0시간", "9,000원", "72,000원"],
      ["2023-04-03", "09:00", "1.0시간", "18:00", "8.0시간", "9,000원", "72,000원"],
      ["2023-04-04", "09:00", "1.0시간", "18:00", "8.0시간", "9,000원", "72,000원"],
      ["2023-04-05", "09:00", "1.0시간", "18:00", "8.0시간", "9,000원", "72,000원"],
    ]

    // 테이블 생성 (한글 폰트 적용)
    applyKoreanFontToTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 90,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [200, 200, 200],
        halign: "center",
        valign: "middle",
      },
      tableWidth: "auto",
      margin: { left: 10, right: 10 },
      columnStyles: {
        0: { cellWidth: "auto", halign: "right" }, // 날짜 (오른쪽 정렬)
        1: { cellWidth: "auto", halign: "right" }, // 출근 시간 (오른쪽 정렬)
        2: { cellWidth: "auto", halign: "right" }, // 휴게 시간 (오른쪽 정렬)
        3: { cellWidth: "auto", halign: "right" }, // 퇴근 시간 (오른쪽 정렬)
        4: { cellWidth: "auto", halign: "right" }, // 근무 시간 (오른쪽 정렬)
        5: { cellWidth: "auto", halign: "right" }, // 시급 (오른쪽 정렬)
        6: { cellWidth: "auto", halign: "right" }, // 일급 (오른쪽 정렬)
      },
    })

    // 푸터 추가
    const pageCount = doc.internal.getNumberOfPages()
    doc.setFontSize(10)
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.text(
        `페이지 ${i} / ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      )
    }

    // PDF 파일 다운로드
    const pdfBytes = doc.output("arraybuffer")

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=salary_slip_test.pdf",
      },
    })
  } catch (error) {
    console.error("PDF 생성 오류:", error)
    return NextResponse.json({ error: "급여 명세서 PDF 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}
