import { Candle } from './candleAggregator';

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  isHighVolume: boolean;
}

export interface VolumeProfileData {
  poc: number; // Point of Control
  vah: number; // Value Area High
  val: number; // Value Area Low
  levels: VolumeProfileLevel[];
}

export interface SupportResistance {
  level: number;
  type: 'support' | 'resistance';
  strength: number; // 1-10
  touches: number;
}

export interface LiquidationLevel {
  level: number;
  type: 'long' | 'short';
  volume: number;
  strength: number;
}

export interface SignalData {
  type: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number; // 0-100
  reasons: string[];
  targetPrice: number;
  stopLoss: number;
  riskReward: number;
}

/**
 * Calcula Volume Profile com POC, VAH e VAL
 */
export function calculateVolumeProfile(candles: Candle[], levels: number = 40): VolumeProfileData {
  if (candles.length === 0) {
    return { poc: 0, vah: 0, val: 0, levels: [] };
  }

  const prices = candles.map((c) => [c.high, c.low]).flat();
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const levelSize = priceRange / levels;

  // Criar níveis de preço
  const volumeLevels: VolumeProfileLevel[] = [];

  for (let i = 0; i < levels; i++) {
    const levelPrice = minPrice + i * levelSize;
    let volume = 0;

    // Somar volume de todos os candles que tocam este nível
    candles.forEach((candle) => {
      if (candle.low <= levelPrice && candle.high >= levelPrice) {
        volume += candle.volume;
      }
    });

    volumeLevels.push({
      price: levelPrice,
      volume,
      isHighVolume: false,
    });
  }

  // Encontrar POC (maior volume)
  const pocLevel = volumeLevels.reduce((max, current) =>
    current.volume > max.volume ? current : max
  );
  const poc = pocLevel.price;

  // Calcular VAH e VAL (Value Area = 70% do volume total)
  const totalVolume = volumeLevels.reduce((sum, level) => sum + level.volume, 0);
  const valueAreaVolume = totalVolume * 0.7;
  let cumulativeVolume = 0;
  let vah = poc;
  let val = poc;

  // Expandir para cima
  for (let i = volumeLevels.findIndex((l) => l.price === poc); i < volumeLevels.length; i++) {
    cumulativeVolume += volumeLevels[i].volume;
    vah = volumeLevels[i].price;
    if (cumulativeVolume >= valueAreaVolume / 2) break;
  }

  // Expandir para baixo
  cumulativeVolume = 0;
  for (let i = volumeLevels.findIndex((l) => l.price === poc); i >= 0; i--) {
    cumulativeVolume += volumeLevels[i].volume;
    val = volumeLevels[i].price;
    if (cumulativeVolume >= valueAreaVolume / 2) break;
  }

  // Marcar high volume nodes (HVN)
  const avgVolume = totalVolume / levels;
  volumeLevels.forEach((level) => {
    if (level.volume > avgVolume * 1.5) {
      level.isHighVolume = true;
    }
  });

  return {
    poc,
    vah: Math.max(vah, poc),
    val: Math.min(val, poc),
    levels: volumeLevels,
  };
}

/**
 * Detecta suportes e resistências usando fractais
 */
export function detectSupportResistance(candles: Candle[], lookback: number = 20): SupportResistance[] {
  const levels: SupportResistance[] = [];

  if (candles.length < lookback * 2) return levels;

  // Encontrar topos (resistências)
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isTop = true;
    const currentHigh = candles[i].high;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high >= currentHigh) {
        isTop = false;
        break;
      }
    }

    if (isTop) {
      // Verificar quantas vezes este nível foi testado
      let touches = 1;
      for (let j = i + 1; j < candles.length; j++) {
        if (Math.abs(candles[j].high - currentHigh) < currentHigh * 0.001) {
          touches++;
        }
      }

      levels.push({
        level: currentHigh,
        type: 'resistance',
        strength: Math.min(touches, 10),
        touches,
      });
    }
  }

  // Encontrar fundos (suportes)
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isBottom = true;
    const currentLow = candles[i].low;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low <= currentLow) {
        isBottom = false;
        break;
      }
    }

    if (isBottom) {
      // Verificar quantas vezes este nível foi testado
      let touches = 1;
      for (let j = i + 1; j < candles.length; j++) {
        if (Math.abs(candles[j].low - currentLow) < currentLow * 0.001) {
          touches++;
        }
      }

      levels.push({
        level: currentLow,
        type: 'support',
        strength: Math.min(touches, 10),
        touches,
      });
    }
  }

  // Remover duplicatas
  const uniqueLevels = levels.filter((level, index, self) =>
    index === self.findIndex((l) => Math.abs(l.level - level.level) < level.level * 0.001)
  );

  return uniqueLevels.sort((a, b) => b.strength - a.strength);
}

