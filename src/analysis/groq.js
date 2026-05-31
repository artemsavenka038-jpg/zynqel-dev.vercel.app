
// =====================================================
// ZYNQEL REAL GROQ API ROUTER
// Routes browser Groq calls to Vercel /api/groq.
// =====================================================
(function(){
  if(window.__ZYNQEL_REAL_GROQ_API_ROUTER__) return;
  window.__ZYNQEL_REAL_GROQ_API_ROUTER__ = true;
  const nativeFetch = window.__ZYNQEL_NATIVE_FETCH__ || window.fetch.bind(window);
  window.__ZYNQEL_NATIVE_FETCH__ = nativeFetch;
  const previousFetch = window.fetch.bind(window);
  function isGroqUrl(url){ return String(url||'').includes('api.groq.com/openai/v1/chat/completions'); }
  function isLocalGroq(url){ try{ return new URL(String(url), location.origin).pathname === '/api/groq'; }catch(e){ return false; } }
  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if(isGroqUrl(url)){
      const r = await nativeFetch('/api/groq', {method:'POST', headers:{'Content-Type':'application/json'}, body:(init&&init.body)||'{}'});
      try{ window.__zynqelLastGroqStatus = 'server route'; }catch(e){}
      return r;
    }
    if(isLocalGroq(url)) return await nativeFetch(input, init);
    return await previousFetch(input, init);
  };
  window.zynqelGroqRoute='/api/groq';
  console.log('✅ ZYNQEL real Groq router enabled');
})();

// ZYNQEL analysis/groq.js
// Extracted from original analysis.js. Classic global script, not module.

// ---- extracted inline script block 3 ----
// ZYNQEL reasoning array fix:
// Some Groq/local fallbacks return forecast.reasoning as text.
// All V7 filters expect an Array because they call .unshift().
(function(){
  if(window.__ZYNQEL_REASONING_ARRAY_FIX__) return;
  window.__ZYNQEL_REASONING_ARRAY_FIX__ = true;

  window.zynqelEnsureReasoningArray = function(value){
    if(Array.isArray(value)) return value.filter(function(x){ return x !== undefined && x !== null && String(x).trim() !== ''; });
    if(value === undefined || value === null || value === false) return [];
    if(typeof value === 'string'){
      return value.trim() ? [value.trim()] : [];
    }
    try{
      return [String(value)].filter(Boolean);
    }catch(e){
      return [];
    }
  };

  window.zynqelNormalizeForecastReasoning = function(forecast){
    if(!forecast || typeof forecast !== 'object') return forecast;
    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
    if(!Array.isArray(forecast.keyFactors)) {
      forecast.keyFactors = window.zynqelEnsureReasoningArray(forecast.keyFactors);
    }
    return forecast;
  };
})();


// ---- extracted inline script block 10 ----
(function(){
window.lastGroqRunAt=0;

function attachAiButton(){
 const btn=document.getElementById('run-ai-analysis-btn');
 if(!btn || btn.dataset.bound) return;
 btn.dataset.bound='1';

 btn.addEventListener('click', async function(){
   const status=document.getElementById('ai-analysis-status');
   if(status) status.textContent='Groq thinking...';

   try{
      if(typeof loadAnalysis==='function'){
         await loadAnalysis(window.currentAnalysisAsset||window.currentAsset||'BTC',{force:true});
      }
      window.lastGroqRunAt=Date.now();
      if(status) status.textContent='Updated just now';
   }catch(e){
      if(status) status.textContent='AI error';
   }
 });
}
setInterval(attachAiButton,1000);

/* Disable aggressive auto-refresh of AI page */
if(window.loadAnalysis){
  const _old=window.loadAnalysis;
  window.loadAnalysis=function(asset,opts){
      opts=opts||{};
      if(!opts.force && window.currentAnalysisAsset===asset && (Date.now()-window.lastGroqRunAt)<300000){
          return Promise.resolve(window.lastAnalysisForecast||null);
      }
      return _old.apply(this,arguments);
  };
}
})();


// ---- extracted inline script block 16 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V6 AI SOURCE BADGE PATCH
// Shows clearly whether Groq was used or skipped.
// ═══════════════════════════════════════════════════════
(function(){
  window.zynqelLastAiSource = window.zynqelLastAiSource || {
    engine:'V6 ENGINE',
    groq:'unknown',
    reason:'waiting',
    time:null
  };

  function setAiSource(engine, groq, reason){
    window.zynqelLastAiSource = {
      engine: engine || 'V6 ENGINE',
      groq: groq || 'unknown',
      reason: reason || '',
      time: new Date()
    };
    renderAiSourceBadge();
  }

  function badgeHtml(){
    var s = window.zynqelLastAiSource || {};
    var ru = window.appLang === 'ru';
    var groqUsed = s.groq === 'used';
    var groqSkipped = s.groq === 'skipped';
    var groqError = s.groq === 'error';

    var groqText = groqUsed ? (ru?'GROQ использован':'GROQ used') :
                   groqSkipped ? (ru?'GROQ пропущен':'GROQ skipped') :
                   groqError ? (ru?'GROQ ошибка':'GROQ error') :
                   (ru?'GROQ ожидание':'GROQ idle');

    var groqColor = groqUsed ? 'var(--green)' : groqSkipped ? 'var(--gold)' : groqError ? 'var(--red)' : 'var(--muted)';
    var reason = s.reason ? String(s.reason) : (ru?'ожидание анализа':'waiting for analysis');

    return '<div id="ai-source-badge" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 12px 0;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.03);font-family:JetBrains Mono,monospace;font-size:10px;">' +
      '<span style="color:var(--green);">🟢 '+(ru?'Мозг: ':'Engine: ')+(s.engine||'V6 ENGINE')+'</span>' +
      '<span style="color:'+groqColor+';">'+(groqUsed?'🟢':groqSkipped?'🟡':groqError?'🔴':'⚪')+' '+groqText+'</span>' +
      '<span style="color:var(--muted);">'+reason+'</span>' +
    '</div>';
  }

  function renderAiSourceBadge(){
    var content = document.getElementById('analysis-content');
    if(!content) return;

    var old = document.getElementById('ai-source-badge');
    if(old) old.remove();

    content.insertAdjacentHTML('afterbegin', badgeHtml());
  }

  window.zynqelSetAiSource = setAiSource;
  window.zynqelRenderAiSourceBadge = renderAiSourceBadge;

  // Wrap generateForecast to set badge by returned source.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__sourceBadgeWrapped){
    var oldGenerate = window.generateForecast;
    var wrappedGenerate = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      opts = opts || {};

      setAiSource('V6 ENGINE', 'unknown', window.appLang === 'ru' ? 'анализ...' : 'analyzing...');

      var res = await oldGenerate.apply(this, arguments);

      try{
        var source = String(res && res.source || '');
        if(source.indexOf('GROQ') >= 0){
          setAiSource('V6 ENGINE', 'used', window.appLang === 'ru' ? 'Groq объяснил сильный сигнал' : 'Groq explained strong signal');
        } else if(source.indexOf('V6 ENGINE') >= 0 || source.indexOf('V5 FILTER') >= 0){
          setAiSource('V6 ENGINE', 'skipped', window.appLang === 'ru' ? 'слабый сигнал — Groq не угадывает' : 'weak signal — Groq did not guess');
        } else if(source.indexOf('LOCAL') >= 0){
          setAiSource('LOCAL ENGINE', 'error', window.appLang === 'ru' ? 'Groq недоступен, резервный движок' : 'Groq unavailable, fallback engine');
        } else {
          setAiSource('V6 ENGINE', 'unknown', source || 'analysis completed');
        }
      }catch(e){}

      setTimeout(renderAiSourceBadge, 400);
      return res;
    };
    wrappedGenerate.__sourceBadgeWrapped = true;
    window.generateForecast = wrappedGenerate;
  }

  // Keep badge visible after live re-render / freeze.
  setInterval(function(){
    var page = document.getElementById('page-analysis');
    if(page && page.classList.contains('active')) renderAiSourceBadge();
  }, 2000);

  setTimeout(renderAiSourceBadge, 2500);
})();


// ---- extracted inline script block 20 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V7.1 LIVE PRICE FIX FOR AI ANALYSIS
// Keeps AI/Groq text stable, but updates selected asset price/change live.
// ═══════════════════════════════════════════════════════
(function(){
  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }

  function currentAsset(){
    return window.currentAnalysisAsset || window.currentAsset || 'BTC';
  }

  function getData(asset){
    return window.liveData && window.liveData[asset] ? window.liveData[asset] : null;
  }

  function fmtPrice(asset, value){
    value = num(value, null);
    if(!value || value <= 0) return null;
    var dec = 2;
    if(asset === 'XRP' || asset === 'SUI' || asset === 'EUR' || asset === 'GBP') dec = 4;
    if(asset === 'BTC' || asset === 'ETH' || asset === 'XAU' || asset === 'XAG' || asset === 'SPX' || asset === 'NDX') dec = 2;
    if(asset === 'AVAX' || asset === 'SOL') dec = 4;
    return '$' + value.toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec});
  }

  function fmtChange(v){
    v = num(v, 0);
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '% 24H';
  }

  function findPriceNodes(root){
    if(!root) return [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(walker.nextNode()){
      var t = walker.currentNode.nodeValue || '';
      if(/\$\d/.test(t) && !/zone|target|below|above|отмена|цель|зона/i.test(t)){
        nodes.push(walker.currentNode);
      }
    }
    return nodes;
  }

  function findChangeNodes(root){
    if(!root) return [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(walker.nextNode()){
      var t = walker.currentNode.nodeValue || '';
      if(/[+-]?\d+(\.\d+)?%\s*24H/i.test(t) || /0\.00%\s*24H/i.test(t)){
        nodes.push(walker.currentNode);
      }
    }
    return nodes;
  }

  window.zynqelUpdateAnalysisLivePriceOnly = function(){
    var page = document.getElementById('page-analysis');
    if(page && !page.classList.contains('active')) return;

    var asset = currentAsset();
    var d = getData(asset);
    if(!d) return;

    var price = num(d.price, null);
    if(!price || price <= 0) return;

    var root = document.getElementById('analysis-content') || document.querySelector('#page-analysis');
    if(!root) return;

    var priceText = fmtPrice(asset, price);
    var changeText = fmtChange(d.change24h);

    // Update first large visible price in AI analysis card.
    var priceNodes = findPriceNodes(root);
    if(priceNodes.length){
      priceNodes[0].nodeValue = priceText;
    }

    // Update first 24h change text.
    var changeNodes = findChangeNodes(root);
    if(changeNodes.length){
      changeNodes[0].nodeValue = changeText;
      try{
        var el = changeNodes[0].parentElement;
        if(el){
          el.style.color = num(d.change24h, 0) >= 0 ? 'var(--green)' : 'var(--red)';
        }
      }catch(e){}
    }

    // Also update top card if it has data attributes/classes from older versions.
    try{
      document.querySelectorAll('[data-live-price],[data-price]').forEach(function(el){
        el.textContent = priceText;
      });
      document.querySelectorAll('[data-live-change],[data-change]').forEach(function(el){
        el.textContent = changeText;
        el.style.color = num(d.change24h,0) >= 0 ? 'var(--green)' : 'var(--red)';
      });
    }catch(e){}
  };

  // Patch frozen block restore: after restore, immediately refresh price.
  if(typeof window.restoreFrozenBlock === 'function' && !window.restoreFrozenBlock.__livePriceFix){
    var oldRestore = window.restoreFrozenBlock;
    window.restoreFrozenBlock = function(){
      var r = oldRestore.apply(this, arguments);
      setTimeout(window.zynqelUpdateAnalysisLivePriceOnly, 50);
      return r;
    };
    window.restoreFrozenBlock.__livePriceFix = true;
  }

  // Patch live update wrapper if present.
  if(typeof window.updateActiveAnalysisLive === 'function' && !window.updateActiveAnalysisLive.__livePriceOnlyFix){
    var oldUpdate = window.updateActiveAnalysisLive;
    window.updateActiveAnalysisLive = function(){
      var r = oldUpdate.apply(this, arguments);
      setTimeout(window.zynqelUpdateAnalysisLivePriceOnly, 80);
      return r;
    };
    window.updateActiveAnalysisLive.__livePriceOnlyFix = true;
  }

  // Update price frequently without touching AI text.
  setInterval(window.zynqelUpdateAnalysisLivePriceOnly, 1000);
  setTimeout(window.zynqelUpdateAnalysisLivePriceOnly, 1500);
})();


