import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Bell, History, Settings, Zap, Menu, X, BarChart3 } from 'lucide-react';
import SignalCard from './SignalCard';
import TradeHistory from './TradeHistory';
import ParameterOptimizer from './ParameterOptimizer';
import AlertsPanel from './AlertsPanel';
import PerformanceDashboard from './PerformanceDashboard';
import InteractiveBacktest from './InteractiveBacktest';
import AdvancedCandleChart from './AdvancedCandleChart';
import TradingViewChart from './TradingViewChart';
import CompactTradingView from './CompactTradingView';
import AdvancedSignalsPanel from './AdvancedSignalsPanel';
import LiquidationHeatmap from './LiquidationHeatmap';
import LoadingProgress from './LoadingProgress';

import { BACKEND_URL } from '@/const';
import { getCoinbaseProCandlesExtended } from '@/lib/coinbaseProService';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('signal');
  const [trades, setTrades] = useState<any[]>([]);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  const symbols = [
    { label: 'BTC/USDT', value: 'BTCUSDT' },
    { label: 'ETH/USDT', value: 'ETHUSDT' },
    { label: 'SOL/USDT', value: 'SOLUSDT' },
  ];

  useEffect(() => {
    loadSignal();
    loadPrice();
    loadTrades();
    
    const priceInterval = setInterval(() => {
      loadPrice();
    }, 10000);

    const checkAlerts = () => {
      const stored = localStorage.getItem(`alerts_${activeSymbol}`);
      if (stored && price > 0) {
        const alerts = JSON.parse(stored);
        alerts.forEach((alert: any) => {
          if (alert.enabled) {
            if (alert.type === 'above' && price >= alert.price) {
              import('sonner').then(({ toast }) => {
                toast.success(`Alerta: ${activeSymbol} subiu acima de $${alert.price}!`, {
                  description: `Preço atual: $${price.toFixed(2)}`,
                });
              });
              alert.enabled = false;
            } else if (alert.type === 'below' && price <= alert.price) {
              import('sonner').then(({ toast }) => {
                toast.error(`Alerta: ${activeSymbol} caiu abaixo de $${alert.price}!`, {
                  description: `Preço atual: $${price.toFixed(2)}`,
                });
              });
              alert.enabled = false;
            }
          }
        });
        localStorage.setItem(`alerts_${activeSymbol}`, JSON.stringify(alerts));
      }
    };

    const alertInterval = setInterval(checkAlerts, 5000);

    const signalInterval = setInterval(() => {
      loadSignal();
    }, 30000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(signalInterval);
      clearInterval(alertInterval);
    };
  }, [activeSymbol]);

  const loadSignal = async () => {
    try {
      setLoading(true);
      setLoadProgress(0);
      const symbolMap: Record<string, string> = {
        'BTCUSDT': 'BTC/USDT',
        'ETHUSDT': 'ETH/USDT',
        'SOLUSDT': 'SOL/USDT',
      };
      const mappedSymbol = symbolMap[activeSymbol] || 'BTC/USDT';
      
      // 35040 candles = 2 anos em timeframe 30m
      const fetchPromise = getCoinbaseProCandlesExtended(mappedSymbol, '30m', 35040, (p) => setLoadProgress(p));
      const timeoutPromise = new Promise<any[]>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar dados históricos')), 60000)
      );

      const candlesData = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (candlesData && candlesData.length > 0) {
        setCandles(candlesData);
        try {
          const res = await fetch(`${BACKEND_URL}/api/signal?symbol=${activeSymbol}&interval=30m`);
          const data = await res.json();
          if (data.success) {
            setSignal(data.signal || null);
          }
        } catch (err) {
          console.error('Erro ao carregar sinal:', err);
        }
      } else {
        const res = await fetch(`${BACKEND_URL}/api/signal?symbol=${activeSymbol}&interval=30m`);
        const data = await res.json();
        if (data.success) {
          setSignal(data.signal || null);
          setCandles(data.candles || []);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar sinal:', err);
    } finally {
      setLoading(false);
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

  const loadTrades = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/backtest?symbol=${activeSymbol}`);
      const data = await res.json();
      if (data.success && data.trades) {
        setTrades(data.trades);
        setBacktestResult(data);
      }
    } catch (err) {
      console.error('Erro ao carregar trades:', err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
            <h1 className="text-2xl font-bold text-white">Crypto AI Agent</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-700">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-700">
              <BarChart3 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-700">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-70px)]">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } bg-slate-800 border-r border-slate-700 overflow-hidden transition-all duration-300 flex flex-col`}
        >
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-slate-400 text-xs mb-2">Preço Atual</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">${price.toFixed(2)}</p>
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
            </div>

            {/* Signal Card */}
            {signal && <SignalCard signal={signal} />}

            {/* Advanced Signals Panel */}
            <details className="bg-slate-700 rounded-lg p-3">
              <summary className="text-sm font-semibold text-white cursor-pointer hover:text-cyan-400">📊 Análise Avançada</summary>
              <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                <AdvancedSignalsPanel symbol={activeSymbol} candles={candles} />
              </div>
            </details>

            {/* Liquidation Heatmap */}
            <LiquidationHeatmap symbol={activeSymbol} candles={candles} />

            {/* Quick Stats */}
            <div className="bg-slate-700 p-4 rounded-lg space-y-2">
              <p className="text-slate-400 text-xs font-semibold mb-3 uppercase">Métricas</p>
              <div className="flex justify-between">
                <span className="text-slate-300 text-sm">RSI</span>
                <span className="text-white font-bold">{signal?.rsi || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300 text-sm">Trend 4H</span>
                <span className={`font-bold ${signal?.macroTrend === 'BULL' ? 'text-green-400' : 'text-red-400'}`}>
                  {signal?.macroTrend || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-900">
          <LoadingProgress 
            isLoading={loading} 
            message="Carregando 2 anos de dados do Coinbase Pro..." 
            externalProgress={loadProgress}
          />
          
          {/* Chart Area */}
          <div className="flex-1 overflow-hidden p-6">
            <AdvancedCandleChart symbol={activeSymbol} candles={candles} />
          </div>

          {/* Performance Dashboard */}
          {backtestResult && activeTab === 'performance' && (
            <div className="border-t border-slate-700 bg-slate-800 p-6 max-h-96 overflow-y-auto">
              <PerformanceDashboard
                backtestResult={backtestResult}
                loading={loading}
                onRunBacktest={loadTrades}
              />
            </div>
          )}

          {/* Bottom Tabs */}
          <div className="border-t border-slate-700 bg-slate-800 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-slate-700 border-slate-600">
                <TabsTrigger value="signal" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  <Zap className="w-4 h-4 mr-2" />
                  Sinal
                </TabsTrigger>
                <TabsTrigger value="history" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  <History className="w-4 h-4 mr-2" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  <Bell className="w-4 h-4 mr-2" />
                  Alertas
                </TabsTrigger>
                <TabsTrigger value="optimize" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  <Settings className="w-4 h-4 mr-2" />
                  Otimizar
                </TabsTrigger>
                <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Performance
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 max-h-80 overflow-y-auto">
                <TabsContent value="signal" className="space-y-4">
                  {signal ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-xs mb-1">Entrada</p>
                        <p className="text-white text-lg font-bold">${signal.price.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-xs mb-1">Stop Loss</p>
                        <p className="text-red-400 text-lg font-bold">${signal.sl.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-xs mb-1">Take Profit</p>
                        <p className="text-green-400 text-lg font-bold">${signal.tp.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-xs mb-1">Confiança</p>
                        <p className="text-blue-400 text-lg font-bold">{signal.conf}%</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">Nenhum sinal disponível</p>
                  )}
                </TabsContent>

                <TabsContent value="history">
                  <TradeHistory trades={trades} symbol={activeSymbol} />
                </TabsContent>

                <TabsContent value="alerts">
                  <AlertsPanel symbol={activeSymbol} />
                </TabsContent>

                <TabsContent value="optimize">
                  <InteractiveBacktest symbol={activeSymbol} onBacktestComplete={setBacktestResult} />
                </TabsContent>

                <TabsContent value="performance">
                  <p className="text-slate-400 text-center py-4">Ver painel completo acima</p>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
