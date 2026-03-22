import { Candle } from './candleAggregator';

interface CacheEntry {
  symbol: string;
  candles: Candle[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hora
const CACHE_KEY_PREFIX = 'candle_cache_';

class CandleCache {
  private memoryCache: Map<string, CacheEntry> = new Map();

  /**
   * Obter candles do cache (memória ou localStorage)
   */
  get(symbol: string): Candle[] | null {
    // Verificar cache em memória primeiro
    const memEntry = this.memoryCache.get(symbol);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      return memEntry.candles;
    }

    // Tentar localStorage
    try {
      const stored = localStorage.getItem(CACHE_KEY_PREFIX + symbol);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheEntry;
        if (parsed.expiresAt > Date.now()) {
          // Restaurar em memória
          this.memoryCache.set(symbol, parsed);
          return parsed.candles;
        } else {
          // Expirado, remover
          localStorage.removeItem(CACHE_KEY_PREFIX + symbol);
        }
      }
    } catch (e) {
      console.error('Erro ao ler cache do localStorage:', e);
    }

    return null;
  }

  /**
   * Guardar candles no cache (memória + localStorage)
   */
  set(symbol: string, candles: Candle[]): void {
    const entry: CacheEntry = {
      symbol,
      candles,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };

    // Guardar em memória
    this.memoryCache.set(symbol, entry);

    // Guardar em localStorage (com limite de tamanho)
    try {
      const serialized = JSON.stringify(entry);
      // Verificar tamanho aproximado (localStorage tem limite de ~5-10MB)
      if (serialized.length < 5 * 1024 * 1024) {
        localStorage.setItem(CACHE_KEY_PREFIX + symbol, serialized);
      }
    } catch (e) {
      console.warn('Não foi possível guardar em localStorage (quota excedida):', e);
    }
  }

  /**
   * Limpar cache de um símbolo
   */
  clear(symbol: string): void {
    this.memoryCache.delete(symbol);
    try {
      localStorage.removeItem(CACHE_KEY_PREFIX + symbol);
    } catch (e) {
      console.error('Erro ao limpar cache:', e);
    }
  }

  /**
   * Limpar todo o cache
   */
  clearAll(): void {
    this.memoryCache.clear();
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Erro ao limpar todo o cache:', e);
    }
  }

  /**
   * Verificar se há dados em cache
   */
  has(symbol: string): boolean {
    return this.get(symbol) !== null;
  }

  /**
   * Obter informações do cache
   */
  getInfo(symbol: string): { cached: boolean; age: number } | null {
    const entry = this.memoryCache.get(symbol);
    if (entry && entry.expiresAt > Date.now()) {
      return {
        cached: true,
        age: Date.now() - entry.timestamp,
      };
    }
    return null;
  }
}

export const candleCache = new CandleCache();
