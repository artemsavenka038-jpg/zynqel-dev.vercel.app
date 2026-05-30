// ZYNQEL Safe / Active Mode layer extracted from index.html
// ---- extracted inline script block 44 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL SAFE / ACTIVE MODE
// Adds a stable mode switch:
// SAFE = current conservative behavior
// ACTIVE = slightly softer thresholds for fewer false WAITs
// Does not remove existing BUY/SELL/WAIT logic.
// ═══════════════════════════════════════════════════════
(function(){
  if(window.__ZYNQEL_TRADE_MODE_PATCH__) return;
  window.__ZYNQEL_TRADE_MODE_PATCH__ = true;

  window.ZYNQEL_TRADE_MODE = window.ZYNQEL_TRADE_MODE || {
    mode: localStorage.getItem('zynqel_trade_mode') || 'safe',
    safe: {
      minFinalTradeConfluence: 65,
      minEdge: 12,
      minConfidence: 62
    },
    active: {
      minFinalTradeConfluence: 55,
      minEdge: 6,
      minConfidence: 54
    }
  };

  function ru(){ return window.appLang === 'ru'; }

  function currentMode(){
    var m = localStorage.getItem('zynqel_trade_mode') || window.ZYNQEL_TRADE_MODE.mode || 'safe';
    return m === 'active' ? 'active' : 'safe';
  }

  function thresholds(){
    var m = currentMode();
    return window.ZYNQEL_TRADE_MODE[m] || window.ZYNQEL_TRADE_MODE.safe;
  }

  window.zynqelGetTradeMode = currentMode;
  window.zynqelGetTradeThresholds = thresholds;

  function setMode(mode){
    mode = mode === 'active' ? 'active' : 'safe';
    window.ZYNQEL_TRADE_MODE.mode = mode;
    localStorage.setItem('zynqel_trade_mode', mode);

    // Important: remove old mutated ACTIVE forecast before rendering SAFE.
    // Without this, SAFE can flicker back to previous ACTIVE answer.
    try{
      window.lastAnalysisForecast = null;
      window.lastAnalysisAsset = null;
      window.__zynqelLastTradeDecision = null;
      window.__zynqelEntryQualityLast = null;
    }catch(e){}

    renderPanel();

    try{
      var assetToReload = window.currentAnalysisAsset || window.currentAsset;
      if(assetToReload && typeof window.loadAnalysis === 'function'){
        setTimeout(function(){
          window.loadAnalysis(assetToReload, {force:true, mode:mode});
        }, 80);
      }
      setTimeout(function(){
        try{ if(typeof window.updateActiveAnalysisLive === 'function') window.updateActiveAnalysisLive(); }catch(e){}
        try{ if(typeof window.zynqelRenderEntryQuality === 'function') window.zynqelRenderEntryQuality(); }catch(e){}
      }, 420);
    }catch(e){}
  }

  window.zynqelSetTradeMode = setMode;

  function findInsertRoot(){
    var page = document.getElementById('page-analysis');
    if(!page) return null;
    return page;
  }

  function ensurePanel(){
    var root = findInsertRoot();
    if(!root) return null;

    var panel = document.getElementById('zynqel-trade-mode-panel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'zynqel-trade-mode-panel';
    }

    var controlRow = document.getElementById('analysis-chips');
    if(controlRow && controlRow.parentNode){
      var row = controlRow.parentNode;
      if(row.nextSibling !== panel){
        row.parentNode.insertBefore(panel, row.nextSibling);
      }
    }else if(!root.contains(panel)){
      root.insertBefore(panel, root.firstChild);
    }

    return panel;
  }

  function renderPanel(){
    var panel = ensurePanel();
    if(!panel) return;

    var m = currentMode();
    var th = thresholds();

    var title = ru() ? 'РЕЖИМ СИГНАЛОВ' : 'TRADE SIGNAL MODE';
    var safeLabel = ru() ? 'SAFE' : 'SAFE';
    var activeLabel = ru() ? 'ACTIVE' : 'ACTIVE';

    var desc = m === 'active'
      ? (ru()
          ? 'ACTIVE: сигналы BUY/SELL появляются чаще. Порог ниже: confluence '+th.minFinalTradeConfluence+', edge '+th.minEdge+'.'
          : 'ACTIVE: BUY/SELL signals appear more often. Softer threshold: confluence '+th.minFinalTradeConfluence+', edge '+th.minEdge+'.')
      : (ru()
          ? 'SAFE: осторожный режим. Больше WAIT, меньше ложных входов. Порог: confluence '+th.minFinalTradeConfluence+', edge '+th.minEdge+'.'
          : 'SAFE: conservative mode. More WAIT, fewer false entries. Threshold: confluence '+th.minFinalTradeConfluence+', edge '+th.minEdge+'.');

    var html =
      '<div class="zq-trade-mode-head">' +
        '<div class="zq-trade-mode-title">'+title+'</div>' +
        '<div class="zq-trade-mode-buttons">' +
          '<button type="button" class="zq-trade-mode-btn safe '+(m==='safe'?'active':'')+'" data-zq-mode="safe">'+safeLabel+'</button>' +
          '<button type="button" class="zq-trade-mode-btn active '+(m==='active'?'active':'')+'" data-zq-mode="active">'+activeLabel+'</button>' +
        '</div>' +
      '</div>' +
      '<div class="zq-trade-mode-desc">'+desc+'</div>';

    if(panel.innerHTML !== html){
      panel.innerHTML = html;
      panel.querySelectorAll('[data-zq-mode]').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.preventDefault();
          e.stopPropagation();
          setMode(btn.getAttribute('data-zq-mode'));
        });
      });
    }
  }

  // Apply Active/Safe adjustment to forecast object after existing engine.
  function applyModeToForecast(assetId, forecast){
    if(!forecast || typeof forecast !== 'object') return forecast;

    // Clone forecast before Active changes.
    // Never mutate the original forecast object stored as lastAnalysisForecast.
    forecast = Object.assign({}, forecast);

    var mode = currentMode();
    var th = thresholds();

    forecast.tradeMode = mode;
    forecast.tradeModeThresholds = th;

    if(mode !== 'active'){
      if(forecast.isActiveModeSignal || String(forecast.source || '').indexOf('ACTIVE') >= 0){
        forecast.action = 'wait';
        forecast.signal = 'wait';
        forecast.sentiment = 'neutral';
        forecast.source = String(forecast.source || 'LOCAL ENGINE').replace(/\s*\+\s*ACTIVE MODE/g,'').replace(/\s*\+\s*ACTIVE/g,'');
        delete forecast.isActiveModeSignal;
        delete forecast.entryZone;
        delete forecast.zone;
        delete forecast.invalidation;
        delete forecast.target1;
        delete forecast.waitFor;
      }
      return forecast;
    }

    var action = String(forecast.action || forecast.signal || '').toLowerCase();
    var prob = Number(forecast.probability ?? forecast.upwardProbability ?? 50);
    var conf = Number(forecast.confidence ?? 50);

    if(!Number.isFinite(prob)) prob = 50;
    if(!Number.isFinite(conf)) conf = 50;

    // Do not override strong existing signals. Only upgrade weak WAIT when data gives a clear edge.
    var isWait = !action || action === 'wait' || action === 'neutral';
    if(!isWait) return forecast;

    var early = null;
    var deriv = null;
    try{ if(typeof window.zynqelEarlyMoveWarning === 'function') early = window.zynqelEarlyMoveWarning(assetId); }catch(e){}
    try{ if(typeof window.zynqelDerivativesSignal === 'function') deriv = window.zynqelDerivativesSignal(assetId); }catch(e){}

    var earlyScore = early && Number.isFinite(Number(early.score)) ? Number(early.score) : 0;
    var earlyDir = early && early.direction ? String(early.direction) : '';
    var derivScore = deriv && Number.isFinite(Number(deriv.score)) ? Number(deriv.score) : 0;

    var bullScore = 0, bearScore = 0, reasons = [];

    if(prob >= 58){ bullScore += Math.round((prob-50)*1.2); reasons.push('probability bullish'); }
    if(prob <= 42){ bearScore += Math.round((50-prob)*1.2); reasons.push('probability bearish'); }
    if(conf >= th.minConfidence){ bullScore += 4; bearScore += 4; }

    if(earlyScore >= 60 && earlyDir.indexOf('bull') >= 0){ bullScore += Math.round(earlyScore/7); reasons.push('early bullish'); }
    if(earlyScore >= 60 && (earlyDir.indexOf('bear') >= 0 || earlyDir.indexOf('down') >= 0)){ bearScore += Math.round(earlyScore/7); reasons.push('early bearish'); }

    if(derivScore >= 5){ bullScore += derivScore; reasons.push('derivatives bullish'); }
    if(derivScore <= -5){ bearScore += Math.abs(derivScore); reasons.push('derivatives bearish'); }

    var edge = Math.abs(bullScore - bearScore);

    // ACTIVE MODE REAL SIGNAL PATCH
    // Old logic required prob >=55 / <=45. In practice the engine often keeps probability at 50
    // while Early Move / Derivatives already show strong edge, so Active looked identical to Safe.
    // Active now upgrades WAIT when factor edge is strong enough, but Safe mode stays unchanged.
    var market = null;
    try{ if(typeof window.zynqelMarketRiskEarlyWarning === 'function') market = window.zynqelMarketRiskEarlyWarning(assetId); }catch(e){}
    var marketRiskScore = market && Number.isFinite(Number(market.score)) ? Number(market.score) : 0;
    var hardRiskAgainstBuy = marketRiskScore >= 78;
    var hardDerivAgainstBuy = derivScore <= -8;
    var hardDerivAgainstSell = derivScore >= 8;

    var activeBuyAllowed = bullScore > bearScore && edge >= th.minEdge && conf >= th.minConfidence && !hardRiskAgainstBuy && !hardDerivAgainstBuy;
    var activeSellAllowed = bearScore > bullScore && edge >= th.minEdge && conf >= th.minConfidence && !hardDerivAgainstSell;

    // If probability is neutral but Early Move is very strong, still allow Active early signal.
    if(earlyScore >= 82 && earlyDir.indexOf('bull') >= 0 && !hardRiskAgainstBuy && !hardDerivAgainstBuy){
      activeBuyAllowed = true;
    }
    if(earlyScore >= 82 && (earlyDir.indexOf('bear') >= 0 || earlyDir.indexOf('down') >= 0) && !hardDerivAgainstSell){
      activeSellAllowed = true;
    }

    function ensureReasoningArray(){
      forecast.reasoning = Array.isArray(forecast.reasoning) ? forecast.reasoning : (forecast.reasoning ? [String(forecast.reasoning)] : []);
    }

    function fmtPrice(v){
      var n = Number(v);
      if(!Number.isFinite(n)) return null;
      var dec = n >= 100 ? 2 : n >= 10 ? 3 : 4;
      return '$' + n.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
    }

    function currentPrice(){
      try{
        if(assetId && window.livePrices && window.livePrices[assetId] && Number.isFinite(Number(window.livePrices[assetId].price))) return Number(window.livePrices[assetId].price);
        if(assetId && window.marketData && window.marketData[assetId] && Number.isFinite(Number(window.marketData[assetId].price))) return Number(window.marketData[assetId].price);
      }catch(e){}
      return null;
    }

    if(activeBuyAllowed){
      var p = currentPrice();
      forecast.action = 'buy';
      forecast.signal = 'buy';
      forecast.sentiment = 'bullish';
      forecast.confidence = Math.max(conf, Math.min(76, conf + 7, Math.max(62, earlyScore - 18)));
      forecast.probability = Math.max(prob, 57, Math.min(72, 54 + Math.round(edge/3)));
      forecast.upwardProbability = forecast.probability;
      forecast.isActiveModeSignal = true;
      forecast.source = (forecast.source || 'LOCAL ENGINE') + ' + ACTIVE MODE';
      if(p){
        forecast.entryZone = (ru() ? 'Активная зона BUY: ' : 'Active BUY zone: ') + fmtPrice(p*0.996) + ' - ' + fmtPrice(p*1.004);
        forecast.zone = forecast.entryZone;
        forecast.invalidation = (ru() ? 'Отмена ниже ' : 'Invalidation below ') + fmtPrice(p*0.986);
        forecast.target1 = (ru() ? 'Первая цель ' : 'First target ') + fmtPrice(p*1.014);
      }
      forecast.waitFor = ru()
        ? 'Active Mode: ранний BUY активен, вход только после удержания EMA/уровня и подтверждения объёма'
        : 'Active Mode: early BUY is active, enter only after EMA/level hold and volume confirmation';
      forecast.shortTerm = ru() ? '24ч: активный ранний BUY при подтверждении' : '24h: active early BUY if confirmed';
      ensureReasoningArray();
      forecast.reasoning.unshift(ru()
        ? 'ACTIVE Mode повысил WAIT до BUY: сильный перевес факторов, Early Move '+earlyScore+'/100, edge '+edge+'.'
        : 'ACTIVE Mode upgraded WAIT to BUY: strong factor edge, Early Move '+earlyScore+'/100, edge '+edge+'.');
    }else if(activeSellAllowed){
      var ps = currentPrice();
      forecast.action = 'sell';
      forecast.signal = 'sell';
      forecast.sentiment = 'bearish';
      forecast.confidence = Math.max(conf, Math.min(76, conf + 7, Math.max(62, earlyScore - 18)));
      forecast.probability = Math.min(prob, 43, Math.max(25, 46 - Math.round(edge/3)));
      forecast.upwardProbability = forecast.probability;
      forecast.isActiveModeSignal = true;
      forecast.source = (forecast.source || 'LOCAL ENGINE') + ' + ACTIVE MODE';
      if(ps){
        forecast.entryZone = (ru() ? 'Активная зона SELL: ' : 'Active SELL zone: ') + fmtPrice(ps*0.996) + ' - ' + fmtPrice(ps*1.004);
        forecast.zone = forecast.entryZone;
        forecast.invalidation = (ru() ? 'Отмена выше ' : 'Invalidation above ') + fmtPrice(ps*1.014);
        forecast.target1 = (ru() ? 'Первая цель ' : 'First target ') + fmtPrice(ps*0.986);
      }
      forecast.waitFor = ru()
        ? 'Active Mode: ранний SELL активен, вход только после пробоя/удержания ниже EMA и подтверждения объёма'
        : 'Active Mode: early SELL is active, enter only after breakdown/hold below EMA and volume confirmation';
      forecast.shortTerm = ru() ? '24ч: активный ранний SELL при подтверждении' : '24h: active early SELL if confirmed';
      ensureReasoningArray();
      forecast.reasoning.unshift(ru()
        ? 'ACTIVE Mode повысил WAIT до SELL: сильный медвежий перевес факторов, Early Move '+earlyScore+'/100, edge '+edge+'.'
        : 'ACTIVE Mode upgraded WAIT to SELL: strong bearish factor edge, Early Move '+earlyScore+'/100, edge '+edge+'.');
    }

    return forecast;
  }

  window.zynqelApplyTradeMode = applyModeToForecast;

  // Wrap common forecast functions if present.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__tradeModeWrapped){
    var oldGen = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      var out = await oldGen.apply(this, arguments);
      try{ out = applyModeToForecast(assetId || window.currentAnalysisAsset || window.currentAsset, out); }catch(e){}
      return out;
    };
    window.generateForecast.__tradeModeWrapped = true;
  }

  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__tradeModeWrapped){
    var oldNorm = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNorm.apply(this, arguments);
      try{ out = applyModeToForecast(assetId || window.currentAnalysisAsset || window.currentAsset, out); }catch(e){}
      return out;
    };
    window.normalizeForecast.__tradeModeWrapped = true;
  }

  // Keep only panel refresh. Do NOT mutate lastAnalysisForecast here.
  // Mutating cached forecast caused SAFE to keep showing previous ACTIVE answer.
  setInterval(function(){
    renderPanel();
  }, 1500);

  var mo = new MutationObserver(function(){ renderPanel(); });
  try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){}

  setTimeout(renderPanel, 200);
  setTimeout(renderPanel, 1000);
  setTimeout(renderPanel, 2500);
})();


