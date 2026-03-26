/**
 * Backtest Engine
 * Simulates trading strategy on historical data and calculates performance metrics
 */

import { Candle } from "./technicalAnalysis";
import { generateEnhancedSignal, EnhancedSignalResult } from "./technicalAnalysisV2";
import { calcATR, calcTrend } from "./technicalAnalysis";

export interface BacktestTrade {
  id: string;
  symbol: string;
  signal: "BUY" | "SELL";
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  outcome: "WIN" | "LOSS";
  pnl: number;
  pnlPct: number;
  duration: number;
  confidence: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalPnL: number;
  totalPnLPct: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortino: number;
  avgDuration: number;
  bestTrade: number;
  worstTrade: number;
  equityCurve: number[];
}

/**
 * Run backtest on historical candles
 */
export async function runBacktest(
  symbol: string,
  candles: Candle[],
  startDate?: number,
  endDate?: number
): Promise<{ trades: BacktestTrade[]; metrics: BacktestMetrics }> {
  if (candles.length < 200) {
    throw new Error("Insufficient data for backtest (minimum 200 candles required)");
  }

  // Filter candles by date range
  let testCandles = candles;
  if (startDate && endDate) {
    testCandles = candles.filter((c) => c.time >= startDate && c.time <= endDate);
  }

  const trades: BacktestTrade[] = [];
  let activeTradeIndex = -1;
  const equityCurve: number[] = [];
  let equity = 10000; // Starting equity
  const tradeIds = new Set<string>();

  // Simulate trading
  for (let i = 100; i < testCandles.length; i++) {
    const currentCandles = testCandles.slice(Math.max(0, i - 100), i + 1);
    const currentPrice = testCandles[i].close;
    const atr = calcATR(currentCandles);

    // Determine macro trend from weekly perspective
    const weeklyCandles = testCandles.slice(Math.max(0, i - 50), i + 1);
    const macroTrend = calcTrend(weeklyCandles.map((c) => c.close));
    const trendShort = calcTrend(currentCandles.slice(-10).map((c) => c.close));

    // Generate signal
    const signalResult = generateEnhancedSignal(currentCandles, currentPrice, macroTrend, trendShort, atr);

    // Check if active trade should be closed
    if (activeTradeIndex >= 0) {
      const activeTrade = trades[activeTradeIndex];
      let shouldClose = false;
      let exitPrice = currentPrice;

      if (activeTrade.signal === "BUY") {
        if (currentPrice >= activeTrade.takeProfit) {
          shouldClose = true;
          exitPrice = activeTrade.takeProfit;
        } else if (currentPrice <= activeTrade.stopLoss) {
          shouldClose = true;
          exitPrice = activeTrade.stopLoss;
        }
      } else {
        if (currentPrice <= activeTrade.takeProfit) {
          shouldClose = true;
          exitPrice = activeTrade.takeProfit;
        } else if (currentPrice >= activeTrade.stopLoss) {
          shouldClose = true;
          exitPrice = activeTrade.stopLoss;
        }
      }

      if (shouldClose) {
        activeTrade.exitTime = testCandles[i].time;
        activeTrade.exitPrice = exitPrice;
        activeTrade.pnl = activeTrade.signal === "BUY" ? exitPrice - activeTrade.entryPrice : activeTrade.entryPrice - exitPrice;
        activeTrade.pnlPct = (activeTrade.pnl / activeTrade.entryPrice) * 100;
        activeTrade.outcome = activeTrade.pnl >= 0 ? "WIN" : "LOSS";
        activeTrade.duration = activeTrade.exitTime - activeTrade.entryTime;

        // Update equity
        equity += activeTrade.pnl;
        equityCurve.push(equity);

        activeTradeIndex = -1;
      }
    }

    // Open new trade if signal and no active trade
    if (signalResult && activeTradeIndex < 0) {
      const tradeId = `${symbol}_${testCandles[i].time}`;
      if (!tradeIds.has(tradeId)) {
        const trade: BacktestTrade = {
          id: tradeId,
          symbol,
          signal: signalResult.signal as "BUY" | "SELL",
          entryTime: testCandles[i].time,
          entryPrice: currentPrice,
          exitTime: 0,
          exitPrice: 0,
          stopLoss: signalResult.sl,
          takeProfit: signalResult.tp,
          outcome: "WIN",
          pnl: 0,
          pnlPct: 0,
          duration: 0,
          confidence: signalResult.confidence,
        };

        trades.push(trade);
        activeTradeIndex = trades.length - 1;
        tradeIds.add(tradeId);
      }
    }

    equityCurve.push(equity);
  }

  // Calculate metrics
  const metrics = calculateMetrics(trades, equityCurve, equity);

  return { trades, metrics };
}

/**
 * Calculate performance metrics from trades
 */
function calculateMetrics(trades: BacktestTrade[], equityCurve: number[], finalEquity: number): BacktestMetrics {
  const closedTrades = trades.filter((t) => t.exitTime > 0);
  const winTrades = closedTrades.filter((t) => t.outcome === "WIN");
  const lossTrades = closedTrades.filter((t) => t.outcome === "LOSS");

  const winRate = closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0;

  const totalWins = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));

  const avgWin = winTrades.length > 0 ? totalWins / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? totalLosses / lossTrades.length : 0;

  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

  const totalPnL = finalEquity - 10000;
  const totalPnLPct = (totalPnL / 10000) * 100;

  // Calculate drawdown
  let maxDrawdown = 0;
  let peak = equityCurve[0] || 10000;
  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    const drawdown = ((peak - equity) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Calculate Sharpe Ratio
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Calculate Sortino (only downside deviation)
  const downReturns = returns.filter((r) => r < 0);
  const downVariance = downReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / returns.length;
  const downStdDev = Math.sqrt(downVariance);
  const sortino = downStdDev > 0 ? (avgReturn / downStdDev) * Math.sqrt(252) : 0;

  const avgDuration = closedTrades.length > 0 ? closedTrades.reduce((sum, t) => sum + t.duration, 0) / closedTrades.length : 0;

  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnlPct)) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnlPct)) : 0;

  return {
    totalTrades: closedTrades.length,
    winTrades: winTrades.length,
    lossTrades: lossTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalPnLPct: Math.round(totalPnLPct * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    avgDuration,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    equityCurve,
  };
}

/**
 * Optimize strategy parameters
 */
export async function optimizeStrategy(
  symbol: string,
  candles: Candle[],
  paramRanges: {
    adxMin: [number, number];
    rsiRange: [number, number];
    volumeMultiplier: [number, number];
  }
): Promise<{ bestParams: any; bestMetrics: BacktestMetrics }> {
  let bestMetrics: BacktestMetrics | null = null;
  let bestParams: any = null;

  // Simple grid search (can be optimized)
  const adxSteps = [20, 22, 25, 28, 30];
  const rsiSteps = [30, 35, 40];
  const volSteps = [1.2, 1.5, 1.8];

  for (const adx of adxSteps) {
    for (const rsi of rsiSteps) {
      for (const vol of volSteps) {
        // Run backtest with these parameters
        // This is simplified - in production, you'd modify the signal generation function
        const result = await runBacktest(symbol, candles);

        if (!bestMetrics || result.metrics.profitFactor > bestMetrics.profitFactor) {
          bestMetrics = result.metrics;
          bestParams = { adxMin: adx, rsiRange: rsi, volumeMultiplier: vol };
        }
      }
    }
  }

  return {
    bestParams: bestParams || {},
    bestMetrics: bestMetrics || ({} as BacktestMetrics),
  };
}
