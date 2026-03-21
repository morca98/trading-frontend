import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, Zap } from 'lucide-react';
import {
  calculateVolumeProfile,
  detectSupportResistance,
  calculateLiquidationLevels,
  generateAdvancedSignal,
  identifyConfluence,
} from '@/lib/advancedAnalysis';
import { aggregateCandles, calculateATR, Candle } from '@/lib/candleAggregator';

interface AdvancedSignalsPanelProps {
  symbol: string;
  candles: Candle[];
}

export default function AdvancedSignalsPanel({ symbol, candles }: AdvancedSignalsPanelProps) {
  const [signal, setSignal] = useState<any>(null);
  const [volumeProfile, setVolumeProfile] = useState<any>(null);
  const [supportResistance, setSupportResistance] = useState<any[]>([]);
  const [liquidationLevels, setLiquidationLevels] = useState<any[]>([]);
  const [confluenceZones, setConfluenceZones] = useState<any[]>([]);

  useEffect(() => {
    if (candles.length < 50) return;

    // Agregar candles
    const aggregated = aggregateCandles(candles, '30m');
    if (aggregated.length === 0) return;

    // Calcular Volume Profile
    const vp = calculateVolumeProfile(aggregated, 40);
    setVolumeProfile(vp);

    // Detectar Suportes e Resistências
    const sr = detectSupportResistance(aggregated, 20);
    setSupportResistance(sr.slice(0, 5)); // Top 5

    // Calcular ATR
    const atr = calculateATR(aggregated, 14);

    // Calcular Níveis de Liquidação
    const liq = calculateLiquidationLevels(aggregated, atr);
    setLiquidationLevels(liq.slice(0, 6)); // Top 6

    // Gerar sinal avançado
    const sig = generateAdvancedSignal(aggregated, vp, sr, liq, atr);
    setSignal(sig);

    // Identificar confluência
    const confluence = identifyConfluence(vp, sr, liq, aggregated[aggregated.length - 1].close);
    setConfluenceZones(confluence.slice(0, 5)); // Top 5
  }, [candles]);

  if (!signal || !volumeProfile) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <p className="text-slate-400 text-sm">A carregar análise...</p>
        </CardContent>
      </Card>
    );
  }

  const signalColor = signal.type === 'BUY' ? 'text-green-400' : signal.type === 'SELL' ? 'text-red-400' : 'text-yellow-400';
  const signalBg = signal.type === 'BUY' ? 'bg-green-900/20' : signal.type === 'SELL' ? 'bg-red-900/20' : 'bg-yellow-900/20';

  return (
    <div className="space-y-4">
      {/* Sinal Principal */}
      <Card className={`border-slate-700 ${signalBg}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              {signal.type === 'BUY' && <TrendingUp className="w-5 h-5 text-green-400" />}
              {signal.type === 'SELL' && <TrendingDown className="w-5 h-5 text-red-400" />}
              {signal.type === 'NEUTRAL' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
              Sinal: {signal.type}
            </CardTitle>
            <div className="text-right">
              <div className={`text-2xl font-bold ${signalColor}`}>{signal.confidence}%</div>
              <p className="text-xs text-slate-400">Confiança</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Razões */}
          <div>
            <p className="text-xs text-slate-400 font-semibold mb-2">Razões:</p>
            <div className="space-y-1">
              {signal.reasons.map((reason: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <Zap className="w-3 h-3 text-cyan-400 mt-1 flex-shrink-0" />
                  <p className="text-xs text-slate-300">{reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alvo e SL */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700">
            <div>
              <p className="text-xs text-slate-400">Entrada</p>
              <p className="text-sm font-bold text-white">${candles[candles.length - 1].close.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Alvo</p>
              <p className="text-sm font-bold text-green-400">${signal.targetPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Stop Loss</p>
              <p className="text-sm font-bold text-red-400">${signal.stopLoss.toFixed(2)}</p>
            </div>
          </div>

          {/* Risk/Reward */}
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-xs text-slate-400">Risk/Reward Ratio</p>
            <p className="text-lg font-bold text-cyan-400">1:{signal.riskReward.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Volume Profile */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Volume Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900/50 rounded p-2">
              <p className="text-xs text-slate-400">POC</p>
              <p className="text-sm font-bold text-cyan-400">${volumeProfile.poc.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <p className="text-xs text-slate-400">VAH</p>
              <p className="text-sm font-bold text-green-400">${volumeProfile.vah.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <p className="text-xs text-slate-400">VAL</p>
              <p className="text-sm font-bold text-red-400">${volumeProfile.val.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suportes e Resistências */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Suportes & Resistências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {supportResistance.map((sr, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded p-2">
              <div className="flex items-center gap-2">
                {sr.type === 'support' ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <div>
                  <p className="text-xs text-slate-400 capitalize">{sr.type}</p>
                  <p className="text-sm font-bold text-white">${sr.level.toFixed(2)}</p>
                </div>
              </div>
              <Badge className="bg-slate-700 text-slate-200">Força: {sr.strength}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Níveis de Liquidação */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Níveis de Liquidação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {liquidationLevels.map((liq, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded p-2">
              <div className="flex items-center gap-2">
                {liq.type === 'long' ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase">{liq.type}</p>
                  <p className="text-sm font-bold text-white">${liq.level.toFixed(2)}</p>
                </div>
              </div>
              <Badge className={liq.type === 'long' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}>
                {liq.strength}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Confluência */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Zonas de Confluência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {confluenceZones.map((zone, idx) => (
            <div key={idx} className="bg-slate-900/50 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-cyan-400">${zone.level.toFixed(2)}</p>
                <Badge className="bg-purple-900/50 text-purple-200">Score: {zone.confluenceScore}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {zone.sources.map((source: string, sidx: number) => (
                  <Badge key={sidx} variant="outline" className="text-xs">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
