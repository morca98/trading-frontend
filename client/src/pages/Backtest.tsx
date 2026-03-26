import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

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
  const { isAuthenticated } = useAuth();
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
          period: `${days} days`,
          metrics: res.results[0].metrics,
        });
      }
    } catch (error) {
      console.error("Comparison failed:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">📊 Backtest de Estratégia</h1>
          <p className="text-muted-foreground">Valide a estratégia com dados históricos</p>
        </div>

        {/* Input Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuração de Backtest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Símbolo</label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="AAPL"
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Período (dias)</label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  min={30}
                  max={365}
                  className="mt-2"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleBacktest} disabled={backtestMutation.isPending} className="w-full">
                  {backtestMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Executar Backtest"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compare Multiple Symbols */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparar Símbolos</CardTitle>
            <CardDescription>Separe os símbolos com vírgula</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  value={compareSymbols}
                  onChange={(e) => setCompareSymbols(e.target.value)}
                  placeholder="AAPL,MSFT,NVDA"
                />
              </div>
              <Button onClick={handleCompare} disabled={compareMutation.isPending}>
                {compareMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Comparando...
                  </>
                ) : (
                  "Comparar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Resultados - {result.symbol} ({result.period})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Trades */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total de Trades</p>
                  <p className="text-2xl font-bold">{result.metrics.totalTrades}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <Badge variant="default" className="bg-green-600">
                      W: {result.metrics.winTrades}
                    </Badge>
                    <Badge variant="destructive">L: {result.metrics.lossTrades}</Badge>
                  </div>
                </div>

                {/* Win Rate */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Taxa de Ganho</p>
                  <p className="text-2xl font-bold">{result.metrics.winRate.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {result.metrics.winRate >= 50 ? "✓ Positivo" : "✗ Negativo"}
                  </p>
                </div>

                {/* Profit Factor */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Profit Factor</p>
                  <p className="text-2xl font-bold">{result.metrics.profitFactor.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {result.metrics.profitFactor > 1.5 ? "✓ Excelente" : result.metrics.profitFactor > 1 ? "✓ Bom" : "✗ Fraco"}
                  </p>
                </div>

                {/* Total P&L */}
                <div className={`p-4 border rounded-lg ${result.metrics.totalPnL >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="text-sm text-muted-foreground mb-1">P&L Total</p>
                  <p className={`text-2xl font-bold ${result.metrics.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${result.metrics.totalPnL.toFixed(2)}
                  </p>
                  <p className={`text-xs mt-2 ${result.metrics.totalPnLPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {result.metrics.totalPnLPct >= 0 ? "+" : ""}
                    {result.metrics.totalPnLPct.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Ganho Médio</p>
                  <p className="text-lg font-bold text-green-600">${result.metrics.avgWin.toFixed(2)}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Perda Média</p>
                  <p className="text-lg font-bold text-red-600">${result.metrics.avgLoss.toFixed(2)}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Drawdown Máximo</p>
                  <p className="text-lg font-bold text-orange-600">{result.metrics.maxDrawdown.toFixed(2)}%</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Sharpe Ratio</p>
                  <p className="text-lg font-bold">{result.metrics.sharpeRatio.toFixed(2)}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Sortino Ratio</p>
                  <p className="text-lg font-bold">{result.metrics.sortino.toFixed(2)}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Melhor Trade</p>
                  <p className="text-lg font-bold text-green-600">+{result.metrics.bestTrade.toFixed(2)}%</p>
                </div>
              </div>

              {/* Interpretation */}
              <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                <p className="font-semibold">📊 Interpretação:</p>
                <ul className="text-sm space-y-1">
                  <li>
                    • <strong>Profit Factor &gt; 1.5:</strong> Estratégia com boa relação risco/recompensa
                  </li>
                  <li>
                    • <strong>Win Rate &gt; 50%:</strong> Mais ganhos que perdas
                  </li>
                  <li>
                    • <strong>Sharpe Ratio &gt; 1:</strong> Retorno ajustado ao risco satisfatório
                  </li>
                  <li>
                    • <strong>Drawdown &lt; 20%:</strong> Redução de risco aceitável
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              💡 O backtest utiliza dados históricos de 2 anos. Os resultados passados não garantem performance futura. Sempre
              teste com capital pequeno antes de aumentar o investimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
