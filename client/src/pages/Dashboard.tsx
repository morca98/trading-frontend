import React, { useState, useMemo } from "react";
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
  Briefcase
} from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"trades" | "history" | "assets">("trades");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: dbSymbols, isLoading: symbolsLoading, error: symbolsError } = trpc.trading.getSymbols.useQuery();
  
  // Lista de ativos com fallback robusto
  const symbols = useMemo(() => {
    if (dbSymbols && dbSymbols.length > 0) return dbSymbols;
    
    // Fallback caso a DB esteja vazia ou em carregamento
    return [
      { symbol: "AAPL", sector: "Technology", region: "US" },
      { symbol: "MSFT", sector: "Technology", region: "US" },
      { symbol: "NVDA", sector: "Technology", region: "US" },
      { symbol: "TSLA", sector: "Technology", region: "US" },
      { symbol: "AMZN", sector: "Technology", region: "US" },
      { symbol: "GOOGL", sector: "Technology", region: "US" },
      { symbol: "META", sector: "Technology", region: "US" },
      { symbol: "AMD", sector: "Technology", region: "US" },
      { symbol: "NFLX", sector: "Technology", region: "US" },
      
      { symbol: "EDP.LS", sector: "Utilities", region: "PT" },
      { symbol: "JMT.LS", sector: "Retail", region: "PT" },
      { symbol: "GALP.LS", sector: "Energy", region: "PT" },
      { symbol: "BCP.LS", sector: "Financial", region: "PT" },
      
      { symbol: "PETR4.SA", sector: "Energy", region: "BR" },
      { symbol: "VALE3.SA", sector: "Materials", region: "BR" },
      { symbol: "ITUB4.SA", sector: "Financial", region: "BR" },
      { symbol: "ABEV3.SA", sector: "Consumer", region: "BR" },
      { symbol: "WEGE3.SA", sector: "Industrial", region: "BR" },

      { symbol: "ASML.AS", sector: "Euro Stoxx", region: "EU" },
      { symbol: "SAP.DE", sector: "Euro Stoxx", region: "EU" },
      { symbol: "MC.PA", sector: "Euro Stoxx", region: "EU" },
      
      { symbol: "PLTR", sector: "Growth", region: "US" },
      { symbol: "SNOW", sector: "Growth", region: "US" },
      { symbol: "CRWD", sector: "Growth", region: "US" }
    ];
  }, [dbSymbols]);

  if (symbolsError) {
    console.error("[Dashboard] Error loading symbols:", symbolsError);
  }

  const { data: globalSignals, isLoading: signalsLoading } = trpc.trading.getGlobalSignals.useQuery({ limit: 50 }, { refetchInterval: 60000 });
  const { data: performanceData } = trpc.trading.getPerformance.useQuery({ limit: 30 }, { refetchInterval: 60000 });
  
  // Processar dados para o gráfico de performance
  const chartData = useMemo(() => {
    if (!performanceData || performanceData.length === 0) {
      // Retornar dados zerados para a curva inicial
      return [
        { date: "01/03", value: 0 },
        { date: "05/03", value: 0 },
        { date: "10/03", value: 0 },
        { date: "15/03", value: 0 },
        { date: "20/03", value: 0 },
        { date: "25/03", value: 0 },
      ];
    }
    return performanceData.map(d => ({
      date: new Date(d.timestamp).toLocaleDateString("pt-PT", { day: '2-digit', month: '2-digit' }),
      value: d.pnlPercent
    }));
  }, [performanceData]);

  const filteredSymbols = symbols.filter(s => 
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.sector && s.sector.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#080c12] text-[#e1e7ef] font-mono selection:bg-[#00d4ff] selection:text-[#080c12]">
      {/* Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-[#1a2535] pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-pulse"></div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                Terminal <span className="text-[#00d4ff]">v3.0</span>
              </h1>
            </div>
            <p className="text-[10px] text-[#4a6080] tracking-[0.3em] uppercase font-bold">Live Performance Console</p>
          </div>

          <div className="flex items-center gap-4 bg-[#0d1420] border border-[#1a2535] p-2">
            <Button 
              variant="ghost" 
              className={`text-[10px] uppercase tracking-widest h-8 px-4 rounded-none ${activeTab === "trades" ? "bg-[#00d4ff] text-[#080c12]" : "text-[#4a6080]"}`}
              onClick={() => setActiveTab("trades")}
            >
              <Activity className="w-3 h-3 mr-2" />
              Trades Ativos
            </Button>
            <Button 
              variant="ghost" 
              className={`text-[10px] uppercase tracking-widest h-8 px-4 rounded-none ${activeTab === "history" ? "bg-[#00d4ff] text-[#080c12]" : "text-[#4a6080]"}`}
              onClick={() => setActiveTab("history")}
            >
              <History className="w-3 h-3 mr-2" />
              Histórico Sinais
            </Button>
            <Button 
              variant="ghost" 
              className={`text-[10px] uppercase tracking-widest h-8 px-4 rounded-none ${activeTab === "assets" ? "bg-[#00d4ff] text-[#080c12]" : "text-[#4a6080]"}`}
              onClick={() => setActiveTab("assets")}
            >
              <Globe className="w-3 h-3 mr-2" />
              Ativos Monitorizados
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {activeTab === "trades" && (
              <>
                {/* Performance Chart */}
                <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <LineChart className="w-24 h-24 text-[#00d4ff]" />
                  </div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-[#00d4ff]" />
                      <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Curva de Performance (P&L %)</h2>
                    </div>
                    <span className="text-[8px] text-[#00d4ff] animate-pulse font-bold tracking-tighter">LIVE DATA FEED</span>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#4a6080" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="#4a6080" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0d1420', border: '1px solid #1a2535', fontSize: '10px' }}
                          itemStyle={{ color: '#00d4ff' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#00d4ff" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorPnl)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active Trades Table */}
                <div className="bg-[#0d1420] border border-[#1a2535]">
                  <div className="p-4 border-b border-[#1a2535] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-[#00d4ff]" />
                      <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Monitorização em Tempo Real</h2>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#080c12]">
                          <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Ativo</th>
                          <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Entrada</th>
                          <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Preço Atual</th>
                          <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Stop Loss</th>
                          <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Take Profit</th>
                          <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="group hover:bg-[#111a27] transition-colors">
                          <td colSpan={6} className="p-12 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-8 h-8 border-2 border-[#1a2535] border-t-[#00d4ff] rounded-full animate-spin"></div>
                              <p className="text-[10px] text-[#4a6080] uppercase tracking-[0.3em]">Aguardando Sinais de Entrada...</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === "history" && (
              <div className="bg-[#0d1420] border border-[#1a2535]">
                <div className="p-4 border-b border-[#1a2535] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-[#00d4ff]" />
                    <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Histórico Global de Sinais</h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#080c12]">
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Data</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Ativo</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Tipo</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Preço</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Status</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signalsLoading ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-8 h-8 border-2 border-[#1a2535] border-t-[#00d4ff] rounded-full animate-spin"></div>
                              <p className="text-[10px] text-[#4a6080] uppercase tracking-[0.3em]">Carregando Histórico...</p>
                            </div>
                          </td>
                        </tr>
                      ) : !globalSignals || globalSignals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-[10px] text-[#4a6080] uppercase tracking-[0.3em]">
                            Nenhum sinal registado no histórico.
                          </td>
                        </tr>
                      ) : (
                        globalSignals.map((signal, i) => (
                          <tr key={i} className="group hover:bg-[#111a27] transition-colors border-b border-[#1a2535]/30">
                            <td className="p-4 text-[10px] text-[#4a6080]">{new Date(signal.timestamp).toLocaleString()}</td>
                            <td className="p-4 text-[10px] font-bold">{signal.symbol}</td>
                            <td className="p-4">
                              <span className={`text-[8px] px-2 py-0.5 font-bold uppercase ${signal.type === 'BUY' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'bg-purple-500/10 text-purple-500'}`}>
                                {signal.type}
                              </span>
                            </td>
                            <td className="p-4 text-[10px]">{signal.price.toFixed(2)}</td>
                            <td className="p-4 text-[10px] text-[#4a6080]">{signal.status}</td>
                            <td className="p-4 text-[10px] font-bold text-[#00d4ff]">--</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "assets" && (
              <div className="bg-[#0d1420] border border-[#1a2535]">
                <div className="p-4 border-b border-[#1a2535] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-[#00d4ff]" />
                    <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Ativos Monitorizados ({symbols.length})</h2>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#4a6080]" />
                    <input 
                      type="text" 
                      placeholder="FILTRAR ATIVOS..."
                      className="bg-[#080c12] border border-[#1a2535] pl-8 pr-4 py-1.5 text-[10px] text-[#e1e7ef] focus:outline-none focus:border-[#00d4ff] w-full md:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#080c12] sticky top-0 z-20">
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Símbolo</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Setor</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Região</th>
                        <th className="p-4 text-[9px] font-bold text-[#4a6080] uppercase tracking-widest border-b border-[#1a2535]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {symbolsLoading && symbols.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-[10px] text-[#4a6080] uppercase tracking-[0.3em]">
                            Carregando Lista de Ativos...
                          </td>
                        </tr>
                      ) : filteredSymbols.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-[10px] text-[#4a6080] uppercase tracking-[0.3em]">
                            Nenhum ativo encontrado para a pesquisa.
                          </td>
                        </tr>
                      ) : (
                        filteredSymbols.map((s, i) => (
                          <tr key={i} className="group hover:bg-[#111a27] transition-colors border-b border-[#1a2535]/30">
                            <td className="p-4 text-[10px] font-bold text-[#00d4ff]">{s.symbol}</td>
                            <td className="p-4 text-[10px] text-[#4a6080] uppercase">{s.sector || "General"}</td>
                            <td className="p-4 text-[10px] text-[#4a6080]">{s.region || "US"}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-pulse"></div>
                                <span className="text-[8px] text-[#00d4ff] font-bold uppercase">Monitorizando</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target className="w-16 h-16 text-[#00d4ff]" />
                </div>
                <p className="text-[9px] text-[#4a6080] uppercase tracking-widest mb-4">Win Rate</p>
                <h3 className="text-4xl font-black tracking-tighter text-[#00d4ff]">0.0%</h3>
                <p className="text-[8px] text-[#4a6080] mt-2 uppercase tracking-tighter">Baseado em 0 sinais</p>
              </div>

              <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <PieChart className="w-16 h-16 text-purple-500" />
                </div>
                <p className="text-[9px] text-[#4a6080] uppercase tracking-widest mb-4">Profit Factor</p>
                <h3 className="text-4xl font-black tracking-tighter text-purple-500">0.00</h3>
                <p className="text-[8px] text-[#4a6080] mt-2 uppercase tracking-tighter">Performance V3 MTF</p>
              </div>

              <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Briefcase className="w-16 h-16 text-yellow-500" />
                </div>
                <p className="text-[9px] text-[#4a6080] uppercase tracking-widest mb-4">Total Trades</p>
                <h3 className="text-4xl font-black tracking-tighter text-yellow-500">0</h3>
                <p className="text-[8px] text-[#4a6080] mt-2 uppercase tracking-tighter">Sinais gerados pelo bot</p>
              </div>

              <div className="bg-[#0d1420] border border-[#1a2535] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap className="w-16 h-16 text-yellow-500" />
                </div>
                <p className="text-[9px] text-[#4a6080] uppercase tracking-widest mb-4">Trades Ativos</p>
                <h3 className="text-4xl font-black tracking-tighter text-yellow-500">0</h3>
                <p className="text-[8px] text-[#4a6080] mt-2 uppercase tracking-tighter">Em monitorização real</p>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-[#0d1420] border border-[#1a2535] p-6">
              <p className="text-[9px] text-[#4a6080] uppercase tracking-widest mb-4">Status Bot</p>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-pulse"></div>
                <span className="text-xl font-black tracking-tighter uppercase italic">Online</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#1a2535]/50 pb-2">
                  <span className="text-[9px] text-[#4a6080] uppercase">Uptime</span>
                  <span className="text-[10px] font-bold">100% (24/7)</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#1a2535]/50 pb-2">
                  <span className="text-[9px] text-[#4a6080] uppercase">Gestão Risco</span>
                  <span className="text-[10px] font-bold text-[#00d4ff]">1% / POSIÇÃO</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#1a2535]/50 pb-2">
                  <span className="text-[9px] text-[#4a6080] uppercase">Rácio R:R</span>
                  <span className="text-[10px] font-bold text-[#00d4ff]">1:3.0</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#1a2535]/50 pb-2">
                  <span className="text-[9px] text-[#4a6080] uppercase">Trailing Stop</span>
                  <span className="text-[10px] font-bold text-[#00d4ff]">ATIVO (2%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
