import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, Bell, History, Settings, Zap, Menu, X } from 'lucide-react';
import SignalCard from './SignalCard';
import TradeHistory from './TradeHistory';
import ParameterOptimizer from './ParameterOptimizer';
import AlertsPanel from './AlertsPanel';

const BACKEND_URL = 'https://trading-backend-production-5dd4.up.railway.app';

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

    const signalInterval = setInterval(() => {
      loadSignal();
    }, 30000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(signalInterval);
    };
  }, [activeSymbol]);

  const loadSignal = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/signal?symbol=${activeSymbol}&interval=30m`);
      const data = await res.json();
      if (data.success && data.signal) {
        setSignal(data.signal);
        setCandles(data.candles || []);
      }
    } catch (err) {
      console.error('Erro ao carregar sinal:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrice = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/price?symbol=${activeSymbol}`);
      const data = await res.json();
      if (data.success) {
        setPrice(data.price);
        setPriceChange(data.change);
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
      }
    } catch (err) {
      console.error('Erro ao carregar trades:', err);
    }
  };

  const chartData = candles.map((c: any) => ({
    time: new Date(c.time).toLocaleTimeString(),
    close: c.close,
    volume: c.volume,
    high: c.high,
    low: c.low,
  }));

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
              <div className="flex justify-between">
                <span className="text-slate-300 text-sm">ATR</span>
                <span className="text-white font-bold">${signal?.atr || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Chart Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <Card className="bg-slate-800 border-slate-700 h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Gráfico de Preço (30M)</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                        formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
                      />
                      <Area type="monotone" dataKey="close" stroke="#3b82f6" fillOpacity={1} fill="url(#colorClose)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400">A carregar gráfico...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Tabs */}
          <div className="border-t border-slate-700 bg-slate-800 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-700 border-slate-600">
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
                  <ParameterOptimizer symbol={activeSymbol} onOptimize={loadSignal} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
