import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import {
  aggregateCandles,
  calculateEMA,
  calculateSMA,
  calculateBollingerBands,
  calculateMACD,
  calculateRSI,
  calculateATR,
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
  const rsiCanvasRef = useRef<HTMLCanvasElement>(null);
  const macdCanvasRef = useRef<HTMLCanvasElement>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('30m');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const [showIndicators, setShowIndicators] = useState({
    ema20: true,
    ema50: true,
    bollingerBands: false,
    rsi: true,
    macd: true,
  });

  const candleWidth = 8 * zoomLevel;
  const candleSpacing = 2 * zoomLevel;
  const chartPadding = 50;

  // Agregar candles baseado no timeframe
  const aggregatedCandles = aggregateCandles(candles, timeframe);

  // Calcular indicadores
  const ema20 = calculateEMA(aggregatedCandles, 20);
  const ema50 = calculateEMA(aggregatedCandles, 50);
  const bb = calculateBollingerBands(aggregatedCandles, 20, 2);
  const rsi = calculateRSI(aggregatedCandles, 14);
  const { macdLine, signalLine, histogram } = calculateMACD(aggregatedCandles);
  const atr = calculateATR(aggregatedCandles, 14);

  useEffect(() => {
    drawMainChart();
    drawRSI();
    drawMACD();
  }, [aggregatedCandles, zoomLevel, scrollOffset, showIndicators, hoveredCandle]);

  const drawMainChart = () => {
    if (!canvasRef.current || aggregatedCandles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const visibleCandles = aggregatedCandles.slice(Math.max(0, aggregatedCandles.length - 100 + scrollOffset));
    if (visibleCandles.length === 0) return;

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

      ctx.strokeStyle = isGreen ? '#059669' : '#dc2626';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // EMA 20
    if (showIndicators.ema20 && ema20.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      ema20.slice(Math.max(0, ema20.length - visibleCandles.length)).forEach((value, idx) => {
        const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
        const y = priceToY(value);

        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    }

    // EMA 50
    if (showIndicators.ema50 && ema50.length > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();

      ema50.slice(Math.max(0, ema50.length - visibleCandles.length)).forEach((value, idx) => {
        const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
        const y = priceToY(value);

        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    }

    // Bollinger Bands
    if (showIndicators.bollingerBands && bb.upper.length > 0) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Upper band
      ctx.beginPath();
      bb.upper.slice(Math.max(0, bb.upper.length - visibleCandles.length)).forEach((value, idx) => {
        const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
        const y = priceToY(value);

        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Lower band
      ctx.beginPath();
      bb.lower.slice(Math.max(0, bb.lower.length - visibleCandles.length)).forEach((value, idx) => {
        const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
        const y = priceToY(value);

        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.setLineDash([]);
    }

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

  const drawRSI = () => {
    if (!rsiCanvasRef.current || rsi.length === 0 || !showIndicators.rsi) return;

    const canvas = rsiCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const visibleRSI = rsi.slice(Math.max(0, rsi.length - 100 + scrollOffset));
    const chartHeight = canvas.height - 40;

    // Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    [30, 50, 70].forEach((level) => {
      const y = canvas.height - 20 - (level / 100) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(chartPadding, y);
      ctx.lineTo(canvas.width - chartPadding, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(level.toString(), chartPadding - 10, y + 3);
    });

    // RSI
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    visibleRSI.forEach((value, idx) => {
      const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
      const y = canvas.height - 20 - (value / 100) * chartHeight;

      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Zonas
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(chartPadding, canvas.height - 20 - (70 / 100) * chartHeight, canvas.width - chartPadding * 2, (20 / 100) * chartHeight);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(chartPadding, canvas.height - 20 - (30 / 100) * chartHeight, canvas.width - chartPadding * 2, (30 / 100) * chartHeight);
  };

  const drawMACD = () => {
    if (!macdCanvasRef.current || macdLine.length === 0 || !showIndicators.macd) return;

    const canvas = macdCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const visibleMACD = macdLine.slice(Math.max(0, macdLine.length - 100 + scrollOffset));
    const visibleSignal = signalLine.slice(Math.max(0, signalLine.length - 100 + scrollOffset));
    const visibleHist = histogram.slice(Math.max(0, histogram.length - 100 + scrollOffset));

    const allValues = [...visibleMACD, ...visibleSignal];
    const maxVal = Math.max(...allValues.map(Math.abs));
    const chartHeight = canvas.height - 40;
    const centerY = canvas.height / 2;

    // MACD Line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    visibleMACD.forEach((value, idx) => {
      const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
      const y = centerY - (value / maxVal) * (chartHeight / 2);

      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Signal Line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();

    visibleSignal.forEach((value, idx) => {
      const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
      const y = centerY - (value / maxVal) * (chartHeight / 2);

      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Histogram
    visibleHist.forEach((value, idx) => {
      const x = chartPadding + idx * (candleWidth + candleSpacing) + candleWidth / 2;
      const y = centerY - (value / maxVal) * (chartHeight / 2);

      ctx.fillStyle = value >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.fillRect(x - 1, Math.min(y, centerY), 2, Math.abs(y - centerY));
    });

    // Zero line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartPadding, centerY);
    ctx.lineTo(canvas.width - chartPadding, centerY);
    ctx.stroke();
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

    const candleIndex = Math.floor((x - chartPadding) / (candleWidth + 2));
    const visibleCandles = aggregatedCandles.slice(Math.max(0, aggregatedCandles.length - 100 + scrollOffset));

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
      return Math.max(-aggregatedCandles.length + 100, Math.min(newOffset, 0));
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

          {/* Indicadores */}
          <div className="flex gap-3 flex-wrap">
            {Object.entries(showIndicators).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setShowIndicators((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">{symbol} - {timeframe.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            width={1000}
            height={450}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredCandle(null)}
            className="w-full bg-slate-900 rounded border border-slate-700 cursor-crosshair"
          />
        </CardContent>
      </Card>

      {/* RSI */}
      {showIndicators.rsi && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">RSI (14)</CardTitle>
          </CardHeader>
          <CardContent>
            <canvas
              ref={rsiCanvasRef}
              width={1000}
              height={150}
              className="w-full bg-slate-900 rounded border border-slate-700"
            />
          </CardContent>
        </Card>
      )}

      {/* MACD */}
      {showIndicators.macd && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">MACD (12,26,9)</CardTitle>
          </CardHeader>
          <CardContent>
            <canvas
              ref={macdCanvasRef}
              width={1000}
              height={150}
              className="w-full bg-slate-900 rounded border border-slate-700"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
