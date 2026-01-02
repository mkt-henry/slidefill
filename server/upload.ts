/**
 * 파일 업로드 처리를 위한 Express 라우터
 */

import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const router = Router();

// Multer 설정 (메모리 스토리지 사용)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
  },
});

/**
 * POST /api/upload
 * 파일을 S3에 업로드합니다.
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "파일이 업로드되지 않았습니다." });
    }

    const folder = req.body.folder || "uploads";
    const file = req.file;
    
    // 파일 확장자 추출
    const ext = file.originalname.split(".").pop() || "";
    
    // 고유한 파일 키 생성
    const fileKey = `${folder}/${nanoid()}.${ext}`;
    
    // S3에 업로드
    const result = await storagePut(fileKey, file.buffer, file.mimetype);
    
    res.json({
      key: result.key,
      url: result.url,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.",
    });
  }
});

export default router;
