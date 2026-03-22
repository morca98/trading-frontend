import { Candle } from './candleAggregator';

const BYBIT_API = 'https://api.bybit.com/v5/market/kline';

// Mapeamento de símbolos para Bybit (formato: BTCUSDT, ETHUSDT, etc.)
const SYMBOL_MAP: Record<string, string> = {
  'BTCUSDT': 'BTCUSDT',
  'ETHUSDT': 'ETHUSDT',
  'SOLUSDT': 'SOLUSDT',
};

// Mapeamento de timeframes para Bybit (1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M)
const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

/**
 * Buscar candles do Bybit
 */
export async function getBybitCandles(
  symbol: string,
  timeframe: string = '1d',
  limit: number = 200
): Promise<Candle[]> {
  try {
    const bybitSymbol = SYMBOL_MAP[symbol] || 'BTCUSDT';
    const bybitTimeframe = TIMEFRAME_MAP[timeframe] || 'D';

    const url = new URL(BYBIT_API);
    url.searchParams.append('category', 'spot');
    url.searchParams.append('symbol', bybitSymbol);
    url.searchParams.append('interval', bybitTimeframe);
    url.searchParams.append('limit', Math.min(limit, 1000).toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.retCode !== 0 || !data.result || !data.result.list) {
      console.error('Bybit API error:', data.retMsg);
      return [];
    }

    // Bybit retorna [timestamp, open, high, low, close, volume, turnover]
    const candles: Candle[] = data.result.list
      .map((c: any[]) => ({
        time: parseInt(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[3]),
        low: parseFloat(c[4]),
        close: parseFloat(c[2]),
        volume: parseFloat(c[5]),
      }))
      .sort((a, b) => a.time - b.time);

    return candles;
  } catch (error) {
    console.error('Erro ao buscar dados do Bybit:', error);
    return [];
  }
}

/**
 * Buscar múltiplos lotes de candles para histórico (até 1 ano)
 */
export async function getBybitCandlesExtended(
  symbol: string,
  timeframe: string = '1d',
  totalCandles: number = 365,
  onProgress?: (progress: number) => void
): Promise<Candle[]> {
  try {
    const bybitSymbol = SYMBOL_MAP[symbol] || 'BTCUSDT';
    const bybitTimeframe = TIMEFRAME_MAP[timeframe] || 'D';

    const allCandles: Candle[] = [];
    const seenTimestamps = new Set<number>();
    const batchSize = 1000;
    const maxBatches = Math.ceil(totalCandles / batchSize);

    console.log(`Carregando ${totalCandles} candles de ${timeframe} da Bybit em ${maxBatches} lotes...`);

    for (let i = 0; i < maxBatches; i++) {
      const url = new URL(BYBIT_API);
      url.searchParams.append('category', 'spot');
      url.searchParams.append('symbol', bybitSymbol);
      url.searchParams.append('interval', bybitTimeframe);
      url.searchParams.append('limit', '1000');

      // Se não é o primeiro lote, usar o timestamp do candle mais antigo como referência
      if (allCandles.length > 0) {
        const oldestTime = Math.min(...allCandles.map(c => c.time));
        url.searchParams.append('end', oldestTime.toString());
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.warn(`Batch ${i + 1} failed: ${response.statusText}`);
        break;
      }

      const data = await response.json();
      if (data.retCode !== 0 || !data.result || !data.result.list) {
        console.log(`Batch ${i + 1}: Sem dados, parando.`);
        break;
      }

      const candles: Candle[] = data.result.list
        .map((c: any[]) => ({
          time: parseInt(c[0]),
          open: parseFloat(c[1]),
          high: parseFloat(c[3]),
          low: parseFloat(c[4]),
          close: parseFloat(c[2]),
          volume: parseFloat(c[5]),
        }))
        .filter(c => {
          // Filtrar duplicados
          if (seenTimestamps.has(c.time)) {
            return false;
          }
          seenTimestamps.add(c.time);
          return true;
        })
        .sort((a, b) => a.time - b.time);

      if (candles.length === 0) {
        console.log(`Batch ${i + 1}: Sem candles únicos, parando.`);
        break;
      }

      allCandles.unshift(...candles);
      console.log(`Batch ${i + 1}: ${candles.length} candles únicos (total: ${allCandles.length})`);

      if (onProgress) {
        const currentProgress = Math.min(99, Math.round(((i + 1) / maxBatches) * 100));
        onProgress(currentProgress);
      }

      if (allCandles.length >= totalCandles) {
        console.log(`Atingido o limite de ${totalCandles} candles.`);
        break;
      }

      // Delay para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Garantir ordenação cronológica
    allCandles.sort((a, b) => a.time - b.time);

    const final = allCandles.slice(-totalCandles);
    console.log(`Retornando ${final.length} candles finais`);
    return final;
  } catch (error) {
    console.error('Erro ao buscar histórico estendido da Bybit:', error);
    return [];
  }
}
