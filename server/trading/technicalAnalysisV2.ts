/**
 * Technical Analysis V2 - Enhanced Signal Quality
 * Implements stricter filters for higher-quality signals
 */

import { Candle, SignalResult } from "./technicalAnalysis";

export interface EnhancedSignalResult extends SignalResult {
  filters: {
    adxFilter: boolean;
    volumeFilter: boolean;
    rsiFilter: boolean;
    trendFilter: boolean;
    candleConfirmation: boolean;
    emaDistanceFilter: boolean;
    volatilityFilter: boolean;
  };
  filterScore: number;
  signalStrength: number;
}

/**
 * Calculate average volume over period
 */
export function calcAvgVolume(candles: Candle[], period: number = 20): number {
  if (candles.length < period) return 0;
  const recentVolumes = candles.slice(-period).map((c) => c.volume);
  return recentVolumes.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
export function calcVolatility(candles: Candle[], period: number = 20): number {
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

/**
 * Detect candle patterns
 */
export function detectCandlePattern(candle: Candle, prevCandle: Candle): string {
  const bodySize = Math.abs(candle.close - candle.open);
  const totalSize = candle.high - candle.low;
  const bodyRatio = bodySize / totalSize;

  // Doji (small body, long wicks)
  if (bodyRatio < 0.1) return "DOJI";

  // Hammer (small body at top, long lower wick)
  if (candle.close > candle.open && candle.open - candle.low > bodySize * 2) return "HAMMER";

  // Hanging Man (small body at top, long lower wick, bearish)
  if (candle.close < candle.open && candle.open - candle.low > bodySize * 2) return "HANGINGMAN";

  // Engulfing (current candle engulfs previous)
  if (
    candle.close > candle.open &&
    prevCandle.close < prevCandle.open &&
    candle.open < prevCandle.close &&
    candle.close > prevCandle.open
  ) {
    return "BULLISH_ENGULFING";
  }

  if (
    candle.close < candle.open &&
    prevCandle.close > prevCandle.open &&
    candle.open > prevCandle.close &&
    candle.close < prevCandle.open
  ) {
    return "BEARISH_ENGULFING";
  }

  // Marubozu (no wicks)
  if (candle.high === candle.close && candle.low === candle.open) return "MARUBOZU_UP";
  if (candle.high === candle.open && candle.low === candle.close) return "MARUBOZU_DOWN";

  return "NEUTRAL";
}

/**
 * Calculate Stochastic RSI (more sensitive than RSI)
 */
export function calcStochasticRSI(closes: number[], period: number = 14, smoothK: number = 3, smoothD: number = 3): { k: number; d: number } {
  if (closes.length < period + smoothK + smoothD) return { k: 50, d: 50 };

  // Calculate RSI values
  const rsiValues: number[] = [];
  for (let i = period; i < closes.length; i++) {
    let gains = 0,
      losses = 0;
    for (let j = i - period; j < i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period,
      avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsiValues.push(rsi);
  }

  // Find min and max RSI
  const lookback = 14;
  const minRSI = Math.min(...rsiValues.slice(-lookback));
  const maxRSI = Math.max(...rsiValues.slice(-lookback));

  // Calculate Stochastic RSI
  const currentRSI = rsiValues[rsiValues.length - 1];
  let k = maxRSI === minRSI ? 50 : ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;

  // Smooth K
  const kValues: number[] = [];
  for (let i = Math.max(0, rsiValues.length - lookback); i < rsiValues.length; i++) {
    const rsi = rsiValues[i];
    const minR = Math.min(...rsiValues.slice(Math.max(0, i - 14), i + 1));
    const maxR = Math.max(...rsiValues.slice(Math.max(0, i - 14), i + 1));
    kValues.push(maxR === minR ? 50 : ((rsi - minR) / (maxR - minR)) * 100);
  }

  if (kValues.length >= smoothK) {
    k = kValues.slice(-smoothK).reduce((a, b) => a + b, 0) / smoothK;
  }

  // Calculate D (SMA of K)
  let d = 50;
  if (kValues.length >= smoothK + smoothD) {
    const dValues = kValues.slice(-smoothK - smoothD);
    d = dValues.reduce((a, b) => a + b, 0) / smoothD;
  }

  return { k: Math.round(k * 100) / 100, d: Math.round(d * 100) / 100 };
}

/**
 * Calculate MACD
 */
export function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
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

  // Calculate signal line (9-period EMA of MACD)
  const k9 = 2 / (9 + 1);
  let signal = macd;
  // Simplified: just use current MACD as signal for now
  signal = macd;

  return {
    macd: Math.round(macd * 10000) / 10000,
    signal: Math.round(signal * 10000) / 10000,
    histogram: Math.round((macd - signal) * 10000) / 10000,
  };
}

/**
 * Enhanced signal generation with stricter filters
 */
export function generateEnhancedSignal(
  candles: Candle[],
  price: number,
  macroTrend: string,
  trendShort: string,
  atr: number
): EnhancedSignalResult | null {
  if (candles.length < 100) return null;

  const closes = candles.map((c) => c.close);

  // Calculate all indicators
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

  // Crossover detection
  const ema9PrevAbove = ema9Line[len - 2] > ema21Line[len - 2];
  const ema9CurrAbove = ema9 > ema21;
  const crossedUp = !ema9PrevAbove && ema9CurrAbove;
  const crossedDown = ema9PrevAbove && !ema9CurrAbove;

  // Volume analysis
  const currentVolume = candles[candles.length - 1].volume;
  const volHigh = currentVolume > avgVolume * 1.3;

  // Candle pattern
  const prevCandle = candles[candles.length - 2];
  const pattern = detectCandlePattern(candles[candles.length - 1], prevCandle);

  // Initialize filters
  const filters = {
    adxFilter: adx >= 25,
    volumeFilter: volHigh,
    rsiFilter: rsi > 30 && rsi < 70,
    trendFilter: macroTrend === "BULL" || macroTrend === "BEAR",
    candleConfirmation: pattern !== "NEUTRAL",
    emaDistanceFilter: Math.abs(price - ema21) / price < 0.015,
    volatilityFilter: volatility > 0.005 && volatility < 0.08,
  };

  const filterScore = Object.values(filters).filter(Boolean).length / Object.keys(filters).length;

  // Strict filter requirements
  if (filterScore < 0.6) return null;
  if (!filters.adxFilter) return null;
  if (!filters.rsiFilter) return null;
  if (!filters.volumeFilter) return null;

  // Signal generation with stricter logic
  let signal: "BUY" | "SELL" | null = null;

  if (crossedUp && ema21 > ema50 && ema50 > ema200 && macroTrend !== "BEAR") {
    // Strong uptrend confirmation
    if (stochRSI.k < 80 && macd.histogram > 0) {
      signal = "BUY";
    }
  }

  if (!signal && crossedDown && ema21 < ema50 && ema50 < ema200 && macroTrend !== "BULL") {
    // Strong downtrend confirmation
    if (stochRSI.k > 20 && macd.histogram < 0) {
      signal = "SELL";
    }
  }

  // Additional validation
  if (signal === "BUY") {
    if (rsi > 65) return null; // Overbought
    if (price < ema50 * 0.95) return null; // Too far below EMA50
    if (pattern === "BEARISH_ENGULFING" || pattern === "HANGINGMAN") return null;
  }

  if (signal === "SELL") {
    if (rsi < 35) return null; // Oversold
    if (price > ema50 * 1.05) return null; // Too far above EMA50
    if (pattern === "BULLISH_ENGULFING" || pattern === "HAMMER") return null;
  }

  if (!signal) return null;

  // SL/TP calculation with tighter stops
  const atrPct = atr / price;
  const slPct = Math.max(0.008, Math.min(0.02, atrPct * 1.5));

  const sl = signal === "BUY" ? price * (1 - slPct) : price * (1 + slPct);

  const rrMultiplier = 3.0; // Risco/Retorno fixo 1:3
  const tp = signal === "BUY" ? price * (1 + slPct * rrMultiplier) : price * (1 - slPct * rrMultiplier);

  // Enhanced confidence calculation
  let confidence = 60;
  confidence += (adx - 25) * 0.5; // ADX contribution
  confidence += filterScore * 10; // Filter score contribution
  if (stochRSI.k < 20 || stochRSI.k > 80) confidence += 5; // Extreme RSI
  if (macd.histogram > 0 && signal === "BUY") confidence += 3;
  if (macd.histogram < 0 && signal === "SELL") confidence += 3;
  if (pattern !== "NEUTRAL") confidence += 2;

  confidence = Math.min(99, Math.round(confidence));

  const signalStrength = (filterScore * 0.4 + (adx / 50) * 0.3 + (confidence / 100) * 0.3) * 100;

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
    slPct: Math.round(slPct * 10000) / 100,
    tpPct: Math.round(slPct * rrMultiplier * 10000) / 100,
    filters,
    filterScore: Math.round(filterScore * 10000) / 100,
    signalStrength: Math.round(signalStrength),
  };
}

// Import helper functions from V1
import { calcEMALine, calcRSI, calcADX } from "./technicalAnalysis";
