'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  MÓDULO DE GERAÇÃO DE SINAIS – STOCK SIGNAL BOT  (MTF V3)
//
//  Estratégia de entrada com 5 filtros em cascata (Multi-Timeframe):
//
//  1. RSI Semanal < 50
//     → Ativo não está sobrecomprado no timeframe macro.
//     → Ainda há espaço para subir.
//
//  2. Preço Diário > SMA(70)
//     → Tendência de médio prazo é bullish.
//     → Só entrar quando o preço está acima da média de 70 dias.
//
//  3. RSI 4h < 40
//     → Pullback / sobrevenda no intraday.
//     → Zona de potencial reversão.
//
//  4. MACD 4h com divergência bullish
//     → Preço faz Lower Low mas histograma MACD faz Higher Low.
//     → Enfraquecimento da pressão vendedora.
//     → Janela de pesquisa: últimas 20 velas de 4h.
//
//  5. Vela de confirmação 4h: Higher High + Higher Low
//     → A última vela de 4h tem High > High anterior E Low > Low anterior.
//     → Confirma que a reversão já começou.
//
//  Sinal só é emitido quando TODOS os 5 filtros passam.
//
//  Exporta: generateMtfSignal, calcEMA, calcATR, calcTrend, calcRSI, calcSMA,
//           calcMACDLine, detectMacdBullishDivergence, evaluateMtfFilters
// ─────────────────────────────────────────────────────────────────────────────

// ── INDICADORES TÉCNICOS ──────────────────────────────────────────────────────

function calcEMA(data, period) {
  if (!data || data.length === 0) return 0;
  var k = 2 / (period + 1);
  var ema = data[0];
  for (var i = 1; i < data.length; i++) ema = data[i] * k + ema * (1 - k);
  return ema;
}

