import "dotenv/config";
import express from "express";
import { drizzle } from "drizzle-orm/mysql2";
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { eq } from "drizzle-orm";

// --- 1. إعدادات البيئة ---
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

// --- 2. مخطط قاعدة البيانات (Drizzle Schema) ---
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const memories = mysqlTable("memories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- 3. اتصال قاعدة البيانات ---
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
      console.log("[Database] Connected successfully.");
    } catch (error) {
      console.error("[Database] Connection failed:", error);
      _db = null;
    }
  }
  return _db;
}

// --- 4. دالة التحديث الآمن (Upsert User) المصححة ---
export async function upsertUser(user: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
  lastSignedIn?: Date;
}) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Skipping upsert: No active database connection.");
    return;
  }

  const values: Record<string, any> = { openId: user.openId };
  const updateSet: Record<string, any> = {};

  if (user.name !== undefined) {
    values.name = user.name;
    updateSet.name = user.name;
  }
  if (user.email !== undefined) {
    values.email = user.email;
    updateSet.email = user.email;
  }
  if (user.loginMethod !== undefined) {
    values.loginMethod = user.loginMethod;
    updateSet.loginMethod = user.loginMethod;
  }

  // معالجة آمنة لـ lastSignedIn لتجنب أي أخطاء نوعية أو بيئية
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

// --- 5. تشغيل تجريبي للخادم المصغر ---
const app = express();
app.use(express.json());

app.get("/api/health", async (req, res) => {
  const dbStatus = (await getDb()) ? "Connected" : "Disconnected";
  res.json({ status: "OK", database: dbStatus, timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Test server running on port ${PORT}`);
});
