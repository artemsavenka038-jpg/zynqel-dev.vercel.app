const CACHE = globalThis.__ZYNQEL_FRED_CACHE__ || new Map();
globalThis.__ZYNQEL_FRED_CACHE__ = CACHE;

const TTL = 10 * 60 * 1000;
const STALE = 24 * 60 * 60 * 1000;

function get(k, stale=false){
  const item = CACHE.get(k);
  if(!item) return null;
  const age = Date.now() - item.ts;
  if(age <= TTL) return item.data;
  if(stale && age <= STALE) return item.data;
  return null;
}
function set(k,data){ CACHE.set(k,{ts:Date.now(),data}); }

function fallback(series_id){
  return {
    realtime_start: new Date().toISOString().slice(0,10),
    realtime_end: new Date().toISOString().slice(0,10),
    observation_start: "1776-07-04",
    observation_end: "9999-12-31",
    units: "lin",
    output_type: 1,
    file_type: "json",
    order_by: "observation_date",
    sort_order: "desc",
    count: 1,
    offset: 0,
    limit: 1,
    observations: [{ realtime_start:"", realtime_end:"", date:new Date().toISOString().slice(0,10), value:"0" }],
    _zynqel_source: "fred_fallback",
    _zynqel_series_id: series_id
  };
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Cache-Control","s-maxage=600, stale-while-revalidate=86400");
  if(req.method === "OPTIONS") return res.status(200).end();

  const series_id = String(req.query.series_id || "").trim();
  const limit = String(req.query.limit || "1");
  const api_key = String(req.query.api_key || process.env.FRED_API_KEY || "").trim();

  if(!series_id) return res.status(200).json(fallback("UNKNOWN"));

  const key = `${series_id}|${limit}`;
  const fresh = get(key,false);
  if(fresh) return res.status(200).json({...fresh,_zynqel_cache:"fresh"});

  if(!api_key){
    const fb = fallback(series_id);
    set(key,fb);
    return res.status(200).json({...fb,_zynqel_note:"No FRED api key"});
  }

  try{
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(series_id)}&api_key=${encodeURIComponent(api_key)}&file_type=json&sort_order=desc&limit=${encodeURIComponent(limit)}`;
    const r = await fetch(url, {headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}});
    const txt = await r.text();
    if(!r.ok) throw new Error(`FRED HTTP ${r.status}: ${txt.slice(0,120)}`);
    const data = JSON.parse(txt);
    set(key,data);
    return res.status(200).json({...data,_zynqel_cache:"live"});
  }catch(e){
    const stale = get(key,true);
    if(stale) return res.status(200).json({...stale,_zynqel_cache:"stale",_zynqel_error:e.message});
    const fb = fallback(series_id);
    set(key,fb);
    return res.status(200).json({...fb,_zynqel_error:e.message});
  }
}