// ---- extracted inline script block 21 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V7.1 HEADER STATUS BADGE STABILITY FIX
// Only fixes top Engine/Groq badge. Does not change forecast logic.
// ═══════════════════════════════════════════════════════
(function(){
  window.zynqelStableHeaderState = window.zynqelStableHeaderState || {
    engine: 'V7 HYBRID',
    groq: 'idle',
    reason: '',
    ts: Date.now()
  };

  function isRu(){ return window.appLang === 'ru'; }

  function setHeaderState(engine, groq, reason){
    window.zynqelStableHeaderState = {
      engine: engine || 'V7 HYBRID',
      groq: groq || 'idle',
      reason: reason || '',
      ts: Date.now()
    };
    renderHeaderBadge();
  }

  function label(){
    var s = window.zynqelStableHeaderState || {};
    var ru = isRu();

    var engineText = ru ? 'Мозг: ' : 'Engine: ';
    var groqText = '';
    var groqClass = '';

    if(s.groq === 'used'){
      groqText = ru ? 'GROQ использован' : 'GROQ used';
      groqClass = 'used';
    } else if(s.groq === 'skipped'){
      groqText = ru ? 'GROQ пропущен' : 'GROQ skipped';
      groqClass = 'skipped';
    } else if(s.groq === 'error'){
      groqText = ru ? 'GROQ ошибка' : 'GROQ error';
      groqClass = 'error';
    } else if(s.groq === 'thinking'){
      groqText = ru ? 'GROQ анализирует' : 'GROQ thinking';
      groqClass = 'thinking';
    } else {
      groqText = ru ? 'GROQ ожидание' : 'GROQ idle';
      groqClass = 'idle';
    }

    var reason = s.reason || (ru ? 'ожидание анализа' : 'waiting');
    return {engineText:engineText, groqText:groqText, groqClass:groqClass, reason:reason, engine:s.engine || 'V7 HYBRID'};
  }

  function badgeHTML(){
    var l = label();
    var groqColor = l.groqClass === 'used' ? 'var(--green)' :
                    l.groqClass === 'skipped' ? 'var(--gold)' :
                    l.groqClass === 'error' ? 'var(--red)' :
                    l.groqClass === 'thinking' ? 'var(--blue)' : 'var(--muted)';
    var dot = l.groqClass === 'used' ? '🟢' :
              l.groqClass === 'skipped' ? '🟡' :
              l.groqClass === 'error' ? '🔴' :
              l.groqClass === 'thinking' ? '🔵' : '⚪';

    return '<div id="zynqel-v7-stable-header-badge" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 12px 0;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.035);font-family:JetBrains Mono,monospace;font-size:11px;line-height:1.2;">' +
      '<span style="color:var(--green);white-space:nowrap;">🟢 '+l.engineText+l.engine+'</span>' +
      '<span style="color:'+groqColor+';white-space:nowrap;">'+dot+' '+l.groqText+'</span>' +
      '<span style="color:var(--muted);white-space:nowrap;">'+l.reason+'</span>' +
    '</div>';
  }

  function findBadgeContainer(){
    var analysisPage = document.getElementById('page-analysis') || document.querySelector('.page.active');
    if(!analysisPage) return null;

    var chips = document.getElementById('analysis-chips');
    if(chips && chips.parentElement) return chips.parentElement;

    var content = document.getElementById('analysis-content');
    if(content) return content;

    return analysisPage;
  }

  function removeOldBadges(){
    document.querySelectorAll('#ai-source-badge,#zynqel-v7-stable-header-badge').forEach(function(el){
      if(el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function renderHeaderBadge(){
    var page = document.getElementById('page-analysis');
    if(page && !page.classList.contains('active')) return;

    var container = findBadgeContainer();
    if(!container) return;

    removeOldBadges();

    // Put badge after asset chips when possible, otherwise at top of analysis content.
    if(container.id === 'analysis-content'){
      container.insertAdjacentHTML('afterbegin', badgeHTML());
    } else {
      container.insertAdjacentHTML('afterend', badgeHTML());
    }
  }

  window.zynqelSetStableHeader = setHeaderState;
  window.zynqelRenderStableHeader = renderHeaderBadge;

  // Connect old source badge API to stable badge.
  window.zynqelSetAiSource = function(engine, groq, reason){
    setHeaderState(engine || 'V7 HYBRID', groq || 'idle', reason || '');
  };
  window.zynqelRenderAiSourceBadge = renderHeaderBadge;

  // Wrap generateForecast only to update badge state, not forecast logic.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__v71HeaderBadgeFix){
    var oldGenerate = window.generateForecast;
    var wrappedGenerate = async function(assetId, opts){
      setHeaderState('V7 HYBRID', 'thinking', isRu() ? 'анализ...' : 'analyzing...');
      try{
        var res = await oldGenerate.apply(this, arguments);
        var source = String((res && res.source) || '').toUpperCase();

        if(source.indexOf('GROQ') >= 0 && source.indexOf('FAILED') < 0 && source.indexOf('FALLBACK') < 0){
          setHeaderState('V7 HYBRID', 'used', isRu() ? 'Groq оценил новости/макро' : 'Groq scored news/macro');
        } else if(source.indexOf('V7') >= 0 || source.indexOf('V6') >= 0){
          setHeaderState('V7 HYBRID', 'skipped', isRu() ? 'слабый сигнал — Groq не угадывает' : 'weak signal — Groq did not guess');
        } else if(source.indexOf('LOCAL') >= 0){
          setHeaderState('V7 HYBRID', 'error', isRu() ? 'резервный движок' : 'fallback engine');
        } else {
          setHeaderState('V7 HYBRID', 'idle', isRu() ? 'анализ завершён' : 'analysis completed');
        }

        setTimeout(renderHeaderBadge, 250);
        return res;
      }catch(e){
        setHeaderState('V7 HYBRID', 'error', isRu() ? 'ошибка Groq/анализа' : 'Groq/analysis error');
        throw e;
      }
    };
    wrappedGenerate.__v71HeaderBadgeFix = true;
    window.generateForecast = wrappedGenerate;
  }

  // If top badge gets removed by live render/freeze, restore it.
  setInterval(renderHeaderBadge, 1500);
  setTimeout(renderHeaderBadge, 1200);
})();


// ---- extracted inline script block 24 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL EMA9/EMA21 ENTRY FILTER
// Adds a balanced fast EMA filter: not always WAIT, only blocks noisy entries.
// Does NOT change Groq/V7 macro/news logic.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_EMA_ENTRY_FILTER = {
    enabled: true,
    closeGapPct: 0.22,     // if EMA9/EMA21 gap is too small -> noisy zone
    minRsiBuy: 52,
    maxRsiSell: 48,
    redCandlesBlock: 4,    // 4 of last 5 red blocks BUY
    greenCandlesBlock: 4,  // 4 of last 5 green blocks SELL
    confidencePenalty: 12
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ru(){ return window.appLang === 'ru'; }
  function price(asset){
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : {};
    var p = num(d.price, null);
    return p && p > 0 ? p : null;
  }
  function fmt(x, asset){
    x = num(x, null);
    if(!x || x <= 0) return '';
    var dec = 2;
    if(asset === 'XRP' || asset === 'SUI' || asset === 'EUR' || asset === 'GBP') dec = 4;
    if(asset === 'AVAX' || asset === 'SOL') dec = 4;
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }
  function frames(asset){
    return window.z4CandleFrames && window.z4CandleFrames[asset] ? window.z4CandleFrames[asset] : {};
  }
  function activeCandles(asset){
    var f = frames(asset);
    if(f['15m'] && f['15m'].length >= 25) return {frame:'15m', candles:f['15m']};
    if(f['1h'] && f['1h'].length >= 25) return {frame:'1h', candles:f['1h']};
    return {frame:'none', candles:[]};
  }
  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2 / (period + 1);
    var seed = 0;
    for(var i=0;i<period;i++) seed += values[i];
    var prev = seed / period;
    for(var j=period;j<values.length;j++){
      prev = values[j] * k + prev * (1-k);
    }
    return prev;
  }
  function color(c){
    if(!c) return 'neutral';
    if(num(c.c,0) > num(c.o,0)) return 'green';
    if(num(c.c,0) < num(c.o,0)) return 'red';
    return 'neutral';
  }
  function countColor(cs, clr, n){
    if(!cs || cs.length < n) return 0;
    return cs.slice(-n).filter(function(c){ return color(c) === clr; }).length;
  }
  function tech(asset){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {}; }catch(e){}
    return {};
  }
  function candle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }
  function supportResistance(asset, p){
    var td = tech(asset);
    var ci = candle(asset);
    return {
      support: num(td.support, null) || num(ci.support, null) || (p ? p*0.985 : null),
      resistance: num(td.resistance, null) || num(ci.resistance, null) || (p ? p*1.015 : null),
      rsi: num(td.rsi, 50)
    };
  }

  window.zynqelEmaEntryContext = function(asset){
    var pack = activeCandles(asset);
    var cs = pack.candles;
    var p = price(asset);
    if(!cs || cs.length < 25 || !p){
      return {
        ready:false,
        frame:pack.frame,
        reason:'not enough candle data',
        buyBlocked:false,
        sellBlocked:false
      };
    }

    var closes = cs.map(function(c){ return num(c.c,0); }).filter(function(v){ return v > 0; });
    var ema9 = ema(closes, 9);
    var ema21 = ema(closes, 21);
    var latest = closes[closes.length-1];
    var td = tech(asset);
    var rsi = num(td.rsi, 50);
    var gapPct = ema9 && ema21 ? Math.abs(ema9 - ema21) / latest * 100 : 999;

    var red5 = countColor(cs, 'red', 5);
    var green5 = countColor(cs, 'green', 5);

    var bullishStack = latest > ema9 && ema9 > ema21 && rsi >= window.ZYNQEL_EMA_ENTRY_FILTER.minRsiBuy;
    var bearishStack = latest < ema9 && ema9 < ema21 && rsi <= window.ZYNQEL_EMA_ENTRY_FILTER.maxRsiSell;

    var noisyEma = gapPct < window.ZYNQEL_EMA_ENTRY_FILTER.closeGapPct;
    var priceBetween = (latest > Math.min(ema9, ema21) && latest < Math.max(ema9, ema21));

    var buyBlocked = false;
    var sellBlocked = false;
    var reasons = [];

    // BUY is blocked only when fast EMA structure is not supportive or market is noisy.
    if(!bullishStack){
      if(priceBetween){ buyBlocked = true; reasons.push('price between EMA9/EMA21'); }
      else if(latest < ema9){ buyBlocked = true; reasons.push('price below EMA9'); }
      else if(ema9 < ema21){ buyBlocked = true; reasons.push('EMA9 below EMA21'); }
      else if(rsi < window.ZYNQEL_EMA_ENTRY_FILTER.minRsiBuy){ buyBlocked = true; reasons.push('RSI below buy threshold'); }
    }
    if(noisyEma){ buyBlocked = true; sellBlocked = true; reasons.push('EMA9/EMA21 too close'); }
    if(red5 >= window.ZYNQEL_EMA_ENTRY_FILTER.redCandlesBlock){ buyBlocked = true; reasons.push(red5+' of last 5 candles red'); }

    // SELL is blocked only when fast EMA structure is not supportive or market is noisy.
    if(!bearishStack){
      if(priceBetween){ sellBlocked = true; reasons.push('price between EMA9/EMA21'); }
      else if(latest > ema9){ sellBlocked = true; reasons.push('price above EMA9'); }
      else if(ema9 > ema21){ sellBlocked = true; reasons.push('EMA9 above EMA21'); }
      else if(rsi > window.ZYNQEL_EMA_ENTRY_FILTER.maxRsiSell){ sellBlocked = true; reasons.push('RSI above sell threshold'); }
    }
    if(green5 >= window.ZYNQEL_EMA_ENTRY_FILTER.greenCandlesBlock){ sellBlocked = true; reasons.push(green5+' of last 5 candles green'); }

    return {
      ready:true,
      frame:pack.frame,
      price:latest,
      ema9:ema9,
      ema21:ema21,
      gapPct:gapPct,
      rsi:rsi,
      red5:red5,
      green5:green5,
      bullishStack:bullishStack,
      bearishStack:bearishStack,
      noisyEma:noisyEma,
      priceBetween:priceBetween,
      buyBlocked:buyBlocked,
      sellBlocked:sellBlocked,
      reason:reasons.join('; ')
    };
  };

  function applyEmaFilter(asset, forecast){
    if(!window.ZYNQEL_EMA_ENTRY_FILTER.enabled || !forecast) return forecast;
    var action = String(forecast.action || '').toLowerCase();
    if(action !== 'buy' && action !== 'sell') return forecast;

    var ctx = window.zynqelEmaEntryContext(asset);
    forecast.emaEntryContext = ctx;
    forecast.factors = forecast.factors || [];
    forecast.factors.unshift(ctx.ready ? ('EMA9/21: gap '+ctx.gapPct.toFixed(2)+'%, RSI '+Math.round(ctx.rsi)) : 'EMA9/21: loading');

    if(!ctx.ready) return forecast;

    var block = (action === 'buy' && ctx.buyBlocked) || (action === 'sell' && ctx.sellBlocked);
    if(!block) return forecast;

    var p = price(asset);
    var sr = supportResistance(asset, p);
    forecast.preEmaAction = action;
    forecast.action = 'wait';
    forecast.sentiment = 'neutral';
    forecast.probability = 50;
    forecast.upwardProbability = 50;
    forecast.confidence = Math.max(45, Math.min(num(forecast.confidence, 60) - window.ZYNQEL_EMA_ENTRY_FILTER.confidencePenalty, 64));

    forecast.entryZone = ru()
      ? 'Ждать EMA-подтверждение: '+fmt(sr.support, asset)+' – '+fmt(sr.resistance, asset)
      : 'Wait for EMA confirmation: '+fmt(sr.support, asset)+' – '+fmt(sr.resistance, asset);
    forecast.entry = forecast.entryZone;
    forecast.zone = forecast.entryZone;
    forecast.invalidation = ru()
      ? 'Вход заблокирован EMA9/EMA21-фильтром'
      : 'Entry blocked by EMA9/EMA21 filter';
    forecast.target1 = ru() ? 'После подтверждения тренда' : 'After trend confirmation';
    forecast.target = forecast.target1;
    forecast.waitFor = action === 'buy'
      ? (ru() ? 'Цена выше EMA9, EMA9 выше EMA21, RSI выше 52 и нет серии красных свечей' : 'Price above EMA9, EMA9 above EMA21, RSI above 52 and no red candle series')
      : (ru() ? 'Цена ниже EMA9, EMA9 ниже EMA21, RSI ниже 48 и нет серии зелёных свечей' : 'Price below EMA9, EMA9 below EMA21, RSI below 48 and no green candle series');

    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(
      action === 'buy'
        ? (ru() ? 'EMA9/EMA21 фильтр заблокировал BUY: '+ctx.reason+'.' : 'EMA9/EMA21 filter blocked BUY: '+ctx.reason+'.')
        : (ru() ? 'EMA9/EMA21 фильтр заблокировал SELL: '+ctx.reason+'.' : 'EMA9/EMA21 filter blocked SELL: '+ctx.reason+'.')
    );

    forecast.source = (forecast.source || 'V7') + ' + EMA FILTER';
    return forecast;
  }

  window.zynqelApplyEmaEntryFilter = applyEmaFilter;

  // Apply after normalize/V7/short-term guard so old code cannot turn WAIT back to BUY/SELL.
  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__emaEntryFilter){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = applyEmaFilter(assetId, out); }catch(e){ console.warn('EMA filter after normalize failed:', e.message); }
      return out;
    };
    window.normalizeForecast.__emaEntryFilter = true;
  }

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__emaEntryFilter){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var out = await oldGenerate.apply(this, arguments);
      try{ out = applyEmaFilter(assetId, out); }catch(e){ console.warn('EMA filter after generate failed:', e.message); }
      return out;
    };
    window.generateForecast.__emaEntryFilter = true;
  }

  if(typeof window.buildTradeDecision === 'function' && !window.buildTradeDecision.__emaEntryFilter){
    var oldBuild = window.buildTradeDecision;
    window.buildTradeDecision = function(assetId, forecast){
      try{ forecast = applyEmaFilter(assetId, forecast); }catch(e){}
      return oldBuild.apply(this, [assetId, forecast]);
    };
    window.buildTradeDecision.__emaEntryFilter = true;
  }
})();


