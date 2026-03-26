/**
 * Backtest Relaxado - 1 ano
 * Estratégia: RSI Semanal < 30 + Entradas 4H + Divergências RSI/MACD
 */

/**
 * Gera dados com padrões realistas
 */
function generateRealisticData(symbol, days = 365) {
  const candles = [];
  const now = Date.now();
  let price = 100;
  let trend = 1;
  let trendDays = 0;
  const trendLength = 40;
  
  for (let i = days; i >= 0; i--) {
    const time = now - (i * 24 * 60 * 60 * 1000);
    
    if (trendDays >= trendLength) {
      trend *= -1;
      trendDays = 0;
    }
    
    const drift = trend * 0.0015;
    const volatility = 0.012;
    const noise = (Math.random() - 0.5) * volatility;
    
    const change = drift + noise;
    price = price * (1 + change);
    
    const open = price * (1 + (Math.random() - 0.5) * 0.003);
    const close = price * (1 + (Math.random() - 0.5) * 0.003);
    
    const range = Math.abs(close - open) * 0.3;
    const high = Math.max(open, close) + range + Math.random() * range;
    const low = Math.min(open, close) - range - Math.random() * range;
    
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

function calcRSIArray(closes, period = 14) {
  const rsis = [];
  if (closes.length < period + 1) return rsis;
  
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period; j < i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      rsis.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsis.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsis;
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

function calcMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calcEMA(closes.slice(-slowPeriod), fastPeriod);
  const ema26 = calcEMA(closes.slice(-slowPeriod), slowPeriod);
  
  const macd = ema12 - ema26;
  const signal = calcEMA([macd], signalPeriod);
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function calcMACDArray(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod) return [];
  
  const macdLine = [];
  const ema12Array = calcEMAArray(closes, fastPeriod);
  const ema26Array = calcEMAArray(closes, slowPeriod);
  
  const minLen = Math.min(ema12Array.length, ema26Array.length);
  for (let i = 0; i < minLen; i++) {
    macdLine.push(ema12Array[i] - ema26Array[i]);
  }
  
  return macdLine;
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
  
  return Math.min(100, Math.max(20, di * 50));
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
 * Detectar divergências
 */
function detectDivergence(rsiArray, priceArray, type = "RSI") {
  if (rsiArray.length < 10 || priceArray.length < 10) return null;
  
  const recentRSI = rsiArray.slice(-10);
  const recentPrice = priceArray.slice(-10);
  
  // Bullish divergence: preço faz lower low, RSI faz higher low
  const priceLow = Math.min(...recentPrice);
  const rsiLow = Math.min(...recentRSI);
  
  const priceLowIdx = recentPrice.lastIndexOf(priceLow);
  const rsiLowIdx = recentRSI.lastIndexOf(rsiLow);
  
  if (priceLowIdx > 3 && rsiLowIdx > 3) {
    const prevPriceLow = Math.min(...recentPrice.slice(0, priceLowIdx));
    const prevRSILow = Math.min(...recentRSI.slice(0, rsiLowIdx));
    
    if (priceLow < prevPriceLow && rsiLow > prevRSILow) {
      return "BULLISH";
    }
  }
  
  // Bearish divergence: preço faz higher high, RSI faz lower high
  const priceHigh = Math.max(...recentPrice);
  const rsiHigh = Math.max(...recentRSI);
  
  const priceHighIdx = recentPrice.lastIndexOf(priceHigh);
  const rsiHighIdx = recentRSI.lastIndexOf(rsiHigh);
  
  if (priceHighIdx > 3 && rsiHighIdx > 3) {
    const prevPriceHigh = Math.max(...recentPrice.slice(0, priceHighIdx));
    const prevRSIHigh = Math.max(...recentRSI.slice(0, rsiHighIdx));
    
    if (priceHigh > prevPriceHigh && rsiHigh < prevRSIHigh) {
      return "BEARISH";
    }
  }
  
  return null;
}

/**
 * Gerar sinal com estratégia relaxada
 */
function generateSignal(dailyCandles, candles4h, currentPrice) {
  if (candles4h.length < 100 || dailyCandles.length < 50) return null;
  
  // RSI Semanal (usando últimos 5 dias = 1 semana)
  const dailyCloses = dailyCandles.map(c => c.close);
  const weeklyRSI = calcRSI(dailyCloses.slice(-5));
  
  // Filtro macro: RSI Semanal < 30 (oversold)
  if (weeklyRSI > 40) return null;
  
  // Análise 4H
  const closes4h = candles4h.map(c => c.close);
  const rsi4h = calcRSI(closes4h);
  const rsiArray4h = calcRSIArray(closes4h);
  const macdArray4h = calcMACDArray(closes4h);
  const ema9 = calcEMA(closes4h, 9);
  const ema21 = calcEMA(closes4h, 21);
  const ema50 = calcEMA(closes4h, 50);
  const adx = calcADX(candles4h);
  const atr = calcATR(candles4h);
  
  // Divergências
  const rsiDivergence = detectDivergence(rsiArray4h, closes4h, "RSI");
  const macdDivergence = detectDivergence(macdArray4h, closes4h, "MACD");
  
  // Crossover EMA
  const ema9Prev = calcEMA(closes4h.slice(0, -1), 9);
  const ema21Prev = calcEMA(closes4h.slice(0, -1), 21);
  
  const crossedUp = ema9Prev <= ema21Prev && ema9 > ema21;
  const crossedDown = ema9Prev >= ema21Prev && ema9 < ema21;
  
  let signal = null;
  let confidence = 0;
  
  // BUY: RSI Semanal < 30 + Divergência Bullish + Crossover UP
  if (weeklyRSI < 30 && rsi4h < 40 && ema21 > ema50) {
    if (rsiDivergence === "BULLISH" || crossedUp) {
      signal = "BUY";
      confidence = 65;
      if (rsiDivergence === "BULLISH") confidence += 15;
      if (crossedUp) confidence += 10;
      if (adx > 20) confidence += 5;
    }
  }
  
  // SELL: RSI Semanal > 70 + Divergência Bearish + Crossover DOWN
  if (weeklyRSI > 70 && rsi4h > 60 && ema21 < ema50) {
    if (rsiDivergence === "BEARISH" || crossedDown) {
      signal = "SELL";
      confidence = 65;
      if (rsiDivergence === "BEARISH") confidence += 15;
      if (crossedDown) confidence += 10;
      if (adx > 20) confidence += 5;
    }
  }
  
  if (!signal) return null;
  
  // SL/TP
  const atrPct = atr / currentPrice;
  const slPct = Math.max(0.01, Math.min(0.025, atrPct * 1.2));
  
  const sl = signal === "BUY" ? currentPrice * (1 - slPct) : currentPrice * (1 + slPct);
  const tp = signal === "BUY" ? currentPrice * (1 + slPct * 2.5) : currentPrice * (1 - slPct * 2.5);
  
  return {
    signal,
    price: currentPrice,
    sl,
    tp,
    confidence: Math.min(95, Math.round(confidence)),
    rsi4h,
    weeklyRSI,
    ema21,
    ema50,
    adx,
    atr,
    rsiDivergence,
    macdDivergence
  };
}

/**
 * Simular trades
 */
function simulateTrades(symbol, dailyCandles, candles4h) {
  const trades = [];
  let activeTrade = null;
  let equity = 10000;
  
  // Mapear 4H para daily
  for (let i = 100; i < candles4h.length; i++) {
    const currentPrice = candles4h[i].close;
    const dayIndex = Math.floor(i / 6); // 6 candles 4H por dia
    
    if (dayIndex >= dailyCandles.length) break;
    
    // Fechar trade
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
    
    // Abrir trade
    if (!activeTrade) {
      const signal = generateSignal(
        dailyCandles.slice(0, dayIndex + 1),
        candles4h.slice(Math.max(0, i - 100), i + 1),
        currentPrice
      );
      
      if (signal) {
        activeTrade = {
          symbol,
          signal: signal.signal,
          entry: currentPrice,
          sl: signal.sl,
          tp: signal.tp,
          time: candles4h[i].time,
          confidence: signal.confidence,
          rsiDiv: signal.rsiDivergence,
          macdDiv: signal.macdDivergence
        };
      }
    }
  }
  
  return { trades, finalEquity: equity };
}

/**
 * Executar backtest
 */
async function runRelaxedBacktest() {
  console.log('🚀 Backtest de 1 Ano - Estratégia Relaxada\n');
  console.log('Filtros: RSI Semanal < 30 + Entradas 4H + Divergências\n');
  
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];
  const allResults = [];
  
  for (const symbol of symbols) {
    console.log(`📊 Testando ${symbol}...`);
    
    // Gerar dados
    const dailyCandles = generateRealisticData(symbol, 365);
    const candles4h = generateRealisticData(symbol, 365 * 6); // 6 candles 4H por dia
    
    const result = simulateTrades(symbol, dailyCandles, candles4h);
    
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
  console.log('\n' + '='.repeat(110));
  console.log('📈 RESUMO - BACKTEST 1 ANO (Estratégia Relaxada)');
  console.log('='.repeat(110) + '\n');
  
  allResults.sort((a, b) => b.profitFactor - a.profitFactor);
  
  console.log('Symbol  | Trades | W/L     | Win%  | PF    | P&L%   | Status');
  console.log('-'.repeat(110));
  
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
  
  console.log('\n' + '='.repeat(110));
  console.log(`📊 TOTAIS:`);
  console.log(`   Trades: ${totalTrades} (W: ${totalWins}, L: ${totalLosses})`);
  console.log(`   Win Rate Médio: ${avgWinRate.toFixed(1)}%`);
  console.log(`   Profit Factor Médio: ${avgPF.toFixed(2)}`);
  console.log(`   P&L Total: $${totalPnL.toFixed(2)}`);
  console.log('='.repeat(110) + '\n');
}

runRelaxedBacktest().catch(console.error);
