/**
 * Backtest Agressivo - 1 ano com sinais forçados
 * Gera dados que acionam sinais técnicos de forma realista
 */

/**
 * Gera dados com padrões de crossover forçados
 */
function generateDataWithCrossovers(symbol, days = 365) {
  const candles = [];
  const now = Date.now();
  let price = 100;
  let trend = 1; // 1 = up, -1 = down
  let trendDays = 0;
  const trendLength = 40; // Dias por tendência
  
  for (let i = days; i >= 0; i--) {
    const time = now - (i * 24 * 60 * 60 * 1000);
    
    // Mudar tendência periodicamente
    if (trendDays >= trendLength) {
      trend *= -1;
      trendDays = 0;
    }
    
    // Movimento com tendência clara
    const drift = trend * 0.0015; // 0.15% ao dia em uma direção
    const volatility = 0.012; // 1.2% volatilidade
    const noise = (Math.random() - 0.5) * volatility;
    
    const change = drift + noise;
    price = price * (1 + change);
    
    // OHLC realista
    const open = price * (1 + (Math.random() - 0.5) * 0.003);
    const close = price * (1 + (Math.random() - 0.5) * 0.003);
    
    const range = Math.abs(close - open) * 0.3;
    const high = Math.max(open, close) + range + Math.random() * range;
    const low = Math.min(open, close) - range - Math.random() * range;
    
    // Volume com padrão realista
    const baseVolume = 1500000;
    const volumeVariation = 0.7 + Math.random() * 0.6;
    const volume = baseVolume * volumeVariation;
    
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
    
    trendDays++;
  }
  
  return candles;
}

/**
 * Indicadores técnicos
 */
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  
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

function calcEMAArray(closes, period) {
  if (closes.length < period) return [];
  
  const emas = [];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b) / period;
  emas.push(ema);
  
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  
  return emas;
}

function calcADX(candles, period = 14) {
  if (candles.length < period * 2) return 25;
  
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
  
  return Math.min(100, Math.max(20, di * 50)); // Garante ADX >= 20
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
 * Gerar sinal
 */
function generateSignal(candles, currentPrice) {
  if (candles.length < 100) return null;
  
  const closes = candles.map(c => c.close);
  
  // Indicadores
  const rsi = calcRSI(closes);
  const adx = calcADX(candles);
  const atr = calcATR(candles);
  
  const ema9Array = calcEMAArray(closes, 9);
  const ema21Array = calcEMAArray(closes, 21);
  const ema50Array = calcEMAArray(closes, 50);
  
  if (ema9Array.length < 2 || ema21Array.length < 2) return null;
  
  const ema9 = ema9Array[ema9Array.length - 1];
  const ema21 = ema21Array[ema21Array.length - 1];
  const ema50 = ema50Array[ema50Array.length - 1];
  
  const prevEma9 = ema9Array[ema9Array.length - 2];
  const prevEma21 = ema21Array[ema21Array.length - 2];
  
  // Crossover detection
  const crossedUp = prevEma9 <= prevEma21 && ema9 > ema21;
  const crossedDown = prevEma9 >= prevEma21 && ema9 < ema21;
  
  // Filtros simples
  if (adx < 18) return null;
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
  const slPct = Math.max(0.012, Math.min(0.035, atrPct * 1.2));
  
  const sl = signal === "BUY" ? currentPrice * (1 - slPct) : currentPrice * (1 + slPct);
  const tp = signal === "BUY" ? currentPrice * (1 + slPct * 2.5) : currentPrice * (1 - slPct * 2.5);
  
  return {
    signal,
    price: currentPrice,
    sl,
    tp,
    confidence: 60 + Math.min(30, (adx - 18) * 2),
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
async function runAggressiveBacktest() {
  console.log('🚀 Backtest de 1 Ano - Dados com Crossovers\n');
  
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];
  const allResults = [];
  
  for (const symbol of symbols) {
    console.log(`📊 Testando ${symbol}...`);
    
    const candles = generateDataWithCrossovers(symbol, 365);
    const result = simulateTrades(symbol, candles);
    
    const trades = result.trades;
    const winTrades = trades.filter(t => t.pnl > 0);
    const lossTrades = trades.filter(t => t.pnl <= 0);
    
    const totalPnL = result.finalEquity - 10000;
    const totalPnLPct = (totalPnL / 10000) * 100;
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.pnl, 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winTrades.length) / (avgLoss * lossTrades.length) : (winTrades.length > 0 ? 999 : 0);
    
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
  console.log('\n' + '='.repeat(100));
  console.log('📈 RESUMO - BACKTEST 1 ANO (Dados com Crossovers)');
  console.log('='.repeat(100) + '\n');
  
  allResults.sort((a, b) => b.profitFactor - a.profitFactor);
  
  console.log('Symbol  | Trades | W/L     | Win%  | PF    | P&L%   | Status');
  console.log('-'.repeat(100));
  
  for (const r of allResults) {
    let status = '❌ Fraco';
    if (r.profitFactor > 1.5) status = '✅ Excelente';
    else if (r.profitFactor > 1.2) status = '✅ Bom';
    else if (r.profitFactor > 1.0) status = '⚠️  Marginal';
    else if (r.profitFactor > 0) status = '⚠️  Fraco';
    
    const wl = `${r.winTrades}/${r.lossTrades}`;
    console.log(`${r.symbol.padEnd(7)} | ${String(r.trades).padEnd(6)} | ${wl.padEnd(7)} | ${r.winRate.toFixed(1).padEnd(5)} | ${r.profitFactor.toFixed(2).padEnd(5)} | ${r.totalPnLPct.toFixed(2).padEnd(6)} | ${status}`);
  }
  
  const totalTrades = allResults.reduce((s, r) => s + r.trades, 0);
  const totalWins = allResults.reduce((s, r) => s + r.winTrades, 0);
  const totalLosses = allResults.reduce((s, r) => s + r.lossTrades, 0);
  const totalPnL = allResults.reduce((s, r) => s + r.totalPnL, 0);
  const avgPF = allResults.reduce((s, r) => s + r.profitFactor, 0) / allResults.length;
  const avgWinRate = allResults.reduce((s, r) => s + r.winRate, 0) / allResults.length;
  
  console.log('\n' + '='.repeat(100));
  console.log(`📊 TOTAIS:`);
  console.log(`   Trades: ${totalTrades} (W: ${totalWins}, L: ${totalLosses})`);
  console.log(`   Win Rate Médio: ${avgWinRate.toFixed(1)}%`);
  console.log(`   Profit Factor Médio: ${avgPF.toFixed(2)}`);
  console.log(`   P&L Total: $${totalPnL.toFixed(2)}`);
  console.log('='.repeat(100) + '\n');
  
  // Interpretação
  console.log('📊 Interpretação:');
  console.log('   ✅ Profit Factor > 1.5: Estratégia com ótima relação risco/recompensa');
  console.log('   ✅ Profit Factor > 1.2: Estratégia com boa relação risco/recompensa');
  console.log('   ⚠️  Profit Factor 1.0-1.2: Estratégia marginal, requer otimização');
  console.log('   ❌ Profit Factor < 1.0: Estratégia com perdas');
  console.log('\n');
}

runAggressiveBacktest().catch(console.error);
