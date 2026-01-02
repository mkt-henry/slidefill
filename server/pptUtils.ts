/**
 * PPT 파일 처리 유틸리티
 */

import { spawn } from "child_process";
import * as path from "path";

/**
 * PPT 파일의 슬라이드 수를 계산합니다.
 * 
 * @param filePath - PPT 파일 경로
 * @returns 슬라이드 수
 */
export async function getSlideCount(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const venvPython = path.join(process.cwd(), "venv", "bin", "python");
    const scriptPath = path.join(process.cwd(), "scripts", "get_slide_count.py");
    
    const pythonProcess = spawn(venvPython, [scriptPath, filePath]);
    
    let stdout = "";
    let stderr = "";
    
    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const count = parseInt(stdout.trim(), 10);
          if (isNaN(count)) {
            reject(new Error("Invalid slide count returned"));
          } else {
            resolve(count);
          }
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`Python script failed: ${stderr}`));
      }
    });
    
    pythonProcess.on("error", (err) => {
      reject(err);
    });
  });
}
