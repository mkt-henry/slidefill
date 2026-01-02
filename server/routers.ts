import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 템플릿 관리 라우터
  template: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getTemplatesByUserId } = await import("./db");
      return getTemplatesByUserId(ctx.user.id);
    }),
    
    getSlideCount: protectedProcedure
      .input((raw: unknown) => {
        if (typeof raw === "object" && raw !== null && "fileKey" in raw && typeof raw.fileKey === "string") {
          return { fileKey: raw.fileKey };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { storageGet } = await import("./storage");
        const { getSlideCount } = await import("./pptUtils");
        const axios = (await import("axios")).default;
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        
        try {
          // S3에서 파일 다운로드
          const fileUrl = await storageGet(input.fileKey);
          const response = await axios.get(fileUrl.url, { responseType: "arraybuffer" });
          
          // 임시 파일로 저장
          const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "slidefill-"));
          const tmpFile = path.join(tmpDir, "temp.pptx");
          fs.writeFileSync(tmpFile, Buffer.from(response.data));
          
          // 슬라이드 수 계산
          const slideCount = await getSlideCount(tmpFile);
          
          // 임시 파일 삭제
          fs.rmSync(tmpDir, { recursive: true, force: true });
          
          return { slideCount };
        } catch (error) {
          throw new Error("슬라이드 수를 계산할 수 없습니다: " + (error instanceof Error ? error.message : String(error)));
        }
      }),
    
    get: protectedProcedure
      .input((raw: unknown) => {
        if (typeof raw === "object" && raw !== null && "id" in raw && typeof raw.id === "number") {
          return { id: raw.id };
        }
        throw new Error("Invalid input: expected { id: number }");
      })
      .query(async ({ input, ctx }) => {
        const { getTemplateById } = await import("./db");
        const template = await getTemplateById(input.id);
        
        if (!template) {
          throw new Error("템플릿을 찾을 수 없습니다.");
        }
        
        if (template.userId !== ctx.user.id) {
          throw new Error("접근 권한이 없습니다.");
        }
        
        return template;
      }),
    
    create: protectedProcedure
      .input((raw: unknown) => {
        if (
          typeof raw === "object" &&
          raw !== null &&
          "name" in raw &&
          "fileKey" in raw &&
          "fileUrl" in raw &&
          "slideCount" in raw &&
          typeof raw.name === "string" &&
          typeof raw.fileKey === "string" &&
          typeof raw.fileUrl === "string" &&
          typeof raw.slideCount === "number"
        ) {
          return {
            name: raw.name,
            fileKey: raw.fileKey,
            fileUrl: raw.fileUrl,
            slideCount: raw.slideCount,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input, ctx }) => {
        const { getSubscriptionByUserId, countTemplatesByUserId, createTemplate } = await import("./db");
        
        // 구독 정보 확인
        let subscription = await getSubscriptionByUserId(ctx.user.id);
        
        // 구독 정보가 없으면 무료 플랜 생성
        if (!subscription) {
          const { createSubscription } = await import("./db");
          await createSubscription({ userId: ctx.user.id, tier: "free" });
          subscription = await getSubscriptionByUserId(ctx.user.id);
        }
        
        // 무료 사용자 제한 검증 (1개)
        if (subscription && subscription.tier === "free") {
          const templateCount = await countTemplatesByUserId(ctx.user.id);
          if (templateCount >= 1) {
            throw new Error("무료 플랜은 템플릿을 1개까지만 등록할 수 있습니다. 유료 플랜으로 업그레이드해주세요.");
          }
          
          // 슬라이드 수 제한 검증 (5장)
          if (input.slideCount > 5) {
            throw new Error("무료 플랜은 슬라이드가 5장 이하인 템플릿만 등록할 수 있습니다.");
          }
        }
        
        await createTemplate({
          userId: ctx.user.id,
          name: input.name,
          fileKey: input.fileKey,
          fileUrl: input.fileUrl,
          slideCount: input.slideCount,
        });
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input((raw: unknown) => {
        if (typeof raw === "object" && raw !== null && "id" in raw && typeof raw.id === "number") {
          return { id: raw.id };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input, ctx }) => {
        const { getTemplateById, deleteTemplate } = await import("./db");
        
        const template = await getTemplateById(input.id);
        if (!template) {
          throw new Error("템플릿을 찾을 수 없습니다.");
        }
        
        if (template.userId !== ctx.user.id) {
          throw new Error("접근 권한이 없습니다.");
        }
        
        await deleteTemplate(input.id);
        return { success: true };
      }),
  }),
  
  // 파일 변환 라우터
  conversion: router({
    create: protectedProcedure
      .input((raw: unknown) => {
        if (
          typeof raw === "object" &&
          raw !== null &&
          "templateId" in raw &&
          "excelFileKey" in raw &&
          "excelFileUrl" in raw &&
          "wordPairCount" in raw &&
          typeof raw.templateId === "number" &&
          typeof raw.excelFileKey === "string" &&
          typeof raw.excelFileUrl === "string" &&
          typeof raw.wordPairCount === "number"
        ) {
          return {
            templateId: raw.templateId,
            excelFileKey: raw.excelFileKey,
            excelFileUrl: raw.excelFileUrl,
            wordPairCount: raw.wordPairCount,
            imageMappings: ("imageMappings" in raw && typeof raw.imageMappings === "object") ? raw.imageMappings as Record<string, string> : undefined,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input, ctx }) => {
        const { getSubscriptionByUserId, getTemplateById, createConversionJob } = await import("./db");
        
        // 구독 정보 확인
        let subscription = await getSubscriptionByUserId(ctx.user.id);
        if (!subscription) {
          const { createSubscription } = await import("./db");
          await createSubscription({ userId: ctx.user.id, tier: "free" });
          subscription = await getSubscriptionByUserId(ctx.user.id);
        }
        
        // 무료 사용자 치환 단어 수 제한 검증 (10개)
        if (subscription && subscription.tier === "free" && input.wordPairCount > 10) {
          throw new Error("무료 플랜은 치환 단어를 10개까지만 사용할 수 있습니다.");
        }
        
        // 템플릿 소유권 확인
        const template = await getTemplateById(input.templateId);
        if (!template) {
          throw new Error("템플릿을 찾을 수 없습니다.");
        }
        if (template.userId !== ctx.user.id) {
          throw new Error("접근 권한이 없습니다.");
        }
        
        // 변환 작업 생성
        await createConversionJob({
          userId: ctx.user.id,
          templateId: input.templateId,
          excelFileKey: input.excelFileKey,
          excelFileUrl: input.excelFileUrl,
          wordPairCount: input.wordPairCount,
        });
        
        // 방금 생성된 작업 ID 조회
        const { getConversionJobsByUserId } = await import("./db");
        const jobs = await getConversionJobsByUserId(ctx.user.id);
        const jobId = jobs[jobs.length - 1]?.id || 0;
        
        // 비동기로 Python 스크립트 실행 (백그라운드 프로세스)
        processConversion(jobId, template, input.excelFileKey, input.excelFileUrl, input.imageMappings).catch(err => {
          console.error(`Conversion job ${jobId} failed:`, err);
        });
        
        return { jobId, status: "pending" };
      }),
    
    getStatus: protectedProcedure
      .input((raw: unknown) => {
        if (typeof raw === "object" && raw !== null && "jobId" in raw && typeof raw.jobId === "number") {
          return { jobId: raw.jobId };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input, ctx }) => {
        const { getConversionJobById } = await import("./db");
        const job = await getConversionJobById(input.jobId);
        
        if (!job) {
          throw new Error("변환 작업을 찾을 수 없습니다.");
        }
        
        if (job.userId !== ctx.user.id) {
          throw new Error("접근 권한이 없습니다.");
        }
        
        return job;
      }),
    
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getConversionJobsByUserId } = await import("./db");
      return getConversionJobsByUserId(ctx.user.id);
    }),
  }),
  
  // 구독 정보 라우터
  subscription: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getSubscriptionByUserId, createSubscription } = await import("./db");
      let subscription = await getSubscriptionByUserId(ctx.user.id);
      
      // 구독 정보가 없으면 무료 플랜 생성
      if (!subscription) {
        await createSubscription({ userId: ctx.user.id, tier: "free" });
        subscription = await getSubscriptionByUserId(ctx.user.id);
      }
      
      return subscription;
    }),
  }),
});

