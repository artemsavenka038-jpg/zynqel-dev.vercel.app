const CACHE = globalThis.__ZYNQEL_NEWS_CACHE__ || new Map();
globalThis.__ZYNQEL_NEWS_CACHE__ = CACHE;

const TTL = 10 * 60 * 1000;
const STALE = 6 * 60 * 60 * 1000;

function get(k, stale=false){
  const item = CACHE.get(k);
  if(!item) return null;
  const age = Date.now()-item.ts;
  if(age <= TTL) return item.data;
  if(stale && age <= STALE) return item.data;
  return null;
}
function set(k,data){ CACHE.set(k,{ts:Date.now(),data}); }
function fallback(){
  return {status:"success", totalResults:0, results:[], _zynqel_source:"news_fallback"};
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Cache-Control","s-maxage=600, stale-while-revalidate=21600");
  if(req.method === "OPTIONS") return res.status(200).end();

  const params = new URLSearchParams();
  for(const [k,v] of Object.entries(req.query || {})){
    if(k === "apikey") continue;
    if(Array.isArray(v)) params.set(k, v[0]);
    else params.set(k, v);
  }
  const apiKey = String(req.query.apikey || process.env.NEWSDATA_API_KEY || "").trim();
  if(apiKey) params.set("apikey", apiKey);

  const key = params.toString();
  const fresh = get(key,false);
  if(fresh) return res.status(200).json({...fresh,_zynqel_cache:"fresh"});

  if(!apiKey){
    const fb = fallback();
    set(key, fb);
    return res.status(200).json({...fb,_zynqel_note:"No NewsData api key"});
  }

  try{
    const url = `https://newsdata.io/api/1/news?${params.toString()}`;
    const r = await fetch(url, {headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}});
    const txt = await r.text();
    if(!r.ok) throw new Error(`NewsData HTTP ${r.status}: ${txt.slice(0,120)}`);
    const data = JSON.parse(txt);
    set(key,data);
    return res.status(200).json({...data,_zynqel_cache:"live"});
  }catch(e){
    const stale = get(key,true);
    if(stale) return res.status(200).json({...stale,_zynqel_cache:"stale",_zynqel_error:e.message});
    const fb = fallback();
    set(key,fb);
    return res.status(200).json({...fb,_zynqel_error:e.message});
  }
}
