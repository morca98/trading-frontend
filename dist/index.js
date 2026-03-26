var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, symbols, trades, signals, dailyStats;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
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
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    symbols = mysqlTable("symbols", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 20 }).notNull().unique(),
      region: varchar("region", { length: 10 }).default("US").notNull(),
      sector: varchar("sector", { length: 50 }).default("Technology").notNull(),
      enabled: int("enabled").default(1).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    trades = mysqlTable("trades", {
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
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    signals = mysqlTable("signals", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 20 }).notNull(),
      signal: mysqlEnum("signal", ["BUY", "SELL"]).notNull(),
      confidence: int("confidence").notNull(),
      price: decimal("price", { precision: 12, scale: 2 }).notNull(),
      rsi: decimal("rsi", { precision: 8, scale: 2 }),
      adx: decimal("adx", { precision: 8, scale: 2 }),
      macroTrend: varchar("macroTrend", { length: 20 }),
      trendShort: varchar("trendShort", { length: 20 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    dailyStats = mysqlTable("dailyStats", {
      id: int("id").autoincrement().primaryKey(),
      date: varchar("date", { length: 10 }).notNull().unique(),
      wins: int("wins").default(0).notNull(),
      losses: int("losses").default(0).notNull(),
      totalPnl: decimal("totalPnl", { precision: 12, scale: 4 }).default("0").notNull(),
      totalSignals: int("totalSignals").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      telegramToken: process.env.TELEGRAM_TOKEN || "8628057627:AAGqiKMJTkQ4Dmdg0Be7DE-LdeBJiiGQaew",
      telegramChatId: process.env.TELEGRAM_CHAT_ID || "1354621810"
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addSymbol: () => addSymbol,
  createSignal: () => createSignal,
  createTrade: () => createTrade,
  getActiveTrades: () => getActiveTrades,
  getDailyStats: () => getDailyStats,
  getDb: () => getDb,
  getGlobalSignals: () => getGlobalSignals,
  getPerformanceHistory: () => getPerformanceHistory,
  getSignalsBySymbol: () => getSignalsBySymbol,
  getSymbols: () => getSymbols,
  getUserByOpenId: () => getUserByOpenId,
  removeSymbol: () => removeSymbol,
  toggleSymbol: () => toggleSymbol,
  updateOrCreateDailyStats: () => updateOrCreateDailyStats,
  updateTrade: () => updateTrade,
  upsertUser: () => upsertUser
});
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createTrade(trade) {
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
async function getActiveTrades() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(trades).where(eq(trades.outcome, "OPEN"));
  } catch (error) {
    console.error("[Database] Failed to get active trades:", error);
    return [];
  }
}
async function updateTrade(tradeId, updates) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(trades).set(updates).where(eq(trades.tradeId, tradeId));
  } catch (error) {
    console.error("[Database] Failed to update trade:", error);
    throw error;
  }
}
async function createSignal(signal) {
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
async function getSignalsBySymbol(symbol, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(signals).where(eq(signals.symbol, symbol)).orderBy(signals.id).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get signals:", error);
    return [];
  }
}
async function getGlobalSignals(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  try {
    const { desc } = __require("drizzle-orm");
    return await db.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get global signals:", error);
    return [];
  }
}
async function getPerformanceHistory(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  try {
    const { desc } = __require("drizzle-orm");
    return await db.select().from(dailyStats).orderBy(desc(dailyStats.date)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get performance history:", error);
    return [];
  }
}
async function getDailyStats(date) {
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
async function updateOrCreateDailyStats(date, updates) {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await getDailyStats(date);
    if (existing) {
      await db.update(dailyStats).set(updates).where(eq(dailyStats.date, date));
    } else {
      await db.insert(dailyStats).values({ date, ...updates });
    }
  } catch (error) {
    console.error("[Database] Failed to update daily stats:", error);
    throw error;
  }
}
async function getSymbols() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(symbols).where(eq(symbols.enabled, 1));
  } catch (error) {
    if (error.message && (error.message.includes("Unknown column 'sector'") || error.code === "ER_BAD_FIELD_ERROR")) {
      try {
        const { symbol, region, enabled, id, createdAt, updatedAt } = symbols;
        const result = await db.select({ id, symbol, region, enabled, createdAt, updatedAt }).from(symbols).where(eq(enabled, 1));
        return result.map((s) => ({ ...s, sector: "Technology" }));
      } catch (innerError) {
        console.error("[Database] Failed to get symbols even without sector:", innerError);
        return [];
      }
    }
    console.error("[Database] Failed to get symbols:", error);
    return [];
  }
}
async function removeSymbol(symbolStr) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.delete(symbols).where(eq(symbols.symbol, symbolStr));
    console.log(`[Database] Symbol ${symbolStr} removed.`);
  } catch (error) {
    console.error(`[Database] Failed to remove symbol ${symbolStr}:`, error);
    throw error;
  }
}
async function toggleSymbol(symbolStr, enabled) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(symbols).set({ enabled: enabled ? 1 : 0 }).where(eq(symbols.symbol, symbolStr));
    console.log(`[Database] Symbol ${symbolStr} ${enabled ? "enabled" : "disabled"}.`);
  } catch (error) {
    console.error(`[Database] Failed to toggle symbol ${symbolStr}:`, error);
    throw error;
  }
}
async function addSymbol(symbol, region = "US", sector = "Technology") {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(symbols).values({
      symbol,
      region,
      sector,
      enabled: 1
    }).onDuplicateKeyUpdate({
      set: { region, sector, enabled: 1 }
    });
    console.log(`[Database] Symbol ${symbol} added/updated successfully with sector.`);
  } catch (error) {
    if (error.message && (error.message.includes("Unknown column 'sector'") || error.code === "ER_BAD_FIELD_ERROR")) {
      try {
        await db.insert(symbols).values({
          symbol,
          region,
          enabled: 1
        }).onDuplicateKeyUpdate({
          set: { region, enabled: 1 }
        });
        console.warn(`[Database] Symbol ${symbol} added without sector (column missing).`);
        return;
      } catch (innerError) {
        console.error(`[Database] Failed to add symbol ${symbol} even without sector:`, innerError);
        throw innerError;
      }
    }
    console.error(`[Database] Failed to add symbol ${symbol}:`, error);
    throw error;
  }
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
  }
});

