import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
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
  getActiveTrades: publicProcedure.query(async () => {
    return await getActiveTrades();
  }),

  // Get signals by symbol
  getSignals: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return await getSignalsBySymbol(input.symbol, input.limit);
    }),

  getGlobalSignals: publicProcedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ input }) => {
      const { getGlobalSignals } = await import("../db");
      return await getGlobalSignals(input.limit);
    }),

  getPerformance: publicProcedure
    .input(z.object({ limit: z.number().optional().default(30) }))
    .query(async ({ input }) => {
      const { getPerformanceHistory } = await import("../db");
      return await getPerformanceHistory(input.limit);
    }),

  // Get daily stats
  getDailyStats: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return await getDailyStats(input.date);
    }),

  // Get configured symbols
  getSymbols: publicProcedure.query(async () => {
    return await getSymbols();
  }),

  // Add new symbol to monitor
  addSymbol: publicProcedure
    .input(
      z.object({
        symbol: z.string().toUpperCase(),
        region: z.string().optional().default("US"),
        sector: z.string().optional().default("Technology"),
      })
    )
    .mutation(async ({ input }) => {
      await addSymbol(input.symbol, input.region, input.sector);
      return { success: true, symbol: input.symbol };
    }),

  // Sync Telegram: Send a test message to verify connection
  syncTelegram: publicProcedure.mutation(async () => {
    const { sendTelegram, formatStartupNotification, initTelegram } = await import("../trading/telegram");
    const { ENV } = await import("../_core/env");
    
    // Re-initialize to ensure config is fresh
    if (ENV.telegramToken && ENV.telegramChatId) {
      initTelegram(ENV.telegramToken, ENV.telegramChatId);
    }
    
    const symbols = await getSymbols();
    const message = formatStartupNotification(symbols.length);
    const success = await sendTelegram(message + "\n\n🔄 <b>Sincronização Manual Realizada</b>");
    
    if (!success) {
      throw new Error("Falha ao enviar mensagem para o Telegram.");
    }
    
    return { success: true };
  }),
});
