import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Zap, Target, Shield } from 'lucide-react';

interface AnalysisProps {
  signal: any;
  candles: any[];
  price: number;
}

export default function AdvancedAnalysis({ signal, candles, price }: AnalysisProps) {
  const [rsiData, setRsiData] = useState<any[]>([]);
  const [macdData, setMacdData] = useState<any[]>([]);
  const [volumeProfile, setVolumeProfile] = useState<any[]>([]);

  useEffect(() => {
    if (candles.length > 0) {
      calculateRSI();
      calculateMACD();
      calculateVolumeProfile();
    }
  }, [candles]);

  const calculateRSI = () => {
    const closes = candles.map((c: any) => c.close);
    const rsiValues = [];
    const period = 14;

    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        rsiValues.push({ time: new Date(candles[i].time).toLocaleTimeString(), rsi: 50 });
      } else {
        let gains = 0, losses = 0;
        for (let j = i - period; j < i; j++) {
          const diff = closes[j + 1] - closes[j];
          if (diff > 0) gains += diff;
          else losses -= diff;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / (avgLoss || 1);
        const rsi = 100 - (100 / (1 + rs));
        rsiValues.push({ time: new Date(candles[i].time).toLocaleTimeString(), rsi });
      }
    }
    setRsiData(rsiValues.slice(-30));
  };

  const calculateMACD = () => {
    const closes = candles.map((c: any) => c.close);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signal = calculateEMA(macdLine, 9);

    const macdData = macdLine.map((v, i) => ({
      time: new Date(candles[i].time).toLocaleTimeString(),
      macd: v,
      signal: signal[i],
      histogram: v - signal[i],
    }));

    setMacdData(macdData.slice(-30));
  };

  const calculateEMA = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  };

  const calculateVolumeProfile = () => {
    const priceRanges: { [key: string]: number } = {};
    candles.forEach((c: any) => {
      const priceLevel = Math.round(c.close / 100) * 100;
      priceRanges[priceLevel] = (priceRanges[priceLevel] || 0) + c.volume;
    });

    const vpData = Object.entries(priceRanges)
      .map(([price, volume]) => ({
        price: parseFloat(price),
        volume,
      }))
      .sort((a, b) => a.price - b.price)
      .slice(-20);

    setVolumeProfile(vpData);
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi > 70) return { label: 'Sobrecomprado', color: 'bg-red-500' };
    if (rsi < 30) return { label: 'Sobrevendido', color: 'bg-green-500' };
    return { label: 'Neutro', color: 'bg-yellow-500' };
  };

  const rsiValue = signal?.rsi ? parseFloat(signal.rsi) : 50;
  const rsiStatus = getRSIStatus(rsiValue);

  return (
    <div className="space-y-4">
      {/* Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">RSI(14)</p>
              <p className={`text-2xl font-bold ${rsiValue > 70 ? 'text-red-400' : rsiValue < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                {rsiValue.toFixed(1)}
              </p>
              <Badge className={`mt-2 ${rsiStatus.color}`}>{rsiStatus.label}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">EMA 20</p>
              <p className="text-white text-lg font-bold">${signal?.ema20}</p>
              <p className={`text-xs mt-1 ${price > parseFloat(signal?.ema20) ? 'text-green-400' : 'text-red-400'}`}>
                {price > parseFloat(signal?.ema20) ? '↑ Acima' : '↓ Abaixo'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">EMA 50</p>
              <p className="text-white text-lg font-bold">${signal?.ema50}</p>
              <p className={`text-xs mt-1 ${price > parseFloat(signal?.ema50) ? 'text-green-400' : 'text-red-400'}`}>
                {price > parseFloat(signal?.ema50) ? '↑ Acima' : '↓ Abaixo'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">ATR</p>
              <p className="text-white text-lg font-bold">${signal?.atr}</p>
              <p className="text-xs text-slate-400 mt-1">Volatilidade</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RSI Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            RSI (14)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rsiData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={rsiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="rsi" fill="#f59e0b" fillOpacity={0.1} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-8">A carregar RSI...</p>
          )}
        </CardContent>
      </Card>

      {/* MACD Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            MACD
          </CardTitle>
        </CardHeader>
        <CardContent>
          {macdData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={macdData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Bar dataKey="histogram" fill="#8b5cf6" opacity={0.3} />
                <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-8">A carregar MACD...</p>
          )}
        </CardContent>
      </Card>

      {/* Volume Profile */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Volume Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {volumeProfile.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volumeProfile} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="price" type="category" stroke="#94a3b8" width={60} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Bar dataKey="volume" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-8">A carregar Volume Profile...</p>
          )}
        </CardContent>
      </Card>

      {/* Análise de Risco */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Gestão de Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300 text-sm">Risco por Trade</span>
            <span className="text-white font-bold">{signal?.slPct}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300 text-sm">Alvo (R:R 1:2.5)</span>
            <span className="text-green-400 font-bold">{signal?.tpPct}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300 text-sm">Distância ao SL</span>
            <span className="text-red-400 font-bold">${Math.abs(price - signal?.sl).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300 text-sm">Distância ao TP</span>
            <span className="text-green-400 font-bold">${Math.abs(signal?.tp - price).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