// server/trading/telegram.ts
var telegram_exports = {};
__export(telegram_exports, {
  formatBuySignal: () => formatBuySignal,
  formatDailyReport: () => formatDailyReport,
  formatNoSignalsMessage: () => formatNoSignalsMessage,
  formatSellSignal: () => formatSellSignal,
  formatStartupNotification: () => formatStartupNotification,
  formatTradeClosedNotification: () => formatTradeClosedNotification,
  formatTrailingStopNotification: () => formatTrailingStopNotification,
  initTelegram: () => initTelegram,
  sendTelegram: () => sendTelegram
});
import axios2 from "axios";
function initTelegram(token, chatId) {
  config = { token, chatId };
  console.log("[Telegram] Initialized with chat ID:", chatId);
}
async function sendTelegram(message) {
  if (!config) {
    console.warn("[Telegram] Not configured. Message would be:", message.replace(/<[^>]+>/g, ""));
    return false;
  }
  try {
    await axios2.post(
      `${TELEGRAM_API_BASE}/bot${config.token}/sendMessage`,
      {
        chat_id: config.chatId,
        text: message,
        parse_mode: "HTML"
      },
      { timeout: 1e4 }
    );
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending message:", error instanceof Error ? error.message : error);
    return false;
  }
}
function formatBuySignal(symbol, price, sl, tp, confidence, rsi, adx, atr, ema9, ema21, ema50, macroTrend, trendShort) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  return `\u{1F7E2} <b>BUY ${symbol}</b>

\u{1F4B0} <b>Pre\xE7o:</b> $${price.toFixed(2)}
\u{1F6D1} <b>Stop Loss:</b> $${sl.toFixed(2)}
\u{1F3AF} <b>Take Profit:</b> $${tp.toFixed(2)}
\u{1F4CA} <b>Confian\xE7a:</b> ${confidence}%

<b>Indicadores:</b>
\u2022 RSI: ${rsi.toFixed(1)}
\u2022 ADX: ${adx.toFixed(1)}
\u2022 ATR: $${atr.toFixed(2)}
\u2022 EMA9: $${ema9.toFixed(2)}
\u2022 EMA21: $${ema21.toFixed(2)}
\u2022 EMA50: $${ema50.toFixed(2)}

<b>Tend\xEAncia:</b>
\u2022 Macro: ${macroTrend}
\u2022 Curto: ${trendShort}

\u23F0 ${timestamp2}`;
}
function formatSellSignal(symbol, price, sl, tp, confidence, rsi, adx, atr, ema9, ema21, ema50, macroTrend, trendShort) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  return `\u{1F534} <b>SELL ${symbol}</b>

\u{1F4B0} <b>Pre\xE7o:</b> $${price.toFixed(2)}
\u{1F6D1} <b>Stop Loss:</b> $${sl.toFixed(2)}
\u{1F3AF} <b>Take Profit:</b> $${tp.toFixed(2)}
\u{1F4CA} <b>Confian\xE7a:</b> ${confidence}%

<b>Indicadores:</b>
\u2022 RSI: ${rsi.toFixed(1)}
\u2022 ADX: ${adx.toFixed(1)}
\u2022 ATR: $${atr.toFixed(2)}
\u2022 EMA9: $${ema9.toFixed(2)}
\u2022 EMA21: $${ema21.toFixed(2)}
\u2022 EMA50: $${ema50.toFixed(2)}

<b>Tend\xEAncia:</b>
\u2022 Macro: ${macroTrend}
\u2022 Curto: ${trendShort}

\u23F0 ${timestamp2}`;
}
function formatTradeClosedNotification(symbol, signal, pnl, outcome, winRate, totalWins, totalLosses) {
  const emoji = outcome === "WIN" ? "\u2705" : "\u274C";
  const pnlFormatted = pnl >= 0 ? `+${pnl.toFixed(2)}%` : `${pnl.toFixed(2)}%`;
  const timestamp2 = (/* @__PURE__ */ new Date()).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  return `${emoji} <b>${outcome} ${signal} ${symbol}</b>

\u{1F4C8} <b>P&L:</b> ${pnlFormatted}
\u{1F3C6} <b>Win Rate:</b> ${winRate}% (${totalWins}W / ${totalLosses}L)

\u23F0 ${timestamp2}`;
}
function formatTrailingStopNotification(symbol, newSl) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  return `\u{1F4C8} <b>Trailing Stop Ativado</b>

${symbol}
\u{1F6D1} <b>Novo SL:</b> $${newSl.toFixed(2)}

\u23F0 ${timestamp2}`;
}
function formatDailyReport(date, winRate, totalWins, totalLosses, totalPnl, totalSignals, activeTrades) {
  const total = totalWins + totalLosses;
  return `\u{1F4CB} <b>Relat\xF3rio Di\xE1rio \u2013 Stock Bot</b>

<b>Data:</b> ${date}

<b>Performance:</b>
\u2022 Win Rate: ${winRate}% (${totalWins}W / ${totalLosses}L)
\u2022 P&L Total: ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%
\u2022 Sinais Gerados: ${totalSignals}

<b>Trades Ativos:</b> ${activeTrades}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>Bot operacional e monitorando mercados 24/7</i>`;
}
function formatStartupNotification(symbolCount) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  return `\u2705 <b>Stock Signal Bot \u2014 ONLINE</b>

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F550} <b>Arranque:</b> ${timestamp2}
\u{1F4E1} <b>Telegram:</b> Ligado e funcional
\u{1F4C8} <b>S\xEDmbolos:</b> ${symbolCount} em monitoriza\xE7\xE3o
\u{1F3C6} <b>Status:</b> Pronto para gerar sinais

<b>Configura\xE7\xE3o:</b>
\u2022 Intervalo: Velas Di\xE1rias (1d)
\u2022 Estrat\xE9gia: EMA9/21 Crossover + ADX + RSI
\u2022 TP/SL: Din\xE2mico (ATR-based)
	\u2022 Gest\xE3o de Risco: 1% por posi\xE7\xE3o | R:R 1:3 | Trailing Stop 2%
\u2022 Scan: A cada 4h | Verifica\xE7\xE3o: A cada 15min

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F680} Sistema operacional e pronto para trading`;
}
function formatNoSignalsMessage(symbolCount) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  return `\u{1F50D} <b>An\xE1lise de Mercado Conclu\xEDda</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4CA} <b>Ativos Monitorizados:</b> ${symbolCount}
\u{1F6AB} <b>Resultado:</b> Nenhum sinal gerado nesta an\xE1lise.
\u23F0 ${timestamp2}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>Bot continua a monitorizar os mercados 24/7</i>`;
}
var TELEGRAM_API_BASE, config;
var init_telegram = __esm({
  "server/trading/telegram.ts"() {
    "use strict";
    TELEGRAM_API_BASE = "https://api.telegram.org";
    config = null;
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/trading.ts
init_db();
import { z as z2 } from "zod";
var tradingRouter = router({
  // Get all active trades
  getActiveTrades: publicProcedure.query(async () => {
    return await getActiveTrades();
  }),
  // Get signals by symbol
  getSignals: publicProcedure.input(
    z2.object({
      symbol: z2.string(),
      limit: z2.number().optional().default(50)
    })
  ).query(async ({ input }) => {
    return await getSignalsBySymbol(input.symbol, input.limit);
  }),
  getGlobalSignals: publicProcedure.input(z2.object({ limit: z2.number().optional().default(50) })).query(async ({ input }) => {
    const { getGlobalSignals: getGlobalSignals2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    return await getGlobalSignals2(input.limit);
  }),
  getPerformance: publicProcedure.input(z2.object({ limit: z2.number().optional().default(30) })).query(async ({ input }) => {
    const { getPerformanceHistory: getPerformanceHistory2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    return await getPerformanceHistory2(input.limit);
  }),
  // Get daily stats
  getDailyStats: publicProcedure.input(z2.object({ date: z2.string() })).query(async ({ input }) => {
    return await getDailyStats(input.date);
  }),
  // Get configured symbols
  getSymbols: publicProcedure.query(async () => {
    return await getSymbols();
  }),
  // Add new symbol to monitor
  addSymbol: publicProcedure.input(
    z2.object({
      symbol: z2.string().toUpperCase(),
      region: z2.string().optional().default("US"),
      sector: z2.string().optional().default("Technology")
    })
  ).mutation(async ({ input }) => {
    await addSymbol(input.symbol, input.region, input.sector);
    return { success: true, symbol: input.symbol };
  }),
  // Remove symbol from monitoring
  removeSymbol: publicProcedure.input(z2.object({ symbol: z2.string() })).mutation(async ({ input }) => {
    await removeSymbol(input.symbol);
    return { success: true, symbol: input.symbol };
  }),
  // Enable/disable symbol without deleting
  toggleSymbol: publicProcedure.input(z2.object({ symbol: z2.string(), enabled: z2.boolean() })).mutation(async ({ input }) => {
    await toggleSymbol(input.symbol, input.enabled);
    return { success: true, symbol: input.symbol, enabled: input.enabled };
  })
});

// server/routers/backtest.ts
import { z as z3 } from "zod";

// server/trading/technicalAnalysis.ts
function calcEMA(data, period) {
  if (!data || data.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}
function calcATR(candles, period = 14) {
  if (candles.length < period) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1] || c;
    sum += Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    );
  }
  return sum / period;
}
function calcADX(candles, period = 14) {
  if (candles.length < period * 2) return 0;
  const plusDMs = [], minusDMs = [], trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    const upMove = c.high - p.high, downMove = p.low - c.low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - p.close),
        Math.abs(c.low - p.close)
      )
    );
  }
  let smoothPlusDM = plusDMs.slice(0, period).reduce((s, v) => s + v, 0);
  let smoothMinusDM = minusDMs.slice(0, period).reduce((s, v) => s + v, 0);
  let smoothTR = trs.slice(0, period).reduce((s, v) => s + v, 0);
  const dxValues = [];
  for (let j = period; j < trs.length; j++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDMs[j];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[j];
    smoothTR = smoothTR - smoothTR / period + trs[j];
    const plusDI = smoothTR > 0 ? smoothPlusDM / smoothTR * 100 : 0;
    const minusDI = smoothTR > 0 ? smoothMinusDM / smoothTR * 100 : 0;
    const diSum = plusDI + minusDI;
    dxValues.push(diSum > 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0);
  }
  if (dxValues.length < period) return dxValues.length > 0 ? dxValues[dxValues.length - 1] : 0;
  let adx = dxValues.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let k = period; k < dxValues.length; k++) {
    adx = (adx * (period - 1) + dxValues[k]) / period;
  }
  return adx;
}

