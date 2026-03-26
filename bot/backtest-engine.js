'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  STOCK BACKTEST ENGINE  –  MTF V3
//
//  Usa a mesma lógica de generateMtfSignal do server.js para garantir
//  consistência total entre os sinais ao vivo e os resultados de backtest.
//
//  Estratégia de candles sintéticos:
//   - Semanal: cada 5 candles diários agrupados numa vela semanal
//   - 4h: cada candle diário dividido em 6 candles de 4h sintéticos
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');
const {
  generateMtfSignal,
  calcEMA,
  calcATR,
  calcTrend,
} = require('./signal');

const YF_BASE    = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

// ── CANDLES SINTÉTICOS ────────────────────────────────────────────────────────

/**
 * Agrupa candles diários em candles semanais sintéticos (5 dias = 1 semana).
 */
function buildWeeklyCandles(dailyCandles) {
  var weekly = [];
  for (var i = 0; i < dailyCandles.length; i += 5) {
    var chunk = dailyCandles.slice(i, i + 5);
    if (chunk.length === 0) continue;
    weekly.push({
      time:   chunk[0].time,
      open:   chunk[0].open,
      high:   Math.max.apply(null, chunk.map(function(c) { return c.high; })),
      low:    Math.min.apply(null, chunk.map(function(c) { return c.low; })),
      close:  chunk[chunk.length - 1].close,
      volume: chunk.reduce(function(s, c) { return s + c.volume; }, 0),
    });
  }
  return weekly;
}

/**
 * Divide cada candle diário em 6 candles de 4h sintéticos.
 */
function buildH4Candles(dailyCandles) {
  var h4    = [];
  var h4ms  = 4 * 60 * 60 * 1000;

  for (var d = 0; d < dailyCandles.length; d++) {
    var day   = dailyCandles[d];
    var range = day.high - day.low;
    var volPerBar = day.volume / 6;

    for (var j = 0; j < 6; j++) {
      var t        = day.time + j * h4ms;
      var midOpen  = day.open  + (day.close - day.open) * (j / 6);
      var midClose = day.open  + (day.close - day.open) * ((j + 1) / 6);
      var frac     = j / 5;
      var subHigh  = midClose + range * 0.1 * (1 - frac);
      var subLow   = midOpen  - range * 0.1 * frac;

      h4.push({
        time:   t,
        open:   midOpen,
        high:   Math.max(midOpen, midClose, subHigh),
        low:    Math.min(midOpen, midClose, subLow),
        close:  midClose,
        volume: volPerBar,
      });
    }
  }

  return h4;
}

// ── MOTOR DE BACKTEST ─────────────────────────────────────────────────────────

class StockBacktestEngine {
  constructor(options) {
    options = options || {};
    this.symbol         = options.symbol         || 'AAPL';
    this.interval       = options.interval       || '1d';
    this.range          = options.range          || '2y';
    this.initialCapital = options.initialCapital || 10000;
    this.riskPerTrade   = options.riskPerTrade   || 0.02;  // 2% do capital por trade
    this.fee            = options.fee            || 0.001; // 0.1% comissão
    this.slippage       = options.slippage       || 0.001; // 0.1% slippage

    this.capital     = this.initialCapital;
    this.maxCapital  = this.initialCapital;
    this.maxDD       = 0;
    this.trades      = [];
    this.lastTradeDateBuy  = '';
    this.lastTradeDateSell = '';
  }

  async fetchCandles(interval, range) {
    var url = YF_BASE + '/' + this.symbol + '?interval=' + interval + '&range=' + range;
    var r   = await axios.get(url, { headers: YF_HEADERS, timeout: 20000 });

    var result = r.data.chart.result;
    if (!result || result.length === 0) throw new Error('Sem dados para ' + this.symbol);

    var data       = result[0];
    var timestamps = data.timestamp;
    var ohlcv      = data.indicators.quote[0];

    if (!timestamps || timestamps.length === 0) throw new Error('Sem timestamps para ' + this.symbol);

    var candles = [];
    for (var i = 0; i < timestamps.length; i++) {
      if (!ohlcv.open[i] || !ohlcv.close[i]) continue;
      candles.push({
        time:   timestamps[i] * 1000,
        open:   parseFloat(ohlcv.open[i]),
        high:   parseFloat(ohlcv.high[i]),
        low:    parseFloat(ohlcv.low[i]),
        close:  parseFloat(ohlcv.close[i]),
        volume: parseFloat(ohlcv.volume[i]) || 0,
      });
    }

    return candles;
  }

