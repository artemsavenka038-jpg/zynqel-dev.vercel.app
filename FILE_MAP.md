# ZYNQEL file map

- **buttons/navigation** → `src/app.js or original handlers inside src/data/marketCore.js if still global`
- **prices/market data** → `src/data/*`
- **Yahoo/SPX/NDX/XAU/XAG/VIX** → `src/data/yahoo.js + api/yahoo.js`
- **CoinGecko/crypto global** → `src/data/coingecko.js + api/coingecko.js`
- **FRED/macroeconomics** → `src/data/fred.js + api/fred.js`
- **Binance/candles** → `src/data/binance.js`
- **Fear & Greed** → `src/data/fearGreed.js`
- **AI/Groq** → `src/analysis/groq.js`
- **BUY/SELL/WAIT** → `src/analysis/signalEngine.js`
- **EMA/RSI/MACD/candles** → `src/analysis/technical.js`
- **Derivatives/OI/Funding** → `src/analysis/derivatives.js`
- **Early Move/Early Entry** → `src/analysis/earlyMove.js`
- **Market Risk/Macro Shock** → `src/analysis/marketRisk.js`
- **Entry Quality** → `src/entryQuality.js`
- **Safe/Active Mode** → `src/tradeMode.js`
- **Charts** → `src/charts.js`