// server/trading/technicalAnalysisV3.ts
function calcSMA(data, period) {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}
function calcMACDLine(closes) {
  const len = closes.length;
  const macdLine = new Array(len).fill(0);
  const signalLine = new Array(len).fill(0);
  const histogram = new Array(len).fill(0);
  if (len < 35) return { macdLine, signalLine, histogram };
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  const k9 = 2 / (9 + 1);
  let ema12 = closes[0];
  let ema26 = closes[0];
  const ema12Arr = new Array(len).fill(0);
  const ema26Arr = new Array(len).fill(0);
  ema12Arr[0] = closes[0];
  ema26Arr[0] = closes[0];
  for (let i = 1; i < len; i++) {
    ema12Arr[i] = closes[i] * k12 + ema12Arr[i - 1] * (1 - k12);
    ema26Arr[i] = closes[i] * k26 + ema26Arr[i - 1] * (1 - k26);
    macdLine[i] = ema12Arr[i] - ema26Arr[i];
  }
  signalLine[25] = macdLine[25];
  for (let i = 26; i < len; i++) {
    signalLine[i] = macdLine[i] * k9 + signalLine[i - 1] * (1 - k9);
    histogram[i] = macdLine[i] - signalLine[i];
  }
  return { macdLine, signalLine, histogram };
}
function detectMacdBullishDivergence(candles, histogram, lookback = 20) {
  const len = candles.length;
  if (len < lookback + 2 || histogram.length < len) return false;
  const startIdx = len - lookback;
  let priceLowIdx = startIdx;
  for (let i = startIdx + 1; i < len - 1; i++) {
    if (candles[i].low < candles[priceLowIdx].low) {
      priceLowIdx = i;
    }
  }
  const lastLow = candles[len - 1].low;
  const prevLow = candles[priceLowIdx].low;
  if (lastLow >= prevLow) return false;
  const lastHist = histogram[len - 1];
  const prevHist = histogram[priceLowIdx];
  return lastHist > prevHist;
}
function evaluateMtfFilters(data) {
  const { weeklyCandles, dailyCandles, h4Candles } = data;
  const weeklyCloses = weeklyCandles.map((c) => c.close);
  const weeklyRsi = weeklyCloses.length >= 15 ? calcRSI(weeklyCloses, 14) : 50;
  const weeklyRsiOk = weeklyRsi < 50;
  const dailyCloses = dailyCandles.map((c) => c.close);
  const dailyClose = dailyCloses[dailyCloses.length - 1] ?? 0;
  const dailyMa70 = calcSMA(dailyCloses, 70);
  const dailyAboveMa70 = dailyMa70 > 0 && dailyClose > dailyMa70;
  const h4Closes = h4Candles.map((c) => c.close);
  const h4Rsi = h4Closes.length >= 15 ? calcRSI(h4Closes, 14) : 50;
  const h4RsiOk = h4Rsi < 40;
  const { macdLine, signalLine, histogram } = calcMACDLine(h4Closes);
  const lastIdx = h4Closes.length - 1;
  const h4Macd = macdLine[lastIdx] ?? 0;
  const h4MacdSignal = signalLine[lastIdx] ?? 0;
  const h4MacdHistogram = histogram[lastIdx] ?? 0;
  const h4MacdBullishDivergence = detectMacdBullishDivergence(h4Candles, histogram, 20);
  const h4Len = h4Candles.length;
  let h4HigherHigh = false;
  let h4HigherLow = false;
  if (h4Len >= 2) {
    const lastCandle = h4Candles[h4Len - 1];
    const prevCandle = h4Candles[h4Len - 2];
    h4HigherHigh = lastCandle.high > prevCandle.high;
    h4HigherLow = lastCandle.low > prevCandle.low;
  }
  const h4CandleConfirmation = h4HigherHigh && h4HigherLow;
  const allFiltersPass = weeklyRsiOk && dailyAboveMa70 && h4RsiOk && h4MacdBullishDivergence && h4CandleConfirmation;
  return {
    weeklyRsi: Math.round(weeklyRsi * 100) / 100,
    weeklyRsiOk,
    dailyClose: Math.round(dailyClose * 100) / 100,
    dailyMa70: Math.round(dailyMa70 * 100) / 100,
    dailyAboveMa70,
    h4Rsi: Math.round(h4Rsi * 100) / 100,
    h4RsiOk,
    h4MacdBullishDivergence,
    h4Macd: Math.round(h4Macd * 1e4) / 1e4,
    h4MacdSignal: Math.round(h4MacdSignal * 1e4) / 1e4,
    h4MacdHistogram: Math.round(h4MacdHistogram * 1e4) / 1e4,
    h4HigherHigh,
    h4HigherLow,
    h4CandleConfirmation,
    allFiltersPass
  };
}
function generateMtfSignal(data) {
  const { dailyCandles, h4Candles } = data;
  if (data.weeklyCandles.length < 20 || dailyCandles.length < 80 || h4Candles.length < 60) {
    return null;
  }
  const mtfFilters = evaluateMtfFilters(data);
  const filterChecks = [
    mtfFilters.weeklyRsiOk,
    mtfFilters.dailyAboveMa70,
    mtfFilters.h4RsiOk,
    mtfFilters.h4MacdBullishDivergence,
    mtfFilters.h4CandleConfirmation
  ];
  const filterScore = Math.round(
    filterChecks.filter(Boolean).length / filterChecks.length * 100
  );
  if (!mtfFilters.allFiltersPass) return null;
  const lastH4 = h4Candles[h4Candles.length - 1];
  const prevH4 = h4Candles[h4Candles.length - 2];
  const price = lastH4.close;
  const atr = calcATR(h4Candles, 14);
  const atrPct = atr / price;
  const slPct = Math.max(8e-3, Math.min(0.025, atrPct * 1.5));
  const slPrice = Math.min(prevH4.low, lastH4.low) * (1 - 1e-3);
  const slPctActual = (price - slPrice) / price;
  const finalSlPct = Math.max(slPct, slPctActual);
  const sl = price * (1 - finalSlPct);
  const h4Closes = h4Candles.map((c) => c.close);
  const adx = calcADX(h4Candles, 14);
  const rrMultiplier = 3;
  const tp = price * (1 + finalSlPct * rrMultiplier);
  const dailyCloses = dailyCandles.map((c) => c.close);
  const ema9 = calcEMA(h4Closes.slice(-50), 9);
  const ema21 = calcEMA(h4Closes.slice(-50), 21);
  const ema50 = calcEMA(dailyCloses.slice(-100), 50);
  const ema200 = dailyCloses.length >= 200 ? calcEMA(dailyCloses.slice(-200), 200) : ema50;
  const rsi = mtfFilters.h4Rsi;
  let confidence = 65;
  confidence += (adx - 20) * 0.5;
  if (mtfFilters.weeklyRsi < 40) confidence += 5;
  if (mtfFilters.h4Rsi < 30) confidence += 5;
  if (mtfFilters.h4MacdBullishDivergence) confidence += 5;
  confidence = Math.min(99, Math.round(confidence));
  return {
    signal: "BUY",
    confidence,
    price,
    sl: Math.round(sl * 100) / 100,
    tp: Math.round(tp * 100) / 100,
    slPct: Math.round(finalSlPct * 1e4) / 100,
    tpPct: Math.round(finalSlPct * rrMultiplier * 1e4) / 100,
    rsi: Math.round(rsi * 100) / 100,
    adx: Math.round(adx * 100) / 100,
    atr: Math.round(atr * 100) / 100,
    ema9: Math.round(ema9 * 100) / 100,
    ema21: Math.round(ema21 * 100) / 100,
    ema50: Math.round(ema50 * 100) / 100,
    ema200: Math.round(ema200 * 100) / 100,
    macroTrend: "BULL",
    trendShort: "BULL",
    mtfFilters,
    filterScore
  };
}

