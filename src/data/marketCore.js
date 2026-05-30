// ZYNQEL data/marketCore.js
// Extracted from original marketData.js. Classic global script, not module.

// ---- extracted inline script block 11 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V4 CLEAN AI TEXT PATCH
// Fixes repeated candle/technical text, mixed EN/RU output,
// duplicate zones, and converts raw debug into user-friendly analysis.
// ═══════════════════════════════════════════════════════
(function(){
  function zqNum(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function zqLang(){ return window.appLang === 'ru' ? 'ru' : 'en'; }
  function zqRu(){ return zqLang() === 'ru'; }
  function zqPrice(asset){
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : null;
    var p = d ? zqNum(d.price, null) : null;
    return p && p > 0 ? p : null;
  }
  function zqFmt(x, asset){
    x = zqNum(x, null);
    if(!x || x <= 0) return '';
    var dec = 2;
    if(asset === 'XRP' || asset === 'SUI' || asset === 'EUR' || asset === 'GBP') dec = 4;
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }
  function zqCleanRaw(s){
    s = String(s || '');
    s = s.replace(/\$?NaN/gi, 'market data')
         .replace(/\bundefined\b|\bnull\b/gi, 'market data')
         .replace(/Candle structure:[^.]*\.?/gi, '')
         .replace(/MTF candle bias[^.;]*[.;]?/gi, '')
         .replace(/market data\s*\/\s*market data/gi, '')
         .replace(/ATR loading/gi, '')
         .replace(/Real indicators:[^.]*\.?/gi, '')
         .replace(/V4 regime:[^.]*\.?/gi, '')
         .replace(/Factor scores:[^.]*\.?/gi, '')
         .replace(/V4 filter:[^.]*\.?/gi, '')
         .replace(/Технически:\s*тренд[^.]*\.?/gi, '')
         .replace(/Technicals:\s*trend[^.]*\.?/gi, '')
         .replace(/\s+/g, ' ')
         .trim();
    return s;
  }
  function zqDedupe(arr){
    if(!Array.isArray(arr)) arr = String(arr || '').split(/(?<=[.!?])\s+/);
    var seen = {}, out = [];
    arr.forEach(function(x){
      x = zqCleanRaw(x);
      if(!x || x.length < 4) return;
      var k = x.toLowerCase();
      if(!seen[k]){
        seen[k] = true;
        out.push(x);
      }
    });
    return out;
  }
  function zqGetTech(asset){
    try{
      if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {};
    }catch(e){}
    return {};
  }
  function zqGetCandle(asset){
    try{
      if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {};
    }catch(e){}
    return {};
  }
  function zqGetSR(asset, p){
    var td = zqGetTech(asset);
    var ci = zqGetCandle(asset);
    var support = zqNum(td.support, null) || zqNum(ci.support, null) || (p ? p*0.985 : null);
    var resistance = zqNum(td.resistance, null) || zqNum(ci.resistance, null) || (p ? p*1.015 : null);
    return {support:support, resistance:resistance, tech:td, candle:ci};
  }
  function zqNormalizeAction(f){
    var action = String(f.action || f.decision || 'wait').toLowerCase();
    if(action.indexOf('buy') >= 0 || action.indexOf('long') >= 0) return 'buy';
    if(action.indexOf('sell') >= 0 || action.indexOf('short') >= 0) return 'sell';
    return 'wait';
  }
  function zqSyncProb(f, action){
    var conf = zqNum(f.confidence || f.confidencePct, 55);
    var up = zqNum(f.upwardProbability ?? f.upProb ?? f.probability ?? f.probabilityUp, null);
    if(action === 'sell'){
      if(up === null || up > 49) up = Math.max(18, Math.min(45, 100-conf));
      f.sentiment = 'bearish';
    } else if(action === 'buy'){
      if(up === null || up < 51) up = Math.max(55, Math.min(82, conf));
      f.sentiment = 'bullish';
    } else {
      if(up === null || up < 42 || up > 58) up = 50;
      f.sentiment = 'neutral';
    }
    f.action = action;
    f.upwardProbability = Math.round(up);
    f.probability = Math.round(up);
    f.confidence = Math.round(Math.max(35, Math.min(92, conf)));
    return f;
  }
  function zqReadableFields(asset, f){
    var ru = zqRu();
    var p = zqPrice(asset);
    if(!p){
      f.action = 'wait';
      f.entry = ru ? 'Ожидание market feed' : 'Waiting for market feed';
      f.entryZone = f.entry;
      f.zone = f.entry;
      f.target = ru ? 'Цена ещё не загружена' : 'Price is not loaded yet';
      f.invalidation = ru ? 'Недоступно до загрузки цены' : 'Unavailable until price loads';
      f.trigger = ru ? 'Жду загрузку цены и свечей' : 'Waiting for price and candles';
      return f;
    }
    var sr = zqGetSR(asset, p);
    var support = sr.support;
    var resistance = sr.resistance;

    if(f.action === 'buy'){
      f.entry = (ru ? 'Зона покупки: ' : 'Buy zone: ') + zqFmt(Math.min(support, p*0.996), asset) + ' – ' + zqFmt(Math.max(support, p*1.003), asset);
      f.target = (ru ? 'Цель: ' : 'Target: ') + zqFmt(resistance || p*1.02, asset);
      f.invalidation = (ru ? 'Отмена: ниже ' : 'Invalidation: below ') + zqFmt(support || p*0.982, asset);
      f.trigger = ru ? 'Удержание поддержки и подтверждение объёма' : 'Support hold and volume confirmation';
    } else if(f.action === 'sell'){
      f.entry = (ru ? 'Зона продажи: ' : 'Sell zone: ') + zqFmt(Math.min(resistance, p*0.997), asset) + ' – ' + zqFmt(Math.max(resistance, p*1.004), asset);
      f.target = (ru ? 'Цель: ' : 'Target: ') + zqFmt(support || p*0.98, asset);
      f.invalidation = (ru ? 'Отмена: выше ' : 'Invalidation: above ') + zqFmt(resistance || p*1.018, asset);
      f.trigger = ru ? 'Отбой от сопротивления или пробой поддержки с объёмом' : 'Resistance rejection or support breakdown with volume';
    } else {
      f.entry = (ru ? 'Зона наблюдения: ' : 'Watch zone: ') + zqFmt(support || p*0.985, asset) + ' – ' + zqFmt(resistance || p*1.015, asset);
      f.target = ru ? 'После подтверждения' : 'After confirmation';
      f.invalidation = ru ? 'Нет активной идеи до подтверждения' : 'No active idea until confirmation';
      f.trigger = ru ? 'Жду пробой/ретест уровня, объём или свежий катализатор' : 'Waiting for breakout/retest, volume, or fresh catalyst';
    }

    // remove duplicated prefixes
    f.entry = f.entry.replace(/(Зона наблюдения:\s*){2,}/g,'Зона наблюдения: ')
                     .replace(/(Watch zone:\s*){2,}/g,'Watch zone: ')
                     .replace(/(Зона покупки:\s*){2,}/g,'Зона покупки: ')
                     .replace(/(Buy zone:\s*){2,}/g,'Buy zone: ')
                     .replace(/(Зона продажи:\s*){2,}/g,'Зона продажи: ')
                     .replace(/(Sell zone:\s*){2,}/g,'Sell zone: ');
    f.entryZone = f.entry;
    f.zone = f.entry;
    return f;
  }
  function zqFriendlyReasoning(asset, f){
    var ru = zqRu();
    var p = zqPrice(asset);
    var sr = p ? zqGetSR(asset, p) : {tech:{}, candle:{}};
    var td = sr.tech || {};
    var ci = sr.candle || {};
    var rsi = zqNum(td.rsi, null);
    var trend = td.trend || 'neutral';
    var candleBias = ci.bias || 'neutral';
    var levelPosition = ci.levelPosition || 'mid_range';

    var lines = [];
    if(ru){
      if(f.action === 'buy') lines.push('Покупка рассматривается только после подтверждения: удержание поддержки, объём и продолжение импульса.');
      if(f.action === 'sell') lines.push('Продажа выглядит приоритетнее, потому что медвежьи факторы сейчас сильнее бычьих.');
      if(f.action === 'wait') lines.push('Сигналы смешанные: рынок не даёт достаточного преимущества для уверенного входа.');
      if(rsi !== null) lines.push('RSI около ' + Math.round(rsi) + ', поэтому импульс пока ' + (rsi > 55 ? 'скорее бычий.' : rsi < 45 ? 'скорее медвежий.' : 'нейтральный.'));
      lines.push('Свечная структура: ' + (candleBias === 'bullish' ? 'бычий уклон' : candleBias === 'bearish' ? 'медвежий уклон' : 'нейтральная/боковая структура') + '.');
      lines.push('Ключевой сценарий: дождаться подтверждения около зоны ' + (p ? (zqFmt(sr.support, asset) + ' – ' + zqFmt(sr.resistance, asset)) : 'уровней') + '.');
    } else {
      if(f.action === 'buy') lines.push('Buy is only considered after confirmation: support hold, volume and continued momentum.');
      if(f.action === 'sell') lines.push('Sell is preferred because bearish factors currently dominate bullish factors.');
      if(f.action === 'wait') lines.push('Signals are mixed: the market does not provide enough edge for a confident entry.');
      if(rsi !== null) lines.push('RSI is near ' + Math.round(rsi) + ', so momentum is ' + (rsi > 55 ? 'slightly bullish.' : rsi < 45 ? 'slightly bearish.' : 'neutral.'));
      lines.push('Candle structure: ' + (candleBias === 'bullish' ? 'bullish bias' : candleBias === 'bearish' ? 'bearish bias' : 'neutral/ranging structure') + '.');
      lines.push('Main scenario: wait for confirmation near ' + (p ? (zqFmt(sr.support, asset) + ' – ' + zqFmt(sr.resistance, asset)) : 'key levels') + '.');
    }

    f.reasoning = zqDedupe(lines).slice(0,4);

    f.keyFactors = [
      f.action === 'buy' ? (ru?'Бычий bias':'Bullish bias') : f.action === 'sell' ? (ru?'Медвежий bias':'Bearish bias') : (ru?'Смешанный рынок':'Mixed market'),
      (ru?'Вероятность роста: ':'Upward probability: ') + f.upwardProbability + '%',
      (ru?'Уверенность: ':'Confidence: ') + f.confidence + '%',
      (ru?'Свечи: ':'Candles: ') + (candleBias === 'bullish' ? (ru?'бычий уклон':'bullish bias') : candleBias === 'bearish' ? (ru?'медвежий уклон':'bearish bias') : (ru?'нейтрально':'neutral'))
    ];

    return f;
  }
  window.zynqelCleanFinalForecast = function(asset, forecast){
    forecast = forecast || {};
    asset = asset || window.currentAnalysisAsset || window.currentAsset || 'BTC';
    var action = zqNormalizeAction(forecast);
    forecast = zqSyncProb(forecast, action);
    forecast = zqReadableFields(asset, forecast);
    forecast = zqFriendlyReasoning(asset, forecast);
    return forecast;
  };

  function wrap(name){
    var old = window[name];
    if(typeof old !== 'function' || old.__zqCleanText) return;
    var fn = function(){
      var result = old.apply(this, arguments);
      try{
        var asset = arguments[0] || window.currentAnalysisAsset || window.currentAsset || 'BTC';
        if(result && typeof result === 'object') return window.zynqelCleanFinalForecast(asset, result);
      }catch(e){}
      return result;
    };
    fn.__zqCleanText = true;
    window[name] = fn;
  }

  [
    'buildFallbackForecast',
    'buildLocalForecast',
    'generateLocalForecast',
    'normalizeForecast',
    'normalizeGroqForecast',
    'applyInstitutionalEngine',
    'enrichForecastWithRealTechnicals',
    'zynqelNormalizeV4Forecast',
    'zynqelFinalNormalize'
  ].forEach(wrap);

  var oldUpdate = window.updateActiveAnalysisLive;
  if(typeof oldUpdate === 'function' && !oldUpdate.__zqCleanText){
    var wu = function(){
      try{
        if(window.lastAnalysisForecast){
          window.lastAnalysisForecast = window.zynqelCleanFinalForecast(window.currentAnalysisAsset || window.currentAsset || 'BTC', window.lastAnalysisForecast);
        }
      }catch(e){}
      return oldUpdate.apply(this, arguments);
    };
    wu.__zqCleanText = true;
    window.updateActiveAnalysisLive = wu;
  }

  function cleanDom(){
    var root = document.getElementById('analysis-content');
    if(!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      var v = n.nodeValue;
      var nv = zqCleanRaw(v)
        .replace(/(Зона наблюдения:\s*){2,}/g,'Зона наблюдения: ')
        .replace(/(Watch zone:\s*){2,}/g,'Watch zone: ');
      if(nv !== v && nv.length > 0) n.nodeValue = nv;
    });
  }
  setInterval(cleanDom, 1000);
})();


