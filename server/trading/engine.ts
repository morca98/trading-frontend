/**
 * Trading Engine
 * Main orchestrator for signal generation, trade monitoring, and reporting
 */

import {
  getActiveTrades,
  createTrade,
  updateTrade,
  createSignal,
  getDailyStats,
  updateOrCreateDailyStats,
  getSymbols,
} from "../db";
import { generateSignal, calcATR, Candle } from "./technicalAnalysis";
import { fetchCandles, fetchPrice, determineMacroTrend } from "./marketData";
import {
  sendTelegram,
  formatBuySignal,
  formatSellSignal,
  formatTradeClosedNotification,
  formatTrailingStopNotification,
  formatBreakevenNotification,
  formatDailyReport,
  formatStartupNotification,
} from "./telegram";

const SIGNAL_COOLDOWN = 90 * 60 * 1000; // 90 minutes
const MONITOR_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const TRADE_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
const DAILY_REPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface LastSignalTracker {
  [symbol: string]: {
    signal: "BUY" | "SELL" | null;
    time: number;
    date: string;
  };
}

const lastSignals: LastSignalTracker = {};

/**
 * Initialize trading engine
 */
export async function initializeEngine(): Promise<void> {
  console.log("[Engine] Initializing trading engine...");

  const symbols = await getSymbols();
  console.log(`[Engine] Loaded ${symbols.length} symbols for monitoring`);

  // Initialize last signal tracker
  symbols.forEach((sym) => {
    lastSignals[sym.symbol] = {
      signal: null,
      time: 0,
      date: "",
    };
  });

  // Send startup notification
  await sendTelegram(formatStartupNotification(symbols.length));

  console.log("[Engine] Trading engine initialized");
}

/**
 * Main trading loop - scan for new signals
 */
export async function runTradingLoop(): Promise<void> {
  console.log("[Engine] Running trading loop...");

  const symbols = await getSymbols();

  for (const sym of symbols) {
    try {
      await processSymbol(sym.symbol);
    } catch (error) {
      console.error(`[Engine] Error processing ${sym.symbol}:`, error);
    }
  }

  console.log("[Engine] Trading loop completed");
}

/**
 * Process a single symbol for signal generation
 */
async function processSymbol(symbol: string): Promise<void> {
  try {
    // Fetch candles
    const [dailyCandles, weeklyCandles] = await Promise.all([
      fetchCandles(symbol, "1d", "2y"),
      fetchCandles(symbol, "1wk", "5y"),
    ]);

    if (dailyCandles.length === 0) {
      console.log(`[Engine] No data for ${symbol}`);
      return;
    }

    const currentPrice = dailyCandles[dailyCandles.length - 1].close;
    const macroTrend = determineMacroTrend(weeklyCandles);

    // Calculate indicators
    const atr = calcATR(dailyCandles, 14);

    // Generate signal
    const result = generateSignal(dailyCandles, currentPrice, macroTrend, "NEUTRAL", atr);

    if (!result || result.confidence < 55) {
      console.log(`[Engine] ${symbol}: No signal (conf=${result?.confidence || "N/A"})`);
      return;
    }

    // Check cooldown
    const now = Date.now();
    const lastSignal = lastSignals[symbol];
    if (lastSignal.signal === result.signal && now - lastSignal.time < SIGNAL_COOLDOWN) {
      console.log(`[Engine] ${symbol}: Cooldown active`);
      return;
    }

    // Check daily limit
    const today = new Date().toISOString().slice(0, 10);
    if (lastSignal.date === today && lastSignal.signal === result.signal) {
      console.log(`[Engine] ${symbol}: Daily limit reached for ${result.signal}`);
      return;
    }

    // Create trade
    const tradeId = `${symbol}_${now}`;
    await createTrade({
      tradeId,
      symbol,
      signal: result.signal as "BUY" | "SELL",
      entryPrice: String(currentPrice) as any,
      stopLoss: String(result.sl) as any,
      takeProfit: String(result.tp) as any,
      slPct: String(result.slPct) as any,
      tpPct: String(result.tpPct) as any,
      confidence: result.confidence,
      rsi: String(result.rsi) as any,
      adx: String(result.adx) as any,
      atr: String(result.atr) as any,
      macroTrend: result.macroTrend,
      trendShort: result.trendShort,
      outcome: "OPEN",
    });

    // Create signal record
    await createSignal({
      symbol,
      signal: result.signal as "BUY" | "SELL",
      confidence: result.confidence,
      price: String(currentPrice) as any,
      rsi: String(result.rsi) as any,
      adx: String(result.adx) as any,
      macroTrend: result.macroTrend,
      trendShort: result.trendShort,
    });

    // Update tracker
    lastSignals[symbol] = {
      signal: result.signal,
      time: now,
      date: today,
    };

    // Send notification
    const message =
      result.signal === "BUY"
        ? formatBuySignal(
            symbol,
            currentPrice,
            result.sl,
            result.tp,
            result.confidence,
            result.rsi,
            result.adx,
            result.atr,
            result.ema9,
            result.ema21,
            result.ema50,
            result.macroTrend,
            result.trendShort
          )
        : formatSellSignal(
            symbol,
            currentPrice,
            result.sl,
            result.tp,
            result.confidence,
            result.rsi,
            result.adx,
            result.atr,
            result.ema9,
            result.ema21,
            result.ema50,
            result.macroTrend,
            result.trendShort
          );

    await sendTelegram(message);
    console.log(`[Engine] ${symbol}: ${result.signal} signal generated (conf=${result.confidence}%)`);
  } catch (error) {
    console.error(`[Engine] Error processing ${symbol}:`, error);
  }
}

