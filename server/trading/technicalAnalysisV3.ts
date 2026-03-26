/**
 * Technical Analysis V3 - Multi-Timeframe Signal Filter
 *
 * Estratégia de entrada com filtros em cascata:
 *  1. RSI Semanal < 50  → ativo ainda tem espaço para subir (não sobrecomprado no macro)
 *  2. Preço Diário > MA70 → tendência de médio prazo é bullish
 *  3. RSI 4h < 40       → zona de sobrevenda no intraday (pullback)
 *  4. MACD 4h com divergência bullish → momentum a recuperar
 *  5. Vela de confirmação 4h: Low > Low anterior E High > High anterior (HH + HL)
 */

import {
  Candle,
  SignalResult,
  calcRSI,
  calcATR,
  calcEMA,
  calcEMALine,
  calcADX,
} from "./technicalAnalysis";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface MultiTimeframeData {
  /** Candles semanais (mínimo 30 velas) */
  weeklyCandles: Candle[];
  /** Candles diários (mínimo 80 velas) */
  dailyCandles: Candle[];
  /** Candles de 4 horas (mínimo 60 velas) */
  h4Candles: Candle[];
}

export interface MtfFilterResult {
  /** RSI calculado sobre os candles semanais */
  weeklyRsi: number;
  /** Passa filtro: RSI semanal < 50 */
  weeklyRsiOk: boolean;

  /** Preço de fecho diário atual */
  dailyClose: number;
  /** Média Móvel Simples de 70 períodos no diário */
  dailyMa70: number;
  /** Passa filtro: preço diário > MA70 */
  dailyAboveMa70: boolean;

  /** RSI calculado sobre os candles de 4h */
  h4Rsi: number;
  /** Passa filtro: RSI 4h < 40 */
  h4RsiOk: boolean;

  /** Divergência bullish detetada no MACD 4h */
  h4MacdBullishDivergence: boolean;
  /** Linha MACD atual (4h) */
  h4Macd: number;
  /** Linha de sinal MACD atual (4h) */
  h4MacdSignal: number;
  /** Histograma MACD atual (4h) */
  h4MacdHistogram: number;

  /** Vela de confirmação: Low > Low anterior */
  h4HigherLow: boolean;
  /** Vela de confirmação: High > High anterior */
  h4HigherHigh: boolean;
  /** Passa filtro de confirmação de vela */
  h4CandleConfirmation: boolean;

  /** Todos os filtros passaram */
  allFiltersPass: boolean;
}

export interface MtfSignalResult extends SignalResult {
  mtfFilters: MtfFilterResult;
  /** Pontuação dos filtros (0-100) */
  filterScore: number;
}

// ---------------------------------------------------------------------------
// Indicadores auxiliares
// ---------------------------------------------------------------------------

/**
 * Calcula a Média Móvel Simples (SMA) de N períodos
 */
export function calcSMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calcula a linha MACD completa com sinal e histograma.
 * Devolve arrays com o mesmo comprimento que `closes`.
 */