// ---- extracted inline script block 12 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V4 HARD STABLE AI PATCH
// Applied to Last v4.html.
// Goals:
// 1) No jumping: live ticks update only price/change, not AI decision text.
// 2) No duplicated prefixes: "Zone: Buy zone", "Invalidation: Invalidation".
// 3) No broken disclaimer text.
// 4) AI reasoning is a short human sentence block, not raw technical/debug text.
// ═══════════════════════════════════════════════════════
(function(){
  function ZN(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ZRU(){ return window.appLang === 'ru'; }
  function ZP(asset){
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : {};
    var p = ZN(d.price, null);
    return p && p > 0 ? p : null;
  }
  function ZFmt(x, asset){
    x = ZN(x, null);
    if(!x || x <= 0) return '—';
    var dec = 2;
    if(asset === 'XRP' || asset === 'SUI' || asset === 'EUR' || asset === 'GBP') dec = 4;
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }
  function ZClean(s){
    s = String(s == null ? '' : s);
    s = s
      .replace(/\$?NaN/gi,'market data')
      .replace(/\bundefined\b|\bnull\b/gi,'market data')
      .replace(/This is not fimarket datacial advice/gi,'This is not financial advice')
      .replace(/Это не фиmarket dataсовая рекомендация/gi,'Это не финансовая рекомендация')
      .replace(/^(Zone|Entry zone|Sell\/short zone|Sell zone|Buy zone|Watch zone)\s*:\s*/i,'')
      .replace(/^(Зона|Зона входа|Зона продажи\/шорта|Зона продажи|Зона покупки|Зона наблюдения)\s*:\s*/i,'')
      .replace(/^(Invalidation|Отмена|Отмена идеи)\s*:\s*/i,'')
      .replace(/^(Target|Цель|первая цель|first target)\s*:\s*/i,'')
      .replace(/Candle structure:[^.]*\.?/gi,'')
      .replace(/MTF candle bias[^.;]*[.;]?/gi,'')
      .replace(/V4 regime:[^.]*\.?/gi,'')
      .replace(/Factor scores:[^.]*\.?/gi,'')
      .replace(/V4 filter:[^.]*\.?/gi,'')
      .replace(/ATR loading/gi,'')
      .replace(/market data\s*\/\s*market data/gi,'')
      .replace(/\s+/g,' ')
      .trim();
    return s;
  }
  function ZSentences(v){
    var arr = Array.isArray(v) ? v : String(v || '').split(/(?<=[.!?])\s+|,/);
    var seen = {}, out = [];
    arr.forEach(function(x){
      x = ZClean(x);
      if(!x || x.length < 5) return;
      var k = x.toLowerCase();
      if(!seen[k]){
        seen[k] = true;
        out.push(x);
      }
    });
    return out;
  }
  function ZTech(asset){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {}; }catch(e){}
    return {};
  }
  function ZCandle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }
  function ZLevels(asset){
    var p = ZP(asset);
    var td = ZTech(asset), ci = ZCandle(asset);
    var s = ZN(td.support,null) || ZN(ci.support,null) || (p ? p*0.985 : null);
    var r = ZN(td.resistance,null) || ZN(ci.resistance,null) || (p ? p*1.015 : null);
    return {support:s, resistance:r, tech:td, candle:ci};
  }
  function ZAction(f){
    var a = String((f && (f.action || f.decision)) || 'wait').toLowerCase();
    if(a.indexOf('buy') >= 0 || a.indexOf('long') >= 0) return 'buy';
    if(a.indexOf('sell') >= 0 || a.indexOf('short') >= 0) return 'sell';
    return 'wait';
  }
  function ZSync(asset, f){
    f = f || {};
    var action = ZAction(f);
    var conf = ZN(f.confidence || f.confidencePct, 55);
    var prob = ZN(f.probability || f.upwardProbability || f.upProb || f.probabilityUp, null);
    if(action === 'buy'){
      if(prob === null || prob < 53) prob = Math.max(55, Math.min(82, conf));
      f.sentiment = 'bullish';
    } else if(action === 'sell'){
      if(prob === null || prob > 47) prob = Math.max(18, Math.min(45, 100-conf));
      f.sentiment = 'bearish';
    } else {
      if(prob === null || prob < 42 || prob > 58) prob = 50;
      f.sentiment = 'neutral';
    }
    f.action = action;
    f.probability = Math.round(prob);
    f.upwardProbability = Math.round(prob);
    f.confidence = Math.round(Math.max(35, Math.min(92, conf)));
    return f;
  }

  // Override normalizeForecast to return clean scalar fields and a readable reasoning string.
  var oldNormalize = window.normalizeForecast;
  window.normalizeForecast = function(asset, forecast){
    var f = forecast || {};
    try{ if(typeof oldNormalize === 'function') f = oldNormalize.apply(this, arguments) || f; }catch(e){}
    f = ZSync(asset, f);
    var ru = ZRU(), p = ZP(asset), lv = ZLevels(asset), td = lv.tech || {}, ci = lv.candle || {};
    var rsi = ZN(td.rsi, null);
    var candleBias = ci.bias || 'neutral';
    var support = lv.support, resistance = lv.resistance;

    if(!p){
      f.entryZone = ru ? 'Ожидание загрузки цены' : 'Waiting for price feed';
      f.invalidation = ru ? 'Недоступно до загрузки цены' : 'Unavailable until price loads';
      f.target1 = '—';
      f.waitFor = ru ? 'Загрузка цены и свечей' : 'Price and candle data';
    } else if(f.action === 'buy'){
      f.entryZone = ZFmt(Math.min(support || p*0.99, p*0.996), asset) + ' – ' + ZFmt(Math.max(support || p*0.99, p*1.003), asset);
      f.invalidation = ru ? ('ниже ' + ZFmt(support || p*0.982, asset)) : ('below ' + ZFmt(support || p*0.982, asset));
      f.target1 = ZFmt(resistance || p*1.02, asset);
      f.waitFor = ru ? 'удержание поддержки и подтверждение объёма' : 'support hold and volume confirmation';
    } else if(f.action === 'sell'){
      f.entryZone = ZFmt(Math.min(resistance || p*1.01, p*0.997), asset) + ' – ' + ZFmt(Math.max(resistance || p*1.01, p*1.004), asset);
      f.invalidation = ru ? ('выше ' + ZFmt(resistance || p*1.018, asset)) : ('above ' + ZFmt(resistance || p*1.018, asset));
      f.target1 = ZFmt(support || p*0.98, asset);
      f.waitFor = ru ? 'отбой от сопротивления или пробой поддержки с объёмом' : 'resistance rejection or support breakdown with volume';
    } else {
      f.entryZone = ZFmt(support || p*0.985, asset) + ' – ' + ZFmt(resistance || p*1.015, asset);
      f.invalidation = ru ? 'нет активной идеи до подтверждения' : 'no active idea until confirmation';
      f.target1 = '—';
      f.waitFor = ru ? 'закрепление за уровнем, объём или свежий катализатор' : 'level hold, volume, or fresh catalyst';
    }

    var lines = [];
    if(ru){
      if(f.action === 'buy') lines.push('Покупка рассматривается только после подтверждения: удержание поддержки, объём и продолжение импульса.');
      else if(f.action === 'sell') lines.push('Продажа выглядит приоритетнее, потому что медвежьи факторы сейчас сильнее бычьих.');
      else lines.push('Сигналы смешанные, поэтому лучше ждать подтверждения перед входом.');
      if(rsi !== null) lines.push('RSI около ' + Math.round(rsi) + ', импульс сейчас ' + (rsi>55?'скорее бычий.':rsi<45?'скорее медвежий.':'нейтральный.'));
      lines.push('Свечная структура: ' + (candleBias==='bullish'?'бычий уклон.':candleBias==='bearish'?'медвежий уклон.':'нейтральный диапазон.'));
    }else{
      if(f.action === 'buy') lines.push('Buy is only considered after confirmation: support hold, volume and continued momentum.');
      else if(f.action === 'sell') lines.push('Sell is preferred because bearish factors currently dominate bullish factors.');
      else lines.push('Signals are mixed, so waiting for confirmation is preferred before entry.');
      if(rsi !== null) lines.push('RSI is near ' + Math.round(rsi) + ', so momentum is ' + (rsi>55?'slightly bullish.':rsi<45?'slightly bearish.':'neutral.'));
      lines.push('Candle structure: ' + (candleBias==='bullish'?'bullish bias.':candleBias==='bearish'?'bearish bias.':'neutral range.'));
    }
    f.reasoning = ZSentences(lines).join(' ');
    f.factors = [
      rsi !== null ? ('RSI ' + Math.round(rsi)) : (ru?'RSI загружается':'RSI loading'),
      f.action==='buy' ? (ru?'Бычий bias':'Bullish bias') : f.action==='sell' ? (ru?'Медвежий bias':'Bearish bias') : (ru?'Смешанный рынок':'Mixed market'),
      (ru?'Вероятность роста: ':'Upward probability: ') + f.probability + '%',
      (ru?'Уверенность: ':'Confidence: ') + f.confidence + '%'
    ];
    return f;
  };

  // Override trade renderer helper: no double labels.
  window.buildTradeDecision = function(assetId, forecast){
    var ru = ZRU(), f = ZSync(assetId, forecast || {}), p = ZP(assetId);
    var action = f.action;
    var colNote = ru ? 'Это не финансовая рекомендация, а сигнал приложения по текущим данным.' : 'This is not financial advice; it is an app signal based on current data.';
    var actionLabel = ru ? ({buy:'Я бы купил',sell:'Я бы продал',wait:'Я бы подождал подтверждения'}[action]) : ({buy:'I would buy',sell:'I would sell',wait:'I would wait for confirmation'}[action]);
    var entry = ZClean(f.entryZone || f.zone || f.entry || '');
    var inval = ZClean(f.invalidation || '');
    var target = ZClean(f.target1 || f.target || '');
    if(!entry && p){
      var lv = ZLevels(assetId);
      entry = ZFmt(lv.support || p*0.985, assetId) + ' – ' + ZFmt(lv.resistance || p*1.015, assetId);
    }
    var entryPrefix = action==='buy' ? (ru?'Зона покупки: ':'Buy zone: ') : action==='sell' ? (ru?'Зона продажи: ':'Sell zone: ') : (ru?'Зона наблюдения: ':'Watch zone: ');
    var entryText = entryPrefix + escapeHtml(entry || (ru?'ожидание данных':'waiting for data'));
    if(action==='wait') entryText += ru ? ' · вход только после подтверждения' : ' · enter only after confirmation';

    var riskText;
    if(action === 'wait'){
      var waitFor = ZClean(f.waitFor || f.confirmation || f.trigger || '');
      riskText = (ru?'Что жду: ':'Waiting for: ') + escapeHtml(waitFor || (ru?'объём, пробой/ретест уровня или свежий катализатор':'volume, level breakout/retest, or fresh catalyst'));
    }else{
      riskText = (ru?'Отмена: ':'Invalidation: ') + escapeHtml(inval || '—') + ' · ' + (ru?'первая цель: ':'first target: ') + escapeHtml(target || '—');
    }
    return {action:action, actionLabel:actionLabel, entryText:entryText, riskText:riskText, note:colNote, source:(f.source||'LOCAL ENGINE')};
  };

  // Stop jumping: live ticks update ONLY live price and 24h change.
  window.updateActiveAnalysisLive = function(){
    try{
      if(!g('page-analysis') || !g('page-analysis').classList.contains('active') || !currentAnalysisAsset) return;
      var d = liveData[currentAnalysisAsset] || {};
      var priceEl = g('analysis-live-price');
      var chgEl = g('analysis-live-change');
      if(priceEl && d.price) priceEl.textContent = fmtPrice(d.price);
      if(chgEl){
        var ch = parseFloat(d.change24h || 0);
        chgEl.textContent = fmtChg(ch) + ' 24H';
        chgEl.className = chgClass(ch);
      }
      // Important: do not rewrite action/entry/risk/reasoning here.
      // AI block changes only after asset switch or pressing Run AI Analysis.
    }catch(e){ console.warn('stable updateActiveAnalysisLive:', e.message); }
  };

  // Manual button binding, stable and non-duplicated.
  function bindStableRunButton(){
    var btn = document.getElementById('run-ai-analysis-btn');
    if(!btn || btn.dataset.hardStableBound) return;
    btn.dataset.hardStableBound = '1';
    btn.onclick = async function(){
      if(window.analysisLoadingNow) return;
      var old = btn.textContent || '🤖 Run AI Analysis';
      var st = document.getElementById('ai-analysis-status');
      btn.disabled = true;
      btn.textContent = '🤖 Thinking...';
      if(st) st.textContent = 'Groq thinking...';
      try{
        await window.loadAnalysis(window.currentAnalysisAsset || window.currentAsset || 'BTC', {force:true, manual:true});
        if(st) st.textContent = 'Updated just now';
      }catch(e){
        if(st) st.textContent = 'AI error';
      }finally{
        btn.disabled = false;
        btn.textContent = old;
      }
    };
  }
  setInterval(bindStableRunButton, 1000);
  setTimeout(bindStableRunButton, 500);

  // DOM last-pass cleaner for any old text already rendered.
  function cleanDomOnce(){
    var root = document.getElementById('analysis-content');
    if(!root) return;
    root.innerHTML = root.innerHTML
      .replace(/Zone:\s*Buy zone:/gi,'Buy zone:')
      .replace(/Zone:\s*Sell zone:/gi,'Sell zone:')
      .replace(/Zone:\s*Watch zone:/gi,'Watch zone:')
      .replace(/Зона:\s*Зона покупки:/gi,'Зона покупки:')
      .replace(/Зона:\s*Зона продажи:/gi,'Зона продажи:')
      .replace(/Зона:\s*Зона наблюдения:/gi,'Зона наблюдения:')
      .replace(/Invalidation:\s*Invalidation:/gi,'Invalidation:')
      .replace(/Отмена:\s*Отмена:/gi,'Отмена:')
      .replace(/This is not fimarket datacial advice/gi,'This is not financial advice')
      .replace(/RSI is near ([0-9]+), so momentum is neutral,,/gi,'RSI is near $1, so momentum is neutral.')
      .replace(/,\s*RSI is near/gi,'. RSI is near');
  }
  setInterval(cleanDomOnce, 1500);
})();


