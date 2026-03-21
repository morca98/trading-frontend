import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol: string;
  candles: Candle[];
  ema20?: number[];
  ema50?: number[];
}

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

export default function CandlestickChart({ symbol, candles, ema20, ema50 }: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState('30m');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);

  const candleWidth = 8 * zoomLevel;
  const candleSpacing = 2 * zoomLevel;
  const chartPadding = 50;

  useEffect(() => {
    drawChart();
  }, [candles, zoomLevel, scrollOffset, showEMA20, showEMA50, hoveredCandle]);

  const drawChart = () => {
    if (!canvasRef.current || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calcular min/max
    const visibleCandles = candles.slice(Math.max(0, candles.length - 100 + scrollOffset));
    if (visibleCandles.length === 0) return;

    const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    const chartHeight = canvas.height - chartPadding * 2;
    const chartWidth = canvas.width - chartPadding * 2;

    // Função para converter preço em Y
    const priceToY = (price: number) => {
      return (
        canvas.height -
        chartPadding -
        ((price - (minPrice - padding)) / (priceRange + padding * 2)) * chartHeight
      );
    };

    // Desenhar grid
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

      // Desenhar pavio (wick)
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Desenhar corpo
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      // Desenhar borda
      ctx.strokeStyle = isGreen ? '#059669' : '#dc2626';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // Desenhar EMA 20
    if (showEMA20 && ema20) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      ema20.slice(Math.max(0, ema20.length - visibleCandles.length)).forEach((value, idx) => {
        const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
        const y = priceToY(value);

        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Desenhar EMA 50
    if (showEMA50 && ema50) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();

      ema50.slice(Math.max(0, ema50.length - visibleCandles.length)).forEach((value, idx) => {
        const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
        const y = priceToY(value);

        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Desenhar eixo X
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartPadding, canvas.height - chartPadding);
    ctx.lineTo(canvas.width - chartPadding, canvas.height - chartPadding);
    ctx.stroke();

    // Desenhar eixo Y
    ctx.beginPath();
    ctx.moveTo(chartPadding, chartPadding);
    ctx.lineTo(chartPadding, canvas.height - chartPadding);
    ctx.stroke();

    // Desenhar info do candle hovereado
    if (hoveredCandle) {
      const infoX = 70;
      const infoY = 30;
      const infoWidth = 200;
      const infoHeight = 100;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(infoX, infoY, infoWidth, infoHeight);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';

      const time = new Date(hoveredCandle.time).toLocaleTimeString();
      ctx.fillText(`${time}`, infoX + 10, infoY + 20);

      ctx.font = '11px Arial';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`O: $${hoveredCandle.open.toFixed(2)}`, infoX + 10, infoY + 35);
      ctx.fillText(`H: $${hoveredCandle.high.toFixed(2)}`, infoX + 10, infoY + 50);
      ctx.fillText(`L: $${hoveredCandle.low.toFixed(2)}`, infoX + 10, infoY + 65);
      ctx.fillStyle = hoveredCandle.close >= hoveredCandle.open ? '#10b981' : '#ef4444';
      ctx.fillText(`C: $${hoveredCandle.close.toFixed(2)}`, infoX + 10, infoY + 80);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartPadding = 50;

    if (x < chartPadding || x > canvas.width - chartPadding) {
      setHoveredCandle(null);
      return;
    }

    const candleIndex = Math.floor((x - chartPadding) / (candleWidth + 2));
    const visibleCandles = candles.slice(Math.max(0, candles.length - 100 + scrollOffset));

    if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
      setHoveredCandle(visibleCandles[candleIndex]);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredCandle(null);
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
      return Math.max(-candles.length + 100, Math.min(newOffset, 0));
    });
  };

  return (
    <Card className="bg-slate-800 border-slate-700 h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">{symbol} - {timeframe}</CardTitle>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={showEMA20}
                onChange={(e) => setShowEMA20(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-blue-400">EMA 20</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={showEMA50}
                onChange={(e) => setShowEMA50(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-yellow-400">EMA 50</span>
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Timeframe Selector */}
        <div className="flex gap-1 flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              variant={timeframe === tf.value ? 'default' : 'outline'}
              size="sm"
              className={
                timeframe === tf.value
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700 text-xs'
              }
            >
              {tf.label}
            </Button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            className="flex-1 bg-slate-900 rounded border border-slate-700 cursor-crosshair"
          />

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

            <div className="text-xs text-slate-400">
              {candles.length} velas | Zoom: {zoomLevel.toFixed(1)}x
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