  /**
   * Executa o backtest com a lógica MTF V3.
   * Usa candles sintéticos de 4h e semanais derivados dos dados diários.
   *
   * @param {Function} generateSignalFn - Ignorado (mantido por compatibilidade).
   *                                      Usa sempre generateMtfSignal internamente.
   */
  async run(generateSignalFn) {
    console.log('[Backtest] A carregar dados para ' + this.symbol + '...');

    var candles = await this.fetchCandles(this.interval, this.range);
    console.log('[Backtest] ' + candles.length + ' velas diárias carregadas');

    // Pré-calcular candles sintéticos para toda a série
    var allWeeklyCandles = buildWeeklyCandles(candles);
    var allH4Candles     = buildH4Candles(candles);

    console.log('[Backtest] ' + allWeeklyCandles.length + ' velas semanais sintéticas');
    console.log('[Backtest] ' + allH4Candles.length + ' velas de 4h sintéticas');

    this.trades  = [];
    this.capital = this.initialCapital;
    var lastLossCandle = -1;
    var self = this;

    for (var i = 100; i < candles.length - 1; i++) {
      var currentCandle = candles[i];
      var price         = currentCandle.close;

      // Cooldown: 3 velas após perda
      if (lastLossCandle > 0 && i - lastLossCandle < 3) continue;

      // Janelas para cada timeframe
      var dailyWindow  = candles.slice(Math.max(0, i - 100), i + 1);
      var weeklyWindow = allWeeklyCandles.slice(0, Math.ceil((i + 1) / 5));
      var h4Window     = allH4Candles.slice(0, (i + 1) * 6);

      // Montar estrutura MTF
      var mtfData = {
        weeklyCandles: weeklyWindow.slice(-30),
        dailyCandles:  dailyWindow,
        h4Candles:     h4Window.slice(-120), // últimas 120 velas de 4h (~20 dias)
      };

      // Gerar sinal MTF V3 (mesma lógica do bot ao vivo)
      var signalResult = generateMtfSignal(mtfData);

      if (!signalResult || signalResult.conf < 65) continue;

      // Limite de 1 trade por dia por direção
      var currentDate = new Date(currentCandle.time).toISOString().slice(0, 10);
      if (signalResult.signal === 'BUY'  && currentDate === this.lastTradeDateBuy)  continue;
      if (signalResult.signal === 'SELL' && currentDate === this.lastTradeDateSell) continue;

      // Entrada com slippage
      var entryPrice = signalResult.signal === 'BUY'
        ? price * (1 + this.slippage)
        : price * (1 - this.slippage);

      var sl = signalResult.sl;
      var tp = signalResult.tp;

      // Simular saída nas próximas 20 velas
      var outcome   = null;
      var exitPrice = 0;
      var exitTime  = 0;

      for (var j = i + 1; j < Math.min(i + 20, candles.length); j++) {
        var next = candles[j];
        if (signalResult.signal === 'BUY') {
          if (next.low  <= sl) { outcome = 'LOSS'; exitPrice = sl; exitTime = next.time; break; }
          if (next.high >= tp) { outcome = 'WIN';  exitPrice = tp; exitTime = next.time; break; }
        } else {
          if (next.high >= sl) { outcome = 'LOSS'; exitPrice = sl; exitTime = next.time; break; }
          if (next.low  <= tp) { outcome = 'WIN';  exitPrice = tp; exitTime = next.time; break; }
        }
      }

      if (outcome) {
        var rrMultiplier = parseFloat(signalResult.tpPct) / parseFloat(signalResult.slPct) || 2.5;
        var pnlAmount    = this.capital * this.riskPerTrade * (outcome === 'WIN' ? rrMultiplier : -1);
        var feeAmount    = this.capital * this.fee * 2;
        var netPnl       = pnlAmount - feeAmount;

        this.capital    += netPnl;
        this.maxCapital  = Math.max(this.maxCapital, this.capital);
        this.maxDD       = Math.max(this.maxDD, (this.maxCapital - this.capital) / this.maxCapital * 100);

        if (outcome === 'LOSS') lastLossCandle = i;

        var tradeDate = new Date(currentCandle.time).toISOString().slice(0, 10);
        if (signalResult.signal === 'BUY')  this.lastTradeDateBuy  = tradeDate;
        else                                this.lastTradeDateSell = tradeDate;

        this.trades.push({
          time:        currentCandle.time,
          exitTime:    exitTime,
          symbol:      this.symbol,
          signal:      signalResult.signal,
          entry:       entryPrice,
          exit:        exitPrice,
          outcome:     outcome,
          pnl:         netPnl,
          pnlPct:      (netPnl / (this.capital - netPnl)) * 100,
          capital:     this.capital,
          conf:        signalResult.conf,
          mtfSnapshot: signalResult.mtf ? {
            weeklyRsi:              signalResult.mtf.weeklyRsi,
            dailyMa70:              signalResult.mtf.dailyMa70,
            h4Rsi:                  signalResult.mtf.h4Rsi,
            h4MacdBullishDivergence: signalResult.mtf.h4MacdBullishDivergence,
            h4CandleConfirmation:   signalResult.mtf.h4CandleConfirmation,
          } : null,
        });

        // Avançar para a vela de saída
        while (i < candles.length - 1 && candles[i].time < exitTime) i++;
      }
    }

    return this.getResults();
  }

  getResults() {
    var wins   = this.trades.filter(function(t) { return t.outcome === 'WIN';  }).length;
    var losses = this.trades.filter(function(t) { return t.outcome === 'LOSS'; }).length;
    var total  = wins + losses;

    return {
      symbol:       this.symbol,
      totalTrades:  total,
      wins:         wins,
      losses:       losses,
      winRate:      (total > 0 ? (wins / total) * 100 : 0).toFixed(2),
      finalCapital: this.capital.toFixed(2),
      returnPct:    (((this.capital - this.initialCapital) / this.initialCapital) * 100).toFixed(2),
      maxDD:        this.maxDD.toFixed(2),
      profitFactor: this.calcProfitFactor().toFixed(2),
      trades:       this.trades,
    };
  }

  calcProfitFactor() {
    var grossProfit = this.trades.filter(function(t) { return t.pnl > 0; }).reduce(function(s, t) { return s + t.pnl; }, 0);
    var grossLoss   = Math.abs(this.trades.filter(function(t) { return t.pnl < 0; }).reduce(function(s, t) { return s + t.pnl; }, 0));
    return grossLoss === 0 ? (grossProfit > 0 ? grossProfit : 0) : grossProfit / grossLoss;
  }
}

module.exports = StockBacktestEngine;