// =====================================================
// ZYNQEL SINGLE ACTIVE/SAFE TRADE DECISION FIX
// Safe: no DOM mutation, no duplicate blocks.
// Only wraps buildTradeDecision once and returns one decision.
// =====================================================
(function(){
  if(window.__ZYNQEL_SINGLE_ACTIVE_SAFE_TRADE_FIX__) return;
  window.__ZYNQEL_SINGLE_ACTIVE_SAFE_TRADE_FIX__ = true;

  function active(){
    try{
      if(typeof window.zynqelGetTradeMode === 'function') return window.zynqelGetTradeMode() === 'active';
      return localStorage.getItem('zynqel_trade_mode') === 'active';
    }catch(e){ return false; }
  }

  function num(v, fb){
    if(typeof v === 'string') v = v.replace(/[$,%\s,]/g,'');
    v = Number(v);
    return Number.isFinite(v) ? v : fb;
  }

  function getLive(asset){
    return window.liveData && window.liveData[asset] ? window.liveData[asset] : {};
  }

  function fmt(v){
    v = num(v, 0);
    if(!v) return '--';
    var d = v >= 100 ? 2 : v >= 10 ? 3 : 4;
    return '$' + v.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});
  }

  function frames(asset){
    return window.z4CandleFrames && window.z4CandleFrames[asset] ? window.z4CandleFrames[asset] : {};
  }

  function candles(asset){
    var f = frames(asset);
    return (f['15m'] && f['15m'].length >= 30) ? f['15m'] :
           (f['1h'] && f['1h'].length >= 30) ? f['1h'] : [];
  }

  function ema(arr, p){
    if(!arr || arr.length < p) return null;
    var k = 2/(p+1), prev = 0;
    for(var i=0;i<p;i++) prev += arr[i];
    prev /= p;
    for(var j=p;j<arr.length;j++) prev = arr[j]*k + prev*(1-k);
    return prev;
  }

  function early(asset){
    try{
      if(typeof window.zynqelEarlyMoveWarning === 'function'){
        var e = window.zynqelEarlyMoveWarning(asset);
        if(e && Number.isFinite(Number(e.score))) return Number(e.score);
      }
    }catch(e){}
    return 0;
  }

  function volumeBoost(cs){
    if(!cs || cs.length < 20) return 1;
    var last = num(cs[cs.length-1].v, 0);
    var avg = cs.slice(-20).reduce(function(s,c){ return s + num(c.v,0); },0)/20;
    return avg ? last/avg : 1;
  }

  function activeSetup(asset, forecast){
    if(!active()) return null;
    forecast = forecast || {};
    var prob = num(forecast.probability ?? forecast.upwardProbability, 50);
    var conf = num(forecast.confidence, 50);
    var price = num(getLive(asset).price, 0);
    var cs = candles(asset);
    var closes = cs.map(function(c){ return num(c.c,0); }).filter(Boolean);
    var e9 = ema(closes, 9), e21 = ema(closes, 21);
    var ev = early(asset);
    var vol = volumeBoost(cs);

    var bullish = price && e9 && e21 && price > e9 && e9 >= e21;
    var bearish = price && e9 && e21 && price < e9 && e9 <= e21;

    if(prob >= 48 && conf >= 55 && ev >= 75 && vol >= 0.35 && bullish){
      return {side:'buy', price:price, prob:prob, conf:conf, early:ev, vol:vol};
    }
    if(prob <= 52 && conf >= 55 && ev >= 75 && vol >= 0.35 && bearish){
      return {side:'sell', price:price, prob:prob, conf:conf, early:ev, vol:vol};
    }
    return null;
  }

  function makeDecision(asset, s, oldTrade){
    var ru = window.appLang === 'ru';
    var p = s.price;
    var low = s.side === 'buy' ? p*0.994 : p*1.006;
    var high = s.side === 'buy' ? p*1.006 : p*0.994;
    var invalid = s.side === 'buy' ? p*0.986 : p*1.014;
    var target = s.side === 'buy' ? p*1.014 : p*0.986;

    return Object.assign({}, oldTrade || {}, {
      action: s.side,
      actionLabel: s.side === 'buy'
        ? (ru ? 'Я бы готовился к раннему BUY' : 'I would prepare for early BUY')
        : (ru ? 'Я бы готовился к раннему SELL' : 'I would prepare for early SELL'),
      entryText: (s.side === 'buy' ? 'Active BUY watch zone: ' : 'Active SELL watch zone: ') +
        fmt(Math.min(low, high)) + ' — ' + fmt(Math.max(low, high)),
      riskText: 'Invalidation: ' + fmt(invalid) + ' · first target: ' + fmt(target),
      note: oldTrade && oldTrade.note ? oldTrade.note : 'This is not financial advice; it is an app signal based on current data.',
      source: ((oldTrade && oldTrade.source) || 'LOCAL ENGINE') + ' + ACTIVE'
    });
  }

  function wrap(){
    if(typeof window.buildTradeDecision !== 'function') return false;
    if(window.buildTradeDecision.__singleActiveSafeTradeFix) return true;

    var old = window.buildTradeDecision;
    window.buildTradeDecision = function(assetId, forecast){
      var oldTrade = old.apply(this, arguments);
      try{
        var asset = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
        var s = activeSetup(asset, forecast || window.lastAnalysisForecast || {});
        if(s) return makeDecision(asset, s, oldTrade);
      }catch(e){
        console.warn('Single Active/Safe trade fix skipped:', e.message);
      }
      return oldTrade;
    };
    window.buildTradeDecision.__singleActiveSafeTradeFix = true;
    return true;
  }

  wrap();
  setTimeout(wrap, 300);
  setTimeout(wrap, 1200);
  setInterval(wrap, 2500);
  console.log('✅ ZYNQEL Single Active/Safe Trade Decision Fix enabled');
})();

