/**
 * Market Data Module
 * Integrates with stock-analysis skill to fetch real-time market data
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

export interface StockInsightsResponse {
  symbol: string;
  instrumentInfo: {
    technicalEvents: {
      shortTermOutlook: {
        direction: "bullish" | "bearish";
        score: number;
      };
      intermediateTermOutlook: {
        direction: "bullish" | "bearish";
        score: number;
      };
      longTermOutlook: {
        direction: "bullish" | "bearish";
        score: number;
      };
      keyTechnicals: {
        support: number;
        resistance: number;
      };
    };
  };
}

/**
 * Fetch historical candles from Yahoo Finance via stock-analysis skill
 * This would be called via MCP in production
 */
export async function fetchCandles(
  symbol: string,
  interval: "1d" | "1wk" = "1d",
  range: "2y" | "5y" = "2y"
): Promise<Candle[]> {
  try {
    // In production, this would call the stock-analysis skill via MCP
    // For now, we'll return a placeholder that would be replaced
    console.log(`[MarketData] Fetching ${symbol} candles (${interval}, ${range})`);

    // TODO: Replace with actual MCP call to Yahoo/get_stock_chart
    // const response = await mcpClient.call("Yahoo/get_stock_chart", {
    //   symbol,
    //   interval,
    //   range,
    // });

    // Placeholder response structure
    const mockResponse: StockChartResponse = {
      chart: {
        result: [
          {
            meta: {
              symbol,
              currency: "USD",
              regularMarketPrice: 150,
              fiftyTwoWeekHigh: 200,
              fiftyTwoWeekLow: 100,
            },
            timestamp: [],
            indicators: {
              quote: [
                {
                  open: [],
                  high: [],
                  low: [],
                  close: [],
                  volume: [],
                },
              ],
            },
          },
        ],
      },
    };

    const result = mockResponse.chart.result[0];
    if (!result || result.timestamp.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    const candles: Candle[] = [];
    const timestamps = result.timestamp;
    const ohlcv = result.indicators.quote[0];

    for (let i = 0; i < timestamps.length; i++) {
      if (!ohlcv.open[i] || !ohlcv.close[i]) continue;
      candles.push({
        time: timestamps[i] * 1000,
        open: parseFloat(String(ohlcv.open[i])),
        high: parseFloat(String(ohlcv.high[i])),
        low: parseFloat(String(ohlcv.low[i])),
        close: parseFloat(String(ohlcv.close[i])),
        volume: parseFloat(String(ohlcv.volume[i])) || 0,
      });
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
    console.log(`[MarketData] Fetching current price for ${symbol}`);

    // TODO: Replace with actual MCP call to Yahoo/get_stock_chart (1d range)
    // const response = await mcpClient.call("Yahoo/get_stock_chart", {
    //   symbol,
    //   interval: "1d",
    //   range: "1d",
    // });

    // Placeholder
    const mockPrice = 150;
    return mockPrice;
  } catch (error) {
    console.error(`[MarketData] Error fetching price for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch technical insights and outlook
 */
export async function fetchInsights(symbol: string): Promise<StockInsightsResponse | null> {
  try {
    console.log(`[MarketData] Fetching insights for ${symbol}`);

    // TODO: Replace with actual MCP call to Yahoo/get_stock_insights
    // const response = await mcpClient.call("Yahoo/get_stock_insights", {
    //   symbol,
    // });

    // Placeholder
    const mockInsights: StockInsightsResponse = {
      symbol,
      instrumentInfo: {
        technicalEvents: {
          shortTermOutlook: {
            direction: "bullish",
            score: 70,
          },
          intermediateTermOutlook: {
            direction: "bullish",
            score: 65,
          },
          longTermOutlook: {
            direction: "bullish",
            score: 60,
          },
          keyTechnicals: {
            support: 145,
            resistance: 155,
          },
        },
      },
    };

    return mockInsights;
  } catch (error) {
    console.error(`[MarketData] Error fetching insights for ${symbol}:`, error);
    return null;
  }
}

/**
 * Determine macro trend based on weekly candles
 */
export function determineMacroTrend(weeklyCandles: Candle[]): string {
  if (weeklyCandles.length < 50) return "NEUTRAL";

  const closes = weeklyCandles.map((c) => c.close);

  // Simple EMA-based macro trend
  const recentAvg = closes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const olderAvg = closes.slice(-20, -10).reduce((a, b) => a + b, 0) / 10;

  if (recentAvg > olderAvg * 1.02) return "BULL";
  if (recentAvg < olderAvg * 0.98) return "BEAR";
  return "NEUTRAL";
}
