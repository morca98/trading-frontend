import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { TrendingUp, BarChart3, Zap, Shield } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              📈
            </div>
            <span className="font-bold text-lg">Stock Signal Bot</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Link href="/backtest">
                  <Button variant="outline">Backtest</Button>
                </Link>
                <Button onClick={logout} variant="ghost">
                  Logout
                </Button>
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Login</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Trading Automático com{" "}
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Análise Técnica
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema inteligente de sinais de trading com gestão automática de risco, notificações via Telegram e
            monitorização contínua de múltiplos mercados.
          </p>

          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                <TrendingUp className="w-5 h-5" />
                Ir para Dashboard
              </Button>
            </Link>
          ) : (
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Começar Agora</a>
            </Button>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Funcionalidades Principais</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle>Análise Técnica</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Indicadores avançados: RSI, ADX, EMA Crossover, ATR e detecção de suporte/resistência
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Gestão de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Stop Loss dinâmico, Trailing Stop progressivo e Breakeven automático para proteção de lucros
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-8 h-8 text-yellow-600 mb-2" />
              <CardTitle>Sinais em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Notificações instantâneas via Telegram com formatação HTML e métricas detalhadas
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle>Dashboard Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Visualização de sinais históricos, estatísticas de performance e configuração de símbolos
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Monitorização Contínua</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Scan de sinais a cada 4 horas</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Verificação de TP/SL a cada 15 minutos</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Relatório diário automático às 08:00 UTC</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Cooldown inteligente de 90 minutos entre sinais</span>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Símbolos Suportados</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-sm text-muted-foreground mb-2">🇺🇸 US</p>
                <p className="text-sm">AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, AMD</p>
              </div>
              <div>
                <p className="font-semibold text-sm text-muted-foreground mb-2">🇵🇹 Portugal</p>
                <p className="text-sm">EDP.LS, GALP.LS, BCP.LS, EDPR.LS, NOS.LS</p>
              </div>
              <div>
                <p className="font-semibold text-sm text-muted-foreground mb-2">🇪🇺 Europa</p>
                <p className="text-sm">ASML.AS, SAP.DE, MC.PA, OR.PA, TTE.PA</p>
              </div>
              <div>
                <p className="font-semibold text-sm text-muted-foreground mb-2">🇧🇷 Brasil</p>
                <p className="text-sm">PETR4.SA, VALE3.SA, ITUB4.SA, BBDC4.SA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Pronto para começar?</CardTitle>
            <CardDescription>
              Aceda ao dashboard e configure seus símbolos para começar a receber sinais de trading
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg">Ir para Dashboard</Button>
              </Link>
            ) : (
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>Fazer Login</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="border-t bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>© 2026 Stock Signal Bot. Desenvolvido com análise técnica avançada.</p>
        </div>
      </footer>
    </div>
  );
}
