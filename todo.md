# Stock Signal Bot V2 - TODO

## Fase 1: Modelo de Dados e Backend Core
- [x] Implementar schema Drizzle (trades, signals, symbols, daily_stats)
- [x] Criar migrations SQL
- [x] Implementar query helpers em server/db.ts
- [ ] Criar tRPC procedures para CRUD de trades e sinais

## Fase 2: Motor de Análise Técnica
- [x] Implementar indicadores técnicos (RSI, ADX, EMA, ATR)
- [x] Integrar stock-analysis skill para obter dados de mercado (estrutura)
- [x] Implementar gerador de sinais (BUY/SELL com confiança)
- [x] Implementar filtros de qualidade (ADX, Volume, Distância EMA21)

## Fase 3: Gestão de Trades e Risco
- [x] Implementar cálculo dinâmico de SL/TP (ATR-based)
- [x] Implementar Trailing Stop progressivo
- [x] Implementar Breakeven automático
- [x] Implementar monitorização de trades ativos

## Fase 4: Integração Telegram
- [x] Configurar Telegram Bot Token (estrutura)
- [x] Implementar envio de notificações (BUY/SELL)
- [x] Implementar notificações de Trailing Stop e Breakeven
- [x] Implementar relatório diário automático

## Fase 5: Loops de Execução
- [x] Implementar Monitor Loop (4h)
- [x] Implementar Trade Monitor (15min)
- [x] Implementar Daily Reporter (08:00 UTC)
- [x] Implementar cooldown inteligente (90min)

## Fase 6: Dashboard Web
- [ ] Página de Sinais Históricos
- [ ] Página de Estatísticas (Win Rate, P&L)
- [ ] Página de Trades Ativos
- [ ] Página de Configuração de Símbolos
- [ ] Página de Relatórios

## Fase 7: Integração com Servidor
- [ ] Criar tRPC procedures para CRUD
- [ ] Integrar engine.ts no servidor
- [ ] Configurar variáveis de ambiente (Telegram, Símbolos)
- [ ] Testar loops em background

## Fase 8: Testes e Validação
- [ ] Testar gerador de sinais com dados históricos
- [ ] Testar monitorização de trades
- [ ] Testar notificações Telegram
- [ ] Testar persistência em DB
- [ ] Testar loops de execução

## Fase 9: Deploy e Documentação
- [ ] Criar checkpoint final
- [ ] Documentar instruções de setup
- [ ] Documentar variáveis de ambiente
- [ ] Criar guia de uso


## Fase 10: Melhorias de Qualidade de Sinais
- [x] Implementar filtros rigorosos: Volume mínimo, ADX mínimo 25, RSI fora de extremos
- [x] Adicionar validação de padrões de velas (confirmação)
- [x] Implementar análise de correlação entre símbolos
- [x] Melhorar cálculo de confiança com ponderação de indicadores
- [x] Adicionar Stochastic RSI e MACD para confirmação

## Fase 11: Sistema de Backtest
- [x] Criar engine de backtest com simulação de trades
- [x] Implementar cálculo de métricas: Win Rate, Profit Factor, Sharpe Ratio, Drawdown
- [x] Adicionar análise de equity curve
- [x] Criar relatório detalhado de backtest
- [x] Implementar otimização de parâmetros

## Fase 12: Interface de Backtest
- [x] Página de backtest com seleção de símbolo e período
- [x] Visualização de resultados em tabela
- [x] Estatísticas detalhadas de performance
- [x] Comparação de múltiplos símbolos
- [x] Interpretação automática de resultados
