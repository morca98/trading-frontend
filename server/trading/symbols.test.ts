import { describe, it, expect } from "vitest";

describe("Trading Symbols Configuration", () => {
  it("should have TRADING_SYMBOLS environment variable set", () => {
    const symbols = process.env.TRADING_SYMBOLS;
    expect(symbols).toBeDefined();
    expect(symbols).toBeTruthy();
  });

  it("should have at least 150 symbols", () => {
    const symbols = process.env.TRADING_SYMBOLS || "";
    const symbolList = symbols.split(",").filter(s => s.trim());
    expect(symbolList.length).toBeGreaterThanOrEqual(150);
    console.log(`[Symbols] Total: ${symbolList.length}`);
  });

  it("should include major US stocks", () => {
    const symbols = process.env.TRADING_SYMBOLS || "";
    const symbolList = symbols.split(",").map(s => s.trim());
    
    const majorStocks = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL"];
    for (const stock of majorStocks) {
      expect(symbolList).toContain(stock);
    }
    console.log("[Symbols] Major US stocks verified");
  });

  it("should include Portuguese stocks", () => {
    const symbols = process.env.TRADING_SYMBOLS || "";
    const symbolList = symbols.split(",").map(s => s.trim());
    
    const ptStocks = ["EDP.LS", "GALP.LS", "BCP.LS"];
    for (const stock of ptStocks) {
      expect(symbolList).toContain(stock);
    }
    console.log("[Symbols] Portuguese stocks verified");
  });

  it("should include Brazilian stocks", () => {
    const symbols = process.env.TRADING_SYMBOLS || "";
    const symbolList = symbols.split(",").map(s => s.trim());
    
    const brStocks = ["PETR4.SA", "VALE3.SA", "ITUB4.SA"];
    for (const stock of brStocks) {
      expect(symbolList).toContain(stock);
    }
    console.log("[Symbols] Brazilian stocks verified");
  });

  it("should have valid symbol format", () => {
    const symbols = process.env.TRADING_SYMBOLS || "";
    const symbolList = symbols.split(",").map(s => s.trim());
    
    for (const symbol of symbolList) {
      // Symbol should be alphanumeric with optional dots for exchanges
      expect(symbol).toMatch(/^[A-Z0-9.]+$/);
    }
    console.log("[Symbols] All symbols have valid format");
  });
});