// 변환 작업을 처리하는 비동기 함수
async function processConversion(
  jobId: number,
  template: { fileKey: string; fileUrl: string },
  excelFileKey: string,
  excelFileUrl: string,
  imageMappings?: Record<string, string>
) {
  const { updateConversionJob } = await import("./db");
  const { storageGet } = await import("./storage");
  const { storagePut } = await import("./storage");
  const { spawn } = await import("child_process");
  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");
  
  try {
    // 상태를 processing으로 변경
    await updateConversionJob(jobId, { status: "processing" });
    
    // 임시 디렉토리 생성
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "slidefill-"));
    const templatePath = path.join(tmpDir, "template.pptx");
    const excelPath = path.join(tmpDir, "data.xlsx");
    const outputPath = path.join(tmpDir, "output.pptx");
    
    // S3에서 파일 다운로드
    const templateUrl = await storageGet(template.fileKey);
    const excelUrl = await storageGet(excelFileKey);
    
    const axios = (await import("axios")).default;
    
    const templateResponse = await axios.get(templateUrl.url, { responseType: "arraybuffer" });
    fs.writeFileSync(templatePath, Buffer.from(templateResponse.data));
    
    const excelResponse = await axios.get(excelUrl.url, { responseType: "arraybuffer" });
    fs.writeFileSync(excelPath, Buffer.from(excelResponse.data));
    
    // 이미지 다운로드 (있는 경우)
    const localImageMappings: Record<string, string> = {};
    if (imageMappings) {
      for (const [placeholder, imageKey] of Object.entries(imageMappings)) {
        const imageUrl = await storageGet(imageKey);
        const imagePath = path.join(tmpDir, `image_${Object.keys(localImageMappings).length}.jpg`);
        const imageResponse = await axios.get(imageUrl.url, { responseType: "arraybuffer" });
        fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
        localImageMappings[placeholder] = imagePath;
      }
    }
    
    // Python 스크립트 실행
    const scriptPath = path.join(process.cwd(), "scripts", "convert_ppt.py");
    const venvPython = path.join(process.cwd(), "venv", "bin", "python");
    
    const args = ["-B", scriptPath, templatePath, excelPath, outputPath];
    if (Object.keys(localImageMappings).length > 0) {
      args.push(JSON.stringify(localImageMappings));
    }
    
    const pythonProcess = spawn(venvPython, args, {
      env: {
        ...process.env,
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONUNBUFFERED: "1",
      },
    });
    
    let stdout = "";
    let stderr = "";
    
    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    await new Promise<void>((resolve, reject) => {
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });
      
      pythonProcess.on("error", (err) => {
        reject(err);
      });
    });
    
    // 결과 파일 S3에 업로드
    const outputBuffer = fs.readFileSync(outputPath);
    const resultFileKey = `conversions/${jobId}/result_${Date.now()}.pptx`;
    const uploadResult = await storagePut(resultFileKey, outputBuffer, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    
    // 임시 파일 삭제
    fs.rmSync(tmpDir, { recursive: true, force: true });
    
    // 상태를 completed로 변경
    await updateConversionJob(jobId, {
      status: "completed",
      resultFileKey: uploadResult.key,
      resultFileUrl: uploadResult.url,
    });
    
  } catch (error) {
    console.error(`Conversion job ${jobId} error:`, error);
    await updateConversionJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

export type AppRouter = typeof appRouter;
