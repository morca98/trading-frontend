import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Filter } from 'lucide-react';

interface Trade {
  signal: string;
  outcome: string;
  entry: number;
  exit: number;
  pnl: number;
  capital: number;
  time: number;
}

interface TradeHistoryProps {
  trades: Trade[];
  symbol: string;
}

export default function TradeHistory({ trades, symbol }: TradeHistoryProps) {
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [filterSignal, setFilterSignal] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const outcomeMatch = filterOutcome === 'ALL' || trade.outcome === filterOutcome;
      const signalMatch = filterSignal === 'ALL' || trade.signal === filterSignal;
      return outcomeMatch && signalMatch;
    });
  }, [trades, filterOutcome, filterSignal]);

  const stats = useMemo(() => {
    if (filteredTrades.length === 0) return { wins: 0, losses: 0, avgPnl: 0, maxWin: 0, maxLoss: 0 };

    const wins = filteredTrades.filter((t) => t.outcome === 'WIN').length;
    const losses = filteredTrades.filter((t) => t.outcome === 'LOSS').length;
    const avgPnl = filteredTrades.reduce((sum, t) => sum + t.pnl, 0) / filteredTrades.length;
    const maxWin = Math.max(...filteredTrades.filter((t) => t.outcome === 'WIN').map((t) => t.pnl), 0);
    const maxLoss = Math.min(...filteredTrades.filter((t) => t.outcome === 'LOSS').map((t) => t.pnl), 0);

    return { wins, losses, avgPnl, maxWin, maxLoss };
  }, [filteredTrades]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterOutcome === 'ALL' ? 'default' : 'outline'}
          onClick={() => setFilterOutcome('ALL')}
          className={filterOutcome === 'ALL' ? 'bg-blue-600' : 'border-slate-600'}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={filterOutcome === 'WIN' ? 'default' : 'outline'}
          onClick={() => setFilterOutcome('WIN')}
          className={filterOutcome === 'WIN' ? 'bg-green-600' : 'border-slate-600'}
        >
          Ganhos
        </Button>
        <Button
          size="sm"
          variant={filterOutcome === 'LOSS' ? 'default' : 'outline'}
          onClick={() => setFilterOutcome('LOSS')}
          className={filterOutcome === 'LOSS' ? 'bg-red-600' : 'border-slate-600'}
        >
          Perdas
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-700 p-3 rounded-lg">
          <p className="text-slate-400 text-xs">Ganhos</p>
          <p className="text-green-400 font-bold">{stats.wins}</p>
        </div>
        <div className="bg-slate-700 p-3 rounded-lg">
          <p className="text-slate-400 text-xs">Perdas</p>
          <p className="text-red-400 font-bold">{stats.losses}</p>
        </div>
        <div className="bg-slate-700 p-3 rounded-lg">
          <p className="text-slate-400 text-xs">Avg P&L</p>
          <p className={`font-bold ${stats.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.avgPnl.toFixed(2)}%
          </p>
        </div>
        <div className="bg-slate-700 p-3 rounded-lg">
          <p className="text-slate-400 text-xs">Win Rate</p>
          <p className="text-blue-400 font-bold">
            {stats.wins + stats.losses > 0 ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>

      {/* Lista de Trades */}
      <div className="space-y-2">
        <p className="text-slate-400 text-xs font-semibold">ÚLTIMOS TRADES ({filteredTrades.length})</p>
        {filteredTrades.length > 0 ? (
          filteredTrades.slice(-10).reverse().map((trade, i) => (
            <div key={i} className="bg-slate-700 p-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {trade.outcome === 'WIN' ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{trade.signal}</p>
                  <p className="text-slate-400 text-xs">
                    ${trade.entry.toFixed(0)} → ${trade.exit.toFixed(0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                </p>
                <p className="text-slate-400 text-xs">${trade.capital.toFixed(0)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-center py-4 text-xs">Nenhum trade encontrado</p>
        )}
      </div>
    </div>
  );
}
