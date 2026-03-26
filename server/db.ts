import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, trades, signals, dailyStats, symbols } from "../drizzle/schema";
import type { Trade, InsertTrade, Signal, InsertSignal, DailyStat, InsertDailyStat, Symbol } from "../drizzle/schema";
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

// Trading queries
export async function createTrade(trade: InsertTrade): Promise<Trade | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.insert(trades).values(trade);
    const result = await db.select().from(trades).where(eq(trades.tradeId, trade.tradeId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create trade:", error);
    throw error;
  }
}

export async function getActiveTrades(): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(trades).where(eq(trades.outcome, "OPEN"));
  } catch (error) {
    console.error("[Database] Failed to get active trades:", error);
    return [];
  }
}

export async function updateTrade(tradeId: string, updates: Partial<InsertTrade>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(trades).set(updates).where(eq(trades.tradeId, tradeId));
  } catch (error) {
    console.error("[Database] Failed to update trade:", error);
    throw error;
  }
}

export async function createSignal(signal: InsertSignal): Promise<Signal | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.insert(signals).values(signal);
    const result = await db.select().from(signals).orderBy(signals.id).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create signal:", error);
    throw error;
  }
}

export async function getSignalsBySymbol(symbol: string, limit: number = 50): Promise<Signal[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(signals).where(eq(signals.symbol, symbol)).orderBy(signals.id).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get signals:", error);
    return [];
  }
}

export async function getGlobalSignals(limit: number = 50): Promise<Signal[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const { desc } = require("drizzle-orm");
    return await db.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get global signals:", error);
    return [];
  }
}

export async function getPerformanceHistory(limit: number = 30): Promise<DailyStat[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const { desc } = require("drizzle-orm");
    return await db.select().from(dailyStats).orderBy(desc(dailyStats.date)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get performance history:", error);
    return [];
  }
}

export async function getDailyStats(date: string): Promise<DailyStat | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(dailyStats).where(eq(dailyStats.date, date)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get daily stats:", error);
    return null;
  }
}

export async function updateOrCreateDailyStats(date: string, updates: Partial<InsertDailyStat>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await getDailyStats(date);
    if (existing) {
      await db.update(dailyStats).set(updates).where(eq(dailyStats.date, date));
    } else {
      await db.insert(dailyStats).values({ date, ...updates } as InsertDailyStat);
    }
  } catch (error) {
    console.error("[Database] Failed to update daily stats:", error);
    throw error;
  }
}

export async function getSymbols(): Promise<Symbol[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(symbols).where(eq(symbols.enabled, 1));
  } catch (error) {
    console.error("[Database] Failed to get symbols:", error);
    return [];
  }
}

export async function addSymbol(symbol: string, region: string = "US", sector: string = "Technology"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    // Use onDuplicateKeyUpdate to avoid unique constraint errors and ensure data is fresh
    await db.insert(symbols).values({ 
      symbol, 
      region, 
      sector, 
      enabled: 1 
    }).onDuplicateKeyUpdate({
      set: { region, sector, enabled: 1 }
    });
    console.log(`[Database] Symbol ${symbol} added/updated successfully.`);
  } catch (error) {
    console.error(`[Database] Failed to add symbol ${symbol}:`, error);
    throw error;
  }
}


