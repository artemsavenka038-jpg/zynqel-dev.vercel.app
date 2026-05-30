// ZYNQEL analysis/marketRisk.js
// Extracted from original analysis.js. Classic global script, not module.

// ---- extracted inline script block 27 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL MARKET RISK EARLY WARNING LAYER
// Adds predictive risk warnings BEFORE the move is fully priced.
// Non-conflict design: it does not replace the engine.
// It only adds risk context and can downgrade risky BUY to WAIT when risk-off is strong.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_MARKET_RISK = {
    enabled: true,
    blockBuyRiskScore: 65,
    warnRiskScore: 50,
    strongRiskScore: 75
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
  function ld(id){
    return window.liveData && window.liveData[id] ? window.liveData[id] : {};
  }
  function ch(id){
    return num(ld(id).change24h, 0);
  }
  function price(id){
    return num(ld(id).price, null);
  }
  function riskData(id){
    return window.marketRiskData && window.marketRiskData[id] ? window.marketRiskData[id] : {};
  }
  function newsText(){
    try{
      return (window.allNews || []).slice(0,12).map(function(n){
        return ((n.title || '') + ' ' + (n.summary || '')).toLowerCase();
      }).join(' ');
    }catch(e){ return ''; }
  }

  window.zynqelMarketRiskEarlyWarning = function(asset){
    var c = cfg(asset);
    var risk = 0;
    var support = 0;
    var reasons = [];
    var positive = [];

    var dxy = ch('DXY');
    var spx = ch('SPX');
    var ndx = ch('NDX');
    var btc = ch('BTC');
    var eth = ch('ETH');
    var xau = ch('XAU');
    var xag = ch('XAG');
    var oil = num(riskData('OIL').change24h, 0);
    var vix = num(riskData('VIX').change24h, 0);
    var us10y = num(riskData('US10Y').change24h, 0);
    var txt = newsText();

    // Risk-off signals
    if(dxy > 0.35){ risk += 12; reasons.push('DXY rising'); }
    if(dxy > 0.70){ risk += 8; reasons.push('DXY strong spike'); }

    if(vix > 5){ risk += 14; reasons.push('VIX rising'); }
    if(vix > 10){ risk += 10; reasons.push('VIX shock'); }

    if(spx < -0.7){ risk += 10; reasons.push('SPX weak'); }
    if(ndx < -0.9){ risk += 12; reasons.push('NDX weak'); }

    if(btc < -1.5){ risk += 10; reasons.push('BTC weakness'); }
    if(eth < -1.5){ risk += 8; reasons.push('ETH weakness'); }

    if(us10y > 2){ risk += 8; reasons.push('US10Y rising'); }
    if(oil < -3){ risk += 7; reasons.push('Oil sharp drop / demand risk'); }

    // News/macro words. Only risk context, not direct trading signal.
    if(/fed|fomc|powell|rate hike|higher for longer|cpi|inflation|pce|nfp|jobs/.test(txt)){
      risk += 8; reasons.push('Fed/inflation event risk');
    }
    if(/war|attack|tariff|sanction|default|liquidation|hack|sec lawsuit|regulation/.test(txt)){
      risk += 8; reasons.push('headline risk');
    }

    // Supportive / risk-on signals
    if(dxy < -0.35){ support += 10; positive.push('DXY falling'); }
    if(vix < -5){ support += 10; positive.push('VIX falling'); }
    if(spx > 0.7){ support += 8; positive.push('SPX strong'); }
    if(ndx > 0.9){ support += 8; positive.push('NDX strong'); }
    if(btc > 1.5){ support += 8; positive.push('BTC strong'); }
    if(eth > 1.5){ support += 6; positive.push('ETH strong'); }

    // Asset sensitivity
    if(c.category === 'crypto'){
      if(dxy > 0.35 || vix > 5 || ndx < -0.9){ risk += 8; reasons.push('crypto sensitive to risk-off'); }
      if(btc > 1.5 && eth > 1.0){ support += 8; positive.push('crypto majors supportive'); }
    }
    if(c.category === 'metals'){
      if(asset === 'XAG' && oil < -3){ risk += 8; reasons.push('silver industrial demand risk'); }
      if(dxy > 0.35 || us10y > 2){ risk += 8; reasons.push('metals pressured by USD/yields'); }
      if(xau > 0.6 && xag > 0.6){ support += 8; positive.push('metals complex strong'); }
    }
    if(c.category === 'indices'){
      if(vix > 5 || us10y > 2 || dxy > 0.35){ risk += 10; reasons.push('equity macro pressure'); }
    }
    if(c.category === 'forex'){
      if(asset !== 'DXY' && dxy > 0.35){ risk += 8; reasons.push('USD strength pressures pair'); }
    }

    var net = Math.max(0, Math.min(100, risk - support + 35));
    var level = net >= 75 ? 'HIGH' : net >= 55 ? 'MEDIUM' : net >= 40 ? 'LOW' : 'CALM';

    var message;
    if(ru()){
      message = level === 'HIGH'
        ? 'Высокий риск резкого движения. Лонги лучше не открывать без подтверждения.'
        : level === 'MEDIUM'
          ? 'Риск повышен. Нужны подтверждение уровня и объёма.'
          : level === 'LOW'
            ? 'Есть умеренные риски, но паники нет.'
            : 'Рынок спокойный, явного внешнего давления нет.';
    } else {
      message = level === 'HIGH'
        ? 'High risk of sharp move. Longs should be avoided without confirmation.'
        : level === 'MEDIUM'
          ? 'Risk is elevated. Level and volume confirmation required.'
          : level === 'LOW'
            ? 'Some risk exists, but no panic signal.'
            : 'Market is calm, no clear external pressure.';
    }

    return {
      enabled:true,
      asset:asset,
      category:c.category,
      score:Math.round(net),
      level:level,
      message:message,
      riskReasons:reasons.slice(0,7),
      supportiveReasons:positive.slice(0,5),
      snapshot:{
        dxy:dxy, vix:vix, spx:spx, ndx:ndx, btc:btc, eth:eth,
        oil:oil, us10y:us10y, xau:xau, xag:xag
      }
    };
  };

  function applyMarketRisk(asset, forecast){
    if(!window.ZYNQEL_MARKET_RISK.enabled || !forecast) return forecast;

    var r = window.zynqelMarketRiskEarlyWarning(asset);
    forecast.marketRisk = r;
    forecast.factors = forecast.factors || [];
    forecast.factors.unshift('Market risk: '+r.level+' '+r.score+'/100');

    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
    var riskLine = ru()
      ? ('Market Risk: '+r.level+' '+r.score+'/100. '+r.message+' Причины: '+(r.riskReasons.join('; ') || 'нет сильных внешних рисков')+'.')
      : ('Market Risk: '+r.level+' '+r.score+'/100. '+r.message+' Reasons: '+(r.riskReasons.join('; ') || 'no major external risks')+'.');
    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(riskLine);

    // Non-conflict rule:
    // Do not turn WAIT into SELL/BUY here.
    // Only downgrade BUY if broad risk is clearly against longs.
    var action = String(forecast.action || '').toLowerCase();
    if(action === 'buy' && r.score >= window.ZYNQEL_MARKET_RISK.blockBuyRiskScore){
      forecast.preMarketRiskAction = 'buy';
      forecast.action = 'wait';
      forecast.sentiment = 'neutral';
      forecast.confidence = Math.max(45, Math.min(num(forecast.confidence, 60) - 12, 64));
      forecast.probability = Math.min(num(forecast.probability, 50), 55);
      forecast.upwardProbability = forecast.probability;
      forecast.waitFor = ru()
        ? 'Market Risk высокий: дождаться стабилизации DXY/VIX/индексов и подтверждения объёма'
        : 'Market Risk is high: wait for DXY/VIX/indices stabilization and volume confirmation';
      forecast.entry = ru()
        ? 'Лонг заблокирован risk-off фильтром'
        : 'Long blocked by risk-off filter';
      forecast.entryZone = forecast.entry;
      forecast.zone = forecast.entry;
      forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
        ? 'BUY заблокирован ранним risk-warning слоем, чтобы не покупать перед возможным обвалом.'
        : 'BUY blocked by early risk-warning layer to avoid buying before possible selloff.');
      forecast.source = (forecast.source || 'V7') + ' + MARKET RISK';
    }

    return forecast;
  }

  window.zynqelApplyMarketRiskWarning = applyMarketRisk;

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__marketRiskWarning){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var out = await oldGenerate.apply(this, arguments);
      try{ out = applyMarketRisk(assetId, out); }catch(e){ console.warn('Market risk warning failed:', e.message); }
      return out;
    };
    window.generateForecast.__marketRiskWarning = true;
  }

  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__marketRiskWarning){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = applyMarketRisk(assetId, out); }catch(e){ console.warn('Market risk after normalize failed:', e.message); }
      return out;
    };
    window.normalizeForecast.__marketRiskWarning = true;
  }

  // Optional visible warning card inside AI reasoning section, without breaking old layout.
  function injectRiskCard(){
    try{
      var page = document.getElementById('page-analysis');
      if(page && !page.classList.contains('active')) return;
      var asset = window.currentAnalysisAsset || window.currentAsset;
      if(!asset || typeof window.zynqelMarketRiskEarlyWarning !== 'function') return;
      var r = window.zynqelMarketRiskEarlyWarning(asset);
      var root = document.getElementById('analysis-content');
      if(!root) return;

      var old = document.getElementById('zynqel-market-risk-card');
      if(old && old.parentNode) old.parentNode.removeChild(old);

      var color = r.level === 'HIGH' ? 'var(--red)' : r.level === 'MEDIUM' ? 'var(--gold)' : 'var(--green)';
      var reasons = (r.riskReasons || []).slice(0,4).join(' • ') || (ru() ? 'нет сильных внешних рисков' : 'no major external risks');
      var title = ru() ? 'РАННИЙ РИСК РЫНКА' : 'EARLY MARKET RISK';
      var html = '<div id="zynqel-market-risk-card" class="card" style="margin-bottom:12px;border-color:'+color+'33;background:rgba(255,255,255,.025);">' +
        '<div class="card-title" style="margin-bottom:8px;">'+title+'</div>' +
        '<div style="font-family:JetBrains Mono,monospace;font-size:24px;font-weight:800;color:'+color+';">'+r.level+' '+r.score+'/100</div>' +
        '<div style="font-size:13px;color:var(--text);margin-top:6px;line-height:1.45;">'+r.message+'</div>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.45;">'+reasons+'</div>' +
      '</div>';

      var firstCard = root.querySelector('.card');
      if(firstCard) firstCard.insertAdjacentHTML('beforebegin', html);
      else root.insertAdjacentHTML('afterbegin', html);
    }catch(e){}
  }

  setInterval(injectRiskCard, 2000);
})();


