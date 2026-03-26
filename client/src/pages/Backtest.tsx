import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, BarChart3, Search, Activity, Target, Shield, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface BacktestResult {
  symbol: string;
  period: string;
  metrics: {
    totalTrades: number;
    winTrades: number;
    lossTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    totalPnL: number;
    totalPnLPct: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortino: number;
    bestTrade: number;
    worstTrade: number;
  };
}

export default function Backtest() {
  const { isAuthenticated, logout, user } = useAuth();
  const [symbol, setSymbol] = useState("AAPL");
  const [days, setDays] = useState(90);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [compareSymbols, setCompareSymbols] = useState("AAPL,MSFT,NVDA");

  const backtestMutation = trpc.backtest.runBacktest.useMutation();
  const compareMutation = trpc.backtest.compareSymbols.useMutation();

  const handleBacktest = async () => {
    try {
      const res = await backtestMutation.mutateAsync({
        symbol: symbol.toUpperCase(),
        days,
      });

      if (res.success && res.symbol && res.metrics) {
        setResult({
          symbol: res.symbol,
          period: res.period || "Unknown",
          metrics: res.metrics,
        });
      }
    } catch (error) {
      console.error("Backtest failed:", error);
    }
  };

  const handleCompare = async () => {
    try {
      const symbols = compareSymbols.split(",").map((s) => s.trim().toUpperCase());
      const res = await compareMutation.mutateAsync({
        symbols,
        days,
      });

      if (res.success && res.results && res.results.length > 0 && res.results[0].metrics) {
        setResult({
          symbol: res.results[0].symbol || "Unknown",
          period: `${days} dias`,
          metrics: res.results[0].metrics,
        });
      }
    } catch (error) {
      console.error("Comparison failed:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080c12] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[#243047] bg-[#0d1420] text-[#c8d8f0]">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold tracking-widest uppercase">Acesso Restrito</CardTitle>
            <p className="text-[#4a6080] text-xs uppercase tracking-wider mt-2">Faça login para aceder ao simulador</p>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button asChild className="bg-[#00d4ff] text-[#080c12] hover:bg-[#00e5ff] rounded-none px-8 font-bold uppercase tracking-widest text-xs">
              <a href="/api/auth/login">Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c12] text-[#c8d8f0] font-mono selection:bg-[#00d4ff]/30 pb-20">
      {/* Estilo Global */}
      <style dangerouslySetInnerHTML={{ __html: `
        .crt-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.01) 2px, rgba(0,212,255,0.01) 4px); pointer-events: none; z-index: 100; }
        .grid-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 99; }
      `}} />
      <div className="crt-overlay" />
      <div className="grid-overlay" />

      {/* Header */}
      <nav className="border-b border-[#1a2535] bg-[#0d1420]/80 backdrop-blur sticky top-0 z-[110] mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/">
            <div className="flex flex-col cursor-pointer">
              <span className="font-bold text-lg tracking-[3px] text-transparent bg-clip-text bg-gradient-to-r from-[#b388ff] to-[#00d4ff]">
                BACKTEST ENGINE
              </span>
              <span className="text-[7px] text-[#4a6080] tracking-[3px] uppercase">Simulation Mode | User: {user?.name || "Trader"}</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="border-[#243047] hover:border-[#00d4ff] hover:text-[#00d4ff] bg-transparent text-[9px] uppercase tracking-wider h-7">Consola</Button>
            </Link>
            <Button onClick={logout} variant="ghost" className="text-[#4a6080] hover:text-[#ff3d57] text-[9px] uppercase h-7">Sair</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="space-y-6">
            <div className="bg-[#0d1420] border border-[#1a2535]">
              <div className="px-4 py-2 border-b border-[#1a2535] bg-[#111927]">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-[#b388ff]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Parâmetros de Simulação</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] text-[#4a6080] uppercase tracking-wider">Ativo (Ticker)</label>
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="bg-[#080c12] border-[#1a2535] text-[#c8d8f0] font-mono text-xs focus:border-[#b388ff] h-9 rounded-none"
                    placeholder="Ex: AAPL"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-[#4a6080] uppercase tracking-wider">Janela Temporal (Dias)</label>
                  <Input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="bg-[#080c12] border-[#1a2535] text-[#c8d8f0] font-mono text-xs focus:border-[#b388ff] h-9 rounded-none"
                    min={30}
                    max={365}
                  />
                </div>
                <Button 
                  onClick={handleBacktest} 
                  disabled={backtestMutation.isPending} 
                  className="w-full bg-[#b388ff] text-[#080c12] hover:bg-[#c8a2ff] rounded-none font-bold uppercase tracking-widest text-[10px] h-10"
                >
                  {backtestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "EXECUTAR BACKTEST"}
                </Button>
              </div>
            </div>

            <div className="bg-[#0d1420] border border-[#1a2535]">
              <div className="px-4 py-2 border-b border-[#1a2535] bg-[#111927]">
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-[#00d4ff]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Comparação Multi-Ativo</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] text-[#4a6080] uppercase tracking-wider">Lista de Símbolos</label>
                  <Input
                    value={compareSymbols}
                    onChange={(e) => setCompareSymbols(e.target.value)}
                    className="bg-[#080c12] border-[#1a2535] text-[#c8d8f0] font-mono text-xs focus:border-[#00d4ff] h-9 rounded-none"
                    placeholder="AAPL,MSFT,NVDA"
                  />
                </div>
                <Button 
                  onClick={handleCompare} 
                  disabled={compareMutation.isPending} 
                  variant="outline"
                  className="w-full border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded-none font-bold uppercase tracking-widest text-[10px] h-10"
                >
                  {compareMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "COMPARAR PORTFÓLIO"}
                </Button>
              </div>
            </div>

            <div className="bg-[#ff3d57]/5 border border-[#ff3d57]/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3 h-3 text-[#ff3d57]" />
                <span className="text-[9px] font-bold text-[#ff3d57] uppercase tracking-widest">Aviso de Risco</span>
              </div>
              <p className="text-[8px] text-[#4a6080] leading-relaxed uppercase">
                Os resultados passados não garantem performance futura. O motor utiliza velas diárias sintéticas para simular a lógica MTF V3.
              </p>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {!result && !backtestMutation.isPending && !compareMutation.isPending ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#1a2535] bg-[#0d1420]/50 py-20">
                <BarChart3 className="w-12 h-12 text-[#4a6080] opacity-20 mb-4" />
                <p className="text-[10px] text-[#4a6080] uppercase tracking-[3px]">Aguardando execução de simulação...</p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Metrics Grid */}
                <div className="bg-[#0d1420] border border-[#1a2535]">
                  <div className="px-4 py-2 border-b border-[#1a2535] flex justify-between items-center bg-[#111927]">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-[#00e676]" />
                      <span className="text-[10px] font-bold tracking-widest uppercase">Performance: {result.symbol}</span>
                    </div>
                    <span className="text-[8px] text-[#4a6080] uppercase">Período: {result.period}</span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#080c12] border border-[#1a2535] p-3">
                        <div className="text-[7px] text-[#4a6080] uppercase tracking-widest mb-1">Win Rate</div>
                        <div className={`text-xl font-bold ${result.metrics.winRate >= 50 ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>
                          {result.metrics.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-[#080c12] border border-[#1a2535] p-3">
                        <div className="text-[7px] text-[#4a6080] uppercase tracking-widest mb-1">Profit Factor</div>
                        <div className={`text-xl font-bold ${result.metrics.profitFactor >= 1.5 ? 'text-[#00d4ff]' : 'text-[#c8d8f0]'}`}>
                          {result.metrics.profitFactor.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[#080c12] border border-[#1a2535] p-3">
                        <div className="text-[7px] text-[#4a6080] uppercase tracking-widest mb-1">Retorno Total</div>
                        <div className={`text-xl font-bold ${result.metrics.totalPnLPct >= 0 ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>
                          {result.metrics.totalPnLPct >= 0 ? '+' : ''}{result.metrics.totalPnLPct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-[#080c12] border border-[#1a2535] p-3">
                        <div className="text-[7px] text-[#4a6080] uppercase tracking-widest mb-1">Max Drawdown</div>
                        <div className="text-xl font-bold text-[#ffd600]">
                          -{result.metrics.maxDrawdown.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-[#080c12] border border-[#1a2535] p-3">
                        <div className="text-[7px] text-[#4a6080] uppercase tracking-widest mb-1">Trades Totais</div>
                        <div className="text-sm font-bold tracking-widest">
                          {result.metrics.totalTrades} <span className="text-[8px] text-[#4a6080] font-normal">({result.metrics.winTrades}W / {result.metrics.lossTrades}L)</span>
                        </div>
                      </div>
                      <div className="bg-[#080c12] border border-[#1a2535] p-3">
                        <div className="text-[7px] text-[#4a6080] uppercase tracking-widest mb-1">Sharpe Ratio</div>
                        <div className="text-sm font-bold tracking-widest">{result.metrics.sharpeRatio.toFixed(2)}</div>
                      </div>
                      <div className="bg-[#080c12] border border-[#1a2535] p-3">
                        <div className="text-[7px] text-[#4a6080] uppercase tracking-widest mb-1">Profit Médio</div>
                        <div className="text-sm font-bold text-[#00e676] tracking-widest">${result.metrics.avgWin.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interpretation & Strategy Details */}
                <div className="bg-[#0d1420] border border-[#1a2535]">
                  <div className="px-4 py-2 border-b border-[#1a2535] bg-[#111927]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-[#00d4ff]" />
                      <span className="text-[10px] font-bold tracking-widest uppercase">Análise de Estratégia</span>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-[9px] text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535] pb-1">Pontos Fortes</div>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${result.metrics.profitFactor > 1 ? 'bg-[#00e676]' : 'bg-[#4a6080]'}`} />
                          Expectativa Matemática Positiva
                        </li>
                        <li className="flex items-center gap-2 text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${result.metrics.maxDrawdown < 20 ? 'bg-[#00e676]' : 'bg-[#ffd600]'}`} />
                          Controlo de Volatilidade
                        </li>
                        <li className="flex items-center gap-2 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                          Risco Fixo de 1% Validado
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <div className="text-[9px] text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535] pb-1">Configuração MTF V3</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-[#4a6080]">FILTRO SMA70</span>
                          <span className="text-[#00e676]">ATIVO</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-[#4a6080]">RSI 4H RANGE</span>
                          <span className="text-[#c8d8f0]">30 - 45</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-[#4a6080]">RÁCIO RR</span>
                          <span className="text-[#00d4ff]">1:3.0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-40">
                <Loader2 className="w-8 h-8 animate-spin text-[#b388ff]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
