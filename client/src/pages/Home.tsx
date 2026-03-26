import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Target, Shield, Bell, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080c12] text-[#c8d8f0] font-mono selection:bg-[#00d4ff]/30">
      {/* Estilo Global para simular o CRT do trading-backend */}
      <style dangerouslySetInnerHTML={{ __html: `
        .crt-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px);
          pointer-events: none;
          z-index: 100;
        }
        .grid-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 99;
        }
      `}} />
      <div className="crt-overlay" />
      <div className="grid-overlay" />

      <nav className="border-b border-[#1a2535] bg-[#0d1420]/80 backdrop-blur sticky top-0 z-[110]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-[3px] text-transparent bg-clip-text bg-gradient-to-r from-[#00d4ff] to-[#00e5ff]">
              STOCK SIGNAL BOT
            </span>
            <span className="text-[8px] text-[#4a6080] tracking-[3px] uppercase">Multi-Timeframe AI Agent</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="border-[#243047] hover:border-[#00d4ff] hover:text-[#00d4ff] bg-transparent text-[10px] uppercase tracking-wider h-8">Dashboard</Button>
            </Link>
            <Link href="/backtest">
              <Button variant="outline" className="border-[#243047] hover:border-[#00d4ff] hover:text-[#00d4ff] bg-transparent text-[10px] uppercase tracking-wider h-8">Backtest</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-x border-[#1a2535]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#00e676] text-[#00e676] text-[9px] tracking-widest uppercase rounded-sm">
                <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-pulse" />
                Sistema Operacional 24/7
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-none tracking-tight">
                Trading <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4ff] to-[#b388ff]">
                  Algorítmico
                </span>
              </h1>
              <p className="text-[#4a6080] text-sm leading-relaxed max-w-lg">
                Estratégia quantitativa baseada em tripla confirmação temporal (Semanal, Diário e 4H). 
                Gestão de risco automatizada com 1% por posição e rácio 1:3.
              </p>
              <div className="flex gap-4">
                <Link href="/dashboard">
                  <Button className="bg-[#00d4ff] text-[#080c12] hover:bg-[#00e5ff] rounded-none px-8 py-6 font-bold uppercase tracking-widest text-xs">
                    Ver Performance em Direto
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="border border-[#243047] bg-[#0d1420] p-6 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#00d4ff]" />
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[#1a2535] pb-2">
                    <span className="text-[10px] text-[#4a6080] tracking-widest">ESTATÍSTICAS ATUAIS</span>
                    <span className="text-[10px] text-[#00e676]">ONLINE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#111927] p-4 border border-[#1a2535]">
                      <div className="text-2xl font-bold text-[#00d4ff]">1:3</div>
                      <div className="text-[8px] text-[#4a6080] tracking-wider uppercase">Risco:Retorno</div>
                    </div>
                    <div className="bg-[#111927] p-4 border border-[#1a2535]">
                      <div className="text-2xl font-bold text-[#00e676]">1.0%</div>
                      <div className="text-[8px] text-[#4a6080] tracking-wider uppercase">Risco/Trade</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-[#4a6080] font-mono leading-relaxed bg-[#080c12] p-3 border border-[#1a2535]">
                    [LOG] 08:00:01 - Relatório diário enviado.<br />
                    [LOG] 04:00:00 - Scan MTF concluído: 42 ativos.<br />
                    [LOG] 04:00:02 - Nenhum sinal gerado. Aguardando...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Como Funciona Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-x border-b border-[#1a2535] bg-[#0d1420]/30">
          <div className="flex flex-col items-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight uppercase">Mecânica do Sistema</h2>
            <div className="w-20 h-1 bg-[#00d4ff]" />
            <p className="text-[#4a6080] text-xs uppercase tracking-[2px]">Lógica Multi-Timeframe V3</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 border border-[#1a2535] bg-[#0d1420] relative group hover:border-[#00d4ff] transition-colors">
              <div className="w-10 h-10 bg-[#00d4ff]/10 flex items-center justify-center text-[#00d4ff] mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider">Tripla Confirmação</h3>
              <p className="text-[#4a6080] text-xs leading-relaxed">
                Análise hierárquica que exige convergência: Tendência Macro (Semanal), Momentum Intermédio (Diário) e Gatilho Intraday (4H).
              </p>
              <div className="pt-4 border-t border-[#1a2535] space-y-2">
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">W1</span> <span className="text-[#c8d8f0]">RSI &lt; 50</span></div>
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">D1</span> <span className="text-[#c8d8f0]">Preço &gt; MA70</span></div>
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">H4</span> <span className="text-[#c8d8f0]">RSI &lt; 40 + MACD Div</span></div>
              </div>
            </div>

            <div className="space-y-4 p-6 border border-[#1a2535] bg-[#0d1420] relative group hover:border-[#00e676] transition-colors">
              <div className="w-10 h-10 bg-[#00e676]/10 flex items-center justify-center text-[#00e676] mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider">Gestão de Risco</h3>
              <p className="text-[#4a6080] text-xs leading-relaxed">
                Proteção rigorosa de capital com dimensionamento de posição dinâmico e ordens de saída pré-definidas.
              </p>
              <div className="pt-4 border-t border-[#1a2535] space-y-2">
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">Risco</span> <span className="text-[#00e676]">1% por posição</span></div>
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">Target</span> <span className="text-[#c8d8f0]">R:R 1:3 fixo</span></div>
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">Proteção</span> <span className="text-[#c8d8f0]">Trailing Stop + BE</span></div>
              </div>
            </div>

            <div className="space-y-4 p-6 border border-[#1a2535] bg-[#0d1420] relative group hover:border-[#ffd600] transition-colors">
              <div className="w-10 h-10 bg-[#ffd600]/10 flex items-center justify-center text-[#ffd600] mb-4">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider">Execução & Alertas</h3>
              <p className="text-[#4a6080] text-xs leading-relaxed">
                Monitorização contínua com notificações em tempo real via Telegram para sinais, alterações de stop e fecho de trades.
              </p>
              <div className="pt-4 border-t border-[#1a2535] space-y-2">
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">Scans</span> <span className="text-[#c8d8f0]">A cada 4 horas</span></div>
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">Monitor</span> <span className="text-[#c8d8f0]">A cada 15 minutos</span></div>
                <div className="flex justify-between text-[9px]"><span className="text-[#4a6080]">Relatórios</span> <span className="text-[#c8d8f0]">Diários às 08:00</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Backtest Explanation */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-x border-b border-[#1a2535]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-[#111927] border border-[#1a2535] p-2">
                <div className="bg-[#0d1420] border border-[#243047] p-4">
                  <div className="flex items-center gap-2 mb-4 border-b border-[#1a2535] pb-2">
                    <BarChart3 className="w-4 h-4 text-[#b388ff]" />
                    <span className="text-[10px] tracking-widest uppercase">Motor de Backtest</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-24 flex items-end gap-1 px-2">
                      {[40, 60, 45, 70, 55, 85, 75, 95, 80, 100].map((h, i) => (
                        <div key={i} className="flex-1 bg-[#b388ff]/20 border-t border-[#b388ff]" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[#080c12] border border-[#1a2535]">
                        <div className="text-[8px] text-[#4a6080]">WIN RATE</div>
                        <div className="text-sm font-bold text-[#00e676]">68.4%</div>
                      </div>
                      <div className="p-2 bg-[#080c12] border border-[#1a2535]">
                        <div className="text-[8px] text-[#4a6080]">PROFIT FACTOR</div>
                        <div className="text-sm font-bold text-[#00d4ff]">2.45</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2 space-y-6">
              <h2 className="text-3xl font-bold uppercase tracking-tight">Validação Histórica</h2>
              <p className="text-[#4a6080] text-sm leading-relaxed">
                O nosso sistema de backtest permite simular a estratégia MTF V3 em qualquer ativo durante os últimos 365 dias. 
                Utilizamos dados reais da Binance para calcular métricas precisas de rentabilidade, drawdown e win rate.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-xs">
                  <span className="text-[#b388ff]">◈</span> Simulação de slippage e taxas
                </li>
                <li className="flex items-center gap-3 text-xs">
                  <span className="text-[#b388ff]">◈</span> Curva de capital detalhada
                </li>
                <li className="flex items-center gap-3 text-xs">
                  <span className="text-[#b388ff]">◈</span> Otimização de parâmetros ADX/RSI
                </li>
              </ul>
              <Link href="/backtest">
                <Button variant="outline" className="border-[#b388ff] text-[#b388ff] hover:bg-[#b388ff]/10 rounded-none px-6 uppercase text-[10px] tracking-widest">
                  Iniciar Simulação
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1a2535] bg-[#0d1420] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-bold text-lg tracking-[3px] text-[#4a6080]">STOCK SIGNAL BOT</span>
            <span className="text-[8px] text-[#4a6080]/60 tracking-[2px]">EST. 2026 | QUANTITATIVE TRADING</span>
          </div>
          <div className="text-[9px] text-[#4a6080] tracking-widest uppercase">
            © 2026 Todos os direitos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}
