/**
 * Telegram Notifications Module
 * Sends trading signals and alerts via Telegram Bot API
 */

import axios from "axios";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface TelegramConfig {
  token: string;
  chatId: string;
}

let config: TelegramConfig | null = null;

/**
 * Initialize Telegram configuration
 */
export function initTelegram(token: string, chatId: string): void {
  config = { token, chatId };
  console.log("[Telegram] Initialized with chat ID:", chatId);
}

/**
 * Send message to Telegram
 */
export async function sendTelegram(message: string): Promise<boolean> {
  if (!config) {
    console.warn("[Telegram] Not configured. Message would be:", message.replace(/<[^>]+>/g, ""));
    return false;
  }

  try {
    await axios.post(
      `${TELEGRAM_API_BASE}/bot${config.token}/sendMessage`,
      {
        chat_id: config.chatId,
        text: message,
        parse_mode: "HTML",
      },
      { timeout: 10000 }
    );
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending message:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Format BUY signal notification
 */
export function formatBuySignal(
  symbol: string,
  price: number,
  sl: number,
  tp: number,
  confidence: number,
  rsi: number,
  adx: number,
  atr: number,
  ema9: number,
  ema21: number,
  ema50: number,
  macroTrend: string,
  trendShort: string
): string {
  const timestamp = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

  return `🟢 <b>BUY ${symbol}</b>

💰 <b>Preço:</b> $${price.toFixed(2)}
🛑 <b>Stop Loss:</b> $${sl.toFixed(2)}
🎯 <b>Take Profit:</b> $${tp.toFixed(2)}
📊 <b>Confiança:</b> ${confidence}%

<b>Indicadores:</b>
• RSI: ${rsi.toFixed(1)}
• ADX: ${adx.toFixed(1)}
• ATR: $${atr.toFixed(2)}
• EMA9: $${ema9.toFixed(2)}
• EMA21: $${ema21.toFixed(2)}
• EMA50: $${ema50.toFixed(2)}

<b>Tendência:</b>
• Macro: ${macroTrend}
• Curto: ${trendShort}

⏰ ${timestamp}`;
}

/**
 * Format SELL signal notification
 */
export function formatSellSignal(
  symbol: string,
  price: number,
  sl: number,
  tp: number,
  confidence: number,
  rsi: number,
  adx: number,
  atr: number,
  ema9: number,
  ema21: number,
  ema50: number,
  macroTrend: string,
  trendShort: string
): string {
  const timestamp = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

  return `🔴 <b>SELL ${symbol}</b>

💰 <b>Preço:</b> $${price.toFixed(2)}
🛑 <b>Stop Loss:</b> $${sl.toFixed(2)}
🎯 <b>Take Profit:</b> $${tp.toFixed(2)}
📊 <b>Confiança:</b> ${confidence}%

<b>Indicadores:</b>
• RSI: ${rsi.toFixed(1)}
• ADX: ${adx.toFixed(1)}
• ATR: $${atr.toFixed(2)}
• EMA9: $${ema9.toFixed(2)}
• EMA21: $${ema21.toFixed(2)}
• EMA50: $${ema50.toFixed(2)}

<b>Tendência:</b>
• Macro: ${macroTrend}
• Curto: ${trendShort}

⏰ ${timestamp}`;
}

/**
 * Format trade closed notification
 */
export function formatTradeClosedNotification(
  symbol: string,
  signal: string,
  pnl: number,
  outcome: string,
  winRate: number,
  totalWins: number,
  totalLosses: number
): string {
  const emoji = outcome === "WIN" ? "✅" : "❌";
  const pnlFormatted = pnl >= 0 ? `+${pnl.toFixed(2)}%` : `${pnl.toFixed(2)}%`;
  const timestamp = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

  return `${emoji} <b>${outcome} ${signal} ${symbol}</b>

📈 <b>P&L:</b> ${pnlFormatted}
🏆 <b>Win Rate:</b> ${winRate}% (${totalWins}W / ${totalLosses}L)

⏰ ${timestamp}`;
}

/**
 * Format trailing stop activated notification
 */
export function formatTrailingStopNotification(symbol: string, newSl: number): string {
  const timestamp = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

  return `📈 <b>Trailing Stop Ativado</b>

${symbol}
🛑 <b>Novo SL:</b> $${newSl.toFixed(2)}

⏰ ${timestamp}`;
}

/**
 * Format breakeven activated notification
 */
export function formatBreakevenNotification(symbol: string, newSl: number): string {
  const timestamp = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

  return `🛡️ <b>Breakeven Ativado</b>

${symbol}
🛑 <b>Novo SL:</b> $${newSl.toFixed(2)}

⏰ ${timestamp}`;
}

/**
 * Format daily report notification
 */
export function formatDailyReport(
  date: string,
  winRate: number,
  totalWins: number,
  totalLosses: number,
  totalPnl: number,
  totalSignals: number,
  activeTrades: number
): string {
  const total = totalWins + totalLosses;

  return `📋 <b>Relatório Diário – Stock Bot</b>

<b>Data:</b> ${date}

<b>Performance:</b>
• Win Rate: ${winRate}% (${totalWins}W / ${totalLosses}L)
• P&L Total: ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%
• Sinais Gerados: ${totalSignals}

<b>Trades Ativos:</b> ${activeTrades}

━━━━━━━━━━━━━━━━━━━━━━
<i>Bot operacional e monitorando mercados 24/7</i>`;
}

/**
 * Format startup notification
 */
export function formatStartupNotification(symbolCount: number): string {
  const timestamp = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

  return `✅ <b>Stock Signal Bot — ONLINE</b>

━━━━━━━━━━━━━━━━━━━━━━
🕐 <b>Arranque:</b> ${timestamp}
📡 <b>Telegram:</b> Ligado e funcional
📈 <b>Símbolos:</b> ${symbolCount} em monitorização
🏆 <b>Status:</b> Pronto para gerar sinais

<b>Configuração:</b>
• Intervalo: Velas Diárias (1d)
• Estratégia: EMA9/21 Crossover + ADX + RSI
• TP/SL: Dinâmico (ATR-based)
• Gestão de Risco: 1% por posição | R:R 1:3 | Trailing Stop + Breakeven
• Scan: A cada 4h | Verificação: A cada 15min

━━━━━━━━━━━━━━━━━━━━━━
🚀 Sistema operacional e pronto para trading`;
}
