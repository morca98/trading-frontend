# Stock Signal Bot V2 - Arquitetura do Sistema

## Visão Geral

O **Stock Signal Bot V2** é um sistema automatizado de trading que monitora continuamente múltiplos símbolos de ações (US, PT, EU, BR) e gera sinais de compra/venda baseados em análise técnica avançada. O sistema integra a skill `stock-analysis` para obter dados de mercado em tempo real, aplica indicadores técnicos sofisticados e gerencia trades com proteção automática de risco.

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Tailwind)                  │
│  Dashboard: Sinais históricos, estatísticas, configuração        │
└────────────────────────┬────────────────────────────────────────┘
                         │ tRPC
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express + tRPC)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ API Routes: Signals, Trades, Stats, Config              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Trading Engine (Background Job)                          │   │
│  │  • Monitor Loop: Scan símbolos a cada 4h                │   │
│  │  • Trade Monitor: Verificar TP/SL a cada 15min         │   │
│  │  • Daily Reporter: Relatório às 08:00 UTC              │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐    ┌──────────────┐   ┌──────────┐
   │ MySQL   │    │ Telegram API │   │ Yahoo    │
   │ (Trades)│    │ (Notificações)   │ Finance  │
   └─────────┘    └──────────────┘   │ (via     │
                                      │ skill)   │
                                      └──────────┘
```

## Componentes Principais

### 1. **Data Model (Drizzle ORM)**

#### Tabelas Principais:
- **trades**: Histórico de trades abertos e fechados
- **signals**: Sinais gerados (para auditoria e análise)
- **symbols**: Símbolos configurados para monitorização
- **daily_stats**: Estatísticas diárias (Win Rate, P&L)

### 2. **Trading Engine**

#### Motor de Análise Técnica:
- **Indicadores**: RSI, ADX, EMA (9, 21, 50, 200), ATR
- **Padrões**: Crossover EMA9/EMA21, Suporte/Resistência
- **Outlook**: Curto/Médio/Longo prazo (via `stock-analysis` skill)
- **Filtros**: Volume, ADX mínimo, Macro Trend

#### Gerador de Sinais:
- BUY: Crossover para cima + EMA21 > EMA50 + Macro Trend não BEAR
- SELL: Crossover para baixo + EMA21 < EMA50 + Macro Trend não BULL
- Confiança: 55-99% (baseada em ADX, Volume, Tendência)

#### Gestão de Risco:
- **Stop Loss**: 1-3% (ATR-based, maior que cripto)
- **Take Profit**: Dinâmico (2.0x-3.0x Risk:Reward baseado em ADX)
- **Trailing Stop**: +1% de lucro → SL = Entry × 1.001
- **Breakeven**: +2% de lucro → SL = Entry × 1.01

### 3. **Notificações Telegram**

Formato HTML com emojis:
- 🟢 BUY signals com preço, SL, TP, confiança
- 🔴 SELL signals com mesmas métricas
- 📈 Trailing Stop ativado
- 🛡️ Breakeven ativado
- 📊 Relatório diário com Win Rate e P&L

### 4. **Persistência de Dados**

- **Trades Ativos**: Armazenados em memória (com fallback em DB)
- **Histórico**: MySQL/TiDB com timestamps UTC
- **Stats**: Agregadas diariamente para análise de performance

### 5. **Monitorização Contínua**

#### Loops de Execução:
1. **Monitor Loop** (a cada 4 horas): Scan de novos sinais
2. **Trade Monitor** (a cada 15 minutos): Verificar TP/SL
3. **Daily Reporter** (08:00 UTC): Enviar relatório
4. **Cooldown Inteligente**: 90 minutos entre sinais do mesmo símbolo

## Fluxo de Dados

### Geração de Sinal:

```
1. Fetch Candles (1d, 2y) + (1wk, 5y) via stock-analysis
2. Calcular Indicadores: RSI, ADX, EMA, ATR
3. Determinar Macro Trend (semanal)
4. Determinar Trend Curto (últimas 10 velas)
5. Gerar Sinal: BUY/SELL com confiança
6. Aplicar Filtros: ADX >= 20, Volume, Distância EMA21
7. Se sinal válido:
   a. Criar Trade Ativo (entry, SL, TP)
   b. Guardar em DB
   c. Enviar notificação Telegram
```

### Monitorização de Trade:

```
1. Para cada trade ativo:
   a. Fetch preço atual
   b. Verificar se atingiu TP ou SL
   c. Aplicar Trailing Stop (se lucro >= 1%)
   d. Aplicar Breakeven (se lucro >= 2%)
   e. Se fechado: atualizar stats, enviar notificação
```

## Tecnologias

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | React 19 + Tailwind 4 + shadcn/ui |
| Backend | Express 4 + tRPC 11 + Node.js |
| Database | MySQL/TiDB (via Drizzle ORM) |
| Data Source | Yahoo Finance (via stock-analysis skill) |
| Notificações | Telegram Bot API |
| Scheduling | setInterval (Node.js nativo) |
| Auth | Manus OAuth |

## Configuração Inicial

### Variáveis de Ambiente Necessárias:

```
TELEGRAM_TOKEN=<bot_token>
TELEGRAM_CHAT_ID=<chat_id>
SYMBOLS=AAPL,MSFT,NVDA,TSLA,...
DATABASE_URL=<mysql_connection>
```

### Símbolos Suportados:

- **US**: AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, AMD, etc.
- **PT**: EDP.LS, GALP.LS, BCP.LS, JMT.LS, EDPR.LS, NOS.LS, SON.LS, etc.
- **EU**: ASML.AS, SAP.DE, MC.PA, OR.PA, TTE.PA, SAN.MC, etc.
- **BR**: PETR4.SA, VALE3.SA, ITUB4.SA, BBDC4.SA, ABEV3.SA, etc.

## Próximos Passos

1. ✅ Desenhar arquitetura (este documento)
2. ⏳ Implementar modelo de dados (Drizzle schema)
3. ⏳ Implementar motor de análise técnica
4. ⏳ Integrar Telegram e persistência
5. ⏳ Construir dashboard web
6. ⏳ Testar e validar