// ---- extracted inline script block 31 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL NO-FLICKER ICONS / CARDS FIX
// Fixes jumping icons/cards by stopping remove/recreate loops.
// Diagnostic only. Does NOT change BUY/SELL/WAIT logic.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_NO_FLICKER_UI = {
    enabled: true,
    lastStableHtml: '',
    lastDataHealthHtml: '',
    lastRender: 0
  };

  function getAnalysisRoot(){
    return document.getElementById('analysis-content') || document.getElementById('page-analysis');
  }

  function isAnalysisActive(){
    var page = document.getElementById('page-analysis');
    return !page || page.classList.contains('active');
  }

  // Stop old visual flicker sources by neutralizing their interval-rendered injectors.
  // We do NOT touch forecast/data functions, only the old card insertion functions if present.
  try{
    window.injectRiskCard = function(){};
    window.injectEarlyCard = function(){};
    window.injectDerivativesCard = function(){};
  }catch(e){}

  function removeDuplicatesKeepOne(id){
    var list = Array.from(document.querySelectorAll('#'+id));
    if(list.length <= 1) return list[0] || null;
    var first = list[0];
    list.slice(1).forEach(function(el){ if(el && el.parentNode) el.parentNode.removeChild(el); });
    return first;
  }

  function ensureStableContainer(){
    var root = getAnalysisRoot();
    if(!root) return null;

    var container = document.getElementById('zynqel-stable-top-panels');
    if(!container){
      container = document.createElement('div');
      container.id = 'zynqel-stable-top-panels';
      container.style.marginBottom = '12px';

      var badge = document.getElementById('zynqel-single-engine-badge') || document.getElementById('zynqel-v7-locked-header');
      if(badge && badge.parentNode){
        badge.insertAdjacentElement('afterend', container);
      }else{
        root.insertAdjacentElement('afterbegin', container);
      }
    }
    return container;
  }

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function ru(){ return window.appLang === 'ru'; }
  function currentAsset(){ return window.currentAnalysisAsset || window.currentAsset || 'BTC'; }

  function colorBy(value, direction){
    var v = String(value || '').toUpperCase();
    var d = String(direction || '').toLowerCase();
    if(v === 'HIGH' || d.indexOf('bear') >= 0) return 'var(--red)';
    if(d.indexOf('bull') >= 0) return 'var(--green)';
    if(v === 'MEDIUM') return 'var(--gold)';
    return 'var(--green)';
  }

  function miniCard(id, title, value, message, reasons, color){
    return '<div id="'+id+'" style="min-width:230px;flex:1;border:1px solid '+color+'55;border-radius:14px;background:rgba(255,255,255,.028);padding:14px 16px;box-sizing:border-box;min-height:126px;overflow:hidden;">' +
      '<div style="font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">'+esc(title)+'</div>' +
      '<div style="font-family:JetBrains Mono,monospace;font-size:22px;font-weight:900;color:'+color+';line-height:1.05;margin-bottom:8px;">'+esc(value)+'</div>' +
      '<div style="font-size:13px;color:var(--text);line-height:1.35;max-height:38px;overflow:hidden;">'+esc(message)+'</div>' +
      '<div style="font-size:11px;color:var(--muted);line-height:1.35;margin-top:8px;max-height:32px;overflow:hidden;">'+esc(reasons || '')+'</div>' +
    '</div>';
  }

  function buildRiskPanelsHtml(){
    var asset = currentAsset();
    var cards = [];

    try{
      var m = typeof window.zynqelMarketRiskEarlyWarning === 'function' ? window.zynqelMarketRiskEarlyWarning(asset) : null;
      if(m){
        cards.push(miniCard(
          'zynqel-stable-market-risk',
          ru() ? 'РАННИЙ РИСК РЫНКА' : 'EARLY MARKET RISK',
          (m.level || 'LOW') + ' ' + (m.score == null ? '--' : m.score) + '/100',
          m.message || '',
          (m.riskReasons || []).slice(0,4).join(' • '),
          colorBy(m.level, '')
        ));
      }
    }catch(e){}

    try{
      var e = typeof window.zynqelEarlyMoveWarning === 'function' ? window.zynqelEarlyMoveWarning(asset) : null;
      if(e && e.ready){
        cards.push(miniCard(
          'zynqel-stable-early-move',
          ru() ? 'РАННЕЕ ПРЕДУПРЕЖДЕНИЕ ДВИЖЕНИЯ' : 'EARLY MOVE WARNING',
          (e.level || 'LOW') + ' ' + (e.score == null ? '--' : e.score) + '/100',
          e.message || '',
          (e.reasons || []).slice(0,4).join(' • '),
          colorBy(e.level, e.direction)
        ));
      }else{
        cards.push(miniCard(
          'zynqel-stable-early-move',
          ru() ? 'РАННЕЕ ПРЕДУПРЕЖДЕНИЕ ДВИЖЕНИЯ' : 'EARLY MOVE WARNING',
          'LOADING',
          ru() ? 'Данные загружаются.' : 'Data is loading.',
          '',
          'var(--gold)'
        ));
      }
    }catch(e){}

    try{
      var d = typeof window.zynqelDerivativesSignal === 'function' ? window.zynqelDerivativesSignal(asset) : null;
      if(d && d.ready){
        cards.push(miniCard(
          'zynqel-stable-derivatives',
          ru() ? 'ДЕРИВАТИВЫ / СТРУКТУРА РЫНКА' : 'DERIVATIVES / MARKET STRUCTURE',
          String(d.direction || 'neutral').toUpperCase() + ' ' + (d.score == null ? '--' : d.score),
          ru() ? 'Open Interest / Funding / Order Book / BTC dominance' : 'Open Interest / Funding / Order Book / BTC dominance',
          (d.reasons || []).slice(0,4).join(' • ') || (ru() ? 'нет сильного сигнала' : 'no strong signal'),
          colorBy('', d.direction)
        ));
      }else{
        cards.push(miniCard(
          'zynqel-stable-derivatives',
          ru() ? 'ДЕРИВАТИВЫ / СТРУКТУРА РЫНКА' : 'DERIVATIVES / MARKET STRUCTURE',
          'LOADING',
          ru() ? 'Данные загружаются.' : 'Data is loading.',
          '',
          'var(--gold)'
        ));
      }
    }catch(e){}

    return '<div id="zynqel-stable-risk-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">'+cards.join('')+'</div>';
  }

  function renderRiskPanelsStable(){
    if(!isAnalysisActive()) return;
    var container = ensureStableContainer();
    if(!container) return;

    // Remove old flickering cards if older scripts recreated them.
    ['zynqel-market-risk-card','zynqel-early-move-card','zynqel-derivatives-card'].forEach(function(id){
      document.querySelectorAll('#'+id).forEach(function(el){
        if(el && el.parentNode) el.parentNode.removeChild(el);
      });
    });

    var html = buildRiskPanelsHtml();
    if(window.ZYNQEL_NO_FLICKER_UI.lastStableHtml !== html){
      var row = document.getElementById('zynqel-stable-risk-row');
      if(row){
        row.outerHTML = html;
      }else{
        container.insertAdjacentHTML('afterbegin', html);
      }
      window.ZYNQEL_NO_FLICKER_UI.lastStableHtml = html;
    }
  }

  // Patch Data Health render to no-flicker: old script removes/recreates.
  // Here we keep one card and only update if HTML actually changed.
  function stableDataHealth(){
    if(!isAnalysisActive()) return;
    if(typeof window.zynqelBuildDataHealth !== 'function') return;

    var root = getAnalysisRoot();
    var container = ensureStableContainer();
    if(!root || !container) return;

    // Remove duplicates from older renderer but keep latest when possible.
    var oldList = Array.from(document.querySelectorAll('#zynqel-data-health-dashboard'));
    oldList.forEach(function(el){ if(el && el.parentNode) el.parentNode.removeChild(el); });

    var h = window.zynqelBuildDataHealth(currentAsset());
    var color = h.score >= 85 ? 'var(--green)' : h.score >= 70 ? 'var(--gold)' : 'var(--red)';
    var missingText = h.missing && h.missing.length ? h.missing.slice(0,8).join(' • ') : (ru() ? 'Пустых факторов не найдено' : 'No missing factors detected');

    function groupChecks(checks){
      var map = {};
      (checks || []).forEach(function(c){
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

    var groups = groupChecks(h.checks);
    var groupHtml = Object.keys(groups).map(function(group){
      return '<div style="margin-top:10px;">' +
        '<div style="font-size:10px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px;font-family:JetBrains Mono,monospace;">'+esc(group)+'</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">'+groups[group].map(pill).join('')+'</div>' +
      '</div>';
    }).join('');

    var title = ru() ? 'V7 ДИАГНОСТИКА ДАННЫХ' : 'V7 DATA HEALTH';
    var qualityLabel = ru() ? 'Качество прогноза' : 'Forecast quality';
    var completeness = ru() ? 'Полнота анализа' : 'Analysis completeness';
    var missingLabel = ru() ? 'Пустые / недоступные факторы' : 'Missing / unavailable factors';

    var html =
      '<div id="zynqel-data-health-dashboard" class="card" style="margin-bottom:12px;border-color:'+color+'55;background:rgba(255,255,255,.025);">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
          '<div><div class="card-title" style="margin-bottom:8px;">'+title+'</div>' +
          '<div style="font-size:12px;color:var(--muted);font-family:JetBrains Mono,monospace;">'+esc(h.asset)+' • '+completeness+'</div></div>' +
          '<div style="text-align:right;"><div style="font-family:JetBrains Mono,monospace;font-size:28px;font-weight:900;color:'+color+';">'+h.score+'%</div>' +
          '<div style="font-family:JetBrains Mono,monospace;font-size:12px;color:var(--text);">'+qualityLabel+': '+h.quality+'</div></div>' +
        '</div>' +
        '<div style="margin-top:10px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:rgba(0,0,0,.16);font-size:11px;color:var(--muted);line-height:1.45;">' +
          '<b style="color:var(--text);">'+missingLabel+':</b> '+esc(missingText) +
        '</div>' +
        groupHtml +
      '</div>';

    if(window.ZYNQEL_NO_FLICKER_UI.lastDataHealthHtml !== html){
      var existing = document.getElementById('zynqel-data-health-dashboard');
      if(existing) existing.outerHTML = html;
      else container.insertAdjacentHTML('beforeend', html);
      window.ZYNQEL_NO_FLICKER_UI.lastDataHealthHtml = html;
    }
  }

  window.zynqelRenderStableTopPanels = function(){
    renderRiskPanelsStable();
    stableDataHealth();
  };

  // Override old data health renderer to use stable one.
  window.zynqelRenderDataHealth = stableDataHealth;

  setInterval(window.zynqelRenderStableTopPanels, 1800);
  setTimeout(window.zynqelRenderStableTopPanels, 500);
  setTimeout(window.zynqelRenderStableTopPanels, 1800);
})();


// ---- extracted inline script block 36 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL EARLY ENTRY BREAKOUT LAYER
// Adds cautious Early BUY / Early SELL before full confirmation.
// Does NOT replace V7. It only upgrades WAIT when strong early impulse conditions align.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_EARLY_ENTRY = {
    enabled: true,
    minScore: 78,
    minVolumeBoost: 1.12,
    maxAgainstDerivatives: -10
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ru(){ return window.appLang === 'ru'; }
  function asset(){ return window.currentAnalysisAsset || window.currentAsset || 'BTC'; }
  function frames(id){ return window.z4CandleFrames && window.z4CandleFrames[id] ? window.z4CandleFrames[id] : {}; }
  function candles(id){
    var f = frames(id);
    if(f['15m'] && f['15m'].length >= 30) return f['15m'];
    if(f['1h'] && f['1h'].length >= 30) return f['1h'];
    if(window.candleData && window.candleData[id] && window.candleData[id].length >= 30) return window.candleData[id];
    return [];
  }
  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2/(period+1);
    var prev = values.slice(0,period).reduce(function(s,x){return s+x;},0)/period;
    for(var i=period;i<values.length;i++) prev = values[i]*k + prev*(1-k);
    return prev;
  }
  function avg(a){ return a && a.length ? a.reduce(function(s,x){return s+x;},0)/a.length : 0; }
  function pct(a,b){ return b ? ((a-b)/b*100) : 0; }

  function localEarlyEntrySignal(id){
    var cs = candles(id);
    if(cs.length < 30) return {ready:false, direction:'wait', score:0, reasons:['no candles']};

    var closes = cs.map(function(c){return num(c.c,0);}).filter(function(v){return v>0;});
    var vols = cs.map(function(c){return num(c.v,0);});
    var last = cs[cs.length-1];
    var prev = cs[cs.length-2] || last;
    var latest = num(last.c,0);
    var e9 = ema(closes,9), e21 = ema(closes,21), e50 = ema(closes,50);

    var recent = cs.slice(-8);
    var prevRecent = cs.slice(-18,-8);
    var recentVol = avg(vols.slice(-4).filter(function(v){return v>0;}));
    var baseVol = avg(vols.slice(-22,-4).filter(function(v){return v>0;}));
    var volBoost = baseVol > 0 ? recentVol / baseVol : 0;

    var highs = recent.map(function(c){return num(c.h,0);});
    var lows = recent.map(function(c){return num(c.l,0);});
    var prevHighs = prevRecent.map(function(c){return num(c.h,0);});
    var prevLows = prevRecent.map(function(c){return num(c.l,0);});

    var recentHigh = Math.max.apply(null, highs);
    var recentLow = Math.min.apply(null, lows);
    var prevHigh = Math.max.apply(null, prevHighs);
    var prevLow = Math.min.apply(null, prevLows);

    var green = recent.filter(function(c){return num(c.c,0) > num(c.o,0);}).length;
    var red = recent.filter(function(c){return num(c.c,0) < num(c.o,0);}).length;

    var deriv = typeof window.zynqelDerivativesSignal === 'function' ? window.zynqelDerivativesSignal(id) : null;
    var early = typeof window.zynqelEarlyMoveWarning === 'function' ? window.zynqelEarlyMoveWarning(id) : null;
    var market = typeof window.zynqelMarketRiskEarlyWarning === 'function' ? window.zynqelMarketRiskEarlyWarning(id) : null;

    var bull = 0, bear = 0, br = [], sr = [];

    if(e9 && latest > e9){ bull += 14; br.push('price above EMA9'); }
    if(e21 && latest > e21){ bull += 12; br.push('price above EMA21'); }
    if(e50 && latest > e50){ bull += 10; br.push('price above EMA50'); }
    if(e9 && e21 && e9 > e21){ bull += 12; br.push('EMA9 above EMA21'); }
    if(recentHigh > prevHigh){ bull += 10; br.push('breakout pressure'); }
    if(recentLow > prevLow){ bull += 8; br.push('higher lows'); }
    if(green >= 5){ bull += 8; br.push('green candle pressure'); }
    if(volBoost >= window.ZYNQEL_EARLY_ENTRY.minVolumeBoost){ bull += 12; br.push('volume expanding'); }
    if(pct(latest, prev.c) > 0.18){ bull += 7; br.push('fresh impulse'); }
    if(early && early.direction === 'bullish_setup'){ bull += Math.min(18, Math.round((early.score || 0)/6)); br.push('early move bullish'); }
    if(deriv && deriv.score > 4){ bull += Math.min(12, deriv.score); br.push('derivatives supportive'); }

    if(e9 && latest < e9){ bear += 14; sr.push('price below EMA9'); }
    if(e21 && latest < e21){ bear += 12; sr.push('price below EMA21'); }
    if(e50 && latest < e50){ bear += 10; sr.push('price below EMA50'); }
    if(e9 && e21 && e9 < e21){ bear += 12; sr.push('EMA9 below EMA21'); }
    if(recentLow < prevLow){ bear += 10; sr.push('breakdown pressure'); }
    if(recentHigh < prevHigh){ bear += 8; sr.push('lower highs'); }
    if(red >= 5){ bear += 8; sr.push('red candle pressure'); }
    if(volBoost >= window.ZYNQEL_EARLY_ENTRY.minVolumeBoost){ bear += 12; sr.push('volume expanding'); }
    if(pct(latest, prev.c) < -0.18){ bear += 7; sr.push('fresh sell impulse'); }
    if(early && early.direction === 'bearish_risk'){ bear += Math.min(18, Math.round((early.score || 0)/6)); sr.push('early move bearish'); }
    if(deriv && deriv.score < -4){ bear += Math.min(12, Math.abs(deriv.score)); sr.push('derivatives bearish'); }
    if(market && market.score >= 75){ bear += 8; sr.push('market risk high'); }

    var direction = 'wait';
    var score = 0;
    var reasons = [];
    if(bull >= bear + 18){
      direction = 'early_buy';
      score = Math.min(100, 35 + bull - Math.round(bear*0.4));
      reasons = br.slice(0,6);
    }else if(bear >= bull + 18){
      direction = 'early_sell';
      score = Math.min(100, 35 + bear - Math.round(bull*0.4));
      reasons = sr.slice(0,6);
    }else{
      direction = 'wait';
      score = Math.max(35, Math.min(65, 45 + Math.abs(bull-bear)));
      reasons = ['mixed early entry conditions'];
    }

    var buyZoneLow = Math.min(latest, e9 || latest);
    var buyZoneHigh = Math.max(latest, recentHigh);
    var sellZoneHigh = Math.max(latest, e9 || latest);
    var sellZoneLow = Math.min(latest, recentLow);

    return {
      ready:true,
      direction:direction,
      score:Math.round(score),
      bullScore:bull,
      bearScore:bear,
      reasons:reasons,
      latest:latest,
      volumeBoost:volBoost,
      entryBuyLow:buyZoneLow,
      entryBuyHigh:buyZoneHigh,
      entrySellLow:sellZoneLow,
      entrySellHigh:sellZoneHigh,
      invalidBuy: recentLow,
      invalidSell: recentHigh,
      firstBuyTarget: latest + (recentHigh-recentLow)*0.55,
      firstSellTarget: latest - (recentHigh-recentLow)*0.55
    };
  }

  function applyEarlyEntry(id, forecast){
    if(!window.ZYNQEL_EARLY_ENTRY.enabled || !forecast) return forecast;

    var sig = localEarlyEntrySignal(id);
    forecast.earlyEntrySignal = sig;
    forecast.factors = forecast.factors || [];
    forecast.factors.unshift('Early Entry: '+sig.direction+' '+sig.score+'/100');

    if(!sig.ready || sig.score < window.ZYNQEL_EARLY_ENTRY.minScore) return forecast;

    var action = String(forecast.action || 'wait').toLowerCase();
    var conf = num(forecast.confidence, 50);

    // Only upgrade WAIT/NEUTRAL, do not override strong opposite signals.
    if(action === 'wait' || action === 'neutral' || conf < 60){
      if(sig.direction === 'early_buy'){
        forecast.preEarlyEntryAction = forecast.action || 'wait';
        forecast.action = 'buy';
        forecast.sentiment = 'bullish';
        forecast.isEarlyEntry = true;
        forecast.confidence = Math.max(conf, Math.min(76, sig.score - 8));
        forecast.probability = Math.max(num(forecast.probability,50), Math.min(72, sig.score - 10));
        forecast.upwardProbability = forecast.probability;
        forecast.entry = ru()
          ? 'Ранний вход при удержании импульса'
          : 'Early entry if impulse holds';
        forecast.entryZone = '$' + sig.entryBuyLow.toFixed(4) + ' - $' + sig.entryBuyHigh.toFixed(4);
        forecast.zone = forecast.entryZone;
        forecast.stopLoss = sig.invalidBuy;
        forecast.firstTarget = sig.firstBuyTarget;
        forecast.waitFor = ru()
          ? 'Подтверждение: цена держится выше EMA9/EMA21, объём не падает'
          : 'Confirmation: price holds above EMA9/EMA21 and volume does not fade';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
          ? 'Early BUY включён: '+sig.reasons.join('; ')+'. Это ранний сигнал, не гарантия.'
          : 'Early BUY enabled: '+sig.reasons.join('; ')+'. This is an early signal, not a guarantee.');
        forecast.source = (forecast.source || 'V7') + ' + EARLY ENTRY';
      }

      if(sig.direction === 'early_sell'){
        forecast.preEarlyEntryAction = forecast.action || 'wait';
        forecast.action = 'sell';
        forecast.sentiment = 'bearish';
        forecast.isEarlyEntry = true;
        forecast.confidence = Math.max(conf, Math.min(76, sig.score - 8));
        forecast.probability = Math.min(num(forecast.probability,50), Math.max(25, 100 - forecast.confidence));
        forecast.upwardProbability = forecast.probability;
        forecast.entry = ru()
          ? 'Ранний шорт при продолжении давления'
          : 'Early short if pressure continues';
        forecast.entryZone = '$' + sig.entrySellLow.toFixed(4) + ' - $' + sig.entrySellHigh.toFixed(4);
        forecast.zone = forecast.entryZone;
        forecast.stopLoss = sig.invalidSell;
        forecast.firstTarget = sig.firstSellTarget;
        forecast.waitFor = ru()
          ? 'Подтверждение: цена ниже EMA9/EMA21, красный объём сохраняется'
          : 'Confirmation: price below EMA9/EMA21 and red volume persists';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
          ? 'Early SELL включён: '+sig.reasons.join('; ')+'. Это ранний сигнал, не гарантия.'
          : 'Early SELL enabled: '+sig.reasons.join('; ')+'. This is an early signal, not a guarantee.');
        forecast.source = (forecast.source || 'V7') + ' + EARLY ENTRY';
      }
    }

    return forecast;
  }

  window.zynqelEarlyEntrySignal = localEarlyEntrySignal;
  window.zynqelApplyEarlyEntry = applyEarlyEntry;

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__earlyEntry){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || asset();
      var out = await oldGenerate.apply(this, arguments);
      try{ out = applyEarlyEntry(assetId, out); }catch(e){ console.warn('Early entry failed:', e.message); }
      return out;
    };
    window.generateForecast.__earlyEntry = true;
  }

  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__earlyEntry){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = applyEarlyEntry(assetId, out); }catch(e){}
      return out;
    };
    window.normalizeForecast.__earlyEntry = true;
  }
})();
