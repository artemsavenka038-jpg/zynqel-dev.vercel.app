// ZYNQEL Safe / Active Mode — clean single source controller
// SAFE/ACTIVE only stores mode, renders mode buttons, and forces one fresh analysis.
// It does NOT mutate forecasts and does NOT render My Action / Entry Quality directly.
(function(){
  if(window.__ZYNQEL_TRADE_MODE_CLEAN__) return;
  window.__ZYNQEL_TRADE_MODE_CLEAN__ = true;

  window.ZYNQEL_TRADE_MODE = window.ZYNQEL_TRADE_MODE || {};
  window.ZYNQEL_TRADE_MODE.safe = {
    minFinalTradeConfluence: 65,
    minEdge: 12,
    minConfidence: 62
  };
  window.ZYNQEL_TRADE_MODE.active = {
    minFinalTradeConfluence: 55,
    minEdge: 6,
    minConfidence: 54
  };
  window.ZYNQEL_TRADE_MODE.mode =
    (localStorage.getItem('zynqel_trade_mode') === 'active') ? 'active' : 'safe';

  function currentMode(){
    var m = localStorage.getItem('zynqel_trade_mode') || window.ZYNQEL_TRADE_MODE.mode || 'safe';
    return m === 'active' ? 'active' : 'safe';
  }

  function thresholds(){
    return window.ZYNQEL_TRADE_MODE[currentMode()] || window.ZYNQEL_TRADE_MODE.safe;
  }

  function isRu(){
    return window.appLang === 'ru';
  }

  window.zynqelGetTradeMode = currentMode;
  window.zynqelGetTradeThresholds = thresholds;

  function clearAnalysisCache(){
    try{
      window.lastAnalysisForecast = null;
      window.lastAnalysisAsset = null;
      window.__zynqelLastTradeDecision = null;
      window.__zynqelEntryQualityLast = null;
      window.__zynqelModeSeq = (window.__zynqelModeSeq || 0) + 1;
    }catch(e){}
  }

  function setMode(mode){
    mode = mode === 'active' ? 'active' : 'safe';
    var old = currentMode();

    window.ZYNQEL_TRADE_MODE.mode = mode;
    localStorage.setItem('zynqel_trade_mode', mode);

    clearAnalysisCache();
    renderPanel();

    // Clear visible conflicting blocks instantly while the new mode recalculates.
    try{
      var actionLabel = document.getElementById('analysis-action-label');
      var entryText = document.getElementById('analysis-entry-text');
      var riskText = document.getElementById('analysis-risk-text');
      if(actionLabel) actionLabel.textContent = mode === 'active'
        ? (isRu() ? 'Пересчитываю ACTIVE...' : 'Recalculating ACTIVE...')
        : (isRu() ? 'Пересчитываю SAFE...' : 'Recalculating SAFE...');
      if(entryText) entryText.textContent = isRu() ? 'Обновляю сигнал под выбранный режим...' : 'Updating signal for selected mode...';
      if(riskText) riskText.textContent = '';
      var q = document.getElementById('zynqel-entry-quality-card');
      if(q) q.innerHTML = '<div class="zq-entry-title">ENTRY QUALITY</div><div class="zq-entry-main" style="color:var(--muted);">⏳ RECALCULATING</div>';
    }catch(e){}

    var asset = window.currentAnalysisAsset || window.currentAsset || 'BTC';

    // Force exactly one fresh analysis after mode change.
    try{
      if(asset && typeof window.loadAnalysis === 'function'){
        setTimeout(function(){
          window.loadAnalysis(asset, {force:true, mode:mode, modeSwitch:true});
        }, 80);
      }
    }catch(e){}

    // Entry Quality refresh only after loadAnalysis starts, not competing every second.
    try{
      setTimeout(function(){
        if(typeof window.zynqelRenderEntryQuality === 'function') window.zynqelRenderEntryQuality();
      }, 900);
    }catch(e){}
  }

  window.zynqelSetTradeMode = setMode;

  function ensurePanel(){
    var root = document.getElementById('page-analysis');
    if(!root) return null;

    var panel = document.getElementById('zynqel-trade-mode-panel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'zynqel-trade-mode-panel';
      panel.style.margin = '10px 0 14px';

      var chips = document.getElementById('analysis-chips');
      if(chips && chips.parentNode){
        chips.parentNode.insertBefore(panel, chips.nextSibling);
      }else{
        root.insertBefore(panel, root.firstChild);
      }
    }
    return panel;
  }

  function renderPanel(){
    var panel = ensurePanel();
    if(!panel) return;

    var m = currentMode();
    var safeLabel = isRu() ? 'SAFE' : 'SAFE';
    var activeLabel = isRu() ? 'ACTIVE' : 'ACTIVE';
    var desc = m === 'active'
      ? (isRu() ? 'Active: ранние сигналы, но вход только после подтверждения.' : 'Active: earlier signals, entry only after confirmation.')
      : (isRu() ? 'Safe: строгий режим, меньше ложных входов.' : 'Safe: strict mode, fewer false entries.');

    var html =
      '<div class="zq-trade-mode-wrap" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<button type="button" class="chip '+(m==='safe'?'active':'')+'" data-zq-mode="safe">'+safeLabel+'</button>' +
        '<button type="button" class="chip '+(m==='active'?'active':'')+'" data-zq-mode="active">'+activeLabel+'</button>' +
        '<span style="font-size:11px;color:var(--muted);font-family:JetBrains Mono,monospace;">'+desc+'</span>' +
      '</div>';

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

  window.zynqelRenderTradeModePanel = renderPanel;

  document.addEventListener('DOMContentLoaded', renderPanel);
  setTimeout(renderPanel, 200);
  setTimeout(renderPanel, 1000);

  // Only render buttons when DOM changes. Do not touch forecast/results.
  try{
    var mo = new MutationObserver(function(){ renderPanel(); });
    mo.observe(document.body, {childList:true, subtree:true});
  }catch(e){}
})();