// server/trading/backtest.ts
function buildWeeklyCandles(dailyCandles) {
  const weekly = [];
  for (let i = 0; i < dailyCandles.length; i += 5) {
    const chunk = dailyCandles.slice(i, i + 5);
    if (chunk.length === 0) continue;
    weekly.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0)
    });
  }
  return weekly;
}
function buildH4Candles(dailyCandles) {
  const h4 = [];
  const h4ms = 4 * 60 * 60 * 1e3;
  for (const d of dailyCandles) {
    const range = d.high - d.low;
    const volPerBar = d.volume / 6;
    for (let j = 0; j < 6; j++) {
      const t2 = d.time + j * h4ms;
      const frac = j / 5;
      const midClose = d.open + (d.close - d.open) * ((j + 1) / 6);
      const midOpen = d.open + (d.close - d.open) * (j / 6);
      const subHigh = midClose + range * 0.1 * (1 - frac);
      const subLow = midOpen - range * 0.1 * frac;
      h4.push({
        time: t2,
        open: midOpen,
        high: Math.max(midOpen, midClose, subHigh),
        low: Math.min(midOpen, midClose, subLow),
        close: midClose,
        volume: volPerBar
      });
    }
  }
  return h4;
}
async function runBacktest(symbol, candles, startDate, endDate) {
  if (candles.length < 100) {
    throw new Error("Insufficient data for backtest (minimum 100 candles required)");
  }
  let testCandles = candles;
  if (startDate && endDate) {
    testCandles = candles.filter((c) => c.time >= startDate && c.time <= endDate);
  }
  const trades2 = [];
  let activeTradeIndex = -1;
  const equityCurve = [];
  let equity = 1e4;
  const tradeIds = /* @__PURE__ */ new Set();
  const allWeeklyCandles = buildWeeklyCandles(testCandles);
  const allH4Candles = buildH4Candles(testCandles);
  for (let i = 50; i < testCandles.length; i++) {
    const currentPrice = testCandles[i].close;
    const dailyWindow = testCandles.slice(Math.max(0, i - 100), i + 1);
    const weeklyWindow = allWeeklyCandles.slice(0, Math.ceil((i + 1) / 5));
    const h4Window = allH4Candles.slice(0, (i + 1) * 6);
    const mtfData = {
      weeklyCandles: weeklyWindow.slice(-30),
      dailyCandles: dailyWindow,
      h4Candles: h4Window.slice(-120)
      // últimas 120 velas de 4h (~20 dias)
    };
    const signalResult = generateMtfSignal(mtfData);
    if (activeTradeIndex >= 0) {
      const activeTrade = trades2[activeTradeIndex];
      let shouldClose = false;
      let exitPrice = currentPrice;
      if (activeTrade.signal === "BUY") {
        if (currentPrice >= activeTrade.takeProfit) {
          shouldClose = true;
          exitPrice = activeTrade.takeProfit;
        } else if (currentPrice <= activeTrade.stopLoss) {
          shouldClose = true;
          exitPrice = activeTrade.stopLoss;
        }
      } else {
        if (currentPrice <= activeTrade.takeProfit) {
          shouldClose = true;
          exitPrice = activeTrade.takeProfit;
        } else if (currentPrice >= activeTrade.stopLoss) {
          shouldClose = true;
          exitPrice = activeTrade.stopLoss;
        }
      }
      if (shouldClose) {
        activeTrade.exitTime = testCandles[i].time;
        activeTrade.exitPrice = exitPrice;
        activeTrade.pnl = activeTrade.signal === "BUY" ? exitPrice - activeTrade.entryPrice : activeTrade.entryPrice - exitPrice;
        activeTrade.pnlPct = activeTrade.pnl / activeTrade.entryPrice * 100;
        activeTrade.outcome = activeTrade.pnl >= 0 ? "WIN" : "LOSS";
        activeTrade.duration = activeTrade.exitTime - activeTrade.entryTime;
        equity += activeTrade.pnl;
        equityCurve.push(equity);
        activeTradeIndex = -1;
      }
    }
    if (signalResult && activeTradeIndex < 0) {
      const tradeId = `${symbol}_${testCandles[i].time}`;
      if (!tradeIds.has(tradeId)) {
        const mtf = signalResult.mtfFilters;
        const trade = {
          id: tradeId,
          symbol,
          signal: signalResult.signal,
          entryTime: testCandles[i].time,
          entryPrice: currentPrice,
          exitTime: 0,
          exitPrice: 0,
          stopLoss: signalResult.sl,
          takeProfit: signalResult.tp,
          outcome: "WIN",
          pnl: 0,
          pnlPct: 0,
          duration: 0,
          confidence: signalResult.confidence,
          mtfSnapshot: {
            weeklyRsi: mtf.weeklyRsi,
            dailyMa70: mtf.dailyMa70,
            h4Rsi: mtf.h4Rsi,
            h4MacdBullishDivergence: mtf.h4MacdBullishDivergence,
            h4CandleConfirmation: mtf.h4CandleConfirmation
          }
        };
        trades2.push(trade);
        activeTradeIndex = trades2.length - 1;
        tradeIds.add(tradeId);
      }
    }
    equityCurve.push(equity);
  }
  const metrics = calculateMetrics(trades2, equityCurve, equity);
  return { trades: trades2, metrics };
}
function calculateMetrics(trades2, equityCurve, finalEquity) {
  const closedTrades = trades2.filter((t2) => t2.exitTime > 0);
  const winTrades = closedTrades.filter((t2) => t2.outcome === "WIN");
  const lossTrades = closedTrades.filter((t2) => t2.outcome === "LOSS");
  const winRate = closedTrades.length > 0 ? winTrades.length / closedTrades.length * 100 : 0;
  const totalWins = winTrades.reduce((sum, t2) => sum + t2.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((sum, t2) => sum + t2.pnl, 0));
  const avgWin = winTrades.length > 0 ? totalWins / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? totalLosses / lossTrades.length : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  const totalPnL = finalEquity - 1e4;
  const totalPnLPct = totalPnL / 1e4 * 100;
  let maxDrawdown = 0;
  let peak = equityCurve[0] || 1e4;
  for (const eq2 of equityCurve) {
    if (eq2 > peak) peak = eq2;
    const dd = (peak - eq2) / peak * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev * Math.sqrt(252) : 0;
  const downReturns = returns.filter((r) => r < 0);
  const downVariance = downReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / (returns.length || 1);
  const downStdDev = Math.sqrt(downVariance);
  const sortino = downStdDev > 0 ? avgReturn / downStdDev * Math.sqrt(252) : 0;
  const avgDuration = closedTrades.length > 0 ? closedTrades.reduce((sum, t2) => sum + t2.duration, 0) / closedTrades.length : 0;
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map((t2) => t2.pnlPct)) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map((t2) => t2.pnlPct)) : 0;
  return {
    totalTrades: closedTrades.length,
    winTrades: winTrades.length,
    lossTrades: lossTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalPnLPct: Math.round(totalPnLPct * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    avgDuration,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    equityCurve
  };
}
async function optimizeStrategy(symbol, candles, paramRanges) {
  let bestMetrics = null;
  let bestParams = null;
  const adxSteps = [20, 22, 25, 28, 30];
  const rsiSteps = [30, 35, 40];
  const volSteps = [1.2, 1.5, 1.8];
  for (const adx of adxSteps) {
    for (const rsi of rsiSteps) {
      for (const vol of volSteps) {
        const result = await runBacktest(symbol, candles);
        if (!bestMetrics || result.metrics.profitFactor > bestMetrics.profitFactor) {
          bestMetrics = result.metrics;
          bestParams = { adxMin: adx, rsiRange: rsi, volumeMultiplier: vol };
        }
      }
    }
  }
  return {
    bestParams: bestParams || {},
    bestMetrics: bestMetrics || {}
  };
}

