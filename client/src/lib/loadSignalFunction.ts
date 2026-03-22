// Esta é a função loadSignal que deve ser usada no MainLayout
// Para evitar problemas de escape, use este arquivo como referência

export const loadSignalCode = `
  const loadSignal = async () => {
    try {
      setLoading(true);
      const symbolMap = {
        'BTCUSDT': 'BTC/USDT',
        'ETHUSDT': 'ETH/USDT',
        'SOLUSDT': 'SOL/USDT',
      };
      const mappedSymbol = symbolMap[activeSymbol] || 'BTC/USDT';
      const candlesData = await getCoinbaseProCandlesExtended(mappedSymbol, '30m', 600);
      if (candlesData.length > 0) {
        setCandles(candlesData);
        try {
          const res = await fetch(\`\${BACKEND_URL}/api/signal?symbol=\${activeSymbol}&interval=30m\`);
          const data = await res.json();
          if (data.success) {
            setSignal(data.signal || null);
          }
        } catch (err) {
          console.error('Erro ao carregar sinal:', err);
        }
      } else {
        const res = await fetch(\`\${BACKEND_URL}/api/signal?symbol=\${activeSymbol}&interval=30m\`);
        const data = await res.json();
        if (data.success) {
          setSignal(data.signal || null);
          setCandles(data.candles || []);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar sinal:', err);
    } finally {
      setLoading(false);
    }
  };
`;
