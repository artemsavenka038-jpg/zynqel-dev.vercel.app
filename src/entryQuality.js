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

    // Safe / Active entry thresholds.
    // Safe remains strict. Active can show WATCH/EARLY ENTRY when candles are strong
    // even if the local engine keeps probability around 50%.
    var activeMode = false;
    try{
      activeMode = typeof window.zynqelGetTradeMode === 'function'
        ? window.zynqelGetTradeMode() === 'active'
        : localStorage.getItem('zynqel_trade_mode') === 'active';
    }catch(e){ activeMode = false; }

    var buyStrict =
      fc.probability >= 65 &&
      fc.confidence >= 65 &&
      bullishStructure &&
      volumeBoost >= 1 &&
      earlyScore >= 60;

    var sellStrict =
      fc.probability <= 35 &&
      fc.confidence >= 60 &&
      bearishStructure &&
      (orderBook === null || orderBook < 0) &&
      (taker === null || taker < 1);

    var buyActive =
      activeMode &&
      fc.probability >= 45 &&
      fc.confidence >= 56 &&
      bullishStructure &&
      earlyScore >= 70 &&
      !(derivScore <= -8);

    var sellActive =
      activeMode &&
      fc.probability <= 55 &&
      fc.confidence >= 56 &&
      bearishStructure &&
      earlyScore >= 70 &&
      !(derivScore >= 8);

    var buyValid = buyStrict || buyActive;
    var sellValid = sellStrict || sellActive;

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
      if(activeMode && !buyStrict){
        state = volumeBoost >= 0.75 ? 'EARLY ENTRY' : 'WATCH ENTRY';
        color = 'var(--gold)';
        emoji = '🟡';
        reasons.push(ru()
          ? 'ACTIVE: ранний BUY-сетап есть, но вход только после подтверждения свечой/объёмом'
          : 'ACTIVE: early BUY setup exists, but enter only after candle/volume confirmation');
        if(volumeBoost < 0.75) reasons.push(ru() ? 'Объём пока слабый — это зона наблюдения, не готовый вход' : 'Volume is still weak — this is a watch setup, not a confirmed entry');
      }else if(extended){
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
      if(activeMode && !sellStrict){
        state = volumeBoost >= 0.75 ? 'EARLY SHORT' : 'WATCH SHORT';
        color = 'var(--gold)';
        emoji = '🟡';
        reasons.push(ru()
          ? 'ACTIVE: ранний SELL-сетап есть, но вход только после подтверждения свечой/объёмом'
          : 'ACTIVE: early SELL setup exists, but enter only after candle/volume confirmation');
      }else if(extended){
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
