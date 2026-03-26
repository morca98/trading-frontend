/**
 * Backtest Final - 1 ano com análise relaxada
 * Gera sinais realistas para validação de estratégia
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gera dados históricos com padrões técnicos realistas
 */
function generateRealisticData(symbol, days = 365) {
  const candles = [];
  const now = Date.now();
  let price = 100;
  
  // Fases de mercado com características realistas
  const trendPhases = [
    { duration: 60, direction: 1, volatility: 0.015 },   // Uptrend
    { duration: 30, direction: 0, volatility: 0.008 },   // Consolidação
    { duration: 50, direction: 1, volatility: 0.02 },    // Uptrend forte
    { duration: 40, direction: -1, volatility: 0.018 },  // Downtrend
    { duration: 25, direction: 0, volatility: 0.01 },    // Consolidação
    { duration: 45, direction: 1, volatility: 0.016 },   // Uptrend
    { duration: 35, direction: -1, volatility: 0.015 },  // Downtrend
    { duration: 50, direction: 1, volatility: 0.017 },   // Uptrend
    { duration: 30, direction: 0, volatility: 0.009 },   // Consolidação
    { duration: 55, direction: 1, volatility: 0.019 },   // Uptrend forte
  ];
  
  let phaseIndex = 0;
  let currentPhase = trendPhases[0];
  let phaseCounter = 0;
  
  for (let i = days; i >= 0; i--) {
    const time = now - (i * 24 * 60 * 60 * 1000);
    
    // Atualizar fase
    if (phaseCounter >= currentPhase.duration) {
      phaseIndex = (phaseIndex + 1) % trendPhases.length;
      currentPhase = trendPhases[phaseIndex];
      phaseCounter = 0;
    }
    
    // Calcular mudança de preço
    const baseDrift = currentPhase.direction * 0.0008;
    const randomWalk = (Math.random() - 0.5) * currentPhase.volatility;
    const change = baseDrift + randomWalk;
    
    price = price * (1 + change);
    
    // OHLC realista
    const open = price * (1 + (Math.random() - 0.5) * 0.005);
    const close = price * (1 + (Math.random() - 0.5) * 0.005);
    
    const range = Math.abs(close - open) * 0.5;
    const high = Math.max(open, close) + range + Math.random() * range * 0.5;
    const low = Math.min(open, close) - range - Math.random() * range * 0.5;
    
    // Volume realista
    const baseVolume = 1000000;
    const volatilityMultiplier = 1 + Math.abs(change) * 50;
    const volume = baseVolume * volatilityMultiplier * (0.8 + Math.random() * 0.4);
    
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
    
    phaseCounter++;
  }
  
  return candles;
}

/**
 * Indicadores técnicos simplificados
 */
function calcRSI(closes, period = 14) {
  if (closes.length < period) return 50;
  
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calcEMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1];
  
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b) / period;
  
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  
  return ema;
}

function calcADX(candles, period = 14) {
  if (candles.length < period * 2) return 20;
  
  let plusDM = 0, minusDM = 0, tr = 0;
  
  for (let i = candles.length - period; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    
    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;
    
    if (upMove > downMove && upMove > 0) plusDM += upMove;
    if (downMove > upMove && downMove > 0) minusDM += downMove;
    
    const trValue = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    tr += trValue;
  }
  
  const plusDI = (plusDM / tr) * 100;
  const minusDI = (minusDM / tr) * 100;
  const di = Math.abs(plusDI - minusDI) / (plusDI + minusDI);
  
  return Math.min(100, di * 50);
}

function calcATR(candles, period = 14) {
  if (candles.length < period) return 0;
  
  let atr = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    atr += tr;
  }
  
  return atr / period;
}

/**
 * Gerar sinal com filtros relaxados
 */
function generateSignal(candles, currentPrice) {
  if (candles.length < 100) return null;
  
  const closes = candles.map(c => c.close);
  
  // Indicadores
  const rsi = calcRSI(closes);
  const adx = calcADX(candles);
  const atr = calcATR(candles);
  
  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  
  // Crossover
  const prevEma9 = calcEMA(closes.slice(0, -1), 9);
  const prevEma21 = calcEMA(closes.slice(0, -1), 21);
  
  const crossedUp = prevEma9 <= prevEma21 && ema9 > ema21;
  const crossedDown = prevEma9 >= prevEma21 && ema9 < ema21;
  
  // Filtros relaxados
  if (adx < 15) return null;
  if (rsi < 20 || rsi > 80) return null;
  
  let signal = null;
  
  if (crossedUp && ema21 > ema50) {
    signal = "BUY";
  } else if (crossedDown && ema21 < ema50) {
    signal = "SELL";
  }
  
  if (!signal) return null;
  
  // SL/TP
  const atrPct = atr / currentPrice;
  const slPct = Math.max(0.01, Math.min(0.03, atrPct * 1.2));
  
  const sl = signal === "BUY" ? currentPrice * (1 - slPct) : currentPrice * (1 + slPct);
  const tp = signal === "BUY" ? currentPrice * (1 + slPct * 2.5) : currentPrice * (1 - slPct * 2.5);
  
  return {
    signal,
    price: currentPrice,
    sl,
    tp,
    confidence: 60 + Math.min(30, (adx - 15) * 2),
    rsi,
    ema21,
    ema50,
    adx,
    atr
  };
}

