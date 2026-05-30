// ZYNQEL analysis/earlyMove.js
// Extracted from original analysis.js. Classic global script, not module.

// ---- extracted inline script block 28 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL EARLY MOVE WARNING LAYER
// Predictive layer for "before it dumps/pumps", not after.
// Non-conflict design: does not replace BUY/SELL/WAIT.
// It adds an early warning and blocks risky BUY when breakdown risk is high.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_EARLY_MOVE = {
    enabled: true,
    warnScore: 55,
    blockBuyScore: 68,
    strongScore: 78
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ru(){ return window.appLang === 'ru'; }
  function ld(id){ return window.liveData && window.liveData[id] ? window.liveData[id] : {}; }
  function ch(id){ return num(ld(id).change24h, 0); }
  function riskData(id){ return window.marketRiskData && window.marketRiskData[id] ? window.marketRiskData[id] : {}; }
  function frames(asset){
    return window.z4CandleFrames && window.z4CandleFrames[asset] ? window.z4CandleFrames[asset] : {};
  }
  function getCandles(asset){
    var f = frames(asset);
    if(f['15m'] && f['15m'].length >= 30) return {frame:'15m', candles:f['15m']};
    if(f['1h'] && f['1h'].length >= 30) return {frame:'1h', candles:f['1h']};
    if(window.candleData && window.candleData[asset] && window.candleData[asset].length >= 30) return {frame:'old-1h', candles:window.candleData[asset]};
    return {frame:'none', candles:[]};
  }
  function ema(values, period){
    if(!values || values.length < period) return null;
    var k = 2 / (period + 1);
    var seed = 0;
    for(var i=0;i<period;i++) seed += values[i];
    var prev = seed / period;
    for(var j=period;j<values.length;j++) prev = values[j]*k + prev*(1-k);
    return prev;
  }
  function pct(a,b){ return b ? ((a-b)/b*100) : 0; }
  function avg(arr){
    if(!arr || !arr.length) return 0;
    return arr.reduce(function(s,x){return s+x;},0)/arr.length;
  }
  function color(c){
    if(!c) return 'neutral';
    if(num(c.c,0) > num(c.o,0)) return 'green';
    if(num(c.c,0) < num(c.o,0)) return 'red';
    return 'neutral';
  }

  window.zynqelEarlyMoveWarning = function(asset){
    var pack = getCandles(asset);
    var cs = pack.candles || [];
    if(cs.length < 30){
      return {
        ready:false,
        asset:asset,
        score:0,
        level:'NO DATA',
        direction:'none',
        message: ru() ? 'Недостаточно свечей для раннего предупреждения.' : 'Not enough candles for early warning.',
        reasons:['no candles']
      };
    }

    var closes = cs.map(function(c){return num(c.c,0);}).filter(function(v){return v>0;});
    var highs = cs.map(function(c){return num(c.h,0);}).filter(function(v){return v>0;});
    var lows = cs.map(function(c){return num(c.l,0);}).filter(function(v){return v>0;});
    var vols = cs.map(function(c){return num(c.v,0);});
    var latest = closes[closes.length-1];
    var prev3 = closes[closes.length-4] || latest;
    var prev6 = closes[closes.length-7] || latest;

    var ema9 = ema(closes, 9);
    var ema21 = ema(closes, 21);
    var ema50 = ema(closes, 50);

    var recent = cs.slice(-10);
    var firstHalf = recent.slice(0,5);
    var secondHalf = recent.slice(5);
    var h1 = Math.max.apply(null, firstHalf.map(function(c){return c.h;}));
    var h2 = Math.max.apply(null, secondHalf.map(function(c){return c.h;}));
    var l1 = Math.min.apply(null, firstHalf.map(function(c){return c.l;}));
    var l2 = Math.min.apply(null, secondHalf.map(function(c){return c.l;}));

    var last50 = cs.slice(-50);
    var support = Math.min.apply(null, last50.map(function(c){return c.l;}));
    var resistance = Math.max.apply(null, last50.map(function(c){return c.h;}));
    var distSupportPct = support ? pct(latest, support) : 999;
    var distResistancePct = resistance ? pct(resistance, latest) : 999;

    var recentVol = avg(vols.slice(-5).filter(function(v){return v>0;}));
    var baseVol = avg(vols.slice(-25,-5).filter(function(v){return v>0;}));
    var volExpanding = baseVol > 0 && recentVol > baseVol * 1.25;

    var redCount = recent.filter(function(c){return color(c)==='red';}).length;
    var greenCount = recent.filter(function(c){return color(c)==='green';}).length;

    var dxy = ch('DXY');
    var ndx = ch('NDX');
    var spx = ch('SPX');
    var btc = ch('BTC');
    var eth = ch('ETH');
    var vix = num(riskData('VIX').change24h, 0);

    var bearScore = 0, bullScore = 0;
    var bearReasons = [], bullReasons = [];

    // Early bearish clues before full breakdown
    if(ema9 && latest < ema9){ bearScore += 10; bearReasons.push('price below EMA9'); }
    if(ema9 && ema21 && ema9 < ema21){ bearScore += 12; bearReasons.push('EMA9 below EMA21'); }
    if(ema50 && latest < ema50){ bearScore += 8; bearReasons.push('price below EMA50'); }
    if(h2 < h1){ bearScore += 10; bearReasons.push('lower highs forming'); }
    if(l2 <= l1){ bearScore += 8; bearReasons.push('lows under pressure'); }
    if(redCount >= 6){ bearScore += 10; bearReasons.push('red candle pressure'); }
    if(pct(latest, prev3) < -0.25){ bearScore += 8; bearReasons.push('short-term negative momentum'); }
    if(pct(latest, prev6) < -0.55){ bearScore += 8; bearReasons.push('multi-candle sell pressure'); }
    if(distSupportPct < 0.45){ bearScore += 8; bearReasons.push('price close to support breakdown'); }
    if(volExpanding && redCount >= greenCount){ bearScore += 10; bearReasons.push('volume expanding on weakness'); }
    if(dxy > 0.35 || vix > 5 || ndx < -0.8 || spx < -0.7){ bearScore += 10; bearReasons.push('macro risk-off pressure'); }
    if(btc < -1.2 || eth < -1.2){ bearScore += 8; bearReasons.push('crypto majors weak'); }

    // Early bullish clues before full breakout
    if(ema9 && latest > ema9){ bullScore += 10; bullReasons.push('price above EMA9'); }
    if(ema9 && ema21 && ema9 > ema21){ bullScore += 12; bullReasons.push('EMA9 above EMA21'); }
    if(ema50 && latest > ema50){ bullScore += 8; bullReasons.push('price above EMA50'); }
    if(h2 >= h1){ bullScore += 8; bullReasons.push('highs improving'); }
    if(l2 > l1){ bullScore += 10; bullReasons.push('higher lows forming'); }
    if(greenCount >= 6){ bullScore += 10; bullReasons.push('green candle pressure'); }
    if(pct(latest, prev3) > 0.25){ bullScore += 8; bullReasons.push('short-term positive momentum'); }
    if(distResistancePct < 0.45){ bullScore += 7; bullReasons.push('price near breakout zone'); }
    if(volExpanding && greenCount >= redCount){ bullScore += 10; bullReasons.push('volume expanding on strength'); }
    if(dxy < -0.35 || vix < -5 || ndx > 0.8 || spx > 0.7){ bullScore += 8; bullReasons.push('macro risk-on support'); }
    if(btc > 1.2 || eth > 1.2){ bullScore += 8; bullReasons.push('crypto majors strong'); }

    var direction = 'neutral';
    var score = 35;
    var reasons = [];

    if(bearScore >= bullScore + 12){
      direction = 'bearish_risk';
      score = Math.max(35, Math.min(100, 35 + bearScore - Math.round(bullScore*0.35)));
      reasons = bearReasons.slice(0,6);
    }else if(bullScore >= bearScore + 12){
      direction = 'bullish_setup';
      score = Math.max(35, Math.min(100, 35 + bullScore - Math.round(bearScore*0.35)));
      reasons = bullReasons.slice(0,6);
    }else{
      direction = 'mixed';
      score = Math.max(30, Math.min(60, 40 + Math.abs(bullScore-bearScore)));
      reasons = ['mixed early signals'];
    }

    var level = score >= 78 ? 'HIGH' : score >= 55 ? 'MEDIUM' : 'LOW';
    var msg;
    if(ru()){
      msg = direction === 'bearish_risk'
        ? (level === 'HIGH' ? 'Риск резкого пробоя вниз высокий: лонги опасны до подтверждения.' : 'Есть ранние признаки давления вниз.')
        : direction === 'bullish_setup'
          ? (level === 'HIGH' ? 'Есть ранние признаки сильного бычьего импульса.' : 'Есть ранние признаки улучшения структуры.')
          : 'Ранние сигналы смешанные.';
    }else{
      msg = direction === 'bearish_risk'
        ? (level === 'HIGH' ? 'High risk of sharp breakdown: longs are dangerous before confirmation.' : 'Early downside pressure is building.')
        : direction === 'bullish_setup'
          ? (level === 'HIGH' ? 'Early signs of strong bullish impulse.' : 'Early signs of improving structure.')
          : 'Early signals are mixed.';
    }

    return {
      ready:true,
      asset:asset,
      frame:pack.frame,
      direction:direction,
      score:Math.round(score),
      level:level,
      message:msg,
      reasons:reasons,
      stats:{
        latest:latest,
        ema9:ema9,
        ema21:ema21,
        ema50:ema50,
        support:support,
        resistance:resistance,
        distSupportPct:distSupportPct,
        redCount:redCount,
        greenCount:greenCount,
        volumeExpanding:volExpanding,
        bearScore:bearScore,
        bullScore:bullScore
      }
    };
  };

  function applyEarlyMove(asset, forecast){
    if(!window.ZYNQEL_EARLY_MOVE.enabled || !forecast) return forecast;

    var e = window.zynqelEarlyMoveWarning(asset);
    forecast.earlyMoveWarning = e;
    forecast.factors = forecast.factors || [];
    forecast.factors.unshift(e.ready ? ('Early move: '+e.direction+' '+e.score+'/100') : 'Early move: loading');

    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
    if(e.ready && e.score >= window.ZYNQEL_EARLY_MOVE.warnScore){
      forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(
        ru()
          ? ('Early Move Warning: '+e.level+' '+e.score+'/100. '+e.message+' Причины: '+e.reasons.join('; ')+'.')
          : ('Early Move Warning: '+e.level+' '+e.score+'/100. '+e.message+' Reasons: '+e.reasons.join('; ')+'.')
      );
    }

    // Non-conflict: do not force SELL here. SELL override still decides SELL.
    // This layer only blocks dangerous BUY before the dump is fully confirmed.
    var action = String(forecast.action || '').toLowerCase();
    if(action === 'buy' && e.ready && e.direction === 'bearish_risk' && e.score >= window.ZYNQEL_EARLY_MOVE.blockBuyScore){
      forecast.preEarlyMoveAction = 'buy';
      forecast.action = 'wait';
      forecast.sentiment = 'neutral';
      forecast.confidence = Math.max(45, Math.min(Number(forecast.confidence || 60) - 14, 62));
      forecast.probability = Math.min(Number(forecast.probability || 50), 54);
      forecast.upwardProbability = forecast.probability;
      forecast.waitFor = ru()
        ? 'Early warning против лонга: дождаться возврата выше EMA9/EMA21 и прекращения красного объёма'
        : 'Early warning against long: wait for EMA9/EMA21 reclaim and red-volume pressure to stop';
      forecast.entry = ru()
        ? 'Лонг заблокирован ранним свечным риском'
        : 'Long blocked by early candle-risk warning';
      forecast.entryZone = forecast.entry;
      forecast.zone = forecast.entry;
      forecast.source = (forecast.source || 'V7') + ' + EARLY WARNING';
    }

    return forecast;
  }

  window.zynqelApplyEarlyMoveWarning = applyEarlyMove;

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__earlyMoveWarning){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var out = await oldGenerate.apply(this, arguments);
      try{ out = applyEarlyMove(assetId, out); }catch(e){ console.warn('Early move warning failed:', e.message); }
      return out;
    };
    window.generateForecast.__earlyMoveWarning = true;
  }

  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__earlyMoveWarning){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = applyEarlyMove(assetId, out); }catch(e){ console.warn('Early move after normalize failed:', e.message); }
      return out;
    };
    window.normalizeForecast.__earlyMoveWarning = true;
  }

  function injectEarlyCard(){
    try{
      var page = document.getElementById('page-analysis');
      if(page && !page.classList.contains('active')) return;
      var asset = window.currentAnalysisAsset || window.currentAsset;
      if(!asset || typeof window.zynqelEarlyMoveWarning !== 'function') return;
      var e = window.zynqelEarlyMoveWarning(asset);
      if(!e.ready || e.score < window.ZYNQEL_EARLY_MOVE.warnScore) return;

      var root = document.getElementById('analysis-content');
      if(!root) return;

      var old = document.getElementById('zynqel-early-move-card');
      if(old && old.parentNode) old.parentNode.removeChild(old);

      var color = e.direction === 'bearish_risk' ? 'var(--red)' : e.direction === 'bullish_setup' ? 'var(--green)' : 'var(--gold)';
      var title = ru() ? 'РАННЕЕ ПРЕДУПРЕЖДЕНИЕ ДВИЖЕНИЯ' : 'EARLY MOVE WARNING';
      var reasons = e.reasons.slice(0,4).join(' • ');
      var html = '<div id="zynqel-early-move-card" class="card" style="margin-bottom:12px;border-color:'+color+'44;background:rgba(255,255,255,.025);">' +
        '<div class="card-title" style="margin-bottom:8px;">'+title+'</div>' +
        '<div style="font-family:JetBrains Mono,monospace;font-size:22px;font-weight:800;color:'+color+';">'+e.level+' '+e.score+'/100</div>' +
        '<div style="font-size:13px;color:var(--text);margin-top:6px;line-height:1.45;">'+e.message+'</div>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.45;">'+reasons+'</div>' +
      '</div>';

      var riskCard = document.getElementById('zynqel-market-risk-card');
      if(riskCard) riskCard.insertAdjacentHTML('afterend', html);
      else {
        var firstCard = root.querySelector('.card');
        if(firstCard) firstCard.insertAdjacentHTML('beforebegin', html);
        else root.insertAdjacentHTML('afterbegin', html);
      }
    }catch(e){}
  }

  setInterval(injectEarlyCard, 2000);
})();


