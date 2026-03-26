'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  STOCK SIGNAL BOT  –  Estratégia Multi-Timeframe V3
//
//  Filtros de entrada (todos obrigatórios):
//   1. RSI Semanal < 50
//   2. Preço Diário > SMA(70)
//   3. RSI 4h < 40
//   4. MACD 4h com divergência bullish
//   5. Vela 4h de confirmação: Higher High + Higher Low
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const {
  generateMtfSignal,
  calcEMA,
  calcATR,
  calcTrend,
} = require('./signal');

// ── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────
const TELEGRAM_TOKEN   = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SYMBOLS = (process.env.SYMBOLS || 'AAPL,MSFT,NVDA,TSLA,AMZN,GOOGL,META,AMD,AVGO,NFLX,ADBE,CSCO,INTC,ORCL,CRM,QCOM,TXN,AMAT,MU,ISRG,PANW,LRCX,HON,SBUX,VRTX,REGN,ADI,KLAC,MDLZ,PYPL,V,MA,JPM,UNH,LLY,XOM,HD,PG,JNJ,ABBV,WMT,COST,BAC,KO,MRK,CVX,PEP,TMO,PFE,LIN,DIS,ACN,ABT,DHR,VZ,NEE,WFC,PM,NKE,RTX,LOW,BMY,COP,UNP,AMGN,T,GE,AXP,MS,GS,CAT,EDP.LS,GALP.LS,BCP.LS,JMT.LS,EDPR.LS,NOS.LS,SON.LS,CTT.LS,RENE.LS,NVG.LS,ALTR.LS,SEM.LS,COR.LS,EGL.LS,IBS.LS,NBA.LS,PHR.LS,ASML.AS,SAP.DE,MC.PA,OR.PA,TTE.PA,SAN.MC,BBVA.MC,INGA.AS,BNP.PA,ISP.MI,ENI.MI,ENEL.MI,DAI.DE,BMW.DE,BAS.DE,ALV.DE,DTE.DE,AIR.PA,AI.PA,CS.PA,DG.PA,BN.PA,IBE.MC,ABI.BR,ADS.DE,BAYN.DE,VOW3.DE,PRX.AS,RMS.PA,KER.PA,SAF.PA,EL.PA,AD.AS,CRH.L,STLAM.MI,MBG.DE,DHL.DE,IFX.DE,SIE.DE,MUV2.DE,PETR4.SA,VALE3.SA,ITUB4.SA,BBDC4.SA,ABEV3.SA,BBAS3.SA,B3SA3.SA,WEGE3.SA,JBSS3.SA,SUZB3.SA,RENT3.SA,GGBR4.SA,CSNA3.SA,LREN3.SA,MGLU3.SA,PRIO3.SA,UGPA3.SA,VIVT3.SA,RADL3.SA,SBSP3.SA,RAIL3.SA,EQTL3.SA,RDOR3.SA,ELET3.SA,CPFE3.SA,CCRO3.SA,CMIG4.SA,CSAN3.SA,BRFS3.SA,SMCI,MSTR,VRT,CELH,ELF,DECK,ANF,COIN,DKNG,SKX,AAL,DAL,UAL,SAVE,NCLH,RCL,CCL,HOOD,SOFI,AFRM,UPST,PLTR,AI,PATH,SNOW,NET,CRWD,ZS,OKTA,MDB,DDOG,GME,AMC,KOSS,BB,RIVN,LCID,NKLA,QS,PLUG,FCEL,BLDP,SPCE,FUBO,OPEN,CHPT,RUN,SUNW,MARA,RIOT').split(',');

const SIGNAL_COOLDOWN = 90 * 60 * 1000; // 90 minutos

// Yahoo Finance API
const YF_BASE    = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

// Persistência
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
  try { fs.writeFileSync(STATS_FILE, JSON.stringify({ wins: wins, losses: losses, totalPnl: pnl })); } catch (e) {}
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

