/**
 * Backtest de 1 ano com dados realistas
 * Gera dados com padrões técnicos que acionam sinais
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runBacktest } from './server/trading/backtest.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gera dados históricos com padrões técnicos realistas
 * Inclui: trends, consolidações, breakouts, pullbacks
 */
function generateRealisticData(symbol, days = 365) {
  const candles = [];
  const now = Date.now();
  let price = 100;
  
  // Parâmetros de mercado
  const trendPhases = [
    { duration: 60, direction: 1, volatility: 0.015 },   // Uptrend
    { duration: 30, direction: 0, volatility: 0.008 },   // Consolidação
    { duration: 50, direction: 1, volatility: 0.02 },    // Uptrend forte
    { duration: 40, direction: -1, volatility: 0.018 },  // Downtrend
    { duration: 25, direction: 0, volatility: 0.01 },    // Consolidação
    { duration: 45, direction: 1, volatility: 0.016 },   // Uptrend
    { duration: 35, direction: -1, volatility: 0.015 },  // Downtrend
    { duration: 50, direction: 1, volatility: 0.017 },   // Uptrend
    { duration: 30, direction: 0, volatility: 0.009 },   // Consolidação
    { duration: 55, direction: 1, volatility: 0.019 },   // Uptrend forte
  ];
  
  let dayCounter = 0;
  let phaseIndex = 0;
  let currentPhase = trendPhases[0];
  let phaseCounter = 0;
  
  for (let i = days; i >= 0; i--) {
    const time = now - (i * 24 * 60 * 60 * 1000);
    
    // Atualizar fase
    if (phaseCounter >= currentPhase.duration) {
      phaseIndex = (phaseIndex + 1) % trendPhases.length;
      currentPhase = trendPhases[phaseIndex];
      phaseCounter = 0;
    }
    
    // Calcular mudança de preço
    const baseDrift = currentPhase.direction * 0.0008; // Drift baseado na fase
    const randomWalk = (Math.random() - 0.5) * currentPhase.volatility;
    const change = baseDrift + randomWalk;
    
    price = price * (1 + change);
    
    // Adicionar ruído realista (wicks)
    const open = price * (1 + (Math.random() - 0.5) * 0.005);
    const close = price * (1 + (Math.random() - 0.5) * 0.005);
    
    // High/Low com wicks realistas
    const range = Math.abs(close - open) * 0.5;
    const high = Math.max(open, close) + range + Math.random() * range * 0.5;
    const low = Math.min(open, close) - range - Math.random() * range * 0.5;
    
    // Volume com padrão realista (maior em breakouts)
    const baseVolume = 1000000;
    const volatilityMultiplier = 1 + Math.abs(change) * 50; // Mais volume em movimentos grandes
    const volume = baseVolume * volatilityMultiplier * (0.8 + Math.random() * 0.4);
    
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
    
    dayCounter++;
    phaseCounter++;
  }
  
  return candles;
}

async function runRealisticBacktest() {
  console.log('🚀 Iniciando backtest de 1 ano com dados realistas...\n');
  
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];
  const results = [];
  
  for (const symbol of symbols) {
    try {
      console.log(`📊 Testando ${symbol}...`);
      
      const candles = generateRealisticData(symbol, 365);
      const result = await runBacktest(symbol, candles);
      
      const metrics = result.metrics;
      
      results.push({
        symbol,
        metrics,
        trades: result.trades.length
      });
      
      console.log(`
✅ ${symbol} - Resultados:
   Total de Trades: ${metrics.totalTrades}
   Ganhos: ${metrics.winTrades} | Perdas: ${metrics.lossTrades}
   Win Rate: ${metrics.winRate}%
   Profit Factor: ${metrics.profitFactor}
   P&L Total: $${metrics.totalPnL.toFixed(2)} (${metrics.totalPnLPct.toFixed(2)}%)
   Avg Win: $${metrics.avgWin.toFixed(2)} | Avg Loss: $${metrics.avgLoss.toFixed(2)}
   Sharpe Ratio: ${metrics.sharpeRatio}
   Sortino Ratio: ${metrics.sortino}
   Drawdown Máximo: ${metrics.maxDrawdown}%
   Melhor Trade: +${metrics.bestTrade}%
   Pior Trade: ${metrics.worstTrade}%
      `);
      
    } catch (error) {
      console.error(`❌ Erro ao testar ${symbol}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  // Resumo comparativo
  console.log('\n' + '='.repeat(80));
  console.log('📈 RESUMO COMPARATIVO - 1 ANO DE BACKTEST (Dados Realistas)');
  console.log('='.repeat(80) + '\n');
  
  results.sort((a, b) => b.metrics.profitFactor - a.metrics.profitFactor);
  
  console.log('Symbol  | Trades | Win%  | PF    | P&L%  | Sharpe | Drawdown | Status');
  console.log('-'.repeat(80));
  
  for (const result of results) {
    const m = result.metrics;
    let status = '❌';
    if (m.profitFactor > 1.5) status = '✅';
    else if (m.profitFactor > 1) status = '⚠️';
    
    const row = `${result.symbol.padEnd(7)} | ${String(m.totalTrades).padEnd(6)} | ${m.winRate.toFixed(1).padEnd(5)} | ${m.profitFactor.toFixed(2).padEnd(5)} | ${m.totalPnLPct.toFixed(1).padEnd(5)} | ${m.sharpeRatio.toFixed(2).padEnd(6)} | ${m.maxDrawdown.toFixed(1).padEnd(8)} | ${status}`;
    console.log(row);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 Interpretação das Métricas:');
  console.log('  ✅ Profit Factor > 1.5: Estratégia com boa relação risco/recompensa');
  console.log('  ⚠️  Profit Factor 1.0-1.5: Estratégia marginal, requer otimização');
  console.log('  ❌ Profit Factor < 1.0: Estratégia com perdas');
  console.log('  📈 Sharpe Ratio > 1: Retorno ajustado ao risco satisfatório');
  console.log('  📉 Drawdown < 20%: Redução de risco aceitável');
  console.log('='.repeat(80) + '\n');
  
  // Estatísticas agregadas
  const totalTrades = results.reduce((sum, r) => sum + r.metrics.totalTrades, 0);
  const avgWinRate = results.reduce((sum, r) => sum + r.metrics.winRate, 0) / results.length;
  const avgPF = results.reduce((sum, r) => sum + r.metrics.profitFactor, 0) / results.length;
  const totalPnL = results.reduce((sum, r) => sum + r.metrics.totalPnL, 0);
  
  console.log('📊 Estatísticas Agregadas:');
  console.log(`  Total de Trades: ${totalTrades}`);
  console.log(`  Win Rate Médio: ${avgWinRate.toFixed(2)}%`);
  console.log(`  Profit Factor Médio: ${avgPF.toFixed(2)}`);
  console.log(`  P&L Total (5 símbolos): $${totalPnL.toFixed(2)}`);
  console.log('='.repeat(80) + '\n');
}

runRealisticBacktest().catch(console.error);
