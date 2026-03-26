import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { runBacktest, optimizeStrategy } from "../trading/backtest";
import { fetchCandles } from "../trading/marketData";

export const backtestRouter = router({
  runBacktest: publicProcedure
    .input(
      z.object({
        symbol: z.string().toUpperCase(),
        days: z.number().default(90),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (input.days < 30 || input.days > 365) {
          throw new Error("Days must be between 30 and 365");
        }

        const candles = await fetchCandles(input.symbol, "1d", "1y");

        if (!candles || candles.length < 100) {
          throw new Error("Insufficient historical data for backtest");
        }

        const result = await runBacktest(input.symbol, candles);

        return {
          success: true,
          symbol: input.symbol,
          period: `${input.days} days`,
          trades: result.trades,
          metrics: result.metrics,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Backtest failed";
        return {
          success: false,
          error: message,
        };
      }
    }),

  optimizeStrategy: publicProcedure
    .input(
      z.object({
        symbol: z.string().toUpperCase(),
        days: z.number().default(90),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (input.days < 30 || input.days > 365) {
          throw new Error("Days must be between 30 and 365");
        }

        const candles = await fetchCandles(input.symbol, "1d", "1y");

        if (!candles || candles.length < 100) {
          throw new Error("Insufficient historical data");
        }

        const result = await optimizeStrategy(input.symbol, candles, {
          adxMin: [20, 30],
          rsiRange: [30, 70],
          volumeMultiplier: [1.2, 1.8],
        });

        return {
          success: true,
          symbol: input.symbol,
          bestParams: result.bestParams,
          metrics: result.bestMetrics,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Optimization failed";
        return {
          success: false,
          error: message,
        };
      }
    }),

  compareSymbols: publicProcedure
    .input(
      z.object({
        symbols: z.array(z.string().toUpperCase()),
        days: z.number().default(90),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (input.days < 30 || input.days > 365) {
          throw new Error("Days must be between 30 and 365");
        }

        const results = [];

        for (const symbol of input.symbols) {
          try {
            const candles = await fetchCandles(symbol, "1d", "1y");
            if (candles && candles.length >= 100) {
              const result = await runBacktest(symbol, candles);
              results.push({
                symbol,
                metrics: result.metrics,
                totalTrades: result.trades.length,
              });
            }
          } catch (err) {
            console.error(`Failed to backtest ${symbol}:`, err);
          }
        }

        results.sort((a, b) => b.metrics.profitFactor - a.metrics.profitFactor);

        return {
          success: true,
          results,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Comparison failed";
        return {
          success: false,
          error: message,
        };
      }
    }),
});