// ---- extracted inline script block 37 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL FINAL SCENARIO SYNC
// Makes Early Move / Early Entry actually reach final probability/action.
// Fix: Early Warning can show HIGH 100/100 while main card stays 50% WAIT.
// This layer synchronizes final forecast when early impulse is strong.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_FINAL_SCENARIO_SYNC = {
    enabled: true,
    earlyBuyMin: 82,
    earlySellMin: 82,
    hardBlockDerivatives: 16
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ru(){ return window.appLang === 'ru'; }
  function asset(){ return window.currentAnalysisAsset || window.currentAsset || 'BTC'; }
  function fmt(v){
    v = Number(v);
    if(!Number.isFinite(v)) return '--';
    if(v >= 1000) return '$' + v.toLocaleString(undefined,{maximumFractionDigits:2});
    if(v >= 1) return '$' + v.toFixed(4);
    return '$' + v.toFixed(6);
  }
  function candles(id){
    var f = window.z4CandleFrames && window.z4CandleFrames[id] ? window.z4CandleFrames[id] : {};
    if(f['15m'] && f['15m'].length >= 30) return f['15m'];
    if(f['1h'] && f['1h'].length >= 30) return f['1h'];
    if(window.candleData && window.candleData[id] && window.candleData[id].length >= 30) return window.candleData[id];
    return [];
  }
  function recentLevels(id){
    var cs = candles(id);
    if(!cs.length){
      var p = num((window.liveData && window.liveData[id] || {}).price, 0);
      return {price:p, low:p*0.99, high:p*1.01, range:p*0.02};
    }
    var last = cs[cs.length-1];
    var recent = cs.slice(-12);
    var low = Math.min.apply(null, recent.map(function(c){return num(c.l,0);}).filter(Boolean));
    var high = Math.max.apply(null, recent.map(function(c){return num(c.h,0);}).filter(Boolean));
    var price = num(last.c, num((window.liveData && window.liveData[id] || {}).price, 0));
    return {price:price, low:low, high:high, range:Math.max(high-low, price*0.006)};
  }
  function getSignals(id){
    var earlyMove = null, earlyEntry = null, deriv = null, market = null;
    try{ if(typeof window.zynqelEarlyMoveWarning === 'function') earlyMove = window.zynqelEarlyMoveWarning(id); }catch(e){}
    try{ if(typeof window.zynqelEarlyEntrySignal === 'function') earlyEntry = window.zynqelEarlyEntrySignal(id); }catch(e){}
    try{ if(typeof window.zynqelDerivativesSignal === 'function') deriv = window.zynqelDerivativesSignal(id); }catch(e){}
    try{ if(typeof window.zynqelMarketRiskEarlyWarning === 'function') market = window.zynqelMarketRiskEarlyWarning(id); }catch(e){}
    return {earlyMove:earlyMove, earlyEntry:earlyEntry, deriv:deriv, market:market};
  }

  function syncForecast(id, forecast){
    if(!window.ZYNQEL_FINAL_SCENARIO_SYNC.enabled || !forecast) return forecast;

    var s = getSignals(id);
    var lv = recentLevels(id);
    var derivScore = s.deriv && Number.isFinite(Number(s.deriv.score)) ? Number(s.deriv.score) : 0;
    var earlyMoveScore = s.earlyMove && Number.isFinite(Number(s.earlyMove.score)) ? Number(s.earlyMove.score) : 0;
    var earlyEntryScore = s.earlyEntry && Number.isFinite(Number(s.earlyEntry.score)) ? Number(s.earlyEntry.score) : 0;
    var earlyDir = (s.earlyEntry && s.earlyEntry.direction) || (s.earlyMove && s.earlyMove.direction) || 'wait';
    var action = String(forecast.action || 'wait').toLowerCase();
    var conf = num(forecast.confidence, 50);
    var prob = num(forecast.probability, 50);

    forecast.factors = forecast.factors || [];
    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);

    var bullStrong = (
      (earlyDir === 'early_buy' && earlyEntryScore >= window.ZYNQEL_FINAL_SCENARIO_SYNC.earlyBuyMin) ||
      (earlyDir === 'bullish_setup' && earlyMoveScore >= 90)
    );
    var bearStrong = (
      (earlyDir === 'early_sell' && earlyEntryScore >= window.ZYNQEL_FINAL_SCENARIO_SYNC.earlySellMin) ||
      (earlyDir === 'bearish_risk' && earlyMoveScore >= 90)
    );

    // Do not let a mild derivative disagreement erase a 100/100 early move.
    // But if derivatives are strongly opposite, keep WAIT instead of forcing entry.
    var derivHardAgainstBuy = derivScore <= -window.ZYNQEL_FINAL_SCENARIO_SYNC.hardBlockDerivatives;
    var derivHardAgainstSell = derivScore >= window.ZYNQEL_FINAL_SCENARIO_SYNC.hardBlockDerivatives;

    if(bullStrong && !derivHardAgainstBuy){
      var bullProb = Math.max(prob, Math.min(74, 58 + Math.round((Math.max(earlyMoveScore, earlyEntryScore)-80)/3) - Math.max(0, Math.round(Math.abs(Math.min(0,derivScore))/4))));
      var bullConf = Math.max(conf, Math.min(78, 64 + Math.round((Math.max(earlyMoveScore, earlyEntryScore)-80)/4) - Math.max(0, Math.round(Math.abs(Math.min(0,derivScore))/5))));
      forecast.action = 'buy';
      forecast.sentiment = 'bullish';
      forecast.isEarlyEntry = true;
      forecast.probability = bullProb;
      forecast.upwardProbability = bullProb;
      forecast.confidence = bullConf;
      forecast.entryZone = fmt(Math.min(lv.price, lv.high*0.996)) + ' - ' + fmt(Math.max(lv.price, lv.high));
      forecast.zone = forecast.entryZone;
      forecast.invalidation = fmt(Math.max(lv.low, lv.price - lv.range*0.65));
      forecast.target1 = fmt(lv.price + lv.range*0.75);
      forecast.waitFor = ru()
        ? 'Ранний BUY активен: цена должна удержаться выше EMA9/EMA21 и объём не должен резко упасть'
        : 'Early BUY active: price should hold above EMA9/EMA21 and volume should not fade';
      forecast.shortTerm = ru()
        ? '24ч: ранний бычий сценарий активен при удержании ' + forecast.entryZone
        : '24h: early bullish scenario active while holding ' + forecast.entryZone;
      forecast.midTerm = ru()
        ? '7д: bull ' + bullProb + '% / bear ' + Math.max(20,100-bullProb-4) + '% / neutral 4%'
        : '7d: bull ' + bullProb + '% / bear ' + Math.max(20,100-bullProb-4) + '% / neutral 4%';
      forecast.reasoning = (ru()
        ? 'Early BUY синхронизирован с финальным прогнозом: ранний импульс сильный, цена выше ключевых EMA. '
        : 'Early BUY synchronized with final forecast: early impulse is strong and price is above key EMAs. ') + String(forecast.reasoning || '');
      forecast.factors.unshift('Final sync: Early BUY');
      forecast.factors.unshift('Early move score: '+Math.max(earlyMoveScore, earlyEntryScore)+'/100');
      forecast.source = (forecast.source || 'V7') + ' + FINAL SYNC';
    }

    if(bearStrong && !derivHardAgainstSell){
      var bearConf = Math.max(conf, Math.min(78, 64 + Math.round((Math.max(earlyMoveScore, earlyEntryScore)-80)/4) - Math.max(0, Math.round(Math.max(0,derivScore)/5))));
      var upProb = Math.min(prob, Math.max(22, 42 - Math.round((Math.max(earlyMoveScore, earlyEntryScore)-80)/4) + Math.max(0, Math.round(Math.max(0,derivScore)/5))));
      forecast.action = 'sell';
      forecast.sentiment = 'bearish';
      forecast.isEarlyEntry = true;
      forecast.probability = upProb;
      forecast.upwardProbability = upProb;
      forecast.confidence = bearConf;
      forecast.entryZone = fmt(Math.min(lv.price, lv.low)) + ' - ' + fmt(Math.max(lv.price, lv.low*1.004));
      forecast.zone = forecast.entryZone;
      forecast.invalidation = fmt(Math.min(lv.high, lv.price + lv.range*0.65));
      forecast.target1 = fmt(lv.price - lv.range*0.75);
      forecast.waitFor = ru()
        ? 'Ранний SELL активен: цена должна оставаться ниже EMA9/EMA21 и давление объёма сохраняться'
        : 'Early SELL active: price should remain below EMA9/EMA21 and volume pressure should persist';
      forecast.shortTerm = ru()
        ? '24ч: ранний медвежий сценарий активен при удержании ниже ' + forecast.entryZone
        : '24h: early bearish scenario active while staying below ' + forecast.entryZone;
      forecast.midTerm = ru()
        ? '7д: bull ' + upProb + '% / bear ' + Math.max(50,100-upProb-4) + '% / neutral 4%'
        : '7d: bull ' + upProb + '% / bear ' + Math.max(50,100-upProb-4) + '% / neutral 4%';
      forecast.reasoning = (ru()
        ? 'Early SELL синхронизирован с финальным прогнозом: ранний риск пробоя высокий. '
        : 'Early SELL synchronized with final forecast: early breakdown risk is high. ') + String(forecast.reasoning || '');
      forecast.factors.unshift('Final sync: Early SELL');
      forecast.factors.unshift('Early move score: '+Math.max(earlyMoveScore, earlyEntryScore)+'/100');
      forecast.source = (forecast.source || 'V7') + ' + FINAL SYNC';
    }

    // If early move is extreme but derivatives hard-conflict, make that visible instead of leaving mysterious 50%.
    if((bullStrong && derivHardAgainstBuy) || (bearStrong && derivHardAgainstSell)){
      forecast.action = 'wait';
      forecast.sentiment = 'neutral';
      forecast.confidence = Math.max(conf, 62);
      forecast.probability = 50;
      forecast.shortTerm = ru()
        ? '24ч: сильный ранний импульс, но деривативы против — вход только после подтверждения'
        : '24h: strong early impulse, but derivatives conflict — enter only after confirmation';
      forecast.midTerm = ru()
        ? '7д: mixed scenario — нужен пробой/ретест'
        : '7d: mixed scenario — breakout/retest required';
      forecast.waitFor = ru()
        ? 'Подтверждение: Early Move и Derivatives должны совпасть в одну сторону'
        : 'Confirmation: Early Move and Derivatives must align';
      forecast.factors.unshift('Final sync: conflict WAIT');
    }

    return forecast;
  }

  window.zynqelFinalScenarioSync = syncForecast;

  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__finalScenarioSync){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = syncForecast(assetId || asset(), out); }catch(e){ console.warn('Final scenario sync failed:', e.message); }
      return out;
    };
    window.normalizeForecast.__finalScenarioSync = true;
  }

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__finalScenarioSync){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || asset();
      var out = await oldGenerate.apply(this, arguments);
      try{ out = syncForecast(assetId, out); }catch(e){ console.warn('Final scenario sync gen failed:', e.message); }
      return out;
    };
    window.generateForecast.__finalScenarioSync = true;
  }
})();
