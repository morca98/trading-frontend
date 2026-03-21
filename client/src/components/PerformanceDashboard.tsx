import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';

interface BacktestResult {
  trades: any[];
  capital: number;
  wins: number;
  losses: number;
  winRate: number;
  maxDD: number;
  ret: number;
}

interface PerformanceDashboardProps {
  backtestResult: BacktestResult | null;
  loading: boolean;
  onRunBacktest: () => void;
}

export default function PerformanceDashboard({ backtestResult, loading, onRunBacktest }: PerformanceDashboardProps) {
  const [equityData, setEquityData] = useState<any[]>([]);
  const [drawdownData, setDrawdownData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (backtestResult && backtestResult.trades.length > 0) {
      calculateMetrics();
    }
  }, [backtestResult]);

  const calculateMetrics = () => {
    if (!backtestResult || !backtestResult.trades) return;

    const trades = backtestResult.trades;
    let capital = 1000;
    let maxCapital = 1000;
    let equityPoints = [{ time: 0, equity: 1000, drawdown: 0 }];
    const monthlyReturns: { [key: string]: number } = {};

    trades.forEach((trade, idx) => {
      const pnl = parseFloat(trade.pnl);
      capital += capital * (pnl / 100);
      maxCapital = Math.max(maxCapital, capital);
      const dd = ((maxCapital - capital) / maxCapital) * 100;

      equityPoints.push({
        time: idx + 1,
        equity: capital,
        drawdown: dd,
      });

      // Calcular retornos mensais
      const date = new Date(trade.time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyReturns[monthKey] = (monthlyReturns[monthKey] || 0) + pnl;
    });

    setEquityData(equityPoints);

    // Preparar dados de drawdown
    const drawdownPoints = equityPoints.map((p) => ({
      time: p.time,
      drawdown: p.drawdown,
    }));
    setDrawdownData(drawdownPoints);

    // Preparar dados de retornos mensais
    const monthlyPoints = Object.entries(monthlyReturns).map(([month, ret]) => ({
      month,
      return: parseFloat(ret.toFixed(2)),
    }));
    setMonthlyData(monthlyPoints);

    // Calcular estatísticas
    const winTrades = trades.filter((t) => parseFloat(t.pnl) > 0);
    const lossTrades = trades.filter((t) => parseFloat(t.pnl) <= 0);
    const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + parseFloat(t.pnl), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + parseFloat(t.pnl), 0) / lossTrades.length : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? 999 : 0;
    const sharpeRatio = calculateSharpeRatio(equityPoints);
    const maxConsecWins = calculateMaxConsecutive(trades, true);
    const maxConsecLosses = calculateMaxConsecutive(trades, false);

    setStats({
      totalTrades: trades.length,
      wins: winTrades.length,
      losses: lossTrades.length,
      winRate: backtestResult.winRate,
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      profitFactor: profitFactor.toFixed(2),
      maxDD: backtestResult.maxDD.toFixed(2),
      totalReturn: backtestResult.ret.toFixed(2),
      finalCapital: backtestResult.capital.toFixed(0),
      sharpeRatio: sharpeRatio.toFixed(2),
      maxConsecWins,
      maxConsecLosses,
    });
  };

  const calculateSharpeRatio = (equityPoints: any[]) => {
    if (equityPoints.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < equityPoints.length; i++) {
      const ret = (equityPoints[i].equity - equityPoints[i - 1].equity) / equityPoints[i - 1].equity;
      returns.push(ret);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  };

  const calculateMaxConsecutive = (trades: any[], wins: boolean) => {
    let max = 0;
    let current = 0;

    trades.forEach((trade) => {
      const isWin = parseFloat(trade.pnl) > 0;
      if ((wins && isWin) || (!wins && !isWin)) {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    });

    return max;
  };

  const exportToPDF = () => {
    // Implementar exportação em PDF
    console.log('Exportando para PDF...');
  };

  return (
    <div className="space-y-6">
      {/* Header com Botões */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Painel de Desempenho</h2>
        <div className="flex gap-2">
          <Button
            onClick={onRunBacktest}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Reexecutar
          </Button>
          <Button
            onClick={exportToPDF}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-2">Total de Trades</p>
                <p className="text-3xl font-bold text-white">{stats.totalTrades}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-2">Win Rate</p>
                <p className={`text-3xl font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.winRate}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-2">Profit Factor</p>
                <p className={`text-3xl font-bold ${stats.profitFactor >= 1.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {stats.profitFactor}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-2">Retorno Total</p>
                <p className={`text-3xl font-bold ${parseFloat(stats.totalReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(stats.totalReturn) >= 0 ? '+' : ''}{stats.totalReturn}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <Tabs defaultValue="equity" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
          <TabsTrigger value="equity" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
            Equity Curve
          </TabsTrigger>
          <TabsTrigger value="drawdown" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
            Drawdown
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700">
            Retornos Mensais
          </TabsTrigger>
        </TabsList>

        {/* Equity Curve */}
        <TabsContent value="equity" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Evolução do Capital</CardTitle>
            </CardHeader>
            <CardContent>
              {equityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={equityData}>
                    <defs>
                      <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Area type="monotone" dataKey="equity" stroke="#10b981" fillOpacity={1} fill="url(#colorEquity)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-center py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas Detalhadas */}
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Ganhos</span>
                    <span className="text-green-400 font-bold">{stats.wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Perdas</span>
                    <span className="text-red-400 font-bold">{stats.losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Avg Win</span>
                    <span className="text-green-400 font-bold">{stats.avgWin}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Avg Loss</span>
                    <span className="text-red-400 font-bold">{stats.avgLoss}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Max DD</span>
                    <span className="text-yellow-400 font-bold">{stats.maxDD}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Sharpe Ratio</span>
                    <span className="text-blue-400 font-bold">{stats.sharpeRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Max Cons. Wins</span>
                    <span className="text-green-400 font-bold">{stats.maxConsecWins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Max Cons. Losses</span>
                    <span className="text-red-400 font-bold">{stats.maxConsecLosses}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Drawdown */}
        <TabsContent value="drawdown" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Drawdown Máximo</CardTitle>
            </CardHeader>
            <CardContent>
              {drawdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={drawdownData}>
                    <defs>
                      <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" label={{ value: 'DD %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fillOpacity={1} fill="url(#colorDD)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-center py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Returns */}
        <TabsContent value="monthly" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Retornos Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Bar
                      dataKey="return"
                      fill="#3b82f6"
                      shape={<CustomBar />}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-center py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Retornos Mensais */}
          {monthlyData.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Detalhes Mensais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monthlyData.map((month, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-700 rounded">
                      <span className="text-slate-300">{month.month}</span>
                      <span className={`font-bold ${month.return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {month.return >= 0 ? '+' : ''}{month.return}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente customizado para barras coloridas
function CustomBar(props: any) {
  const { fill, x, y, width, height, payload } = props;
  const color = payload.return >= 0 ? '#10b981' : '#ef4444';

  return (
    <rect x={x} y={y} width={width} height={height} fill={color} />
  );
}
