/**
 * Technical Analysis Module
 * Implements indicators: RSI, ADX, EMA, ATR
 * Generates trading signals based on technical patterns
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalResult {
  signal: "BUY" | "SELL" | null;
  confidence: number;
  price: number;
  sl: number;
  tp: number;
  slPct: number;
  tpPct: number;
  rsi: number;
  adx: number;
  atr: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  macroTrend: string;
  trendShort: string;
}

/**
 * Calculate Exponential Moving Average
 */
export function calcEMA(data: number[], period: number): number {
  if (!data || data.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Calculate EMA line for all data points
 */
export function calcEMALine(data: number[], period: number): number[] {
  if (!data || data.length < period) return data.map(() => 0);
  const k = 2 / (period + 1);
  const result = new Array(data.length).fill(0);
  result[period - 1] = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0,
    losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period,
    avgLoss = losses / period;
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

/**
 * Calculate ATR (Average True Range)
 */
export function calcATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i],
      p = candles[i - 1] || c;
    sum += Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    );
  }
  return sum / period;
}

/**
 * Calculate ADX (Average Directional Index)
 */
export function calcADX(candles: Candle[], period: number = 14): number {
  if (candles.length < period * 2) return 0;
  const plusDMs: number[] = [],
    minusDMs: number[] = [],
    trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i],
      p = candles[i - 1];
    const upMove = c.high - p.high,
      downMove = p.low - c.low;
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
  const dxValues: number[] = [];
  for (let j = period; j < trs.length; j++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDMs[j];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[j];
    smoothTR = smoothTR - smoothTR / period + trs[j];
    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
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

/**
 * Calculate short-term trend
 */
export function calcTrend(closes: number[]): string {
  if (closes.length < 10) return "NEUTRAL";
  const current = closes[closes.length - 1];
  const prev = closes[closes.length - 10];
  return current > prev ? "BULL" : "BEAR";
}

/**
 * Generate trading signal based on technical analysis
 */
export function generateSignal(
  candles: Candle[],
  price: number,
  macroTrend: string,
  trendShort: string,
  atr: number
): SignalResult | null {
  if (candles.length < 60) return null;

  const closes = candles.map((c) => c.close);
  const rsi = calcRSI(closes);
  const adx = calcADX(candles);

  const ema9Line = calcEMALine(closes, 9);
  const ema21Line = calcEMALine(closes, 21);
  const ema50Line = calcEMALine(closes, 50);

  const len = ema9Line.length;
  if (len < 3) return null;

  const ema9 = ema9Line[len - 1];
  const ema21 = ema21Line[len - 1];
  const ema50 = ema50Line.length > 0 ? ema50Line[len - 1] : ema21;
  const ema200 = closes.length >= 200 ? calcEMA(closes.slice(-200), 200) : ema50;

  const ema9PrevAbove = ema9Line[len - 2] > ema21Line[len - 2];
  const ema9CurrAbove = ema9 > ema21;
  const crossedUp = !ema9PrevAbove && ema9CurrAbove;
  const crossedDown = ema9PrevAbove && !ema9CurrAbove;

  const trendingUp = ema9 > ema21 && ema21 > ema50;
  const trendingDown = ema9 < ema21 && ema21 < ema50;

  const rv = candles.slice(-3).reduce((s, c) => s + c.volume, 0) / 3;
  const pv = candles.slice(-15, -3).reduce((s, c) => s + c.volume, 0) / 12;
  const volHigh = pv > 0 && rv > pv * 1.2;

  if (adx < 20) return null;

  let signal: "BUY" | "SELL" | null = null;

  if (crossedUp && ema21 > ema50 && macroTrend !== "BEAR") {
    signal = "BUY";
  } else if (trendingUp && macroTrend === "BULL" && rsi > 45 && rsi < 65 && volHigh) {
    const nearEma21 = Math.abs(price - ema21) / price < 0.012;
    if (nearEma21) signal = "BUY";
  }

  if (!signal && crossedDown && ema21 < ema50 && macroTrend !== "BULL") {
    signal = "SELL";
  } else if (!signal && trendingDown && macroTrend === "BEAR" && rsi > 35 && rsi < 55 && volHigh) {
    const nearEma21Sell = Math.abs(price - ema21) / price < 0.012;
    if (nearEma21Sell) signal = "SELL";
  }

  if (!signal) return null;

  if (signal === "BUY") {
    if (rsi > 70) return null;
    if (price < ema200 && macroTrend !== "BULL") return null;
    const ema9Dist = ((ema9 - ema21) / ema21) * 100;
    if (ema9Dist > 2.0) return null;
  }

  if (signal === "SELL") {
    if (rsi < 30) return null;
    if (price > ema200 && macroTrend !== "BEAR") return null;
    const ema9DistSell = ((ema21 - ema9) / ema21) * 100;
    if (ema9DistSell > 2.0) return null;
  }

  const prevCandle = candles[candles.length - 2];
  if (!prevCandle) return null;
  if (signal === "BUY" && prevCandle.close < prevCandle.open) return null;
  if (signal === "SELL" && prevCandle.close > prevCandle.open) return null;

  if (!volHigh) return null;

  const atrPct = atr / price;
  const slPct = Math.max(0.01, Math.min(0.03, atrPct * 1.8));

  const sl = signal === "BUY" ? price * (1 - slPct) : price * (1 + slPct);

  const rrMultiplier = 3.0; // Risco/Retorno fixo 1:3
  const tp = signal === "BUY" ? price * (1 + slPct * rrMultiplier) : price * (1 - slPct * rrMultiplier);

  const conf = Math.min(99, Math.round(55 + (adx - 20) * 1.5 + (volHigh ? 5 : 0)));

  return {
    signal,
    confidence: conf,
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
  };
}