export function calcMACDLine(closes: number[]): {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
} {
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

  // Calcular EMA12 e EMA26 para cada ponto
  const ema12Arr = new Array(len).fill(0);
  const ema26Arr = new Array(len).fill(0);
  ema12Arr[0] = closes[0];
  ema26Arr[0] = closes[0];

  for (let i = 1; i < len; i++) {
    ema12Arr[i] = closes[i] * k12 + ema12Arr[i - 1] * (1 - k12);
    ema26Arr[i] = closes[i] * k26 + ema26Arr[i - 1] * (1 - k26);
    macdLine[i] = ema12Arr[i] - ema26Arr[i];
  }

  // Calcular linha de sinal (EMA9 do MACD)
  signalLine[25] = macdLine[25];
  for (let i = 26; i < len; i++) {
    signalLine[i] = macdLine[i] * k9 + signalLine[i - 1] * (1 - k9);
    histogram[i] = macdLine[i] - signalLine[i];
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Deteta divergência bullish no MACD:
 * O preço faz mínimas mais baixas (Lower Low) mas o histograma do MACD
 * faz mínimas mais altas (Higher Low) — sinal de enfraquecimento da pressão vendedora.
 *
 * Janela de pesquisa: últimas `lookback` velas.
 */
export function detectMacdBullishDivergence(
  candles: Candle[],
  histogram: number[],
  lookback: number = 20
): boolean {
  const len = candles.length;
  if (len < lookback + 2 || histogram.length < len) return false;

  const startIdx = len - lookback;

  // Encontrar o índice do mínimo de preço (Low) na janela, excluindo a última vela
  let priceLowIdx = startIdx;
  for (let i = startIdx + 1; i < len - 1; i++) {
    if (candles[i].low < candles[priceLowIdx].low) {
      priceLowIdx = i;
    }
  }

  // Verificar se a última vela tem um Low mais baixo que o mínimo encontrado
  const lastLow = candles[len - 1].low;
  const prevLow = candles[priceLowIdx].low;

  if (lastLow >= prevLow) return false; // Sem Lower Low no preço → sem divergência

  // Verificar se o histograma na última vela é maior (menos negativo) que no mínimo anterior
  const lastHist = histogram[len - 1];
  const prevHist = histogram[priceLowIdx];

  // Divergência bullish: preço Lower Low mas histograma Higher Low (menos negativo)
  return lastHist > prevHist;
}

// ---------------------------------------------------------------------------
// Avaliação dos filtros multi-timeframe
// ---------------------------------------------------------------------------

/**
 * Avalia todos os filtros multi-timeframe e devolve o resultado detalhado.
 */
export function evaluateMtfFilters(data: MultiTimeframeData): MtfFilterResult {
  const { weeklyCandles, dailyCandles, h4Candles } = data;

  // ------------------------------------------------------------------
  // 1. RSI Semanal < 50
  // ------------------------------------------------------------------
  const weeklyCloses = weeklyCandles.map((c) => c.close);
  const weeklyRsi = weeklyCloses.length >= 15 ? calcRSI(weeklyCloses, 14) : 50;
  const weeklyRsiOk = weeklyRsi < 50;

  // ------------------------------------------------------------------
  // 2. Preço Diário > MA70
  // ------------------------------------------------------------------
  const dailyCloses = dailyCandles.map((c) => c.close);
  const dailyClose = dailyCloses[dailyCloses.length - 1] ?? 0;
  const dailyMa70 = calcSMA(dailyCloses, 70);
  const dailyAboveMa70 = dailyMa70 > 0 && dailyClose > dailyMa70;

  // ------------------------------------------------------------------
  // 3. RSI 4h < 40
  // ------------------------------------------------------------------
  const h4Closes = h4Candles.map((c) => c.close);
  const h4Rsi = h4Closes.length >= 15 ? calcRSI(h4Closes, 14) : 50;
  const h4RsiOk = h4Rsi < 40;

  // ------------------------------------------------------------------
  // 4. MACD 4h com divergência bullish
  // ------------------------------------------------------------------
  const { macdLine, signalLine, histogram } = calcMACDLine(h4Closes);
  const lastIdx = h4Closes.length - 1;
  const h4Macd = macdLine[lastIdx] ?? 0;
  const h4MacdSignal = signalLine[lastIdx] ?? 0;
  const h4MacdHistogram = histogram[lastIdx] ?? 0;

  const h4MacdBullishDivergence = detectMacdBullishDivergence(h4Candles, histogram, 20);

  // ------------------------------------------------------------------
  // 5. Confirmação de vela 4h: High > High anterior E Low > Low anterior
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Resultado final
  // ------------------------------------------------------------------
  const allFiltersPass =
    weeklyRsiOk &&
    dailyAboveMa70 &&
    h4RsiOk &&
    h4MacdBullishDivergence &&
    h4CandleConfirmation;

  return {
    weeklyRsi: Math.round(weeklyRsi * 100) / 100,
    weeklyRsiOk,
    dailyClose: Math.round(dailyClose * 100) / 100,
    dailyMa70: Math.round(dailyMa70 * 100) / 100,
    dailyAboveMa70,
    h4Rsi: Math.round(h4Rsi * 100) / 100,
    h4RsiOk,
    h4MacdBullishDivergence,
    h4Macd: Math.round(h4Macd * 10000) / 10000,
    h4MacdSignal: Math.round(h4MacdSignal * 10000) / 10000,
    h4MacdHistogram: Math.round(h4MacdHistogram * 10000) / 10000,
    h4HigherHigh,
    h4HigherLow,
    h4CandleConfirmation,
    allFiltersPass,
  };
}

// ---------------------------------------------------------------------------
// Geração de sinal multi-timeframe
// ---------------------------------------------------------------------------

/**
 * Gera um sinal de compra com base nos filtros multi-timeframe.
 *
 * Só emite sinal BUY quando TODOS os filtros passam:
 *  - RSI semanal < 50
 *  - Preço diário > MA70
 *  - RSI 4h < 40
 *  - Divergência bullish no MACD 4h
 *  - Vela 4h de confirmação (HH + HL)
 */
export function generateMtfSignal(
  data: MultiTimeframeData
): MtfSignalResult | null {
  const { dailyCandles, h4Candles } = data;

  // Dados mínimos necessários
  if (
    data.weeklyCandles.length < 20 ||
    dailyCandles.length < 80 ||
    h4Candles.length < 60
  ) {
    return null;
  }

  // Avaliar filtros
  const mtfFilters = evaluateMtfFilters(data);

  // Calcular pontuação dos filtros (quantos passaram em %)
  const filterChecks = [
    mtfFilters.weeklyRsiOk,
    mtfFilters.dailyAboveMa70,
    mtfFilters.h4RsiOk,
    mtfFilters.h4MacdBullishDivergence,
    mtfFilters.h4CandleConfirmation,
  ];
  const filterScore = Math.round(
    (filterChecks.filter(Boolean).length / filterChecks.length) * 100
  );

  // Só emitir sinal se TODOS os filtros passarem
  if (!mtfFilters.allFiltersPass) return null;

  // Usar a última vela de 4h como referência de preço e SL/TP
  const lastH4 = h4Candles[h4Candles.length - 1];
  const prevH4 = h4Candles[h4Candles.length - 2];
  const price = lastH4.close;

  // Stop Loss abaixo da mínima da vela de confirmação
  const atr = calcATR(h4Candles, 14);
  const atrPct = atr / price;
  const slPct = Math.max(0.008, Math.min(0.025, atrPct * 1.5));

  // SL abaixo da mínima da vela anterior (ponto de invalidação)
  const slPrice = Math.min(prevH4.low, lastH4.low) * (1 - 0.001);
  const slPctActual = (price - slPrice) / price;
  const finalSlPct = Math.max(slPct, slPctActual);

  const sl = price * (1 - finalSlPct);

  // R:R fixo de 1:3 (risco 1%, retorno 3%)
  const h4Closes = h4Candles.map((c) => c.close);
  const adx = calcADX(h4Candles, 14);
  const rrMultiplier = 3.0; // Risco/Retorno fixo 1:3
  const tp = price * (1 + finalSlPct * rrMultiplier);

  // EMAs para contexto
  const dailyCloses = dailyCandles.map((c) => c.close);
  const ema9 = calcEMA(h4Closes.slice(-50), 9);
  const ema21 = calcEMA(h4Closes.slice(-50), 21);
  const ema50 = calcEMA(dailyCloses.slice(-100), 50);
  const ema200 = dailyCloses.length >= 200 ? calcEMA(dailyCloses.slice(-200), 200) : ema50;

  // RSI para o resultado
  const rsi = mtfFilters.h4Rsi;

  // Confiança baseada na qualidade dos filtros e ADX
  let confidence = 65;
  confidence += (adx - 20) * 0.5;
  if (mtfFilters.weeklyRsi < 40) confidence += 5; // RSI semanal muito baixo → mais força
  if (mtfFilters.h4Rsi < 30) confidence += 5;     // RSI 4h muito baixo → sobrevenda forte
  if (mtfFilters.h4MacdBullishDivergence) confidence += 5;
  confidence = Math.min(99, Math.round(confidence));

  return {
    signal: "BUY",
    confidence,
    price,
    sl: Math.round(sl * 100) / 100,
    tp: Math.round(tp * 100) / 100,
    slPct: Math.round(finalSlPct * 10000) / 100,
    tpPct: Math.round(finalSlPct * rrMultiplier * 10000) / 100,
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
    filterScore,
  };
}