function calcEMALine(data, period) {
  if (!data || data.length < period) return data.map(function() { return 0; });
  var k = 2 / (period + 1);
  var result = new Array(data.length).fill(0);
  result[period - 1] = data.slice(0, period).reduce(function(s, v) { return s + v; }, 0) / period;
  for (var i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

function calcSMA(data, period) {
  if (!data || data.length < period) return 0;
  var slice = data.slice(-period);
  return slice.reduce(function(a, b) { return a + b; }, 0) / period;
}

function calcRSI(closes, period) {
  period = period || 14;
  if (closes.length < period + 1) return 50;
  var gains = 0, losses = 0;
  for (var i = closes.length - period; i < closes.length; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  var avgGain = gains / period, avgLoss = losses / period;
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

function calcATR(candles, period) {
  period = period || 14;
  if (candles.length < period) return 0;
  var sum = 0;
  for (var i = candles.length - period; i < candles.length; i++) {
    var c = candles[i], p = candles[i - 1] || c;
    sum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
  }
  return sum / period;
}

function calcADX(candles, period) {
  period = period || 14;
  if (candles.length < period * 2) return 0;
  var plusDMs = [], minusDMs = [], trs = [];
  for (var i = 1; i < candles.length; i++) {
    var c = candles[i], p = candles[i - 1];
    var upMove = c.high - p.high, downMove = p.low - c.low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  var smoothPlusDM  = plusDMs.slice(0, period).reduce(function(s, v) { return s + v; }, 0);
  var smoothMinusDM = minusDMs.slice(0, period).reduce(function(s, v) { return s + v; }, 0);
  var smoothTR      = trs.slice(0, period).reduce(function(s, v) { return s + v; }, 0);
  var dxValues = [];
  for (var j = period; j < trs.length; j++) {
    smoothPlusDM  = smoothPlusDM  - smoothPlusDM  / period + plusDMs[j];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[j];
    smoothTR      = smoothTR      - smoothTR      / period + trs[j];
    var plusDI  = smoothTR > 0 ? (smoothPlusDM  / smoothTR) * 100 : 0;
    var minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    var diSum   = plusDI + minusDI;
    dxValues.push(diSum > 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0);
  }
  if (dxValues.length < period) return dxValues.length > 0 ? dxValues[dxValues.length - 1] : 0;
  var adx = dxValues.slice(0, period).reduce(function(s, v) { return s + v; }, 0) / period;
  for (var k = period; k < dxValues.length; k++) adx = (adx * (period - 1) + dxValues[k]) / period;
  return adx;
}

function calcTrend(closes) {
  if (closes.length < 10) return 'NEUTRAL';
  var current = closes[closes.length - 1];
  var prev    = closes[closes.length - 10];
  return current > prev ? 'BULL' : 'BEAR';
}

// ── MACD LINHA COMPLETA ───────────────────────────────────────────────────────

/**
 * Calcula a linha MACD completa (MACD, Sinal, Histograma) para todos os pontos.
 * @param {number[]} closes
 * @returns {{ macdLine: number[], signalLine: number[], histogram: number[] }}
 */
function calcMACDLine(closes) {
  var len = closes.length;
  var macdLine   = new Array(len).fill(0);
  var signalLine = new Array(len).fill(0);
  var histogram  = new Array(len).fill(0);

  if (len < 35) return { macdLine: macdLine, signalLine: signalLine, histogram: histogram };

  var k12 = 2 / (12 + 1);
  var k26 = 2 / (26 + 1);
  var k9  = 2 / (9  + 1);

  var ema12Arr = new Array(len).fill(0);
  var ema26Arr = new Array(len).fill(0);
  ema12Arr[0] = closes[0];
  ema26Arr[0] = closes[0];

  for (var i = 1; i < len; i++) {
    ema12Arr[i] = closes[i] * k12 + ema12Arr[i - 1] * (1 - k12);
    ema26Arr[i] = closes[i] * k26 + ema26Arr[i - 1] * (1 - k26);
    macdLine[i] = ema12Arr[i] - ema26Arr[i];
  }

  // Linha de sinal: EMA9 do MACD
  signalLine[25] = macdLine[25];
  for (var j = 26; j < len; j++) {
    signalLine[j] = macdLine[j] * k9 + signalLine[j - 1] * (1 - k9);
    histogram[j]  = macdLine[j] - signalLine[j];
  }

  return { macdLine: macdLine, signalLine: signalLine, histogram: histogram };
}

// ── DIVERGÊNCIA BULLISH NO MACD ───────────────────────────────────────────────

/**
 * Deteta divergência bullish no MACD:
 * O preço faz Lower Low mas o histograma faz Higher Low.
 * Indica enfraquecimento da pressão vendedora.
 *
 * Lógica:
 *  - Janela de pesquisa: últimas N velas EXCLUINDO a última (que é a vela de confirmação HH+HL)
 *  - Dentro da janela, encontra o índice do mínimo de preço (Low) anterior
 *  - A penúltima vela (segunda do fim) deve ter Low mais baixo que esse mínimo anterior
 *  - O histograma MACD na penúltima vela deve ser maior (menos negativo) que no mínimo anterior
 *
 * @param {Array}    candles   - Candles de 4h
 * @param {number[]} histogram - Histograma MACD (mesmo comprimento que candles)
 * @param {number}   lookback  - Janela de pesquisa (padrão: 20 velas)
 * @returns {boolean}
 */
function detectMacdBullishDivergence(candles, histogram, lookback) {
  lookback = lookback || 20;
  var len = candles.length;
  if (len < lookback + 2 || histogram.length < len) return false;

  // Separação mínima de 5 velas entre os dois mínimos para evitar falsos positivos
  var minSeparation = 5;

  // A penúltima vela é o candidato ao segundo mínimo (antes da vela de confirmação HH+HL)
  var secondLowIdx = len - 2;

  // Janela de pesquisa do primeiro mínimo: excluir as últimas (minSeparation + 1) velas
  // para garantir separação temporal adequada
  var endSearchIdx = len - 1 - minSeparation;
  var startIdx     = Math.max(0, len - lookback - 2);

  if (endSearchIdx <= startIdx) return false;

  // Encontrar o índice do primeiro mínimo de preço na janela
  var firstLowIdx = startIdx;
  for (var i = startIdx + 1; i < endSearchIdx; i++) {
    if (candles[i].low < candles[firstLowIdx].low) {
      firstLowIdx = i;
    }
  }

  // A penúltima vela deve ter um Low mais baixo que o primeiro mínimo (Lower Low no preço)
  var secondLow = candles[secondLowIdx].low;
  var firstLow  = candles[firstLowIdx].low;
  if (secondLow >= firstLow) return false;

  // O histograma na penúltima vela deve ser maior (menos negativo) que no primeiro mínimo → Higher Low no MACD
  var secondHist = histogram[secondLowIdx];
  var firstHist  = histogram[firstLowIdx];
  return secondHist > firstHist;
}

// ── AVALIAÇÃO DOS FILTROS MTF ─────────────────────────────────────────────────

/**
 * Avalia os 5 filtros multi-timeframe.
 *
 * @param {Object} data
 * @param {Array}  data.weeklyCandles - Candles semanais
 * @param {Array}  data.dailyCandles  - Candles diários
 * @param {Array}  data.h4Candles     - Candles de 4h
 * @returns {Object} Resultado detalhado de cada filtro
 */
function evaluateMtfFilters(data) {
  var weeklyCandles = data.weeklyCandles;
  var dailyCandles  = data.dailyCandles;
  var h4Candles     = data.h4Candles;

  // ── 1. RSI Semanal < 50 ──────────────────────────────────────────────────
  var weeklyCloses = weeklyCandles.map(function(c) { return c.close; });
  var weeklyRsi    = weeklyCloses.length >= 15 ? calcRSI(weeklyCloses, 14) : 50;
  var weeklyRsiOk  = weeklyRsi < 50;

  // ── 2. Preço Diário > SMA(70) ────────────────────────────────────────────
  var dailyCloses    = dailyCandles.map(function(c) { return c.close; });
  var dailyClose     = dailyCloses[dailyCloses.length - 1] || 0;
  var dailyMa70      = calcSMA(dailyCloses, 70);
  var dailyAboveMa70 = dailyMa70 > 0 && dailyClose > dailyMa70;

  // ── 3. RSI 4h < 40 ───────────────────────────────────────────────────────
  var h4Closes = h4Candles.map(function(c) { return c.close; });
  var h4Rsi    = h4Closes.length >= 15 ? calcRSI(h4Closes, 14) : 50;
  var h4RsiOk  = h4Rsi < 40;

  // ── 4. MACD 4h com divergência bullish ───────────────────────────────────
  var macdResult = calcMACDLine(h4Closes);
  var lastIdx    = h4Closes.length - 1;
  var h4Macd          = macdResult.macdLine[lastIdx]   || 0;
  var h4MacdSignal    = macdResult.signalLine[lastIdx] || 0;
  var h4MacdHistogram = macdResult.histogram[lastIdx]  || 0;
  var h4MacdBullishDivergence = detectMacdBullishDivergence(h4Candles, macdResult.histogram, 20);

  // ── 5. Vela de confirmação 4h: Higher High + Higher Low ──────────────────
  var h4Len        = h4Candles.length;
  var h4HigherHigh = false;
  var h4HigherLow  = false;

  if (h4Len >= 2) {
    var lastCandle = h4Candles[h4Len - 1];
    var prevCandle = h4Candles[h4Len - 2];
    h4HigherHigh = lastCandle.high > prevCandle.high;
    h4HigherLow  = lastCandle.low  > prevCandle.low;
  }

  var h4CandleConfirmation = h4HigherHigh && h4HigherLow;

  // ── Resultado ────────────────────────────────────────────────────────────
  var allFiltersPass =
    weeklyRsiOk &&
    dailyAboveMa70 &&
    h4RsiOk &&
    h4MacdBullishDivergence &&
    h4CandleConfirmation;

  return {
    weeklyRsi:              Math.round(weeklyRsi * 100) / 100,
    weeklyRsiOk:            weeklyRsiOk,
    dailyClose:             Math.round(dailyClose * 100) / 100,
    dailyMa70:              Math.round(dailyMa70 * 100) / 100,
    dailyAboveMa70:         dailyAboveMa70,
    h4Rsi:                  Math.round(h4Rsi * 100) / 100,
    h4RsiOk:                h4RsiOk,
    h4MacdBullishDivergence: h4MacdBullishDivergence,
    h4Macd:                 Math.round(h4Macd * 10000) / 10000,
    h4MacdSignal:           Math.round(h4MacdSignal * 10000) / 10000,
    h4MacdHistogram:        Math.round(h4MacdHistogram * 10000) / 10000,
    h4HigherHigh:           h4HigherHigh,
    h4HigherLow:            h4HigherLow,
    h4CandleConfirmation:   h4CandleConfirmation,
    allFiltersPass:         allFiltersPass,
  };
}

// ── GERAÇÃO DE SINAL MTF V3 ───────────────────────────────────────────────────

/**
 * Gera um sinal BUY quando TODOS os 5 filtros MTF passam.
 *
 * @param {Object} data
 * @param {Array}  data.weeklyCandles - Candles semanais (mínimo 20)
 * @param {Array}  data.dailyCandles  - Candles diários (mínimo 80)
 * @param {Array}  data.h4Candles     - Candles de 4h (mínimo 60)
 * @returns {Object|null} Sinal ou null
 */
function generateMtfSignal(data) {
  var weeklyCandles = data.weeklyCandles;
  var dailyCandles  = data.dailyCandles;
  var h4Candles     = data.h4Candles;

  // Dados mínimos necessários
  if (weeklyCandles.length < 20 || dailyCandles.length < 80 || h4Candles.length < 60) {
    return null;
  }

  // Avaliar filtros
  var mtf = evaluateMtfFilters(data);

  // Calcular pontuação dos filtros
  var filterChecks = [
    mtf.weeklyRsiOk,
    mtf.dailyAboveMa70,
    mtf.h4RsiOk,
    mtf.h4MacdBullishDivergence,
    mtf.h4CandleConfirmation,
  ];
  var filterScore = Math.round(filterChecks.filter(Boolean).length / filterChecks.length * 100);

  // Só emitir sinal se TODOS os filtros passarem
  if (!mtf.allFiltersPass) return null;

  // Preço de referência: fecho da última vela de 4h
  var lastH4 = h4Candles[h4Candles.length - 1];
  var prevH4 = h4Candles[h4Candles.length - 2];
  var price  = lastH4.close;

  // SL/TP baseado em ATR e mínima da vela de confirmação
  var atr    = calcATR(h4Candles, 14);
  var atrPct = atr / price;
  var slPct  = Math.max(0.008, Math.min(0.025, atrPct * 1.5));

  // SL abaixo da mínima mais baixa entre as duas últimas velas
  var slPrice      = Math.min(prevH4.low, lastH4.low) * (1 - 0.001);
  var slPctActual  = (price - slPrice) / price;
  var finalSlPct   = Math.max(slPct, slPctActual);
  var sl           = price * (1 - finalSlPct);

  // R:R fixo de 1:3 (risco 1%, retorno 3%)
  var adx          = calcADX(h4Candles, 14);
  var rrMultiplier = 3.0;
  var tp           = price * (1 + finalSlPct * rrMultiplier);

  // EMAs para contexto
  var h4Closes    = h4Candles.map(function(c) { return c.close; });
  var dailyCloses = dailyCandles.map(function(c) { return c.close; });
  var ema9        = calcEMA(h4Closes.slice(-50), 9);
  var ema21       = calcEMA(h4Closes.slice(-50), 21);
  var ema50       = calcEMA(dailyCloses.slice(-100), 50);
  var ema200      = dailyCloses.length >= 200 ? calcEMA(dailyCloses.slice(-200), 200) : ema50;

  // Confiança
  var confidence = 65;
  confidence += (adx - 20) * 0.5;
  if (mtf.weeklyRsi < 40) confidence += 5;
  if (mtf.h4Rsi    < 30) confidence += 5;
  if (mtf.h4MacdBullishDivergence) confidence += 5;
  confidence = Math.min(99, Math.round(confidence));

  return {
    signal:      'BUY',
    conf:        confidence,
    price:       price,
    sl:          Math.round(sl    * 100) / 100,
    tp:          Math.round(tp    * 100) / 100,
    slPct:       (Math.round(finalSlPct * 10000) / 100).toFixed(2),
    tpPct:       (Math.round(finalSlPct * rrMultiplier * 10000) / 100).toFixed(2),
    rsi:         mtf.h4Rsi.toFixed(1),
    adx:         adx.toFixed(1),
    atr:         atr.toFixed(2),
    ema9:        ema9.toFixed(2),
    ema21:       ema21.toFixed(2),
    ema50:       ema50.toFixed(2),
    ema200:      ema200.toFixed(2),
    macroTrend:  'BULL',
    trendShort:  'BULL',
    filterScore: filterScore,
    mtf:         mtf,
  };
}

// ── EXPORTAÇÕES ───────────────────────────────────────────────────────────────

module.exports = {
  generateMtfSignal,
  evaluateMtfFilters,
  calcMACDLine,
  detectMacdBullishDivergence,
  calcEMA,
  calcEMALine,
  calcSMA,
  calcRSI,
  calcATR,
  calcADX,
  calcTrend,
};
