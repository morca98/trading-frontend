'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  STOCK BACKTEST ENGINE
//  Idêntico ao BacktestEngine do trading-backend, adaptado para ações.
//  Usa Yahoo Finance v8 API via axios para dados históricos.
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');
const { calcEMA, calcATR, calcTrend } = require('./signal');

const YF_BASE    = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

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

  // ── DADOS HISTÓRICOS ────────────────────────────────────────────────────────
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

  // ── EXECUÇÃO DO BACKTEST ─────────────────────────────────────────────────────
  async run(generateSignalFn) {
    console.log('[Backtest] A carregar dados para ' + this.symbol + '...');

    var candles = await this.fetchCandles(this.interval, this.range);
    console.log('[Backtest] ' + candles.length + ' velas diárias carregadas');

    // Candles semanais para macro trend (equivalente aos 4h do backend cripto)
    var candlesWeekly = [];
    try {
      candlesWeekly = await this.fetchCandles('1wk', '5y');
      console.log('[Backtest] ' + candlesWeekly.length + ' velas semanais carregadas');
    } catch (e) {
      console.log('[Backtest] Sem dados semanais, macro trend menos preciso');
    }

    this.trades  = [];
    this.capital = this.initialCapital;
    var lastLossCandle = -1;
    var self = this;

    for (var i = 60; i < candles.length - 1; i++) {
      var window        = candles.slice(0, i + 1);
      var currentCandle = window[window.length - 1];
      var price         = currentCandle.close;

      // Cooldown: 3 velas após perda (idêntico ao trading-backend)
      if (lastLossCandle > 0 && i - lastLossCandle < 3) continue;

      // macroTrend a partir das velas semanais até ao momento atual
      var macroTrend = 'NEUTRAL';
      if (candlesWeekly.length > 0) {
        var relevantW = candlesWeekly.filter(function(c) { return c.time <= currentCandle.time; });
        if (relevantW.length >= 20) {
          var closesW  = relevantW.map(function(c) { return c.close; });
          var mEma50   = relevantW.length >= 50 ? calcEMA(closesW.slice(-50), 50) : calcEMA(closesW.slice(-20), 20);
          var mEma200  = relevantW.length >= 200 ? calcEMA(closesW.slice(-200), 200) : mEma50;
          var lastPW   = closesW[closesW.length - 1];
          if      (lastPW > mEma50 && mEma50 > mEma200) macroTrend = 'BULL';
          else if (lastPW < mEma50 && mEma50 < mEma200) macroTrend = 'BEAR';
          else if (lastPW > mEma200)                     macroTrend = 'UP';
          else                                            macroTrend = 'DOWN';
        }
      }

      var closesD    = window.map(function(c) { return c.close; });
      var trendShort = calcTrend(closesD.slice(-10));
      var atr        = calcATR(window, 14);

      var signalResult = generateSignalFn(window, price, macroTrend, trendShort, atr);

      if (!signalResult || signalResult.conf < 55) continue;

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

      // Simular saída nas próximas 20 velas (20 dias de negociação)
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
        // PnL baseado no risco fixo por trade (idêntico ao trading-backend)
        var rrMultiplier = parseFloat(signalResult.tpPct) / parseFloat(signalResult.slPct) || 2.2;
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
          time:     currentCandle.time,
          exitTime: exitTime,
          symbol:   this.symbol,
          signal:   signalResult.signal,
          entry:    entryPrice,
          exit:     exitPrice,
          outcome:  outcome,
          pnl:      netPnl,
          pnlPct:   (netPnl / (this.capital - netPnl)) * 100,
          capital:  this.capital,
          conf:     signalResult.conf,
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
