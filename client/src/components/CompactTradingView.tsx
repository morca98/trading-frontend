import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { aggregateCandles, calculateEMA, calculateRSI, calculateMACD, Candle, Timeframe } from '@/lib/candleAggregator';

interface CompactTradingViewProps {
  symbol: string;
  candles: Candle[];
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1M', value: '1m' },
  { label: '5M', value: '5m' },
  { label: '15M', value: '15m' },
  { label: '30M', value: '30m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export default function CompactTradingView({ symbol, candles }: CompactTradingViewProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiCanvasRef = useRef<HTMLCanvasElement>(null);
  const macdCanvasRef = useRef<HTMLCanvasElement>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('30m');
  const [price, setPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Agregar candles
    const aggregatedCandles = aggregateCandles(candles, timeframe);
    if (aggregatedCandles.length === 0) return;

    // Atualizar preço
    const lastCandle = aggregatedCandles[aggregatedCandles.length - 1];
    setPrice(lastCandle.close);
    const firstCandle = aggregatedCandles[0];
    setPriceChange(((lastCandle.close - firstCandle.open) / firstCandle.open) * 100);

    // Criar chart principal
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Arial, sans-serif',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        fixLeftEdge: true,
      },
      rightPriceScale: {
        autoScale: true,
        borderColor: '#334155',
      },
      grid: {
        horzLines: {
          color: '#1e293b',
          visible: true,
        },
        vertLines: {
          color: '#1e293b',
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#475569',
          width: 1,
          style: 1,
        },
        horzLine: {
          color: '#475569',
          width: 1,
          style: 1,
        },
      },
    });

    // Preparar dados
    const candleData = aggregatedCandles.map((c) => ({
      time: Math.floor(c.time / 1000) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = aggregatedCandles.map((c) => ({
      time: Math.floor(c.time / 1000) as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
    }));

    // Série de velas
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#059669',
      borderDownColor: '#dc2626',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(candleData);

    // Série de volume
    const volumeSeries = (chart as any).addHistogramSeries({
      color: '#3b82f6',
      priceScaleId: 'volume',
    });

    volumeSeries.setData(volumeData);

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      visible: false,
    });

    // EMA 20
    if (showEMA20) {
      const ema20 = calculateEMA(aggregatedCandles, 20);
      const ema20Data = ema20.map((value, idx) => ({
        time: Math.floor(aggregatedCandles[idx + aggregatedCandles.length - ema20.length].time / 1000) as any,
        value,
      }));

      const ema20Series = (chart as any).addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
      });

      ema20Series.setData(ema20Data);
    }

    // EMA 50
    if (showEMA50) {
      const ema50 = calculateEMA(aggregatedCandles, 50);
      const ema50Data = ema50.map((value, idx) => ({
        time: Math.floor(aggregatedCandles[idx + aggregatedCandles.length - ema50.length].time / 1000) as any,
        value,
      }));

      const ema50Series = (chart as any).addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
      });

      ema50Series.setData(ema50Data);
    }

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [timeframe, showEMA20, showEMA50, showRSI, showMACD, candles]);

  // Desenhar RSI
  useEffect(() => {
    if (!rsiCanvasRef.current || candles.length === 0) return;

    const aggregatedCandles = aggregateCandles(candles, timeframe);
    const rsi = calculateRSI(aggregatedCandles, 14);

    const canvas = rsiCanvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = 100;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [30, 50, 70].forEach((level) => {
      const y = canvas.height - 10 - (level / 100) * (canvas.height - 20);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(level.toString(), canvas.width - 5, y + 3);
    });

    // RSI line
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    rsi.forEach((value, idx) => {
      const x = (idx / rsi.length) * canvas.width;
      const y = canvas.height - 10 - (value / 100) * (canvas.height - 20);

      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Zonas
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(0, canvas.height - 10 - (70 / 100) * (canvas.height - 20), canvas.width, (20 / 100) * (canvas.height - 20));

    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(0, canvas.height - 10 - (30 / 100) * (canvas.height - 20), canvas.width, (30 / 100) * (canvas.height - 20));
  }, [timeframe, candles]);

  // Desenhar MACD
  useEffect(() => {
    if (!macdCanvasRef.current || candles.length === 0) return;

    const aggregatedCandles = aggregateCandles(candles, timeframe);
    const { macdLine, signalLine, histogram } = calculateMACD(aggregatedCandles);

    const canvas = macdCanvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = 100;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    const allValues = [...macdLine, ...signalLine];
    const maxVal = Math.max(...allValues.map(Math.abs));
    const centerY = canvas.height / 2;

    // Histogram
    histogram.forEach((value, idx) => {
      const x = (idx / histogram.length) * canvas.width;
      const y = centerY - (value / maxVal) * (canvas.height / 2 - 10);

      ctx.fillStyle = value >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.fillRect(x - 1, Math.min(y, centerY), 2, Math.abs(y - centerY));
    });

    // MACD line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    macdLine.forEach((value, idx) => {
      const x = (idx / macdLine.length) * canvas.width;
      const y = centerY - (value / maxVal) * (canvas.height / 2 - 10);

      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Signal line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();

    signalLine.forEach((value, idx) => {
      const x = (idx / signalLine.length) * canvas.width;
      const y = centerY - (value / maxVal) * (canvas.height / 2 - 10);

      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [timeframe, candles]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 space-y-3">
        {/* Título e Preço */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">{symbol}</h2>
            <p className="text-xs text-slate-400 mt-1">Bitcoin / Tether US</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">${price.toFixed(2)}</div>
            <div className={`text-sm font-semibold flex items-center justify-end gap-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Timeframes */}
        <div className="flex gap-2">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              variant={timeframe === tf.value ? 'default' : 'outline'}
              size="sm"
              className={
                timeframe === tf.value
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-3 py-1 h-auto'
                  : 'border-slate-600 text-slate-400 hover:bg-slate-700 text-xs px-3 py-1 h-auto'
              }
            >
              {tf.label}
            </Button>
          ))}
        </div>

        {/* Indicadores */}
        <div className="flex gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300">
            <input
              type="checkbox"
              checked={showEMA20}
              onChange={(e) => setShowEMA20(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <span className="text-blue-400">EMA 20</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300">
            <input
              type="checkbox"
              checked={showEMA50}
              onChange={(e) => setShowEMA50(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <span className="text-yellow-400">EMA 50</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300">
            <input
              type="checkbox"
              checked={showRSI}
              onChange={(e) => setShowRSI(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <span className="text-cyan-400">RSI</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300">
            <input
              type="checkbox"
              checked={showMACD}
              onChange={(e) => setShowMACD(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <span className="text-purple-400">MACD</span>
          </label>
        </div>
      </div>

      {/* Main Chart */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={chartContainerRef}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      </div>

      {/* RSI */}
      {showRSI && (
        <div className="border-t border-slate-700 bg-slate-800/50">
          <div className="px-4 py-2">
            <p className="text-xs text-slate-400 font-semibold mb-1">RSI (14)</p>
            <canvas
              ref={rsiCanvasRef}
              className="w-full"
              style={{ height: '100px' }}
            />
          </div>
        </div>
      )}

      {/* MACD */}
      {showMACD && (
        <div className="border-t border-slate-700 bg-slate-800/50">
          <div className="px-4 py-2">
            <p className="text-xs text-slate-400 font-semibold mb-1">MACD (12,26,9)</p>
            <canvas
              ref={macdCanvasRef}
              className="w-full"
              style={{ height: '100px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
