/**
 * Backtest de 1 ano - Script standalone para testar a estratégia
 * Usa dados simulados mas com padrão realista
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runBacktest } from './server/trading/backtest.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Gerar dados históricos simulados (1 ano = ~252 dias úteis)
function generateHistoricalData(symbol, days = 365) {
  const candles = [];
  const now = Date.now();
  let price = 100;
  
  for (let i = days; i >= 0; i--) {
    const time = now - (i * 24 * 60 * 60 * 1000);
    
    // Simular movimento realista com drift e volatilidade
    const drift = 0.0003; // 0.03% ao dia
    const volatility = 0.02; // 2% volatilidade
    const random = Math.random();
    
    const change = drift + volatility * (random - 0.5);
    price = price * (1 + change);
    
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const close = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = 1000000 + Math.random() * 500000;
    
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
  }
  
  return candles;
}

async function runYearBacktest() {
  console.log('🚀 Iniciando backtest de 1 ano...\n');
  
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];
  const results = [];
  
  for (const symbol of symbols) {
    try {
      console.log(`📊 Testando ${symbol}...`);
      
      const candles = generateHistoricalData(symbol, 365);
      const result = await runBacktest(symbol, candles);
      
      const metrics = result.metrics;
      
      results.push({
        symbol,
        metrics
      });
      
      console.log(`
✅ ${symbol} - Resultados:
   Total de Trades: ${metrics.totalTrades}
   Win Rate: ${metrics.winRate}%
   Profit Factor: ${metrics.profitFactor}
   P&L Total: $${metrics.totalPnL.toFixed(2)} (${metrics.totalPnLPct.toFixed(2)}%)
   Sharpe Ratio: ${metrics.sharpeRatio}
   Drawdown Máximo: ${metrics.maxDrawdown}%
   Melhor Trade: +${metrics.bestTrade}%
   Pior Trade: ${metrics.worstTrade}%
      `);
      
    } catch (error) {
      console.error(`❌ Erro ao testar ${symbol}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  // Resumo comparativo
  console.log('\n' + '='.repeat(60));
  console.log('📈 RESUMO COMPARATIVO - 1 ANO DE BACKTEST');
  console.log('='.repeat(60) + '\n');
  
  results.sort((a, b) => b.metrics.profitFactor - a.metrics.profitFactor);
  
  for (const result of results) {
    const m = result.metrics;
    const status = m.profitFactor > 1.5 ? '✅' : m.profitFactor > 1 ? '⚠️' : '❌';
    console.log(`${status} ${result.symbol.padEnd(8)} | PF: ${m.profitFactor.toFixed(2).padEnd(5)} | WR: ${m.winRate.toFixed(1)}% | P&L: ${m.totalPnLPct.toFixed(1)}% | Trades: ${m.totalTrades}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Interpretação:');
  console.log('  ✅ Profit Factor > 1.5: Estratégia com boa relação risco/recompensa');
  console.log('  ⚠️  Profit Factor 1.0-1.5: Estratégia marginal, requer otimização');
  console.log('  ❌ Profit Factor < 1.0: Estratégia com perdas');
  console.log('='.repeat(60) + '\n');
}

runYearBacktest().catch(console.error);
