'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  STOCK BACKTEST SCRIPT
//  Executa backtest de 2 anos para os símbolos especificados.
//  Uso: node backtest.js [SYMBOL1,SYMBOL2,...]
//  Ex:  node backtest.js AAPL,MSFT,NVDA
// ─────────────────────────────────────────────────────────────────────────────

const StockBacktestEngine = require('./backtest-engine');
const { generateMtfSignal } = require('./signal');

async function runBacktest(symbol) {
  console.log('\n' + '='.repeat(55));
  console.log('Backtest MTF V3: ' + symbol);
  console.log('='.repeat(55));

  var engine = new StockBacktestEngine({
    symbol:         symbol,
    interval:       '1d',
    range:          '2y',
    initialCapital: 10000,
    riskPerTrade:   0.02,   // 2% do capital por trade
    fee:            0.001,  // 0.1% comissão
    slippage:       0.001,  // 0.1% slippage
  });

  try {
    var results = await engine.run(generateMtfSignal);

    console.log('Total Trades:   ' + results.totalTrades);
    console.log('Wins:           ' + results.wins);
    console.log('Losses:         ' + results.losses);
    console.log('Win Rate:       ' + results.winRate + '%');
    console.log('Profit Factor:  ' + results.profitFactor);
    console.log('Capital Final:  $' + results.finalCapital);
    console.log('Retorno:        ' + results.returnPct + '%');
    console.log('Max Drawdown:   ' + results.maxDD + '%');
    console.log('');

    // Breakdown por direção
    var buys  = results.trades.filter(function(t) { return t.signal === 'BUY';  });
    var sells = results.trades.filter(function(t) { return t.signal === 'SELL'; });
    var buyWins  = buys.filter(function(t)  { return t.outcome === 'WIN'; }).length;
    var sellWins = sells.filter(function(t) { return t.outcome === 'WIN'; }).length;

    if (buys.length > 0) {
      console.log('BUY:  ' + buys.length + ' trades | WR: ' + (buyWins / buys.length * 100).toFixed(1) + '%');
    }
    if (sells.length > 0) {
      console.log('SELL: ' + sells.length + ' trades | WR: ' + (sellWins / sells.length * 100).toFixed(1) + '%');
    }

    // Últimos 5 trades
    if (results.trades.length > 0) {
      console.log('\nÚltimos trades:');
      results.trades.slice(-5).forEach(function(t) {
        var date = new Date(t.time).toISOString().slice(0, 10);
        console.log(
          '  ' + date + ' ' + t.signal + ' @$' + t.entry.toFixed(2) +
          ' → ' + t.outcome + ' ($' + t.exit.toFixed(2) + ')' +
          ' PnL: ' + (t.pnl >= 0 ? '+' : '') + t.pnl.toFixed(2)
        );
      });
    }

    return results;
  } catch (e) {
    console.error('Erro no backtest de ' + symbol + ':', e.message);
    return null;
  }
}

async function main() {
  var symbols = (process.argv[2] || process.env.SYMBOLS || 'AAPL,MSFT,NVDA').split(',');

  console.log('\n🔬 STOCK SIGNAL BOT – BACKTEST MTF V3 (2 ANOS)');
  console.log('Símbolos: ' + symbols.join(', '));
  console.log('Capital inicial: $10,000 | Risco/trade: 2% | Comissão: 0.1%');
  console.log('');

  var allResults = [];
  for (var i = 0; i < symbols.length; i++) {
    var result = await runBacktest(symbols[i].trim().toUpperCase());
    if (result) allResults.push(result);
  }

  // Resumo global
  if (allResults.length > 1) {
    console.log('\n' + '='.repeat(55));
    console.log('RESUMO GLOBAL');
    console.log('='.repeat(55));
    var totalTrades = allResults.reduce(function(s, r) { return s + r.totalTrades; }, 0);
    var totalWins   = allResults.reduce(function(s, r) { return s + r.wins; }, 0);
    var avgReturn   = allResults.reduce(function(s, r) { return s + parseFloat(r.returnPct); }, 0) / allResults.length;
    var avgDD       = allResults.reduce(function(s, r) { return s + parseFloat(r.maxDD); }, 0) / allResults.length;
    console.log('Total Trades:   ' + totalTrades);
    console.log('Win Rate Médio: ' + (totalTrades > 0 ? (totalWins / totalTrades * 100).toFixed(1) : 0) + '%');
    console.log('Retorno Médio:  ' + avgReturn.toFixed(2) + '%');
    console.log('Max DD Médio:   ' + avgDD.toFixed(2) + '%');
  }
}

main().catch(function(e) {
  console.error('Erro fatal:', e);
  process.exit(1);
});
