'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  STOCK SIGNAL BOT  –  Sinais de compra de ações para Telegram
//  Idêntico ao trading-backend (cripto/Binance), mas adaptado para ações
//  via Yahoo Finance API (v8).
//  Inclui: TP/SL dinâmico, trailing stop, breakeven automático,
//  gestão de risco, relatório diário e backtest integrado.
// ─────────────────────────────────────────────────────────────────────────────

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const { generateSignal } = require('./signal');

// ── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────
const TELEGRAM_TOKEN   = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Lista de ações a monitorizar (tickers do Yahoo Finance)
const SYMBOLS = (process.env.SYMBOLS || 'AAPL,MSFT,NVDA,TSLA,AMZN,GOOGL,META,AMD').split(',');

// Cooldown entre sinais do mesmo símbolo (90 minutos – igual ao trading-backend)
const SIGNAL_COOLDOWN = 90 * 60 * 1000;

// Yahoo Finance API
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

// Ficheiros de persistência
const DATA_DIR    = process.env.DATA_DIR || '/tmp';
const STATS_FILE  = path.join(DATA_DIR, 'stock_stats.json');
const TRADES_FILE = path.join(DATA_DIR, 'stock_trades.json');

// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
var lastSignal         = {};
var lastSignalTime     = {};
var lastSignalDateBuy  = {};
var lastSignalDateSell = {};
var activeTrades       = {};
var dailyResults       = {};
var dailyReportSentDate = '';

SYMBOLS.forEach(function(s) {
  lastSignal[s]         = null;
  lastSignalTime[s]     = 0;
  lastSignalDateBuy[s]  = '';
  lastSignalDateSell[s] = '';
  dailyResults[s]       = [];
});

// ── PERSISTÊNCIA ──────────────────────────────────────────────────────────────
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      var d = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
      return { wins: d.wins || 0, losses: d.losses || 0, totalPnl: d.totalPnl || 0 };
    }
  } catch (e) {}
  return { wins: 0, losses: 0, totalPnl: 0 };
}

function saveStats(wins, losses, pnl) {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify({ wins, losses, totalPnl: pnl })); } catch (e) {}
}

function loadTrades() {
  try {
    if (fs.existsSync(TRADES_FILE)) return JSON.parse(fs.readFileSync(TRADES_FILE, 'utf8'));
  } catch (e) {}
  return [];
}

function saveTrades() {
  try { fs.writeFileSync(TRADES_FILE, JSON.stringify(tradeHistory)); } catch (e) {}
}

var stats        = loadStats();
var winCount     = stats.wins;
var lossCount    = stats.losses;
var totalPnl     = stats.totalPnl;
var tradeHistory = loadTrades();

// ── TELEGRAM ──────────────────────────────────────────────────────────────────
async function sendTelegram(msg) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[TELEGRAM]', msg.replace(/<[^>]+>/g, ''));
    return;
  }
  try {
    await axios.post(
      'https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage',
      { chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' },
      { timeout: 10000 }
    );
  } catch (e) {
    console.error('[TELEGRAM] Erro:', e.message);
  }
}

// ── DADOS DE MERCADO (Yahoo Finance v8) ───────────────────────────────────────

/**
 * Obtém candles históricos de uma ação via Yahoo Finance v8 API.
 * @param {string} symbol   - Ticker (ex: 'AAPL', 'MSFT', 'EDP.LS')
 * @param {string} interval - '1d', '1wk', '1h', '30m', '15m'
 * @param {string} range    - '1mo', '3mo', '6mo', '1y', '2y', '5y'
 * @returns {Array} Array de { time, open, high, low, close, volume }
 */
