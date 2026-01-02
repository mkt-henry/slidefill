/**
 * S3에 파일을 업로드하는 유틸리티 함수
 */

import { storagePut } from "../../../server/storage";

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * 파일을 서버를 통해 S3에 업로드합니다.
 * 
 * @param file - 업로드할 파일
 * @param folder - S3 버킷 내 폴더 경로
 * @returns 업로드된 파일의 키와 URL
 */
export async function uploadFileToServer(
  file: File,
  folder: string = "uploads"
): Promise<UploadResult> {
  // FormData 생성
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  // 서버의 업로드 엔드포인트로 전송
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "파일 업로드에 실패했습니다.");
  }

  const result = await response.json();
  return result;
}

/**
 * PPT 파일에서 슬라이드 수를 추출합니다.
 * (실제로는 서버에서 python-pptx로 처리해야 하지만, 임시로 파일 크기 기반 추정)
 * 
 * @param file - PPT 파일
 * @returns 예상 슬라이드 수
 */
export function estimateSlideCount(file: File): number {
  // 임시: 파일 크기 기반 추정 (실제로는 서버에서 처리 필요)
  const sizeInMB = file.size / (1024 * 1024);
  
  // 대략적인 추정: 1MB당 약 5장의 슬라이드
  const estimated = Math.max(1, Math.round(sizeInMB * 5));
  
  return Math.min(estimated, 100); // 최대 100장으로 제한
}