/**
 * Calcula níveis de liquidação baseado em volume e volatilidade
 */
export function calculateLiquidationLevels(candles: Candle[], atr: number[]): LiquidationLevel[] {
  const levels: LiquidationLevel[] = [];

  if (candles.length === 0 || atr.length === 0) return levels;

  const lastCandle = candles[candles.length - 1];
  const lastATR = atr[atr.length - 1];
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;

  // Calcular rácio long/short baseado em volume
  let bullishVolume = 0;
  let bearishVolume = 0;

  candles.slice(-20).forEach((candle) => {
    if (candle.close > candle.open) {
      bullishVolume += candle.volume;
    } else {
      bearishVolume += candle.volume;
    }
  });

  const bullishRatio = bullishVolume / (bullishVolume + bearishVolume);

  // Níveis de liquidação LONG (acima do preço)
  for (let i = 1; i <= 3; i++) {
    const level = lastCandle.close + lastATR * i;
    const volume = avgVolume * (1 + bullishRatio * 0.5);
    const strength = Math.min(i * 3, 10);

    levels.push({
      level,
      type: 'long',
      volume,
      strength,
    });
  }

  // Níveis de liquidação SHORT (abaixo do preço)
  for (let i = 1; i <= 3; i++) {
    const level = lastCandle.close - lastATR * i;
    const volume = avgVolume * (1 + (1 - bullishRatio) * 0.5);
    const strength = Math.min(i * 3, 10);

    levels.push({
      level,
      type: 'short',
      volume,
      strength,
    });
  }

  return levels;
}

/**
 * Gera sinais baseado em Volume Profile, Suporte/Resistência e Liquidação
 */
