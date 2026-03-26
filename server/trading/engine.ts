/**
 * Trading Engine
 * Main orchestrator for signal generation, trade monitoring, and reporting.
 *
 * Estratégia de sinal (Multi-Timeframe V3):
 *  1. RSI Semanal < 50  → espaço macro para subir
 *  2. Preço Diário > MA70 → tendência de médio prazo bullish
 *  3. RSI 4h < 40       → pullback / sobrevenda intraday
 *  4. MACD 4h divergência bullish → momentum a recuperar
 *  5. Vela 4h de confirmação: High > High anterior E Low > Low anterior
 */

import {
  getActiveTrades,
  createTrade,
  updateTrade,
  createSignal,
  getDailyStats,
  updateOrCreateDailyStats,
  getSymbols,
  addSymbol,
} from "../db";
import { calcATR, Candle } from "./technicalAnalysis";
import { fetchCandles, fetchPrice, determineMacroTrend } from "./marketData";
import { generateMtfSignal, MultiTimeframeData } from "./technicalAnalysisV3";
import {
  initTelegram,
  sendTelegram,
  formatBuySignal,
  formatSellSignal,
  formatTradeClosedNotification,
  formatTrailingStopNotification,
  formatBreakevenNotification,
  formatDailyReport,
  formatStartupNotification,
  formatNoSignalsMessage,
} from "./telegram";
import { ENV } from "../_core/env";

const SIGNAL_COOLDOWN = 90 * 60 * 1000;       // 90 minutos
const MONITOR_INTERVAL = 4 * 60 * 60 * 1000;  // 4 horas
const TRADE_CHECK_INTERVAL = 15 * 60 * 1000;  // 15 minutos
const DAILY_REPORT_INTERVAL = 5 * 60 * 1000;  // 5 minutos
const RISK_PER_TRADE = 0.01;                   // 1% de risco por posição

interface LastSignalTracker {
  [symbol: string]: {
    signal: "BUY" | "SELL" | null;
    time: number;
    date: string;
  };
}

const lastSignals: LastSignalTracker = {};

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

export async function initializeEngine(): Promise<void> {
  console.log("[Engine] Initializing trading engine (MTF V3)...");

  // Initialize Telegram if credentials are provided
  if (ENV.telegramToken && ENV.telegramChatId) {
    initTelegram(ENV.telegramToken, ENV.telegramChatId);
  } else {
    console.warn("[Engine] Telegram credentials not found in environment variables");
  }

  let symbols = await getSymbols();
  
  // If no symbols are configured, add some defaults from environment or common ones
  if (symbols.length === 0) {
    console.log("[Engine] No symbols found in database, adding defaults...");
    const defaultSymbols = [
      { s: "AAPL", r: "US", sec: "Technology" },
      { s: "MSFT", r: "US", sec: "Technology" },
      { s: "GOOGL", r: "US", sec: "Technology" },
      { s: "AMZN", r: "US", sec: "Consumer Discretionary" },
      { s: "NVDA", r: "US", sec: "Technology" },
      { s: "TSLA", r: "US", sec: "Consumer Discretionary" },
      { s: "META", r: "US", sec: "Communication Services" },
      { s: "EDP.LS", r: "PT", sec: "Utilities" },
      { s: "JMT.LS", r: "PT", sec: "Consumer Staples" },
      { s: "GALP.LS", r: "PT", sec: "Energy" },
      { s: "BCP.LS", r: "PT", sec: "Financials" },
      { s: "NOS.LS", r: "PT", sec: "Communication Services" },
      { s: "BTCUSDT", r: "CRYPTO", sec: "Crypto" },
      { s: "ETHUSDT", r: "CRYPTO", sec: "Crypto" },
      { s: "BNBUSDT", r: "CRYPTO", sec: "Crypto" },
      { s: "SOLUSDT", r: "CRYPTO", sec: "Crypto" }
    ];
    for (const item of defaultSymbols) {
      try {
        await addSymbol(item.s, item.r, item.sec);
      } catch (e) {
        console.error(`[Engine] Failed to add default symbol ${item.s}:`, e);
      }
    }
    // RE-FETCH SYMBOLS TO ENSURE UI LOADS THEM
    symbols = await getSymbols();
  }
  
  console.log(`[Engine] Loaded ${symbols.length} symbols for monitoring`);

  symbols.forEach((sym) => {
    lastSignals[sym.symbol] = { signal: null, time: 0, date: "" };
  });

  const sent = await sendTelegram(formatStartupNotification(symbols.length));
  if (sent) {
    console.log("[Engine] Startup notification sent to Telegram.");
  } else {
    console.warn("[Engine] Telegram notification failed. Check token/chatId.");
  }
  console.log("[Engine] Trading engine initialized");
}

