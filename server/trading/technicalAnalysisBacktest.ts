/**
 * Technical Analysis for Backtest
 * Relaxed filters to generate realistic signals for backtesting
 */

import { Candle, calcRSI, calcADX, calcATR, calcEMALine, SignalResult } from "./technicalAnalysis";

export interface BacktestSignalResult extends SignalResult {
  filters: {
    adxFilter: boolean;
    volumeFilter: boolean;
    rsiFilter: boolean;
    trendFilter: boolean;
  };
  filterScore: number;
}

/**
 * Calculate MACD
 */
export function calcMACD(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 };

  const ema12 = calcEMALine(closes, fastPeriod);
  const ema26 = calcEMALine(closes, slowPeriod);

  const macdLine = [];
  for (let i = 0; i < ema12.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }

  const signalLine = calcEMALine(macdLine, signalPeriod);

  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Determine trend direction
 */
export function calcTrend(closes: number[]): "BULL" | "BEAR" | "NEUTRAL" {
  if (closes.length < 50) return "NEUTRAL";

  const recent = closes.slice(-50);
  const sma50 = recent.reduce((a, b) => a + b) / recent.length;
  const currentPrice = closes[closes.length - 1];

  if (currentPrice > sma50 * 1.02) return "BULL";
  if (currentPrice < sma50 * 0.98) return "BEAR";
  return "NEUTRAL";
}

/**
 * Generate signal with relaxed filters for backtest
 */
export function generateBacktestSignal(
  candles: Candle[],
  currentPrice: number,
  macroTrend: string,
  trendShort: string,
  atr: number
): BacktestSignalResult | null {
  if (candles.length < 100) return null;

  const closes = candles.map((c) => c.close);

  // Calculate indicators
  const rsi = calcRSI(closes);
  const adx = calcADX(candles);
  const macd = calcMACD(closes);

  // EMA calculations
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

  // Crossover detection
  const ema9PrevAbove = ema9Line[len - 2] > ema21Line[len - 2];
  const ema9CurrAbove = ema9 > ema21;
  const crossedUp = !ema9PrevAbove && ema9CurrAbove;
  const crossedDown = ema9PrevAbove && !ema9CurrAbove;

  // Volume analysis (relaxed)
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
  const currentVolume = candles[candles.length - 1].volume;
  const volHigh = currentVolume > avgVolume * 1.1; // Relaxed from 1.3

  // Initialize filters (RELAXED for backtest)
  const filters = {
    adxFilter: adx >= 18, // Relaxed from 25
    volumeFilter: volHigh,
    rsiFilter: rsi > 25 && rsi < 75, // Relaxed from 30-70
    trendFilter: macroTrend === "BULL" || macroTrend === "BEAR",
  };

  const filterScore = Object.values(filters).filter(Boolean).length / Object.keys(filters).length;

  // Relaxed requirements
  if (filterScore < 0.5) return null; // Relaxed from 0.6
  if (!filters.adxFilter) return null;
  if (!filters.rsiFilter) return null;

  // Signal generation (RELAXED)
  let signal: "BUY" | "SELL" | null = null;

  // BUY signals
  if (crossedUp && ema21 > ema50 && macroTrend !== "BEAR") {
    signal = "BUY";
  }

  // SELL signals
  if (crossedDown && ema21 < ema50 && macroTrend !== "BULL") {
    signal = "SELL";
  }

  // Additional validation (relaxed)
  if (signal === "BUY") {
    if (rsi > 75) return null; // Relaxed from 65
    if (currentPrice < ema50 * 0.90) return null; // Relaxed from 0.95
  }

  if (signal === "SELL") {
    if (rsi < 25) return null; // Relaxed from 35
    if (currentPrice > ema50 * 1.10) return null; // Relaxed from 1.05
  }

  if (!signal) return null;

  // SL/TP calculation
  const atrPct = atr / currentPrice;
  const slPct = Math.max(0.01, Math.min(0.03, atrPct * 1.2));

  const sl = signal === "BUY" ? currentPrice * (1 - slPct) : currentPrice * (1 + slPct);
  const rrMultiplier = 3.0; // Risco/Retorno fixo 1:3
  const tp = signal === "BUY" ? currentPrice * (1 + slPct * rrMultiplier) : currentPrice * (1 - slPct * rrMultiplier);

  // Confidence calculation
  let confidence = 50;
  confidence += Math.max(0, (adx - 18) * 0.8);
  confidence += filterScore * 15;
  if (macd.histogram > 0 && signal === "BUY") confidence += 5;
  if (macd.histogram < 0 && signal === "SELL") confidence += 5;

  confidence = Math.min(95, Math.round(confidence));

  return {
    signal,
    confidence,
    price: currentPrice,
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
    slPct: Math.round(slPct * 10000) / 100,
    tpPct: Math.round(slPct * rrMultiplier * 10000) / 100,
    filters,
    filterScore: Math.round(filterScore * 10000) / 100,
  };
}
