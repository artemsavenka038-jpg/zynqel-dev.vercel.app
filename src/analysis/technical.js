// ZYNQEL analysis/technical.js
// Extracted from original analysis.js. Classic global script, not module.

// ---- extracted inline script block 23 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL FINAL SHORT-TERM GUARD
// Fixes the exact bug: ST filter turns BUY -> WAIT, then old normalize/V4 merge
// turns it back into BUY. This guard runs AFTER normalize and BEFORE rendering.
// Forecast math is not changed, only unsafe entry display is blocked.
// ═══════════════════════════════════════════════════════
(function(){
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
  function tech(asset){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {}; }catch(e){}
    return {};
  }
  function candle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }

  function shouldBlockBuy(asset, forecast){
    var st = null;
    try{
      if(typeof window.zynqelShortTermMomentum === 'function') st = window.zynqelShortTermMomentum(asset);
    }catch(e){}
    if(!st || !st.ready) return {block:false, st:st, reason:'no short-term candles'};

    // Stronger live guard: blocks BUY when latest 15m/1h is clearly against entry.
    var block = false;
    var reasons = [];

    if(st.buyBlocked){
      block = true;
      reasons.push('fresh selloff');
    }
    if(st.red3 >= 2 && st.move3 < -0.10){
      block = true;
      reasons.push('2+ red candles and negative 3-candle move');
    }
    if(st.belowFastMA && st.move3 < 0){
      block = true;
      reasons.push('price below MA7 with negative momentum');
    }
    if(st.maBear && st.move3 < 0){
      block = true;
      reasons.push('MA7 below MA14 and momentum down');
    }

    return {block:block, st:st, reason:reasons.join('; ') || st.reason || ''};
  }

  function shouldBlockSell(asset, forecast){
    var st = null;
    try{
      if(typeof window.zynqelShortTermMomentum === 'function') st = window.zynqelShortTermMomentum(asset);
    }catch(e){}
    if(!st || !st.ready) return {block:false, st:st, reason:'no short-term candles'};

    var block = false;
    var reasons = [];

    if(st.sellBlocked){
      block = true;
      reasons.push('fresh bounce');
    }
    if(st.green3 >= 2 && st.move3 > 0.10){
      block = true;
      reasons.push('2+ green candles and positive 3-candle move');
    }
    if(st.aboveFastMA && st.move3 > 0){
      block = true;
      reasons.push('price above MA7 with positive momentum');
    }
    if(st.maBull && st.move3 > 0){
      block = true;
      reasons.push('MA7 above MA14 and momentum up');
    }

    return {block:block, st:st, reason:reasons.join('; ') || st.reason || ''};
  }

  function forceWait(asset, forecast, side, check){
    forecast = forecast || {};
    var p = price(asset);
    var td = tech(asset);
    var ci = candle(asset);
    var support = num(td.support, null) || num(ci.support, null) || (p ? p*0.985 : null);
    var resistance = num(td.resistance, null) || num(ci.resistance, null) || (p ? p*1.015 : null);

    forecast.preFinalGuardAction = side;
    forecast.action = 'wait';
    forecast.sentiment = 'neutral';
    forecast.probability = 50;
    forecast.upwardProbability = 50;
    forecast.confidence = Math.max(45, Math.min(num(forecast.confidence, 60) - 15, 62));
    forecast.entryZone = ru()
      ? 'Ждать подтверждение: '+fmt(support, asset)+' – '+fmt(resistance, asset)
      : 'Wait for confirmation: '+fmt(support, asset)+' – '+fmt(resistance, asset);
    forecast.entry = forecast.entryZone;
    forecast.zone = forecast.entryZone;
    forecast.invalidation = ru()
      ? 'Вход заблокирован краткосрочным импульсом'
      : 'Entry blocked by short-term momentum';
    forecast.target1 = ru() ? 'После подтверждения' : 'After confirmation';
    forecast.target = forecast.target1;
    forecast.waitFor = side === 'buy'
      ? (ru() ? 'Закрытие 15m/1h свечи выше MA7/MA14, удержание поддержки и объём' : '15m/1h candle close above MA7/MA14, support hold and volume')
      : (ru() ? 'Закрытие 15m/1h свечи ниже MA7/MA14, отбой от сопротивления и объём' : '15m/1h candle close below MA7/MA14, resistance rejection and volume');

    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(
      side === 'buy'
        ? (ru() ? 'Final ST Guard заблокировал BUY: последние свечи против входа. Причина: '+check.reason : 'Final ST Guard blocked BUY: latest candles are against entry. Reason: '+check.reason)
        : (ru() ? 'Final ST Guard заблокировал SELL: последние свечи против входа. Причина: '+check.reason : 'Final ST Guard blocked SELL: latest candles are against entry. Reason: '+check.reason)
    );

    forecast.factors = forecast.factors || [];
    forecast.factors.unshift('Final ST Guard: '+(side === 'buy' ? 'BUY blocked' : 'SELL blocked'));
    forecast.shortTermMomentum = check.st;
    forecast.source = (forecast.source || 'V7') + ' + FINAL ST GUARD';
    return forecast;
  }

  window.zynqelFinalShortTermGuard = function(asset, forecast){
    if(!forecast) return forecast;
    var action = String(forecast.action || '').toLowerCase();

    if(action === 'buy'){
      var buyCheck = shouldBlockBuy(asset, forecast);
      if(buyCheck.block) return forceWait(asset, forecast, 'buy', buyCheck);
    }

    if(action === 'sell'){
      var sellCheck = shouldBlockSell(asset, forecast);
      if(sellCheck.block) return forceWait(asset, forecast, 'sell', sellCheck);
    }

    return forecast;
  };

  // Critical fix: run ST guard AFTER old normalizeForecast/V4 merge.
  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__finalSTGuard){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = window.zynqelFinalShortTermGuard(assetId, out); }catch(e){ console.warn('Final ST guard after normalize failed:', e.message); }
      return out;
    };
    window.normalizeForecast.__finalSTGuard = true;
  }

  // Second safety: run before UI builds "I would buy".
  if(typeof window.buildTradeDecision === 'function' && !window.buildTradeDecision.__finalSTGuard){
    var oldBuildTrade = window.buildTradeDecision;
    window.buildTradeDecision = function(assetId, forecast){
      try{ forecast = window.zynqelFinalShortTermGuard(assetId, forecast); }catch(e){}
      return oldBuildTrade.apply(this, [assetId, forecast]);
    };
    window.buildTradeDecision.__finalSTGuard = true;
  }
})();


