// Backtest de 365 dias - Versão simplificada

const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
const DAYS = 365;
const CANDLE_SIZE = 4; // 4H candles
const CANDLES_PER_DAY = 24 / CANDLE_SIZE;
const TOTAL_CANDLES = DAYS * CANDLES_PER_DAY;

const INITIAL_CAPITAL = 10000;
const RISK_PER_TRADE = 0.02; // 2% do capital
const SMA70_FILTER = true;

console.log('='.repeat(80));
console.log('BACKTEST DE 365 DIAS - ESTRATÉGIA DE TRADING');
console.log('='.repeat(80));
console.log(`Período: ${DAYS} dias (${TOTAL_CANDLES} candles de 4H)`);
console.log(`Símbolos: ${SYMBOLS.join(', ')}`);
console.log(`Capital inicial: $${INITIAL_CAPITAL}`);
console.log(`Risco por trade: ${RISK_PER_TRADE * 100}%`);
console.log('='.repeat(80));

// Funções auxiliares
function generateRealisticCandles(count, startPrice) {
  const candles = [];
  let price = startPrice;
  
  for (let i = 0; i < count; i++) {
    // Movimento aleatório com tendência
    const trend = Math.sin(i / 50) * 0.5;
    const randomMove = (Math.random() - 0.5) * 2;
    const move = trend + randomMove;
    
    const open = price;
    const close = price * (1 + move / 100);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 1000000 + 500000);
    
    candles.push({ open, high, low, close, volume });
    price = close;
  }
  
  return candles;
}

function calcSMA(closes, period) {
  if (closes.length < period) return 0;
  const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  
  const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
  
  const rs = losses === 0 ? 100 : gains / losses;
  return 100 - (100 / (1 + rs));
}

function calcEMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1];
  
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  
  return ema;
}

// Resultados
const results = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  totalProfit: 0,
  totalLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  trades: [],
  symbolResults: {},
  dailyEquity: [],
};

let currentEquity = INITIAL_CAPITAL;
results.dailyEquity.push({ date: 0, equity: INITIAL_CAPITAL });

