import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// 템플릿 관련 쿼리
export async function getTemplatesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { templates } = await import("../drizzle/schema");
  return db.select().from(templates).where(eq(templates.userId, userId));
}

export async function getTemplateById(templateId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { templates } = await import("../drizzle/schema");
  const result = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTemplate(data: { userId: number; name: string; fileKey: string; fileUrl: string; slideCount: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { templates } = await import("../drizzle/schema");
  const result = await db.insert(templates).values(data);
  return result;
}

export async function deleteTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { templates } = await import("../drizzle/schema");
  await db.delete(templates).where(eq(templates.id, templateId));
}

export async function countTemplatesByUserId(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { templates } = await import("../drizzle/schema");
  const result = await db.select().from(templates).where(eq(templates.userId, userId));
  return result.length;
}

// 구독 관련 쿼리
export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { subscriptions } = await import("../drizzle/schema");
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSubscription(data: { userId: number; tier?: "free" | "monthly" | "lifetime" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { subscriptions } = await import("../drizzle/schema");
  const result = await db.insert(subscriptions).values(data);
  return result;
}

export async function updateSubscription(userId: number, data: Partial<{ tier: "free" | "monthly" | "lifetime"; stripeCustomerId: string; stripeSubscriptionId: string; startedAt: Date; expiresAt: Date | null; status: "active" | "canceled" | "expired" }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { subscriptions } = await import("../drizzle/schema");
  await db.update(subscriptions).set(data).where(eq(subscriptions.userId, userId));
}

// 변환 작업 관련 쿼리
export async function createConversionJob(data: { userId: number; templateId: number; excelFileKey: string; excelFileUrl: string; wordPairCount: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { conversionJobs } = await import("../drizzle/schema");
  const result = await db.insert(conversionJobs).values(data);
  return result;
}

export async function getConversionJobById(jobId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { conversionJobs } = await import("../drizzle/schema");
  const result = await db.select().from(conversionJobs).where(eq(conversionJobs.id, jobId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateConversionJob(jobId: number, data: Partial<{ status: "pending" | "processing" | "completed" | "failed"; resultFileKey: string; resultFileUrl: string; errorMessage: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { conversionJobs } = await import("../drizzle/schema");
  await db.update(conversionJobs).set(data).where(eq(conversionJobs.id, jobId));
}

export async function getConversionJobsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { conversionJobs } = await import("../drizzle/schema");
  return db.select().from(conversionJobs).where(eq(conversionJobs.userId, userId));
}
