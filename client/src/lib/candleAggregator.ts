export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

export function aggregateCandles(candles: Candle[], timeframe: Timeframe): Candle[] {
  if (candles.length === 0) return [];

  const timeframeMs = TIMEFRAME_MS[timeframe];
  const aggregated: Candle[] = [];

  let currentGroup: Candle[] = [];
  let currentBucket = Math.floor(candles[0].time / timeframeMs);

  for (const candle of candles) {
    const bucket = Math.floor(candle.time / timeframeMs);

    if (bucket !== currentBucket) {
      if (currentGroup.length > 0) {
        aggregated.push(createAggregatedCandle(currentGroup, currentBucket * timeframeMs));
      }
      currentGroup = [candle];
      currentBucket = bucket;
    } else {
      currentGroup.push(candle);
    }
  }

  // Adicionar último grupo
  if (currentGroup.length > 0) {
    aggregated.push(createAggregatedCandle(currentGroup, currentBucket * timeframeMs));
  }

  return aggregated;
}

function createAggregatedCandle(candles: Candle[], time: number): Candle {
  const opens = candles.map((c) => c.open);
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  return {
    time,
    open: opens[0],
    close: closes[closes.length - 1],
    high: Math.max(...highs),
    low: Math.min(...lows),
    volume: volumes.reduce((a, b) => a + b, 0),
  };
}

export function calculateEMA(candles: Candle[], period: number): number[] {
  if (candles.length < period) return [];

  const ema: number[] = [];
  const k = 2 / (period + 1);

  // SMA inicial
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let emaValue = sum / period;
  ema.push(emaValue);

  // EMA subsequentes
  for (let i = period; i < candles.length; i++) {
    emaValue = candles[i].close * k + emaValue * (1 - k);
    ema.push(emaValue);
  }

  return ema;
}

export function calculateSMA(candles: Candle[], period: number): number[] {
  if (candles.length < period) return [];

  const sma: number[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    sma.push(sum / period);
  }

  return sma;
}

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const sma = calculateSMA(candles, period);
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += Math.pow(candles[j].close - sma[i - period + 1], 2);
    }
    variance /= period;
    const std = Math.sqrt(variance);

    const mid = sma[i - period + 1];
    middle.push(mid);
    upper.push(mid + std * stdDev);
    lower.push(mid - std * stdDev);
  }

  return { upper, middle, lower };
}

export function calculateMACD(candles: Candle[], fast: number = 12, slow: number = 26, signal: number = 9) {
  const ema12 = calculateEMA(candles, fast);
  const ema26 = calculateEMA(candles, slow);

  const macdLine: number[] = [];
  const startIdx = Math.max(ema12.length, ema26.length) - Math.min(ema12.length, ema26.length);

  for (let i = startIdx; i < ema12.length; i++) {
    macdLine.push(ema12[i] - ema26[i - startIdx]);
  }

  const signalLine = calculateEMA(
    macdLine.map((m, i) => ({ close: m, open: 0, high: 0, low: 0, time: 0, volume: 0 })),
    signal
  );

  const histogram = macdLine.map((m, i) => m - (signalLine[i] || 0));

  return { macdLine, signalLine, histogram };
}

export function calculateRSI(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];

  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  // Calcular ganhos e perdas iniciais
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calcular RSI
  for (let i = period; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];

  const tr: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);

    tr.push(Math.max(tr1, tr2, tr3));
  }

  const atr: number[] = [];
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }

  let atrValue = sum / period;
  atr.push(atrValue);

  for (let i = period; i < tr.length; i++) {
    atrValue = (atrValue * (period - 1) + tr[i]) / period;
    atr.push(atrValue);
  }

  return atr;
}