// Backtest para cada símbolo
for (const symbol of SYMBOLS) {
  console.log(`\n📊 Backtestando ${symbol}...`);
  
  results.symbolResults[symbol] = {
    trades: 0,
    wins: 0,
    losses: 0,
    profit: 0,
    winRate: 0,
    profitFactor: 0,
  };

  const candles = generateRealisticCandles(TOTAL_CANDLES, 100);
  const closes = candles.map(c => c.close);
  
  let activePosition = null;
  let positionCandles = 0;

  for (let i = 70; i < candles.length; i++) {
    const candle = candles[i];
    const recentCloses = closes.slice(Math.max(0, i - 50), i + 1);
    
    // Calcular indicadores
    const sma70 = calcSMA(closes.slice(0, i + 1), 70);
    const rsi = calcRSI(recentCloses);
    const ema21 = calcEMA(recentCloses, 21);
    
    // Gerar sinal
    let signal = null;
    
    // Sinal de compra
    if (!activePosition && candle.close > sma70 && rsi < 70 && rsi > 30) {
      if (Math.random() > 0.85) { // 15% de chance de sinal
        signal = {
          type: 'BUY',
          confidence: Math.min(100, 50 + (candle.close - sma70) / sma70 * 100),
          stopLoss: candle.close * 0.98,
          takeProfit: candle.close * 1.03,
        };
      }
    }
    
    // Sinal de venda
    if (!activePosition && candle.close < sma70 && rsi > 30 && rsi < 70) {
      if (Math.random() > 0.90) { // 10% de chance de sinal
        signal = {
          type: 'SELL',
          confidence: Math.min(100, 50 + (sma70 - candle.close) / sma70 * 100),
          stopLoss: candle.close * 1.02,
          takeProfit: candle.close * 0.97,
        };
      }
    }

    // Abrir posição
    if (!activePosition && signal) {
      activePosition = {
        symbol,
        type: signal.type,
        entryPrice: candle.close,
        entryCandle: i,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        confidence: signal.confidence,
        quantity: Math.floor((currentEquity * RISK_PER_TRADE) / Math.abs(candle.close - signal.stopLoss)),
      };
      positionCandles = 0;
    }

    // Gerenciar posição ativa
    if (activePosition) {
      positionCandles++;
      
      let shouldClose = false;
      let exitPrice = candle.close;
      let exitReason = '';

      if (activePosition.type === 'BUY') {
        if (candle.low <= activePosition.stopLoss) {
          shouldClose = true;
          exitPrice = activePosition.stopLoss;
          exitReason = 'SL Hit';
        } else if (candle.high >= activePosition.takeProfit) {
          shouldClose = true;
          exitPrice = activePosition.takeProfit;
          exitReason = 'TP Hit';
        } else if (positionCandles > 168) { // 7 dias
          shouldClose = true;
          exitReason = 'Timeout';
        }
      } else if (activePosition.type === 'SELL') {
        if (candle.high >= activePosition.stopLoss) {
          shouldClose = true;
          exitPrice = activePosition.stopLoss;
          exitReason = 'SL Hit';
        } else if (candle.low <= activePosition.takeProfit) {
          shouldClose = true;
          exitPrice = activePosition.takeProfit;
          exitReason = 'TP Hit';
        } else if (positionCandles > 168) {
          shouldClose = true;
          exitReason = 'Timeout';
        }
      }

      if (shouldClose) {
        const pnl = activePosition.type === 'BUY' 
          ? (exitPrice - activePosition.entryPrice) * activePosition.quantity
          : (activePosition.entryPrice - exitPrice) * activePosition.quantity;

        const pnlPct = (pnl / (activePosition.entryPrice * activePosition.quantity)) * 100;

        results.trades.push({
          symbol,
          type: activePosition.type,
          entryPrice: activePosition.entryPrice,
          exitPrice,
          quantity: activePosition.quantity,
          pnl,
          pnlPct,
          confidence: activePosition.confidence,
          exitReason,
          duration: positionCandles,
        });

        results.totalTrades++;
        results.symbolResults[symbol].trades++;

        if (pnl > 0) {
          results.winningTrades++;
          results.symbolResults[symbol].wins++;
          results.totalProfit += pnl;
          results.largestWin = Math.max(results.largestWin, pnl);
        } else {
          results.losingTrades++;
          results.symbolResults[symbol].losses++;
          results.totalLoss += Math.abs(pnl);
          results.largestLoss = Math.min(results.largestLoss, pnl);
        }

        currentEquity += pnl;
        results.dailyEquity.push({ date: i, equity: currentEquity });

        activePosition = null;
      }
    }

    if (i % CANDLES_PER_DAY === 0) {
      results.dailyEquity.push({ date: i, equity: currentEquity });
    }
  }

  // Estatísticas por símbolo
  const symbolTrades = results.trades.filter(t => t.symbol === symbol);
  if (symbolTrades.length > 0) {
    results.symbolResults[symbol].winRate = (results.symbolResults[symbol].wins / symbolTrades.length) * 100;
    const totalProfit = symbolTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(symbolTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    results.symbolResults[symbol].profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    results.symbolResults[symbol].profit = totalProfit - totalLoss;
  }
}

// Métricas finais
const winRate = results.totalTrades > 0 ? (results.winningTrades / results.totalTrades) * 100 : 0;
const profitFactor = results.totalLoss > 0 ? results.totalProfit / results.totalLoss : results.totalProfit > 0 ? Infinity : 0;
const netProfit = results.totalProfit - results.totalLoss;
const roi = (netProfit / INITIAL_CAPITAL) * 100;

// Sharpe Ratio
const dailyReturns = [];
for (let i = 1; i < results.dailyEquity.length; i++) {
  const ret = (results.dailyEquity[i].equity - results.dailyEquity[i - 1].equity) / results.dailyEquity[i - 1].equity;
  dailyReturns.push(ret);
}
const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
const variance = dailyReturns.length > 0 ? dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length : 0;
const stdDev = Math.sqrt(variance);
const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

// Drawdown
let maxEquity = INITIAL_CAPITAL;
let maxDrawdown = 0;
for (const point of results.dailyEquity) {
  if (point.equity > maxEquity) {
    maxEquity = point.equity;
  }
  const drawdown = ((maxEquity - point.equity) / maxEquity) * 100;
  maxDrawdown = Math.max(maxDrawdown, drawdown);
}

// Exibir resultados
console.log('\n' + '='.repeat(80));
console.log('RESULTADOS FINAIS - 365 DIAS');
console.log('='.repeat(80));
console.log(`\n📈 PERFORMANCE GERAL:`);
console.log(`  Total de Trades: ${results.totalTrades}`);
console.log(`  Trades Vencedores: ${results.winningTrades} (${winRate.toFixed(2)}%)`);
console.log(`  Trades Perdedores: ${results.losingTrades}`);
console.log(`  \n  Lucro Total: $${results.totalProfit.toFixed(2)}`);
console.log(`  Perda Total: $${results.totalLoss.toFixed(2)}`);
console.log(`  Lucro Líquido: $${netProfit.toFixed(2)}`);
console.log(`  \n  Capital Inicial: $${INITIAL_CAPITAL.toFixed(2)}`);
console.log(`  Capital Final: $${currentEquity.toFixed(2)}`);
console.log(`  ROI: ${roi.toFixed(2)}%`);
console.log(`  \n  Profit Factor: ${profitFactor.toFixed(2)}`);
console.log(`  Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
console.log(`  Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
console.log(`  \n  Maior Ganho: $${results.largestWin.toFixed(2)}`);
console.log(`  Maior Perda: $${results.largestLoss.toFixed(2)}`);

console.log(`\n📊 RESULTADOS POR SÍMBOLO:`);
for (const symbol of SYMBOLS) {
  const sr = results.symbolResults[symbol];
  console.log(`\n  ${symbol}:`);
  console.log(`    Trades: ${sr.trades}`);
  console.log(`    Win Rate: ${sr.winRate.toFixed(2)}%`);
  console.log(`    Profit Factor: ${sr.profitFactor.toFixed(2)}`);
  console.log(`    P&L: $${sr.profit.toFixed(2)}`);
}

console.log('\n' + '='.repeat(80));
console.log('TOP 5 MELHORES TRADES:');
console.log('='.repeat(80));
const topTrades = results.trades.sort((a, b) => b.pnl - a.pnl).slice(0, 5);
topTrades.forEach((trade, idx) => {
  console.log(`\n${idx + 1}. ${trade.symbol} ${trade.type}`);
  console.log(`   Entrada: $${trade.entryPrice.toFixed(2)} | Saída: $${trade.exitPrice.toFixed(2)}`);
  console.log(`   P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPct.toFixed(2)}%)`);
  console.log(`   Confiança: ${trade.confidence.toFixed(0)}% | Razão: ${trade.exitReason}`);
});

console.log('\n' + '='.repeat(80));
console.log('TOP 5 PIORES TRADES:');
console.log('='.repeat(80));
const worstTrades = results.trades.sort((a, b) => a.pnl - b.pnl).slice(0, 5);
worstTrades.forEach((trade, idx) => {
  console.log(`\n${idx + 1}. ${trade.symbol} ${trade.type}`);
  console.log(`   Entrada: $${trade.entryPrice.toFixed(2)} | Saída: $${trade.exitPrice.toFixed(2)}`);
  console.log(`   P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPct.toFixed(2)}%)`);
  console.log(`   Confiança: ${trade.confidence.toFixed(0)}% | Razão: ${trade.exitReason}`);
});

console.log('\n' + '='.repeat(80));
