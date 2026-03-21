import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Loader2, Play } from 'lucide-react';

interface ParameterOptimizerProps {
  symbol: string;
  onOptimize: () => void;
}

export default function ParameterOptimizer({ symbol, onOptimize }: ParameterOptimizerProps) {
  const [params, setParams] = useState({
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    emaPeriod20: 20,
    emaPeriod50: 50,
    atrPeriod: 14,
    atrMultiplier: 1.5,
    rrRatio: 2.5,
    minConfidence: 70,
  });

  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleParamChange = (key: string, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      // Simular otimização
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Aqui você faria uma chamada real ao backend com os parâmetros
      setResults({
        winRate: 58,
        totalTrades: 42,
        profitFactor: 1.8,
        maxDD: 12.5,
        avgWin: 2.1,
        avgLoss: 1.2,
      });

      onOptimize();
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
      atrPeriod: 14,
      atrMultiplier: 1.5,
      rrRatio: 2.5,
      minConfidence: 70,
    });
    setResults(null);
  };

  return (
    <div className="space-y-4">
      {/* Parâmetros RSI */}
      <Card className="bg-slate-700 border-slate-600">
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
      <Card className="bg-slate-700 border-slate-600">
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
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Volatilidade & Risco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-slate-400 text-xs">ATR Período</label>
              <span className="text-white font-bold text-sm">{params.atrPeriod}</span>
            </div>
            <Slider
              value={[params.atrPeriod]}
              onValueChange={(val) => handleParamChange('atrPeriod', val[0])}
              min={7}
              max={21}
              step={1}
              className="w-full"
            />
          </div>
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

      {/* Confiança Mínima */}
      <Card className="bg-slate-700 border-slate-600">
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

      {/* Resultados */}
      {results && (
        <Card className="bg-green-900/20 border-green-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 text-sm">Resultados da Otimização</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <div className="bg-slate-700 p-2 rounded">
              <p className="text-slate-400 text-xs">Win Rate</p>
              <p className="text-green-400 font-bold">{results.winRate}%</p>
            </div>
            <div className="bg-slate-700 p-2 rounded">
              <p className="text-slate-400 text-xs">Trades</p>
              <p className="text-white font-bold">{results.totalTrades}</p>
            </div>
            <div className="bg-slate-700 p-2 rounded">
              <p className="text-slate-400 text-xs">Profit Factor</p>
              <p className="text-blue-400 font-bold">{results.profitFactor.toFixed(2)}</p>
            </div>
            <div className="bg-slate-700 p-2 rounded">
              <p className="text-slate-400 text-xs">Max DD</p>
              <p className="text-yellow-400 font-bold">{results.maxDD.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          onClick={runOptimization}
          disabled={optimizing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {optimizing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Otimizando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
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
    </div>
  );
}