// ---- extracted inline script block 26 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL 50/35 FALLBACK FIX + SAFE SELL BACKUP
// Fixes constant 50% / 35% WAIT when V6/V7 falls into fallback
// while real live price + technical candles already exist.
// Does NOT touch UI layout, auth, Groq key, domain, or data sources.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_FALLBACK_FIX = {
    enabled: true,
    minCandles: 25,
    minBearScoreForSell: 4,
    minBullScoreForBuy: 4
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }

  function ru(){ return window.appLang === 'ru'; }

  function cfg(asset){
    try{ return (window.ASSETS || []).find(function(a){ return a.id === asset; }) || {id:asset, category:'unknown'}; }catch(e){}
    return {id:asset, category:'unknown'};
  }

  function livePrice(asset){
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : {};
    var p = num(d.price, null);
    return p && p > 0 ? p : null;
  }

  function fmt(x, asset){
    x = num(x, null);
    if(!x || x <= 0) return '';
    var dec = 2;
    if(asset === 'XRP' || asset === 'SUI' || asset === 'EUR' || asset === 'GBP') dec = 4;
    if(asset === 'AVAX' || asset === 'SOL') dec = 4;
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }

  function getBasicCandles(asset){
    var z = window.z4CandleFrames && window.z4CandleFrames[asset] ? window.z4CandleFrames[asset] : {};
    if(z['15m'] && z['15m'].length >= window.ZYNQEL_FALLBACK_FIX.minCandles) return {frame:'15m', candles:z['15m']};
    if(z['1h'] && z['1h'].length >= window.ZYNQEL_FALLBACK_FIX.minCandles) return {frame:'1h', candles:z['1h']};

    // Important fallback: old real OHLC candles already used by technicalData.
    if(window.candleData && window.candleData[asset] && window.candleData[asset].length >= window.ZYNQEL_FALLBACK_FIX.minCandles){
      return {frame:'1h-old', candles:window.candleData[asset]};
    }

    return {frame:'none', candles:[]};
  }

  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2 / (period + 1);
    var seed = 0;
    for(var i=0;i<period;i++) seed += values[i];
    var prev = seed / period;
    for(var j=period;j<values.length;j++) prev = values[j] * k + prev * (1-k);
    return prev;
  }

  function color(c){
    if(!c) return 'neutral';
    if(num(c.c,0) > num(c.o,0)) return 'green';
    if(num(c.c,0) < num(c.o,0)) return 'red';
    return 'neutral';
  }

  function countColor(cs, clr, n){
    if(!cs || cs.length < n) return 0;
    return cs.slice(-n).filter(function(c){ return color(c) === clr; }).length;
  }

  function pct(a,b){ return b ? ((a-b)/b*100) : 0; }

  function tech(asset){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {}; }catch(e){}
    try{ if(typeof getTechnicalSnapshot === 'function') return getTechnicalSnapshot(asset) || {}; }catch(e){}
    return {};
  }

  function candle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }

  window.zynqelSafeDirectionalDecision = function(asset){
    var p = livePrice(asset);
    var pack = getBasicCandles(asset);
    var cs = pack.candles || [];
    var td = tech(asset);
    var ci = candle(asset);

    if(!p || cs.length < window.ZYNQEL_FALLBACK_FIX.minCandles){
      return {
        ready:false,
        asset:asset,
        action:'wait',
        sentiment:'neutral',
        probability:50,
        upwardProbability:50,
        confidence:35,
        confluence:35,
        reason:'no valid price/candles'
      };
    }

    var closes = cs.map(function(c){ return num(c.c,0); }).filter(function(v){ return v > 0; });
    var latest = closes[closes.length-1] || p;
    var prev3 = closes[closes.length-4] || latest;
    var prev5 = closes[closes.length-6] || latest;

    var ema9 = ema(closes, 9);
    var ema21 = ema(closes, 21);
    var ema50 = ema(closes, 50);

    var rsi = num(td.rsi, 50);
    var macdHist = num(td.macdHist, 0);
    var trend = String(td.trend || 'neutral').toLowerCase();
    var ch24 = window.liveData && window.liveData[asset] ? num(window.liveData[asset].change24h, 0) : 0;

    var red5 = countColor(cs, 'red', 5);
    var green5 = countColor(cs, 'green', 5);
    var move3 = pct(latest, prev3);
    var move5 = pct(latest, prev5);

    var bull = 0, bear = 0, reasons = [];

    if(ema9 && ema21 && latest > ema9 && ema9 > ema21){ bull++; reasons.push('price above EMA9/21'); }
    if(ema9 && ema21 && latest < ema9 && ema9 < ema21){ bear++; reasons.push('price below EMA9/21'); }

    if(ema50 && ema21 > ema50){ bull++; reasons.push('EMA21 above EMA50'); }
    if(ema50 && ema21 < ema50){ bear++; reasons.push('EMA21 below EMA50'); }

    if(rsi >= 54){ bull++; reasons.push('RSI bullish '+Math.round(rsi)); }
    if(rsi <= 46){ bear++; reasons.push('RSI bearish '+Math.round(rsi)); }

    if(macdHist > 0){ bull++; reasons.push('MACD positive'); }
    if(macdHist < 0){ bear++; reasons.push('MACD negative'); }

    if(green5 >= 4){ bull++; reasons.push(green5+' green candles'); }
    if(red5 >= 4){ bear++; reasons.push(red5+' red candles'); }

    if(move3 >= 0.35 || move5 >= 0.65){ bull++; reasons.push('recent move up'); }
    if(move3 <= -0.35 || move5 <= -0.65){ bear++; reasons.push('recent move down'); }

    if(trend === 'bullish'){ bull++; reasons.push('trend bullish'); }
    if(trend === 'bearish'){ bear++; reasons.push('trend bearish'); }

    if(ch24 > 1.2){ bull++; reasons.push('24h positive'); }
    if(ch24 < -1.2){ bear++; reasons.push('24h negative'); }

    var edge = Math.abs(bull - bear);
    var action = 'wait';

    if(bear >= window.ZYNQEL_FALLBACK_FIX.minBearScoreForSell && bear >= bull + 1) action = 'sell';
    else if(bull >= window.ZYNQEL_FALLBACK_FIX.minBullScoreForBuy && bull >= bear + 1) action = 'buy';

    var confidence = action === 'wait'
      ? Math.max(42, Math.min(58, 44 + edge * 3))
      : Math.max(58, Math.min(78, 54 + edge * 5 + Math.max(bull,bear)));

    var upwardProbability;
    if(action === 'buy') upwardProbability = Math.max(57, Math.min(78, 52 + bull * 4 - bear * 2));
    else if(action === 'sell') upwardProbability = Math.max(22, Math.min(43, 48 - bear * 4 + bull * 2));
    else upwardProbability = Math.max(44, Math.min(56, 50 + (bull - bear) * 2));

    var support = num(td.support, null) || num(ci.support, null) || latest * 0.985;
    var resistance = num(td.resistance, null) || num(ci.resistance, null) || latest * 1.015;

    return {
      ready:true,
      asset:asset,
      source:'SAFE TECHNICAL BACKUP',
      action:action,
      sentiment:action === 'buy' ? 'bullish' : action === 'sell' ? 'bearish' : 'neutral',
      probability:Math.round(upwardProbability),
      upwardProbability:Math.round(upwardProbability),
      confidence:Math.round(confidence),
      confluence:Math.round(confidence),
      bullScore:bull,
      bearScore:bear,
      edge:edge,
      price:latest,
      support:support,
      resistance:resistance,
      rsi:rsi,
      ema9:ema9,
      ema21:ema21,
      ema50:ema50,
      red5:red5,
      green5:green5,
      move3:move3,
      move5:move5,
      frame:pack.frame,
      reason:reasons.join('; ')
    };
  };

  function decisionToForecast(asset, d){
    var isRu = ru();
    var action = d.action || 'wait';
    var entry, invalidation, target, waitFor;

    if(action === 'sell'){
      entry = isRu ? ('Зона продажи: '+fmt(d.price*0.998, asset)+' – '+fmt(d.price*1.008, asset)) : ('Sell zone: '+fmt(d.price*0.998, asset)+' – '+fmt(d.price*1.008, asset));
      invalidation = isRu ? ('Отмена: закрепление выше '+fmt(d.ema21 || d.resistance, asset)) : ('Invalidation: hold above '+fmt(d.ema21 || d.resistance, asset));
      target = isRu ? ('Первая цель: '+fmt(d.support, asset)) : ('First target: '+fmt(d.support, asset));
      waitFor = isRu ? 'Подтверждение ниже EMA9/EMA21 без резкого откупа' : 'Confirmation below EMA9/EMA21 without sharp buyback';
    } else if(action === 'buy'){
      entry = isRu ? ('Зона покупки: '+fmt(d.price*0.992, asset)+' – '+fmt(d.price*1.002, asset)) : ('Buy zone: '+fmt(d.price*0.992, asset)+' – '+fmt(d.price*1.002, asset));
      invalidation = isRu ? ('Отмена: закрепление ниже '+fmt(d.ema21 || d.support, asset)) : ('Invalidation: hold below '+fmt(d.ema21 || d.support, asset));
      target = isRu ? ('Первая цель: '+fmt(d.resistance, asset)) : ('First target: '+fmt(d.resistance, asset));
      waitFor = isRu ? 'Удержание EMA9/EMA21 и подтверждение объёма' : 'EMA9/EMA21 hold and volume confirmation';
    } else {
      entry = isRu ? ('Зона наблюдения: '+fmt(d.support, asset)+' – '+fmt(d.resistance, asset)) : ('Watch zone: '+fmt(d.support, asset)+' – '+fmt(d.resistance, asset));
      invalidation = isRu ? 'Нет сделки до подтверждения' : 'No trade until confirmation';
      target = isRu ? 'После подтверждения направления' : 'After directional confirmation';
      waitFor = isRu ? 'Ждать выход из зоны неопределённости EMA/RSI' : 'Wait for EMA/RSI uncertainty to resolve';
    }

    return {
      source:'V7 HYBRID + SAFE TECH',
      action:action,
      sentiment:d.sentiment,
      probability:d.probability,
      upwardProbability:d.upwardProbability,
      confidence:d.confidence,
      entryZone:entry,
      entry:entry,
      zone:entry,
      invalidation:invalidation,
      target1:target,
      target:target,
      waitFor:waitFor,
      shortTerm: action === 'sell'
        ? (isRu ? '24ч: медвежий сценарий активен при подтверждении' : '24h: bearish scenario active if confirmed')
        : action === 'buy'
          ? (isRu ? '24ч: бычий сценарий активен при подтверждении' : '24h: bullish scenario active if confirmed')
          : (isRu ? '24ч: ждать подтверждения' : '24h: wait for confirmation'),
      midTerm: isRu
        ? ('7д: bull '+Math.max(0,100-d.probability)+' / bear '+d.probability+' зависит от EMA и уровней')
        : ('7d: bull/bear scenario depends on EMA and levels'),
      reasoning:[
        isRu
          ? ('Резервный тех. расчёт включился вместо 50/35 fallback: bull '+d.bullScore+', bear '+d.bearScore+'. '+d.reason)
          : ('Safe technical backup replaced 50/35 fallback: bull '+d.bullScore+', bear '+d.bearScore+'. '+d.reason)
      ],
      factors:[
        'Safe tech: '+d.frame,
        'Bull/Bear: '+d.bullScore+'/'+d.bearScore,
        'RSI: '+Math.round(d.rsi),
        'EMA9/21 checked',
        'Red/Green 5: '+d.red5+'/'+d.green5
      ],
      safeTechnical:d
    };
  }

  function shouldReplaceFallback(forecast){
    if(!forecast) return false;
    var action = String(forecast.action || '').toLowerCase();
    var prob = num(forecast.probability, 50);
    var conf = num(forecast.confidence, 35);

    // Exact bug pattern shown in the screenshots.
    if(action === 'wait' && prob === 50 && conf <= 35) return true;
    if(action === 'wait' && prob === 50 && conf <= 42 && String(forecast.source || '').toUpperCase().indexOf('FALLBACK') >= 0) return true;
    return false;
  }

  // Replace bad V6 fallback with safe technical backup when possible.
  if(typeof window.zynqelV6Decision === 'function' && !window.zynqelV6Decision.__safeFallbackFix){
    var oldV6Decision = window.zynqelV6Decision;
    window.zynqelV6Decision = function(asset){
      var out = null;
      try{ out = oldV6Decision.apply(this, arguments); }catch(e){ out = null; }

      if(!out || (out.confidence <= 35 && out.probability === 50)){
        var safe = window.zynqelSafeDirectionalDecision(asset);
        if(safe && safe.ready){
          safe.__replacedV6Fallback = true;
          return safe;
        }
      }
      return out;
    };
    window.zynqelV6Decision.__safeFallbackFix = true;
  }

  // Final safety after V7/Groq/normalizers.
  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__fallback50Fix){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);

      try{
        if(shouldReplaceFallback(out)){
          var safe = window.zynqelSafeDirectionalDecision(assetId);
          if(safe && safe.ready){
            out = decisionToForecast(assetId, safe);
          }
        }
      }catch(e){ console.warn('50/35 fallback fix failed:', e.message); }

      return out;
    };
    window.normalizeForecast.__fallback50Fix = true;
  }

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__fallback50Fix){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var out = await oldGenerate.apply(this, arguments);

      try{
        if(shouldReplaceFallback(out)){
          var safe = window.zynqelSafeDirectionalDecision(assetId);
          if(safe && safe.ready){
            out = decisionToForecast(assetId, safe);
          }
        }
      }catch(e){ console.warn('50/35 generate fix failed:', e.message); }

      return out;
    };
    window.generateForecast.__fallback50Fix = true;
  }
})();


