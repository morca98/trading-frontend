import { describe, it, expect } from "vitest";
import {
  calculateTrailingStopBUY,
  calculateTrailingStopSELL,
  checkTrailingStopExit,
  createTrailingStopState,
  DEFAULT_TRAILING_STOP_CONFIG,
} from "./trailingStop";

describe("Trailing Stop - BUY Trades", () => {
  it("should track highest price for BUY trades", () => {
    const entryPrice = 100;
    const initialSL = 98;
    let state = createTrailingStopState(entryPrice, initialSL, "BUY");

    // Price goes up to 105
    state = calculateTrailingStopBUY(105, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    expect(state.highestPrice).toBe(105);
    expect(state.profitPct).toBe(5);

    // Price goes up to 110
    state = calculateTrailingStopBUY(110, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    expect(state.highestPrice).toBe(110);
    expect(state.profitPct).toBe(10);

    // Price goes down to 108 (but highest price stays 110)
    state = calculateTrailingStopBUY(108, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    expect(state.highestPrice).toBe(110);
    expect(state.profitPct).toBeCloseTo(8);
  });

  it("should update trailing stop based on highest price", () => {
    const entryPrice = 100;
    const initialSL = 98;
    let state = createTrailingStopState(entryPrice, initialSL, "BUY");

    // Price reaches 110
    state = calculateTrailingStopBUY(110, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);

    // SL should be 110 - (110 * 0.02) = 107.8
    const expectedSL = 110 - 110 * 0.02;
    expect(state.currentSL).toBeCloseTo(expectedSL, 1);
  });

  it("should trigger breakeven at profit threshold", () => {
    const entryPrice = 100;
    const initialSL = 98;
    let state = createTrailingStopState(entryPrice, initialSL, "BUY");

    // Price reaches 101 (1% profit)
    state = calculateTrailingStopBUY(101, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);

    // Should trigger breakeven
    expect(state.breakEvenTriggered).toBe(true);
    // Note: Trailing stop calculation happens AFTER breakeven, so SL is updated to trailing distance
    // For price 101 with 2% trailing: SL = 101 - (101 * 0.02) = 98.98
    const expectedSL = 101 - 101 * 0.02;
    expect(state.currentSL).toBeCloseTo(expectedSL, 1);
  });

  it("should not move SL downward", () => {
    const entryPrice = 100;
    const initialSL = 98;
    let state = createTrailingStopState(entryPrice, initialSL, "BUY");

    // Price reaches 110
    state = calculateTrailingStopBUY(110, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    const slAfterUp = state.currentSL;

    // Price drops to 105
    state = calculateTrailingStopBUY(105, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);

    // SL should not move down
    expect(state.currentSL).toBe(slAfterUp);
  });
});

describe("Trailing Stop - SELL Trades", () => {
  it("should track lowest price for SELL trades", () => {
    const entryPrice = 100;
    const initialSL = 102;
    let state = createTrailingStopState(entryPrice, initialSL, "SELL");

    // Price goes down to 95
    state = calculateTrailingStopSELL(95, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    expect(state.lowestPrice).toBe(95);
    expect(state.profitPct).toBe(5);

    // Price goes down to 90
    state = calculateTrailingStopSELL(90, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    expect(state.lowestPrice).toBe(90);
    expect(state.profitPct).toBe(10);

    // Price goes up to 92 (but lowest price stays 90)
    state = calculateTrailingStopSELL(92, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    expect(state.lowestPrice).toBe(90);
    expect(state.profitPct).toBeCloseTo(8);
  });

  it("should update trailing stop based on lowest price", () => {
    const entryPrice = 100;
    const initialSL = 102;
    let state = createTrailingStopState(entryPrice, initialSL, "SELL");

    // Price reaches 90
    state = calculateTrailingStopSELL(90, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);

    // SL should be 90 + (90 * 0.02) = 91.8
    const expectedSL = 90 + 90 * 0.02;
    expect(state.currentSL).toBeCloseTo(expectedSL, 1);
  });

  it("should trigger breakeven at profit threshold", () => {
    const entryPrice = 100;
    const initialSL = 102;
    let state = createTrailingStopState(entryPrice, initialSL, "SELL");

    // Price reaches 99 (1% profit)
    state = calculateTrailingStopSELL(99, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);

    // Should trigger breakeven
    expect(state.breakEvenTriggered).toBe(true);
    // Note: Trailing stop calculation happens AFTER breakeven, so SL is updated to trailing distance
    // For price 99 with 2% trailing: SL = 99 + (99 * 0.02) = 100.98
    const expectedSL = 99 + 99 * 0.02;
    expect(state.currentSL).toBeCloseTo(expectedSL, 1);
  });

  it("should not move SL upward", () => {
    const entryPrice = 100;
    const initialSL = 102;
    let state = createTrailingStopState(entryPrice, initialSL, "SELL");

    // Price reaches 90
    state = calculateTrailingStopSELL(90, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);
    const slAfterDown = state.currentSL;

    // Price goes up to 95
    state = calculateTrailingStopSELL(95, entryPrice, state, DEFAULT_TRAILING_STOP_CONFIG);

    // SL should not move up
    expect(state.currentSL).toBe(slAfterDown);
  });
});

describe("Trailing Stop - Exit Checks", () => {
  it("should trigger exit for BUY when price hits SL", () => {
    const entryPrice = 100;
    const initialSL = 98;
    const state = createTrailingStopState(entryPrice, initialSL, "BUY");

    // Price at SL
    const result = checkTrailingStopExit(98, state, "BUY");
    expect(result.shouldClose).toBe(true);
    expect(result.reason).toContain("Trailing stop hit");

    // Price below SL
    const result2 = checkTrailingStopExit(97, state, "BUY");
    expect(result2.shouldClose).toBe(true);
  });

  it("should not trigger exit for BUY when price above SL", () => {
    const entryPrice = 100;
    const initialSL = 98;
    const state = createTrailingStopState(entryPrice, initialSL, "BUY");

    const result = checkTrailingStopExit(99, state, "BUY");
    expect(result.shouldClose).toBe(false);
  });

  it("should trigger exit for SELL when price hits SL", () => {
    const entryPrice = 100;
    const initialSL = 102;
    const state = createTrailingStopState(entryPrice, initialSL, "SELL");

    // Price at SL
    const result = checkTrailingStopExit(102, state, "SELL");
    expect(result.shouldClose).toBe(true);
    expect(result.reason).toContain("Trailing stop hit");

    // Price above SL
    const result2 = checkTrailingStopExit(103, state, "SELL");
    expect(result2.shouldClose).toBe(true);
  });

  it("should not trigger exit for SELL when price below SL", () => {
    const entryPrice = 100;
    const initialSL = 102;
    const state = createTrailingStopState(entryPrice, initialSL, "SELL");

    const result = checkTrailingStopExit(101, state, "SELL");
    expect(result.shouldClose).toBe(false);
  });
});
