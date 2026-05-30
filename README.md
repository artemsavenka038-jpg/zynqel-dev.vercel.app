# ZYNQEL modular split project

This build splits the old huge JS files into smaller classic scripts.

Important:
- Scripts are NOT modules. They remain global scripts to avoid breaking old code.
- Load order is preserved in `index.html`.
- API files remain in `/api`.

Main folders:
- `src/data/` — prices, external API routing, Binance/Yahoo/FRED/CoinGecko
- `src/analysis/` — Groq, forecast, signal engine, technical indicators, derivatives
- `styles/main.css` — all CSS
- `api/` — Vercel serverless APIs

See `FILE_MAP.md` for where to edit each feature.