// ---- extracted inline script block 30 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V7 DATA HEALTH DASHBOARD
// Diagnostic only. It does NOT change BUY/SELL/WAIT, Groq, API calls,
// forecast math, risk cards, price feed or rendering logic.
// Shows whether data actually reached V7 before/after analysis.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_DATA_HEALTH = {
    enabled: true,
    lastAsset: null,
    lastScore: 0,
    lastQuality: 'D',
    lastUpdate: 0
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }

  function ru(){ return window.appLang === 'ru'; }

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function asset(){
    return window.currentAnalysisAsset || window.currentAsset || 'BTC';
  }

  function live(assetId){
    return window.liveData && window.liveData[assetId] ? window.liveData[assetId] : {};
  }

  function frames(assetId){
    return window.z4CandleFrames && window.z4CandleFrames[assetId] ? window.z4CandleFrames[assetId] : {};
  }

  function candleCount(assetId, tf){
    var f = frames(assetId);
    if(f && f[tf] && Array.isArray(f[tf])) return f[tf].length;
    if(tf === '1h' && window.candleData && Array.isArray(window.candleData[assetId])) return window.candleData[assetId].length;
    return 0;
  }

  function getAnyCandles(assetId){
    var f = frames(assetId);
    if(f['15m'] && f['15m'].length) return f['15m'];
    if(f['1h'] && f['1h'].length) return f['1h'];
    if(window.candleData && window.candleData[assetId] && window.candleData[assetId].length) return window.candleData[assetId];
    return [];
  }

  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2 / (period + 1);
    var seed = 0;
    for(var i=0;i<period;i++) seed += values[i];
    var prev = seed / period;
    for(var j=period;j<values.length;j++) prev = values[j] * k + prev * (1-k);
    return prev;
  }

  function tech(assetId){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(assetId) || {}; }catch(e){}
    try{ if(typeof getTechnicalSnapshot === 'function') return getTechnicalSnapshot(assetId) || {}; }catch(e){}
    return {};
  }

  function hasNumber(v){
    return Number.isFinite(Number(v)) && Number(v) !== 0;
  }

  function isOk(v){
    return v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && !Number.isFinite(v));
  }

  function isCrypto(assetId){
    try{
      return !!(window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.symbols && window.ZYNQEL_DERIVATIVES.symbols[assetId]);
    }catch(e){ return ['BTC','ETH','SOL','XRP','SUI','AVAX'].indexOf(assetId) >= 0; }
  }

  function groqState(){
    var txt = '';
    try{ txt += ' ' + ((document.getElementById('groq-status') || {}).textContent || ''); }catch(e){}
    try{ txt += ' ' + ((document.getElementById('zynqel-single-engine-badge') || {}).textContent || ''); }catch(e){}
    try{ txt += ' ' + ((document.getElementById('zynqel-v7-locked-header') || {}).textContent || ''); }catch(e){}
    txt = txt.toLowerCase();
    if(txt.indexOf('used') >= 0 || txt.indexOf('использ') >= 0) return 'used';
    if(txt.indexOf('skipped') >= 0 || txt.indexOf('пропущ') >= 0) return 'skipped';
    if(txt.indexOf('error') >= 0 || txt.indexOf('ошиб') >= 0) return 'error';
    if(txt.indexOf('groq') >= 0) return 'seen';
    return 'unknown';
  }

  function derivativeData(assetId){
    return window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.data
      ? (window.ZYNQEL_DERIVATIVES.data[assetId] || {})
      : {};
  }

  function addCheck(list, group, label, ok, detail, weight){
    list.push({
      group: group,
      label: label,
      ok: !!ok,
      detail: detail || '',
      weight: weight || 1
    });
  }

  window.zynqelBuildDataHealth = function(assetId){
    assetId = assetId || asset();

    var checks = [];
    var ld = live(assetId);
    var p = num(ld.price, null);
    var c15 = candleCount(assetId, '15m');
    var c1h = candleCount(assetId, '1h');
    var c4h = candleCount(assetId, '4h');
    var c1d = candleCount(assetId, '1d');
    var cs = getAnyCandles(assetId);
    var closes = cs.map(function(c){ return num(c.c, 0); }).filter(function(v){ return v > 0; });
    var lastCandle = cs.length ? cs[cs.length-1] : null;
    var td = tech(assetId);
    var d = derivativeData(assetId);
    var groq = groqState();

    var ema9 = ema(closes, 9);
    var ema21 = ema(closes, 21);
    var ema50 = ema(closes, 50);

    addCheck(checks, 'Market', 'Price Feed', p && p > 0, p ? ('$'+p) : 'empty', 3);
    addCheck(checks, 'Market', '15m Candles', c15 >= 25, String(c15), 2);
    addCheck(checks, 'Market', '1h Candles', c1h >= 25, String(c1h), 2);
    addCheck(checks, 'Market', '4h Candles', c4h >= 20, String(c4h), 1);
    addCheck(checks, 'Market', '1d Candles', c1d >= 20, String(c1d), 1);

    addCheck(checks, 'Technical', 'RSI', isOk(td.rsi), isOk(td.rsi) ? String(Math.round(num(td.rsi,0))) : 'empty', 2);
    addCheck(checks, 'Technical', 'EMA9', ema9 !== null, ema9 ? ema9.toFixed(4) : 'empty', 1);
    addCheck(checks, 'Technical', 'EMA21', ema21 !== null, ema21 ? ema21.toFixed(4) : 'empty', 1);
    addCheck(checks, 'Technical', 'EMA50', ema50 !== null, ema50 ? ema50.toFixed(4) : 'empty', 1);
    addCheck(checks, 'Technical', 'MACD', isOk(td.macdHist) || isOk(td.macd), isOk(td.macdHist) ? String(num(td.macdHist,0).toFixed(4)) : (isOk(td.macd) ? 'ok' : 'empty'), 1);
    addCheck(checks, 'Technical', 'Volume', lastCandle && num(lastCandle.v, 0) > 0, lastCandle ? String(num(lastCandle.v, 0)) : 'empty', 1);

    addCheck(checks, 'Macro', 'DXY', num(live('DXY').price, null) > 0, num(live('DXY').price, null) || 'empty', 1);
    addCheck(checks, 'Macro', 'SPX', num(live('SPX').price, null) > 0, num(live('SPX').price, null) || 'empty', 1);
    addCheck(checks, 'Macro', 'NDX', num(live('NDX').price, null) > 0, num(live('NDX').price, null) || 'empty', 1);
    addCheck(checks, 'Macro', 'VIX', window.marketRiskData && num((window.marketRiskData.VIX || {}).value, null) > 0, window.marketRiskData && (window.marketRiskData.VIX || {}).value ? (window.marketRiskData.VIX || {}).value : 'empty', 1);
    addCheck(checks, 'Macro', 'Fear & Greed', num(window.fearGreed, 0) > 0, num(window.fearGreed, 0) || 'empty', 1);
    addCheck(checks, 'Macro', 'BTC Dominance', window.ZYNQEL_DERIVATIVES && num(window.ZYNQEL_DERIVATIVES.btcDominance, null) > 0, window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.btcDominance ? window.ZYNQEL_DERIVATIVES.btcDominance.toFixed(2)+'%' : 'empty', 1);

    if(isCrypto(assetId)){
      addCheck(checks, 'Derivatives', 'Open Interest', num(d.openInterest, null) > 0, d.openInterest ? String(d.openInterest) : 'empty', 2);
      addCheck(checks, 'Derivatives', 'Funding Rate', isOk(d.lastFundingRate), isOk(d.lastFundingRate) ? (num(d.lastFundingRate,0)*100).toFixed(4)+'%' : 'empty', 2);
      addCheck(checks, 'Derivatives', 'Order Book', isOk(d.orderBookImbalance), isOk(d.orderBookImbalance) ? num(d.orderBookImbalance,0).toFixed(1)+'%' : 'empty', 2);
      addCheck(checks, 'Derivatives', 'Taker Flow', isOk(d.takerBuySellRatio), isOk(d.takerBuySellRatio) ? num(d.takerBuySellRatio,0).toFixed(2) : 'empty', 1);
      addCheck(checks, 'Derivatives', 'Liquidations Proxy', isOk(d.takerBuySellRatio) && isOk(d.futuresChange24h), isOk(d.futuresChange24h) ? 'proxy ok' : 'empty', 1);
    } else {
      addCheck(checks, 'Derivatives', 'Derivatives', true, 'not required', 1);
    }

    addCheck(checks, 'AI', 'News Feed', Array.isArray(window.allNews) && window.allNews.length > 0, Array.isArray(window.allNews) ? String(window.allNews.length)+' items' : 'empty', 2);
    addCheck(checks, 'AI', 'Groq Status', groq === 'used' || groq === 'skipped' || groq === 'seen', groq, 2);
    addCheck(checks, 'AI', 'Market Risk Layer', typeof window.zynqelMarketRiskEarlyWarning === 'function', typeof window.zynqelMarketRiskEarlyWarning === 'function' ? 'ready' : 'missing', 1);
    addCheck(checks, 'AI', 'Early Move Layer', typeof window.zynqelEarlyMoveWarning === 'function', typeof window.zynqelEarlyMoveWarning === 'function' ? 'ready' : 'missing', 1);
    addCheck(checks, 'AI', 'Derivatives Layer', typeof window.zynqelDerivativesSignal === 'function', typeof window.zynqelDerivativesSignal === 'function' ? 'ready' : 'missing', 1);

    var total = checks.reduce(function(s,c){ return s + c.weight; }, 0);
    var got = checks.reduce(function(s,c){ return s + (c.ok ? c.weight : 0); }, 0);
    var score = total ? Math.round(got / total * 100) : 0;
    var quality = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D';

    var missing = checks.filter(function(c){ return !c.ok; }).map(function(c){ return c.label; });

    var weights = {
      Trend: c15 >= 25 || c1h >= 25 ? 24 : 10,
      EMA_RSI_MACD: (ema9 && ema21 && isOk(td.rsi)) ? 22 : 8,
      Derivatives: isCrypto(assetId) && (num(d.openInterest,null)>0 || isOk(d.lastFundingRate) || isOk(d.orderBookImbalance)) ? 20 : 0,
      Macro: num(live('DXY').price,null)>0 || num(live('SPX').price,null)>0 ? 14 : 5,
      News_Groq: (Array.isArray(window.allNews) && window.allNews.length>0) ? 12 : 0,
      Volume: lastCandle && num(lastCandle.v,0)>0 ? 8 : 0
    };

    window.ZYNQEL_DATA_HEALTH.lastAsset = assetId;
    window.ZYNQEL_DATA_HEALTH.lastScore = score;
    window.ZYNQEL_DATA_HEALTH.lastQuality = quality;
    window.ZYNQEL_DATA_HEALTH.lastUpdate = Date.now();

    return {
      asset: assetId,
      score: score,
      quality: quality,
      checks: checks,
      missing: missing,
      weights: weights,
      groq: groq,
      ts: Date.now()
    };
  };

  function groupChecks(checks){
    var map = {};
    checks.forEach(function(c){
      if(!map[c.group]) map[c.group] = [];
      map[c.group].push(c);
    });
    return map;
  }

  function pill(c){
    var col = c.ok ? 'var(--green)' : 'var(--red)';
    var icon = c.ok ? '✅' : '❌';
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid '+col+'33;border-radius:8px;padding:6px 8px;background:rgba(255,255,255,.025);min-width:150px;">' +
      '<span style="font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+icon+' '+esc(c.label)+'</span>' +
      '<span style="font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:95px;">'+esc(c.detail)+'</span>' +
    '</div>';
  }

  function weightBar(label, value){
    var v = Math.max(0, Math.min(100, Number(value)||0));
    return '<div style="margin-bottom:6px;">' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);font-family:JetBrains Mono,monospace;"><span>'+esc(label)+'</span><span>'+v+'%</span></div>' +
      '<div style="height:4px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;"><div style="height:100%;width:'+v+'%;background:var(--blue);border-radius:99px;"></div></div>' +
    '</div>';
  }

  function render(){
    try{
      var page = document.getElementById('page-analysis');
      if(page && !page.classList.contains('active')) return;

      var root = document.getElementById('analysis-content');
      if(!root) return;

      var assetId = asset();
      var h = window.zynqelBuildDataHealth(assetId);

      var old = document.getElementById('zynqel-data-health-dashboard');
      if(old && old.parentNode) old.parentNode.removeChild(old);

      var color = h.score >= 85 ? 'var(--green)' : h.score >= 70 ? 'var(--gold)' : 'var(--red)';
      var groups = groupChecks(h.checks);

      var groupHtml = Object.keys(groups).map(function(group){
        return '<div style="margin-top:10px;">' +
          '<div style="font-size:10px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px;font-family:JetBrains Mono,monospace;">'+esc(group)+'</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;">'+groups[group].map(pill).join('')+'</div>' +
        '</div>';
      }).join('');

      var w = h.weights || {};
      var weightsHtml =
        weightBar('Trend', w.Trend) +
        weightBar('EMA/RSI/MACD', w.EMA_RSI_MACD) +
        weightBar('Derivatives', w.Derivatives) +
        weightBar('Macro', w.Macro) +
        weightBar('News/Groq', w.News_Groq) +
        weightBar('Volume', w.Volume);

      var missingText = h.missing.length
        ? h.missing.slice(0,8).join(' • ')
        : (ru() ? 'Пустых факторов не найдено' : 'No missing factors detected');

      var title = ru() ? 'V7 ДИАГНОСТИКА ДАННЫХ' : 'V7 DATA HEALTH';
      var qualityLabel = ru() ? 'Качество прогноза' : 'Forecast quality';
      var completeness = ru() ? 'Полнота анализа' : 'Analysis completeness';
      var missingLabel = ru() ? 'Пустые / недоступные факторы' : 'Missing / unavailable factors';

      var html =
        '<div id="zynqel-data-health-dashboard" class="card" style="margin-bottom:12px;border-color:'+color+'55;background:rgba(255,255,255,.025);">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
            '<div>' +
              '<div class="card-title" style="margin-bottom:8px;">'+title+'</div>' +
              '<div style="font-size:12px;color:var(--muted);font-family:JetBrains Mono,monospace;">'+esc(assetId)+' • '+completeness+'</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<div style="font-family:JetBrains Mono,monospace;font-size:28px;font-weight:900;color:'+color+';">'+h.score+'%</div>' +
              '<div style="font-family:JetBrains Mono,monospace;font-size:12px;color:var(--text);">'+qualityLabel+': '+h.quality+'</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:10px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:rgba(0,0,0,.16);font-size:11px;color:var(--muted);line-height:1.45;">' +
            '<b style="color:var(--text);">'+missingLabel+':</b> '+esc(missingText) +
          '</div>' +
          groupHtml +
          '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">' +
            '<div style="font-size:10px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px;font-family:JetBrains Mono,monospace;">V7 FACTOR WEIGHTS</div>' +
            weightsHtml +
          '</div>' +
        '</div>';

      // Always place directly under Engine/Groq badge if possible.
      var badge = document.getElementById('zynqel-single-engine-badge') || document.getElementById('zynqel-v7-locked-header');
      if(badge && badge.parentNode){
        badge.insertAdjacentHTML('afterend', html);
      } else {
        root.insertAdjacentHTML('afterbegin', html);
      }
    }catch(e){
      console.warn('Data Health render failed:', e.message);
    }
  }

  window.zynqelRenderDataHealth = render;

  // Diagnostic only; frequent enough to show status, but no forecast mutation.
  setInterval(render, 2000);
  setTimeout(render, 800);

  // Refresh after AI button click too.
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t && (t.id === 'run-ai-analysis-btn' || (t.closest && t.closest('#run-ai-analysis-btn')))){
      setTimeout(render, 300);
      setTimeout(render, 2000);
    }
  });
})();


