import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { aggregateCandles, calculateEMA, calculateRSI, calculateMACD, Candle, Timeframe } from '@/lib/candleAggregator';

interface TradingViewChartProps {
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

export default function TradingViewChart({ symbol, candles }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ema20SeriesRef = useRef<any>(null);
  const ema50SeriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('30m');
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Criar chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#d1d5db',
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
      },
      rightPriceScale: {
        autoScale: true,
        mode: 1,
      },
    });

    chartRef.current = chart;

    // Agregar candles
    const aggregatedCandles = aggregateCandles(candles, timeframe);

    // Preparar dados de velas
    const candleData = aggregatedCandles.map((c) => ({
      time: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    // Preparar dados de volume
    const volumeData = aggregatedCandles.map((c, idx) => ({
      time: Math.floor(c.time / 1000),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
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

    candleSeriesRef.current = candleSeries;
    candleSeries.setData(candleData);

    // Série de volume
    if (showVolume) {
      const volumeSeries = (chart as any).addHistogramSeries({
        color: '#3b82f6',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      volumeSeriesRef.current = volumeSeries;
      volumeSeries.setData(volumeData);

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // EMA 20
    if (showEMA20) {
      const ema20 = calculateEMA(aggregatedCandles, 20);
      const ema20Data = ema20.map((value, idx) => ({
        time: Math.floor(aggregatedCandles[idx + aggregatedCandles.length - ema20.length].time / 1000),
        value,
      }));

      const ema20Series = (chart as any).addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        title: 'EMA 20',
      });

      ema20SeriesRef.current = ema20Series;
      ema20Series.setData(ema20Data);
    }

    // EMA 50
    if (showEMA50) {
      const ema50 = calculateEMA(aggregatedCandles, 50);
      const ema50Data = ema50.map((value, idx) => ({
        time: Math.floor(aggregatedCandles[idx + aggregatedCandles.length - ema50.length].time / 1000),
        value,
      }));

      const ema50Series = (chart as any).addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        title: 'EMA 50',
      });

      ema50SeriesRef.current = ema50Series;
      ema50Series.setData(ema50Data);
    }

    // Fit content
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
  }, [timeframe, showEMA20, showEMA50, showVolume, candles]);

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
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
                onClick={() => handleTimeframeChange(tf.value)}
                variant={timeframe === tf.value ? 'default' : 'outline'}
                size="sm"
                className={
                  timeframe === tf.value
                    ? 'bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700 text-xs'
                }
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Indicadores */}
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showEMA20}
                onChange={(e) => setShowEMA20(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-blue-400 font-semibold">EMA 20</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showEMA50}
                onChange={(e) => setShowEMA50(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-yellow-400 font-semibold">EMA 50</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-blue-500 font-semibold">Volume</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">
            {symbol} • {timeframe.toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={chartContainerRef}
            className="w-full rounded border border-slate-700"
            style={{ height: '600px' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
