import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getActiveTrades,
  getSignalsBySymbol,
  getDailyStats,
  getSymbols,
  addSymbol,
} from "../db";

export const tradingRouter = router({
  // Get all active trades
  getActiveTrades: protectedProcedure.query(async () => {
    return await getActiveTrades();
  }),

  // Get signals by symbol
  getSignals: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return await getSignalsBySymbol(input.symbol, input.limit);
    }),

  // Get daily stats
  getDailyStats: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return await getDailyStats(input.date);
    }),

  // Get configured symbols
  getSymbols: protectedProcedure.query(async () => {
    return await getSymbols();
  }),

  // Add new symbol to monitor
  addSymbol: protectedProcedure
    .input(
      z.object({
        symbol: z.string().toUpperCase(),
        region: z.enum(["US", "PT", "EU", "BR"]).optional().default("US"),
      })
    )
    .mutation(async ({ input }) => {
      await addSymbol(input.symbol, input.region);
      return { success: true, symbol: input.symbol };
    }),
});