// server/trading/marketData.ts
async function fetchCandles(symbol, interval = "1d", range = "2y") {
  try {
    const yahooInterval = interval === "4h" ? "1h" : interval;
    console.log(`[MarketData] Fetching ${symbol} candles (${yahooInterval}, ${range})`);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${range}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status} for ${symbol}`);
    }
    const data = await response.json();
    const result = data.chart.result?.[0];
    if (!result || !result.timestamp || result.timestamp.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }
    const candles = [];
    const timestamps = result.timestamp;
    const ohlcv = result.indicators.quote[0];
    for (let i = 0; i < timestamps.length; i++) {
      if (ohlcv.open[i] === null || ohlcv.close[i] === null) continue;
      candles.push({
        time: timestamps[i] * 1e3,
        open: parseFloat(String(ohlcv.open[i])),
        high: parseFloat(String(ohlcv.high[i])),
        low: parseFloat(String(ohlcv.low[i])),
        close: parseFloat(String(ohlcv.close[i])),
        volume: parseFloat(String(ohlcv.volume[i])) || 0
      });
    }
    if (interval === "4h") {
      const aggregated = [];
      for (let i = 0; i < candles.length; i += 4) {
        const chunk = candles.slice(i, i + 4);
        if (chunk.length === 0) continue;
        aggregated.push({
          time: chunk[0].time,
          open: chunk[0].open,
          high: Math.max(...chunk.map((c) => c.high)),
          low: Math.min(...chunk.map((c) => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((sum, c) => sum + c.volume, 0)
        });
      }
      return aggregated;
    }
    return candles;
  } catch (error) {
    console.error(`[MarketData] Error fetching candles for ${symbol}:`, error);
    throw error;
  }
}

// server/routers/backtest.ts
var backtestRouter = router({
  runBacktest: publicProcedure.input(
    z3.object({
      symbol: z3.string().toUpperCase(),
      days: z3.number().default(90)
    })
  ).mutation(async ({ input }) => {
    try {
      if (input.days < 30 || input.days > 365) {
        throw new Error("Days must be between 30 and 365");
      }
      const candles = await fetchCandles(input.symbol, "1d", "1y");
      if (!candles || candles.length < 100) {
        throw new Error("Insufficient historical data for backtest");
      }
      const result = await runBacktest(input.symbol, candles);
      return {
        success: true,
        symbol: input.symbol,
        period: `${input.days} days`,
        trades: result.trades,
        metrics: result.metrics
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backtest failed";
      return {
        success: false,
        error: message
      };
    }
  }),
  optimizeStrategy: publicProcedure.input(
    z3.object({
      symbol: z3.string().toUpperCase(),
      days: z3.number().default(90)
    })
  ).mutation(async ({ input }) => {
    try {
      if (input.days < 30 || input.days > 365) {
        throw new Error("Days must be between 30 and 365");
      }
      const candles = await fetchCandles(input.symbol, "1d", "1y");
      if (!candles || candles.length < 100) {
        throw new Error("Insufficient historical data");
      }
      const result = await optimizeStrategy(input.symbol, candles, {
        adxMin: [20, 30],
        rsiRange: [30, 70],
        volumeMultiplier: [1.2, 1.8]
      });
      return {
        success: true,
        symbol: input.symbol,
        bestParams: result.bestParams,
        metrics: result.bestMetrics
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Optimization failed";
      return {
        success: false,
        error: message
      };
    }
  }),
  compareSymbols: publicProcedure.input(
    z3.object({
      symbols: z3.array(z3.string().toUpperCase()),
      days: z3.number().default(90)
    })
  ).mutation(async ({ input }) => {
    try {
      if (input.days < 30 || input.days > 365) {
        throw new Error("Days must be between 30 and 365");
      }
      const results = [];
      for (const symbol of input.symbols) {
        try {
          const candles = await fetchCandles(symbol, "1d", "1y");
          if (candles && candles.length >= 100) {
            const result = await runBacktest(symbol, candles);
            results.push({
              symbol,
              metrics: result.metrics,
              totalTrades: result.trades.length
            });
          }
        } catch (err) {
          console.error(`Failed to backtest ${symbol}:`, err);
        }
      }
      results.sort((a, b) => b.metrics.profitFactor - a.metrics.profitFactor);
      return {
        success: true,
        results
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Comparison failed";
      return {
        success: false,
        error: message
      };
    }
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  trading: tradingRouter,
  backtest: backtestRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  })
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/trading/engine.ts
init_db();
init_env();
init_telegram();
var MONITOR_INTERVAL = 15 * 60 * 1e3;
var SIGNAL_INTERVAL = 4 * 60 * 60 * 1e3;
var REPORT_INTERVAL = 5 * 60 * 1e3;
var recentSignals = /* @__PURE__ */ new Map();
var SIGNAL_COOLDOWN = 90 * 60 * 1e3;
async function initializeEngine() {
  console.log("[Engine] Initializing trading engine (MTF V3)...");
  if (ENV.telegramToken && ENV.telegramChatId) {
    initTelegram(ENV.telegramToken, ENV.telegramChatId);
  } else {
    console.warn("[Engine] Telegram credentials missing in ENV");
  }
  let symbols2 = await getSymbols();
  console.log(`[Engine] Database check: found ${symbols2.length} symbols.`);
  if (symbols2.length === 0) {
    console.log("[Engine] No symbols found, adding defaults...");
    const defaultSymbols = [
      { s: "AAPL", r: "US", sec: "Technology" },
      { s: "MSFT", r: "US", sec: "Technology" },
      { s: "NVDA", r: "US", sec: "Technology" },
      { s: "TSLA", r: "US", sec: "Technology" },
      { s: "AMZN", r: "US", sec: "Technology" },
      { s: "GOOGL", r: "US", sec: "Technology" },
      { s: "META", r: "US", sec: "Technology" },
      { s: "AMD", r: "US", sec: "Technology" },
      { s: "AVGO", r: "US", sec: "Technology" },
      { s: "NFLX", r: "US", sec: "Technology" },
      { s: "ADBE", r: "US", sec: "Technology" },
      { s: "CSCO", r: "US", sec: "Technology" },
      { s: "INTC", r: "US", sec: "Technology" },
      { s: "ORCL", r: "US", sec: "Technology" },
      { s: "CRM", r: "US", sec: "Technology" },
      { s: "QCOM", r: "US", sec: "Technology" },
      { s: "TXN", r: "US", sec: "Technology" },
      { s: "AMAT", r: "US", sec: "Technology" },
      { s: "MU", r: "US", sec: "Technology" },
      { s: "ISRG", r: "US", sec: "Technology" },
      { s: "PANW", r: "US", sec: "Technology" },
      { s: "LRCX", r: "US", sec: "Technology" },
      { s: "HON", r: "US", sec: "Technology" },
      { s: "SBUX", r: "US", sec: "Technology" },
      { s: "VRTX", r: "US", sec: "Technology" },
      { s: "REGN", r: "US", sec: "Technology" },
      { s: "ADI", r: "US", sec: "Technology" },
      { s: "KLAC", r: "US", sec: "Technology" },
      { s: "MDLZ", r: "US", sec: "Technology" },
      { s: "PYPL", r: "US", sec: "Technology" },
      { s: "V", r: "US", sec: "Blue Chip" },
      { s: "MA", r: "US", sec: "Blue Chip" },
      { s: "JPM", r: "US", sec: "Blue Chip" },
      { s: "UNH", r: "US", sec: "Blue Chip" },
      { s: "LLY", r: "US", sec: "Blue Chip" },
      { s: "XOM", r: "US", sec: "Blue Chip" },
      { s: "HD", r: "US", sec: "Blue Chip" },
      { s: "PG", r: "US", sec: "Blue Chip" },
      { s: "JNJ", r: "US", sec: "Blue Chip" },
      { s: "ABBV", r: "US", sec: "Blue Chip" },
      { s: "WMT", r: "US", sec: "Blue Chip" },
      { s: "COST", r: "US", sec: "Blue Chip" },
      { s: "BAC", r: "US", sec: "Blue Chip" },
      { s: "KO", r: "US", sec: "Blue Chip" },
      { s: "MRK", r: "US", sec: "Blue Chip" },
      { s: "CVX", r: "US", sec: "Blue Chip" },
      { s: "PEP", r: "US", sec: "Blue Chip" },
      { s: "TMO", r: "US", sec: "Blue Chip" },
      { s: "PFE", r: "US", sec: "Blue Chip" },
      { s: "LIN", r: "US", sec: "Blue Chip" },
      { s: "DIS", r: "US", sec: "Blue Chip" },
      { s: "ACN", r: "US", sec: "Blue Chip" },
      { s: "ABT", r: "US", sec: "Blue Chip" },
      { s: "DHR", r: "US", sec: "Blue Chip" },
      { s: "VZ", r: "US", sec: "Blue Chip" },
      { s: "NEE", r: "US", sec: "Blue Chip" },
      { s: "WFC", r: "US", sec: "Blue Chip" },
      { s: "PM", r: "US", sec: "Blue Chip" },
      { s: "NKE", r: "US", sec: "Blue Chip" },
      { s: "RTX", r: "US", sec: "Blue Chip" },
      { s: "LOW", r: "US", sec: "Blue Chip" },
      { s: "BMY", r: "US", sec: "Blue Chip" },
      { s: "COP", r: "US", sec: "Blue Chip" },
      { s: "UNP", r: "US", sec: "Blue Chip" },
      { s: "AMGN", r: "US", sec: "Blue Chip" },
      { s: "T", r: "US", sec: "Blue Chip" },
      { s: "GE", r: "US", sec: "Blue Chip" },
      { s: "AXP", r: "US", sec: "Blue Chip" },
      { s: "MS", r: "US", sec: "Blue Chip" },
      { s: "GS", r: "US", sec: "Blue Chip" },
      { s: "CAT", r: "US", sec: "Blue Chip" },
      { s: "EDP.LS", r: "PT", sec: "PSI" },
      { s: "GALP.LS", r: "PT", sec: "PSI" },
      { s: "BCP.LS", r: "PT", sec: "PSI" },
      { s: "JMT.LS", r: "PT", sec: "PSI" },
      { s: "EDPR.LS", r: "PT", sec: "PSI" },
      { s: "NOS.LS", r: "PT", sec: "PSI" },
      { s: "SON.LS", r: "PT", sec: "PSI" },
      { s: "CTT.LS", r: "PT", sec: "PSI" },
      { s: "RENE.LS", r: "PT", sec: "PSI" },
      { s: "NVG.LS", r: "PT", sec: "PSI" },
      { s: "ASML.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "SAP.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "MC.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "OR.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "TTE.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "SAN.MC", r: "EU", sec: "Euro Stoxx" },
      { s: "BBVA.MC", r: "EU", sec: "Euro Stoxx" },
      { s: "INGA.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "BNP.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "ISP.MI", r: "EU", sec: "Euro Stoxx" },
      { s: "PETR4.SA", r: "BR", sec: "B3" },
      { s: "VALE3.SA", r: "BR", sec: "B3" },
      { s: "ITUB4.SA", r: "BR", sec: "B3" },
      { s: "BBDC4.SA", r: "BR", sec: "B3" },
      { s: "ABEV3.SA", r: "BR", sec: "B3" },
      { s: "WEGE3.SA", r: "BR", sec: "B3" },
      { s: "PLTR", r: "US", sec: "Growth/Meme" },
      { s: "CRWD", r: "US", sec: "Growth/Meme" },
      { s: "COIN", r: "US", sec: "Growth/Meme" },
      { s: "SNOW", r: "US", sec: "Growth/Meme" },
      { s: "NET", r: "US", sec: "Growth/Meme" },
      { s: "DDOG", r: "US", sec: "Growth/Meme" },
      { s: "MSTR", r: "US", sec: "Growth/Meme" },
      { s: "RIVN", r: "US", sec: "Growth/Meme" },
      { s: "MARA", r: "US", sec: "Growth/Meme" },
      { s: "RIOT", r: "US", sec: "Growth/Meme" }
    ];
    await Promise.all(
      defaultSymbols.map(
        (item) => addSymbol(item.s, item.r, item.sec).catch(
          (e) => console.error(`[Engine] Failed to add default symbol ${item.s}:`, e)
        )
      )
    );
    symbols2 = await getSymbols();
  }
  const startupMsg = formatStartupNotification(symbols2.length);
  await sendTelegram(startupMsg);
  console.log("[Engine] Starting initial market scan...");
  await runTradingLoop();
}
function startBackgroundLoops() {
  console.log("[Engine] Starting background loops...");
  setInterval(runTradingLoop, SIGNAL_INTERVAL);
  setInterval(runMonitoringLoop, MONITOR_INTERVAL);
  setInterval(runDailyReport, REPORT_INTERVAL);
}
async function processSymbol(symbolStr) {
  const lastSignal = recentSignals.get(symbolStr);
  if (lastSignal && Date.now() - lastSignal < SIGNAL_COOLDOWN) {
    return false;
  }
  try {
    const [weeklyCandles, dailyCandles, h4Candles] = await Promise.all([
      fetchCandles(symbolStr, "1wk", "5y"),
      fetchCandles(symbolStr, "1d", "2y"),
      fetchCandles(symbolStr, "4h", "6mo")
    ]);
    const signal = generateMtfSignal({ weeklyCandles, dailyCandles, h4Candles });
    if (!signal) return false;
    recentSignals.set(symbolStr, Date.now());
    const mtf = signal.mtfFilters;
    const message = formatBuySignal(
      symbolStr,
      signal.price,
      signal.sl,
      signal.tp,
      signal.confidence,
      signal.rsi,
      signal.adx,
      signal.atr,
      signal.ema9,
      signal.ema21,
      signal.ema50,
      signal.macroTrend,
      signal.trendShort
    ) + `

<b>Filtros MTF V3:</b>
\u2022 RSI Semanal: ${mtf.weeklyRsi.toFixed(1)} ${mtf.weeklyRsiOk ? "\u2705" : "\u274C"} (&lt;50)
\u2022 Pre\xE7o vs MA70: ${signal.price.toFixed(2)} vs ${mtf.dailyMa70.toFixed(2)} ${mtf.dailyAboveMa70 ? "\u2705" : "\u274C"}
\u2022 RSI 4h: ${mtf.h4Rsi.toFixed(1)} ${mtf.h4RsiOk ? "\u2705" : "\u274C"} (&lt;40)
\u2022 MACD Diverg\xEAncia Bullish: ${mtf.h4MacdBullishDivergence ? "\u2705" : "\u274C"}
\u2022 Vela HH+HL: ${mtf.h4CandleConfirmation ? "\u2705" : "\u274C"}
\u2022 Score: ${signal.filterScore}%
\u2022 SL: ${signal.slPct}% | TP: ${signal.tpPct}% (R:R 1:3)
\u2022 Risco/posi\xE7\xE3o: 1% do capital`;
    await sendTelegram(message);
    console.log(`[Engine] BUY signal sent for ${symbolStr} @ ${signal.price}`);
    return true;
  } catch (error) {
    console.error(`[Engine] Error processing ${symbolStr}:`, error instanceof Error ? error.message : error);
    return false;
  }
}
async function runTradingLoop() {
  console.log("[Engine] Running trading signal scan (MTF V3)...");
  const symbols2 = await getSymbols();
  let signalsGenerated = 0;
  for (const symbol of symbols2) {
    try {
      const generated = await processSymbol(symbol.symbol);
      if (generated) signalsGenerated++;
    } catch (error) {
      console.error(`[Engine] Error processing ${symbol.symbol}:`, error);
    }
  }
  if (signalsGenerated === 0) {
    const message = formatNoSignalsMessage(symbols2.length);
    await sendTelegram(message);
  }
  console.log(`[Engine] Scan complete. Signals generated: ${signalsGenerated}`);
}
async function runMonitoringLoop() {
  console.log("[Engine] Monitoring loop tick.");
}
async function runDailyReport() {
  const now = /* @__PURE__ */ new Date();
  if (now.getUTCHours() === 8 && now.getUTCMinutes() < 5) {
    console.log("[Engine] Generating daily report...");
    try {
      const { formatDailyReport: formatDailyReport2 } = await Promise.resolve().then(() => (init_telegram(), telegram_exports));
      const date = now.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
      const message = formatDailyReport2(date, 0, 0, 0, 0, 0, 0);
      await sendTelegram(message);
    } catch (error) {
      console.error("[Engine] Error generating daily report:", error);
    }
  }
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    try {
      await initializeEngine();
      startBackgroundLoops();
    } catch (error) {
      console.error("[Server] Failed to start trading engine:", error);
    }
  });
}
startServer().catch(console.error);
