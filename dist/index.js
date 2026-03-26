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

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
var symbols = mysqlTable("symbols", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  region: varchar("region", { length: 10 }).default("US").notNull(),
  enabled: int("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var trades = mysqlTable("trades", {
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
var signals = mysqlTable("signals", {
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
var dailyStats = mysqlTable("dailyStats", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  totalPnl: decimal("totalPnl", { precision: 12, scale: 4 }).default("0").notNull(),
  totalSignals: int("totalSignals").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
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
async function getSymbols() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(symbols).where(eq(symbols.enabled, 1));
  } catch (error) {
    console.error("[Database] Failed to get symbols:", error);
    return [];
  }
}
async function addSymbol(symbol, region = "US") {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(symbols).values({ symbol, region });
  } catch (error) {
    console.error("[Database] Failed to add symbol:", error);
    throw error;
  }
}

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
import { z as z2 } from "zod";
var tradingRouter = router({
  // Get all active trades
  getActiveTrades: protectedProcedure.query(async () => {
    return await getActiveTrades();
  }),
  // Get signals by symbol
  getSignals: protectedProcedure.input(
    z2.object({
      symbol: z2.string(),
      limit: z2.number().optional().default(50)
    })
  ).query(async ({ input }) => {
    return await getSignalsBySymbol(input.symbol, input.limit);
  }),
  // Get daily stats
  getDailyStats: protectedProcedure.input(z2.object({ date: z2.string() })).query(async ({ input }) => {
    return await getDailyStats(input.date);
  }),
  // Get configured symbols
  getSymbols: protectedProcedure.query(async () => {
    return await getSymbols();
  }),
  // Add new symbol to monitor
  addSymbol: protectedProcedure.input(
    z2.object({
      symbol: z2.string().toUpperCase(),
      region: z2.enum(["US", "PT", "EU", "BR"]).optional().default("US")
    })
  ).mutation(async ({ input }) => {
    await addSymbol(input.symbol, input.region);
    return { success: true, symbol: input.symbol };
  })
});

// server/routers/backtest.ts
import { z as z3 } from "zod";

// server/trading/technicalAnalysis.ts
function calcEMALine(data, period) {
  if (!data || data.length < period) return data.map(() => 0);
  const k = 2 / (period + 1);
  const result = new Array(data.length).fill(0);
  result[period - 1] = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
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
function calcTrend(closes) {
  if (closes.length < 10) return "NEUTRAL";
  const current = closes[closes.length - 1];
  const prev = closes[closes.length - 10];
  return current > prev ? "BULL" : "BEAR";
}

// server/trading/technicalAnalysisV2.ts
function calcAvgVolume(candles, period = 20) {
  if (candles.length < period) return 0;
  const recentVolumes = candles.slice(-period).map((c) => c.volume);
  return recentVolumes.reduce((a, b) => a + b, 0) / period;
}
function calcVolatility(candles, period = 20) {
  if (candles.length < period) return 0;
  const closes = candles.slice(-period).map((c) => c.close);
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}
function detectCandlePattern(candle, prevCandle) {
  const bodySize = Math.abs(candle.close - candle.open);
  const totalSize = candle.high - candle.low;
  const bodyRatio = bodySize / totalSize;
  if (bodyRatio < 0.1) return "DOJI";
  if (candle.close > candle.open && candle.open - candle.low > bodySize * 2) return "HAMMER";
  if (candle.close < candle.open && candle.open - candle.low > bodySize * 2) return "HANGINGMAN";
  if (candle.close > candle.open && prevCandle.close < prevCandle.open && candle.open < prevCandle.close && candle.close > prevCandle.open) {
    return "BULLISH_ENGULFING";
  }
  if (candle.close < candle.open && prevCandle.close > prevCandle.open && candle.open > prevCandle.close && candle.close < prevCandle.open) {
    return "BEARISH_ENGULFING";
  }
  if (candle.high === candle.close && candle.low === candle.open) return "MARUBOZU_UP";
  if (candle.high === candle.open && candle.low === candle.close) return "MARUBOZU_DOWN";
  return "NEUTRAL";
}
function calcStochasticRSI(closes, period = 14, smoothK = 3, smoothD = 3) {
  if (closes.length < period + smoothK + smoothD) return { k: 50, d: 50 };
  const rsiValues = [];
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period; j < i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsiValues.push(rsi);
  }
  const lookback = 14;
  const minRSI = Math.min(...rsiValues.slice(-lookback));
  const maxRSI = Math.max(...rsiValues.slice(-lookback));
  const currentRSI = rsiValues[rsiValues.length - 1];
  let k = maxRSI === minRSI ? 50 : (currentRSI - minRSI) / (maxRSI - minRSI) * 100;
  const kValues = [];
  for (let i = Math.max(0, rsiValues.length - lookback); i < rsiValues.length; i++) {
    const rsi = rsiValues[i];
    const minR = Math.min(...rsiValues.slice(Math.max(0, i - 14), i + 1));
    const maxR = Math.max(...rsiValues.slice(Math.max(0, i - 14), i + 1));
    kValues.push(maxR === minR ? 50 : (rsi - minR) / (maxR - minR) * 100);
  }
  if (kValues.length >= smoothK) {
    k = kValues.slice(-smoothK).reduce((a, b) => a + b, 0) / smoothK;
  }
  let d = 50;
  if (kValues.length >= smoothK + smoothD) {
    const dValues = kValues.slice(-smoothK - smoothD);
    d = dValues.reduce((a, b) => a + b, 0) / smoothD;
  }
  return { k: Math.round(k * 100) / 100, d: Math.round(d * 100) / 100 };
}
function calcMACD(closes) {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  let ema12 = closes[0];
  let ema26 = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12);
    ema26 = closes[i] * k26 + ema26 * (1 - k26);
  }
  const macd = ema12 - ema26;
  const k9 = 2 / (9 + 1);
  let signal = macd;
  signal = macd;
  return {
    macd: Math.round(macd * 1e4) / 1e4,
    signal: Math.round(signal * 1e4) / 1e4,
    histogram: Math.round((macd - signal) * 1e4) / 1e4
  };
}
function generateEnhancedSignal(candles, price, macroTrend, trendShort, atr) {
  if (candles.length < 100) return null;
  const closes = candles.map((c) => c.close);
  const rsi = calcRSI(closes);
  const adx = calcADX(candles);
  const stochRSI = calcStochasticRSI(closes);
  const macd = calcMACD(closes);
  const avgVolume = calcAvgVolume(candles);
  const volatility = calcVolatility(candles);
  const ema9Line = calcEMALine(closes, 9);
  const ema21Line = calcEMALine(closes, 21);
  const ema50Line = calcEMALine(closes, 50);
  const ema200Line = calcEMALine(closes, 200);
  const len = ema9Line.length;
  if (len < 3) return null;
  const ema9 = ema9Line[len - 1];
  const ema21 = ema21Line[len - 1];
  const ema50 = ema50Line[len - 1];
  const ema200 = ema200Line[len - 1];
  const ema9PrevAbove = ema9Line[len - 2] > ema21Line[len - 2];
  const ema9CurrAbove = ema9 > ema21;
  const crossedUp = !ema9PrevAbove && ema9CurrAbove;
  const crossedDown = ema9PrevAbove && !ema9CurrAbove;
  const currentVolume = candles[candles.length - 1].volume;
  const volHigh = currentVolume > avgVolume * 1.3;
  const prevCandle = candles[candles.length - 2];
  const pattern = detectCandlePattern(candles[candles.length - 1], prevCandle);
  const filters = {
    adxFilter: adx >= 25,
    volumeFilter: volHigh,
    rsiFilter: rsi > 30 && rsi < 70,
    trendFilter: macroTrend === "BULL" || macroTrend === "BEAR",
    candleConfirmation: pattern !== "NEUTRAL",
    emaDistanceFilter: Math.abs(price - ema21) / price < 0.015,
    volatilityFilter: volatility > 5e-3 && volatility < 0.08
  };
  const filterScore = Object.values(filters).filter(Boolean).length / Object.keys(filters).length;
  if (filterScore < 0.6) return null;
  if (!filters.adxFilter) return null;
  if (!filters.rsiFilter) return null;
  if (!filters.volumeFilter) return null;
  let signal = null;
  if (crossedUp && ema21 > ema50 && ema50 > ema200 && macroTrend !== "BEAR") {
    if (stochRSI.k < 80 && macd.histogram > 0) {
      signal = "BUY";
    }
  }
  if (!signal && crossedDown && ema21 < ema50 && ema50 < ema200 && macroTrend !== "BULL") {
    if (stochRSI.k > 20 && macd.histogram < 0) {
      signal = "SELL";
    }
  }
  if (signal === "BUY") {
    if (rsi > 65) return null;
    if (price < ema50 * 0.95) return null;
    if (pattern === "BEARISH_ENGULFING" || pattern === "HANGINGMAN") return null;
  }
  if (signal === "SELL") {
    if (rsi < 35) return null;
    if (price > ema50 * 1.05) return null;
    if (pattern === "BULLISH_ENGULFING" || pattern === "HAMMER") return null;
  }
  if (!signal) return null;
  const atrPct = atr / price;
  const slPct = Math.max(8e-3, Math.min(0.02, atrPct * 1.5));
  const sl = signal === "BUY" ? price * (1 - slPct) : price * (1 + slPct);
  const rrMultiplier = adx > 35 ? 3.5 : adx > 30 ? 3 : 2.5;
  const tp = signal === "BUY" ? price * (1 + slPct * rrMultiplier) : price * (1 - slPct * rrMultiplier);
  let confidence = 60;
  confidence += (adx - 25) * 0.5;
  confidence += filterScore * 10;
  if (stochRSI.k < 20 || stochRSI.k > 80) confidence += 5;
  if (macd.histogram > 0 && signal === "BUY") confidence += 3;
  if (macd.histogram < 0 && signal === "SELL") confidence += 3;
  if (pattern !== "NEUTRAL") confidence += 2;
  confidence = Math.min(99, Math.round(confidence));
  const signalStrength = (filterScore * 0.4 + adx / 50 * 0.3 + confidence / 100 * 0.3) * 100;
  return {
    signal,
    confidence,
    price,
    sl,
    tp,
    rsi: Math.round(rsi * 100) / 100,
    ema9: Math.round(ema9 * 100) / 100,
    ema21: Math.round(ema21 * 100) / 100,
    ema50: Math.round(ema50 * 100) / 100,
    ema200: Math.round(ema200 * 100) / 100,
    macroTrend,
    trendShort,
    adx: Math.round(adx * 100) / 100,
    atr: Math.round(atr * 100) / 100,
    slPct: Math.round(slPct * 1e4) / 100,
    tpPct: Math.round(slPct * rrMultiplier * 1e4) / 100,
    filters,
    filterScore: Math.round(filterScore * 1e4) / 100,
    signalStrength: Math.round(signalStrength)
  };
}