// ---- extracted inline script block 14 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V5 MANUAL GROQ STABILITY PATCH
// Manual Run AI Analysis waits for Groq longer.
// Auto/live can use LOCAL ENGINE; manual button should not instantly fallback.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_MANUAL_GROQ_MODE = true;
  window.zynqelManualAiRunning = false;
  window.zynqelLastManualAsset = null;
  window.zynqelLastManualHtml = null;
  window.zynqelLastManualAt = 0;

  // Longer timeout for manual AI runs.
  try{
    if(typeof window.GROQ_TIMEOUT_MS !== 'undefined'){
      window.GROQ_TIMEOUT_MS = Math.max(window.GROQ_TIMEOUT_MS || 0, 30000);
    }
  }catch(e){}

  function status(txt, kind){
    var st = document.getElementById('ai-analysis-status');
    if(st){
      st.textContent = txt;
      st.style.color = kind === 'ok' ? 'var(--green)' : kind === 'warn' ? 'var(--gold)' : kind === 'err' ? 'var(--red)' : '#64748b';
    }
    if(typeof window.setGroqStatus === 'function'){
      try{ window.setGroqStatus(txt, kind || ''); }catch(e){}
    }
  }

  function currentAsset(){
    return window.currentAnalysisAsset || window.currentAsset || 'BTC';
  }

  function freezeAiBlock(){
    var box = document.getElementById('analysis-content');
    if(!box) return;
    window.zynqelLastManualAsset = currentAsset();
    window.zynqelLastManualHtml = box.innerHTML;
    window.zynqelLastManualAt = Date.now();
  }

  function restoreFrozenBlock(){
    var box = document.getElementById('analysis-content');
    if(!box || !window.zynqelLastManualHtml) return false;
    if(window.zynqelManualAiRunning) return false;
    if(window.zynqelLastManualAsset !== currentAsset()) return false;
    if(box.innerHTML !== window.zynqelLastManualHtml){
      box.innerHTML = window.zynqelLastManualHtml;
      return true;
    }
    return false;
  }

  function cleanTextOnce(){
    var root = document.getElementById('analysis-content');
    if(!root) return;
    root.innerHTML = root.innerHTML
      .replace(/Zone:\s*Buy zone:/gi, 'Buy zone:')
      .replace(/Zone:\s*Sell zone:/gi, 'Sell zone:')
      .replace(/Zone:\s*Watch zone:/gi, 'Watch zone:')
      .replace(/Зона:\s*Зона покупки:/gi, 'Зона покупки:')
      .replace(/Зона:\s*Зона продажи:/gi, 'Зона продажи:')
      .replace(/Зона:\s*Зона наблюдения:/gi, 'Зона наблюдения:')
      .replace(/Invalidation:\s*Invalidation:/gi, 'Invalidation:')
      .replace(/Отмена:\s*Отмена:/gi, 'Отмена:')
      .replace(/first target:\s*—/gi, '')
      .replace(/This is not fimarket datacial advice/gi, 'This is not financial advice')
      .replace(/This is not financial advice; it is an app signal based on current data\./gi, 'This is not financial advice; it is an app signal based on current data.');
  }

  // Stronger manual button handler: one click = one Groq attempt, wait longer.
  function bindManualButton(){
    var btn = document.getElementById('run-ai-analysis-btn');
    if(!btn) return;
    if(btn.__zynqelManualStableBound) return;
    btn.__zynqelManualStableBound = true;

    btn.onclick = async function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      if(window.zynqelManualAiRunning) return false;

      var asset = currentAsset();
      window.zynqelManualAiRunning = true;
      btn.disabled = true;
      var oldText = btn.textContent || '🤖 Run AI Analysis';
      btn.textContent = '🤖 Groq thinking...';
      status('GROQ: manual analysis...', 'warn');

      try{
        // Clear previous frozen block only for this manual run.
        window.zynqelLastManualAsset = asset;
        window.zynqelLastManualHtml = null;

        if(typeof window.loadAnalysis === 'function'){
          await window.loadAnalysis(asset, {force:true, manual:true, waitGroq:true});
        } else if(typeof window.generateForecast === 'function'){
          var forecast = await window.generateForecast(asset, {manual:true, waitGroq:true});
          if(typeof window.renderAnalysis === 'function') window.renderAnalysis(asset, forecast);
        }

        setTimeout(function(){
          cleanTextOnce();
          freezeAiBlock();
          status('Updated by AI just now', 'ok');
        }, 500);
      }catch(e){
        console.warn('Manual Groq run failed:', e);
        status('Groq error → local fallback', 'err');
        try{
          if(typeof window.buildFallbackForecast === 'function' && typeof window.renderAnalysis === 'function'){
            var fb = window.buildFallbackForecast(asset);
            fb.source = 'LOCAL ENGINE';
            window.renderAnalysis(asset, fb);
          }
        }catch(err){}
        setTimeout(function(){ cleanTextOnce(); freezeAiBlock(); }, 500);
      }finally{
        setTimeout(function(){
          window.zynqelManualAiRunning = false;
          btn.disabled = false;
          btn.textContent = oldText;
          cleanTextOnce();
          freezeAiBlock();
        }, 900);
      }
      return false;
    };
  }

  // Wrap loadAnalysis: when not manual, do not overwrite manual result on live ticks.
  if(typeof window.loadAnalysis === 'function' && !window.loadAnalysis.__zynqelManualStable){
    var oldLoadAnalysis = window.loadAnalysis;
    var wrappedLoadAnalysis = async function(asset, opts){
      opts = opts || {};
      asset = asset || currentAsset();

      if(!opts.force && !opts.manual && window.zynqelLastManualHtml && window.zynqelLastManualAsset === asset){
        restoreFrozenBlock();
        return window.lastAnalysisForecast || null;
      }

      var res = await oldLoadAnalysis.apply(this, arguments);

      if(opts.manual || opts.waitGroq || opts.force){
        setTimeout(function(){
          cleanTextOnce();
          freezeAiBlock();
        }, 500);
      }
      return res;
    };
    wrappedLoadAnalysis.__zynqelManualStable = true;
    window.loadAnalysis = wrappedLoadAnalysis;
  }

  // Wrap updateActiveAnalysisLive: do not overwrite manual AI block.
  if(typeof window.updateActiveAnalysisLive === 'function' && !window.updateActiveAnalysisLive.__zynqelManualStable){
    var oldUpdateLive = window.updateActiveAnalysisLive;
    var wrappedUpdateLive = function(){
      var page = document.getElementById('page-analysis');
      var onAi = page && page.classList.contains('active');
      if(onAi && window.zynqelLastManualHtml && !window.zynqelManualAiRunning){
        restoreFrozenBlock();
        return;
      }
      return oldUpdateLive.apply(this, arguments);
    };
    wrappedUpdateLive.__zynqelManualStable = true;
    window.updateActiveAnalysisLive = wrappedUpdateLive;
  }

  // Wrap generateForecast: manual runs may bypass weak V5 no-Groq filter only if user explicitly requested AI,
  // but still keep V5 filter result visible if signal is weak.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__zynqelManualGroqAware){
    var oldGenerateForecast = window.generateForecast;
    var wrappedGenerateForecast = async function(assetId, opts){
      opts = opts || {};
      // Keep current V5 behavior: weak signal can still return V5 FILTER.
      // Main change is stability/waiting, not forcing Groq to guess weak signals.
      return oldGenerateForecast.apply(this, arguments);
    };
    wrappedGenerateForecast.__zynqelManualGroqAware = true;
    window.generateForecast = wrappedGenerateForecast;
  }

  setInterval(function(){
    bindManualButton();
    restoreFrozenBlock();
    cleanTextOnce();
  }, 1000);

  setTimeout(function(){
    bindManualButton();
    freezeAiBlock();
  }, 2500);
})();