// ── DADOS DE MERCADO ──────────────────────────────────────────────────────────

/**
 * Obtém candles históricos via Yahoo Finance v8 API.
 * @param {string} symbol   - Ticker (ex: 'AAPL', 'EDP.LS')
 * @param {string} interval - '1d', '1wk', '4h', '1h'
 * @param {string} range    - '1mo', '3mo', '6mo', '1y', '2y', '5y'
 */
async function fetchCandles(symbol, interval, range) {
  var url = YF_BASE + '/' + symbol + '?interval=' + interval + '&range=' + range;
  var r   = await axios.get(url, { headers: YF_HEADERS, timeout: 15000 });

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

async function fetchPrice(symbol) {
  var url = YF_BASE + '/' + symbol + '?interval=1d&range=1d';
  var r   = await axios.get(url, { headers: YF_HEADERS, timeout: 10000 });
  return parseFloat(r.data.chart.result[0].meta.regularMarketPrice);
}

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
        var profitPct = (price - trade.entry) / trade.entry * 100;

        // Breakeven automático ao atingir +1%
        if (profitPct >= 1.0 && trade.sl < trade.entry) {
          trade.sl = trade.entry * 1.001;
          await sendTelegram(
            '🛡️ <b>Breakeven Ativado</b>\n' +
            symbol + ' — SL movido para $' + trade.sl.toFixed(2)
          );
        } else if (profitPct >= 2.0 && trade.sl < trade.entry * 1.01) {
          trade.sl = trade.entry * 1.01;
          await sendTelegram(
            '📈 <b>Trailing Stop +1%</b>\n' +
            symbol + ' — garantido em $' + trade.sl.toFixed(2)
          );
        }

        if (price <= trade.sl) { pnl = (price - trade.entry) / trade.entry * 100; outcome = pnl >= 0 ? 'WIN (SL)' : 'LOSS'; closed = true; }
        if (price >= trade.tp) { pnl = (price - trade.entry) / trade.entry * 100; outcome = 'WIN (TP)'; closed = true; }
      } else {
        var profitPctS = (trade.entry - price) / trade.entry * 100;
        if (profitPctS >= 1.0 && trade.sl > trade.entry) {
          trade.sl = trade.entry * 0.999;
          await sendTelegram('🛡️ <b>Breakeven Ativado (Short)</b>\n' + symbol + ' SL movido para $' + trade.sl.toFixed(2));
        } else if (profitPctS >= 2.0 && trade.sl > trade.entry * 0.99) {
          trade.sl = trade.entry * 0.99;
          await sendTelegram('📉 <b>Trailing Stop +1% (Short)</b>\n' + symbol + ' garantido em $' + trade.sl.toFixed(2));
        }
        if (price >= trade.sl) { pnl = (trade.entry - price) / trade.entry * 100; outcome = pnl >= 0 ? 'WIN (SL)' : 'LOSS'; closed = true; }
        if (price <= trade.tp) { pnl = (trade.entry - price) / trade.entry * 100; outcome = 'WIN (TP)'; closed = true; }
      }

      if (closed) {
        if (outcome.startsWith('WIN')) winCount++; else lossCount++;
        totalPnl += pnl;
        saveStats(winCount, lossCount, totalPnl);

        var rec = tradeHistory.find(function(t) { return t.id === trade.id; });
        if (rec) { rec.outcome = outcome.startsWith('WIN') ? 'WIN' : 'LOSS'; rec.pnl = parseFloat(pnl.toFixed(2)); rec.exitPrice = price; rec.exitTime = Date.now(); saveTrades(); }

        delete activeTrades[symbol];
        var total = winCount + lossCount;
        await sendTelegram(
          '<b>' + (outcome.startsWith('WIN') ? '✅' : '❌') + ' ' + outcome + ' ' + symbol + '</b>\n' +
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
      // Buscar candles nos três timeframes em paralelo
      var results = await Promise.all([
        fetchCandles(symbol, '1wk', '5y'),  // Semanal — RSI semanal
        fetchCandles(symbol, '1d',  '2y'),  // Diário  — SMA70
        fetchCandles(symbol, '4h',  '6mo'), // 4h      — RSI, MACD, confirmação de vela
      ]);

      var weeklyCandles = results[0];
      var dailyCandles  = results[1];
      var h4Candles     = results[2];

      // Gerar sinal MTF V3
      var result = generateMtfSignal({
        weeklyCandles: weeklyCandles,
        dailyCandles:  dailyCandles,
        h4Candles:     h4Candles,
      });

      if (!result || result.conf < 65) {
        var mtfLog = result ? result.mtf : null;
        console.log(
          symbol + ': WAIT' +
          (mtfLog ? ' [wRSI=' + mtfLog.weeklyRsi + ' dMA70=' + mtfLog.dailyAboveMa70 + ' h4RSI=' + mtfLog.h4Rsi + ' MACDdiv=' + mtfLog.h4MacdBullishDivergence + ' candle=' + mtfLog.h4CandleConfirmation + ']' : '')
        );
        continue;
      }

      // Cooldown
      var now = Date.now();
      if (lastSignal[symbol] === result.signal && (now - lastSignalTime[symbol]) < SIGNAL_COOLDOWN) continue;

      // Limite diário
      var todayDate = new Date().toISOString().slice(0, 10);
      if (result.signal === 'BUY'  && lastSignalDateBuy[symbol]  === todayDate) { console.log(symbol + ': BUY já enviado hoje'); continue; }
      if (result.signal === 'SELL' && lastSignalDateSell[symbol] === todayDate) { console.log(symbol + ': SELL já enviado hoje'); continue; }

      // Registar
      lastSignal[symbol]     = result.signal;
      lastSignalTime[symbol] = now;
      if (result.signal === 'BUY') lastSignalDateBuy[symbol] = todayDate;
      else                         lastSignalDateSell[symbol] = todayDate;

      dailyResults[symbol].push({ signal: result.signal, conf: result.conf });

      // Abrir trade ativo
      var tradeId = symbol + '_' + now;
      activeTrades[symbol] = {
        id:     tradeId,
        symbol: symbol,
        signal: result.signal,
        entry:  result.price,
        sl:     result.sl,
        tp:     result.tp,
        time:   now,
      };

      tradeHistory.push({
        id:          tradeId,
        symbol:      symbol,
        signal:      result.signal,
        entry:       result.price,
        sl:          result.sl,
        tp:          result.tp,
        slPct:       result.slPct,
        tpPct:       result.tpPct,
        conf:        result.conf,
        rsi:         result.rsi,
        adx:         result.adx,
        macroTrend:  result.macroTrend,
        time:        now,
        outcome:     'OPEN',
        pnl:         0,
        exitPrice:   0,
        exitTime:    0,
        mtfSnapshot: {
          weeklyRsi:              result.mtf.weeklyRsi,
          dailyMa70:              result.mtf.dailyMa70,
          h4Rsi:                  result.mtf.h4Rsi,
          h4MacdBullishDivergence: result.mtf.h4MacdBullishDivergence,
          h4CandleConfirmation:   result.mtf.h4CandleConfirmation,
        },
      });
      saveTrades();

      // Mensagem Telegram com detalhe dos filtros MTF
      var mtf   = result.mtf;
      var emoji = result.signal === 'BUY' ? '🟢' : '🔴';
      var msg =
        emoji + ' <b>' + result.signal + ' ' + symbol + '</b>\n\n' +
        '💰 <b>Preço:</b> $' + result.price.toFixed(2) + '\n' +
        '🛑 <b>Stop Loss:</b> $' + parseFloat(result.sl).toFixed(2) + ' (-' + result.slPct + '%)\n' +
        '🎯 <b>Take Profit:</b> $' + parseFloat(result.tp).toFixed(2) + ' (+' + result.tpPct + '%)\n' +
        '📊 <b>Confiança:</b> ' + result.conf + '%\n\n' +
        '<b>Indicadores:</b>\n' +
        '• RSI 4h: ' + result.rsi + '\n' +
        '• ADX: ' + result.adx + '\n' +
        '• ATR: $' + result.atr + '\n' +
        '• EMA9: $' + result.ema9 + ' | EMA21: $' + result.ema21 + '\n' +
        '• EMA50: $' + result.ema50 + '\n\n' +
        '<b>Filtros MTF:</b>\n' +
        '• RSI Semanal: ' + mtf.weeklyRsi + ' ' + (mtf.weeklyRsiOk ? '✅' : '❌') + ' (&lt; 50)\n' +
        '• Preço vs MA70: $' + mtf.dailyClose + ' vs $' + mtf.dailyMa70 + ' ' + (mtf.dailyAboveMa70 ? '✅' : '❌') + '\n' +
        '• RSI 4h: ' + mtf.h4Rsi + ' ' + (mtf.h4RsiOk ? '✅' : '❌') + ' (&lt; 40)\n' +
        '• MACD Divergência Bullish: ' + (mtf.h4MacdBullishDivergence ? '✅' : '❌') + '\n' +
        '• Vela 4h HH+HL: ' + (mtf.h4CandleConfirmation ? '✅' : '❌') +
          ' (H:' + (mtf.h4HigherHigh ? '↑' : '↓') + ' L:' + (mtf.h4HigherLow ? '↑' : '↓') + ')\n\n' +
        '⏰ ' + new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

      await sendTelegram(msg);
      console.log(
        symbol + ': ' + result.signal + ' conf=' + result.conf +
        ' entry=$' + result.price.toFixed(2) +
        ' | wRSI=' + mtf.weeklyRsi +
        ' dMA70=' + mtf.dailyAboveMa70 +
        ' h4RSI=' + mtf.h4Rsi +
        ' MACDdiv=' + mtf.h4MacdBullishDivergence +
        ' candle=' + mtf.h4CandleConfirmation
      );

    } catch (e) {
      console.error('[runBot] Erro ' + symbol + ':', e.message);
    }
  }
}

