import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 사용자가 업로드한 PPT 템플릿을 저장하는 테이블
 * 무료 사용자는 1개, 유료 사용자는 무제한 템플릿 등록 가능
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // users.id 참조
  name: varchar("name", { length: 255 }).notNull(),
  /** S3에 저장된 원본 PPTX 파일의 키 */
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  /** S3에 저장된 원본 PPTX 파일의 공개 URL */
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  /** 템플릿의 슬라이드 수 (무료 사용자는 5장 제한) */
  slideCount: int("slideCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * 파일 변환 작업의 상태를 추적하는 테이블
 * 사용자가 요청한 변환 작업의 진행 상황 및 결과를 저장
 */
export const conversionJobs = mysqlTable("conversion_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // users.id 참조
  templateId: int("templateId").notNull(), // templates.id 참조
  /** 변환 작업 상태: pending(대기), processing(처리중), completed(완료), failed(실패) */
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  /** 업로드된 엑셀 파일의 S3 키 */
  excelFileKey: varchar("excelFileKey", { length: 512 }).notNull(),
  /** 업로드된 엑셀 파일의 S3 URL */
  excelFileUrl: varchar("excelFileUrl", { length: 1024 }).notNull(),
  /** 변환된 결과 PPT 파일의 S3 키 (완료 시에만 존재) */
  resultFileKey: varchar("resultFileKey", { length: 512 }),
  /** 변환된 결과 PPT 파일의 S3 URL (완료 시에만 존재) */
  resultFileUrl: varchar("resultFileUrl", { length: 1024 }),
  /** 에러 발생 시 에러 메시지 */
  errorMessage: text("errorMessage"),
  /** 치환된 단어 쌍의 개수 (무료 사용자는 10개 제한) */
  wordPairCount: int("wordPairCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConversionJob = typeof conversionJobs.$inferSelect;
export type InsertConversionJob = typeof conversionJobs.$inferInsert;

/**
 * 사용자의 구독 정보를 저장하는 테이블
 * Stripe 결제 연동을 통해 관리
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // users.id 참조 (1:1 관계)
  /** 구독 유형: free(무료), monthly(월간), lifetime(평생) */
  tier: mysqlEnum("tier", ["free", "monthly", "lifetime"]).default("free").notNull(),
  /** Stripe 고객 ID */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  /** Stripe 구독 ID (월간 구독의 경우) */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  /** 구독 시작일 */
  startedAt: timestamp("startedAt"),
  /** 구독 만료일 (월간 구독의 경우, lifetime은 null) */
  expiresAt: timestamp("expiresAt"),
  /** 구독 상태: active(활성), canceled(취소됨), expired(만료됨) */
  status: mysqlEnum("status", ["active", "canceled", "expired"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;