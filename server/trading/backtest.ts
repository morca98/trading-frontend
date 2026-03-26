/**
 * Backtest Engine
 * Simula a estratégia multi-timeframe (MTF V3) em dados históricos.
 *
 * Nota: O backtest usa apenas candles diários como proxy para os três timeframes,
 * simulando a lógica MTF com sub-amostras da mesma série:
 *  - "Semanal"  → cada 5 candles diários agrupados numa vela semanal sintética
 *  - "Diário"   → candles diários originais
 *  - "4h"       → cada candle diário dividido em 6 sub-candles sintéticos de 4h
 *
 * Para backtests com dados reais de múltiplos timeframes, substituir as funções
 * de geração de candles sintéticos por dados reais.
 */

import { Candle } from "./technicalAnalysis";
import { calcATR, calcTrend } from "./technicalAnalysis";
import {
  generateMtfSignal,
  MultiTimeframeData,
  evaluateMtfFilters,
} from "./technicalAnalysisV3";

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
  /** Detalhe dos filtros MTF no momento da entrada */
  mtfSnapshot?: {
    weeklyRsi: number;
    dailyMa70: number;
    h4Rsi: number;
    h4MacdBullishDivergence: boolean;
    h4CandleConfirmation: boolean;
  };
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

// ---------------------------------------------------------------------------
// Funções auxiliares de síntese de timeframes
// ---------------------------------------------------------------------------

/**
 * Agrupa candles diários em candles semanais sintéticos (5 dias = 1 semana).
 */
function buildWeeklyCandles(dailyCandles: Candle[]): Candle[] {
  const weekly: Candle[] = [];
  for (let i = 0; i < dailyCandles.length; i += 5) {
    const chunk = dailyCandles.slice(i, i + 5);
    if (chunk.length === 0) continue;
    weekly.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    });
  }
  return weekly;
}

/**
 * Divide cada candle diário em 6 candles de 4h sintéticos.
 * Distribui o range OHLC de forma simplificada.
 */
function buildH4Candles(dailyCandles: Candle[]): Candle[] {
  const h4: Candle[] = [];
  const h4ms = 4 * 60 * 60 * 1000;

  for (const d of dailyCandles) {
    const range = d.high - d.low;
    const volPerBar = d.volume / 6;

    for (let j = 0; j < 6; j++) {
      const t = d.time + j * h4ms;
      // Distribuição simplificada: interpolar entre open e close
      const frac = j / 5;
      const midClose = d.open + (d.close - d.open) * ((j + 1) / 6);
      const midOpen = d.open + (d.close - d.open) * (j / 6);
      const subHigh = midClose + range * 0.1 * (1 - frac);
      const subLow = midOpen - range * 0.1 * frac;

      h4.push({
        time: t,
        open: midOpen,
        high: Math.max(midOpen, midClose, subHigh),
        low: Math.min(midOpen, midClose, subLow),
        close: midClose,
        volume: volPerBar,
      });
    }
  }

  return h4;
}

// ---------------------------------------------------------------------------
// Motor de backtest
// ---------------------------------------------------------------------------

