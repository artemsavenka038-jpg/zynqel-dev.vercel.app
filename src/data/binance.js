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
