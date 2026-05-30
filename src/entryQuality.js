// ZYNQEL Entry Quality layer extracted from index.html
// ---- extracted inline script block 38 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL ENTRY QUALITY ENGINE
// Independent layer for all assets.
// It does NOT change V7 BUY / SELL / WAIT.
// It only says whether the current entry is good now, better to wait retest,
// or no entry.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_ENTRY_QUALITY = {
    enabled: true,
    last: null
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }

  function ru(){ return window.appLang === 'ru'; }

  function asset(){
    return window.currentAnalysisAsset || window.currentAsset || 'BTC';
  }

  function live(id){
    return window.liveData && window.liveData[id] ? window.liveData[id] : {};
  }

  function frames(id){
    return window.z4CandleFrames && window.z4CandleFrames[id] ? window.z4CandleFrames[id] : {};
  }

  function candles(id){
    var f = frames(id);
    if(f['15m'] && f['15m'].length >= 30) return f['15m'];
    if(f['1h'] && f['1h'].length >= 30) return f['1h'];
    if(window.candleData && window.candleData[id] && window.candleData[id].length >= 30) return window.candleData[id];
    return [];
  }

  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2 / (period + 1);
    var prev = values.slice(0, period).reduce(function(s,x){ return s+x; }, 0) / period;
    for(var i=period;i<values.length;i++) prev = values[i]*k + prev*(1-k);
    return prev;
  }

  function avg(arr){
    arr = (arr || []).filter(function(v){ return Number.isFinite(v) && v > 0; });
    return arr.length ? arr.reduce(function(s,x){ return s+x; }, 0) / arr.length : 0;
  }

  function pctDist(a,b){
    a = num(a, null); b = num(b, null);
    if(!a || !b) return 0;
    return Math.abs((a-b)/b*100);
  }

  function getRenderedForecast(){
    var f = window.lastAnalysisForecast || {};
    var txt = '';
    try{ txt = (document.getElementById('analysis-content') || {}).innerText || ''; }catch(e){}

    var prob = num(f.probability ?? f.upwardProbability, null);
    var conf = num(f.confidence, null);
    var action = String(f.action || '').toLowerCase();

    if(prob === null){
      var m = txt.match(/(?:UPWARD PROB|ВЕРОЯТНОСТЬ РОСТА)[^\d]*(\d{1,3})%/i);
      if(m) prob = num(m[1], null);
    }
    if(conf === null){
      var c = txt.match(/(?:CONFIDENCE|УВЕРЕННОСТЬ)[^\d]*(\d{1,3})%/i);
      if(c) conf = num(c[1], null);
    }
    if(!action){
      if(/i would buy|я бы купил/i.test(txt)) action = 'buy';
      else if(/i would sell|я бы продал/i.test(txt)) action = 'sell';
      else action = 'wait';
    }

    return {
      probability: prob === null ? 50 : prob,
      confidence: conf === null ? 50 : conf,
      action: action || 'wait'
    };
  }

  function getEarlyScore(id){
    try{
      if(typeof window.zynqelEarlyEntrySignal === 'function'){
        var ee = window.zynqelEarlyEntrySignal(id);
        if(ee && ee.ready) return num(ee.score, 0);
      }
    }catch(e){}
    try{
      if(typeof window.zynqelEarlyMoveWarning === 'function'){
        var em = window.zynqelEarlyMoveWarning(id);
        if(em && em.ready) return num(em.score, 0);
      }
    }catch(e){}
    return 0;
  }

  function getDeriv(id){
    try{
      if(typeof window.zynqelDerivativesSignal === 'function'){
        return window.zynqelDerivativesSignal(id) || {};
      }
    }catch(e){}
    return {};
  }

  function buildEntryQuality(id){
    id = id || asset();

    var fc = getRenderedForecast();
    var cs = candles(id);
    var price = num(live(id).price, null);

    if(cs.length){
      var last = cs[cs.length-1];
      price = num(last.c, price);
    }

    var closes = cs.map(function(c){ return num(c.c,0); }).filter(function(v){ return v > 0; });
    var vols = cs.map(function(c){ return num(c.v,0); }).filter(function(v){ return v > 0; });

    var e9 = ema(closes, 9);
    var e21 = ema(closes, 21);
    var e50 = ema(closes, 50);

    var last = cs.length ? cs[cs.length-1] : null;
    var lastRange = last ? Math.abs(num(last.h,0) - num(last.l,0)) : 0;
    var avgRange = avg(cs.slice(-22,-2).map(function(c){ return Math.abs(num(c.h,0)-num(c.l,0)); }));

    var lastVol = vols.length ? vols[vols.length-1] : 0;
    var avgVol = avg(vols.slice(-22,-2));
    var volumeBoost = avgVol ? lastVol / avgVol : 0;

    var earlyScore = getEarlyScore(id);
    var deriv = getDeriv(id);
    var derivScore = num(deriv.score, 0);
    var orderBook = deriv && deriv.derivatives ? num(deriv.derivatives.orderBookImbalance, null) : null;
    var taker = deriv && deriv.derivatives ? num(deriv.derivatives.takerBuySellRatio, null) : null;

    var distEma9 = pctDist(price, e9);
    var distEma21 = pctDist(price, e21);
    var extended = distEma9 > 1.5 || distEma21 > 3 || (avgRange && lastRange > avgRange * 2);

    var bullishStructure = price && e9 && e21 && price > e9 && e9 > e21;
    var bearishStructure = price && e9 && e21 && price < e9 && e9 < e21;

    var reasons = [];
    var state = 'NO ENTRY';
    var color = 'var(--muted)';
    var emoji = '⚪';
    var direction = 'neutral';

    var buyValid =
      fc.probability >= 65 &&
      fc.confidence >= 65 &&
      bullishStructure &&
      volumeBoost >= 1 &&
      earlyScore >= 60;

    var sellValid =
      fc.probability <= 35 &&
      fc.confidence >= 60 &&
      bearishStructure &&
      (orderBook === null || orderBook < 0) &&
      (taker === null || taker < 1);

    // Soft mode: if V7 already says BUY/SELL with high confidence, grade that too.
    if(!buyValid && fc.action === 'buy' && fc.probability >= 65 && fc.confidence >= 65 && bullishStructure){
      buyValid = true;
      reasons.push(ru() ? 'V7 уже даёт BUY с сильной вероятностью' : 'V7 already gives BUY with strong probability');
    }
    if(!sellValid && fc.action === 'sell' && fc.confidence >= 60 && bearishStructure){
      sellValid = true;
      reasons.push(ru() ? 'V7 уже даёт SELL с подтверждённой структурой' : 'V7 already gives SELL with confirmed structure');
    }

    if(buyValid){
      direction = 'long';
      if(extended){
        state = 'WAIT RETEST';
        color = 'var(--gold)';
        emoji = '🟡';
        reasons.push(ru() ? 'Рост вероятен, но цена уже далеко от EMA9/EMA21' : 'Growth is likely, but price is already extended from EMA9/EMA21');
      }else{
        state = 'STRONG ENTRY';
        color = 'var(--green)';
        emoji = '🟢';
        reasons.push(ru() ? 'EMA структура бычья, объём поддерживает вход' : 'EMA structure is bullish and volume supports entry');
      }
    }else if(sellValid){
      direction = 'short';
      if(extended){
        state = 'WAIT RETEST';
        color = 'var(--gold)';
        emoji = '🟡';
        reasons.push(ru() ? 'Шорт вероятен, но движение уже растянуто — лучше ждать откат' : 'Short is likely, but the move is extended — wait for retest');
      }else{
        state = 'STRONG ENTRY';
        color = 'var(--red)';
        emoji = '🔴';
        reasons.push(ru() ? 'EMA структура медвежья, давление продавцов подтверждается' : 'EMA structure is bearish and seller pressure is confirmed');
      }
    }else{
      state = 'NO ENTRY';
      color = 'var(--muted)';
      emoji = '⚪';
      if(fc.confidence < 55) reasons.push(ru() ? 'Уверенность ниже 55%' : 'Confidence below 55%');
      if(fc.probability > 40 && fc.probability < 60) reasons.push(ru() ? 'Вероятность около 50%, нет преимущества' : 'Probability is near 50%, no clear edge');
      if(!bullishStructure && !bearishStructure) reasons.push(ru() ? 'EMA структура смешанная' : 'EMA structure is mixed');
      if(volumeBoost > 0 && volumeBoost < 1) reasons.push(ru() ? 'Объём ниже среднего' : 'Volume is below average');
      if(!reasons.length) reasons.push(ru() ? 'Недостаточно подтверждений для входа сейчас' : 'Not enough confirmation for entry now');
    }

    var detail = [];
    detail.push('P ' + Math.round(fc.probability) + '%');
    detail.push('C ' + Math.round(fc.confidence) + '%');
    if(e9) detail.push('EMA9 dist ' + distEma9.toFixed(2) + '%');
    if(volumeBoost) detail.push('Vol x' + volumeBoost.toFixed(2));
    if(earlyScore) detail.push('Early ' + Math.round(earlyScore));
    if(derivScore) detail.push('Deriv ' + derivScore);

    return {
      asset: id,
      state: state,
      direction: direction,
      color: color,
      emoji: emoji,
      reasons: reasons.slice(0,3),
      detail: detail.join(' • '),
      probability: fc.probability,
      confidence: fc.confidence,
      distEma9: distEma9,
      distEma21: distEma21,
      volumeBoost: volumeBoost,
      earlyScore: earlyScore,
      derivScore: derivScore
    };
  }

  function renderEntryQuality(){
    try{
      var page = document.getElementById('page-analysis');
      if(page && !page.classList.contains('active')) return;

      var root = document.getElementById('analysis-content');
      if(!root) return;

      var q = buildEntryQuality(asset());
      window.ZYNQEL_ENTRY_QUALITY.last = q;

      var old = document.getElementById('zynqel-entry-quality-card');
      if(old && old.parentNode) old.parentNode.removeChild(old);

      var title = ru() ? 'КАЧЕСТВО ВХОДА' : 'ENTRY QUALITY';
      var html =
        '<div id="zynqel-entry-quality-card">' +
          '<div class="zq-entry-title">' + title + '</div>' +
          '<div class="zq-entry-main" style="color:'+q.color+';">' + q.emoji + ' ' + q.state + '</div>' +
          '<div class="zq-entry-reason">' + q.reasons.map(function(x){return String(x).replace(/[<>&]/g,"");}).join(' · ') + '</div>' +
          '<div class="zq-entry-small">' + q.detail + '</div>' +
        '</div>';

      var actionCard = Array.from(root.querySelectorAll('.card')).find(function(el){
        var txt = (el.textContent || '').toLowerCase();
        return txt.indexOf('my action') >= 0 || txt.indexOf('моё действие') >= 0 || txt.indexOf('мое действие') >= 0;
      });

      if(actionCard){
        actionCard.insertAdjacentHTML('afterend', html);
      }else{
        root.insertAdjacentHTML('beforeend', html);
      }
    }catch(e){
      console.warn('Entry Quality render failed:', e.message);
    }
  }

  window.zynqelEntryQuality = buildEntryQuality;
  window.zynqelRenderEntryQuality = renderEntryQuality;

  setInterval(renderEntryQuality, 2500);
  setTimeout(renderEntryQuality, 800);
  setTimeout(renderEntryQuality, 2500);

  document.addEventListener('click', function(e){
    var t = e.target;
    if(t && (t.id === 'run-ai-analysis-btn' || (t.closest && t.closest('#run-ai-analysis-btn')))){
      setTimeout(renderEntryQuality, 700);
      setTimeout(renderEntryQuality, 2500);
    }
  });
})();