// ---- extracted inline script block 25 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL CAREFUL SELL OVERRIDE
// Adds real SELL mode for all assets when bearish evidence is strong.
// Conservative: one red candle is NOT enough.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_SELL_OVERRIDE = {
    enabled: true,
    minRedLast5: 4,
    minDrop3PctCrypto: 0.45,
    minDrop3PctOther: 0.22,
    rsiSell: 46,
    minConfidence: 61,
    maxConfidence: 76
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
  function frames(asset){
    return window.z4CandleFrames && window.z4CandleFrames[asset] ? window.z4CandleFrames[asset] : {};
  }
  function activeCandles(asset){
    var f = frames(asset);
    if(f['15m'] && f['15m'].length >= 30) return {frame:'15m', candles:f['15m']};
    if(f['1h'] && f['1h'].length >= 30) return {frame:'1h', candles:f['1h']};
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
    return {};
  }
  function candle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }

  window.zynqelBearishOverrideContext = function(asset){
    var pack = activeCandles(asset);
    var cs = pack.candles;
    var p = livePrice(asset);
    if(!cs || cs.length < 30 || !p) return {ready:false, sell:false, reason:'not enough candle/price data'};

    var closes = cs.map(function(c){ return num(c.c,0); }).filter(function(v){ return v > 0; });
    var latest = closes[closes.length-1];
    var prev3 = closes[closes.length-4] || latest;
    var prev5 = closes[closes.length-6] || latest;

    var ema9 = ema(closes, 9);
    var ema21 = ema(closes, 21);
    var ema50 = ema(closes, 50);
    var td = tech(asset);
    var ci = candle(asset);
    var rsi = num(td.rsi, 50);

    var red5 = countColor(cs, 'red', 5);
    var green5 = countColor(cs, 'green', 5);
    var move3 = pct(latest, prev3);
    var move5 = pct(latest, prev5);
    var category = cfg(asset).category;
    var dropThreshold = category === 'crypto' ? window.ZYNQEL_SELL_OVERRIDE.minDrop3PctCrypto : window.ZYNQEL_SELL_OVERRIDE.minDrop3PctOther;

    var below9 = ema9 !== null && latest < ema9;
    var below21 = ema21 !== null && latest < ema21;
    var emaBear = ema9 !== null && ema21 !== null && ema9 < ema21;
    var ema50Bear = ema50 === null ? true : ema21 < ema50;
    var strongDrop = move3 <= -dropThreshold || move5 <= -(dropThreshold * 1.4);
    var rsiBear = rsi <= window.ZYNQEL_SELL_OVERRIDE.rsiSell;
    var redSeries = red5 >= window.ZYNQEL_SELL_OVERRIDE.minRedLast5;
    var bounceAgainst = green5 >= 3 && latest > ema9;

    var score = 0, reasons = [];
    if(below9){ score++; reasons.push('price below EMA9'); }
    if(below21){ score++; reasons.push('price below EMA21'); }
    if(emaBear){ score++; reasons.push('EMA9 below EMA21'); }
    if(ema50Bear){ score++; reasons.push('EMA21 below EMA50 / EMA50 unavailable'); }
    if(redSeries){ score++; reasons.push(red5+' of last 5 candles red'); }
    if(strongDrop){ score++; reasons.push('recent drop '+move3.toFixed(2)+'%'); }
    if(rsiBear){ score++; reasons.push('RSI '+Math.round(rsi)); }

    var support = num(td.support, null) || num(ci.support, null) || (p ? p*0.985 : null);
    var resistance = num(td.resistance, null) || num(ci.resistance, null) || (p ? p*1.015 : null);

    return {
      ready:true,
      sell:(score >= 4 && !bounceAgainst),
      score:score,
      frame:pack.frame,
      price:latest,
      ema9:ema9,
      ema21:ema21,
      ema50:ema50,
      rsi:rsi,
      red5:red5,
      green5:green5,
      move3:move3,
      move5:move5,
      support:support,
      resistance:resistance,
      reason:reasons.join('; '),
      bounceAgainst:bounceAgainst
    };
  };

  function applySellOverride(asset, forecast){
    if(!window.ZYNQEL_SELL_OVERRIDE.enabled || !forecast) return forecast;

    var ctx = window.zynqelBearishOverrideContext(asset);
    forecast.bearishOverrideContext = ctx;
    forecast.factors = forecast.factors || [];
    forecast.factors.unshift(ctx.ready ? ('Bear override score: '+ctx.score) : 'Bear override: loading');

    if(!ctx.ready || !ctx.sell) return forecast;

    var oldAction = String(forecast.action || '').toLowerCase();
    var p = livePrice(asset) || ctx.price;
    var sellConf = Math.max(
      window.ZYNQEL_SELL_OVERRIDE.minConfidence,
      Math.min(window.ZYNQEL_SELL_OVERRIDE.maxConfidence, 54 + ctx.score * 4 + Math.max(0, Math.abs(ctx.move3)))
    );

    forecast.preSellOverrideAction = oldAction;
    forecast.action = 'sell';
    forecast.sentiment = 'bearish';
    forecast.probability = Math.max(22, Math.min(43, 100 - sellConf));
    forecast.upwardProbability = forecast.probability;
    forecast.confidence = Math.round(sellConf);

    var zoneLow = Math.min(ctx.resistance || p*1.01, p*1.004);
    var zoneHigh = Math.max(ctx.resistance || p*1.01, p*1.010);
    forecast.entryZone = ru() ? ('Зона продажи: '+fmt(zoneLow, asset)+' – '+fmt(zoneHigh, asset)) : ('Sell zone: '+fmt(zoneLow, asset)+' – '+fmt(zoneHigh, asset));
    forecast.entry = forecast.entryZone;
    forecast.zone = forecast.entryZone;
    forecast.invalidation = ru() ? ('Отмена: закрепление выше '+fmt(ctx.ema21 || ctx.resistance || p*1.012, asset)) : ('Invalidation: hold above '+fmt(ctx.ema21 || ctx.resistance || p*1.012, asset));
    forecast.target1 = ru() ? ('Первая цель: '+fmt(ctx.support || p*0.985, asset)) : ('First target: '+fmt(ctx.support || p*0.985, asset));
    forecast.target = forecast.target1;
    forecast.waitFor = ru() ? 'Подтверждение: закрытие ниже EMA9/EMA21 и отсутствие резкого откупа' : 'Confirmation: close below EMA9/EMA21 and no sharp buyback';
    forecast.shortTerm = ru() ? '24ч: медвежий сценарий активен при подтверждении' : '24h: bearish scenario active if confirmed';
    forecast.midTerm = ru() ? '7д: зависит от возврата выше EMA21 или пробоя поддержки' : '7d: depends on EMA21 reclaim or support breakdown';

    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru() ? ('Careful SELL override включил SELL: '+ctx.reason+'.') : ('Careful SELL override activated SELL: '+ctx.reason+'.'));
    forecast.source = (forecast.source || 'V7') + ' + SELL OVERRIDE';
    return forecast;
  }

  window.zynqelApplySellOverride = applySellOverride;

  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__sellOverride){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = applySellOverride(assetId, out); }catch(e){ console.warn('Sell override after normalize failed:', e.message); }
      return out;
    };
    window.normalizeForecast.__sellOverride = true;
  }

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__sellOverride){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var out = await oldGenerate.apply(this, arguments);
      try{ out = applySellOverride(assetId, out); }catch(e){ console.warn('Sell override after generate failed:', e.message); }
      return out;
    };
    window.generateForecast.__sellOverride = true;
  }

  if(typeof window.buildTradeDecision === 'function' && !window.buildTradeDecision.__sellOverride){
    var oldBuild = window.buildTradeDecision;
    window.buildTradeDecision = function(assetId, forecast){
      try{ forecast = applySellOverride(assetId, forecast); }catch(e){}
      return oldBuild.apply(this, [assetId, forecast]);
    };
    window.buildTradeDecision.__sellOverride = true;
  }
})();