export function generateAdvancedSignal(
  candles: Candle[],
  volumeProfile: VolumeProfileData,
  supportResistance: SupportResistance[],
  liquidationLevels: LiquidationLevel[],
  atr: number[]
): SignalData {
  const lastCandle = candles[candles.length - 1];
  const lastATR = atr[atr.length - 1];
  let confidence = 0;
  const reasons: string[] = [];

  // Encontrar suportes e resistências próximos
  const nearbySupport = supportResistance
    .filter((s) => s.type === 'support' && s.level < lastCandle.close)
    .sort((a, b) => b.level - a.level)[0];

  const nearbyResistance = supportResistance
    .filter((s) => s.type === 'resistance' && s.level > lastCandle.close)
    .sort((a, b) => a.level - b.level)[0];

  // Análise 1: Proximidade ao POC (Point of Control)
  const distanceToPOC = Math.abs(lastCandle.close - volumeProfile.poc) / lastCandle.close;
  if (distanceToPOC < 0.01) {
    confidence += 15;
    reasons.push('Preço próximo ao POC (alto volume)');
  }

  // Análise 2: Dentro da Value Area
  if (lastCandle.close >= volumeProfile.val && lastCandle.close <= volumeProfile.vah) {
    confidence += 10;
    reasons.push('Preço dentro da Value Area');
  } else if (lastCandle.close > volumeProfile.vah) {
    confidence -= 5;
    reasons.push('Preço acima da Value Area (possível reversão)');
  } else if (lastCandle.close < volumeProfile.val) {
    confidence -= 5;
    reasons.push('Preço abaixo da Value Area (possível reversão)');
  }

  // Análise 3: Suporte forte próximo
  if (nearbySupport && lastCandle.close - nearbySupport.level < lastATR) {
    confidence += nearbySupport.strength * 2;
    reasons.push(`Suporte forte em $${nearbySupport.level.toFixed(2)} (força: ${nearbySupport.strength})`);
  }

  // Análise 4: Resistência próxima
  if (nearbyResistance && nearbyResistance.level - lastCandle.close < lastATR) {
    confidence += nearbyResistance.strength * 1.5;
    reasons.push(`Resistência próxima em $${nearbyResistance.level.toFixed(2)} (força: ${nearbyResistance.strength})`);
  }

  // Análise 5: Liquidação
  const nearbyLiquidation = liquidationLevels
    .filter((l) => Math.abs(l.level - lastCandle.close) < lastATR * 2)
    .sort((a, b) => b.strength - a.strength)[0];

  if (nearbyLiquidation) {
    if (nearbyLiquidation.type === 'long') {
      confidence += 8;
      reasons.push(`Liquidação LONG próxima em $${nearbyLiquidation.level.toFixed(2)}`);
    } else {
      confidence += 8;
      reasons.push(`Liquidação SHORT próxima em $${nearbyLiquidation.level.toFixed(2)}`);
    }
  }

  // Análise 6: Momentum
  const recentCandles = candles.slice(-5);
  const closes = recentCandles.map((c) => c.close);
  const isUptrend = closes[closes.length - 1] > closes[0];

  if (isUptrend) {
    confidence += 10;
    reasons.push('Momentum de alta nos últimos 5 candles');
  } else {
    confidence -= 10;
    reasons.push('Momentum de baixa nos últimos 5 candles');
  }

  // Determinar tipo de sinal
  let signalType: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';

  if (confidence >= 50) {
    signalType = isUptrend ? 'BUY' : 'SELL';
  } else if (confidence <= -30) {
    signalType = isUptrend ? 'SELL' : 'BUY';
  }

  // Calcular alvo e stop loss
  let targetPrice = lastCandle.close;
  let stopLoss = lastCandle.close;

  if (signalType === 'BUY') {
    if (nearbyResistance) {
      targetPrice = nearbyResistance.level;
    } else {
      targetPrice = lastCandle.close + lastATR * 2;
    }

    if (nearbySupport) {
      stopLoss = nearbySupport.level - lastATR * 0.5;
    } else {
      stopLoss = lastCandle.close - lastATR * 1.5;
    }
  } else if (signalType === 'SELL') {
    if (nearbySupport) {
      targetPrice = nearbySupport.level;
    } else {
      targetPrice = lastCandle.close - lastATR * 2;
    }

    if (nearbyResistance) {
      stopLoss = nearbyResistance.level + lastATR * 0.5;
    } else {
      stopLoss = lastCandle.close + lastATR * 1.5;
    }
  }

  const riskReward = Math.abs(targetPrice - lastCandle.close) / Math.abs(lastCandle.close - stopLoss);

  return {
    type: signalType,
    confidence: Math.max(0, Math.min(100, confidence)),
    reasons,
    targetPrice,
    stopLoss,
    riskReward: isNaN(riskReward) ? 0 : riskReward,
  };
}

/**
 * Identifica confluência de múltiplos sinais
 */
export function identifyConfluence(
  volumeProfile: VolumeProfileData,
  supportResistance: SupportResistance[],
  liquidationLevels: LiquidationLevel[],
  currentPrice: number
): { level: number; confluenceScore: number; sources: string[] }[] {
  const confluenceZones: Map<number, { score: number; sources: string[] }> = new Map();

  const tolerance = currentPrice * 0.002; // 0.2% de tolerância

  // Adicionar Volume Profile levels
  [volumeProfile.poc, volumeProfile.vah, volumeProfile.val].forEach((price) => {
    const key = Math.round(price / tolerance) * tolerance;
    const existing = confluenceZones.get(key) || { score: 0, sources: [] };
    existing.score += 20;
    existing.sources.push('Volume Profile');
    confluenceZones.set(key, existing);
  });

  // Adicionar Suporte/Resistência
  supportResistance.forEach((sr) => {
    const key = Math.round(sr.level / tolerance) * tolerance;
    const existing = confluenceZones.get(key) || { score: 0, sources: [] };
    existing.score += sr.strength * 5;
    existing.sources.push(`${sr.type} (força: ${sr.strength})`);
    confluenceZones.set(key, existing);
  });

  // Adicionar Liquidação
  liquidationLevels.forEach((liq) => {
    const key = Math.round(liq.level / tolerance) * tolerance;
    const existing = confluenceZones.get(key) || { score: 0, sources: [] };
    existing.score += liq.strength * 3;
    existing.sources.push(`Liquidação ${liq.type}`);
    confluenceZones.set(key, existing);
  });

  return Array.from(confluenceZones.entries() || [])
    .map(([level, data]) => ({
      level,
      confluenceScore: data.score,
      sources: Array.from(new Set(data.sources)),
    }))
    .sort((a, b) => b.confluenceScore - a.confluenceScore);
}
