// Base64 encoded Noto Sans KR font (subset for Korean characters)
// This is a placeholder. In a real implementation, you would include the actual font file
// encoded as base64. This placeholder allows us to test the PDF generation.
export const NotoSansKR = "BASE64_ENCODED_FONT_CONTENT"

import fs from "fs"
import path from "path"

// If you need the full font, download it from Google Fonts and convert it:
// 1. Download from https://fonts.google.com/specimen/Noto+Sans+KR
// 2. Convert to base64 and place the string here

// 노토 산스 한글 폰트를 사용하기 위한 모듈
export const loadFont = async () => {
  try {
    return {
      fontName: "NanumGothic",
      fontUrl: "/fonts/NanumGothic.ttf",
    }
  } catch (error) {
    console.error("한글 폰트 로드 오류:", error)
    throw error
  }
}

// 폰트 파일을 Base64로 인코딩해서 반환하는 함수
export const getNanumGothicBase64 = () => {
  try {
    const fontPath = path.join(process.cwd(), "public/fonts/NanumGothic.ttf")
    const fontBuffer = fs.readFileSync(fontPath)
    return fontBuffer.toString("base64")
  } catch (error) {
    console.error("폰트 파일 읽기 오류:", error)
    return null
  }
}

// 한글 테스트 문자열
export const getKoreanText = () => ({
  title: "장수도시락 급여명세서",
  employeeInfo: "직원 정보",
  name: "홍길동",
  hourlyRate: "시급: 9,000원",
  summary: "급여 요약",
  totalWorkDays: "총 근무일수: 20일",
  totalWorkHours: "총 근무시간: 160시간",
  totalPayment: "총 급여: 1,440,000원",
  workDate: "근무일자",
  startTime: "출근 시간",
  endTime: "퇴근 시간",
  workHours: "근무시간",
  rate: "시급",
  dailyPayment: "일급",
  memo: "메모",
  footer: "장수도시락 한글 테스트",
})
