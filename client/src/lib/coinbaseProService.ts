import { Candle } from './candleAggregator';
import { aggregateCandles } from './candleAggregator';

const COINBASE_PRO_API = 'https://api.exchange.coinbase.com';

interface CoinbaseCandle {
  time: number;
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

// Mapeamento de símbolos
const SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT': 'BTC-USD',
  'ETH/USDT': 'ETH-USD',
  'SOL/USDT': 'SOL-USD',
};

// Mapeamento de timeframes para segundos (apenas os suportados pela API do Coinbase Pro)
const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '6h': 21600,
  '1d': 86400,
};

// Mapeamento para buscar dados base para timeframes não suportados
const BASE_TIMEFRAME: Record<string, string> = {
  '30m': '15m',
  '4h': '1h',
};

/**
 * Buscar candles do Coinbase Pro
 */
export async function getCoinbaseProCandles(
  symbol: string,
  timeframe: string = '30m',
  limit: number = 300
): Promise<Candle[]> {
  try {
    const productId = SYMBOL_MAP[symbol] || 'BTC-USD';
    const fetchTimeframe = BASE_TIMEFRAME[timeframe] || timeframe;
    const granularity = TIMEFRAME_SECONDS[fetchTimeframe] || 3600;
    const multiplier = BASE_TIMEFRAME[timeframe] ? (timeframe === '30m' ? 2 : 4) : 1;
    const fetchLimit = Math.min(limit * multiplier, 300);

    const url = new URL(`${COINBASE_PRO_API}/products/${productId}/candles`);
    url.searchParams.append('granularity', granularity.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Coinbase Pro API error: ${response.statusText}`);
    }

    const data: any[] = await response.json();
    if (!Array.isArray(data)) return [];

    // Coinbase retorna [time, low, high, open, close, volume]
    const candles: Candle[] = data.map((c: any) => ({
      time: c[0] * 1000,
      low: c[1],
      high: c[2],
      open: c[3],
      close: c[4],
      volume: c[5],
    })).reverse();

    let result = candles;
    if (BASE_TIMEFRAME[timeframe]) {
      result = aggregateCandles(candles, timeframe as any);
    }

    return result.slice(-limit);
  } catch (error) {
    console.error('Erro ao buscar dados do Coinbase Pro:', error);
    return [];
  }
}

/**
 * Buscar múltiplos lotes de candles para histórico (1 ano)
 */
export async function getCoinbaseProCandlesExtended(
  symbol: string,
  timeframe: string = '30m',
  totalCandles: number = 17520,
  onProgress?: (progress: number) => void
): Promise<Candle[]> {
  try {
    const productId = SYMBOL_MAP[symbol] || 'BTC-USD';
    const fetchTimeframe = BASE_TIMEFRAME[timeframe] || timeframe;
    const granularity = TIMEFRAME_SECONDS[fetchTimeframe] || 3600;
    const multiplier = BASE_TIMEFRAME[timeframe] ? (timeframe === '30m' ? 2 : 4) : 1;
    const fetchTotal = totalCandles * multiplier;

    const allCandles: Candle[] = [];
    const seenTimestamps = new Set<number>();
    let endTime: Date | undefined;
    const batchSize = 300;
    const maxBatches = 70;
    const batches = Math.ceil(fetchTotal / batchSize);
    const actualBatches = Math.min(batches, maxBatches);

    console.log(`Carregando ${fetchTotal} candles base (${fetchTimeframe}) em ${actualBatches} lotes...`);

    for (let i = 0; i < actualBatches; i++) {
      const url = new URL(`${COINBASE_PRO_API}/products/${productId}/candles`);
      url.searchParams.append('granularity', granularity.toString());

      if (endTime) {
        url.searchParams.append('end', endTime.toISOString());
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.warn(`Batch ${i + 1} failed: ${response.statusText}`);
        break;
      }

      const data: any[] = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`Batch ${i + 1}: Sem dados, parando.`);
        break;
      }

      // Mapear dados e filtrar duplicados
      const candles: Candle[] = data
        .map((c: any) => ({
          time: c[0] * 1000,
          low: c[1],
          high: c[2],
          open: c[3],
          close: c[4],
          volume: c[5],
        }))
        .reverse()
        .filter(c => {
          if (seenTimestamps.has(c.time)) {
            return false;
          }
          seenTimestamps.add(c.time);
          return true;
        });

      if (candles.length > 0) {
        allCandles.unshift(...candles);
        console.log(`Batch ${i + 1}: ${candles.length} candles únicos (total: ${allCandles.length})`);
      }

      if (onProgress) {
        const currentProgress = Math.min(99, Math.round(((i + 1) / actualBatches) * 100));
        onProgress(currentProgress);
      }

      // Definir endTime para o candle mais antigo
      if (data.length > 0) {
        endTime = new Date(data[data.length - 1][0] * 1000);
      }

      if (allCandles.length >= fetchTotal) {
        console.log(`Atingido o limite de ${fetchTotal} candles.`);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`Total de candles únicos: ${allCandles.length}`);

    let result = allCandles;
    if (BASE_TIMEFRAME[timeframe]) {
      result = aggregateCandles(allCandles, timeframe as any);
      console.log(`Após agregação: ${result.length} candles`);
    }

    // Garantir ordenação cronológica
    result.sort((a, b) => a.time - b.time);

    const final = result.slice(-totalCandles);
    console.log(`Retornando ${final.length} candles finais`);
    return final;
  } catch (error) {
    console.error('Erro ao buscar histórico estendido:', error);
    return [];
  }
}