/**
 * Monitor active trades for TP/SL
 */
export async function monitorActiveTrades(): Promise<void> {
  const trades = await getActiveTrades();

  for (const trade of trades) {
    try {
      const price = await fetchPrice(trade.symbol);
      let closed = false;
      let pnl = 0;
      let outcome = "";

      if (trade.signal === "BUY") {
        const profitPct = ((price - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100;

        // Breakeven at +1%
        if (profitPct >= 1.0 && Number(trade.stopLoss) < Number(trade.entryPrice)) {
          const newSl = Number(trade.entryPrice) * 1.001;
          await updateTrade(trade.tradeId, { stopLoss: String(newSl) as any });
          await sendTelegram(formatBreakevenNotification(trade.symbol, newSl));
        }
        // Trailing stop at +2%
        else if (profitPct >= 2.0 && Number(trade.stopLoss) < Number(trade.entryPrice) * 1.01) {
          const newSl = Number(trade.entryPrice) * 1.01;
          await updateTrade(trade.tradeId, { stopLoss: String(newSl) as any });
          await sendTelegram(formatTrailingStopNotification(trade.symbol, newSl));
        }

        // Check SL
        if (price <= Number(trade.stopLoss)) {
          pnl = ((price - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100;
          outcome = pnl >= 0 ? "WIN" : "LOSS";
          closed = true;
        }
        // Check TP
        if (price >= Number(trade.takeProfit)) {
          pnl = ((price - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100;
          outcome = "WIN";
          closed = true;
        }
      } else {
        // SELL logic
        const profitPct = ((Number(trade.entryPrice) - price) / Number(trade.entryPrice)) * 100;

        if (profitPct >= 1.0 && Number(trade.stopLoss) > Number(trade.entryPrice)) {
          const newSl = Number(trade.entryPrice) * 0.999;
          await updateTrade(trade.tradeId, { stopLoss: String(newSl) as any });
          await sendTelegram(formatBreakevenNotification(trade.symbol, newSl));
        } else if (profitPct >= 2.0 && Number(trade.stopLoss) > Number(trade.entryPrice) * 0.99) {
          const newSl = Number(trade.entryPrice) * 0.99;
          await updateTrade(trade.tradeId, { stopLoss: String(newSl) as any });
          await sendTelegram(formatTrailingStopNotification(trade.symbol, newSl));
        }

        if (price >= Number(trade.stopLoss)) {
          pnl = ((Number(trade.entryPrice) - price) / Number(trade.entryPrice)) * 100;
          outcome = pnl >= 0 ? "WIN" : "LOSS";
          closed = true;
        }
        if (price <= Number(trade.takeProfit)) {
          pnl = ((Number(trade.entryPrice) - price) / Number(trade.entryPrice)) * 100;
          outcome = "WIN";
          closed = true;
        }
      }

      if (closed) {
        await updateTrade(trade.tradeId, {
          outcome: outcome === "WIN" ? "WIN" : "LOSS",
          exitPrice: String(price) as any,
          pnl: String(pnl) as any,
          closedAt: new Date(),
        });

        // Update daily stats
        const today = new Date().toISOString().slice(0, 10);
        const stats = await getDailyStats(today);
        const wins = (stats?.wins || 0) + (outcome === "WIN" ? 1 : 0);
        const losses = (stats?.losses || 0) + (outcome === "LOSS" ? 1 : 0);
        const totalPnl = String((Number(stats?.totalPnl) || 0) + pnl) as any;

        await updateOrCreateDailyStats(today, {
          wins,
          losses,
          totalPnl,
        });

        const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
        await sendTelegram(formatTradeClosedNotification(trade.symbol, trade.signal, pnl, outcome, winRate, wins, losses));
      }
    } catch (error) {
      console.error(`[Engine] Error monitoring ${trade.symbol}:`, error);
    }
  }
}

/**
 * Send daily report
 */
export async function sendDailyReport(): Promise<void> {
  const now = new Date();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();

  // Send at 08:00 UTC (09:00 Lisbon)
  if (hours !== 8 || minutes > 5) return;

  const today = new Date().toISOString().slice(0, 10);
  const stats = await getDailyStats(today);
  const trades = await getActiveTrades();

  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const totalPnl = Number(stats?.totalPnl) || 0;

  await sendTelegram(formatDailyReport(today, winRate, wins, losses, totalPnl, stats?.totalSignals || 0, trades.length));
}

/**
 * Start background loops
 */
export function startBackgroundLoops(): void {
  console.log("[Engine] Starting background loops...");

  // Trading loop - every 4 hours
  setInterval(runTradingLoop, MONITOR_INTERVAL);
  runTradingLoop(); // Run immediately

  // Trade monitor - every 15 minutes
  setInterval(monitorActiveTrades, TRADE_CHECK_INTERVAL);

  // Daily reporter - every 5 minutes
  setInterval(sendDailyReport, DAILY_REPORT_INTERVAL);

  console.log("[Engine] Background loops started");
}
