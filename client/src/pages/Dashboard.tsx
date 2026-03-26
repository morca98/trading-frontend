import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { data: activeTrades, isLoading: tradesLoading } = trpc.trading.getActiveTrades.useQuery();
  const { data: symbols, isLoading: symbolsLoading } = trpc.trading.getSymbols.useQuery();
  const { data: signals } = trpc.trading.getSignals.useQuery(
    selectedSymbol ? { symbol: selectedSymbol, limit: 20 } : { symbol: "", limit: 0 },
    { enabled: !!selectedSymbol }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Faça login para acessar o dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">📊 Stock Signal Bot Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo, {user?.name || "Trader"}</p>
          </div>
          <a href="/backtest">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              📈 Backtest
            </button>
          </a>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trades Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTrades?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Posições abertas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Símbolos Monitorados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{symbols?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Em vigilância contínua</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status do Bot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Online</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Operacional 24/7</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Trades */}
        <Card>
          <CardHeader>
            <CardTitle>🟢 Trades Ativos</CardTitle>
            <CardDescription>Posições abertas com SL e TP</CardDescription>
          </CardHeader>
          <CardContent>
            {tradesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeTrades && activeTrades.length > 0 ? (
              <div className="space-y-4">
                {activeTrades.map((trade) => (
                  <div
                    key={trade.tradeId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {trade.signal === "BUY" ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-semibold">{trade.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {trade.signal === "BUY" ? "Compra" : "Venda"} @ ${Number(trade.entryPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">SL</p>
                        <p className="font-mono text-sm">${Number(trade.stopLoss).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">TP</p>
                        <p className="font-mono text-sm">${Number(trade.takeProfit).toFixed(2)}</p>
                      </div>
                      <Badge variant={trade.confidence > 70 ? "default" : "secondary"}>
                        {trade.confidence}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Sem trades ativos no momento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Symbols & Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Symbols List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📈 Símbolos</CardTitle>
              <CardDescription>Clique para ver sinais</CardDescription>
            </CardHeader>
            <CardContent>
              {symbolsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : symbols && symbols.length > 0 ? (
                <div className="space-y-2">
                  {symbols.map((sym) => (
                    <Button
                      key={sym.symbol}
                      variant={selectedSymbol === sym.symbol ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedSymbol(sym.symbol)}
                    >
                      {sym.symbol}
                      <span className="text-xs ml-auto bg-muted px-2 py-1 rounded">{sym.region}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum símbolo configurado</p>
              )}
            </CardContent>
          </Card>

          {/* Signals */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedSymbol ? `📊 Sinais - ${selectedSymbol}` : "📊 Sinais"}
              </CardTitle>
              <CardDescription>Histórico de sinais gerados</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSymbol ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Selecione um símbolo para ver os sinais</p>
                </div>
              ) : signals && signals.length > 0 ? (
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <div
                      key={signal.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        {signal.signal === "BUY" ? (
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">
                            {signal.signal === "BUY" ? "🟢 BUY" : "🔴 SELL"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(signal.createdAt).toLocaleString("pt-PT")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">${Number(signal.price).toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {signal.confidence}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum sinal gerado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SMA70 Filter Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📊 Filtro SMA70 Diário</CardTitle>
            <CardDescription>Condições macro para geração de sinais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 dark:bg-green-950 dark:border-green-800">
                <p className="font-semibold text-green-900 dark:text-green-100 mb-2">✅ Sinais BUY</p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Apenas quando preço diário está acima da SMA70 (uptrend confirmado)
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 dark:bg-orange-950 dark:border-orange-800">
                <p className="font-semibold text-orange-900 dark:text-orange-100 mb-2">⚠️ Sinais SELL</p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Permitidos em qualquer condição (proteção de lucros)
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📈 Resultado</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  34% win rate, 200+ profit factor em backtests
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-muted/50 border-muted">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold mb-1">⏱️ Frequência de Scan</p>
                <p className="text-muted-foreground">A cada 4 horas</p>
              </div>
              <div>
                <p className="font-semibold mb-1">🔍 Verificação de Trades</p>
                <p className="text-muted-foreground">A cada 15 minutos</p>
              </div>
              <div>
                <p className="font-semibold mb-1">📋 Relatório Diário</p>
                <p className="text-muted-foreground">08:00 UTC (09:00 Lisbon)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