// ZYNQEL stable row post-render hook
(function(){
  if(window.__ZYNQEL_ENTRY_STABLE_HOOK__) return;
  window.__ZYNQEL_ENTRY_STABLE_HOOK__ = true;
  setInterval(function(){
    try{
      if(typeof window.zynqelStabilizeAnalysisRows === 'function'){
        window.zynqelStabilizeAnalysisRows();
      }
    }catch(e){}
  }, 900);
})();


// =====================================================
// ZYNQEL ACTIVE MODE ENTRY QUALITY REAL SIGNAL FIX
// Makes Active Mode actually affect Entry Quality.
// Safe Mode remains conservative.
// =====================================================
(function(){
  if(window.__ZYNQEL_ACTIVE_ENTRY_QUALITY_REAL_FIX__) return;
  window.__ZYNQEL_ACTIVE_ENTRY_QUALITY_REAL_FIX__ = true;

  function mode(){
    try{
      if(typeof window.zynqelGetTradeMode === 'function') return window.zynqelGetTradeMode();
    }catch(e){}
    try{
      return localStorage.getItem('zynqel_trade_mode') || 'safe';
    }catch(e){}
    return 'safe';
  }

  function isActive(){
    return mode() === 'active';
  }

  function thresholds(){
    try{
      if(typeof window.zynqelGetTradeThresholds === 'function') return window.zynqelGetTradeThresholds();
    }catch(e){}
    return isActive()
      ? {minFinalTradeConfluence:58,minEdge:7,minConfidence:56}
      : {minFinalTradeConfluence:65,minEdge:12,minConfidence:62};
  }

  function n(v, d){
    v = Number(v);
    return Number.isFinite(v) ? v : d;
  }

  function getForecast(){
    return window.lastAnalysisForecast ||
           window.currentForecast ||
           window.latestForecast ||
           window.forecast ||
           {};
  }

  function getAsset(){
    return window.currentAnalysisAsset || window.currentAsset || window.selectedAsset || '';
  }

  function getEarlyScore(asset){
    try{
      if(typeof window.zynqelEarlyMoveWarning === 'function'){
        var e = window.zynqelEarlyMoveWarning(asset);
        if(e && Number.isFinite(Number(e.score))) return Number(e.score);
      }
    }catch(e){}
    try{
      var fc = getForecast();
      if(Number.isFinite(Number(fc.earlyScore))) return Number(fc.earlyScore);
      if(Number.isFinite(Number(fc.earlyMoveScore))) return Number(fc.earlyMoveScore);
    }catch(e){}
    return 0;
  }

  function getDerivScore(asset){
    try{
      if(typeof window.zynqelDerivativesSignal === 'function'){
        var d = window.zynqelDerivativesSignal(asset);
        if(d && Number.isFinite(Number(d.score))) return Number(d.score);
      }
    }catch(e){}
    try{
      var fc = getForecast();
      if(Number.isFinite(Number(fc.derivScore))) return Number(fc.derivScore);
      if(Number.isFinite(Number(fc.derivativesScore))) return Number(fc.derivativesScore);
    }catch(e){}
    return 0;
  }

  function getVolumeBoost(){
    try{
      var fc = getForecast();
      if(Number.isFinite(Number(fc.volumeBoost))) return Number(fc.volumeBoost);
      if(Number.isFinite(Number(fc.volBoost))) return Number(fc.volBoost);
    }catch(e){}

    // Extract from visible Entry Quality line: "Vol x2.30"
    try{
      var txt = document.body.textContent || '';
      var m = txt.match(/Vol\s*x\s*([0-9.]+)/i);
      if(m) return Number(m[1]);
    }catch(e){}
    return 1;
  }

  function findEntryCard(){
    return document.getElementById('entry-quality-card') ||
           document.getElementById('entryQualityCard') ||
           document.querySelector('.entry-quality-card') ||
           document.querySelector('[class*="entry"][class*="quality"]') ||
           findByText(['entry quality','no entry','strong entry']);
  }

  function findByText(words){
    var nodes = Array.prototype.slice.call(document.querySelectorAll('div,section,article'));
    for(var i=0;i<nodes.length;i++){
      var t = (nodes[i].textContent || '').toLowerCase();
      for(var j=0;j<words.length;j++){
        if(t.indexOf(words[j]) >= 0 && nodes[i].getBoundingClientRect().width > 200){
          var cur = nodes[i];
          for(var k=0;k<6 && cur;k++,cur=cur.parentElement){
            var r = cur.getBoundingClientRect ? cur.getBoundingClientRect() : {width:0,height:0};
            if(r.width > 250 && r.height > 30 && (cur.className || cur.id)) return cur;
          }
          return nodes[i];
        }
      }
    }
    return null;
  }

  function activeEntryDecision(){
    var fc = getForecast();
    var asset = getAsset();
    var th = thresholds();

    var prob = n(fc.probability ?? fc.upwardProbability ?? fc.prob ?? 50, 50);
    var conf = n(fc.confidence ?? 50, 50);
    var early = getEarlyScore(asset);
    var deriv = getDerivScore(asset);
    var vol = getVolumeBoost();

    // Read visible values if forecast object is missing.
    try{
      var visible = document.body.textContent || '';
      var pm = visible.match(/UPWARD\s+PROB\s*([0-9]{1,3})%/i);
      if(pm) prob = Number(pm[1]);
      var cm = visible.match(/CONFIDENCE\s*([0-9]{1,3})%/i);
      if(cm) conf = Number(cm[1]);
      var em = visible.match(/Early\s+([0-9]{1,3})/i);
      if(em) early = Number(em[1]);
    }catch(e){}

    // SAFE stays strict.
    if(!isActive()){
      return {status:null, prob:prob, conf:conf, early:early, vol:vol, deriv:deriv};
    }

    var action = String(fc.action || fc.signal || '').toLowerCase();
    var text = '';
    try{ text = (document.body.textContent || '').toLowerCase(); }catch(e){}

    // If local engine holds probability at 50 but momentum is very strong,
    // Active Mode should show early/speculative entry instead of NO ENTRY.
    var bullClues = 0;
    var bearClues = 0;

    if(prob >= 54) bullClues += 2;
    if(prob <= 46) bearClues += 2;

    if(conf >= th.minConfidence) { bullClues += 1; bearClues += 1; }
    if(early >= 80) bullClues += 3;
    else if(early >= 60) bullClues += 2;

    if(vol >= 1.5) bullClues += 2;
    else if(vol >= 0.8) bullClues += 1;

    if(deriv >= 5) bullClues += 1;
    if(deriv <= -5) bearClues += 1;

    if(text.indexOf('ema9 above ema21') >= 0 || text.indexOf('ema9 > ema21') >= 0) bullClues += 2;
    if(text.indexOf('price above ema50') >= 0) bullClues += 1;
    if(text.indexOf('higher lows') >= 0) bullClues += 1;
    if(text.indexOf('fresh selloff') >= 0 || text.indexOf('red candle series') >= 0) bearClues += 2;
    if(text.indexOf('ema9 below ema21') >= 0 || text.indexOf('price below ema') >= 0) bearClues += 2;

    var edge = Math.abs(bullClues - bearClues);

    if(bullClues >= 6 && edge >= 2 && conf >= th.minConfidence && early >= 60 && vol >= 0.75){
      return {
        status:'EARLY ENTRY',
        side:'BUY',
        className:'active-entry-buy',
        title:'EARLY ENTRY',
        line:'Active Mode: early BUY setup. Momentum is strong, but confirmation is still required.',
        detail:'P '+prob+'% • C '+conf+'% • Vol x'+vol.toFixed(2)+' • Early '+early+' • Active edge '+edge,
        prob:prob, conf:conf, early:early, vol:vol, deriv:deriv
      };
    }

    if(bearClues >= 6 && edge >= 2 && conf >= th.minConfidence && early >= 60){
      return {
        status:'EARLY SHORT',
        side:'SELL',
        className:'active-entry-sell',
        title:'EARLY SHORT',
        line:'Active Mode: early SELL setup. Downside pressure is strong, but confirmation is still required.',
        detail:'P '+prob+'% • C '+conf+'% • Vol x'+vol.toFixed(2)+' • Early '+early+' • Active edge '+edge,
        prob:prob, conf:conf, early:early, vol:vol, deriv:deriv
      };
    }

    return {status:null, prob:prob, conf:conf, early:early, vol:vol, deriv:deriv};
  }

  function patchEntryCard(){
    var decision = activeEntryDecision();
    if(!decision || !decision.status) return;

    var card = findEntryCard();
    if(!card) return;

    card.setAttribute('data-zynqel-active-entry','1');
    card.classList.add('zynqel-active-entry-card');
    if(decision.className) card.classList.add(decision.className);

    // Preserve the original card styling but replace only its content.
    card.innerHTML =
      '<div class="section-title"><span></span>ENTRY QUALITY</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-top:8px;">' +
        '<div style="width:18px;height:18px;border-radius:50%;background:#f59e0b;box-shadow:0 0 18px rgba(245,158,11,.45);"></div>' +
        '<div style="font-size:26px;font-weight:900;color:#f59e0b;">'+decision.status+'</div>' +
      '</div>' +
      '<div style="margin-top:6px;font-weight:700;color:#fff;">'+decision.line+'</div>' +
      '<div style="margin-top:6px;color:var(--muted);font-size:12px;">'+decision.detail+'</div>';

    // Also update action text only if it still says WAIT and active conditions are strong.
    try{
      var actionCards = Array.prototype.slice.call(document.querySelectorAll('div,section,article'));
      for(var i=0;i<actionCards.length;i++){
        var t = (actionCards[i].textContent || '').toLowerCase();
        if((t.indexOf('my action') >= 0 || t.indexOf('i would wait') >= 0) && t.indexOf('wait') >= 0){
          var h = actionCards[i].querySelector('h1,h2,h3,.big,.headline,[class*="title"]');
          if(h && /wait/i.test(h.textContent || '')){
            h.textContent = decision.side === 'BUY' ? 'I would prepare for early BUY' : 'I would prepare for early SELL';
          }
          break;
        }
      }
    }catch(e){}
  }

  window.zynqelActiveEntryDecision = activeEntryDecision;
  window.zynqelPatchEntryQualityByMode = patchEntryCard;

  function runSoon(){
    setTimeout(patchEntryCard, 50);
    setTimeout(patchEntryCard, 250);
    setTimeout(patchEntryCard, 900);
  }

  document.addEventListener('DOMContentLoaded', runSoon);
  window.addEventListener('load', runSoon);
  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t) return;
    var tx = (t.textContent || '').toLowerCase();
    if(tx.indexOf('active') >= 0 || tx.indexOf('safe') >= 0 || tx.indexOf('analysis') >= 0){
      runSoon();
    }
  });

  setInterval(function(){
    if(isActive()) patchEntryCard();
  }, 1000);

  console.log('✅ ZYNQEL Active Entry Quality Real Signal Fix enabled');
})();