// ---- extracted inline script block 32 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL HARD STABLE AI PANEL FIX
// Final anti-jump layer: one fixed-height top panel.
// It hides old flickering cards and updates only innerHTML.
// Does NOT change BUY/SELL/WAIT, forecast math, Groq, or APIs.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_HARD_UI_LOCK = {
    enabled:true,
    lastHtml:'',
    lastAsset:null
  };

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
  function ru(){ return window.appLang === 'ru'; }
  function asset(){ return window.currentAnalysisAsset || window.currentAsset || 'BTC'; }
  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function live(id){ return window.liveData && window.liveData[id] ? window.liveData[id] : {}; }
  function frames(id){ return window.z4CandleFrames && window.z4CandleFrames[id] ? window.z4CandleFrames[id] : {}; }
  function candleCount(id, tf){
    var f = frames(id);
    if(f && f[tf] && Array.isArray(f[tf])) return f[tf].length;
    if(tf === '1h' && window.candleData && Array.isArray(window.candleData[id])) return window.candleData[id].length;
    return 0;
  }
  function anyCandles(id){
    var f = frames(id);
    if(f['15m'] && f['15m'].length) return f['15m'];
    if(f['1h'] && f['1h'].length) return f['1h'];
    if(window.candleData && window.candleData[id] && window.candleData[id].length) return window.candleData[id];
    return [];
  }
  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2/(period+1);
    var prev = values.slice(0,period).reduce(function(s,x){return s+x;},0)/period;
    for(var i=period;i<values.length;i++) prev = values[i]*k + prev*(1-k);
    return prev;
  }
  function tech(id){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(id)||{}; }catch(e){}
    return {};
  }
  function isOk(v){ return v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && !Number.isFinite(v)); }
  function isCrypto(id){
    return ['BTC','ETH','SOL','XRP','SUI','AVAX'].indexOf(id) >= 0;
  }
  function deriv(id){
    return window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.data ? (window.ZYNQEL_DERIVATIVES.data[id] || {}) : {};
  }
  function groq(){
    var txt = '';
    try{ txt += ' ' + ((document.getElementById('groq-status') || {}).textContent || ''); }catch(e){}
    txt = txt.toLowerCase();
    if(txt.indexOf('used')>=0 || txt.indexOf('использ')>=0) return 'used';
    if(txt.indexOf('skip')>=0 || txt.indexOf('пропущ')>=0) return 'skipped';
    if(txt.indexOf('error')>=0 || txt.indexOf('ошиб')>=0) return 'error';
    if(txt.indexOf('groq')>=0) return 'seen';
    return 'unknown';
  }

  function getHealth(id){
    var p = num(live(id).price, null);
    var td = tech(id);
    var cs = anyCandles(id);
    var closes = cs.map(function(c){return num(c.c,0);}).filter(function(v){return v>0;});
    var last = cs.length ? cs[cs.length-1] : null;
    var d = deriv(id);
    var e9 = ema(closes,9), e21 = ema(closes,21), e50 = ema(closes,50);

    var checks = [];
    function add(group,label,ok,detail,weight){
      checks.push({group:group,label:label,ok:!!ok,detail:String(detail||''),weight:weight||1});
    }

    add('MARKET','Price Feed',p>0,p?('$'+p):'empty',3);
    add('MARKET','15m Candles',candleCount(id,'15m')>=25,candleCount(id,'15m'),2);
    add('MARKET','1h Candles',candleCount(id,'1h')>=25,candleCount(id,'1h'),2);
    add('MARKET','4h Candles',candleCount(id,'4h')>=20,candleCount(id,'4h'),1);
    add('MARKET','1d Candles',candleCount(id,'1d')>=20,candleCount(id,'1d'),1);

    add('TECHNICAL','RSI',isOk(td.rsi),isOk(td.rsi)?Math.round(num(td.rsi,0)):'empty',2);
    add('TECHNICAL','EMA9',e9!==null,e9?e9.toFixed(4):'empty',1);
    add('TECHNICAL','EMA21',e21!==null,e21?e21.toFixed(4):'empty',1);
    add('TECHNICAL','EMA50',e50!==null,e50?e50.toFixed(4):'empty',1);
    add('TECHNICAL','MACD',isOk(td.macdHist)||isOk(td.macd),isOk(td.macdHist)?num(td.macdHist,0).toFixed(4):(isOk(td.macd)?'ok':'empty'),1);
    add('TECHNICAL','Volume',last && num(last.v,0)>0,last?num(last.v,0):'empty',1);

    add('MACRO','DXY',num(live('DXY').price,null)>0,num(live('DXY').price,null)||'empty',1);
    add('MACRO','SPX',num(live('SPX').price,null)>0,num(live('SPX').price,null)||'empty',1);
    add('MACRO','NDX',num(live('NDX').price,null)>0,num(live('NDX').price,null)||'empty',1);
    add('MACRO','VIX',window.marketRiskData && num((window.marketRiskData.VIX||{}).value,null)>0,window.marketRiskData && (window.marketRiskData.VIX||{}).value || 'empty',1);
    add('MACRO','Fear & Greed',num(window.fearGreed,0)>0,num(window.fearGreed,0)||'empty',1);
    add('MACRO','BTC Dominance',window.ZYNQEL_DERIVATIVES && num(window.ZYNQEL_DERIVATIVES.btcDominance,null)>0,window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.btcDominance ? window.ZYNQEL_DERIVATIVES.btcDominance.toFixed(2)+'%' : 'empty',1);

    if(isCrypto(id)){
      add('DERIVATIVES','Open Interest',num(d.openInterest,null)>0,d.openInterest||'empty',2);
      add('DERIVATIVES','Funding Rate',isOk(d.lastFundingRate),isOk(d.lastFundingRate)?(num(d.lastFundingRate,0)*100).toFixed(4)+'%':'empty',2);
      add('DERIVATIVES','Order Book',isOk(d.orderBookImbalance),isOk(d.orderBookImbalance)?num(d.orderBookImbalance,0).toFixed(1)+'%':'empty',2);
      add('DERIVATIVES','Taker Flow',isOk(d.takerBuySellRatio),isOk(d.takerBuySellRatio)?num(d.takerBuySellRatio,0).toFixed(2):'empty',1);
      add('DERIVATIVES','Liquidations Proxy',isOk(d.takerBuySellRatio)&&isOk(d.futuresChange24h),isOk(d.futuresChange24h)?'proxy ok':'empty',1);
    }

    add('AI','News Feed',Array.isArray(window.allNews)&&window.allNews.length>0,Array.isArray(window.allNews)?window.allNews.length+' items':'empty',2);
    add('AI','Groq Status',['used','skipped','seen'].indexOf(groq())>=0,groq(),2);
    add('AI','Market Risk Layer',typeof window.zynqelMarketRiskEarlyWarning==='function','ready',1);
    add('AI','Early Move Layer',typeof window.zynqelEarlyMoveWarning==='function','ready',1);
    add('AI','Derivatives Layer',typeof window.zynqelDerivativesSignal==='function','ready',1);

    var total = checks.reduce(function(s,c){return s+c.weight;},0);
    var ok = checks.reduce(function(s,c){return s+(c.ok?c.weight:0);},0);
    var score = total ? Math.round(ok/total*100) : 0;
    var quality = score>=90?'A':score>=80?'B':score>=70?'C':'D';
    var missing = checks.filter(function(c){return !c.ok;}).map(function(c){return c.label;});

    return {
      score:score, quality:quality, checks:checks, missing:missing,
      weights:{
        Trend:(candleCount(id,'15m')>=25||candleCount(id,'1h')>=25)?24:10,
        EMA_RSI_MACD:(e9&&e21&&isOk(td.rsi))?22:8,
        Derivatives:isCrypto(id)&&(num(d.openInterest,null)>0||isOk(d.lastFundingRate)||isOk(d.orderBookImbalance))?20:0,
        Macro:(num(live('DXY').price,null)>0||num(live('SPX').price,null)>0)?14:5,
        News_Groq:(Array.isArray(window.allNews)&&window.allNews.length>0)?12:0,
        Volume:last&&num(last.v,0)>0?8:0
      }
    };
  }

  function miniCard(title,value,msg,reasons,color){
    return '<div class="zynqel-hard-mini-card" style="border:1px solid '+color+'55;border-radius:14px;background:rgba(255,255,255,.028);padding:12px 14px;">'+
      '<div style="font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(title)+'</div>'+
      '<div style="font-family:JetBrains Mono,monospace;font-size:22px;font-weight:900;color:'+color+';line-height:1.05;margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(value)+'</div>'+
      '<div style="font-size:12px;color:var(--text);line-height:1.3;height:34px;overflow:hidden;">'+esc(msg)+'</div>'+
      '<div style="font-size:10px;color:var(--muted);line-height:1.3;margin-top:7px;height:28px;overflow:hidden;">'+esc(reasons||'')+'</div>'+
    '</div>';
  }
  function riskColor(level,dir){
    level=String(level||'').toUpperCase(); dir=String(dir||'').toLowerCase();
    if(level==='HIGH'||dir.indexOf('bear')>=0) return 'var(--red)';
    if(dir.indexOf('bull')>=0) return 'var(--green)';
    if(level==='MEDIUM') return 'var(--gold)';
    return 'var(--green)';
  }
  function pill(c){
    var col=c.ok?'var(--green)':'var(--red)';
    var icon=c.ok?'✅':'❌';
    return '<div class="zynqel-hard-pill" style="display:flex;align-items:center;justify-content:space-between;gap:6px;border:1px solid '+col+'33;border-radius:8px;padding:5px 7px;background:rgba(255,255,255,.025);">'+
      '<span style="font-size:10px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+icon+' '+esc(c.label)+'</span>'+
      '<span style="font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;">'+esc(c.detail)+'</span>'+
    '</div>';
  }
  function bar(label,value){
    var v=Math.max(0,Math.min(100,Number(value)||0));
    return '<div style="display:grid;grid-template-columns:90px 1fr 38px;gap:8px;align-items:center;margin-bottom:5px;">'+
      '<div style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--muted);">'+esc(label)+'</div>'+
      '<div style="height:4px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;"><div style="height:100%;width:'+v+'%;background:var(--blue);"></div></div>'+
      '<div style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--muted);">'+v+'%</div>'+
    '</div>';
  }

  function buildPanelHtml(){
    var id=asset();
    var cards=[];
    try{
      var m=typeof window.zynqelMarketRiskEarlyWarning==='function'?window.zynqelMarketRiskEarlyWarning(id):null;
      if(m) cards.push(miniCard(ru()?'РАННИЙ РИСК РЫНКА':'EARLY MARKET RISK',(m.level||'LOW')+' '+(m.score??'--')+'/100',m.message||'',(m.riskReasons||[]).slice(0,4).join(' • '),riskColor(m.level,'')));
      else cards.push(miniCard(ru()?'РАННИЙ РИСК РЫНКА':'EARLY MARKET RISK','LOADING',ru()?'Данные загружаются.':'Data is loading.','','var(--gold)'));
    }catch(e){}
    try{
      var em=typeof window.zynqelEarlyMoveWarning==='function'?window.zynqelEarlyMoveWarning(id):null;
      if(em&&em.ready) cards.push(miniCard(ru()?'РАННЕЕ ПРЕДУПРЕЖДЕНИЕ':'EARLY MOVE WARNING',(em.level||'LOW')+' '+(em.score??'--')+'/100',em.message||'',(em.reasons||[]).slice(0,4).join(' • '),riskColor(em.level,em.direction)));
      else cards.push(miniCard(ru()?'РАННЕЕ ПРЕДУПРЕЖДЕНИЕ':'EARLY MOVE WARNING','LOADING',ru()?'Данные загружаются.':'Data is loading.','','var(--gold)'));
    }catch(e){}
    try{
      var ds=typeof window.zynqelDerivativesSignal==='function'?window.zynqelDerivativesSignal(id):null;
      if(ds&&ds.ready) cards.push(miniCard(ru()?'ДЕРИВАТИВЫ / СТРУКТУРА':'DERIVATIVES / STRUCTURE',String(ds.direction||'neutral').toUpperCase()+' '+(ds.score??'--'),ru()?'OI / Funding / Order Book / BTC dominance':'OI / Funding / Order Book / BTC dominance',(ds.reasons||[]).slice(0,4).join(' • '),riskColor('',ds.direction)));
      else cards.push(miniCard(ru()?'ДЕРИВАТИВЫ / СТРУКТУРА':'DERIVATIVES / STRUCTURE','LOADING',ru()?'Данные загружаются.':'Data is loading.','','var(--gold)'));
    }catch(e){}

    var h=getHealth(id);
    var color=h.score>=85?'var(--green)':h.score>=70?'var(--gold)':'var(--red)';
    var missing=h.missing.length?h.missing.slice(0,8).join(' • '):(ru()?'Пустых факторов не найдено':'No missing factors detected');

    var groups={};
    h.checks.forEach(function(c){ if(!groups[c.group]) groups[c.group]=[]; groups[c.group].push(c); });
    var groupsHtml=Object.keys(groups).map(function(g){
      return '<div style="margin-bottom:7px;"><div style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--muted);letter-spacing:.14em;margin-bottom:4px;">'+esc(g)+'</div>'+
      '<div class="zynqel-hard-health-grid">'+groups[g].map(pill).join('')+'</div></div>';
    }).join('');

    var weights=h.weights;
    var weightsHtml=bar('Trend',weights.Trend)+bar('EMA/RSI/MACD',weights.EMA_RSI_MACD)+bar('Derivatives',weights.Derivatives)+bar('Macro',weights.Macro)+bar('News/Groq',weights.News_Groq)+bar('Volume',weights.Volume);

    return '<div id="zynqel-hard-stable-ai-panel" class="card" style="border-color:'+color+'55;background:rgba(255,255,255,.018);">'+
      '<div id="zynqel-hard-risk-row">'+cards.join('')+'</div>'+
      '<div id="zynqel-hard-data-health">'+
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px;">'+
          '<div><div class="card-title" style="margin-bottom:6px;">V7 DATA HEALTH</div><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:var(--muted);">'+esc(id)+' • Analysis completeness</div></div>'+
          '<div style="text-align:right;"><div style="font-family:JetBrains Mono,monospace;font-size:24px;font-weight:900;color:'+color+';">'+h.score+'%</div><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:var(--text);">Quality: '+h.quality+'</div></div>'+
        '</div>'+
        '<div style="margin-bottom:8px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:rgba(0,0,0,.16);font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><b style="color:var(--text);">Missing/unavailable:</b> '+esc(missing)+'</div>'+
        groupsHtml+
        '<div style="border-top:1px solid var(--border);padding-top:7px;margin-top:7px;"><div style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--muted);letter-spacing:.14em;margin-bottom:6px;">V7 FACTOR WEIGHTS</div>'+weightsHtml+'</div>'+
      '</div>'+
    '</div>';
  }

  function getRoot(){
    return document.getElementById('analysis-content') || document.getElementById('page-analysis');
  }
  function isActive(){
    var p=document.getElementById('page-analysis');
    return !p || p.classList.contains('active');
  }
  function removeOld(){
    var selector=[
      '#zynqel-stable-top-panels',
      '#zynqel-stable-risk-row',
      '#zynqel-risk-cards-stable',
      '#zynqel-market-risk-card',
      '#zynqel-early-move-card',
      '#zynqel-derivatives-card',
      '#zynqel-data-health-dashboard'
    ].join(',');
    document.querySelectorAll(selector).forEach(function(el){
      if(el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function renderHard(){
    if(!isActive()) return;
    var root=getRoot(); if(!root) return;
    removeOld();
    var html=buildPanelHtml();
    var panel=document.getElementById('zynqel-hard-stable-ai-panel');
    if(panel){
      if(panel.outerHTML !== html) panel.outerHTML = html;
    }else{
      var badge=document.getElementById('zynqel-single-engine-badge') || document.getElementById('zynqel-v7-locked-header');
      if(badge && badge.parentNode) badge.insertAdjacentHTML('afterend',html);
      else root.insertAdjacentHTML('afterbegin',html);
    }
  }

  window.zynqelHardRenderStableAI = renderHard;
  window.zynqelRenderDataHealth = renderHard;
  window.zynqelRenderStableTopPanels = renderHard;

  // Slow stable refresh. Fixed height prevents jumps even while values change.
  setInterval(renderHard, 2500);
  setTimeout(renderHard, 400);
  setTimeout(renderHard, 1800);
})();


// ---- extracted inline script block 33 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL PERSISTENT TOP PANEL FINAL FIX
// The panel is inserted BEFORE #analysis-content, so forecast redraws cannot remove it.
// It only updates text inside a fixed-height shell.
// Does NOT change BUY/SELL/WAIT or any forecast math.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_PERSISTENT_TOP_FIX = { enabled:true, lastShellReady:false };

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
  function ru(){ return window.appLang === 'ru'; }
  function asset(){ return window.currentAnalysisAsset || window.currentAsset || 'BTC'; }
  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function live(id){ return window.liveData && window.liveData[id] ? window.liveData[id] : {}; }
  function frames(id){ return window.z4CandleFrames && window.z4CandleFrames[id] ? window.z4CandleFrames[id] : {}; }
  function candleCount(id, tf){
    var f = frames(id);
    if(f && f[tf] && Array.isArray(f[tf])) return f[tf].length;
    if(tf === '1h' && window.candleData && Array.isArray(window.candleData[id])) return window.candleData[id].length;
    return 0;
  }
  function anyCandles(id){
    var f = frames(id);
    if(f['15m'] && f['15m'].length) return f['15m'];
    if(f['1h'] && f['1h'].length) return f['1h'];
    if(window.candleData && window.candleData[id] && window.candleData[id].length) return window.candleData[id];
    return [];
  }
  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2/(period+1);
    var prev = values.slice(0,period).reduce(function(s,x){return s+x;},0)/period;
    for(var i=period;i<values.length;i++) prev = values[i]*k + prev*(1-k);
    return prev;
  }
  function tech(id){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(id)||{}; }catch(e){}
    return {};
  }
  function isOk(v){ return v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && !Number.isFinite(v)); }
  function isCrypto(id){ return ['BTC','ETH','SOL','XRP','SUI','AVAX'].indexOf(id) >= 0; }
  function deriv(id){ return window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.data ? (window.ZYNQEL_DERIVATIVES.data[id] || {}) : {}; }
  function groq(){
    var txt='';
    try{ txt += ' ' + ((document.getElementById('groq-status') || {}).textContent || ''); }catch(e){}
    txt=txt.toLowerCase();
    if(txt.indexOf('used')>=0 || txt.indexOf('использ')>=0) return 'used';
    if(txt.indexOf('skip')>=0 || txt.indexOf('пропущ')>=0) return 'skipped';
    if(txt.indexOf('error')>=0 || txt.indexOf('ошиб')>=0) return 'error';
    if(txt.indexOf('groq')>=0) return 'seen';
    return 'unknown';
  }

  function ensureShell(){
    var page = document.getElementById('page-analysis');
    var content = document.getElementById('analysis-content');
    if(!page || !content) return null;

    var existing = document.getElementById('zynqel-persistent-ai-top');
    if(existing) return existing;

    var panel = document.createElement('div');
    panel.id = 'zynqel-persistent-ai-top';
    panel.className = 'card';
    panel.innerHTML =
      '<div class="zq-row">' +
        '<div class="zq-card" id="zq-market-card"></div>' +
        '<div class="zq-card" id="zq-early-card"></div>' +
        '<div class="zq-card" id="zq-deriv-card"></div>' +
      '</div>' +
      '<div class="zq-health" id="zq-health-card"></div>';

    content.parentNode.insertBefore(panel, content);
    return panel;
  }

  function hideOldMovingBlocks(){
    [
      'zynqel-hard-stable-ai-panel','zynqel-stable-top-panels','zynqel-stable-risk-row',
      'zynqel-risk-cards-stable','zynqel-market-risk-card','zynqel-early-move-card',
      'zynqel-derivatives-card','zynqel-data-health-dashboard'
    ].forEach(function(id){
      document.querySelectorAll('#'+id).forEach(function(el){
        if(el){ el.style.display='none'; el.style.height='0px'; el.style.margin='0'; el.style.padding='0'; }
      });
    });
  }

  function riskColor(level,dir){
    level=String(level||'').toUpperCase(); dir=String(dir||'').toLowerCase();
    if(level==='HIGH'||dir.indexOf('bear')>=0) return 'var(--red)';
    if(dir.indexOf('bull')>=0) return 'var(--green)';
    if(level==='MEDIUM') return 'var(--gold)';
    return 'var(--green)';
  }

  function setCard(id, title, value, msg, reasons, color){
    var el = document.getElementById(id);
    if(!el) return;
    var html =
      '<div style="font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(title)+'</div>'+
      '<div style="font-family:JetBrains Mono,monospace;font-size:22px;font-weight:900;color:'+color+';line-height:1.05;margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(value)+'</div>'+
      '<div style="font-size:12px;color:var(--text);line-height:1.3;height:34px;overflow:hidden;">'+esc(msg||'')+'</div>'+
      '<div style="font-size:10px;color:var(--muted);line-height:1.3;margin-top:7px;height:28px;overflow:hidden;">'+esc(reasons||'')+'</div>';
    if(el.innerHTML !== html){
      el.style.border = '1px solid '+color+'55';
      el.innerHTML = html;
    }
  }

  function health(id){
    var p=num(live(id).price,null), td=tech(id), cs=anyCandles(id), d=deriv(id);
    var closes=cs.map(function(c){return num(c.c,0);}).filter(function(v){return v>0;});
    var last=cs.length?cs[cs.length-1]:null;
    var e9=ema(closes,9), e21=ema(closes,21), e50=ema(closes,50);
    var checks=[];
    function add(g,l,ok,det,w){ checks.push({group:g,label:l,ok:!!ok,detail:String(det||''),weight:w||1}); }

    add('MARKET','Price Feed',p>0,p?('$'+p):'empty',3);
    add('MARKET','15m Candles',candleCount(id,'15m')>=25,candleCount(id,'15m'),2);
    add('MARKET','1h Candles',candleCount(id,'1h')>=25,candleCount(id,'1h'),2);
    add('MARKET','4h Candles',candleCount(id,'4h')>=20,candleCount(id,'4h'),1);
    add('MARKET','1d Candles',candleCount(id,'1d')>=20,candleCount(id,'1d'),1);

    add('TECHNICAL','RSI',isOk(td.rsi),isOk(td.rsi)?Math.round(num(td.rsi,0)):'empty',2);
    add('TECHNICAL','EMA9',e9!==null,e9?e9.toFixed(4):'empty',1);
    add('TECHNICAL','EMA21',e21!==null,e21?e21.toFixed(4):'empty',1);
    add('TECHNICAL','EMA50',e50!==null,e50?e50.toFixed(4):'empty',1);
    add('TECHNICAL','MACD',isOk(td.macdHist)||isOk(td.macd),isOk(td.macdHist)?num(td.macdHist,0).toFixed(4):(isOk(td.macd)?'ok':'empty'),1);
    add('TECHNICAL','Volume',last && num(last.v,0)>0,last?num(last.v,0):'empty',1);

    add('MACRO','DXY',num(live('DXY').price,null)>0,num(live('DXY').price,null)||'empty',1);
    add('MACRO','SPX',num(live('SPX').price,null)>0,num(live('SPX').price,null)||'empty',1);
    add('MACRO','NDX',num(live('NDX').price,null)>0,num(live('NDX').price,null)||'empty',1);
    add('MACRO','VIX',window.marketRiskData && num((window.marketRiskData.VIX||{}).value,null)>0,window.marketRiskData && (window.marketRiskData.VIX||{}).value || 'empty',1);
    add('MACRO','Fear & Greed',num(window.fearGreed,0)>0,num(window.fearGreed,0)||'empty',1);
    add('MACRO','BTC Dominance',window.ZYNQEL_DERIVATIVES && num(window.ZYNQEL_DERIVATIVES.btcDominance,null)>0,window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.btcDominance ? window.ZYNQEL_DERIVATIVES.btcDominance.toFixed(2)+'%' : 'empty',1);

    if(isCrypto(id)){
      add('DERIVATIVES','Open Interest',num(d.openInterest,null)>0,d.openInterest||'empty',2);
      add('DERIVATIVES','Funding Rate',isOk(d.lastFundingRate),isOk(d.lastFundingRate)?(num(d.lastFundingRate,0)*100).toFixed(4)+'%':'empty',2);
      add('DERIVATIVES','Order Book',isOk(d.orderBookImbalance),isOk(d.orderBookImbalance)?num(d.orderBookImbalance,0).toFixed(1)+'%':'empty',2);
      add('DERIVATIVES','Taker Flow',isOk(d.takerBuySellRatio),isOk(d.takerBuySellRatio)?num(d.takerBuySellRatio,0).toFixed(2):'empty',1);
      add('DERIVATIVES','Liquidations Proxy',isOk(d.takerBuySellRatio)&&isOk(d.futuresChange24h),isOk(d.futuresChange24h)?'proxy ok':'empty',1);
    }

    add('AI','News Feed',Array.isArray(window.allNews)&&window.allNews.length>0,Array.isArray(window.allNews)?window.allNews.length+' items':'empty',2);
    add('AI','Groq Status',['used','skipped','seen'].indexOf(groq())>=0,groq(),2);
    add('AI','Market Risk Layer',typeof window.zynqelMarketRiskEarlyWarning==='function','ready',1);
    add('AI','Early Move Layer',typeof window.zynqelEarlyMoveWarning==='function','ready',1);
    add('AI','Derivatives Layer',typeof window.zynqelDerivativesSignal==='function','ready',1);

    var total=checks.reduce(function(s,c){return s+c.weight;},0);
    var ok=checks.reduce(function(s,c){return s+(c.ok?c.weight:0);},0);
    var score=total?Math.round(ok/total*100):0;
    var quality=score>=90?'A':score>=80?'B':score>=70?'C':'D';
    return {checks:checks,score:score,quality:quality,missing:checks.filter(function(c){return !c.ok;}).map(function(c){return c.label;})};
  }

  function pill(c){
    var col=c.ok?'var(--green)':'var(--red)';
    var icon=c.ok?'✅':'❌';
    return '<div class="zq-pill" style="display:flex;align-items:center;justify-content:space-between;gap:6px;border:1px solid '+col+'33;border-radius:8px;padding:5px 7px;background:rgba(255,255,255,.025);">'+
      '<span style="font-size:10px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+icon+' '+esc(c.label)+'</span>'+
      '<span style="font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;">'+esc(c.detail)+'</span>'+
    '</div>';
  }

  function renderHealth(){
    var id=asset(), h=health(id);
    var el=document.getElementById('zq-health-card');
    if(!el) return;
    var color=h.score>=85?'var(--green)':h.score>=70?'var(--gold)':'var(--red)';
    var missing=h.missing.length?h.missing.slice(0,8).join(' • '):(ru()?'Пустых факторов не найдено':'No missing factors detected');

    var groups={};
    h.checks.forEach(function(c){ if(!groups[c.group]) groups[c.group]=[]; groups[c.group].push(c); });
    var groupsHtml=Object.keys(groups).map(function(g){
      return '<div style="margin-bottom:7px;"><div style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--muted);letter-spacing:.14em;margin-bottom:4px;">'+esc(g)+'</div>'+
        '<div class="zq-grid">'+groups[g].map(pill).join('')+'</div></div>';
    }).join('');

    var html =
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px;">'+
        '<div><div class="card-title" style="margin-bottom:6px;">V7 DATA HEALTH</div><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:var(--muted);">'+esc(id)+' • Analysis completeness</div></div>'+
        '<div style="text-align:right;"><div style="font-family:JetBrains Mono,monospace;font-size:24px;font-weight:900;color:'+color+';">'+h.score+'%</div><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:var(--text);">Quality: '+h.quality+'</div></div>'+
      '</div>'+
      '<div style="margin-bottom:8px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:rgba(0,0,0,.16);font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><b style="color:var(--text);">Missing/unavailable:</b> '+esc(missing)+'</div>'+
      groupsHtml;

    if(el.innerHTML !== html) el.innerHTML = html;
  }

  function render(){
    var page=document.getElementById('page-analysis');
    if(page && !page.classList.contains('active')) return;
    if(!ensureShell()) return;
    hideOldMovingBlocks();

    var id=asset();

    try{
      var m=typeof window.zynqelMarketRiskEarlyWarning==='function'?window.zynqelMarketRiskEarlyWarning(id):null;
      if(m) setCard('zq-market-card',ru()?'РАННИЙ РИСК РЫНКА':'EARLY MARKET RISK',(m.level||'LOW')+' '+(m.score??'--')+'/100',m.message||'',(m.riskReasons||[]).slice(0,4).join(' • '),riskColor(m.level,''));
      else setCard('zq-market-card',ru()?'РАННИЙ РИСК РЫНКА':'EARLY MARKET RISK','LOADING',ru()?'Данные загружаются.':'Data is loading.','','var(--gold)');
    }catch(e){}

    try{
      var em=typeof window.zynqelEarlyMoveWarning==='function'?window.zynqelEarlyMoveWarning(id):null;
      if(em&&em.ready) setCard('zq-early-card',ru()?'РАННЕЕ ПРЕДУПРЕЖДЕНИЕ':'EARLY MOVE WARNING',(em.level||'LOW')+' '+(em.score??'--')+'/100',em.message||'',(em.reasons||[]).slice(0,4).join(' • '),riskColor(em.level,em.direction));
      else setCard('zq-early-card',ru()?'РАННЕЕ ПРЕДУПРЕЖДЕНИЕ':'EARLY MOVE WARNING','LOADING',ru()?'Данные загружаются.':'Data is loading.','','var(--gold)');
    }catch(e){}

    try{
      var ds=typeof window.zynqelDerivativesSignal==='function'?window.zynqelDerivativesSignal(id):null;
      if(ds&&ds.ready) setCard('zq-deriv-card',ru()?'ДЕРИВАТИВЫ / СТРУКТУРА':'DERIVATIVES / STRUCTURE',String(ds.direction||'neutral').toUpperCase()+' '+(ds.score??'--'),ru()?'OI / Funding / Order Book / BTC dominance':'OI / Funding / Order Book / BTC dominance',(ds.reasons||[]).slice(0,4).join(' • '),riskColor('',ds.direction));
      else setCard('zq-deriv-card',ru()?'ДЕРИВАТИВЫ / СТРУКТУРА':'DERIVATIVES / STRUCTURE','LOADING',ru()?'Данные загружаются.':'Data is loading.','','var(--gold)');
    }catch(e){}

    renderHealth();
  }

  window.zynqelPersistentTopRender = render;
  window.zynqelHardRenderStableAI = render;
  window.zynqelRenderDataHealth = render;
  window.zynqelRenderStableTopPanels = render;

  // Keep the shell alive even when analysis-content is fully replaced.
  var mo = new MutationObserver(function(){ ensureShell(); hideOldMovingBlocks(); });
  try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){}

  setInterval(render, 2500);
  setTimeout(render, 300);
  setTimeout(render, 1200);
  setTimeout(render, 2500);
})();


