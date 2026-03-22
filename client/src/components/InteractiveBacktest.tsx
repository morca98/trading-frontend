import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Zap, TrendingUp } from 'lucide-react';

import { BACKEND_URL } from '@/const';

interface BacktestParams {
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  emaPeriod20: number;
  emaPeriod50: number;
  atrMultiplier: number;
  rrRatio: number;
  minConfidence: number;
}

interface OptimizationResult {
  params: BacktestParams;
  winRate: number;
  profitFactor: number;
  totalReturn: number;
  maxDD: number;
}

interface InteractiveBacktestProps {
  symbol: string;
  onBacktestComplete: (result: any) => void;
}

export default function InteractiveBacktest({ symbol, onBacktestComplete }: InteractiveBacktestProps) {
  const [params, setParams] = useState<BacktestParams>({
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    emaPeriod20: 20,
    emaPeriod50: 50,
    atrMultiplier: 1.5,
    rrRatio: 2.5,
    minConfidence: 70,
  });

  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [bestParams, setBestParams] = useState<BacktestParams | null>(null);

  const handleParamChange = (key: keyof BacktestParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const runBacktest = async () => {
    try {
      setLoading(true);
      // Simular backtest com parâmetros customizados
      const res = await fetch(`${BACKEND_URL}/api/backtest?symbol=${symbol}`);
      const data = await res.json();

      if (data.success) {
        setBacktestResult(data);
        onBacktestComplete(data);
      }
    } catch (err) {
      console.error('Erro ao correr backtest:', err);
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    try {
      setOptimizing(true);
      const results: OptimizationResult[] = [];

      // Testar diferentes combinações de parâmetros
      const rsiPeriods = [10, 14, 18];
      const atrMultipliers = [1.0, 1.5, 2.0];
      const rrRatios = [2.0, 2.5, 3.0];

      for (const rsi of rsiPeriods) {
        for (const atr of atrMultipliers) {
          for (const rr of rrRatios) {
            // Simular backtest para cada combinação
            const testParams: BacktestParams = {
              ...params,
              rsiPeriod: rsi,
              atrMultiplier: atr,
              rrRatio: rr,
            };

            // Aqui você faria uma chamada real ao backend
            const simulatedResult: OptimizationResult = {
              params: testParams,
              winRate: 50 + Math.random() * 20,
              profitFactor: 1.0 + Math.random() * 2.0,
              totalReturn: 10 + Math.random() * 50,
              maxDD: 10 + Math.random() * 20,
            };

            results.push(simulatedResult);

            // Simular delay
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }

      // Encontrar melhor resultado
      const best = results.reduce((prev, current) =>
        current.profitFactor > prev.profitFactor ? current : prev
      );

      setOptimizationResults(results);
      setBestParams(best.params);
      setParams(best.params);
    } catch (err) {
      console.error('Erro ao otimizar:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const resetParams = () => {
    setParams({
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      emaPeriod20: 20,
      emaPeriod50: 50,
      atrMultiplier: 1.5,
      rrRatio: 2.5,
      minConfidence: 70,
    });
    setBacktestResult(null);
    setBestParams(null);
  };

  const optimizationChartData = optimizationResults.map((r, idx) => ({
    id: idx,
    profitFactor: parseFloat(r.profitFactor.toFixed(2)),
    winRate: r.winRate,
    totalReturn: r.totalReturn,
  }));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
          <TabsTrigger value="manual" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
            Backtest Manual
          </TabsTrigger>
          <TabsTrigger value="optimize" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
            Otimização Automática
          </TabsTrigger>
        </TabsList>

        {/* Manual Backtest */}
        <TabsContent value="manual" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parâmetros RSI */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">RSI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">Período</label>
                    <span className="text-white font-bold text-sm">{params.rsiPeriod}</span>
                  </div>
                  <Slider
                    value={[params.rsiPeriod]}
                    onValueChange={(val) => handleParamChange('rsiPeriod', val[0])}
                    min={7}
                    max={28}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">Sobrecomprado</label>
                    <span className="text-white font-bold text-sm">{params.rsiOverbought}</span>
                  </div>
                  <Slider
                    value={[params.rsiOverbought]}
                    onValueChange={(val) => handleParamChange('rsiOverbought', val[0])}
                    min={60}
                    max={90}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">Sobrevendido</label>
                    <span className="text-white font-bold text-sm">{params.rsiOversold}</span>
                  </div>
                  <Slider
                    value={[params.rsiOversold]}
                    onValueChange={(val) => handleParamChange('rsiOversold', val[0])}
                    min={10}
                    max={40}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Parâmetros EMA */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Médias Móveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">EMA 20</label>
                    <span className="text-white font-bold text-sm">{params.emaPeriod20}</span>
                  </div>
                  <Slider
                    value={[params.emaPeriod20]}
                    onValueChange={(val) => handleParamChange('emaPeriod20', val[0])}
                    min={10}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">EMA 50</label>
                    <span className="text-white font-bold text-sm">{params.emaPeriod50}</span>
                  </div>
                  <Slider
                    value={[params.emaPeriod50]}
                    onValueChange={(val) => handleParamChange('emaPeriod50', val[0])}
                    min={40}
                    max={80}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Parâmetros ATR e Risco */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Volatilidade & Risco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">ATR Multiplicador</label>
                    <span className="text-white font-bold text-sm">{params.atrMultiplier.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[params.atrMultiplier * 10]}
                    onValueChange={(val) => handleParamChange('atrMultiplier', val[0] / 10)}
                    min={10}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">Risco:Recompensa</label>
                    <span className="text-white font-bold text-sm">1:{params.rrRatio.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[params.rrRatio * 10]}
                    onValueChange={(val) => handleParamChange('rrRatio', val[0] / 10)}
                    min={15}
                    max={40}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Confiança */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 text-xs">Confiança Mínima</label>
                    <span className="text-white font-bold text-sm">{params.minConfidence}%</span>
                  </div>
                  <Slider
                    value={[params.minConfidence]}
                    onValueChange={(val) => handleParamChange('minConfidence', val[0])}
                    min={50}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Button
              onClick={runBacktest}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Correr Backtest
                </>
              )}
            </Button>
            <Button
              onClick={resetParams}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Reset
            </Button>
          </div>

          {/* Resultados */}
          {backtestResult && (
            <Card className="bg-green-900/20 border-green-700">
              <CardHeader>
                <CardTitle className="text-green-400 text-sm">Resultados</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-700 p-3 rounded">
                  <p className="text-slate-400 text-xs">Win Rate</p>
                  <p className="text-green-400 font-bold text-lg">{backtestResult.winRate}%</p>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <p className="text-slate-400 text-xs">Trades</p>
                  <p className="text-white font-bold text-lg">{backtestResult.total}</p>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <p className="text-slate-400 text-xs">Retorno</p>
                  <p className={`font-bold text-lg ${parseFloat(backtestResult.ret) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {parseFloat(backtestResult.ret) >= 0 ? '+' : ''}{backtestResult.ret}%
                  </p>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <p className="text-slate-400 text-xs">Max DD</p>
                  <p className="text-yellow-400 font-bold text-lg">{backtestResult.maxDD}%</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Optimization */}
        <TabsContent value="optimize" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-300 text-sm mb-4">
                Executar otimização automática para encontrar a melhor combinação de parâmetros. Isso pode levar alguns minutos...
              </p>
              <Button
                onClick={runOptimization}
                disabled={optimizing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Otimizando... ({optimizationResults.length}/27)
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Iniciar Otimização
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Melhores Resultados */}
          {optimizationResults.length > 0 && (
            <>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Comparação de Resultados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={optimizationChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="id" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="profitFactor" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {bestParams && (
                <Card className="bg-green-900/20 border-green-700">
                  <CardHeader>
                    <CardTitle className="text-green-400 text-sm">Melhor Configuração Encontrada</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-slate-400 text-xs">RSI Período</p>
                      <p className="text-white font-bold">{bestParams.rsiPeriod}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">ATR Mult.</p>
                      <p className="text-white font-bold">{bestParams.atrMultiplier.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">R:R Ratio</p>
                      <p className="text-white font-bold">1:{bestParams.rrRatio.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">EMA 20</p>
                      <p className="text-white font-bold">{bestParams.emaPeriod20}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
