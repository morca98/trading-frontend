/**
 * Market Data Module
 * Integrates with Yahoo Finance to fetch real-time and historical market data
 */

import { Candle } from "./technicalAnalysis";

export interface StockChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        currency: string;
        regularMarketPrice: number;
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
  };
}

/**
 * Fetch historical candles from Yahoo Finance
 */
export async function fetchCandles(
  symbol: string,
  interval: "1d" | "1wk" | "4h" = "1d",
  range: "2y" | "5y" | "6mo" = "2y"
): Promise<Candle[]> {
  try {
    // Convert intervals for Yahoo Finance
    const yahooInterval = interval === "4h" ? "1h" : interval; // Yahoo doesn't support 4h directly, use 1h and aggregate if needed
    
    console.log(`[MarketData] Fetching ${symbol} candles (${yahooInterval}, ${range})`);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${range}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status} for ${symbol}`);
    }

    const data: StockChartResponse = await response.json() as any;
    const result = data.chart.result?.[0];

    if (!result || !result.timestamp || result.timestamp.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    const candles: Candle[] = [];
    const timestamps = result.timestamp;
    const ohlcv = result.indicators.quote[0];

    for (let i = 0; i < timestamps.length; i++) {
      if (ohlcv.open[i] === null || ohlcv.close[i] === null) continue;
      
      candles.push({
        time: timestamps[i] * 1000,
        open: parseFloat(String(ohlcv.open[i])),
        high: parseFloat(String(ohlcv.high[i])),
        low: parseFloat(String(ohlcv.low[i])),
        close: parseFloat(String(ohlcv.close[i])),
        volume: parseFloat(String(ohlcv.volume[i])) || 0,
      });
    }

    // If interval was 4h, aggregate 1h candles
    if (interval === "4h") {
      const aggregated: Candle[] = [];
      for (let i = 0; i < candles.length; i += 4) {
        const chunk = candles.slice(i, i + 4);
        if (chunk.length === 0) continue;
        
        aggregated.push({
          time: chunk[0].time,
          open: chunk[0].open,
          high: Math.max(...chunk.map(c => c.high)),
          low: Math.min(...chunk.map(c => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((sum, c) => sum + c.volume, 0),
        });
      }
      return aggregated;
    }

    return candles;
  } catch (error) {
    console.error(`[MarketData] Error fetching candles for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch current price for a symbol
 */
export async function fetchPrice(symbol: string): Promise<number> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status} for ${symbol}`);
    }

    const data: StockChartResponse = await response.json() as any;
    const price = data.chart.result?.[0]?.meta?.regularMarketPrice;

    if (price === undefined) {
      throw new Error(`Could not find price for ${symbol}`);
    }

    return price;
  } catch (error) {
    console.error(`[MarketData] Error fetching price for ${symbol}:`, error);
    // Fallback to last candle if available
    try {
      const candles = await fetchCandles(symbol, "1d", "1d");
      return candles[candles.length - 1].close;
    } catch (e) {
      throw error;
    }
  }
}

/**
 * Determine macro trend based on weekly candles
 */
export function determineMacroTrend(weeklyCandles: Candle[]): string {
  if (weeklyCandles.length < 20) return "NEUTRAL";

  const closes = weeklyCandles.map((c) => c.close);
  const recentAvg = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const olderAvg = closes.slice(-20, -5).reduce((a, b) => a + b, 0) / 15;

  if (recentAvg > olderAvg * 1.01) return "BULL";
  if (recentAvg < olderAvg * 0.99) return "BEAR";
  return "NEUTRAL";
}
