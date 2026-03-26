import { getSymbols, addSymbol } from "../db";
import { ENV } from "../_core/env";
import { initTelegram, sendTelegram, formatBuySignal, formatNoSignalsMessage, formatStartupNotification } from "./telegram";
import { fetchCandles } from "./marketData";
import { generateMtfSignal } from "./technicalAnalysisV3";

const MONITOR_INTERVAL  = 15 * 60 * 1000;      // 15 minutos
const SIGNAL_INTERVAL   = 4 * 60 * 60 * 1000;  // 4 horas
const REPORT_INTERVAL   = 5 * 60 * 1000;        // 5 minutos (para verificar as 08:00 UTC)

export const INITIAL_CAPITAL = 10000;
export const RISK_PER_TRADE = 0.01; // 1% de risco por posição

// ── Registo de sinais recentes (evitar duplicados) ────────────────────────────
const recentSignals = new Map<string, number>();
const SIGNAL_COOLDOWN = 90 * 60 * 1000; // 90 minutos

// ── Inicialização do engine ───────────────────────────────────────────────────

export async function initializeEngine(): Promise<void> {
  console.log("[Engine] Initializing trading engine (MTF V3)...");

  // Inicializar Telegram
  if (ENV.telegramToken && ENV.telegramChatId) {
    initTelegram(ENV.telegramToken, ENV.telegramChatId);
  } else {
    console.warn("[Engine] Telegram credentials missing in ENV");
  }

  // Garantir que existem símbolos na base de dados
  let symbols = await getSymbols();
  console.log(`[Engine] Database check: found ${symbols.length} symbols.`);

  if (symbols.length === 0) {
    console.log("[Engine] No symbols found, adding defaults...");
    const defaultSymbols = [
      { s: "AAPL",    r: "US", sec: "Technology" },
      { s: "MSFT",    r: "US", sec: "Technology" },
      { s: "NVDA",    r: "US", sec: "Technology" },
      { s: "TSLA",    r: "US", sec: "Technology" },
      { s: "AMZN",    r: "US", sec: "Technology" },
      { s: "GOOGL",   r: "US", sec: "Technology" },
      { s: "META",    r: "US", sec: "Technology" },
      { s: "AMD",     r: "US", sec: "Technology" },
      { s: "AVGO",    r: "US", sec: "Technology" },
      { s: "NFLX",    r: "US", sec: "Technology" },
      { s: "ADBE",    r: "US", sec: "Technology" },
      { s: "CSCO",    r: "US", sec: "Technology" },
      { s: "INTC",    r: "US", sec: "Technology" },
      { s: "ORCL",    r: "US", sec: "Technology" },
      { s: "CRM",     r: "US", sec: "Technology" },
      { s: "QCOM",    r: "US", sec: "Technology" },
      { s: "TXN",     r: "US", sec: "Technology" },
      { s: "AMAT",    r: "US", sec: "Technology" },
      { s: "MU",      r: "US", sec: "Technology" },
      { s: "ISRG",    r: "US", sec: "Technology" },
      { s: "PANW",    r: "US", sec: "Technology" },
      { s: "LRCX",    r: "US", sec: "Technology" },
      { s: "HON",     r: "US", sec: "Technology" },
      { s: "SBUX",    r: "US", sec: "Technology" },
      { s: "VRTX",    r: "US", sec: "Technology" },
      { s: "REGN",    r: "US", sec: "Technology" },
      { s: "ADI",     r: "US", sec: "Technology" },
      { s: "KLAC",    r: "US", sec: "Technology" },
      { s: "MDLZ",    r: "US", sec: "Technology" },
      { s: "PYPL",    r: "US", sec: "Technology" },
      { s: "V",       r: "US", sec: "Blue Chip" },
      { s: "MA",      r: "US", sec: "Blue Chip" },
      { s: "JPM",     r: "US", sec: "Blue Chip" },
      { s: "UNH",     r: "US", sec: "Blue Chip" },
      { s: "LLY",     r: "US", sec: "Blue Chip" },
      { s: "XOM",     r: "US", sec: "Blue Chip" },
      { s: "HD",      r: "US", sec: "Blue Chip" },
      { s: "PG",      r: "US", sec: "Blue Chip" },
      { s: "JNJ",     r: "US", sec: "Blue Chip" },
      { s: "ABBV",    r: "US", sec: "Blue Chip" },
      { s: "WMT",     r: "US", sec: "Blue Chip" },
      { s: "COST",    r: "US", sec: "Blue Chip" },
      { s: "BAC",     r: "US", sec: "Blue Chip" },
      { s: "KO",      r: "US", sec: "Blue Chip" },
      { s: "MRK",     r: "US", sec: "Blue Chip" },
      { s: "CVX",     r: "US", sec: "Blue Chip" },
      { s: "PEP",     r: "US", sec: "Blue Chip" },
      { s: "TMO",     r: "US", sec: "Blue Chip" },
      { s: "PFE",     r: "US", sec: "Blue Chip" },
      { s: "LIN",     r: "US", sec: "Blue Chip" },
      { s: "DIS",     r: "US", sec: "Blue Chip" },
      { s: "ACN",     r: "US", sec: "Blue Chip" },
      { s: "ABT",     r: "US", sec: "Blue Chip" },
      { s: "DHR",     r: "US", sec: "Blue Chip" },
      { s: "VZ",      r: "US", sec: "Blue Chip" },
      { s: "NEE",     r: "US", sec: "Blue Chip" },
      { s: "WFC",     r: "US", sec: "Blue Chip" },
      { s: "PM",      r: "US", sec: "Blue Chip" },
      { s: "NKE",     r: "US", sec: "Blue Chip" },
      { s: "RTX",     r: "US", sec: "Blue Chip" },
      { s: "LOW",     r: "US", sec: "Blue Chip" },
      { s: "BMY",     r: "US", sec: "Blue Chip" },
      { s: "COP",     r: "US", sec: "Blue Chip" },
      { s: "UNP",     r: "US", sec: "Blue Chip" },
      { s: "AMGN",    r: "US", sec: "Blue Chip" },
      { s: "T",       r: "US", sec: "Blue Chip" },
      { s: "GE",      r: "US", sec: "Blue Chip" },
      { s: "AXP",     r: "US", sec: "Blue Chip" },
      { s: "MS",      r: "US", sec: "Blue Chip" },
      { s: "GS",      r: "US", sec: "Blue Chip" },
      { s: "CAT",     r: "US", sec: "Blue Chip" },
      { s: "EDP.LS",  r: "PT", sec: "PSI" },
      { s: "GALP.LS", r: "PT", sec: "PSI" },
      { s: "BCP.LS",  r: "PT", sec: "PSI" },
      { s: "JMT.LS",  r: "PT", sec: "PSI" },
      { s: "EDPR.LS", r: "PT", sec: "PSI" },
      { s: "NOS.LS",  r: "PT", sec: "PSI" },
      { s: "SON.LS",  r: "PT", sec: "PSI" },
      { s: "CTT.LS",  r: "PT", sec: "PSI" },
      { s: "RENE.LS", r: "PT", sec: "PSI" },
      { s: "NVG.LS",  r: "PT", sec: "PSI" },
      { s: "ASML.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "SAP.DE",  r: "EU", sec: "Euro Stoxx" },
      { s: "MC.PA",   r: "EU", sec: "Euro Stoxx" },
      { s: "OR.PA",   r: "EU", sec: "Euro Stoxx" },
      { s: "TTE.PA",  r: "EU", sec: "Euro Stoxx" },
      { s: "SAN.MC",  r: "EU", sec: "Euro Stoxx" },
      { s: "BBVA.MC", r: "EU", sec: "Euro Stoxx" },
      { s: "INGA.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "BNP.PA",  r: "EU", sec: "Euro Stoxx" },
      { s: "ISP.MI",  r: "EU", sec: "Euro Stoxx" },
      { s: "PETR4.SA",r: "BR", sec: "B3" },
      { s: "VALE3.SA",r: "BR", sec: "B3" },
      { s: "ITUB4.SA",r: "BR", sec: "B3" },
      { s: "BBDC4.SA",r: "BR", sec: "B3" },
      { s: "ABEV3.SA",r: "BR", sec: "B3" },
      { s: "WEGE3.SA",r: "BR", sec: "B3" },
      { s: "PLTR",    r: "US", sec: "Growth/Meme" },
      { s: "CRWD",    r: "US", sec: "Growth/Meme" },
      { s: "COIN",    r: "US", sec: "Growth/Meme" },
      { s: "SNOW",    r: "US", sec: "Growth/Meme" },
      { s: "NET",     r: "US", sec: "Growth/Meme" },
      { s: "DDOG",    r: "US", sec: "Growth/Meme" },
      { s: "MSTR",    r: "US", sec: "Growth/Meme" },
      { s: "RIVN",    r: "US", sec: "Growth/Meme" },
      { s: "MARA",    r: "US", sec: "Growth/Meme" },
      { s: "RIOT",    r: "US", sec: "Growth/Meme" },
    ];
    await Promise.all(
      defaultSymbols.map(item =>
        addSymbol(item.s, item.r, item.sec).catch(e =>
          console.error(`[Engine] Failed to add default symbol ${item.s}:`, e)
        )
      )
    );
    symbols = await getSymbols();
  }

  // Enviar mensagem de arranque para o Telegram
  const startupMsg = formatStartupNotification(symbols.length);
  const sent = await sendTelegram(startupMsg);
  if (sent) {
    console.log("[Engine] Startup notification sent to Telegram.");
  } else {
    console.error("[Engine] Failed to send startup notification to Telegram.");
  }

  // Primeiro scan imediato
  console.log("[Engine] Starting initial market scan...");
  try {
    await runTradingLoop();
  } catch (error) {
    console.error("[Engine] Initial market scan failed:", error);
  }
}

// ── Loops de background (iniciados após o servidor estar pronto) ──────────────

export function startBackgroundLoops(): void {
  console.log("[Engine] Starting background loops...");
  setInterval(runTradingLoop,    SIGNAL_INTERVAL);
  setInterval(runMonitoringLoop, MONITOR_INTERVAL);
  setInterval(runDailyReport,    REPORT_INTERVAL);
}

// ── Processar um símbolo individual ──────────────────────────────────────────

export async function processSymbol(symbolStr: string): Promise<boolean> {
  // Verificar cooldown
  const lastSignal = recentSignals.get(symbolStr);
  if (lastSignal && Date.now() - lastSignal < SIGNAL_COOLDOWN) {
    return false;
  }

  try {
    // Buscar candles nos 3 timeframes em paralelo
    const [weeklyCandles, dailyCandles, h4Candles] = await Promise.all([
      fetchCandles(symbolStr, "1wk", "5y"),
      fetchCandles(symbolStr, "1d",  "2y"),
      fetchCandles(symbolStr, "4h",  "6mo"),
    ]);

    // Gerar sinal MTF V3
    const signal = generateMtfSignal({ weeklyCandles, dailyCandles, h4Candles });

    if (!signal) return false;

    // Registar cooldown
    recentSignals.set(symbolStr, Date.now());

    // Formatar e enviar mensagem Telegram com detalhe dos filtros MTF
    const mtf = signal.mtfFilters;
    const message =
      formatBuySignal(
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
        signal.trendShort,
      ) +
      `\n\n<b>Filtros MTF V3:</b>\n` +
      `• RSI Semanal: ${mtf.weeklyRsi.toFixed(1)} ${mtf.weeklyRsiOk ? "✅" : "❌"} (&lt;50)\n` +
      `• Preço vs MA70: ${signal.price.toFixed(2)} vs ${mtf.dailyMa70.toFixed(2)} ${mtf.dailyAboveMa70 ? "✅" : "❌"}\n` +
      `• RSI 4h: ${mtf.h4Rsi.toFixed(1)} ${mtf.h4RsiOk ? "✅" : "❌"} (&lt;40)\n` +
      `• MACD Divergência Bullish: ${mtf.h4MacdBullishDivergence ? "✅" : "❌"}\n` +
      `• Vela HH+HL: ${mtf.h4CandleConfirmation ? "✅" : "❌"}\n` +
      `• Score: ${signal.filterScore}%\n` +
      `• SL: ${signal.slPct}% | TP: ${signal.tpPct}% (R:R 1:3)\n` +
      `• Capital Inicial: $${INITIAL_CAPITAL}\n` +
      `• Risco/posição: 1% ($${(INITIAL_CAPITAL * RISK_PER_TRADE).toFixed(2)})`;

    await sendTelegram(message);
    console.log(`[Engine] BUY signal sent for ${symbolStr} @ ${signal.price}`);
    return true;

  } catch (error) {
    console.error(`[Engine] Error processing ${symbolStr}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

// ── Loop principal de sinais ──────────────────────────────────────────────────

async function runTradingLoop(): Promise<void> {
  console.log("[Engine] Running trading signal scan (MTF V3)...");
  const symbols = await getSymbols();
  let signalsGenerated = 0;

  for (const symbol of symbols) {
    try {
      const generated = await processSymbol(symbol.symbol);
      if (generated) signalsGenerated++;
    } catch (error) {
      console.error(`[Engine] Error processing ${symbol.symbol}:`, error);
    }
  }

  // Enviar sempre um relatório de conclusão do scan (a cada 4h)
  const timestamp = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  const reportMsg = `📊 <b>Relatório de Scan (4h)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Ativos analisados: ${symbols.length}\n` +
    `Sinais gerados: ${signalsGenerated}\n` +
    `Status: Concluído\n` +
    `⏰ ${timestamp}`;
  
  await sendTelegram(reportMsg);

  console.log(`[Engine] Scan complete. Signals generated: ${signalsGenerated}`);
}

// ── Loop de monitorização de trades abertos ───────────────────────────────────

async function runMonitoringLoop(): Promise<void> {
  // Monitorização de trades — lógica de trailing stop e breakeven removida a pedido do utilizador
  console.log("[Engine] Monitoring loop tick.");
}

// ── Relatório diário ──────────────────────────────────────────────────────────

let lastDailyReportDate = "";

async function runDailyReport(): Promise<void> {
  const now = new Date();
  // Converter para hora de Lisboa (WET/WEST)
  const lisbonTime = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  }).formatToParts(now);
  
  const hour = parseInt(lisbonTime.find(p => p.type === "hour")?.value || "0");
  const today = now.toISOString().slice(0, 10);

  // Enviar às 09:00 de Lisboa, apenas uma vez por dia
  if (hour === 9 && lastDailyReportDate !== today) {
    console.log("[Engine] Generating daily report...");
    try {
      const { formatDailyReport } = await import("./telegram");
      const date = now.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
      
      // Por agora enviamos com zeros pois as estatísticas ainda não são persistidas em DB no engine.ts
      const message = formatDailyReport(date, 0, 0, 0, 0, 0, 0);
      await sendTelegram(message);
      lastDailyReportDate = today;
    } catch (error) {
      console.error("[Engine] Error generating daily report:", error);
    }
  }
}
