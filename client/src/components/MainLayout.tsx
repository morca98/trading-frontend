import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Bell, Settings } from 'lucide-react';
import OptimizedCandleChart from './OptimizedCandleChart';
import LoadingProgress from './LoadingProgress';
import SignalCard from './SignalCard';
import AlertsPanel from './AlertsPanel';

import { BACKEND_URL } from '@/const';
import { getBybitCandlesExtended } from '@/lib/bybitService';
import { candleCache } from '@/lib/candleCache';

interface Signal {
  signal: string;
  conf: number;
  price: number;
  sl: number;
  tp: number;
  rsi: string;
  ema20: string;
  ema50: string;
  macroTrend: string;
  trend15m: string;
  pattern: string;
  atr: string;
  slPct: string;
  tpPct: string;
}

export default function MainLayout() {
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [signal, setSignal] = useState<Signal | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [price, setPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  const symbols = [
    { label: 'BTC/USDT', value: 'BTCUSDT' },
    { label: 'ETH/USDT', value: 'ETHUSDT' },
    { label: 'SOL/USDT', value: 'SOLUSDT' },
  ];

  // Carregar dados históricos quando muda o símbolo
  useEffect(() => {
    loadHistoricalData();
  }, [activeSymbol]);

  // Atualizar preço e sinal periodicamente
  useEffect(() => {
    loadPrice();
    loadSignal();

    const priceInterval = setInterval(loadPrice, 10000);
    const signalInterval = setInterval(loadSignal, 30000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(signalInterval);
    };
  }, [activeSymbol]);

  const loadHistoricalData = async () => {
    // Verificar cache
    const cachedCandles = candleCache.get(activeSymbol);
    if (cachedCandles && cachedCandles.length > 0) {
      console.log(`✓ Usando ${cachedCandles.length} candles do cache.`);
      setCandles([...cachedCandles]);
      return;
    }

    // Carregar do Coinbase
    try {
      setLoading(true);
      setLoadProgress(0);

      const candlesData = await getBybitCandlesExtended(
        activeSymbol,
        '1d',
        365,
        (p) => setLoadProgress(p)
      );

      if (candlesData && candlesData.length > 0) {
        console.log(`✓ Carregados ${candlesData.length} candles.`);
        setCandles([...candlesData]);
        candleCache.set(activeSymbol, candlesData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSignal = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/signal?symbol=${activeSymbol}&interval=1d`);
      const data = await res.json();
      if (data.success) {
        setSignal(data.signal || null);
      }
    } catch (err) {
      console.error('Erro ao carregar sinal:', err);
    }
  };

  const loadPrice = async () => {
    try {
      const symbolMap: Record<string, string> = {
        'BTCUSDT': 'BTC-USD',
        'ETHUSDT': 'ETH-USD',
        'SOLUSDT': 'SOL-USD',
      };
      const productId = symbolMap[activeSymbol] || 'BTC-USD';
      const res = await fetch(`https://api.exchange.coinbase.com/products/${productId}/ticker`);
      if (res.ok) {
        const data = await res.json();
        setPrice(parseFloat(data.price));
        const open24h = parseFloat(data.open_24h);
        setPriceChange(open24h > 0 ? ((parseFloat(data.price) - open24h) / open24h) * 100 : 0);
      }
    } catch (err) {
      console.error('Erro ao carregar preço:', err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAlerts(!showAlerts)}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-slate-700"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-700">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-70px)]">
        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto space-y-6">
          {/* Symbol Selector */}
          <div>
            <p className="text-slate-400 text-xs font-semibold mb-3 uppercase">Símbolos</p>
            <div className="space-y-2">
              {symbols.map((sym) => (
                <Button
                  key={sym.value}
                  onClick={() => setActiveSymbol(sym.value)}
                  variant={activeSymbol === sym.value ? 'default' : 'outline'}
                  className={`w-full justify-start ${
                    activeSymbol === sym.value
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sym.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Price Info */}
          <Card className="bg-slate-700 border-slate-600">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-xs mb-2">Preço Atual</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">${price.toFixed(2)}</p>
                  <p className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </p>
                </div>
                {priceChange >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Signal Card */}
          {signal && <SignalCard signal={signal} />}

          {/* Alerts */}
          {showAlerts && (
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-white font-semibold mb-3">Alertas</p>
              <AlertsPanel symbol={activeSymbol} />
            </div>
          )}

          {/* Info */}
          <div className="bg-slate-700 p-4 rounded-lg space-y-2 text-sm">
            <p className="text-slate-400 text-xs font-semibold mb-3 uppercase">Informações</p>
            <div className="flex justify-between">
              <span className="text-slate-300">RSI</span>
              <span className="text-white font-bold">{signal?.rsi || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Trend</span>
              <span className={`font-bold ${signal?.macroTrend === 'BULL' ? 'text-green-400' : 'text-red-400'}`}>
                {signal?.macroTrend || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Confiança</span>
              <span className="text-blue-400 font-bold">{signal?.conf || '-'}%</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-900 p-6">
          {loading && (
            <LoadingProgress
              isLoading={loading}
              message="Carregando dados..."
              externalProgress={loadProgress}
            />
          )}

          {/* Chart */}
          <div className="flex-1 overflow-hidden">
            <OptimizedCandleChart symbol={activeSymbol} candles={candles} />
          </div>
        </div>
      </div>
    </div>
  );
}
