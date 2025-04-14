import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import fs from "fs"
import path from "path"

/**
 * 한글 폰트가 적용된 jsPDF 인스턴스를 생성합니다.
 */
export const createKoreanPdf = (options?: {
  orientation?: "portrait" | "landscape"
  unit?: "mm" | "pt" | "in" | "cm" | "px"
  format?: "a4" | "a3" | "letter" | [number, number]
}) => {
  const doc = new jsPDF({
    orientation: options?.orientation || "landscape",
    unit: options?.unit || "mm",
    format: options?.format || "a4",
  })

  try {
    // 나눔고딕 일반 폰트 로드
    const fontPath = path.join(process.cwd(), "public/fonts/nanum-gothic/NanumGothic.ttf")
    if (fs.existsSync(fontPath)) {
      const fontData = fs.readFileSync(fontPath)
      const fontBase64 = fontData.toString("base64")

      doc.addFileToVFS("NanumGothic.ttf", fontBase64)
      doc.addFont("NanumGothic.ttf", "NanumGothic", "normal")

      // 볼드 폰트도 추가로 로드
      const boldFontPath = path.join(process.cwd(), "public/fonts/nanum-gothic/NanumGothicBold.ttf")
      if (fs.existsSync(boldFontPath)) {
        const boldFontData = fs.readFileSync(boldFontPath)
        const boldFontBase64 = boldFontData.toString("base64")

        doc.addFileToVFS("NanumGothicBold.ttf", boldFontBase64)
        doc.addFont("NanumGothicBold.ttf", "NanumGothic", "bold")
      }

      // 기본 폰트 설정
      doc.setFont("NanumGothic", "normal")
      console.log("나눔고딕 폰트 로드 완료")
    } else {
      console.warn("나눔고딕 폰트 파일을 찾을 수 없습니다:", fontPath)

      // 다른 폰트 시도
      const alternativeFontPath = path.join(process.cwd(), "public/fonts/nanum-gothic/NanumGothicBold.ttf")
      if (fs.existsSync(alternativeFontPath)) {
        const fontData = fs.readFileSync(alternativeFontPath)
        const fontBase64 = fontData.toString("base64")

        doc.addFileToVFS("NanumGothicBold.ttf", fontBase64)
        doc.addFont("NanumGothicBold.ttf", "NanumGothic", "normal")
        doc.setFont("NanumGothic", "normal")

        console.log("나눔고딕 볼드 폰트 로드 완료")
      } else {
        console.error("사용 가능한 폰트를 찾을 수 없습니다.")
      }
    }
  } catch (error) {
    console.error("한글 폰트 로드 중 오류 발생:", error)
  }

  return doc
}

/**
 * 테이블에 한글 폰트를 적용합니다.
 */
export function applyKoreanFontToTable(
  doc: jsPDF,
  tableConfig: {
    head: string[][]
    body: string[][]
    startY: number
    styles?: Record<string, unknown>
    headStyles?: Record<string, unknown>
    tableWidth?: string | number
    margin?: Record<string, number>
    columnStyles?: Record<string, Record<string, unknown>>
  }
) {
  const enhancedOptions = {
    ...tableConfig,
    styles: {
      ...tableConfig.styles,
      font: "NanumGothic",
      fontStyle: "normal",
    },
    headStyles: {
      ...tableConfig.headStyles,
      font: "NanumGothic",
      fontStyle: "normal",
      halign: "center",
    },
    bodyStyles: {
      ...tableConfig.bodyStyles,
      font: "NanumGothic",
      fontStyle: "normal",
    },
  }

  return autoTable(doc, enhancedOptions)
}