// ---------------------------------------------------------------------------
// Loop principal
// ---------------------------------------------------------------------------

export async function runTradingLoop(): Promise<void> {
  console.log("[Engine] Running trading loop (MTF V3)...");

  const symbols = await getSymbols();
  let signalsGenerated = 0;

  for (const sym of symbols) {
    try {
      const created = await processSymbol(sym.symbol);
      if (created) signalsGenerated++;
    } catch (error) {
      console.error(`[Engine] Error processing ${sym.symbol}:`, error);
    }
  }

  // Se nenhum sinal foi gerado em toda a lista, enviar notificação informativa
  if (signalsGenerated === 0 && symbols.length > 0) {
    await sendTelegram(formatNoSignalsMessage(symbols.length));
  }

  console.log(`[Engine] Trading loop completed. Signals generated: ${signalsGenerated}`);
}

// ---------------------------------------------------------------------------
// Processamento de símbolo
// ---------------------------------------------------------------------------

async function processSymbol(symbol: string): Promise<boolean> {
  try {
    // Buscar candles nos três timeframes em paralelo
    const [weeklyCandles, dailyCandles, h4Candles] = await Promise.all([
      fetchCandles(symbol, "1wk", "5y"),   // Semanal — para RSI semanal
      fetchCandles(symbol, "1d", "2y"),    // Diário  — para MA70
      fetchCandles(symbol, "4h", "6mo"),   // 4 horas — para RSI, MACD e confirmação de vela
    ]);

    if (dailyCandles.length === 0) {
      console.log(`[Engine] No data for ${symbol}`);
      return false;
    }

    // Montar estrutura multi-timeframe
    const mtfData: MultiTimeframeData = {
      weeklyCandles,
      dailyCandles,
      h4Candles,
    };

    // Gerar sinal com filtros MTF V3
    const result = generateMtfSignal(mtfData);

    if (!result) {
      console.log(`[Engine] ${symbol}: No MTF signal`);
      return false;
    }

    if (result.confidence < 65) {
      console.log(`[Engine] ${symbol}: Signal below confidence threshold (${result.confidence}%)`);
      return false;
    }

    // Verificar cooldown
    const now = Date.now();
    const lastSignal = lastSignals[symbol] ?? { signal: null, time: 0, date: "" };
    if (lastSignal.signal === result.signal && now - lastSignal.time < SIGNAL_COOLDOWN) {
      console.log(`[Engine] ${symbol}: Cooldown active`);
      return false;
    }

    // Verificar limite diário
    const today = new Date().toISOString().slice(0, 10);
    if (lastSignal.date === today && lastSignal.signal === result.signal) {
      console.log(`[Engine] ${symbol}: Daily limit reached for ${result.signal}`);
      return false;
    }

    // Registar trade
    const tradeId = `${symbol}_${now}`;
    const currentPrice = result.price;

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

    // Atualizar tracker
    lastSignals[symbol] = { signal: result.signal, time: now, date: today };

    // Enviar notificação Telegram com detalhes MTF
    const mtf = result.mtfFilters;
    const mtfDetails =
      `\n📊 *Filtros MTF:*` +
      `\n• RSI Semanal: ${mtf.weeklyRsi} ${mtf.weeklyRsiOk ? "✅" : "❌"} (< 50)` +
      `\n• Preço Diário vs MA70: ${mtf.dailyClose} vs ${mtf.dailyMa70} ${mtf.dailyAboveMa70 ? "✅" : "❌"}` +
      `\n• RSI 4h: ${mtf.h4Rsi} ${mtf.h4RsiOk ? "✅" : "❌"} (< 40)` +
      `\n• MACD Divergência Bullish: ${mtf.h4MacdBullishDivergence ? "✅" : "❌"}` +
      `\n• Vela 4h HH+HL: ${mtf.h4CandleConfirmation ? "✅" : "❌"} (H:${mtf.h4HigherHigh ? "↑" : "↓"} L:${mtf.h4HigherLow ? "↑" : "↓"})`;

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
          ) + mtfDetails
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
          ) + mtfDetails;

    await sendTelegram(message);
    console.log(
      `[Engine] ${symbol}: ${result.signal} signal (MTF V3) conf=${result.confidence}% | ` +
      `wRSI=${mtf.weeklyRsi} dMA70=${mtf.dailyAboveMa70} h4RSI=${mtf.h4Rsi} ` +
      `macdDiv=${mtf.h4MacdBullishDivergence} conf=${mtf.h4CandleConfirmation}`
    );

    return true;
  } catch (error) {
    console.error(`[Engine] Error processing ${symbol}:`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Monitorização de trades ativos
// ---------------------------------------------------------------------------

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

        // Breakeven a +1%
        if (profitPct >= 1.0 && Number(trade.stopLoss) < Number(trade.entryPrice)) {
          const newSl = Number(trade.entryPrice) * 1.001;
          await updateTrade(trade.tradeId, { stopLoss: String(newSl) as any });
          await sendTelegram(formatBreakevenNotification(trade.symbol, newSl));
        }
        // Trailing stop a +2%
        else if (profitPct >= 2.0 && Number(trade.stopLoss) < Number(trade.entryPrice) * 1.01) {
          const newSl = Number(trade.entryPrice) * 1.01;
          await updateTrade(trade.tradeId, { stopLoss: String(newSl) as any });
          await sendTelegram(formatTrailingStopNotification(trade.symbol, newSl));
        }

        if (price <= Number(trade.stopLoss)) {
          pnl = ((price - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100;
          outcome = pnl >= 0 ? "WIN" : "LOSS";
          closed = true;
        }
        if (price >= Number(trade.takeProfit)) {
          pnl = ((price - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100;
          outcome = "WIN";
          closed = true;
        }
      } else {
        // SELL
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

        const today = new Date().toISOString().slice(0, 10);
        const stats = await getDailyStats(today);
        const wins = (stats?.wins || 0) + (outcome === "WIN" ? 1 : 0);
        const losses = (stats?.losses || 0) + (outcome === "LOSS" ? 1 : 0);
        const totalPnl = String((Number(stats?.totalPnl) || 0) + pnl) as any;

        await updateOrCreateDailyStats(today, { wins, losses, totalPnl });

        const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
        await sendTelegram(
          formatTradeClosedNotification(trade.symbol, trade.signal, pnl, outcome, winRate, wins, losses)
        );
      }
    } catch (error) {
      console.error(`[Engine] Error monitoring ${trade.symbol}:`, error);
    }
  }
}

// ---------------------------------------------------------------------------
// Relatório diário
// ---------------------------------------------------------------------------

export async function sendDailyReport(): Promise<void> {
  const now = new Date();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();

  // Enviar às 08:00 UTC (09:00 Lisboa)
  if (hours !== 8 || minutes > 5) return;

  const today = new Date().toISOString().slice(0, 10);
  const stats = await getDailyStats(today);
  const trades = await getActiveTrades();

  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const totalPnl = Number(stats?.totalPnl) || 0;

  await sendTelegram(
    formatDailyReport(today, winRate, wins, losses, totalPnl, stats?.totalSignals || 0, trades.length)
  );
}

// ---------------------------------------------------------------------------
// Loops em background
// ---------------------------------------------------------------------------

export function startBackgroundLoops(): void {
  console.log("[Engine] Starting background loops (MTF V3)...");

  setInterval(runTradingLoop, MONITOR_INTERVAL);
  runTradingLoop(); // Executar imediatamente

  setInterval(monitorActiveTrades, TRADE_CHECK_INTERVAL);
  setInterval(sendDailyReport, DAILY_REPORT_INTERVAL);

  console.log("[Engine] Background loops started");
}