// ── RELATÓRIO DIÁRIO ──────────────────────────────────────────────────────────
async function sendDailyReport() {
  var h = new Date().getUTCHours();
  var m = new Date().getUTCMinutes();
  if (h !== 8 || m > 5) return;

  var today = new Date().toISOString().slice(0, 10);
  if (dailyReportSentDate === today) return;
  dailyReportSentDate = today;

  var total = winCount + lossCount;
  var wr    = total > 0 ? Math.round(winCount / total * 100) : 0;

  var msg =
    '<b>📋 Relatório Diário – Stock Bot MTF V3</b>\n' +
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

// ── MENSAGEM DE ARRANQUE ──────────────────────────────────────────────────────

/**
 * Envia para o Telegram uma mensagem completa com toda a lógica de sinais
 * e o estado atual do bot.
 */
async function sendStartupMessage() {
  var startTime        = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
  var activeTradePairs = Object.keys(activeTrades).length;
  var total            = winCount + lossCount;
  var wr               = total > 0 ? Math.round(winCount / total * 100) : 0;

  var msg =
    '✅ <b>Stock Signal Bot — ONLINE (MTF V3)</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🕐 <b>Arranque:</b> ' + startTime + '\n' +
    '📡 <b>Telegram:</b> Ligado e funcional\n' +
    '📈 <b>Símbolos:</b> ' + SYMBOLS.length + ' em monitorização\n' +
    '💼 <b>Trades ativos:</b> ' + activeTradePairs + '\n' +
    '🏆 <b>Histórico:</b> ' + winCount + 'W / ' + lossCount + 'L' +
      (total > 0 ? ' (' + wr + '%)' : '') +
      ' | P&L: ' + (totalPnl >= 0 ? '+' : '') + totalPnl.toFixed(2) + '%\n' +
    '━━━━━━━━━━━━━━━━━━━━━━\n\n' +

    '📋 <b>LÓGICA DE SINAIS — Multi-Timeframe V3</b>\n\n' +

    '<b>Estratégia:</b> Só entra em ativos que cumpram TODOS os 5 filtros em simultâneo.\n\n' +

    '<b>Filtro 1 — RSI Semanal &lt; 50</b>\n' +
    '• Timeframe: Semanal (1wk)\n' +
    '• Condição: RSI(14) calculado sobre fechos semanais\n' +
    '• Lógica: Garante que o ativo não está sobrecomprado no macro.\n' +
    '  RSI &lt; 50 = ainda há espaço para subir.\n\n' +

    '<b>Filtro 2 — Preço Diário &gt; SMA(70)</b>\n' +
    '• Timeframe: Diário (1d)\n' +
    '• Condição: Fecho diário acima da Média Móvel Simples de 70 dias\n' +
    '• Lógica: Confirma tendência de médio prazo bullish.\n' +
    '  Só entrar quando o preço está acima da MA70.\n\n' +

    '<b>Filtro 3 — RSI 4h &lt; 40</b>\n' +
    '• Timeframe: 4 horas (4h)\n' +
    '• Condição: RSI(14) calculado sobre fechos de 4h\n' +
    '• Lógica: Identifica pullback/sobrevenda no intraday.\n' +
    '  RSI &lt; 40 = zona de potencial reversão bullish.\n\n' +

    '<b>Filtro 4 — MACD 4h com Divergência Bullish</b>\n' +
    '• Timeframe: 4 horas (4h)\n' +
    '• MACD: EMA(12) - EMA(26) | Sinal: EMA(9) do MACD\n' +
    '• Condição: Preço faz Lower Low mas histograma MACD faz Higher Low\n' +
    '• Janela: últimas 20 velas de 4h\n' +
    '• Lógica: Enfraquecimento da pressão vendedora.\n' +
    '  O preço ainda desce mas o momentum já está a recuperar.\n\n' +

    '<b>Filtro 5 — Vela 4h de Confirmação (HH + HL)</b>\n' +
    '• Timeframe: 4 horas (4h)\n' +
    '• Condição: A vela atual deve ter:\n' +
    '  — High &gt; High da vela anterior (Higher High)\n' +
    '  — Low &gt; Low da vela anterior (Higher Low)\n' +
    '• Lógica: Confirma que a reversão já começou.\n' +
    '  A vela fechou com estrutura bullish clara.\n\n' +

    '━━━━━━━━━━━━━━━━━━━━━━\n' +
    '<b>Gestão de Risco:</b>\n' +
    '• SL: Abaixo da mínima da vela de confirmação (ATR-based, 0.8%–2.5%)\n' +
    '• TP: R:R dinâmico baseado em ADX (2.5x – 3.5x)\n' +
    '• Breakeven automático ao atingir +1% de lucro\n' +
    '• Trailing Stop ao atingir +2% de lucro\n' +
    '• Cooldown: 90 min entre sinais do mesmo símbolo\n' +
    '• Limite: 1 sinal BUY por símbolo por dia\n\n' +

    '<b>Intervalos de Execução:</b>\n' +
    '• Scan de novos sinais: a cada 4 horas\n' +
    '• Verificação de trades ativos: a cada 15 minutos\n' +
    '• Relatório diário: às 09:00 (Lisboa)\n\n' +

    '━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🚀 <b>Sistema operacional e pronto para trading.</b>';

  await sendTelegram(msg);
}

// ── ARRANQUE ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Stock Signal Bot MTF V3 ===');
  console.log('Símbolos:', SYMBOLS.length);
  console.log('Telegram:', TELEGRAM_TOKEN ? 'Configurado' : 'NÃO configurado (modo console)');
  console.log('');

  // Enviar mensagem de arranque com lógica completa
  await sendStartupMessage();

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
