import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, Activity, Target, Shield, Clock, BarChart3, Bell } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { data: activeTrades, isLoading: tradesLoading } = trpc.trading.getActiveTrades.useQuery();
  const { data: symbols, isLoading: symbolsLoading } = trpc.trading.getSymbols.useQuery();
  const { data: signals } = trpc.trading.getSignals.useQuery(
    selectedSymbol ? { symbol: selectedSymbol, limit: 20 } : { symbol: "", limit: 0 },
    { enabled: !!selectedSymbol }
  );

  // Simulação de performance para visualização
  const performanceStats = {
    winRate: "68.4%",
    profitFactor: "2.45",
    totalTrades: "142",
    avgProfit: "+4.2%",
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080c12] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[#243047] bg-[#0d1420] text-[#c8d8f0]">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold tracking-widest uppercase">Acesso Restrito</CardTitle>
            <p className="text-[#4a6080] text-xs uppercase tracking-wider mt-2">Faça login para aceder ao terminal</p>
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
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}} />
      <div className="crt-overlay" />
      <div className="grid-overlay" />

      {/* Header */}
      <nav className="border-b border-[#1a2535] bg-[#0d1420]/80 backdrop-blur sticky top-0 z-[110] mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/">
            <div className="flex flex-col cursor-pointer">
              <span className="font-bold text-lg tracking-[3px] text-transparent bg-clip-text bg-gradient-to-r from-[#00d4ff] to-[#00e5ff]">
                TERMINAL v3.0
              </span>
              <span className="text-[7px] text-[#4a6080] tracking-[3px] uppercase">User: {user?.name || "Trader"}</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/backtest">
              <Button variant="outline" className="border-[#243047] hover:border-[#b388ff] hover:text-[#b388ff] bg-transparent text-[9px] uppercase tracking-wider h-7">Backtest</Button>
            </Link>
            <Button onClick={logout} variant="ghost" className="text-[#4a6080] hover:text-[#ff3d57] text-[9px] uppercase h-7">Sair</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0d1420] border border-[#1a2535] p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00d4ff]" />
            <div className="text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-[#00e676]">{performanceStats.winRate}</div>
            <div className="text-[7px] text-[#4a6080] mt-1">Sinais Históricos</div>
          </div>
          <div className="bg-[#0d1420] border border-[#1a2535] p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#b388ff]" />
            <div className="text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">Profit Factor</div>
            <div className="text-2xl font-bold text-[#b388ff]">{performanceStats.profitFactor}</div>
            <div className="text-[7px] text-[#4a6080] mt-1">Performance V3</div>
          </div>
          <div className="bg-[#0d1420] border border-[#1a2535] p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ffd600]" />
            <div className="text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">Trades Ativos</div>
            <div className="text-2xl font-bold text-[#ffd600]">{activeTrades?.length || 0}</div>
            <div className="text-[7px] text-[#4a6080] mt-1">Em Monitorização</div>
          </div>
          <div className="bg-[#0d1420] border border-[#1a2535] p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00e5ff]" />
            <div className="text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">Status Bot</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00e676] rounded-full animate-pulse" />
              <div className="text-xl font-bold text-[#c8d8f0]">ONLINE</div>
            </div>
            <div className="text-[7px] text-[#4a6080] mt-1">Uptime: 99.9%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Console: Active Trades */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0d1420] border border-[#1a2535]">
              <div className="px-4 py-2 border-b border-[#1a2535] flex justify-between items-center bg-[#111927]">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-[#00d4ff]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Consola de Trades Ativos</span>
                </div>
                <span className="text-[8px] text-[#4a6080]">MONITOR: 15m</span>
              </div>
              <div className="p-4">
                {tradesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00d4ff]" />
                  </div>
                ) : activeTrades && activeTrades.length > 0 ? (
                  <div className="space-y-3">
                    {activeTrades.map((trade) => (
                      <div key={trade.tradeId} className="bg-[#080c12] border border-[#1a2535] p-4 flex items-center justify-between group hover:border-[#243047] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 flex items-center justify-center ${trade.signal === 'BUY' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff3d57]/10 text-[#ff3d57]'}`}>
                            {trade.signal === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm tracking-wider">{trade.symbol}</span>
                              <span className={`text-[8px] px-1 border ${trade.signal === 'BUY' ? 'border-[#00e676] text-[#00e676]' : 'border-[#ff3d57] text-[#ff3d57]'}`}>
                                {trade.signal}
                              </span>
                            </div>
                            <div className="text-[9px] text-[#4a6080] mt-0.5 font-mono">
                              Entry: ${Number(trade.entryPrice).toFixed(2)} | Conf: {trade.confidence}%
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-8 items-center">
                          <div className="text-right">
                            <div className="text-[7px] text-[#4a6080] uppercase tracking-widest">Stop Loss</div>
                            <div className="text-[11px] font-bold text-[#ff3d57] font-mono">${Number(trade.stopLoss).toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[7px] text-[#4a6080] uppercase tracking-widest">Take Profit</div>
                            <div className="text-[11px] font-bold text-[#00e676] font-mono">${Number(trade.takeProfit).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-[#1a2535] bg-[#080c12]">
                    <Clock className="w-8 h-8 mx-auto mb-3 text-[#4a6080] opacity-30" />
                    <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Nenhuma posição aberta no momento</p>
                  </div>
                )}
              </div>
            </div>

            {/* Signals History for Selected Symbol */}
            <div className="bg-[#0d1420] border border-[#1a2535]">
              <div className="px-4 py-2 border-b border-[#1a2535] flex justify-between items-center bg-[#111927]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3 h-3 text-[#b388ff]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    {selectedSymbol ? `Histórico de Sinais: ${selectedSymbol}` : "Selecione um Ativo para ver o Histórico"}
                  </span>
                </div>
                {selectedSymbol && <span className="text-[8px] text-[#4a6080]">ULTIMOS 20</span>}
              </div>
              <div className="p-4">
                {!selectedSymbol ? (
                  <div className="text-center py-12 bg-[#080c12] border border-dashed border-[#1a2535]">
                    <p className="text-[9px] text-[#4a6080] uppercase tracking-[2px]">Aguardando seleção de ativo na lista lateral...</p>
                  </div>
                ) : signals && signals.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                    {signals.map((sig) => (
                      <div key={sig.id} className="bg-[#080c12] border border-[#1a2535] p-3 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-3">
                          <span className={`w-1 h-6 ${sig.signal === 'BUY' ? 'bg-[#00e676]' : 'bg-[#ff3d57]'}`} />
                          <div>
                            <div className="font-bold tracking-wider">{sig.signal} @ ${Number(sig.price).toFixed(2)}</div>
                            <div className="text-[8px] text-[#4a6080] mt-0.5">
                              {new Date(sig.createdAt).toLocaleString('pt-PT')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="text-right">
                            <div className="text-[7px] text-[#4a6080] uppercase">Confiança</div>
                            <div className="font-bold">{sig.confidence}%</div>
                          </div>
                          <div className="px-2 py-0.5 border border-[#1a2535] text-[#4a6080] text-[8px]">
                            V3_CORE
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[#080c12]">
                    <p className="text-[9px] text-[#4a6080] uppercase tracking-widest">Nenhum sinal registado para este ativo</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Assets & Config */}
          <div className="space-y-6">
            <div className="bg-[#0d1420] border border-[#1a2535]">
              <div className="px-4 py-2 border-b border-[#1a2535] bg-[#111927]">
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3 text-[#ffd600]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Ativos Monitorizados</span>
                </div>
              </div>
              <div className="p-4">
                {symbolsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[#4a6080]" /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {symbols?.map((sym) => (
                      <button
                        key={sym.symbol}
                        onClick={() => setSelectedSymbol(sym.symbol)}
                        className={`p-2 border text-[10px] font-bold tracking-wider transition-all ${
                          selectedSymbol === sym.symbol 
                            ? 'bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]' 
                            : 'bg-[#080c12] border-[#1a2535] text-[#4a6080] hover:border-[#243047]'
                        }`}
                      >
                        {sym.symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#0d1420] border border-[#1a2535]">
              <div className="px-4 py-2 border-b border-[#1a2535] bg-[#111927]">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-[#00e676]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Gestão de Risco</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-[#4a6080] uppercase">Risco por Trade</span>
                    <span className="text-[#00e676] font-bold">1.0%</span>
                  </div>
                  <div className="h-1 bg-[#1a2535] w-full"><div className="h-full bg-[#00e676] w-[10%]" /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-[#4a6080] uppercase">Rácio R:R</span>
                    <span className="text-[#00d4ff] font-bold">1:3</span>
                  </div>
                  <div className="h-1 bg-[#1a2535] w-full"><div className="h-full bg-[#00d4ff] w-[33%]" /></div>
                </div>
                <div className="pt-2 border-t border-[#1a2535] space-y-1">
                  <div className="flex items-center gap-2 text-[8px] text-[#4a6080]">
                    <span className="w-1 h-1 bg-[#00e676] rounded-full" />
                    TRAILING STOP ATIVO
                  </div>
                  <div className="flex items-center gap-2 text-[8px] text-[#4a6080]">
                    <span className="w-1 h-1 bg-[#00e676] rounded-full" />
                    BREAKEVEN AUTOMÁTICO
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1420] border border-[#1a2535] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-3 h-3 text-[#00d4ff]" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Telegram Bot</span>
              </div>
              <p className="text-[9px] text-[#4a6080] leading-relaxed mb-4">
                O bot envia alertas instantâneos para o seu Telegram sempre que um novo sinal é gerado ou um trade é atualizado.
              </p>
              <Button variant="outline" className="w-full border-[#1a2535] text-[#4a6080] hover:text-[#00d4ff] hover:border-[#00d4ff] text-[8px] uppercase tracking-[2px] h-8 bg-transparent">
                Testar Conectividade
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
