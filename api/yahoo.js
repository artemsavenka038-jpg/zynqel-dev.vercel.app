const CACHE = globalThis.__ZYNQEL_API_CACHE__ || new Map();
globalThis.__ZYNQEL_API_CACHE__ = CACHE;
const TTL = 2 * 60 * 1000;
const STALE = 60 * 60 * 1000;
const FALLBACK = {"^GSPC":7580.06,"^IXIC":27000,"^VIX":15.5,"^TNX":4.45,"CL=F":77,"XAUUSD=X":3340,"GC=F":3340,"XAGUSD=X":33.5,"SI=F":33.5,"DX-Y.NYB":100.8,"DXY":100.8,"EURUSD=X":1.08,"GBPUSD=X":1.27};
const STOOQ = {"^GSPC":"^spx","^IXIC":"^ndq","^VIX":"^vix","GC=F":"gc.f","SI=F":"si.f","XAUUSD=X":"xauusd","XAGUSD=X":"xagusd","CL=F":"cl.f","^TNX":"10usy.b"};
function key(s,i,r){return `${s}|${i}|${r}`}
function get(k,stale=false){const it=CACHE.get(k); if(!it)return null; const age=Date.now()-it.ts; if(age<=TTL)return it.data; if(stale&&age<=STALE)return it.data; return null;}
function set(k,d){if(d&&d.chart)CACHE.set(k,{ts:Date.now(),data:d});}
function like(symbol,price,source='api-fallback'){price=Number(price)||FALLBACK[symbol]||1; const prev=price*0.998, now=Math.floor(Date.now()/1000); return {chart:{result:[{meta:{currency:'USD',symbol,exchangeName:source,regularMarketPrice:price,previousClose:prev,chartPreviousClose:prev,regularMarketTime:now},timestamp:[now-86400,now],indicators:{quote:[{open:[prev,price],high:[Math.max(prev,price),Math.max(prev,price)],low:[Math.min(prev,price),Math.min(prev,price)],close:[prev,price],volume:[0,0]}]}}],error:null},_zynqel_source:source};}
async function yahoo(host,symbol,interval,range){const url=`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`; const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/124 Safari/537.36","Accept":"application/json,text/plain,*/*","Accept-Language":"en-US,en;q=0.9"}}); const txt=await r.text(); if(!r.ok){const e=new Error(`Yahoo HTTP ${r.status}: ${txt.slice(0,120)}`); e.status=r.status; throw e;} return JSON.parse(txt);}
async function stooq(symbol){const s=STOOQ[symbol]; if(!s)throw new Error('No stooq symbol'); const r=await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=csv`,{headers:{"User-Agent":"Mozilla/5.0","Accept":"text/csv,*/*"}}); const csv=await r.text(); if(!r.ok)throw new Error('Stooq HTTP '+r.status); const lines=csv.trim().split(/\r?\n/); if(lines.length<2)throw new Error('Stooq empty'); const h=lines[0].split(',').map(x=>x.toLowerCase()), v=lines[1].split(','), row={}; h.forEach((x,i)=>row[x]=v[i]); const close=Number(row.close), open=Number(row.open||close); if(!Number.isFinite(close)||close<=0)throw new Error('Stooq invalid'); return like(symbol,close,'stooq');}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=3600');
  if(req.method==='OPTIONS')return res.status(200).end();
  const symbol=String(req.query.symbol||'').trim(); const interval=String(req.query.interval||'1d'); const range=String(req.query.range||'5d');
  if(!symbol)return res.status(200).json(like('UNKNOWN',1,'missing-symbol'));
  const k=key(symbol,interval,range); const fresh=get(k,false); if(fresh)return res.status(200).json({...fresh,_zynqel_cache:'api_fresh'});
  let last=null;
  for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){try{const d=await yahoo(host,symbol,interval,range); set(k,d); return res.status(200).json({...d,_zynqel_cache:'api_live',_zynqel_host:host});}catch(e){last=e;}}
  const stale=get(k,true); if(stale)return res.status(200).json({...stale,_zynqel_cache:'api_stale',_zynqel_error:last?.message});
  try{const d=await stooq(symbol); set(k,d); return res.status(200).json({...d,_zynqel_cache:'api_stooq',_zynqel_error:last?.message});}
  catch(e){const d=like(symbol,FALLBACK[symbol]||1,'api_synthetic'); set(k,d); return res.status(200).json({...d,_zynqel_cache:'api_synthetic',_zynqel_error:last?.message,_zynqel_fallback_error:e.message});}
}
