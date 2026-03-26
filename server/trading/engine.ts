import { getSymbols, addSymbol } from "../db";
import { processSymbol } from "./engine";
import { ENV } from "../_core/env";
import { initTelegram } from "./telegram";

const MONITOR_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SIGNAL_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const REPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes check for 08:00 UTC
export const RISK_PER_TRADE = 0.01; // 1% risk per position

export async function initializeEngine() {
  console.log("[Engine] Initializing trading engine...");
  
  // Initialize Telegram
  if (ENV.telegramToken && ENV.telegramChatId) {
    initTelegram(ENV.telegramToken, ENV.telegramChatId);
  } else {
    console.warn("[Engine] Telegram credentials missing in ENV");
  }

  let symbols = await getSymbols();
  console.log(`[Engine] Database check: found ${symbols.length} symbols.`);
  
  if (symbols.length === 0) {
    console.log("[Engine] No symbols found in database, adding defaults...");
    const defaultSymbols = [
      { s: "AAPL", r: "US", sec: "Technology" },
      { s: "MSFT", r: "US", sec: "Technology" },
      { s: "NVDA", r: "US", sec: "Technology" },
      { s: "TSLA", r: "US", sec: "Technology" },
      { s: "AMZN", r: "US", sec: "Technology" },
      { s: "GOOGL", r: "US", sec: "Technology" },
      { s: "META", r: "US", sec: "Technology" },
      { s: "AMD", r: "US", sec: "Technology" },
      { s: "AVGO", r: "US", sec: "Technology" },
      { s: "NFLX", r: "US", sec: "Technology" },
      { s: "ADBE", r: "US", sec: "Technology" },
      { s: "CSCO", r: "US", sec: "Technology" },
      { s: "INTC", r: "US", sec: "Technology" },
      { s: "ORCL", r: "US", sec: "Technology" },
      { s: "CRM", r: "US", sec: "Technology" },
      { s: "QCOM", r: "US", sec: "Technology" },
      { s: "TXN", r: "US", sec: "Technology" },
      { s: "AMAT", r: "US", sec: "Technology" },
      { s: "MU", r: "US", sec: "Technology" },
      { s: "ISRG", r: "US", sec: "Technology" },
      { s: "PANW", r: "US", sec: "Technology" },
      { s: "LRCX", r: "US", sec: "Technology" },
      { s: "HON", r: "US", sec: "Technology" },
      { s: "SBUX", r: "US", sec: "Technology" },
      { s: "VRTX", r: "US", sec: "Technology" },
      { s: "REGN", r: "US", sec: "Technology" },
      { s: "ADI", r: "US", sec: "Technology" },
      { s: "KLAC", r: "US", sec: "Technology" },
      { s: "MDLZ", r: "US", sec: "Technology" },
      { s: "PYPL", r: "US", sec: "Technology" },
      { s: "V", r: "US", sec: "Blue Chip" },
      { s: "MA", r: "US", sec: "Blue Chip" },
      { s: "JPM", r: "US", sec: "Blue Chip" },
      { s: "UNH", r: "US", sec: "Blue Chip" },
      { s: "LLY", r: "US", sec: "Blue Chip" },
      { s: "XOM", r: "US", sec: "Blue Chip" },
      { s: "HD", r: "US", sec: "Blue Chip" },
      { s: "PG", r: "US", sec: "Blue Chip" },
      { s: "JNJ", r: "US", sec: "Blue Chip" },
      { s: "ABBV", r: "US", sec: "Blue Chip" },
      { s: "WMT", r: "US", sec: "Blue Chip" },
      { s: "COST", r: "US", sec: "Blue Chip" },
      { s: "BAC", r: "US", sec: "Blue Chip" },
      { s: "KO", r: "US", sec: "Blue Chip" },
      { s: "MRK", r: "US", sec: "Blue Chip" },
      { s: "CVX", r: "US", sec: "Blue Chip" },
      { s: "PEP", r: "US", sec: "Blue Chip" },
      { s: "TMO", r: "US", sec: "Blue Chip" },
      { s: "PFE", r: "US", sec: "Blue Chip" },
      { s: "LIN", r: "US", sec: "Blue Chip" },
      { s: "DIS", r: "US", sec: "Blue Chip" },
      { s: "ACN", r: "US", sec: "Blue Chip" },
      { s: "ABT", r: "US", sec: "Blue Chip" },
      { s: "DHR", r: "US", sec: "Blue Chip" },
      { s: "VZ", r: "US", sec: "Blue Chip" },
      { s: "NEE", r: "US", sec: "Blue Chip" },
      { s: "WFC", r: "US", sec: "Blue Chip" },
      { s: "PM", r: "US", sec: "Blue Chip" },
      { s: "NKE", r: "US", sec: "Blue Chip" },
      { s: "RTX", r: "US", sec: "Blue Chip" },
      { s: "LOW", r: "US", sec: "Blue Chip" },
      { s: "BMY", r: "US", sec: "Blue Chip" },
      { s: "COP", r: "US", sec: "Blue Chip" },
      { s: "UNP", r: "US", sec: "Blue Chip" },
      { s: "AMGN", r: "US", sec: "Blue Chip" },
      { s: "T", r: "US", sec: "Blue Chip" },
      { s: "GE", r: "US", sec: "Blue Chip" },
      { s: "AXP", r: "US", sec: "Blue Chip" },
      { s: "MS", r: "US", sec: "Blue Chip" },
      { s: "GS", r: "US", sec: "Blue Chip" },
      { s: "CAT", r: "US", sec: "Blue Chip" },
      { s: "EDP.LS", r: "PT", sec: "PSI" },
      { s: "GALP.LS", r: "PT", sec: "PSI" },
      { s: "BCP.LS", r: "PT", sec: "PSI" },
      { s: "JMT.LS", r: "PT", sec: "PSI" },
      { s: "EDPR.LS", r: "PT", sec: "PSI" },
      { s: "NOS.LS", r: "PT", sec: "PSI" },
      { s: "SON.LS", r: "PT", sec: "PSI" },
      { s: "CTT.LS", r: "PT", sec: "PSI" },
      { s: "RENE.LS", r: "PT", sec: "PSI" },
      { s: "NVG.LS", r: "PT", sec: "PSI" },
      { s: "ALTR.LS", r: "PT", sec: "PSI" },
      { s: "SEM.LS", r: "PT", sec: "PSI" },
      { s: "COR.LS", r: "PT", sec: "PSI" },
      { s: "EGL.LS", r: "PT", sec: "PSI" },
      { s: "IBS.LS", r: "PT", sec: "PSI" },
      { s: "NBA.LS", r: "PT", sec: "PSI" },
      { s: "PHR.LS", r: "PT", sec: "PSI" },
      { s: "ASML.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "SAP.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "MC.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "OR.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "TTE.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "SAN.MC", r: "EU", sec: "Euro Stoxx" },
      { s: "BBVA.MC", r: "EU", sec: "Euro Stoxx" },
      { s: "INGA.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "BNP.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "ISP.MI", r: "EU", sec: "Euro Stoxx" },
      { s: "ENI.MI", r: "EU", sec: "Euro Stoxx" },
      { s: "ENEL.MI", r: "EU", sec: "Euro Stoxx" },
      { s: "DAI.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "BMW.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "BAS.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "ALV.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "DTE.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "AIR.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "AI.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "CS.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "DG.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "BN.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "IBE.MC", r: "EU", sec: "Euro Stoxx" },
      { s: "ABI.BR", r: "EU", sec: "Euro Stoxx" },
      { s: "ADS.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "BAYN.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "VOW3.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "PRX.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "RMS.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "KER.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "SAF.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "EL.PA", r: "EU", sec: "Euro Stoxx" },
      { s: "AD.AS", r: "EU", sec: "Euro Stoxx" },
      { s: "CRH.L", r: "EU", sec: "Euro Stoxx" },
      { s: "STLAM.MI", r: "EU", sec: "Euro Stoxx" },
      { s: "MBG.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "DHL.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "IFX.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "SIE.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "MUV2.DE", r: "EU", sec: "Euro Stoxx" },
      { s: "PETR4.SA", r: "BR", sec: "B3" },
      { s: "VALE3.SA", r: "BR", sec: "B3" },
      { s: "ITUB4.SA", r: "BR", sec: "B3" },
      { s: "BBDC4.SA", r: "BR", sec: "B3" },
      { s: "ABEV3.SA", r: "BR", sec: "B3" },
      { s: "BBAS3.SA", r: "BR", sec: "B3" },
      { s: "B3SA3.SA", r: "BR", sec: "B3" },
      { s: "ITSAS4.SA", r: "BR", sec: "B3" },
      { s: "WEGE3.SA", r: "BR", sec: "B3" },
      { s: "JBSS3.SA", r: "BR", sec: "B3" },
      { s: "SUZB3.SA", r: "BR", sec: "B3" },
      { s: "RENT3.SA", r: "BR", sec: "B3" },
      { s: "GGBR4.SA", r: "BR", sec: "B3" },
      { s: "CSNA3.SA", r: "BR", sec: "B3" },
      { s: "LREN3.SA", r: "BR", sec: "B3" },
      { s: "MGLU3.SA", r: "BR", sec: "B3" },
      { s: "PRIO3.SA", r: "BR", sec: "B3" },
      { s: "UGPA3.SA", r: "BR", sec: "B3" },
      { s: "VIVT3.SA", r: "BR", sec: "B3" },
      { s: "RADL3.SA", r: "BR", sec: "B3" },
      { s: "SBSP3.SA", r: "BR", sec: "B3" },
      { s: "RAIL3.SA", r: "BR", sec: "B3" },
      { s: "EQTL3.SA", r: "BR", sec: "B3" },
      { s: "RDOR3.SA", r: "BR", sec: "B3" },
      { s: "ELET3.SA", r: "BR", sec: "B3" },
      { s: "CPFE3.SA", r: "BR", sec: "B3" },
      { s: "CCRO3.SA", r: "BR", sec: "B3" },
      { s: "CMIG4.SA", r: "BR", sec: "B3" },
      { s: "CSAN3.SA", r: "BR", sec: "B3" },
      { s: "BRFS3.SA", r: "BR", sec: "B3" },
      { s: "SMCI", r: "US", sec: "Growth/Meme" },
      { s: "MSTR", r: "US", sec: "Growth/Meme" },
      { s: "VRT", r: "US", sec: "Growth/Meme" },
      { s: "CELH", r: "US", sec: "Growth/Meme" },
      { s: "ELF", r: "US", sec: "Growth/Meme" },
      { s: "DECK", r: "US", sec: "Growth/Meme" },
      { s: "ANF", r: "US", sec: "Growth/Meme" },
      { s: "COIN", r: "US", sec: "Growth/Meme" },
      { s: "DKNG", r: "US", sec: "Growth/Meme" },
      { s: "SKX", r: "US", sec: "Growth/Meme" },
      { s: "AAL", r: "US", sec: "Growth/Meme" },
      { s: "DAL", r: "US", sec: "Growth/Meme" },
      { s: "UAL", r: "US", sec: "Growth/Meme" },
      { s: "SAVE", r: "US", sec: "Growth/Meme" },
      { s: "NCLH", r: "US", sec: "Growth/Meme" },
      { s: "RCL", r: "US", sec: "Growth/Meme" },
      { s: "CCL", r: "US", sec: "Growth/Meme" },
      { s: "HOOD", r: "US", sec: "Growth/Meme" },
      { s: "SOFI", r: "US", sec: "Growth/Meme" },
      { s: "AFRM", r: "US", sec: "Growth/Meme" },
      { s: "UPST", r: "US", sec: "Growth/Meme" },
      { s: "PLTR", r: "US", sec: "Growth/Meme" },
      { s: "AI", r: "US", sec: "Growth/Meme" },
      { s: "PATH", r: "US", sec: "Growth/Meme" },
      { s: "SNOW", r: "US", sec: "Growth/Meme" },
      { s: "NET", r: "US", sec: "Growth/Meme" },
      { s: "CRWD", r: "US", sec: "Growth/Meme" },
      { s: "ZS", r: "US", sec: "Growth/Meme" },
      { s: "OKTA", r: "US", sec: "Growth/Meme" },
      { s: "MDB", r: "US", sec: "Growth/Meme" },
      { s: "DDOG", r: "US", sec: "Growth/Meme" },
      { s: "GME", r: "US", sec: "Growth/Meme" },
      { s: "AMC", r: "US", sec: "Growth/Meme" },
      { s: "KOSS", r: "US", sec: "Growth/Meme" },
      { s: "BB", r: "US", sec: "Growth/Meme" },
      { s: "RIVN", r: "US", sec: "Growth/Meme" },
      { s: "LCID", r: "US", sec: "Growth/Meme" },
      { s: "NKLA", r: "US", sec: "Growth/Meme" },
      { s: "QS", r: "US", sec: "Growth/Meme" },
      { s: "PLUG", r: "US", sec: "Growth/Meme" },
      { s: "FCEL", r: "US", sec: "Growth/Meme" },
      { s: "BLDP", r: "US", sec: "Growth/Meme" },
      { s: "SPCE", r: "US", sec: "Growth/Meme" },
      { s: "FUBO", r: "US", sec: "Growth/Meme" },
      { s: "OPEN", r: "US", sec: "Growth/Meme" },
      { s: "CHPT", r: "US", sec: "Growth/Meme" },
      { s: "RUN", r: "US", sec: "Growth/Meme" },
      { s: "SUNW", r: "US", sec: "Growth/Meme" },
      { s: "MARA", r: "US", sec: "Growth/Meme" },
      { s: "RIOT", r: "US", sec: "Growth/Meme" },
    ];
    console.log(`[Engine] Adding ${defaultSymbols.length} default symbols...`);
    // Use Promise.all to add symbols faster
    await Promise.all(defaultSymbols.map(item => 
      addSymbol(item.s, item.r, item.sec).catch(e => 
        console.error(`[Engine] Failed to add default symbol ${item.s}:`, e)
      )
    ));
    
    // RE-FETCH SYMBOLS TO ENSURE UI LOADS THEM
    symbols = await getSymbols();
  }

  // Initial scan on startup
  console.log("[Engine] Starting initial market scan...");
  runTradingLoop();

  // Setup intervals
  setInterval(runTradingLoop, SIGNAL_INTERVAL);
  setInterval(runMonitoringLoop, MONITOR_INTERVAL);
  setInterval(runDailyReport, REPORT_INTERVAL);
}

async function runTradingLoop() {
  console.log("[Engine] Running trading signal scan...");
  const symbols = await getSymbols();
  let signalsGenerated = 0;
  
  for (const symbol of symbols) {
    try {
      const result = await processSymbol(symbol.symbol);
      if (result) signalsGenerated++;
    } catch (error) {
      console.error(`[Engine] Error processing ${symbol.symbol}:`, error);
    }
  }
  
  // If no signals were found, notify Telegram
  if (signalsGenerated === 0) {
    const { sendTelegram, formatNoSignalsMessage } = await import("./telegram");
    const message = formatNoSignalsMessage(symbols.length);
    await sendTelegram(message);
  }
  
  console.log(`[Engine] Trading scan complete. Signals generated: ${signalsGenerated}`);
}

async function runMonitoringLoop() {
  console.log("[Engine] Running trade monitoring loop...");
  const { monitorTrades } = await import("./engine");
  try {
    await monitorTrades();
  } catch (error) {
    console.error("[Engine] Error in monitoring loop:", error);
  }
}

async function runDailyReport() {
  const now = new Date();
  // Run daily report at 08:00 UTC
  if (now.getUTCHours() === 8 && now.getUTCMinutes() < 5) {
    console.log("[Engine] Generating daily report...");
    const { sendDailyReport } = await import("./telegram");
    try {
      await sendDailyReport();
    } catch (error) {
      console.error("[Engine] Error generating daily report:", error);
    }
  }
}