// ---- extracted inline script block 34 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL REMOVE JUMPING ENGINE DUPLICATE
// Fixes the exact jump shown on the video/photo:
// extra "Engine: V6 ENGINE / GROQ idle waiting" appears under Data Health.
// Does NOT change BUY/SELL/WAIT or any forecast logic.
// ═══════════════════════════════════════════════════════
(function(){
  function looksLikeDuplicateEngine(el){
    if(!el) return false;
    var txt = (el.textContent || '').toLowerCase();
    if(txt.indexOf('engine') < 0 && txt.indexOf('мозг') < 0) return false;
    if(txt.indexOf('groq') < 0) return false;

    // Do not remove the real top header badge near asset chips.
    if(el.closest && el.closest('#zynqel-persistent-ai-top')) return false;
    if(el.closest && el.closest('.topbar')) return false;

    var ac = document.getElementById('analysis-content');
    return ac && ac.contains(el);
  }

  function hideDuplicateEngines(){
    var ac = document.getElementById('analysis-content');
    if(!ac) return;

    Array.from(ac.querySelectorAll('*')).forEach(function(el){
      if(looksLikeDuplicateEngine(el)){
        el.style.setProperty('display','none','important');
        el.style.setProperty('height','0','important');
        el.style.setProperty('min-height','0','important');
        el.style.setProperty('max-height','0','important');
        el.style.setProperty('margin','0','important');
        el.style.setProperty('padding','0','important');
        el.style.setProperty('overflow','hidden','important');
        el.style.setProperty('border','0','important');
        el.style.setProperty('opacity','0','important');
        el.setAttribute('data-zynqel-hidden-duplicate-engine','1');
      }
    });
  }

  window.zynqelHideDuplicateEngines = hideDuplicateEngines;

  var mo = new MutationObserver(function(){
    hideDuplicateEngines();
  });

  try{
    mo.observe(document.body,{childList:true,subtree:true});
  }catch(e){}

  setInterval(hideDuplicateEngines, 500);
  setTimeout(hideDuplicateEngines, 100);
  setTimeout(hideDuplicateEngines, 800);
  setTimeout(hideDuplicateEngines, 1800);
})();


// ZYNQEL AI analysis/forecast/Groq/V7 patches extracted from index.html