async function fetchCandles(symbol, interval, range) {
  var url = YF_BASE + '/' + symbol + '?interval=' + interval + '&range=' + range;
  var r = await axios.get(url, { headers: YF_HEADERS, timeout: 15000 });

  var result = r.data.chart.result;
  if (!result || result.length === 0) throw new Error('Sem dados para ' + symbol);

  var data       = result[0];
  var timestamps = data.timestamp;
  var ohlcv      = data.indicators.quote[0];

  if (!timestamps || timestamps.length === 0) throw new Error('Sem timestamps para ' + symbol);

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
 * Obtém o preço atual de uma ação.
 */
async function fetchPrice(symbol) {
  var url = YF_BASE + '/' + symbol + '?interval=1d&range=1d';
  var r   = await axios.get(url, { headers: YF_HEADERS, timeout: 10000 });
  return parseFloat(r.data.chart.result[0].meta.regularMarketPrice);
}

// ── INDICADORES (importados do signal.js) ─────────────────────────────────────
const { calcEMA, calcATR, calcTrend } = require('./signal');

// ── MONITORIZAÇÃO DE TRADES ATIVOS ────────────────────────────────────────────
async function checkActiveTrades() {
  var keys = Object.keys(activeTrades);
  for (var i = 0; i < keys.length; i++) {
    var symbol = keys[i];
    var trade  = activeTrades[symbol];
    try {
      var price  = await fetchPrice(symbol);
      var closed = false, pnl = 0, outcome = '';

      if (trade.signal === 'BUY') {
        // Trailing Stop Progressivo (idêntico ao trading-backend)
        var profitPct = (price - trade.entry) / trade.entry * 100;

        // Breakeven automático ao atingir +1% de lucro
        if (profitPct >= 1.0 && trade.sl < trade.entry) {
          trade.sl = trade.entry * 1.001;
          await sendTelegram(
            '<b>🛡️ Breakeven Ativado</b>\n' +
            symbol + ' SL movido para $' + trade.sl.toFixed(2)
          );
        } else if (profitPct >= 2.0 && trade.sl < trade.entry * 1.01) {
          trade.sl = trade.entry * 1.01;
          await sendTelegram(
            '<b>📈 Trailing Stop +1%</b>\n' +
            symbol + ' garantido em $' + trade.sl.toFixed(2)
          );
        }

        if (price <= trade.sl) {
          pnl     = (price - trade.entry) / trade.entry * 100;
          outcome = pnl >= 0 ? 'WIN (SL)' : 'LOSS';
          closed  = true;
        }
        if (price >= trade.tp) {
          pnl     = (price - trade.entry) / trade.entry * 100;
          outcome = 'WIN (TP)';
          closed  = true;
        }
      } else {
        // Short
        var profitPctS = (trade.entry - price) / trade.entry * 100;
        if (profitPctS >= 1.0 && trade.sl > trade.entry) {
          trade.sl = trade.entry * 0.999;
          await sendTelegram(
            '<b>🛡️ Breakeven Ativado (Short)</b>\n' +
            symbol + ' SL movido para $' + trade.sl.toFixed(2)
          );
        } else if (profitPctS >= 2.0 && trade.sl > trade.entry * 0.99) {
          trade.sl = trade.entry * 0.99;
          await sendTelegram(
            '<b>📉 Trailing Stop +1% (Short)</b>\n' +
            symbol + ' garantido em $' + trade.sl.toFixed(2)
          );
        }

        if (price >= trade.sl) {
          pnl     = (trade.entry - price) / trade.entry * 100;
          outcome = pnl >= 0 ? 'WIN (SL)' : 'LOSS';
          closed  = true;
        }
        if (price <= trade.tp) {
          pnl     = (trade.entry - price) / trade.entry * 100;
          outcome = 'WIN (TP)';
          closed  = true;
        }
      }

      if (closed) {
        if (outcome.startsWith('WIN')) winCount++; else lossCount++;
        totalPnl += pnl;
        saveStats(winCount, lossCount, totalPnl);

        var rec = tradeHistory.find(function(t) { return t.id === trade.id; });
        if (rec) {
          rec.outcome   = outcome.startsWith('WIN') ? 'WIN' : 'LOSS';
          rec.pnl       = parseFloat(pnl.toFixed(2));
          rec.exitPrice = price;
          rec.exitTime  = Date.now();
          saveTrades();
        }

        delete activeTrades[symbol];
        var total = winCount + lossCount;
        await sendTelegram(
          '<b>' + outcome + ' ' + symbol + '</b>\n' +
          'P&L: ' + (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%\n' +
          'Win Rate: ' + (total > 0 ? Math.round(winCount / total * 100) : 0) + '%'
        );
      }
    } catch (e) {
      console.error('[checkActiveTrades] ' + symbol + ':', e.message);
    }
  }
}

// ── LOOP PRINCIPAL DO BOT ─────────────────────────────────────────────────────
async function runBot() {
  await checkActiveTrades();

  for (var i = 0; i < SYMBOLS.length; i++) {
    var symbol = SYMBOLS[i];

    if (activeTrades[symbol]) continue;

    try {
      // Buscar candles diários (principal) e semanais (macro trend) em paralelo
      var results = await Promise.all([
        fetchCandles(symbol, '1d', '2y'),
        fetchCandles(symbol, '1wk', '5y'),
      ]);

      var candlesDaily   = results[0];
      var candlesWeekly  = results[1];
      var price          = candlesDaily[candlesDaily.length - 1].close;

      // macroTrend baseado em EMA50 e EMA200 semanais
      var closesWeekly = candlesWeekly.map(function(c) { return c.close; });
      var macroEma50   = closesWeekly.length >= 50
        ? calcEMA(closesWeekly.slice(-50), 50)
        : calcEMA(closesWeekly, closesWeekly.length);
      var macroEma200  = closesWeekly.length >= 200
        ? calcEMA(closesWeekly.slice(-200), 200)
        : macroEma50;
      var lastPriceW   = closesWeekly[closesWeekly.length - 1];

      var macroTrend;
      if      (lastPriceW > macroEma50 && macroEma50 > macroEma200) macroTrend = 'BULL';
      else if (lastPriceW < macroEma50 && macroEma50 < macroEma200) macroTrend = 'BEAR';
      else if (lastPriceW > macroEma200)                             macroTrend = 'UP';
      else                                                            macroTrend = 'DOWN';

      // Tendência de curto prazo (últimas 10 velas diárias)
      var closesDaily = candlesDaily.map(function(c) { return c.close; });
      var trendShort  = calcTrend(closesDaily.slice(-10));

      var atr    = calcATR(candlesDaily, 14);
      var result = generateSignal(candlesDaily, price, macroTrend, trendShort, atr);

      // Limiar de confiança 55% (idêntico ao trading-backend)
      if (!result || result.conf < 55) {
        console.log(symbol + ': WAIT (conf=' + (result ? result.conf : 'N/A') + ', macro=' + macroTrend + ')');
        continue;
      }

      // Cooldown entre sinais
      var now = Date.now();
      if (lastSignal[symbol] === result.signal && (now - lastSignalTime[symbol]) < SIGNAL_COOLDOWN) {
        continue;
      }

      // Limite de 1 sinal por dia por direção
      var todayDate = new Date().toISOString().slice(0, 10);
      if (result.signal === 'BUY'  && lastSignalDateBuy[symbol]  === todayDate) {
        console.log(symbol + ': BUY já enviado hoje');
        continue;
      }
      if (result.signal === 'SELL' && lastSignalDateSell[symbol] === todayDate) {
        console.log(symbol + ': SELL já enviado hoje');
        continue;
      }

      // Registar sinal
      lastSignal[symbol]     = result.signal;
      lastSignalTime[symbol] = now;
      if (result.signal === 'BUY')  lastSignalDateBuy[symbol]  = todayDate;
      else                          lastSignalDateSell[symbol] = todayDate;

      dailyResults[symbol].push({ signal: result.signal, conf: result.conf });

      // Abrir trade ativo
      var tradeId = symbol + '_' + now;
      activeTrades[symbol] = {
        id:     tradeId,
        symbol: symbol,
        signal: result.signal,
        entry:  price,
        sl:     result.sl,
        tp:     result.tp,
        time:   now,
      };

      // Gravar no histórico
      tradeHistory.push({
        id:         tradeId,
        symbol:     symbol,
        signal:     result.signal,
        entry:      price,
        sl:         result.sl,
        tp:         result.tp,
        slPct:      result.slPct,
        tpPct:      result.tpPct,
        conf:       result.conf,
        rsi:        result.rsi,
        adx:        result.adx,
        macroTrend: result.macroTrend,
        time:       now,
        outcome:    'OPEN',
        pnl:        0,
        exitPrice:  0,
        exitTime:   0,
      });
      saveTrades();

      // Mensagem Telegram
      var emoji = result.signal === 'BUY' ? '🟢' : '🔴';
      var msg =
        emoji + ' <b>' + result.signal + ' ' + symbol + '</b>\n\n' +
        '💰 Preço: $' + price.toFixed(2) + '\n' +
        '🛑 Stop Loss: $' + parseFloat(result.sl).toFixed(2) + ' (-' + result.slPct + '%)\n' +
        '🎯 Take Profit: $' + parseFloat(result.tp).toFixed(2) + ' (+' + result.tpPct + '%)\n' +
        '📊 Confiança: ' + result.conf + '%\n\n' +
        'RSI: ' + result.rsi + ' | ADX: ' + result.adx + ' | ATR: $' + result.atr + '\n' +
        'EMA9: $' + result.ema9 + ' | EMA21: $' + result.ema21 + ' | EMA50: $' + result.ema50 + '\n' +
        'Macro: ' + result.macroTrend + ' | Curto: ' + result.trendShort + '\n\n' +
        '⏰ ' + new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

      await sendTelegram(msg);
      console.log(symbol + ': ' + result.signal + ' conf=' + result.conf + ' entry=$' + price.toFixed(2));

    } catch (e) {
      console.error('[runBot] Erro ' + symbol + ':', e.message);
    }
  }
}

// ── RELATÓRIO DIÁRIO ──────────────────────────────────────────────────────────
async function sendDailyReport() {
  var h = new Date().getUTCHours();
  var m = new Date().getUTCMinutes();

  // Enviar às 08:00 UTC (09:00 Lisboa)
  if (h !== 8 || m > 5) return;

  var today = new Date().toISOString().slice(0, 10);
  if (dailyReportSentDate === today) return;
  dailyReportSentDate = today;

  var total = winCount + lossCount;
  var wr    = total > 0 ? Math.round(winCount / total * 100) : 0;

  var msg =
    '<b>📋 Relatório Diário – Stock Bot</b>\n' +
    'Data: ' + today + '\n\n' +
    'Win Rate: ' + wr + '% (' + winCount + 'W / ' + lossCount + 'L)\n' +
    'P&L Total: ' + (totalPnl >= 0 ? '+' : '') + totalPnl.toFixed(2) + '%\n\n';

  for (var i = 0; i < SYMBOLS.length; i++) {
    var sym = SYMBOLS[i];
    var res = dailyResults[sym];
    if (res.length > 0) {
      var buys  = res.filter(function(r) { return r.signal === 'BUY';  }).length;
      var sells = res.filter(function(r) { return r.signal === 'SELL'; }).length;
      msg += sym + ': ' + res.length + ' sinais (' + buys + 'B/' + sells + 'S)\n';
      dailyResults[sym] = [];
    }
  }

  var activeKeys = Object.keys(activeTrades);
  if (activeKeys.length > 0) {
    msg += '\n<b>Trades Ativos:</b>\n';
    activeKeys.forEach(function(sym) {
      var t = activeTrades[sym];
      msg += sym + ' ' + t.signal + ' @$' + t.entry.toFixed(2) + '\n';
    });
  }

  await sendTelegram(msg);
}

// ── ARRANQUE ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Stock Signal Bot v1.0 ===');
  console.log('Símbolos:', SYMBOLS.join(', '));
  console.log('Telegram:', TELEGRAM_TOKEN ? 'Configurado' : 'NÃO configurado (modo console)');
  console.log('');

  await sendTelegram(
    '<b>🚀 Stock Signal Bot Iniciado!</b>\n\n' +
    'Símbolos: ' + SYMBOLS.join(', ') + '\n' +
    'Intervalo: Velas Diárias (1d)\n' +
    'Estratégia: EMA9/21 Crossover + ADX + RSI\n' +
    'TP/SL: Dinâmico (ATR-based, 1%–3%)\n' +
    'R:R: 2.0x – 3.0x (baseado em ADX)\n' +
    'Gestão de Risco: Trailing Stop + Breakeven Automático\n\n' +
    'Scan a cada 4h | Verificação de trades a cada 15min'
  );

  // Primeira execução imediata
  await runBot();

  // Verificar trades ativos a cada 15 minutos
  setInterval(checkActiveTrades, 15 * 60 * 1000);

  // Scan de novos sinais a cada 4 horas
  setInterval(runBot, 4 * 60 * 60 * 1000);

  // Relatório diário (verifica a cada 5 minutos se é hora de enviar)
  setInterval(sendDailyReport, 5 * 60 * 1000);

  console.log('Bot em execução. Scan a cada 4h, verificação de trades a cada 15min.');
}

main().catch(function(e) {
  console.error('Erro fatal:', e);
  process.exit(1);
});
