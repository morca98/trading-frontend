import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SignalCardProps {
  signal: {
    signal: string;
    conf: number;
    price: number;
    sl: number;
    tp: number;
    rsi: string;
    ema20: string;
    ema50: string;
    macroTrend: string;
    trend15m: string;
    pattern: string;
  };
}

export default function SignalCard({ signal }: SignalCardProps) {
  const isLong = signal.signal === 'BUY';

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          {isLong ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-400">COMPRA</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">VENDA</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">Confiança</span>
          <Badge className={isLong ? 'bg-green-600' : 'bg-red-600'}>{signal.conf}%</Badge>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Padrão</span>
          <span className="text-white font-semibold">{signal.pattern}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Trend 15m</span>
          <span className={signal.trend15m === 'UP' ? 'text-green-400' : 'text-red-400'}>{signal.trend15m}</span>
        </div>
      </CardContent>
    </Card>
  );
}
