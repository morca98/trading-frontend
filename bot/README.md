# Stock Signal Bot

Bot de sinais de compra de ações para Telegram, idêntico ao `trading-backend` (cripto/Binance), mas adaptado para o mercado de ações via **Yahoo Finance**.

## Funcionalidades

- **Sinais BUY/SELL** com TP e SL dinâmicos baseados em ATR
- **Gestão de risco** com trailing stop e breakeven automático
- **Estratégia EMA9/21 Crossover** com filtros ADX, RSI e volume
- **Macro trend** baseado em EMA50/EMA200 semanais
- **Limite de 1 sinal por dia por direção** (anti-overtrading)
- **Cooldown de 90 minutos** entre sinais do mesmo símbolo
- **Relatório diário** às 08:00 UTC com estatísticas
- **Backtest integrado** com gestão de capital e drawdown
- **Persistência** de trades e estatísticas em ficheiros JSON

## Estrutura

```
bot/
├── server.js          # Bot principal (loop de sinais + Telegram)
├── signal.js          # Módulo de geração de sinais (partilhado)
├── backtest-engine.js # Motor de backtest para ações
├── backtest.js        # Script de backtest standalone
├── package.json       # Dependências
└── README.md          # Esta documentação
```

## Instalação

```bash
cd bot
npm install
```

## Configuração

Definir as seguintes variáveis de ambiente:

| Variável          | Descrição                                    | Obrigatório |
|-------------------|----------------------------------------------|-------------|
| `TELEGRAM_TOKEN`  | Token do bot Telegram                        | Sim         |
| `TELEGRAM_CHAT_ID`| ID do chat/canal Telegram                    | Sim         |
| `SYMBOLS`         | Lista de tickers separados por vírgula       | Não         |
| `DATA_DIR`        | Diretório para ficheiros de persistência     | Não         |

### Símbolos por defeito

```
AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, AMD
```

## Execução

```bash
# Iniciar o bot
TELEGRAM_TOKEN=xxx TELEGRAM_CHAT_ID=yyy node server.js

# Executar backtest
node backtest.js AAPL,MSFT,NVDA

# Modo de teste (sem Telegram – output no console)
node server.js
```

## Estratégia de Trading

### Timeframe Principal
Velas **diárias (1d)** – equivalente às velas de 30m do trading-backend cripto.

### Macro Trend
Calculado a partir de velas **semanais (1wk)** com EMA50 e EMA200 – equivalente às velas de 4h do backend cripto.

### Condições de Entrada BUY
1. **Crossover**: EMA9 cruza EMA21 para cima, com EMA21 > EMA50 e macro ≠ BEAR
2. **Pullback**: Tendência de alta (EMA9 > EMA21 > EMA50), macro = BULL, RSI 45–65, volume alto, preço próximo da EMA21 (±1.2%)

### Condições de Entrada SELL
1. **Crossover**: EMA9 cruza EMA21 para baixo, com EMA21 < EMA50 e macro ≠ BULL
2. **Pullback**: Tendência de baixa, macro = BEAR, RSI 35–55, volume alto, preço próximo da EMA21

### Filtros de Qualidade
- ADX ≥ 20 (tendência suficientemente forte)
- RSI < 70 para BUY (não overbought)
- RSI > 30 para SELL (não oversold)
- Preço acima da EMA200 para BUY (sem macro BULL)
- Confirmação da vela anterior na direção do sinal
- Volume acima da média dos últimos 12 períodos

### Cálculo de SL/TP
- **SL**: ATR × 1.8 do preço de entrada (mín. 1%, máx. 3%)
- **TP**: SL × R:R dinâmico (ADX > 30 → 3.0×, ADX > 25 → 2.5×, ADX ≤ 25 → 2.0×)

### Gestão de Risco
- **Breakeven**: Ao atingir +1% de lucro, SL move para entrada + 0.1%
- **Trailing Stop**: Ao atingir +2% de lucro, SL move para entrada + 1%
- **Risco por trade**: 2% do capital (configurável)
- **Comissão**: 0.1% entrada + 0.1% saída

## Formato do Sinal Telegram

```
🟢 BUY AAPL

💰 Preço: $175.50
🛑 Stop Loss: $171.98 (-2.00%)
🎯 Take Profit: $182.52 (+4.00%)
📊 Confiança: 72%

RSI: 58.3 | ADX: 28.5 | ATR: $3.21
EMA9: $174.20 | EMA21: $172.80 | EMA50: $168.50
Macro: BULL | Curto: BULL

⏰ 25/03/2026, 09:00:00
```

## Comparação com trading-backend (cripto)

| Aspeto              | trading-backend (cripto) | Stock Signal Bot (ações) |
|---------------------|--------------------------|--------------------------|
| Fonte de dados      | Binance API              | Yahoo Finance            |
| Timeframe principal | 30 minutos               | Diário (1d)              |
| Macro trend         | Velas 4h                 | Velas semanais (1wk)     |
| SL mínimo/máximo    | 0.5% / 1.5%              | 1% / 3%                  |
| Tolerância EMA21    | 0.8%                     | 1.2%                     |
| Janela de saída     | 96 velas (48h)           | 20 velas (20 dias)       |
| Scan interval       | 5 minutos                | 4 horas                  |
| Símbolos            | BTCUSDT, ETHUSDT         | AAPL, MSFT, NVDA, ...    |

## Backtest

```bash
node backtest.js AAPL,MSFT,NVDA,TSLA
```

Saída exemplo:
```
==================================================
Backtest: AAPL
==================================================
Total Trades:   18
Wins:           12
Losses:         6
Win Rate:       66.67%
Profit Factor:  2.45
Capital Final:  $12,340.00
Retorno:        23.40%
Max Drawdown:   8.20%
```
