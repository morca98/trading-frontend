import { describe, it, expect, beforeAll } from "vitest";
import axios from "axios";

describe("Telegram Integration", () => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  beforeAll(() => {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("[Test] Telegram credentials not configured, skipping tests");
    }
  });

  it("should validate Telegram token format", () => {
    if (!TELEGRAM_TOKEN) {
      console.warn("[Test] TELEGRAM_TOKEN not set, skipping");
      return;
    }
    // Telegram tokens follow pattern: <bot_id>:<token_string>
    expect(TELEGRAM_TOKEN).toMatch(/^\d+:[A-Za-z0-9_-]+$/);
  });

  it("should validate Telegram chat ID format", () => {
    if (!TELEGRAM_CHAT_ID) {
      console.warn("[Test] TELEGRAM_CHAT_ID not set, skipping");
      return;
    }
    // Chat IDs are negative numbers for groups or positive for users
    const chatId = parseInt(TELEGRAM_CHAT_ID, 10);
    expect(Number.isInteger(chatId)).toBe(true);
  });

  it("should be able to reach Telegram API", async () => {
    if (!TELEGRAM_TOKEN) {
      console.warn("[Test] TELEGRAM_TOKEN not set, skipping");
      return;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe`,
        {},
        { timeout: 5000 }
      );
      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      console.log(`[Test] Telegram bot verified: ${response.data.result.username}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Telegram API error: ${error.message}`);
      }
      throw error;
    }
  });

  it("should be able to send test message", async () => {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("[Test] Telegram credentials not set, skipping");
      return;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        {
          chat_id: TELEGRAM_CHAT_ID,
          text: "✅ <b>Stock Signal Bot — Teste de Conexão</b>\n\nCredenciais validadas com sucesso!",
          parse_mode: "HTML",
        },
        { timeout: 5000 }
      );
      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      console.log("[Test] Test message sent successfully");
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send test message: ${error.message}`);
      }
      throw error;
    }
  });
});
