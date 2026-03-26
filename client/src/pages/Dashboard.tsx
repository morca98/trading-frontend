import React, { useState, useMemo } from "react";
import { TickerManager } from "../components/TickerManager";
import { 
  TrendingUp, 
  History, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Shield, 
  Target, 
  Clock, 
  Zap, 
  CheckCircle2, 
  Search,
  LayoutDashboard,
  BarChart3,
  LineChart,
  PieChart,
  Globe,
  Briefcase,
  RefreshCw,
  Play
} from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"trades" | "history" | "assets" | "tickers">("trades");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: dbSymbols, isLoading: symbolsLoading } = trpc.trading.getSymbols.useQuery();
  
  const symbols = useMemo(() => {
    if (dbSymbols && dbSymbols.length > 0) return dbSymbols;
    return [
      { symbol: "AAPL", sector: "Technology", region: "US" },
      { symbol: "MSFT", sector: "Technology", region: "US" },
      { symbol: "NVDA", sector: "Technology", region: "US" },
      { symbol: "TSLA", sector: "Technology", region: "US" },
      { symbol: "AMZN", sector: "Technology", region: "US" },
    ];
  }, [dbSymbols]);

  const filteredSymbols = useMemo(() => {
    return symbols.filter(s => 
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.sector && s.sector.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [symbols, searchTerm]);

  return (
    <div className="min-h-screen bg-[#080c12] text-[#c8d8f0] font-mono selection:bg-[#00d4ff]/30">
      <div className="max-w-[1200px] mx-auto p-4 md:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-[#1a2535] gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-[4px] text-[#00d4ff]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              TERMINAL DE TRADING
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2 px-3 py-1 border border-[#00e676] text-[#00e676] rounded text-[9px] tracking-[2px]">
                <div className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-pulse"></div>
                LIVE
              </div>
              <span className="text-[10px] text-[#4a6080] tracking-[1px]">ESTADO: OPERACIONAL V3.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-[#1a2535] bg-[#0d1420] text-[#4a6080] hover:text-[#00d4ff] hover:border-[#00d4ff] text-[10px] tracking-[1px] h-9">
              <RefreshCw className="w-3 h-3 mr-2" /> REFRESH
            </Button>
            <Button className="bg-[#00d4ff] text-[#080c12] hover:bg-[#00e5ff] text-[10px] font-bold tracking-[1px] h-9">
              <Play className="w-3 h-3 mr-2 fill-current" /> ANALISAR AGORA
            </Button>
          </div>
        </div>

        {/* Price Row (Simulated) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00d4ff]"></div>
            <p className="text-[9px] text-[#4a6080] uppercase tracking-[2px] mb-2">BTC / USDT</p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold tracking-[2px] text-[#c8d8f0]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>$68,902.86</h2>
              <span className="text-[11px] text-[#ff3d57] bg-[#ff3d57]/10 px-2 py-0.5 border border-[#ff3d57]/20 rounded">-3.85%</span>
            </div>
          </div>
          <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#b388ff]"></div>
            <p className="text-[9px] text-[#4a6080] uppercase tracking-[2px] mb-2">ETH / USDT</p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold tracking-[2px] text-[#c8d8f0]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>$3,452.12</h2>
              <span className="text-[11px] text-[#00e676] bg-[#00e676]/10 px-2 py-0.5 border border-[#00e676]/20 rounded">+1.24%</span>
            </div>
          </div>
          <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ffd600]"></div>
            <p className="text-[9px] text-[#4a6080] uppercase tracking-[2px] mb-2">CAPITAL INICIAL</p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold tracking-[2px] text-[#c8d8f0]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>$10,000.00</h2>
              <span className="text-[11px] text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-0.5 border border-[#00d4ff]/20 rounded">RISCO 1%</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Navigation & Content */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-[#1a2535] overflow-x-auto no-scrollbar">
              {[
                { id: "trades", label: "SINAIS ATIVOS", icon: Zap },
                { id: "history", label: "HISTÓRICO", icon: History },
                { id: "assets", label: "ATIVOS", icon: Globe },
                { id: "tickers", label: "CONFIG", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-[10px] font-bold tracking-[2px] transition-all border-b-2 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? "text-[#00d4ff] border-[#00d4ff] bg-[#00d4ff]/5" 
                      : "text-[#4a6080] border-transparent hover:text-[#c8d8f0]"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content: Trades */}
            {activeTab === "trades" && (
              <div className="space-y-4">
                <div className="bg-[#0d1420] border border-[#1a2535] p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#111927] border border-[#1a2535] mb-6">
                    <Search className="w-6 h-6 text-[#4a6080]" />
                  </div>
                  <h3 className="text-sm font-bold tracking-[3px] text-[#c8d8f0] uppercase mb-2">Aguardando Sinais</h3>
                  <p className="text-[10px] text-[#4a6080] tracking-[1px] max-w-xs mx-auto uppercase">
                    O bot está a monitorizar 143 ativos. Novos sinais aparecerão aqui automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Tab Content: History */}
            {activeTab === "history" && (
              <div className="bg-[#0d1420] border border-[#1a2535] overflow-hidden">
                <div className="p-4 border-b border-[#1a2535] bg-[#080c12]">
                  <h2 className="text-[10px] font-bold tracking-[2px] text-[#4a6080] uppercase">Últimos Trades Concluídos</h2>
                </div>
                <div className="divide-y divide-[#1a2535]">
                  {[
                    { date: "03-25 13:27", sym: "BTC/USDT", type: "BUY", res: "LOSS", pnl: "-0.97%" },
                    { date: "03-25 08:57", sym: "ETH/USDT", type: "BUY", res: "LOSS", pnl: "-1.26%" },
                  ].map((trade, i) => (
                    <div key={i} className="grid grid-cols-5 p-4 text-[10px] items-center hover:bg-[#111927] transition-colors">
                      <span className="text-[#4a6080]">{trade.date}</span>
                      <span className="font-bold text-[#c8d8f0]">{trade.sym}</span>
                      <span className="text-[#00e676] font-bold">{trade.type}</span>
                      <span className="text-[#ff3d57] font-bold">{trade.res}</span>
                      <span className="text-right font-mono text-[#ff3d57]">{trade.pnl}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Content: Assets */}
            {activeTab === "assets" && (
              <div className="bg-[#0d1420] border border-[#1a2535]">
                <div className="p-4 border-b border-[#1a2535] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-[#00d4ff]" />
                    <h2 className="text-[10px] font-bold tracking-[2px] uppercase">Ativos Monitorizados ({symbols.length})</h2>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#4a6080]" />
                    <input 
                      type="text" 
                      placeholder="FILTRAR ATIVOS..."
                      className="bg-[#080c12] border border-[#1a2535] pl-8 pr-4 py-1.5 text-[10px] text-[#c8d8f0] focus:outline-none focus:border-[#00d4ff] w-full md:w-64 font-mono"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#080c12] sticky top-0 z-20">
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Símbolo</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Setor</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a2535]/30">
                      {filteredSymbols.map((s, i) => (
                        <tr key={i} className="group hover:bg-[#111a27] transition-colors">
                          <td className="p-4 text-[10px] font-bold text-[#00d4ff]">{s.symbol}</td>
                          <td className="p-4 text-[10px] text-[#4a6080] uppercase">{s.sector || "General"}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-[#00e676] rounded-full animate-pulse"></div>
                              <span className="text-[8px] text-[#00e676] font-bold uppercase tracking-[1px]">Ativo</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab Content: Tickers */}
            {activeTab === "tickers" && (
              <TickerManager />
            )}
          </div>

          {/* Right Column: Stats & Info */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0d1420] border border-[#1a2535] p-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00e676]"></div>
                <p className="text-[8px] text-[#4a6080] uppercase tracking-[2px] mb-1">Win Rate</p>
                <h4 className="text-2xl font-bold text-[#c8d8f0]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>0%</h4>
              </div>
              <div className="bg-[#0d1420] border border-[#1a2535] p-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#ff3d57]"></div>
                <p className="text-[8px] text-[#4a6080] uppercase tracking-[2px] mb-1">P&L Total</p>
                <h4 className="text-2xl font-bold text-[#c8d8f0]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>0.00%</h4>
              </div>
            </div>

            {/* Bot Logic Card */}
            <div className="bg-[#0d1420] border border-[#1a2535] overflow-hidden">
              <div className="p-4 border-b border-[#1a2535] bg-[#080c12] flex items-center gap-2">
                <Shield className="w-3 h-3 text-[#00d4ff]" />
                <h2 className="text-[10px] font-bold tracking-[2px] text-[#c8d8f0] uppercase">Configuração V3</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] uppercase tracking-[1px]">
                    <span className="text-[#4a6080]">Timeframe</span>
                    <span className="text-[#c8d8f0] font-bold">4H / 1D / 1W</span>
                  </div>
                  <div className="flex justify-between text-[9px] uppercase tracking-[1px]">
                    <span className="text-[#4a6080]">Risco p/ Trade</span>
                    <span className="text-[#00d4ff] font-bold">1.0% ($100)</span>
                  </div>
                  <div className="flex justify-between text-[9px] uppercase tracking-[1px]">
                    <span className="text-[#4a6080]">Rácio R:R</span>
                    <span className="text-[#00d4ff] font-bold">1:3.0</span>
                  </div>
                  <div className="flex justify-between text-[9px] uppercase tracking-[1px]">
                    <span className="text-[#4a6080]">Trailing Stop</span>
                    <span className="text-[#ff3d57] font-bold">DESATIVADO</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-[#1a2535]/50">
                  <p className="text-[8px] text-[#4a6080] uppercase tracking-[1px] leading-relaxed">
                    Estratégia baseada em 5 filtros MTF: RSI Semanal, SMA70 Diária, RSI 4H, Divergência MACD e Confirmação de Vela HH+HL.
                  </p>
                </div>
              </div>
            </div>

            {/* Terminal Log (Simulated) */}
            <div className="bg-[#080c12] border border-[#1a2535] rounded p-4 font-mono text-[9px] h-48 overflow-y-auto custom-scrollbar">
              <div className="text-[#4a6080] mb-1">[17:11:31] INICIALIZANDO ENGINE...</div>
              <div className="text-[#00d4ff] mb-1">[17:11:32] TELEGRAM CONECTADO</div>
              <div className="text-[#c8d8f0] mb-1">[17:11:33] MONITORIZANDO 143 ATIVOS</div>
              <div className="text-[#4a6080] mb-1">[17:11:35] SCAN COMPLETO: NENHUM SINAL</div>
              <div className="text-[#00e676] mb-1">[17:15:00] VERIFICANDO TRADES ATIVOS...</div>
              <div className="text-[#4a6080] mb-1">[17:15:01] NENHUM TRADE EM ABERTO</div>
              <div className="animate-pulse text-[#00d4ff]">_</div>
            </div>

          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #080c12; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a2535; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #00d4ff; }
      `}} />
    </div>
  );
}
