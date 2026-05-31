const CACHE = globalThis.__ZYNQEL_GROQ_CACHE__ || new Map();
globalThis.__ZYNQEL_GROQ_CACHE__ = CACHE;
const TTL = 30000, STALE = 300000;
function k(body){ try{ const p=JSON.parse(body||"{}"); return (p.model||"m")+"|"+(p.messages||[]).map(m=>m.content||"").join("\n").slice(0,1200); }catch(e){ return String(body||"").slice(0,1200); } }
function get(key, stale=false){ const it=CACHE.get(key); if(!it)return null; const age=Date.now()-it.ts; if(age<=TTL)return it.data; if(stale&&age<=STALE)return it.data; return null; }
function set(key,data){ CACHE.set(key,{ts:Date.now(),data}); }
function fb(msg){ return {id:"zynqel-local-v7-fallback",object:"chat.completion",created:Math.floor(Date.now()/1000),model:"local-v7-fallback",choices:[{index:0,message:{role:"assistant",content:msg||"Groq unavailable. Using local V7."},finish_reason:"stop"}],usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0},_zynqel_groq_status:"fallback",_zynqel_groq_fallback:true}; }
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*"); res.setHeader("Access-Control-Allow-Methods","POST,GET,OPTIONS"); res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization"); res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=300");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method==="GET") return res.status(200).json({ok:true,route:"/api/groq",status:process.env.GROQ_API_KEY?"ready":"missing_key"});
  const key=process.env.GROQ_API_KEY;
  if(!key) return res.status(200).json(fb("GROQ_API_KEY is missing on Vercel. Using local V7 fallback."));
  const body=typeof req.body==="string"?req.body:JSON.stringify(req.body||{});
  const ck=k(body); const fresh=get(ck,false); if(fresh)return res.status(200).json({...fresh,_zynqel_cache:"groq_fresh"});
  try{
    let payload={}; try{payload=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});}catch(e){}
    payload.model=payload.model||"llama-3.3-70b-versatile";
    const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const txt=await r.text(); let data; try{data=JSON.parse(txt);}catch(e){data={raw:txt};}
    if(!r.ok){ const stale=get(ck,true); if(stale)return res.status(200).json({...stale,_zynqel_cache:"groq_stale",_zynqel_error:"Groq HTTP "+r.status}); return res.status(200).json(fb("Groq HTTP "+r.status+". Using local V7 fallback.")); }
    data._zynqel_groq_status="live"; set(ck,data); return res.status(200).json(data);
  }catch(e){ const stale=get(ck,true); if(stale)return res.status(200).json({...stale,_zynqel_cache:"groq_stale_after_error",_zynqel_error:e.message}); return res.status(200).json(fb(e.message)); }
}