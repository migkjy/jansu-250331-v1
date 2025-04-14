// jsPDF에 사용할 한글 폰트를 사전 로드하는 모듈
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

/**
 * 폰트 초기화 함수
 * jsPDF에 한글 폰트를 추가합니다.
 */
export const initFonts = () => {
  try {
    // NanumGothic 폰트 경로
    const fontPath = path.join(process.cwd(), 'public/fonts/NanumGothic.ttf');
    
    // 파일 존재 확인
    if (!fs.existsSync(fontPath)) {
      console.error('폰트 파일을 찾을 수 없습니다:', fontPath);
      return false;
    }
    
    // 폰트 파일 읽기 및 Base64 인코딩
    const fontBytes = fs.readFileSync(fontPath);
    const fontBase64 = fontBytes.toString('base64');
    
    // jsPDF 프로토타입에 폰트 추가
    const pdfPrototype = jsPDF.prototype;
    
    // VFS에 폰트 추가 (jsPDF 내부 파일 시스템)
    pdfPrototype.addFileToVFS('NanumGothic.ttf', fontBase64);
    
    // 글꼴 추가
    pdfPrototype.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
    
    console.log('한글 폰트가 jsPDF에 성공적으로 로드되었습니다.');
    return true;
  } catch (err) {
    console.error('폰트 초기화 오류:', err);
    return false;
  }
};

// 다른 방식: 미리 정의된 폰트 데이터 사용
export const usePrebuiltFont = (doc) => {
  try {
    // jsPDF에 폰트 추가
    doc.addFont('NanumGothic', 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    return true;
  } catch (err) {
    console.error('기본 폰트 설정 오류:', err);
    return false;
  }
}; 