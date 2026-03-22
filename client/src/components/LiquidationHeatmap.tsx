import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Candle } from '@/lib/candleAggregator';

interface LiquidationHeatmapProps {
  symbol: string;
  candles: Candle[];
}

interface LiquidationZone {
  price: number;
  longLiquidations: number;
  shortLiquidations: number;
  totalLiquidations: number;
  ratio: number; // long/short ratio
}

export default function LiquidationHeatmap({ symbol, candles }: LiquidationHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [liquidationZones, setLiquidationZones] = useState<LiquidationZone[]>([]);

  useEffect(() => {
    if (candles.length === 0) return;

    // Calcular níveis de liquidação baseado em volatilidade e volume
    const prices = candles.map((c) => [c.high, c.low]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const levels = 50; // Número de níveis de preço
    const levelSize = priceRange / levels;

    // Calcular ATR para volatilidade
    const atr = calculateATR(candles);
    const lastATR = atr[atr.length - 1];
    const lastCandle = candles[candles.length - 1];

    // Calcular volume médio
    const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;

    // Calcular rácio long/short baseado em momentum
    let bullishVolume = 0;
    let bearishVolume = 0;
    candles.slice(-20).forEach((candle) => {
      if (candle.close > candle.open) {
        bullishVolume += candle.volume;
      } else {
        bearishVolume += candle.volume;
      }
    });

    const bullishRatio = bullishVolume / (bullishVolume + bearishVolume);

    // Criar zonas de liquidação
    const zones: LiquidationZone[] = [];

    for (let i = 0; i < levels; i++) {
      const levelPrice = minPrice + i * levelSize;
      const distanceFromPrice = Math.abs(levelPrice - lastCandle.close);
      const distanceRatio = distanceFromPrice / lastATR;

      // Liquidações são mais concentradas perto do preço e em níveis redondos
      let liquidationIntensity = Math.max(0, 1 - distanceRatio / 3);

      // Aumentar intensidade em níveis redondos
      const roundLevel = Math.round(levelPrice / 100) * 100;
      if (Math.abs(levelPrice - roundLevel) < levelSize) {
        liquidationIntensity *= 1.5;
      }

      // Calcular long e short liquidações
      let longLiquidations = avgVolume * liquidationIntensity * (0.5 + bullishRatio * 0.5);
      let shortLiquidations = avgVolume * liquidationIntensity * (0.5 + (1 - bullishRatio) * 0.5);

      // Adicionar mais liquidações acima do preço (para longs)
      if (levelPrice > lastCandle.close) {
        longLiquidations *= 1.2;
      }

      // Adicionar mais liquidações abaixo do preço (para shorts)
      if (levelPrice < lastCandle.close) {
        shortLiquidations *= 1.2;
      }

      zones.push({
        price: levelPrice,
        longLiquidations,
        shortLiquidations,
        totalLiquidations: longLiquidations + shortLiquidations,
        ratio: longLiquidations / (shortLiquidations + 0.0001),
      });
    }

    setLiquidationZones(zones);
  }, [candles]);

  // Desenhar heatmap
  useEffect(() => {
    if (!canvasRef.current || liquidationZones.length === 0) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const maxLiquidation = Math.max(...liquidationZones.map((z) => z.totalLiquidations));
    const minPrice = liquidationZones[0].price;
    const maxPrice = liquidationZones[liquidationZones.length - 1].price;

    liquidationZones.forEach((zone, idx) => {
      const x = (idx / liquidationZones.length) * canvas.width;
      const width = canvas.width / liquidationZones.length;

      // Normalizar intensidade
      const intensity = zone.totalLiquidations / maxLiquidation;

      // Cor baseada em long/short ratio
      let color: string;
      if (zone.ratio > 1.5) {
        // Muito mais longs (verde)
        color = `rgba(16, 185, 129, ${intensity * 0.8})`;
      } else if (zone.ratio < 0.67) {
        // Muito mais shorts (vermelho)
        color = `rgba(239, 68, 68, ${intensity * 0.8})`;
      } else {
        // Equilibrado (amarelo/laranja)
        color = `rgba(245, 158, 11, ${intensity * 0.6})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, 0, width, canvas.height);

      // Desenhar linha de preço atual
      if (zone.price === liquidationZones[Math.floor(liquidationZones.length / 2)].price) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
    });

    // Grid horizontal
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Legenda
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Longs (Verde) | Equilibrado (Amarelo) | Shorts (Vermelho)', 5, canvas.height - 5);
  }, [liquidationZones]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Liquidation Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: '300px' }}
        />
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-slate-400">Longs</p>
            <p className="text-green-400 font-bold">
              {liquidationZones.reduce((sum, z) => sum + z.longLiquidations, 0).toFixed(0)}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-slate-400">Shorts</p>
            <p className="text-red-400 font-bold">
              {liquidationZones.reduce((sum, z) => sum + z.shortLiquidations, 0).toFixed(0)}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-slate-400">Ratio L/S</p>
            <p className="text-cyan-400 font-bold">
              {(liquidationZones.reduce((sum, z) => sum + z.longLiquidations, 0) /
                (liquidationZones.reduce((sum, z) => sum + z.shortLiquidations, 0) + 0.0001)).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateATR(candles: any[], period: number = 14): number[] {
  const atr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      atr.push(candles[i].high - candles[i].low);
      continue;
    }

    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );

    if (i < period) {
      atr.push(tr);
    } else {
      const prevATR = atr[i - 1];
      const newATR = (prevATR * (period - 1) + tr) / period;
      atr.push(newATR);
    }
  }

  return atr;
}
