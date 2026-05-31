// ZYNQEL data/binance.js
// Extracted from original marketData.js. Classic global script, not module.

// ---- extracted inline script block 35 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL CANDLE FEED REPAIR LAYER
// Fixes 15m/1h/4h/1d Candles = 0, EMA empty, MACD empty, Volume empty.
// It only fills missing candle data. It does NOT change BUY/SELL/WAIT rules.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_CANDLE_REPAIR = {
    enabled: true,
    running: false,
    lastRun: 0,
    ttl: 45000,
    symbols: {
      BTC:'BTCUSDT',
      ETH:'ETHUSDT',
      SOL:'SOLUSDT',
      XRP:'XRPUSDT',
      SUI:'SUIUSDT',
      AVAX:'AVAXUSDT'
    },
    intervals: {
      '15m':'15m',
      '1h':'1h',
      '4h':'4h',
      '1d':'1d'
    },
    status: {}
  };

  function num(x, fb){
    x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? 0 : fb);
  }

  function asset(){
    return window.currentAnalysisAsset || window.currentAsset || 'BTC';
  }

  function isCrypto(id){
    return !!window.ZYNQEL_CANDLE_REPAIR.symbols[id];
  }

  function mapKline(k){
    return {
      t: num(k[0]),
      o: num(k[1]),
      h: num(k[2]),
      l: num(k[3]),
      c: num(k[4]),
      v: num(k[5])
    };
  }

  async function fetchKlines(symbol, interval, limit){
    var url = 'https://fapi.binance.com/fapi/v1/klines?symbol=' + encodeURIComponent(symbol) +
      '&interval=' + encodeURIComponent(interval) +
      '&limit=' + encodeURIComponent(limit || 300);

    var r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error('Binance klines HTTP ' + r.status);
    var arr = await r.json();
    if(!Array.isArray(arr) || arr.length === 0) throw new Error('empty klines');
    return arr.map(mapKline).filter(function(c){
      return c && c.o > 0 && c.h > 0 && c.l > 0 && c.c > 0;
    });
  }

  function ensureStores(id){
    if(!window.z4CandleFrames) window.z4CandleFrames = {};
    if(!window.z4CandleFrames[id]) window.z4CandleFrames[id] = {};
    if(!window.candleData) window.candleData = {};
  }

  function saveCandles(id, tf, candles){
    ensureStores(id);
    if(!Array.isArray(candles) || candles.length < 20) return false;

    window.z4CandleFrames[id][tf] = candles;

    // old fallback store used by several older patches
    if(tf === '1h') window.candleData[id] = candles;

    window.ZYNQEL_CANDLE_REPAIR.status[id] = window.ZYNQEL_CANDLE_REPAIR.status[id] || {};
    window.ZYNQEL_CANDLE_REPAIR.status[id][tf] = {
      ok: true,
      count: candles.length,
      lastClose: candles[candles.length-1].c,
      ts: Date.now()
    };

    return true;
  }

  async function repairAsset(id, force){
    if(!isCrypto(id)) return false;

    var now = Date.now();
    if(!force && window.ZYNQEL_CANDLE_REPAIR.lastRun && now - window.ZYNQEL_CANDLE_REPAIR.lastRun < 2500) return false;

    var symbol = window.ZYNQEL_CANDLE_REPAIR.symbols[id];
    ensureStores(id);

    var tasks = Object.keys(window.ZYNQEL_CANDLE_REPAIR.intervals).map(async function(tf){
      try{
        var existing = window.z4CandleFrames[id] && window.z4CandleFrames[id][tf] ? window.z4CandleFrames[id][tf] : [];
        var stale = !existing.length || existing.length < 25;
        if(!force && !stale) return true;

        var candles = await fetchKlines(symbol, window.ZYNQEL_CANDLE_REPAIR.intervals[tf], tf === '1d' ? 365 : 300);
        return saveCandles(id, tf, candles);
      }catch(e){
        window.ZYNQEL_CANDLE_REPAIR.status[id] = window.ZYNQEL_CANDLE_REPAIR.status[id] || {};
        window.ZYNQEL_CANDLE_REPAIR.status[id][tf] = {ok:false,error:e.message,ts:Date.now()};
        console.warn('Candle repair failed', id, tf, e.message);
        return false;
      }
    });

    await Promise.allSettled(tasks);
    window.ZYNQEL_CANDLE_REPAIR.lastRun = Date.now();

    // Refresh diagnostic and active analysis UI without changing forecast math
    try{ if(typeof window.zynqelPersistentTopRender === 'function') window.zynqelPersistentTopRender(); }catch(e){}
    try{ if(typeof window.zynqelHardRenderStableAI === 'function') window.zynqelHardRenderStableAI(); }catch(e){}
    try{ if(typeof window.updateActiveAnalysisLive === 'function') window.updateActiveAnalysisLive(); }catch(e){}

    return true;
  }

  window.zynqelRepairCandlesForAsset = repairAsset;

  async function tick(force){
    if(!window.ZYNQEL_CANDLE_REPAIR.enabled || window.ZYNQEL_CANDLE_REPAIR.running) return;
    var id = asset();
    if(!isCrypto(id)) return;

    window.ZYNQEL_CANDLE_REPAIR.running = true;
    try{
      await repairAsset(id, force);
    }finally{
      window.ZYNQEL_CANDLE_REPAIR.running = false;
    }
  }

  // Patch analysis loading: candles are repaired before/around forecast rendering.
  if(typeof window.loadAnalysis === 'function' && !window.loadAnalysis.__candleRepair){
    var oldLoadAnalysis = window.loadAnalysis;
    window.loadAnalysis = async function(assetId, opts){
      assetId = assetId || asset();
      try{ await repairAsset(assetId, true); }catch(e){}
      return oldLoadAnalysis.apply(this, arguments);
    };
    window.loadAnalysis.__candleRepair = true;
  }

  // Patch Run AI button path even if loadAnalysis is not used directly.
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t && (t.id === 'run-ai-analysis-btn' || (t.closest && t.closest('#run-ai-analysis-btn')))){
      setTimeout(function(){ tick(true); }, 50);
      setTimeout(function(){ tick(true); }, 1200);
    }
  });

  // Run soon and periodically. It fills only missing/stale frames.
  setTimeout(function(){ tick(true); }, 700);
  setTimeout(function(){ tick(true); }, 2500);
  setInterval(function(){ tick(false); }, 30000);
})();