// server/trading/backtest.ts
async function runBacktest(symbol, candles, startDate, endDate) {
  if (candles.length < 200) {
    throw new Error("Insufficient data for backtest (minimum 200 candles required)");
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
  for (let i = 100; i < testCandles.length; i++) {
    const currentCandles = testCandles.slice(Math.max(0, i - 100), i + 1);
    const currentPrice = testCandles[i].close;
    const atr = calcATR(currentCandles);
    const weeklyCandles = testCandles.slice(Math.max(0, i - 50), i + 1);
    const macroTrend = calcTrend(weeklyCandles.map((c) => c.close));
    const trendShort = calcTrend(currentCandles.slice(-10).map((c) => c.close));
    const signalResult = generateEnhancedSignal(currentCandles, currentPrice, macroTrend, trendShort, atr);
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
          confidence: signalResult.confidence
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
  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    const drawdown = (peak - equity) / peak * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev * Math.sqrt(252) : 0;
  const downReturns = returns.filter((r) => r < 0);
  const downVariance = downReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / returns.length;
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
    console.log(`[MarketData] Fetching ${symbol} candles (${interval}, ${range})`);
    const mockResponse = {
      chart: {
        result: [
          {
            meta: {
              symbol,
              currency: "USD",
              regularMarketPrice: 150,
              fiftyTwoWeekHigh: 200,
              fiftyTwoWeekLow: 100
            },
            timestamp: [],
            indicators: {
              quote: [
                {
                  open: [],
                  high: [],
                  low: [],
                  close: [],
                  volume: []
                }
              ]
            }
          }
        ]
      }
    };
    const result = mockResponse.chart.result[0];
    if (!result || result.timestamp.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }
    const candles = [];
    const timestamps = result.timestamp;
    const ohlcv = result.indicators.quote[0];
    for (let i = 0; i < timestamps.length; i++) {
      if (!ohlcv.open[i] || !ohlcv.close[i]) continue;
      candles.push({
        time: timestamps[i] * 1e3,
        open: parseFloat(String(ohlcv.open[i])),
        high: parseFloat(String(ohlcv.high[i])),
        low: parseFloat(String(ohlcv.low[i])),
        close: parseFloat(String(ohlcv.close[i])),
        volume: parseFloat(String(ohlcv.volume[i])) || 0
      });
    }
    return candles;
  } catch (error) {
    console.error(`[MarketData] Error fetching candles for ${symbol}:`, error);
    throw error;
  }
}

// server/routers/backtest.ts
var backtestRouter = router({
  runBacktest: protectedProcedure.input(
    z3.object({
      symbol: z3.string().toUpperCase(),
      days: z3.number().default(90)
    })
  ).mutation(async ({ input }) => {
    try {
      if (input.days < 30 || input.days > 365) {
        throw new Error("Days must be between 30 and 365");
      }
      const candles = await fetchCandles(input.symbol, "1d", "2y");
      if (!candles || candles.length < 200) {
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
  optimizeStrategy: protectedProcedure.input(
    z3.object({
      symbol: z3.string().toUpperCase(),
      days: z3.number().default(90)
    })
  ).mutation(async ({ input }) => {
    try {
      if (input.days < 30 || input.days > 365) {
        throw new Error("Days must be between 30 and 365");
      }
      const candles = await fetchCandles(input.symbol, "1d", "2y");
      if (!candles || candles.length < 200) {
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
  compareSymbols: protectedProcedure.input(
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
          const candles = await fetchCandles(symbol, "1d", "2y");
          if (candles && candles.length >= 200) {
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
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