// ---- extracted inline script block 19 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V7.1 SHORT-TERM MOMENTUM FILTER
// Prevents BUY into fresh 15m/1h selloff and SELL into fresh bounce.
// Directional bias may remain bullish/bearish, but action becomes WAIT for confirmation.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_ST_MOMENTUM = {
    enabled: true,
    buyBlockRedCandles: 3,
    sellBlockGreenCandles: 3,
    minRecentMovePct: 0.35,
    penaltyConfidence: 10
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ru(){ return window.appLang === 'ru'; }
  function getFrames(asset){
    return window.z4CandleFrames && window.z4CandleFrames[asset] ? window.z4CandleFrames[asset] : {};
  }
  function last(arr){ return arr && arr.length ? arr[arr.length-1] : null; }
  function pct(a,b){ return b ? ((a-b)/b*100) : 0; }
  function color(c){
    if(!c) return 'neutral';
    if(num(c.c,0) > num(c.o,0)) return 'green';
    if(num(c.c,0) < num(c.o,0)) return 'red';
    return 'neutral';
  }
  function countColor(candles, clr, n){
    if(!candles || candles.length < n) return 0;
    return candles.slice(-n).filter(function(c){return color(c) === clr;}).length;
  }
  function ma(values, p){
    if(!values || values.length < p) return null;
    var s = 0;
    for(var i=values.length-p;i<values.length;i++) s += values[i];
    return s/p;
  }
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
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }
  function tech(asset){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {}; }catch(e){}
    return {};
  }
  function candle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }

  window.zynqelShortTermMomentum = function(asset){
    var frames = getFrames(asset);
    var c15 = frames['15m'] || [];
    var c1h = frames['1h'] || [];
    var active = c15.length >= 8 ? c15 : c1h;
    var frame = c15.length >= 8 ? '15m' : '1h';

    if(!active || active.length < 8){
      return {
        ready:false,
        frame:frame,
        bias:'unknown',
        buyBlocked:false,
        sellBlocked:false,
        reason:'not enough short-term candles',
        recentMovePct:0
      };
    }

    var closes = active.map(function(c){ return num(c.c,0); });
    var latest = last(active);
    var latestClose = num(latest.c, 0);
    var prev3 = active[active.length-4] || active[0];
    var prev5 = active[active.length-6] || active[0];

    var red3 = countColor(active, 'red', 3);
    var green3 = countColor(active, 'green', 3);
    var red5 = countColor(active, 'red', 5);
    var green5 = countColor(active, 'green', 5);

    var ma7 = ma(closes, 7);
    var ma14 = ma(closes, 14) || ma(closes, 8);
    var belowFastMA = ma7 !== null && latestClose < ma7;
    var aboveFastMA = ma7 !== null && latestClose > ma7;
    var maBear = ma7 !== null && ma14 !== null && ma7 < ma14;
    var maBull = ma7 !== null && ma14 !== null && ma7 > ma14;

    var move3 = pct(latestClose, num(prev3.c, latestClose));
    var move5 = pct(latestClose, num(prev5.c, latestClose));

    var freshSelloff = (red3 >= 2 && belowFastMA && (move3 <= -window.ZYNQEL_ST_MOMENTUM.minRecentMovePct || maBear)) || (red5 >= 4 && move5 < 0);
    var freshBounce = (green3 >= 2 && aboveFastMA && (move3 >= window.ZYNQEL_ST_MOMENTUM.minRecentMovePct || maBull)) || (green5 >= 4 && move5 > 0);

    var bias = 'neutral';
    if(freshSelloff) bias = 'short_term_bearish';
    else if(freshBounce) bias = 'short_term_bullish';

    var reason = bias === 'short_term_bearish'
      ? ('last candles show fresh selloff: red3='+red3+', move3='+move3.toFixed(2)+'%, below MA7='+belowFastMA)
      : bias === 'short_term_bullish'
        ? ('last candles show fresh bounce: green3='+green3+', move3='+move3.toFixed(2)+'%, above MA7='+aboveFastMA)
        : ('short-term candles neutral: move3='+move3.toFixed(2)+'%');

    return {
      ready:true,
      frame:frame,
      bias:bias,
      buyBlocked:freshSelloff,
      sellBlocked:freshBounce,
      reason:reason,
      red3:red3,
      green3:green3,
      red5:red5,
      green5:green5,
      move3:move3,
      move5:move5,
      belowFastMA:belowFastMA,
      aboveFastMA:aboveFastMA,
      maBear:maBear,
      maBull:maBull,
      recentMovePct:move3
    };
  };

  function applyShortTermFilter(asset, forecast){
    if(!window.ZYNQEL_ST_MOMENTUM.enabled || !forecast) return forecast;

    var st = window.zynqelShortTermMomentum(asset);
    forecast.shortTermMomentum = st;
    forecast.factors = forecast.factors || [];
    forecast.factors.unshift('ST momentum: '+st.bias);

    var p = price(asset);
    var td = tech(asset);
    var ci = candle(asset);
    var support = num(forecast.support, null) || num(td.support, null) || num(ci.support, null) || (p ? p*0.985 : null);
    var resistance = num(forecast.resistance, null) || num(td.resistance, null) || num(ci.resistance, null) || (p ? p*1.015 : null);

    if(st.ready && forecast.action === 'buy' && st.buyBlocked){
      forecast.preFilterAction = 'buy';
      forecast.action = 'wait';
      forecast.sentiment = 'neutral';
      forecast.probability = Math.min(num(forecast.probability, 50), 58);
      forecast.upwardProbability = forecast.probability;
      forecast.confidence = Math.max(45, num(forecast.confidence, 60) - window.ZYNQEL_ST_MOMENTUM.penaltyConfidence);
      forecast.entry = ru()
        ? 'Ждать откат/подтверждение: '+fmt(support, asset)+' – '+fmt(resistance, asset)
        : 'Wait for pullback/confirmation: '+fmt(support, asset)+' – '+fmt(resistance, asset);
      forecast.entryZone = forecast.entry;
      forecast.zone = forecast.entry;
      forecast.invalidation = ru() ? 'Нет входа, пока 15m/1h импульс вниз' : 'No entry while 15m/1h momentum is down';
      forecast.target = ru() ? 'После возврата импульса' : 'After momentum recovery';
      forecast.waitFor = ru()
        ? 'Закрытие свечи выше MA7/MA14, удержание поддержки и объём'
        : 'Candle close above MA7/MA14, support hold and volume';
      forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
      forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
        ? 'Short-term filter заблокировал BUY: последние свечи показывают локальный откат/давление вниз.'
        : 'Short-term filter blocked BUY: latest candles show local pullback/downside pressure.');
      forecast.source = (forecast.source || 'V7') + ' + ST FILTER';
    }

    if(st.ready && forecast.action === 'sell' && st.sellBlocked){
      forecast.preFilterAction = 'sell';
      forecast.action = 'wait';
      forecast.sentiment = 'neutral';
      forecast.probability = 50;
      forecast.upwardProbability = 50;
      forecast.confidence = Math.max(45, num(forecast.confidence, 60) - window.ZYNQEL_ST_MOMENTUM.penaltyConfidence);
      forecast.entry = ru()
        ? 'Ждать отбой/подтверждение: '+fmt(support, asset)+' – '+fmt(resistance, asset)
        : 'Wait for rejection/confirmation: '+fmt(support, asset)+' – '+fmt(resistance, asset);
      forecast.entryZone = forecast.entry;
      forecast.zone = forecast.entry;
      forecast.invalidation = ru() ? 'Нет входа, пока 15m/1h импульс вверх' : 'No entry while 15m/1h momentum is up';
      forecast.target = ru() ? 'После возврата импульса вниз' : 'After downside momentum returns';
      forecast.waitFor = ru()
        ? 'Отбой от сопротивления, закрытие ниже MA7/MA14 и объём'
        : 'Resistance rejection, close below MA7/MA14 and volume';
      forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
      forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
        ? 'Short-term filter заблокировал SELL: последние свечи показывают локальный отскок/давление вверх.'
        : 'Short-term filter blocked SELL: latest candles show local bounce/upside pressure.');
      forecast.source = (forecast.source || 'V7') + ' + ST FILTER';
    }

    return forecast;
  }

  window.zynqelApplyShortTermFilter = applyShortTermFilter;

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__stMomentumWrapped){
    var oldGenerate = window.generateForecast;
    var wrappedGenerate = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var forecast = await oldGenerate.apply(this, arguments);
      try{
        forecast = applyShortTermFilter(assetId, forecast);
      }catch(e){
        console.warn('ST momentum filter failed:', e.message);
      }
      return forecast;
    };
    wrappedGenerate.__stMomentumWrapped = true;
    window.generateForecast = wrappedGenerate;
  }

  // If V7 combine is used before generateForecast safety layer, patch it too.
  if(typeof window.zynqelV7Combine === 'function' && !window.zynqelV7Combine.__stMomentumWrapped){
    var oldCombine = window.zynqelV7Combine;
    var wrappedCombine = function(asset, v6, news){
      var forecast = oldCombine.apply(this, arguments);
      try{ forecast = applyShortTermFilter(asset, forecast); }catch(e){}
      return forecast;
    };
    wrappedCombine.__stMomentumWrapped = true;
    window.zynqelV7Combine = wrappedCombine;
  }

  function cleanST(){
    var root = document.getElementById('analysis-content');
    if(!root) return;
    root.innerHTML = root.innerHTML
      .replace(/Zone:\s*Buy zone:/gi, 'Buy zone:')
      .replace(/Zone:\s*Sell zone:/gi, 'Sell zone:')
      .replace(/Zone:\s*Watch zone:/gi, 'Watch zone:')
      .replace(/Зона:\s*Зона покупки:/gi, 'Зона покупки:')
      .replace(/Зона:\s*Зона продажи:/gi, 'Зона продажи:')
      .replace(/Зона:\s*Зона наблюдения:/gi, 'Зона наблюдения:')
      .replace(/Invalidation:\s*Invalidation:/gi, 'Invalidation:')
      .replace(/Отмена:\s*Отмена:/gi, 'Отмена:')
      .replace(/This is not fimarket datacial advice/gi, 'This is not financial advice');
  }
  setInterval(cleanST, 1200);
})();


// ZYNQEL market data/API routing/price feeds extracted from index.html
