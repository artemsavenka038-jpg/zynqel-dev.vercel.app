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
      minFinalTradeConfluence: 58,
      minEdge: 7,
      minConfidence: 56
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
    renderPanel();

    try{
      if(window.currentAnalysisAsset && typeof window.loadAnalysis === 'function'){
        setTimeout(function(){
          window.loadAnalysis(window.currentAnalysisAsset, {force:true});
        }, 120);
      }
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

    var mode = currentMode();
    var th = thresholds();

    forecast.tradeMode = mode;
    forecast.tradeModeThresholds = th;

    if(mode !== 'active') return forecast;

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

    if(edge >= th.minEdge && conf >= th.minConfidence){
      if(bullScore > bearScore && prob >= 55){
        forecast.action = 'buy';
        forecast.signal = 'buy';
        forecast.sentiment = 'bullish';
        forecast.confidence = Math.max(conf, Math.min(72, conf + 5));
        forecast.probability = Math.max(prob, 58);
        forecast.upwardProbability = forecast.probability;
        forecast.isActiveModeSignal = true;
        forecast.reasoning = Array.isArray(forecast.reasoning) ? forecast.reasoning : (forecast.reasoning ? [String(forecast.reasoning)] : []);
        forecast.reasoning.unshift(ru() ? 'ACTIVE Mode: WAIT повышен до BUY из-за достаточного преимущества факторов.' : 'ACTIVE Mode: WAIT upgraded to BUY because factor edge is sufficient.');
      }else if(bearScore > bullScore && prob <= 45){
        forecast.action = 'sell';
        forecast.signal = 'sell';
        forecast.sentiment = 'bearish';
        forecast.confidence = Math.max(conf, Math.min(72, conf + 5));
        forecast.probability = Math.min(prob, 42);
        forecast.upwardProbability = forecast.probability;
        forecast.isActiveModeSignal = true;
        forecast.reasoning = Array.isArray(forecast.reasoning) ? forecast.reasoning : (forecast.reasoning ? [String(forecast.reasoning)] : []);
        forecast.reasoning.unshift(ru() ? 'ACTIVE Mode: WAIT повышен до SELL из-за достаточного преимущества факторов.' : 'ACTIVE Mode: WAIT upgraded to SELL because factor edge is sufficient.');
      }
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

  // Also patch last forecast right before live render if available.
  setInterval(function(){
    renderPanel();
    try{
      if(window.lastAnalysisForecast && window.currentAnalysisAsset){
        window.lastAnalysisForecast = applyModeToForecast(window.currentAnalysisAsset, window.lastAnalysisForecast);
      }
    }catch(e){}
  }, 1500);

  var mo = new MutationObserver(function(){ renderPanel(); });
  try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){}

  setTimeout(renderPanel, 200);
  setTimeout(renderPanel, 1000);
  setTimeout(renderPanel, 2500);
})();
