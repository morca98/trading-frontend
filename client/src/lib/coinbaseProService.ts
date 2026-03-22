import { Candle } from './candleAggregator';

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

// Mapeamento de timeframes para segundos
const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/**
 * Buscar candles do Coinbase Pro
 * @param symbol Símbolo (ex: BTC/USDT)
 * @param timeframe Timeframe (ex: 30m)
 * @param limit Número de candles (máx 300)
 */
export async function getCoinbaseProCandles(
  symbol: string,
  timeframe: string = '30m',
  limit: number = 300
): Promise<Candle[]> {
  try {
    const productId = SYMBOL_MAP[symbol] || 'BTC-USD';
    const granularity = TIMEFRAME_SECONDS[timeframe] || 1800;

    // Coinbase Pro retorna máx 300 candles por requisição
    const actualLimit = Math.min(limit, 300);

    const url = new URL(`${COINBASE_PRO_API}/products/${productId}/candles`);
    url.searchParams.append('granularity', granularity.toString());
    url.searchParams.append('limit', actualLimit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Coinbase Pro API error: ${response.statusText}`);
    }

    const data: CoinbaseCandle[] = await response.json();

    // Coinbase retorna em ordem reversa (mais recente primeiro)
    // Precisamos reverter para ordem cronológica
    const candles: Candle[] = data
      .reverse()
      .map((candle) => ({
        time: candle.time * 1000, // Converter para ms
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));

    return candles;
  } catch (error) {
    console.error('Erro ao buscar dados do Coinbase Pro:', error);
    return [];
  }
}

/**
 * Buscar múltiplos lotes de candles para histórico maior
 * @param symbol Símbolo
 * @param timeframe Timeframe
 * @param totalCandles Total de candles desejados
 */
export async function getCoinbaseProCandlesExtended(
  symbol: string,
  timeframe: string = '30m',
  totalCandles: number = 600
): Promise<Candle[]> {
  try {
    const productId = SYMBOL_MAP[symbol] || 'BTC-USD';
    const granularity = TIMEFRAME_SECONDS[timeframe] || 1800;

    const allCandles: Candle[] = [];
    let endTime: Date | undefined;
    const batchSize = 300;
    const batches = Math.ceil(totalCandles / batchSize);

    for (let i = 0; i < batches; i++) {
      const url = new URL(`${COINBASE_PRO_API}/products/${productId}/candles`);
      url.searchParams.append('granularity', granularity.toString());
      url.searchParams.append('limit', batchSize.toString());

      if (endTime) {
        url.searchParams.append('before', Math.floor(endTime.getTime() / 1000).toString());
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.warn(`Batch ${i + 1} failed, stopping`);
        break;
      }

      const data: CoinbaseCandle[] = await response.json();

      if (data.length === 0) {
        break;
      }

      const candles: Candle[] = data
        .reverse()
        .map((candle) => ({
          time: candle.time * 1000,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        }));

      allCandles.unshift(...candles);

      // Definir endTime para próximo batch
      if (data.length > 0) {
        endTime = new Date(data[0].time * 1000);
      }

      // Parar se temos candles suficientes
      if (allCandles.length >= totalCandles) {
        break;
      }

      // Delay para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return allCandles.slice(-totalCandles);
  } catch (error) {
    console.error('Erro ao buscar histórico estendido:', error);
    return [];
  }
}

/**
 * Stream de preços em tempo real via WebSocket
 */
export function createCoinbaseProStream(
  symbols: string[],
  onMessage: (data: any) => void,
  onError: (error: Error) => void
) {
  const productIds = symbols.map((sym) => SYMBOL_MAP[sym] || 'BTC-USD');

  const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        product_ids: productIds,
        channels: ['ticker', 'match'],
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      onError(new Error('Erro ao parsear mensagem WebSocket'));
    }
  };

  ws.onerror = (event) => {
    onError(new Error('WebSocket error'));
  };

  ws.onclose = () => {
    console.log('WebSocket desconectado');
  };

  return ws;
}
