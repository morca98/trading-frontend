import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

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
}

interface BacktestResult {
  success: boolean;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  capital: string;
  maxDD: string;
  ret: string;
  trades: any[];
}

export default function TradingDashboard() {
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [signal, setSignal] = useState<Signal | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);

  const symbols = [
    { label: 'BTC/USDT', value: 'BTCUSDT' },
    { label: 'ETH/USDT', value: 'ETHUSDT' },
    { label: 'SOL/USDT', value: 'SOLUSDT' },
  ];

  useEffect(() => {
    loadSignal();
    loadPrice();
    const interval = setInterval(() => {
      loadPrice();
    }, 10000);
    return () => clearInterval(interval);
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

  const runBacktest = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/backtest?symbol=${activeSymbol}`);
      const data = await res.json();
      if (data.success) {
        setBacktestResult(data);
      }
    } catch (err) {
      console.error('Erro ao correr backtest:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = candles.map((c: any) => ({
    time: new Date(c.time).toLocaleTimeString(),
    close: c.close,
    volume: c.volume,
  }));

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Crypto AI Agent</h1>
          <p className="text-slate-400">Dashboard de Trading em Tempo Real</p>
        </div>

        {/* Symbol Selector */}
        <div className="flex gap-3 mb-6">
          {symbols.map((sym) => (
            <Button
              key={sym.value}
              onClick={() => setActiveSymbol(sym.value)}
              variant={activeSymbol === sym.value ? 'default' : 'outline'}
              className={activeSymbol === sym.value ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
            >
              {sym.label}
            </Button>
          ))}
        </div>

        {/* Price Card */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">Preço Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-white">${price.toFixed(2)}</p>
                <p className={`text-lg font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </p>
              </div>
              {priceChange >= 0 ? (
                <TrendingUp className="w-12 h-12 text-green-400" />
              ) : (
                <TrendingDown className="w-12 h-12 text-red-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="signal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="signal" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
              Sinal
            </TabsTrigger>
            <TabsTrigger value="chart" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="backtest" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
              Backtest
            </TabsTrigger>
          </TabsList>

          {/* Signal Tab */}
          <TabsContent value="signal" className="space-y-4">
            {signal ? (
              <>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      {signal.signal === 'BUY' ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                          <span className="text-green-400">COMPRA</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-6 h-6 text-red-400" />
                          <span className="text-red-400">VENDA</span>
                        </>
                      )}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Confiança: <span className="text-white font-bold">{signal.conf}%</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Entrada</p>
                        <p className="text-white text-xl font-bold">${signal.price.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Stop Loss</p>
                        <p className="text-red-400 text-xl font-bold">${signal.sl.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Take Profit</p>
                        <p className="text-green-400 text-xl font-bold">${signal.tp.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">R:R</p>
                        <p className="text-blue-400 text-xl font-bold">1:2.5</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-700">
                      <div>
                        <p className="text-slate-400 text-xs">RSI</p>
                        <p className="text-white font-bold">{signal.rsi}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Macro Trend</p>
                        <p className={`font-bold ${signal.macroTrend === 'BULL' ? 'text-green-400' : signal.macroTrend === 'BEAR' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {signal.macroTrend}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Padrão</p>
                        <p className="text-white font-bold text-sm">{signal.pattern}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6">
                  <p className="text-slate-400 text-center">
                    {loading ? 'A carregar sinal...' : 'Nenhum sinal disponível'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Chart Tab */}
          <TabsContent value="chart" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Gráfico de Preço (30M)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="time" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Area type="monotone" dataKey="close" stroke="#3b82f6" fillOpacity={1} fill="url(#colorClose)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-center py-8">A carregar gráfico...</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Volume</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="time" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="volume" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-center py-8">A carregar volume...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backtest Tab */}
          <TabsContent value="backtest" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Backtest da Estratégia</CardTitle>
                <CardDescription className="text-slate-400">Últimos 30 dias (30M)</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={runBacktest}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-6"
                >
                  {loading ? 'A processar...' : 'Correr Backtest'}
                </Button>

                {backtestResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Win Rate</p>
                        <p className={`text-2xl font-bold ${backtestResult.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {backtestResult.winRate}%
                        </p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Retorno</p>
                        <p className={`text-2xl font-bold ${parseFloat(backtestResult.ret) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(backtestResult.ret) >= 0 ? '+' : ''}{backtestResult.ret}%
                        </p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Trades</p>
                        <p className="text-white text-2xl font-bold">{backtestResult.total}</p>
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Max DD</p>
                        <p className="text-yellow-400 text-2xl font-bold">{backtestResult.maxDD}%</p>
                      </div>
                    </div>

                    <div className="bg-slate-700 p-4 rounded-lg">
                      <p className="text-slate-400 text-sm mb-2">Capital</p>
                      <p className="text-white text-xl font-bold">
                        $1000 → ${backtestResult.capital}
                      </p>
                    </div>

                    {backtestResult.trades && backtestResult.trades.length > 0 && (
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm mb-3">Últimos Trades</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {backtestResult.trades.slice(-10).reverse().map((trade, i) => (
                            <div key={i} className="flex justify-between text-xs border-b border-slate-600 pb-2">
                              <span className={trade.outcome === 'WIN' ? 'text-green-400' : 'text-red-400'}>
                                {trade.signal} {trade.outcome}
                              </span>
                              <span className="text-slate-300">{trade.pnl}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
