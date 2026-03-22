import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { aggregateCandles, Candle, Timeframe } from '@/lib/candleAggregator';
import { calculateVolumeProfile, VolumeProfileResult } from '@/lib/volumeProfileWorker';

interface OptimizedCandleChartProps {
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

const CHART_PADDING = 60;
const PROFILE_WIDTH = 120;
const MIN_CANDLE_WIDTH = 2;
const MAX_CANDLE_WIDTH = 20;

export default function OptimizedCandleChart({ symbol, candles }: OptimizedCandleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('30m');
  const [candleWidth, setCandleWidth] = useState(8);
  const [scrollPos, setScrollPos] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [volumeProfile, setVolumeProfile] = useState<VolumeProfileResult | null>(null);

  // Agregar candles
  const aggregatedCandles = useMemo(() => aggregateCandles(candles, timeframe), [candles, timeframe]);

  // Calcular dimensões do canvas
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(500);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.clientWidth - 20);
        setCanvasHeight(500);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calcular candles visíveis
  const visibleRange = useMemo(() => {
    const candleSpacing = 2;
    const availableWidth = canvasWidth - CHART_PADDING * 2 - PROFILE_WIDTH;
    const visibleCount = Math.max(10, Math.floor(availableWidth / (candleWidth + candleSpacing)));
    
    const maxScroll = Math.max(0, aggregatedCandles.length - visibleCount);
    const safeScroll = Math.max(0, Math.min(scrollPos, maxScroll));
    
    const startIdx = Math.max(0, aggregatedCandles.length - visibleCount - safeScroll);
    const endIdx = Math.min(aggregatedCandles.length, startIdx + visibleCount);

    return { startIdx, endIdx, visibleCount };
  }, [aggregatedCandles.length, candleWidth, canvasWidth, scrollPos]);

  const visibleCandles = useMemo(() => 
    aggregatedCandles.slice(visibleRange.startIdx, visibleRange.endIdx),
    [aggregatedCandles, visibleRange]
  );

  // Calcular range de preços
  const priceRange = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 1, padding: 0 };

    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    const padding = range * 0.1;

    return { minPrice, maxPrice, padding };
  }, [visibleCandles]);

  // Calcular Volume Profile
  useEffect(() => {
    if (visibleCandles.length === 0) return;

    const profile = calculateVolumeProfile(
      visibleCandles,
      priceRange.minPrice,
      priceRange.maxPrice,
      40
    );
    setVolumeProfile(profile);
  }, [visibleCandles, priceRange]);

  // Renderizar gráfico
  useEffect(() => {
    if (!canvasRef.current || visibleCandles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Limpar canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const chartHeight = canvas.height - CHART_PADDING * 2;
    const { minPrice, maxPrice, padding } = priceRange;
    const totalRange = maxPrice - minPrice + padding * 2;

    const priceToY = (price: number) => {
      return (
        canvas.height -
        CHART_PADDING -
        ((price - (minPrice - padding)) / totalRange) * chartHeight
      );
    };

    // Desenhar Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = CHART_PADDING + (i * chartHeight) / 4;
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING, y);
      ctx.lineTo(canvas.width - CHART_PADDING - PROFILE_WIDTH, y);
      ctx.stroke();

      const price = maxPrice - ((i * (maxPrice - minPrice)) / 4 + padding);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), CHART_PADDING - 10, y + 4);
    }

    // Desenhar Volume Profile
    if (volumeProfile) {
      const profileX = canvas.width - CHART_PADDING - PROFILE_WIDTH;
      const binHeight = chartHeight / volumeProfile.bins.length;

      volumeProfile.bins.forEach((vol, i) => {
        const barWidth = (vol / volumeProfile.maxVolume) * PROFILE_WIDTH;
        const y = CHART_PADDING + i * binHeight;

        // Barra de volume
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fillRect(profileX, y, barWidth, binHeight - 1);

        // POC highlight
        if (vol === volumeProfile.maxVolume) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(profileX, y);
          ctx.lineTo(profileX + PROFILE_WIDTH, y);
          ctx.stroke();
        }
      });
    }

    // Desenhar velas
    const candleSpacing = 2;
    visibleCandles.forEach((candle, idx) => {
      const x = CHART_PADDING + idx * (candleWidth + candleSpacing);

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

    // Desenhar eixos
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CHART_PADDING, canvas.height - CHART_PADDING);
    ctx.lineTo(canvas.width - CHART_PADDING, canvas.height - CHART_PADDING);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(CHART_PADDING, CHART_PADDING);
    ctx.lineTo(CHART_PADDING, canvas.height - CHART_PADDING);
    ctx.stroke();

    // Tooltip
    if (hoveredCandle) {
      const tooltipX = 70;
      const tooltipY = 30;
      const tooltipW = 200;
      const tooltipH = 110;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(tooltipX, tooltipY, tooltipW, tooltipH);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(tooltipX, tooltipY, tooltipW, tooltipH);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      const time = new Date(hoveredCandle.time).toLocaleString('pt-PT');
      ctx.fillText(time, tooltipX + 10, tooltipY + 18);

      ctx.font = '10px Arial';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`O: $${hoveredCandle.open.toFixed(2)}`, tooltipX + 10, tooltipY + 32);
      ctx.fillText(`H: $${hoveredCandle.high.toFixed(2)}`, tooltipX + 10, tooltipY + 45);
      ctx.fillText(`L: $${hoveredCandle.low.toFixed(2)}`, tooltipX + 10, tooltipY + 58);
      ctx.fillStyle = hoveredCandle.close >= hoveredCandle.open ? '#10b981' : '#ef4444';
      ctx.fillText(`C: $${hoveredCandle.close.toFixed(2)}`, tooltipX + 10, tooltipY + 71);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`V: ${(hoveredCandle.volume / 1000000).toFixed(2)}M`, tooltipX + 10, tooltipY + 84);
    }
  }, [visibleCandles, hoveredCandle, priceRange, volumeProfile, candleWidth, canvasWidth, canvasHeight]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const candleSpacing = 2;

    if (x < CHART_PADDING || x > canvas.width - CHART_PADDING - PROFILE_WIDTH) {
      setHoveredCandle(null);
      return;
    }

    const candleIdx = Math.floor((x - CHART_PADDING) / (candleWidth + candleSpacing));
    if (candleIdx >= 0 && candleIdx < visibleCandles.length) {
      setHoveredCandle(visibleCandles[candleIdx]);
    }
  }, [visibleCandles, candleWidth]);

  const handleZoom = (direction: 'in' | 'out') => {
    setCandleWidth(prev => {
      const newWidth = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(MIN_CANDLE_WIDTH, Math.min(newWidth, MAX_CANDLE_WIDTH));
    });
  };

  const handleScroll = (direction: 'left' | 'right') => {
    setScrollPos(prev => {
      const delta = direction === 'left' ? -5 : 5;
      return Math.max(0, prev + delta);
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

          {/* Controles */}
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
              <span className="text-xs text-slate-400 px-2 py-1">{(candleWidth / 8 * 100).toFixed(0)}%</span>
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

      {/* Gráfico */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">{symbol} - {timeframe.toUpperCase()} | Volume Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="w-full">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredCandle(null)}
              className="w-full bg-slate-900 rounded border border-slate-700 cursor-crosshair"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
