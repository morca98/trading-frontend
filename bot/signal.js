'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  MÓDULO DE GERAÇÃO DE SINAIS – STOCK SIGNAL BOT
//  Exporta a função generateSignal e indicadores auxiliares.
//  Usado tanto pelo server.js como pelo backtest.js para garantir
//  consistência total entre o bot em produção e os backtests.
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

// ── GERAÇÃO DE SINAL ──────────────────────────────────────────────────────────
/**
 * Gera um sinal de trading para ações.
 * Idêntico ao generateSignal do trading-backend, adaptado para ações:
 *  - SL entre 1% e 3% (vs 0.5%–1.5% no cripto)
 *  - Tolerância EMA21 de 1.2% (vs 0.8% no cripto)
 *
 * @param {Array}  candles     - Array de velas { time, open, high, low, close, volume }
 * @param {number} price       - Preço atual
 * @param {string} macroTrend  - 'BULL' | 'BEAR' | 'UP' | 'DOWN' | 'NEUTRAL'
 * @param {string} trendShort  - 'BULL' | 'BEAR' | 'NEUTRAL'
 * @param {number} atr         - ATR(14) calculado externamente
 * @returns {Object|null}      - Objeto de sinal ou null
 */
function generateSignal(candles, price, macroTrend, trendShort, atr) {
  if (candles.length < 60) return null;

  var closes = candles.map(function(c) { return c.close; });
  var rsi    = calcRSI(closes);
  var adx    = calcADX(candles);

  // Linhas EMA completas para detetar crossover
  var ema9Line  = calcEMALine(closes, 9);
  var ema21Line = calcEMALine(closes, 21);
  var ema50Line = calcEMALine(closes, 50);

  var len = ema9Line.length;
  if (len < 3) return null;

  var ema9   = ema9Line[len - 1];
  var ema21  = ema21Line[len - 1];
  var ema50  = ema50Line.length > 0 ? ema50Line[len - 1] : ema21;
  var ema200 = closes.length >= 200 ? calcEMA(closes.slice(-200), 200) : ema50;

  // Crossover EMA9 / EMA21
  var ema9PrevAbove = ema9Line[len - 2] > ema21Line[len - 2];
  var ema9CurrAbove = ema9 > ema21;
  var crossedUp     = !ema9PrevAbove && ema9CurrAbove;
  var crossedDown   = ema9PrevAbove && !ema9CurrAbove;

  // Tendência estabelecida
  var trendingUp   = ema9 > ema21 && ema21 > ema50;
  var trendingDown = ema9 < ema21 && ema21 < ema50;

  // Volume relativo (últimas 3 velas vs últimas 12)
  var rv      = candles.slice(-3).reduce(function(s, c) { return s + c.volume; }, 0) / 3;
  var pv      = candles.slice(-15, -3).reduce(function(s, c) { return s + c.volume; }, 0) / 12;
  var volHigh = pv > 0 && rv > pv * 1.2;

  // Filtro ADX (tendência suficientemente forte)
  if (adx < 20) return null;

  // ── GERAÇÃO DE SINAL ──────────────────────────────────────────────────────
  var signal = null;

  // BUY: crossover para cima OU tendência de alta com pullback para EMA21
  if (crossedUp && ema21 > ema50 && macroTrend !== 'BEAR') {
    signal = 'BUY';
  } else if (trendingUp && macroTrend === 'BULL' && rsi > 45 && rsi < 65 && volHigh) {
    var nearEma21 = Math.abs(price - ema21) / price < 0.012; // 1.2% para ações
    if (nearEma21) signal = 'BUY';
  }

  // SELL: crossover para baixo OU tendência de baixa com pullback para EMA21
  if (!signal && crossedDown && ema21 < ema50 && macroTrend !== 'BULL') {
    signal = 'SELL';
  } else if (!signal && trendingDown && macroTrend === 'BEAR' && rsi > 35 && rsi < 55 && volHigh) {
    var nearEma21Sell = Math.abs(price - ema21) / price < 0.012;
    if (nearEma21Sell) signal = 'SELL';
  }

  if (!signal) return null;

  // ── FILTROS DE QUALIDADE ──────────────────────────────────────────────────
  if (signal === 'BUY') {
    if (rsi > 70) return null;                                // Overbought
    if (price < ema200 && macroTrend !== 'BULL') return null; // Abaixo da EMA200
    var ema9Dist = (ema9 - ema21) / ema21 * 100;
    if (ema9Dist > 2.0) return null;                          // Entrada tardia
  }

  if (signal === 'SELL') {
    if (rsi < 30) return null;                                // Oversold
    if (price > ema200 && macroTrend !== 'BEAR') return null;
    var ema9DistSell = (ema21 - ema9) / ema21 * 100;
    if (ema9DistSell > 2.0) return null;
  }

  // Confirmação de vela (vela anterior na direção do sinal)
  var prevCandle = candles[candles.length - 2];
  if (!prevCandle) return null;
  if (signal === 'BUY'  && prevCandle.close < prevCandle.open) return null;
  if (signal === 'SELL' && prevCandle.close > prevCandle.open) return null;

  // Volume obrigatório
  if (!volHigh) return null;

  // ── CÁLCULO DE SL/TP ─────────────────────────────────────────────────────
  var atrPct = atr / price;
  // Para ações: SL entre 1% e 3% (mais espaço que cripto: 0.5%–1.5%)
  var slPct  = Math.max(0.01, Math.min(0.03, atrPct * 1.8));

  var sl = signal === 'BUY'
    ? price * (1 - slPct)
    : price * (1 + slPct);

  // R:R dinâmico baseado no ADX (idêntico ao trading-backend)
  var rrMultiplier = adx > 30 ? 3.0 : (adx > 25 ? 2.5 : 2.0);
  var tp = signal === 'BUY'
    ? price * (1 + slPct * rrMultiplier)
    : price * (1 - slPct * rrMultiplier);

  // Confiança (55–99%)
  var conf = Math.min(99, Math.round(55 + (adx - 20) * 1.5 + (volHigh ? 5 : 0)));

  return {
    signal:     signal,
    conf:       conf,
    price:      price,
    sl:         sl,
    tp:         tp,
    rsi:        rsi.toFixed(1),
    ema9:       ema9.toFixed(2),
    ema21:      ema21.toFixed(2),
    ema50:      ema50.toFixed(2),
    ema200:     ema200.toFixed(2),
    macroTrend: macroTrend,
    trendShort: trendShort,
    adx:        adx.toFixed(1),
    atr:        atr.toFixed(2),
    slPct:      (slPct * 100).toFixed(2),
    tpPct:      (slPct * rrMultiplier * 100).toFixed(2),
  };
}

module.exports = {
  generateSignal,
  calcEMA,
  calcEMALine,
  calcRSI,
  calcATR,
  calcADX,
  calcTrend,
};