// =====================================================
// ZYNQEL ROBUST CANDLE REPAIR
// Keeps candle frames 15m / 1h / 4h / 1d filled and normalized.
// Uses browser Binance first if existing code works, then /api/binance fallback.
// =====================================================
(function(){
  if(window.__ZYNQEL_ROBUST_CANDLE_REPAIR__) return;
  window.__ZYNQEL_ROBUST_CANDLE_REPAIR__ = true;

  const TF_MAP = {'15m':'15m','1h':'1h','4h':'4h','1d':'1d'};
  const REQUIRED = ['15m','1h','4h','1d'];

  function assetSymbol(asset){
    asset = String(asset || window.currentAnalysisAsset || window.currentAsset || 'BTC').toUpperCase();
    asset = asset.replace('/USD','').replace('USD','').replace('USDT','').replace(/[^A-Z0-9]/g,'');
    return asset || 'BTC';
  }

  function normalizeCandle(c){
    if(!c) return null;
    if(Array.isArray(c)){
      return {t:Number(c[0]), o:Number(c[1]), h:Number(c[2]), l:Number(c[3]), c:Number(c[4]), v:Number(c[5])};
    }
    return {
      t:Number(c.t || c.time || c.openTime || c[0]),
      o:Number(c.o || c.open || c[1]),
      h:Number(c.h || c.high || c[2]),
      l:Number(c.l || c.low || c[3]),
      c:Number(c.c || c.close || c[4]),
      v:Number(c.v || c.volume || c[5])
    };
  }

  function normalizeArray(arr){
    if(!Array.isArray(arr)) return [];
    return arr.map(normalizeCandle)
      .filter(x => x && Number.isFinite(x.t) && Number.isFinite(x.c) && x.c > 0)
      .sort((a,b)=>a.t-b.t);
  }

  function isGood(arr, tf){
    arr = normalizeArray(arr);
    if(arr.length < 30) return false;
    const last = arr[arr.length-1];
    let t = Number(last.t);
    if(t && t < 1000000000000) t *= 1000;
    const now = Date.now();
    const maxAge = tf === '15m' ? 45*60*1000 : tf === '1h' ? 3*60*60*1000 : tf === '4h' ? 10*60*60*1000 : 36*60*60*1000;
    return !t || (now - t <= maxAge);
  }

  async function fetchApi(asset, tf){
    const sym = assetSymbol(asset);
    const url = '/api/binance?symbol=' + encodeURIComponent(sym) + '&interval=' + encodeURIComponent(tf) + '&limit=150';
    const r = await fetch(url, {cache:'no-store'});
    const data = await r.json();
    return normalizeArray(data.candles || []);
  }

  async function repairAssetCandles(asset, force){
    asset = assetSymbol(asset);
    window.z4CandleFrames = window.z4CandleFrames || {};
    window.z4CandleFrames[asset] = window.z4CandleFrames[asset] || {};

    const frames = window.z4CandleFrames[asset];

    for(const tf of REQUIRED){
      try{
        if(!force && isGood(frames[tf], tf)){
          frames[tf] = normalizeArray(frames[tf]);
          continue;
        }
        const candles = await fetchApi(asset, tf);
        if(candles.length >= 30){
          frames[tf] = candles;
        }
      }catch(e){
        console.warn('Candle repair failed', asset, tf, e.message);
      }
    }

    return frames;
  }

  window.zynqelRepairCandles = repairAssetCandles;
  window.zynqelNormalizeCandles = normalizeArray;
  window.zynqelCandlesAreGood = isGood;

  // Repair current asset after page load and when analysis changes.
  function schedule(asset, force){
    setTimeout(()=>repairAssetCandles(asset, force), 100);
    setTimeout(()=>repairAssetCandles(asset, force), 1200);
  }

  document.addEventListener('DOMContentLoaded', function(){
    schedule(window.currentAnalysisAsset || window.currentAsset || 'BTC', false);
  });

  document.addEventListener('click', function(e){
    const t = (e.target && e.target.textContent ? e.target.textContent : '').toLowerCase();
    if(t.includes('analysis') || t.includes('safe') || t.includes('active') || t.includes('run')){
      schedule(window.currentAnalysisAsset || window.currentAsset || 'BTC', true);
    }
  });

  setInterval(function(){
    repairAssetCandles(window.currentAnalysisAsset || window.currentAsset || 'BTC', false);
  }, 30000);

  console.log('✅ ZYNQEL robust candle repair enabled');
})();