/**
 * Simular trades
 */
function simulateTrades(symbol, candles) {
  const trades = [];
  let activeTrade = null;
  let equity = 10000;
  
  for (let i = 100; i < candles.length; i++) {
    const currentPrice = candles[i].close;
    const atr = calcATR(candles.slice(Math.max(0, i - 14), i + 1));
    
    // Fechar trade ativo
    if (activeTrade) {
      let shouldClose = false;
      let exitPrice = currentPrice;
      
      if (activeTrade.signal === "BUY") {
        if (currentPrice >= activeTrade.tp) {
          shouldClose = true;
          exitPrice = activeTrade.tp;
        } else if (currentPrice <= activeTrade.sl) {
          shouldClose = true;
          exitPrice = activeTrade.sl;
        }
      } else {
        if (currentPrice <= activeTrade.tp) {
          shouldClose = true;
          exitPrice = activeTrade.tp;
        } else if (currentPrice >= activeTrade.sl) {
          shouldClose = true;
          exitPrice = activeTrade.sl;
        }
      }
      
      if (shouldClose) {
        const pnl = activeTrade.signal === "BUY" 
          ? exitPrice - activeTrade.entry 
          : activeTrade.entry - exitPrice;
        
        equity += pnl;
        trades.push({
          ...activeTrade,
          exit: exitPrice,
          pnl,
          pnlPct: (pnl / activeTrade.entry) * 100
        });
        
        activeTrade = null;
      }
    }
    
    // Abrir novo trade
    if (!activeTrade) {
      const signal = generateSignal(candles.slice(0, i + 1), currentPrice);
      
      if (signal) {
        activeTrade = {
          symbol,
          signal: signal.signal,
          entry: currentPrice,
          sl: signal.sl,
          tp: signal.tp,
          time: candles[i].time,
          confidence: signal.confidence
        };
      }
    }
  }
  
  return { trades, finalEquity: equity };
}

/**
 * Executar backtest
 */
async function runFinalBacktest() {
  console.log('🚀 Backtest de 1 Ano - Análise Relaxada\n');
  
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];
  const allResults = [];
  
  for (const symbol of symbols) {
    console.log(`📊 Testando ${symbol}...`);
    
    const candles = generateRealisticData(symbol, 365);
    const result = simulateTrades(symbol, candles);
    
    const trades = result.trades;
    const winTrades = trades.filter(t => t.pnl > 0);
    const lossTrades = trades.filter(t => t.pnl <= 0);
    
    const totalPnL = result.finalEquity - 10000;
    const totalPnLPct = (totalPnL / 10000) * 100;
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.pnl, 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winTrades.length) / (avgLoss * lossTrades.length) : 0;
    
    allResults.push({
      symbol,
      trades: trades.length,
      winTrades: winTrades.length,
      lossTrades: lossTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      totalPnL,
      totalPnLPct,
      finalEquity: result.finalEquity
    });
    
    console.log(`
✅ ${symbol}:
   Trades: ${trades.length} (W: ${winTrades.length}, L: ${lossTrades.length})
   Win Rate: ${winRate.toFixed(1)}%
   Profit Factor: ${profitFactor.toFixed(2)}
   P&L: $${totalPnL.toFixed(2)} (${totalPnLPct.toFixed(2)}%)
   Avg Win: $${avgWin.toFixed(2)} | Avg Loss: $${avgLoss.toFixed(2)}
    `);
  }
  
  // Resumo
  console.log('\n' + '='.repeat(90));
  console.log('📈 RESUMO - BACKTEST 1 ANO');
  console.log('='.repeat(90) + '\n');
  
  allResults.sort((a, b) => b.profitFactor - a.profitFactor);
  
  console.log('Symbol  | Trades | W/L    | Win%  | PF    | P&L%  | Status');
  console.log('-'.repeat(90));
  
  for (const r of allResults) {
    let status = '❌';
    if (r.profitFactor > 1.5) status = '✅ Excelente';
    else if (r.profitFactor > 1.0) status = '⚠️  Marginal';
    else if (r.profitFactor > 0) status = '⚠️  Fraco';
    
    console.log(`${r.symbol.padEnd(7)} | ${String(r.trades).padEnd(6)} | ${r.winTrades}/${r.lossTrades}${' '.repeat(2)} | ${r.winRate.toFixed(1).padEnd(5)} | ${r.profitFactor.toFixed(2).padEnd(5)} | ${r.totalPnLPct.toFixed(1).padEnd(5)} | ${status}`);
  }
  
  const totalTrades = allResults.reduce((s, r) => s + r.trades, 0);
  const totalPnL = allResults.reduce((s, r) => s + r.totalPnL, 0);
  const avgPF = allResults.reduce((s, r) => s + r.profitFactor, 0) / allResults.length;
  
  console.log('\n' + '='.repeat(90));
  console.log(`📊 Totais: ${totalTrades} trades | P&L: $${totalPnL.toFixed(2)} | Profit Factor Médio: ${avgPF.toFixed(2)}`);
  console.log('='.repeat(90) + '\n');
}

runFinalBacktest().catch(console.error);
