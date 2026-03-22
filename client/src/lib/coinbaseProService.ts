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
    
    // Verificar se o timeframe é suportado ou se precisa de um base
    const fetchTimeframe = BASE_TIMEFRAME[timeframe] || timeframe;
    const granularity = TIMEFRAME_SECONDS[fetchTimeframe] || 3600;
    
    // Se estivermos a agregar, precisamos de mais candles base
    const multiplier = BASE_TIMEFRAME[timeframe] ? (timeframe === '30m' ? 2 : 4) : 1;
    const fetchLimit = Math.min(limit * multiplier, 300);

    const url = new URL(`${COINBASE_PRO_API}/products/${productId}/candles`);
    url.searchParams.append('granularity', granularity.toString());
    // A API do Coinbase Pro não suporta o parâmetro 'limit' diretamente no endpoint de candles, 
    // ela retorna até 300 candles por padrão ou baseada no range start/end.

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
 * Buscar múltiplos lotes de candles para histórico maior (até 2 anos)
 * @param symbol Símbolo
 * @param timeframe Timeframe
 * @param totalCandles Total de candles desejados (padrão: 35040 = 2 anos em 30m)
 */
import { aggregateCandles } from './candleAggregator';

export async function getCoinbaseProCandlesExtended(
  symbol: string,
  timeframe: string = '30m',
  totalCandles: number = 35040,
  onProgress?: (progress: number) => void
): Promise<Candle[]> {
  try {
    const productId = SYMBOL_MAP[symbol] || 'BTC-USD';
    
    // Verificar se o timeframe é suportado ou se precisa de um base
    const fetchTimeframe = BASE_TIMEFRAME[timeframe] || timeframe;
    const granularity = TIMEFRAME_SECONDS[fetchTimeframe] || 3600;
    
    // Se estivermos a agregar, precisamos de mais candles base
    const multiplier = BASE_TIMEFRAME[timeframe] ? (timeframe === '30m' ? 2 : 4) : 1;
    const fetchTotal = totalCandles * multiplier;

    const allCandles: Candle[] = [];
    let endTime: Date | undefined;
    const batchSize = 300;
    const batches = Math.ceil(fetchTotal / batchSize);
    
    // Limitar o número de lotes para evitar esperas excessivas (máx 250 lotes = 75.000 candles base)
    // 75.000 candles de 15m = ~37.500 candles de 30m (~2 anos)
    const maxBatches = 250;
    const actualBatches = Math.min(batches, maxBatches);
    
    console.log(`Carregando ${fetchTotal} candles base (${fetchTimeframe}) em ${actualBatches} lotes para gerar ${totalCandles} candles de ${timeframe}...`);

    for (let i = 0; i < actualBatches; i++) {
      const url = new URL(`${COINBASE_PRO_API}/products/${productId}/candles`);
      url.searchParams.append('granularity', granularity.toString());
      
      // Usar 'end' em vez de 'before' conforme documentação oficial
      if (endTime) {
        url.searchParams.append('end', endTime.toISOString());
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.warn(`Batch ${i + 1} failed: ${response.statusText}`);
        break;
      }

      const data: CoinbaseCandle[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        break;
      }

      // Coinbase retorna [time, low, high, open, close, volume]
      // O mapeamento anterior estava assumindo chaves de objeto, mas a API retorna arrays
      const candles: Candle[] = data.map((c: any) => ({
        time: c[0] * 1000,
        low: c[1],
        high: c[2],
        open: c[3],
        close: c[4],
        volume: c[5],
      })).reverse();

      allCandles.unshift(...candles);

      // Atualizar progresso real
      if (onProgress) {
        const currentProgress = Math.min(99, Math.round(((i + 1) / actualBatches) * 100));
        onProgress(currentProgress);
      }

      // Definir endTime para o candle mais antigo do lote atual para buscar o anterior
      if (data.length > 0) {
        // data[data.length - 1] é o mais antigo no lote (ordem decrescente)
        endTime = new Date(data[data.length - 1][0] * 1000);
      }

      if (allCandles.length >= fetchTotal) {
        break;
      }

      // Aumentar o delay ligeiramente para evitar 429 Too Many Requests em carregamentos longos
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    let result = allCandles;
    
    // Agregar se necessário
    if (BASE_TIMEFRAME[timeframe]) {
      result = aggregateCandles(allCandles, timeframe as any);
    }

    return result.slice(-totalCandles);
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
