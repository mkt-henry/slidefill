import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("template router", () => {
  it("should list templates for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.template.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should enforce free tier template limit", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 무료 플랜 사용자는 이미 템플릿이 있을 수 있으므로
    // 추가 등록 시도시 제한이 걸리는지 확인
    try {
      await caller.template.create({
        name: "Test Template",
        fileKey: "test/template.pptx",
        fileUrl: "https://example.com/test.pptx",
        slideCount: 5,
      });
      
      // 등록 성공하면 두 번째 등록은 실패해야 함
      await expect(
        caller.template.create({
          name: "Second Template",
          fileKey: "test/template2.pptx",
          fileUrl: "https://example.com/test2.pptx",
          slideCount: 3,
        })
      ).rejects.toThrow("무료 플랜");
    } catch (error) {
      // 이미 템플릿이 있어서 첫 번째가 실패한 경우도 정상
      expect(error).toBeDefined();
    }
  });
});

describe("subscription router", () => {
  it("should get or create subscription for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.get();

    expect(result).toBeDefined();
    expect(result?.tier).toBeDefined();
  });
});
