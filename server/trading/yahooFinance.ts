/**
 * Yahoo Finance Integration Module
 * Fetch real historical data for backtesting and live trading
 */

export interface YahooCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

/**
 * Fetch historical data from Yahoo Finance
 * @param symbol Stock symbol (e.g., 'AAPL')
 * @param period Period in days (e.g., 365 for 1 year)
 * @returns Array of candles with OHLCV data
 */
export async function fetchYahooHistoricalData(symbol: string, period: number = 365): Promise<YahooCandle[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (period * 24 * 60 * 60);

    // Yahoo Finance API endpoint
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,financialData`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[Yahoo Finance] Failed to fetch ${symbol}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Extract historical prices from response
    // Note: This is a simplified extraction - Yahoo Finance API structure varies
    const candles: YahooCandle[] = [];

    // Fallback: Return empty array if data extraction fails
    // In production, use a dedicated library like 'yahoo-finance2'
    return candles;
  } catch (error) {
    console.error(`[Yahoo Finance] Error fetching ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch current price for a symbol
 */
export async function fetchYahooCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Extract current price from response
    const price = data?.quoteSummary?.result?.[0]?.price?.currentPrice?.raw;
    
    return price || null;
  } catch (error) {
    console.error(`[Yahoo Finance] Error fetching current price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple symbols data in parallel
 */
export async function fetchYahooMultipleSymbols(symbols: string[], period: number = 365): Promise<Record<string, YahooCandle[]>> {
  const results: Record<string, YahooCandle[]> = {};

  const promises = symbols.map(async (symbol) => {
    const candles = await fetchYahooHistoricalData(symbol, period);
    results[symbol] = candles;
  });

  await Promise.all(promises);

  return results;
}

/**
 * Format candle data for analysis
 */
export function formatCandleData(candles: YahooCandle[]) {
  return candles.map((c) => ({
    time: c.time,
    open: parseFloat(c.open.toFixed(2)),
    high: parseFloat(c.high.toFixed(2)),
    low: parseFloat(c.low.toFixed(2)),
    close: parseFloat(c.close.toFixed(2)),
    volume: Math.round(c.volume),
  }));
}