export async function runBacktest(
  symbol: string,
  candles: Candle[],
  startDate?: number,
  endDate?: number
): Promise<{ trades: BacktestTrade[]; metrics: BacktestMetrics }> {
  if (candles.length < 200) {
    throw new Error("Insufficient data for backtest (minimum 200 candles required)");
  }

  // Filtrar por intervalo de datas
  let testCandles = candles;
  if (startDate && endDate) {
    testCandles = candles.filter((c) => c.time >= startDate && c.time <= endDate);
  }

  const trades: BacktestTrade[] = [];
  let activeTradeIndex = -1;
  const equityCurve: number[] = [];
  let equity = 10000;
  const tradeIds = new Set<string>();

  // Pré-calcular candles semanais e de 4h para toda a série
  const allWeeklyCandles = buildWeeklyCandles(testCandles);
  const allH4Candles = buildH4Candles(testCandles);

  // Simular trading
  for (let i = 100; i < testCandles.length; i++) {
    const currentPrice = testCandles[i].close;

    // Janelas para cada timeframe
    const dailyWindow = testCandles.slice(Math.max(0, i - 100), i + 1);
    const weeklyWindow = allWeeklyCandles.slice(0, Math.ceil((i + 1) / 5));
    const h4Window = allH4Candles.slice(0, (i + 1) * 6);

    // Montar estrutura MTF
    const mtfData: MultiTimeframeData = {
      weeklyCandles: weeklyWindow.slice(-30),
      dailyCandles: dailyWindow,
      h4Candles: h4Window.slice(-120), // últimas 120 velas de 4h (~20 dias)
    };

    // Gerar sinal MTF V3
    const signalResult = generateMtfSignal(mtfData);

    // Verificar se trade ativo deve ser fechado
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
        activeTrade.pnl =
          activeTrade.signal === "BUY"
            ? exitPrice - activeTrade.entryPrice
            : activeTrade.entryPrice - exitPrice;
        activeTrade.pnlPct = (activeTrade.pnl / activeTrade.entryPrice) * 100;
        activeTrade.outcome = activeTrade.pnl >= 0 ? "WIN" : "LOSS";
        activeTrade.duration = activeTrade.exitTime - activeTrade.entryTime;

        equity += activeTrade.pnl;
        equityCurve.push(equity);
        activeTradeIndex = -1;
      }
    }

    // Abrir novo trade se houver sinal e não houver trade ativo
    if (signalResult && activeTradeIndex < 0) {
      const tradeId = `${symbol}_${testCandles[i].time}`;
      if (!tradeIds.has(tradeId)) {
        const mtf = signalResult.mtfFilters;
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
          mtfSnapshot: {
            weeklyRsi: mtf.weeklyRsi,
            dailyMa70: mtf.dailyMa70,
            h4Rsi: mtf.h4Rsi,
            h4MacdBullishDivergence: mtf.h4MacdBullishDivergence,
            h4CandleConfirmation: mtf.h4CandleConfirmation,
          },
        };

        trades.push(trade);
        activeTradeIndex = trades.length - 1;
        tradeIds.add(tradeId);
      }
    }

    equityCurve.push(equity);
  }

  const metrics = calculateMetrics(trades, equityCurve, equity);
  return { trades, metrics };
}

// ---------------------------------------------------------------------------
// Métricas de desempenho
// ---------------------------------------------------------------------------

function calculateMetrics(
  trades: BacktestTrade[],
  equityCurve: number[],
  finalEquity: number
): BacktestMetrics {
  const closedTrades = trades.filter((t) => t.exitTime > 0);
  const winTrades = closedTrades.filter((t) => t.outcome === "WIN");
  const lossTrades = closedTrades.filter((t) => t.outcome === "LOSS");

  const winRate =
    closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0;

  const totalWins = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));

  const avgWin = winTrades.length > 0 ? totalWins / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? totalLosses / lossTrades.length : 0;
  const profitFactor =
    totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

  const totalPnL = finalEquity - 10000;
  const totalPnLPct = (totalPnL / 10000) * 100;

  // Drawdown máximo
  let maxDrawdown = 0;
  let peak = equityCurve[0] || 10000;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = ((peak - eq) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Sharpe Ratio
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Sortino Ratio
  const downReturns = returns.filter((r) => r < 0);
  const downVariance =
    downReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / (returns.length || 1);
  const downStdDev = Math.sqrt(downVariance);
  const sortino = downStdDev > 0 ? (avgReturn / downStdDev) * Math.sqrt(252) : 0;

  const avgDuration =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + t.duration, 0) / closedTrades.length
      : 0;

  const bestTrade =
    closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnlPct)) : 0;
  const worstTrade =
    closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnlPct)) : 0;

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

// ---------------------------------------------------------------------------
// Otimização de parâmetros (stub)
// ---------------------------------------------------------------------------

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

  const adxSteps = [20, 22, 25, 28, 30];
  const rsiSteps = [30, 35, 40];
  const volSteps = [1.2, 1.5, 1.8];

  for (const adx of adxSteps) {
    for (const rsi of rsiSteps) {
      for (const vol of volSteps) {
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
