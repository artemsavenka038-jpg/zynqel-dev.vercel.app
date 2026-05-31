const CACHE = globalThis.__ZYNQEL_BINANCE_KLINES_CACHE__ || new Map();
globalThis.__ZYNQEL_BINANCE_KLINES_CACHE__ = CACHE;

const TTL = 20 * 1000;
const STALE = 5 * 60 * 1000;

function get(k, stale=false){
  const item = CACHE.get(k);
  if(!item) return null;
  const age = Date.now() - item.ts;
  if(age <= TTL) return item.data;
  if(stale && age <= STALE) return item.data;
  return null;
}
function set(k, data){ CACHE.set(k, {ts:Date.now(), data}); }

const allowedIntervals = new Set(["1m","3m","5m","15m","30m","1h","2h","4h","6h","8h","12h","1d"]);
function normalizeSymbol(s){
  s = String(s || "BTC").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(s.endsWith("USDT")) return s;
  if(s.endsWith("USD")) return s.replace(/USD$/, "USDT");
  return s + "USDT";
}

export default async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=300");
  if(req.method === "OPTIONS") return res.status(200).end();

  const symbol = normalizeSymbol(req.query.symbol || "BTC");
  const interval = allowedIntervals.has(String(req.query.interval || "15m")) ? String(req.query.interval || "15m") : "15m";
  const limit = Math.min(Math.max(parseInt(req.query.limit || "120", 10) || 120, 30), 500);
  const key = `${symbol}|${interval}|${limit}`;

  const fresh = get(key, false);
  if(fresh) return res.status(200).json({...fresh, _zynqel_cache:"fresh"});

  const urls = [
    `https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
    `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
  ];

  let lastError = "";
  for(const url of urls){
    try{
      const r = await fetch(url, {headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}});
      const txt = await r.text();
      if(!r.ok) throw new Error(`HTTP ${r.status}: ${txt.slice(0,120)}`);
      const raw = JSON.parse(txt);
      const candles = raw.map(k => ({
        t: Number(k[0]),
        o: Number(k[1]),
        h: Number(k[2]),
        l: Number(k[3]),
        c: Number(k[4]),
        v: Number(k[5])
      })).filter(c => Number.isFinite(c.t) && Number.isFinite(c.c) && c.c > 0);
      const data = {symbol, interval, limit, candles, _zynqel_source:url.includes("fapi") ? "binance_futures" : "binance_spot"};
      if(candles.length >= 30){
        set(key, data);
        return res.status(200).json({...data, _zynqel_cache:"live"});
      }
      lastError = "too few candles";
    }catch(e){
      lastError = e.message;
    }
  }

  const stale = get(key, true);
  if(stale) return res.status(200).json({...stale, _zynqel_cache:"stale", _zynqel_error:lastError});

  return res.status(200).json({
    symbol, interval, limit,
    candles: [],
    _zynqel_cache:"empty",
    _zynqel_error:lastError || "No candle data"
  });
}
