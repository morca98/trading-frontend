/**
 * Trailing Stop Implementation
 * Dynamic stop loss that follows price upward (for BUY) or downward (for SELL)
 */

export interface TrailingStopConfig {
  enabled: boolean;
  trailingPct: number; // e.g., 2% trailing distance
  updateFrequency: number; // milliseconds between updates
}

export interface TrailingStopState {
  entryPrice: number;
  currentSL: number;
  highestPrice?: number; // For BUY trades
  lowestPrice?: number; // For SELL trades
  profitPct: number;
}

/**
 * Calculate trailing stop for BUY trades
 * Stop loss follows price upward
 */
export function calculateTrailingStopBUY(
  currentPrice: number,
  entryPrice: number,
  state: TrailingStopState,
  config: TrailingStopConfig
): TrailingStopState {
  const newState = { ...state };

  // Track highest price reached
  if (!state.highestPrice || currentPrice > state.highestPrice) {
    newState.highestPrice = currentPrice;
  }

  // Calculate profit percentage
  const profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;
  newState.profitPct = profitPct;

  // Update trailing stop based on highest price
  if (newState.highestPrice) {
    const trailingDistance = newState.highestPrice * (config.trailingPct / 100);
    const newSL = newState.highestPrice - trailingDistance;

    // Only move SL upward (never downward)
    if (newSL > state.currentSL) {
      newState.currentSL = newSL;
    }
  }

  return newState;
}

/**
 * Calculate trailing stop for SELL trades
 * Stop loss follows price downward
 */
export function calculateTrailingStopSELL(
  currentPrice: number,
  entryPrice: number,
  state: TrailingStopState,
  config: TrailingStopConfig
): TrailingStopState {
  const newState = { ...state };

  // Track lowest price reached
  if (!state.lowestPrice || currentPrice < state.lowestPrice) {
    newState.lowestPrice = currentPrice;
  }

  // Calculate profit percentage
  const profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;
  newState.profitPct = profitPct;

  // Update trailing stop based on lowest price
  if (newState.lowestPrice) {
    const trailingDistance = newState.lowestPrice * (config.trailingPct / 100);
    const newSL = newState.lowestPrice + trailingDistance;

    // Only move SL downward (never upward)
    if (newSL < state.currentSL) {
      newState.currentSL = newSL;
    }
  }

  return newState;
}

/**
 * Check if trade should be closed based on trailing stop
 */
export function checkTrailingStopExit(
  currentPrice: number,
  state: TrailingStopState,
  signal: "BUY" | "SELL"
): { shouldClose: boolean; reason: string } {
  if (signal === "BUY") {
    if (currentPrice <= state.currentSL) {
      return {
        shouldClose: true,
        reason: `Trailing stop hit at $${state.currentSL.toFixed(2)}`,
      };
    }
  } else {
    if (currentPrice >= state.currentSL) {
      return {
        shouldClose: true,
        reason: `Trailing stop hit at $${state.currentSL.toFixed(2)}`,
      };
    }
  }

  return { shouldClose: false, reason: "" };
}

/**
 * Default configuration for trailing stops
 */
export const DEFAULT_TRAILING_STOP_CONFIG: TrailingStopConfig = {
  enabled: true,
  trailingPct: 2, // 2% trailing distance
  updateFrequency: 60000, // Update every minute
};

/**
 * Create initial trailing stop state
 */
export function createTrailingStopState(
  entryPrice: number,
  initialSL: number,
  signal: "BUY" | "SELL"
): TrailingStopState {
  return {
    entryPrice,
    currentSL: initialSL,
    highestPrice: signal === "BUY" ? entryPrice : undefined,
    lowestPrice: signal === "SELL" ? entryPrice : undefined,
    profitPct: 0,
  };
}
