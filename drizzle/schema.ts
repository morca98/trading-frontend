import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

// Trading System Tables
export const symbols = mysqlTable("symbols", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  region: varchar("region", { length: 10 }).default("US").notNull(),
  sector: varchar("sector", { length: 50 }).default("Technology").notNull(),
  enabled: int("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Symbol = typeof symbols.$inferSelect;
export type InsertSymbol = typeof symbols.$inferInsert;

export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  tradeId: varchar("tradeId", { length: 64 }).notNull().unique(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  signal: mysqlEnum("signal", ["BUY", "SELL"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 12, scale: 2 }).notNull(),
  stopLoss: decimal("stopLoss", { precision: 12, scale: 2 }).notNull(),
  takeProfit: decimal("takeProfit", { precision: 12, scale: 2 }).notNull(),
  slPct: decimal("slPct", { precision: 8, scale: 4 }).notNull(),
  tpPct: decimal("tpPct", { precision: 8, scale: 4 }).notNull(),
  confidence: int("confidence").notNull(),
  rsi: decimal("rsi", { precision: 8, scale: 2 }),
  adx: decimal("adx", { precision: 8, scale: 2 }),
  atr: decimal("atr", { precision: 12, scale: 2 }),
  macroTrend: varchar("macroTrend", { length: 20 }),
  trendShort: varchar("trendShort", { length: 20 }),
  outcome: mysqlEnum("outcome", ["OPEN", "WIN", "LOSS"]).default("OPEN").notNull(),
  exitPrice: decimal("exitPrice", { precision: 12, scale: 2 }),
  pnl: decimal("pnl", { precision: 8, scale: 4 }),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

export const signals = mysqlTable("signals", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  signal: mysqlEnum("signal", ["BUY", "SELL"]).notNull(),
  confidence: int("confidence").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  rsi: decimal("rsi", { precision: 8, scale: 2 }),
  adx: decimal("adx", { precision: 8, scale: 2 }),
  macroTrend: varchar("macroTrend", { length: 20 }),
  trendShort: varchar("trendShort", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Signal = typeof signals.$inferSelect;
export type InsertSignal = typeof signals.$inferInsert;

export const dailyStats = mysqlTable("dailyStats", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  totalPnl: decimal("totalPnl", { precision: 12, scale: 4 }).default("0").notNull(),
  totalSignals: int("totalSignals").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyStat = typeof dailyStats.$inferSelect;
export type InsertDailyStat = typeof dailyStats.$inferInsert;