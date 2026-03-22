import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import {
  aggregateCandles,
  Candle,
  Timeframe,
} from '@/lib/candleAggregator';

interface AdvancedCandleChartProps {
  symbol: string;
  candles: Candle[];
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

export default function AdvancedCandleChart({ symbol, candles }: AdvancedCandleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('30m');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const candleWidth = 8 * zoomLevel;
  const candleSpacing = 2 * zoomLevel;
  const chartPadding = 60;

  // Agregar candles baseado no timeframe
  const aggregatedCandles = React.useMemo(() => aggregateCandles(candles, timeframe), [candles, timeframe]);

  useEffect(() => {
    // Pequeno delay para garantir que o canvas está pronto e as dimensões estão corretas
    const timer = setTimeout(() => {
      drawMainChart();
    }, 50);
    return () => clearTimeout(timer);
  }, [aggregatedCandles, zoomLevel, scrollOffset, hoveredCandle]);

  const drawMainChart = () => {
    if (!canvasRef.current || aggregatedCandles.length === 0) {
      console.log('Não há dados para desenhar ou canvas não disponível');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const availableWidth = canvas.width - chartPadding * 2;
    const visibleCount = Math.max(10, Math.floor(availableWidth / (candleWidth + candleSpacing)));
    
    // Ajustar scrollOffset para não ultrapassar os limites
    const maxScroll = Math.max(0, aggregatedCandles.length - visibleCount);
    const safeScroll = Math.max(-maxScroll, Math.min(0, scrollOffset));

    const startIdx = Math.max(0, aggregatedCandles.length - visibleCount + safeScroll);
    const endIdx = Math.min(aggregatedCandles.length, startIdx + visibleCount);
    
    const visibleCandles = aggregatedCandles.slice(startIdx, endIdx);
    
    if (visibleCandles.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Sem dados visíveis no momento', canvas.width / 2, canvas.height / 2);
      return;
    }

    const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    const chartHeight = canvas.height - chartPadding * 2;

    const priceToY = (price: number) => {
      return (
        canvas.height -
        chartPadding -
        ((price - (minPrice - padding)) / (priceRange + padding * 2)) * chartHeight
      );
    };

    // --- Volume Profile Calculation ---
    const numBins = 40;
    const binSize = (maxPrice - minPrice) / numBins;
    const bins = new Array(numBins).fill(0);
    
    visibleCandles.forEach(candle => {
      const startBin = Math.floor((Math.min(candle.open, candle.close) - minPrice) / binSize);
      const endBin = Math.floor((Math.max(candle.open, candle.close) - minPrice) / binSize);
      
      // Distribuir volume proporcionalmente entre os bins que o candle cobre
      const candleRange = Math.abs(candle.close - candle.open) || binSize/10;
      for (let i = Math.max(0, startBin); i <= Math.min(numBins - 1, endBin); i++) {
        bins[i] += candle.volume / (endBin - startBin + 1);
      }
    });

    const maxVolumeBin = Math.max(...bins);
    const profileWidth = 150; // Largura máxima do perfil de volume

    // Desenhar Volume Profile (à direita)
    bins.forEach((vol, i) => {
      const yTop = priceToY(minPrice + (i + 1) * binSize);
      const yBottom = priceToY(minPrice + i * binSize);
      const barWidth = (vol / maxVolumeBin) * profileWidth;
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'; // Azul suave transparente
      ctx.fillRect(canvas.width - chartPadding - barWidth, yTop, barWidth, Math.abs(yBottom - yTop) - 1);
      
      // Destacar o POC (Point of Control)
      if (vol === maxVolumeBin) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Vermelho para o POC
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvas.width - chartPadding - profileWidth, (yTop + yBottom) / 2);
        ctx.lineTo(canvas.width - chartPadding, (yTop + yBottom) / 2);
        ctx.stroke();
      }
    });

    // Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = chartPadding + (i * chartHeight) / 4;
      ctx.beginPath();
      ctx.moveTo(chartPadding, y);
      ctx.lineTo(canvas.width - chartPadding, y);
      ctx.stroke();

      const price = maxPrice - ((i * priceRange) / 4 + padding);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), chartPadding - 10, y + 4);
    }

    // Desenhar velas
    visibleCandles.forEach((candle, idx) => {
      const x = chartPadding + idx * (candleWidth + candleSpacing);

      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);

      const isGreen = candle.close >= candle.open;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;

      // Pavio
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Corpo
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // Eixos
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartPadding, canvas.height - chartPadding);
    ctx.lineTo(canvas.width - chartPadding, canvas.height - chartPadding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chartPadding, chartPadding);
    ctx.lineTo(chartPadding, canvas.height - chartPadding);
    ctx.stroke();

    // Info do candle
    if (hoveredCandle) {
      const infoX = 70;
      const infoY = 30;
      const infoWidth = 220;
      const infoHeight = 120;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(infoX, infoY, infoWidth, infoHeight);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';

      const time = new Date(hoveredCandle.time).toLocaleString();
      ctx.fillText(`${time}`, infoX + 10, infoY + 20);

      ctx.font = '11px Arial';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`O: $${hoveredCandle.open.toFixed(2)}`, infoX + 10, infoY + 35);
      ctx.fillText(`H: $${hoveredCandle.high.toFixed(2)}`, infoX + 10, infoY + 50);
      ctx.fillText(`L: $${hoveredCandle.low.toFixed(2)}`, infoX + 10, infoY + 65);
      ctx.fillStyle = hoveredCandle.close >= hoveredCandle.open ? '#10b981' : '#ef4444';
      ctx.fillText(`C: $${hoveredCandle.close.toFixed(2)}`, infoX + 10, infoY + 80);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`V: ${(hoveredCandle.volume / 1000000).toFixed(2)}M`, infoX + 10, infoY + 95);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x < chartPadding || x > canvas.width - chartPadding) {
      setHoveredCandle(null);
      return;
    }

    const candleIndex = Math.floor((x - chartPadding) / (candleWidth + candleSpacing));
    const visibleCount = Math.floor((canvas.width - chartPadding * 2) / (candleWidth + candleSpacing));
    const visibleCandles = aggregatedCandles.slice(
      Math.max(0, aggregatedCandles.length - visibleCount + scrollOffset),
      aggregatedCandles.length + scrollOffset
    );

    if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
      setHoveredCandle(visibleCandles[candleIndex]);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel((prev) => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(newZoom, 3));
    });
  };

  const handleScroll = (direction: 'left' | 'right') => {
    setScrollOffset((prev) => {
      const newOffset = direction === 'left' ? prev - 10 : prev + 10;
      return Math.min(newOffset, 0);
    });
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-4 space-y-3">
          {/* Timeframes */}
          <div className="flex gap-1 flex-wrap">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                variant={timeframe === tf.value ? 'default' : 'outline'}
                size="sm"
                className={
                  timeframe === tf.value
                    ? 'bg-blue-600 hover:bg-blue-700 text-white text-xs'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700 text-xs'
                }
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Controles de zoom e scroll */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={() => handleScroll('left')}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleScroll('right')}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleZoom('out')}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-slate-400 px-2 py-1">{(zoomLevel * 100).toFixed(0)}%</span>
              <Button
                onClick={() => handleZoom('in')}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm">{symbol} - {timeframe.toUpperCase()}</CardTitle>
          <div className="flex gap-4 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500/30"></div>
              <span className="text-slate-400">Volume Profile</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-red-500/50"></div>
              <span className="text-slate-400">POC (Point of Control)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            width={1000}
            height={500}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredCandle(null)}
            className="w-full bg-slate-900 rounded border border-slate-700 cursor-crosshair"
          />
        </CardContent>
      </Card>
    </div>
  );
}
