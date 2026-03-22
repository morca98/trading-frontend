// Web Worker para calcular Volume Profile sem bloquear a UI
import { Candle } from './candleAggregator';

export interface VolumeProfileResult {
  bins: number[];
  binPrices: number[];
  poc: number;
  vah: number;
  val: number;
  maxVolume: number;
}

export function calculateVolumeProfile(
  candles: Candle[],
  minPrice: number,
  maxPrice: number,
  numBins: number = 40
): VolumeProfileResult {
  const binSize = (maxPrice - minPrice) / numBins;
  const bins = new Array(numBins).fill(0);
  const binPrices = Array.from({ length: numBins }, (_, i) => minPrice + i * binSize);

  // Distribuir volume nos bins
  candles.forEach(candle => {
    const startBin = Math.floor((Math.min(candle.open, candle.close) - minPrice) / binSize);
    const endBin = Math.floor((Math.max(candle.open, candle.close) - minPrice) / binSize);

    const start = Math.max(0, Math.min(numBins - 1, startBin));
    const end = Math.max(0, Math.min(numBins - 1, endBin));
    const range = end - start + 1;

    for (let i = start; i <= end; i++) {
      bins[i] += candle.volume / range;
    }
  });

  // Encontrar POC
  const maxVolume = Math.max(...bins);
  const pocIdx = bins.indexOf(maxVolume);
  const poc = binPrices[pocIdx] + binSize / 2;

  // Calcular Value Area (70% do volume)
  const totalVolume = bins.reduce((a, b) => a + b, 0);
  const targetVolume = totalVolume * 0.7;
  let currentVolume = bins[pocIdx];
  let lowIdx = pocIdx;
  let highIdx = pocIdx;

  while (currentVolume < targetVolume && (lowIdx > 0 || highIdx < numBins - 1)) {
    const volBelow = lowIdx > 0 ? bins[lowIdx - 1] : 0;
    const volAbove = highIdx < numBins - 1 ? bins[highIdx + 1] : 0;

    if (volAbove >= volBelow) {
      currentVolume += volAbove;
      highIdx++;
    } else {
      currentVolume += volBelow;
      lowIdx--;
    }
  }

  return {
    bins,
    binPrices,
    poc,
    vah: binPrices[Math.min(highIdx, numBins - 1)] + binSize,
    val: binPrices[Math.max(lowIdx, 0)],
    maxVolume,
  };
}
