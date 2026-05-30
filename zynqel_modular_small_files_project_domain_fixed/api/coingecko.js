const CACHE = globalThis.__ZYNQEL_CG_CACHE__ || new Map();
globalThis.__ZYNQEL_CG_CACHE__ = CACHE;

const TTL = 5 * 60 * 1000;
const STALE = 60 * 60 * 1000;

function get(k, stale=false){
  const item = CACHE.get(k);
  if(!item) return null;
  const age = Date.now()-item.ts;
  if(age <= TTL) return item.data;
  if(stale && age <= STALE) return item.data;
  return null;
}
function set(k,data){ CACHE.set(k,{ts:Date.now(),data}); }

function fallback(endpoint){
  if(endpoint === "global"){
    return {
      data:{
        active_cryptocurrencies:0,
        markets:0,
        total_market_cap:{usd:0},
        total_volume:{usd:0},
        market_cap_percentage:{btc:57,eth:9.5},
        market_cap_change_percentage_24h_usd:0
      },
      _zynqel_source:"coingecko_fallback"
    };
  }
  return {_zynqel_source:"coingecko_fallback", endpoint};
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=3600");
  if(req.method === "OPTIONS") return res.status(200).end();

  const endpoint = String(req.query.endpoint || "global").replace(/^\/+/,"");
  const query = String(req.query.query || "");
  const key = endpoint + "?" + query;

  const fresh = get(key,false);
  if(fresh) return res.status(200).json({...fresh,_zynqel_cache:"fresh"});

  try{
    const url = `https://api.coingecko.com/api/v3/${endpoint}${query ? "?" + query : ""}`;
    const headers = {"User-Agent":"Mozilla/5.0","Accept":"application/json"};
    if(process.env.COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
    const r = await fetch(url, {headers});
    const txt = await r.text();
    if(!r.ok) throw new Error(`CoinGecko HTTP ${r.status}: ${txt.slice(0,120)}`);
    const data = JSON.parse(txt);
    set(key,data);
    return res.status(200).json({...data,_zynqel_cache:"live"});
  }catch(e){
    const stale = get(key,true);
    if(stale) return res.status(200).json({...stale,_zynqel_cache:"stale",_zynqel_error:e.message});
    const fb = fallback(endpoint);
    set(key,fb);
    return res.status(200).json({...fb,_zynqel_error:e.message});
  }
}
