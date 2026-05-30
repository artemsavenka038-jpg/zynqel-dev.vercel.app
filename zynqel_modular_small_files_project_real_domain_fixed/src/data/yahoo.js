// ZYNQEL data/yahoo.js
// Extracted from original marketData.js. Classic global script, not module.

// ---- extracted inline script block 15 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V6 DECISION ENGINE
// Local engine is the decision maker. Groq is the analyst/explainer.
// Goal: more stable forecasts, fewer random flips, no Groq guessing weak signals.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_V6 = {
    enabled: true,
    engineWeight: 0.7,
    groqWeight: 0.3,
    minTradeConfluence: 62,
    strongTradeConfluence: 72,
    flipCooldownMs: 15 * 60 * 1000,
    hardFlipConfluence: 78,
    requireEdge: 12,
    memory: window.ZYNQEL_V6 && window.ZYNQEL_V6.memory ? window.ZYNQEL_V6.memory : {}
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ru(){ return window.appLang === 'ru'; }
  function assetPrice(asset){
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
  function assetCfg(asset){
    try{ return (window.ASSETS || []).find(function(a){ return a.id === asset; }) || {id:asset, category:'unknown', name:asset}; }catch(e){}
    return {id:asset, category:'unknown', name:asset};
  }
  function supportResistance(asset, price, td, ci){
    var support = num(td && td.support, null) || num(ci && ci.support, null) || (price ? price*0.985 : null);
    var resistance = num(td && td.resistance, null) || num(ci && ci.resistance, null) || (price ? price*1.015 : null);
    return {support:support, resistance:resistance};
  }

  function v6LocalDecision(asset){
    var cfg = assetCfg(asset);
    var price = assetPrice(asset);
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : {};
    var td = tech(asset);
    var ci = candle(asset);
    var sr = supportResistance(asset, price, td, ci);

    var change1h = num(d.change1h, 0);
    var change24 = num(d.change24h, 0);
    var change7d = num(d.change7d, 0);
    var rsi = num(td.rsi, 50);
    var macdHist = num(td.macdHist, 0);
    var trend = String(td.trend || 'neutral').toLowerCase();
    var candleBias = String(ci.bias || 'neutral').toLowerCase();
    var candleScore = num(ci.score, 0);
    var fg = num(window.fearGreed, 50);
    var dxy = window.liveData && window.liveData.DXY ? num(window.liveData.DXY.change24h, 0) : 0;
    var vix = window.marketRiskData && window.marketRiskData.VIX ? num(window.marketRiskData.VIX.change24h, 0) : 0;
    var oil = window.marketRiskData && window.marketRiskData.OIL ? num(window.marketRiskData.OIL.change24h, 0) : 0;
    var us10y = window.marketRiskData && window.marketRiskData.US10Y ? num(window.marketRiskData.US10Y.change24h, 0) : 0;

    var bull = 0, bear = 0, factors = [];

    // Technical trend
    if(trend === 'bullish'){ bull += 16; factors.push('EMA/trend bullish'); }
    else if(trend === 'bearish'){ bear += 16; factors.push('EMA/trend bearish'); }
    else factors.push('EMA/trend neutral');

    // RSI
    if(rsi >= 60){ bull += 12; factors.push('RSI bullish'); }
    else if(rsi <= 40){ bear += 12; factors.push('RSI bearish'); }
    else if(rsi >= 54){ bull += 5; factors.push('RSI slightly bullish'); }
    else if(rsi <= 46){ bear += 5; factors.push('RSI slightly bearish'); }
    else factors.push('RSI neutral');

    // MACD
    if(macdHist > 0){ bull += 10; factors.push('MACD positive'); }
    else if(macdHist < 0){ bear += 10; factors.push('MACD negative'); }

    // Momentum
    if(change24 > 2){ bull += 10; factors.push('24h momentum strong'); }
    else if(change24 > 0.8){ bull += 5; factors.push('24h momentum positive'); }
    else if(change24 < -2){ bear += 10; factors.push('24h momentum weak'); }
    else if(change24 < -0.8){ bear += 5; factors.push('24h momentum negative'); }

    if(change7d > 4){ bull += 6; factors.push('7d trend positive'); }
    if(change7d < -4){ bear += 6; factors.push('7d trend negative'); }

    // Candles
    if(candleBias === 'bullish'){ bull += Math.min(20, Math.abs(candleScore) + 6); factors.push('multi-timeframe candles bullish'); }
    else if(candleBias === 'bearish'){ bear += Math.min(20, Math.abs(candleScore) + 6); factors.push('multi-timeframe candles bearish'); }
    else factors.push('candle structure neutral');

    // Macro weighting by asset category
    if(cfg.category === 'crypto'){
      if(fg > 60){ bull += 6; factors.push('crypto sentiment supportive'); }
      if(fg < 40){ bear += 6; factors.push('crypto sentiment fearful'); }
      if(vix > 3){ bear += 5; factors.push('VIX risk-off'); }
      if(vix < -3){ bull += 4; factors.push('VIX easing'); }
      if(dxy > 0.25){ bear += 4; factors.push('DXY pressure'); }
      if(dxy < -0.25){ bull += 4; factors.push('DXY weakness supportive'); }
    } else if(cfg.category === 'metals'){
      if(dxy > 0.25){ bear += 7; factors.push('strong dollar pressures metals'); }
      if(dxy < -0.25){ bull += 7; factors.push('weak dollar supports metals'); }
      if(us10y > 1){ bear += 5; factors.push('yields pressure metals'); }
      if(us10y < -1){ bull += 5; factors.push('yields easing'); }
      if(vix > 4){ bull += 3; factors.push('risk hedge demand'); }
    } else if(cfg.category === 'forex'){
      if(asset === 'DXY'){
        if(dxy > 0.15){ bull += 8; factors.push('DXY momentum positive'); }
        if(dxy < -0.15){ bear += 8; factors.push('DXY momentum negative'); }
      } else {
        if(dxy > 0.25){ bear += 8; factors.push('USD strength pressures pair'); }
        if(dxy < -0.25){ bull += 8; factors.push('USD weakness supports pair'); }
      }
    } else if(cfg.category === 'indices'){
      if(vix > 3){ bear += 8; factors.push('VIX risk-off for equities'); }
      if(vix < -3){ bull += 7; factors.push('VIX easing supports equities'); }
      if(us10y > 1){ bear += 5; factors.push('yields pressure equities'); }
      if(oil > 3){ bear += 2; factors.push('oil inflation pressure'); }
    }

    // Level position
    if(price && sr.support && sr.resistance){
      var range = Math.max(0.0000001, sr.resistance - sr.support);
      var pos = (price - sr.support) / range;
      if(pos < 0.22 && (rsi < 45 || candleBias === 'bullish')){ bull += 5; factors.push('price near support'); }
      if(pos > 0.78 && (rsi > 55 || candleBias === 'bearish')){ bear += 5; factors.push('price near resistance'); }
    }

    var edge = Math.abs(bull - bear);
    var rawTotal = bull + bear;
    var confluence = Math.round(Math.max(35, Math.min(92, 42 + edge + Math.min(20, rawTotal / 4))));
    var action = 'wait';
    if(confluence >= window.ZYNQEL_V6.minTradeConfluence && edge >= window.ZYNQEL_V6.requireEdge){
      action = bull > bear ? 'buy' : 'sell';
    }

    // Memory / anti-flip
    var mem = window.ZYNQEL_V6.memory[asset] || {};
    var now = Date.now();
    var previous = mem.action || 'wait';
    var opposite = (previous === 'buy' && action === 'sell') || (previous === 'sell' && action === 'buy');
    if(opposite && (now - (mem.time || 0)) < window.ZYNQEL_V6.flipCooldownMs && confluence < window.ZYNQEL_V6.hardFlipConfluence){
      action = 'wait';
      factors.unshift('anti-flip filter active');
    }

    var confidence = confluence;
    var probability = action === 'buy' ? Math.min(82, Math.max(55, confidence)) :
                      action === 'sell' ? Math.max(18, Math.min(45, 100 - confidence)) : 50;

    var regime = confluence >= 75 ? 'strong_' + action : confluence >= 62 ? 'moderate_' + action : 'no_trade';
    if(action === 'wait') regime = 'mixed_no_edge';

    var decision = {
      asset: asset,
      category: cfg.category,
      source: 'V6 ENGINE',
      sentiment: action === 'buy' ? 'bullish' : action === 'sell' ? 'bearish' : 'neutral',
      action: action,
      probability: Math.round(probability),
      upwardProbability: Math.round(probability),
      confidence: confidence,
      bullScore: Math.round(bull),
      bearScore: Math.round(bear),
      edge: Math.round(edge),
      confluence: confluence,
      regime: regime,
      price: price,
      support: sr.support,
      resistance: sr.resistance,
      rsi: rsi,
      macdHist: macdHist,
      trend: trend,
      candleBias: candleBias,
      factors: factors.slice(0,6)
    };

    window.ZYNQEL_V6.memory[asset] = {action: action, confidence: confidence, regime: regime, time: now};
    return decision;
  }

  function decisionToForecast(asset, decision, groq){
    var isRu = ru();
    var price = decision.price || assetPrice(asset);
    var support = decision.support || (price ? price*0.985 : null);
    var resistance = decision.resistance || (price ? price*1.015 : null);
    var action = decision.action;

    // Groq can enrich text, but cannot override V6 unless V6 is weak/no-trade.
    if(groq && groq.action && decision.confluence < 62){
      action = 'wait';
    }

    var entry, target, invalidation, waitFor;
    if(action === 'buy'){
      entry = (isRu?'Зона покупки: ':'Buy zone: ') + fmt(Math.min(support, price*0.996), asset) + ' – ' + fmt(Math.max(support, price*1.003), asset);
      target = (isRu?'Цель: ':'Target: ') + fmt(resistance || price*1.02, asset);
      invalidation = (isRu?'Отмена: ниже ':'Invalidation: below ') + fmt(support || price*0.982, asset);
      waitFor = isRu ? 'Подтверждение объёма и удержание поддержки' : 'Volume confirmation and support hold';
    } else if(action === 'sell'){
      entry = (isRu?'Зона продажи: ':'Sell zone: ') + fmt(Math.min(resistance, price*0.997), asset) + ' – ' + fmt(Math.max(resistance, price*1.004), asset);
      target = (isRu?'Цель: ':'Target: ') + fmt(support || price*0.98, asset);
      invalidation = (isRu?'Отмена: выше ':'Invalidation: above ') + fmt(resistance || price*1.018, asset);
      waitFor = isRu ? 'Отбой от сопротивления или пробой поддержки с объёмом' : 'Resistance rejection or support breakdown with volume';
    } else {
      entry = price ? ((isRu?'Зона наблюдения: ':'Watch zone: ') + fmt(support, asset) + ' – ' + fmt(resistance, asset)) : (isRu?'Ожидание market feed':'Waiting for market feed');
      target = isRu ? 'После подтверждения направления' : 'After directional confirmation';
      invalidation = isRu ? 'Нет активной сделки до подтверждения' : 'No active trade until confirmation';
      waitFor = isRu ? 'Confluence выше 62, пробой/ретест уровня и подтверждение объёма' : 'Confluence above 62, breakout/retest and volume confirmation';
    }

    var reasoning = [];
    if(isRu){
      if(action === 'buy') reasoning.push('V6 Engine видит преимущество покупателей: confluence '+decision.confluence+'/100, bull/bear '+decision.bullScore+'/'+decision.bearScore+'.');
      else if(action === 'sell') reasoning.push('V6 Engine видит преимущество продавцов: confluence '+decision.confluence+'/100, bull/bear '+decision.bullScore+'/'+decision.bearScore+'.');
      else reasoning.push('V6 Engine не видит достаточного преимущества для сделки: confluence '+decision.confluence+'/100, bull/bear '+decision.bullScore+'/'+decision.bearScore+'.');
      reasoning.push('Учитываются RSI, EMA-тренд, MACD, свечная структура, волатильность, уровни и макро-факторы.');
      if(groq && groq.reasoning) reasoning.push('Groq explanation: '+(Array.isArray(groq.reasoning)?groq.reasoning.join(' '):String(groq.reasoning)));
    } else {
      if(action === 'buy') reasoning.push('V6 Engine sees buyer edge: confluence '+decision.confluence+'/100, bull/bear '+decision.bullScore+'/'+decision.bearScore+'.');
      else if(action === 'sell') reasoning.push('V6 Engine sees seller edge: confluence '+decision.confluence+'/100, bull/bear '+decision.bullScore+'/'+decision.bearScore+'.');
      else reasoning.push('V6 Engine does not see enough edge for a trade: confluence '+decision.confluence+'/100, bull/bear '+decision.bullScore+'/'+decision.bearScore+'.');
      reasoning.push('RSI, EMA trend, MACD, candle structure, volatility, levels and macro factors are included.');
      if(groq && groq.reasoning) reasoning.push('Groq explanation: '+(Array.isArray(groq.reasoning)?groq.reasoning.join(' '):String(groq.reasoning)));
    }

    var forecast = {
      source: groq ? 'V6 ENGINE + GROQ EXPLAINER' : 'V6 ENGINE',
      sentiment: action === 'buy' ? 'bullish' : action === 'sell' ? 'bearish' : 'neutral',
      action: action,
      probability: action === 'buy' ? decision.probability : action === 'sell' ? decision.probability : 50,
      upwardProbability: action === 'buy' ? decision.probability : action === 'sell' ? decision.probability : 50,
      confidence: decision.confidence,
      entryZone: entry,
      entry: entry,
      zone: entry,
      invalidation: invalidation,
      target1: target,
      target: target,
      waitFor: waitFor,
      shortTerm: action === 'wait' ? (isRu?'24ч: ждать подтверждения':'24h: wait for confirmation') : (isRu?'24ч: сценарий активен при подтверждении':'24h: scenario active with confirmation'),
      midTerm: isRu?'7д: зависит от удержания ключевых уровней':'7d: depends on key level hold',
      reasoning: reasoning.slice(0,4),
      factors: [
        'V6 confluence: '+decision.confluence+'/100',
        'Bull/Bear: '+decision.bullScore+'/'+decision.bearScore,
        'RSI: '+Math.round(decision.rsi),
        'Trend: '+decision.trend,
        'Candles: '+decision.candleBias
      ],
      v6Decision: decision
    };

    return forecast;
  }

  window.zynqelV6Decision = v6LocalDecision;
  window.zynqelV6Forecast = function(asset){ return decisionToForecast(asset, v6LocalDecision(asset), null); };

  // Wrap generateForecast: V6 decides; Groq explains only when signal is good enough.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__v6Wrapped){
    var oldGenerate = window.generateForecast;
    var wrappedGenerate = async function(assetId, opts){
      opts = opts || {};
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';

      if(!window.ZYNQEL_V6.enabled){
        return oldGenerate.apply(this, arguments);
      }

      var decision = v6LocalDecision(assetId);

      // If weak signal, do not ask Groq to guess.
      if(decision.action === 'wait' || decision.confluence < window.ZYNQEL_V6.minTradeConfluence){
        if(typeof window.setGroqStatus === 'function') window.setGroqStatus('V6 ENGINE: no Groq / no edge', 'warn');
        var noTrade = decisionToForecast(assetId, decision, null);
        if(typeof window.normalizeForecast === 'function') noTrade = window.normalizeForecast(assetId, noTrade);
        if(typeof window.zynqelFinalNormalize === 'function') noTrade = window.zynqelFinalNormalize(assetId, noTrade);
        if(typeof window.zynqelCleanFinalForecast === 'function') noTrade = window.zynqelCleanFinalForecast(assetId, noTrade);
        noTrade.source = 'V6 ENGINE';
        return noTrade;
      }

      // Strong signal: call existing Groq path for explanation, then merge under V6 decision.
      try{
        if(typeof window.setGroqStatus === 'function') window.setGroqStatus('GROQ: explaining V6 signal', 'thinking');
        var groqForecast = await oldGenerate.apply(this, arguments);
        var merged = decisionToForecast(assetId, decision, groqForecast);
        if(typeof window.normalizeForecast === 'function') merged = window.normalizeForecast(assetId, merged);
        if(typeof window.zynqelFinalNormalize === 'function') merged = window.zynqelFinalNormalize(assetId, merged);
        if(typeof window.zynqelCleanFinalForecast === 'function') merged = window.zynqelCleanFinalForecast(assetId, merged);
        merged.source = 'V6 ENGINE + GROQ EXPLAINER';
        return merged;
      }catch(e){
        console.warn('V6 Groq explainer failed:', e.message);
        if(typeof window.setGroqStatus === 'function') window.setGroqStatus('V6 ENGINE: Groq unavailable', 'warn');
        return decisionToForecast(assetId, decision, null);
      }
    };
    wrappedGenerate.__v6Wrapped = true;
    window.generateForecast = wrappedGenerate;
  }

  function cleanV6Text(){
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
  setInterval(cleanV6Text, 1200);
})();


// ---- extracted inline script block 18 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V7 MACRO SHOCK LAYER
// News/alerts are not UI decoration; they become hidden macro-risk inputs.
// Prevents blind BUY/SELL when DXY/OIL/VIX/indices/metals/crypto show a shock.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_MACRO_SHOCK = {
    enabled: true,
    oilShockPct: 3.0,
    dxyShockPct: 0.35,
    vixShockPct: 5.0,
    indexShockPct: 1.2,
    cryptoShockPct: 3.0,
    metalsShockPct: 1.0,
    blockTradeImpact: 14
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }

  function ld(id){
    return window.liveData && window.liveData[id] ? window.liveData[id] : {};
  }

  function ch(id){
    return num(ld(id).change24h, 0);
  }

  function cfg(asset){
    try{ return (window.ASSETS || []).find(function(a){return a.id === asset;}) || {id:asset, category:'unknown'}; }catch(e){}
    return {id:asset, category:'unknown'};
  }

  function headlinesFor(asset){
    try{
      var c = cfg(asset);
      return (window.allNews || []).filter(function(n){
        var t = ((n.title||'')+' '+(n.summary||'')+' '+((n.assets||[]).join(' '))).toLowerCase();
        if((n.assets || []).indexOf(asset) >= 0) return true;
        if(c.category === 'crypto') return /bitcoin|crypto|ethereum|etf|fed|sec|binance|liquidity|risk|dollar|rate/.test(t);
        if(c.category === 'metals') return /gold|silver|xau|xag|inflation|dollar|dxy|yield|fed|war|oil|commodity/.test(t);
        if(c.category === 'forex') return /dollar|dxy|fed|ecb|boe|rate|cpi|inflation|yield|jobs|gdp/.test(t);
        if(c.category === 'indices') return /nasdaq|s&p|spx|stocks|earnings|fed|rate|yield|vix|oil|inflation|ai|tech/.test(t);
        return false;
      }).slice(0,6).map(function(n){ return n.title || ''; });
    }catch(e){ return []; }
  }

  window.zynqelBuildMacroShockContext = function(asset){
    var c = cfg(asset);
    var dxy = ch('DXY');
    var btc = ch('BTC');
    var eth = ch('ETH');
    var xau = ch('XAU');
    var xag = ch('XAG');
    var spx = ch('SPX');
    var ndx = ch('NDX');

    var vix = window.marketRiskData && window.marketRiskData.VIX ? num(window.marketRiskData.VIX.change24h, 0) : 0;
    var oil = window.marketRiskData && window.marketRiskData.OIL ? num(window.marketRiskData.OIL.change24h, 0) : 0;
    var us10y = window.marketRiskData && window.marketRiskData.US10Y ? num(window.marketRiskData.US10Y.change24h, 0) : 0;

    var shocks = [];
    var pressure = 0; // positive supports asset, negative pressures asset
    var risk = 'normal';

    // Global risk-off / risk-on
    if(vix >= window.ZYNQEL_MACRO_SHOCK.vixShockPct){
      shocks.push('VIX spike: risk-off pressure');
      pressure -= 8;
      risk = 'risk_off';
    }
    if(vix <= -window.ZYNQEL_MACRO_SHOCK.vixShockPct){
      shocks.push('VIX falling: risk-on support');
      pressure += 5;
      risk = 'risk_on';
    }

    // Dollar shock
    if(dxy >= window.ZYNQEL_MACRO_SHOCK.dxyShockPct){
      shocks.push('DXY rising: USD strength');
      if(c.category === 'crypto' || c.category === 'metals' || c.category === 'indices') pressure -= 7;
      if(c.category === 'forex' && asset !== 'DXY') pressure -= 8;
      if(asset === 'DXY') pressure += 10;
    }
    if(dxy <= -window.ZYNQEL_MACRO_SHOCK.dxyShockPct){
      shocks.push('DXY falling: USD weakness');
      if(c.category === 'crypto' || c.category === 'metals' || c.category === 'indices') pressure += 6;
      if(c.category === 'forex' && asset !== 'DXY') pressure += 8;
      if(asset === 'DXY') pressure -= 10;
    }

    // Oil shock: not a direct silver rule; treat as inflation/risk/macro catalyst.
    if(oil <= -window.ZYNQEL_MACRO_SHOCK.oilShockPct){
      shocks.push('Oil sharp drop: possible demand/deflation risk');
      if(c.category === 'indices' || c.category === 'crypto') pressure -= 4;
      if(c.category === 'metals'){
        pressure -= 5; // demand/industrial metals risk; silver more exposed than gold
        if(asset === 'XAG') pressure -= 4;
      }
    }
    if(oil >= window.ZYNQEL_MACRO_SHOCK.oilShockPct){
      shocks.push('Oil sharp rise: inflation pressure');
      if(c.category === 'indices') pressure -= 4;
      if(c.category === 'metals') pressure += 3;
    }

    // Index shock
    if(spx <= -window.ZYNQEL_MACRO_SHOCK.indexShockPct || ndx <= -window.ZYNQEL_MACRO_SHOCK.indexShockPct){
      shocks.push('US indices falling: broad risk pressure');
      if(c.category === 'crypto' || c.category === 'indices') pressure -= 7;
      if(asset === 'XAG') pressure -= 3;
    }
    if(spx >= window.ZYNQEL_MACRO_SHOCK.indexShockPct || ndx >= window.ZYNQEL_MACRO_SHOCK.indexShockPct){
      shocks.push('US indices rising: risk appetite');
      if(c.category === 'crypto' || c.category === 'indices') pressure += 6;
    }

    // Crypto benchmark shock
    if(c.category === 'crypto'){
      if(btc <= -window.ZYNQEL_MACRO_SHOCK.cryptoShockPct || eth <= -window.ZYNQEL_MACRO_SHOCK.cryptoShockPct){
        shocks.push('BTC/ETH selloff: crypto beta pressure');
        pressure -= 9;
      }
      if(btc >= window.ZYNQEL_MACRO_SHOCK.cryptoShockPct || eth >= window.ZYNQEL_MACRO_SHOCK.cryptoShockPct){
        shocks.push('BTC/ETH rally: crypto beta support');
        pressure += 8;
      }
    }

    // Metals cross-check
    if(c.category === 'metals'){
      if(xau <= -window.ZYNQEL_MACRO_SHOCK.metalsShockPct && xag <= -window.ZYNQEL_MACRO_SHOCK.metalsShockPct){
        shocks.push('Gold and silver both weak: metals pressure');
        pressure -= 8;
      }
      if(xau >= window.ZYNQEL_MACRO_SHOCK.metalsShockPct && xag >= window.ZYNQEL_MACRO_SHOCK.metalsShockPct){
        shocks.push('Gold and silver both strong: metals support');
        pressure += 8;
      }
    }

    var severity = Math.abs(pressure);
    var blockBuy = pressure <= -window.ZYNQEL_MACRO_SHOCK.blockTradeImpact;
    var blockSell = pressure >= window.ZYNQEL_MACRO_SHOCK.blockTradeImpact;

    return {
      asset: asset,
      category: c.category,
      pressure_score: Math.max(-25, Math.min(25, Math.round(pressure))),
      risk_regime: risk,
      severity: severity >= 18 ? 'high' : severity >= 10 ? 'medium' : 'low',
      block_buy: blockBuy,
      block_sell: blockSell,
      shocks: shocks.slice(0,6),
      market_snapshot: {
        dxy24h: dxy,
        oil24h: oil,
        vix24h: vix,
        us10y24h: us10y,
        btc24h: btc,
        eth24h: eth,
        spx24h: spx,
        ndx24h: ndx,
        xau24h: xau,
        xag24h: xag
      },
      headlines: headlinesFor(asset)
    };
  };

  // Patch V7 combine to include macro shock before final decision.
  if(typeof window.zynqelV7Combine === 'function' && !window.zynqelV7Combine.__macroShockWrapped){
    var oldCombine = window.zynqelV7Combine;
    var wrappedCombine = function(asset, v6, news){
      var macro = window.zynqelBuildMacroShockContext(asset);
      news = news || {};
      news.news_score = num(news.news_score, 0) + Math.round(macro.pressure_score * 0.65);
      news.macro_score = num(news.macro_score, 0) + Math.round(macro.pressure_score * 0.35);
      news.summary = (news.summary ? news.summary + ' ' : '') + (macro.shocks.length ? ('Macro shocks: '+macro.shocks.join('; ')) : 'No major macro shock.');
      news.macroShock = macro;

      var forecast = oldCombine.call(this, asset, v6, news);

      // Hard risk control: if macro strongly conflicts, downgrade to WAIT.
      if(forecast && macro.block_buy && forecast.action === 'buy'){
        forecast.action = 'wait';
        forecast.sentiment = 'neutral';
        forecast.probability = 50;
        forecast.upwardProbability = 50;
        forecast.confidence = Math.max(45, Math.min(num(forecast.confidence, 55), 64));
        forecast.waitFor = window.appLang === 'ru'
          ? 'Макро-риск против покупки: дождаться стабилизации DXY/OIL/VIX/индексов'
          : 'Macro risk conflicts with BUY: wait for DXY/OIL/VIX/indices stabilization';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(window.appLang === 'ru'
          ? 'V7 Macro Shock заблокировал BUY: '+macro.shocks.join('; ')
          : 'V7 Macro Shock blocked BUY: '+macro.shocks.join('; '));
      }
      if(forecast && macro.block_sell && forecast.action === 'sell'){
        forecast.action = 'wait';
        forecast.sentiment = 'neutral';
        forecast.probability = 50;
        forecast.upwardProbability = 50;
        forecast.confidence = Math.max(45, Math.min(num(forecast.confidence, 55), 64));
        forecast.waitFor = window.appLang === 'ru'
          ? 'Макро-риск против продажи: дождаться подтверждения'
          : 'Macro risk conflicts with SELL: wait for confirmation';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(window.appLang === 'ru'
          ? 'V7 Macro Shock заблокировал SELL: '+macro.shocks.join('; ')
          : 'V7 Macro Shock blocked SELL: '+macro.shocks.join('; '));
      }

      forecast.macroShock = macro;
      forecast.factors = forecast.factors || [];
      forecast.factors.unshift('Macro shock: '+macro.pressure_score);
      return forecast;
    };
    wrappedCombine.__macroShockWrapped = true;
    window.zynqelV7Combine = wrappedCombine;
  }

  // If V7 generateForecast already captured old combine internally, wrap generateForecast as second safety layer.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__macroShockSafetyWrapped){
    var oldGenerate = window.generateForecast;
    var wrappedGenerate = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var forecast = await oldGenerate.apply(this, arguments);
      try{
        var macro = window.zynqelBuildMacroShockContext(assetId);
        forecast.macroShock = macro;
        forecast.factors = forecast.factors || [];
        if(!forecast.factors.some(function(f){return String(f).indexOf('Macro shock:') >= 0;})){
          forecast.factors.unshift('Macro shock: '+macro.pressure_score);
        }
        if(macro.block_buy && forecast.action === 'buy'){
          forecast.action = 'wait';
          forecast.sentiment = 'neutral';
          forecast.probability = 50;
          forecast.upwardProbability = 50;
          forecast.confidence = Math.max(45, Math.min(num(forecast.confidence, 55), 64));
          forecast.waitFor = window.appLang === 'ru'
            ? 'Макро-риск против покупки: дождаться стабилизации'
            : 'Macro risk conflicts with BUY: wait for stabilization';
          forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
          forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(window.appLang === 'ru'
            ? 'Макро-слой заблокировал покупку: '+macro.shocks.join('; ')
            : 'Macro layer blocked buy: '+macro.shocks.join('; '));
        }
        if(macro.block_sell && forecast.action === 'sell'){
          forecast.action = 'wait';
          forecast.sentiment = 'neutral';
          forecast.probability = 50;
          forecast.upwardProbability = 50;
          forecast.confidence = Math.max(45, Math.min(num(forecast.confidence, 55), 64));
          forecast.waitFor = window.appLang === 'ru'
            ? 'Макро-риск против продажи: дождаться подтверждения'
            : 'Macro risk conflicts with SELL: wait for confirmation';
          forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
          forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(window.appLang === 'ru'
            ? 'Макро-слой заблокировал продажу: '+macro.shocks.join('; ')
            : 'Macro layer blocked sell: '+macro.shocks.join('; '));
        }
        forecast.source = forecast.source && forecast.source.indexOf('V7') >= 0 ? forecast.source + ' + MACRO SHOCK' : 'V7 HYBRID + MACRO SHOCK';
      }catch(e){}
      return forecast;
    };
    wrappedGenerate.__macroShockSafetyWrapped = true;
    window.generateForecast = wrappedGenerate;
  }
})();


// ---- extracted inline script block 39 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL CORS/YAHOO FALLBACK FIX
// Fixes api.allorigins.win 520 / CORS failures.
// Does NOT change BUY/SELL/WAIT logic.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_PROXY_FIX = {
    enabled: true,
    proxies: [
      function(url){ return 'https://api.allorigins.win/get?url=' + encodeURIComponent(url); },
      function(url){ return 'https://corsproxy.io/?' + encodeURIComponent(url); },
      function(url){ return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url); }
    ]
  };

  async function fetchJsonDirectOrProxy(url){
    var errors = [];

    // 1) Try direct first
    try{
      var direct = await fetch(url, {cache:'no-store'});
      if(direct.ok){
        return await direct.json();
      }
      errors.push('direct HTTP ' + direct.status);
    }catch(e){
      errors.push('direct ' + e.message);
    }

    // 2) Try proxies
    for(var i=0;i<window.ZYNQEL_PROXY_FIX.proxies.length;i++){
      var proxyUrl = window.ZYNQEL_PROXY_FIX.proxies[i](url);
      try{
        var r = await fetch(proxyUrl, {cache:'no-store'});
        if(!r.ok){
          errors.push('proxy'+i+' HTTP '+r.status);
          continue;
        }

        var txt = await r.text();
        var parsed;

        try{
          parsed = JSON.parse(txt);
        }catch(e){
          parsed = txt;
        }

        // allorigins format: { contents: "..." }
        if(parsed && typeof parsed === 'object' && typeof parsed.contents === 'string'){
          try{ return JSON.parse(parsed.contents); }
          catch(e){ return parsed.contents; }
        }

        // codetabs/corsproxy usually returns raw JSON
        if(typeof parsed === 'string'){
          try{ return JSON.parse(parsed); }
          catch(e){ throw new Error('proxy returned non-json'); }
        }

        return parsed;
      }catch(e){
        errors.push('proxy'+i+' '+e.message);
      }
    }

    throw new Error('All fetch methods failed: '+errors.join(' | '));
  }

  window.zynqelFetchJsonDirectOrProxy = fetchJsonDirectOrProxy;

  // Yahoo chart helper with fallbacks
  window.zynqelFetchYahooChart = async function(symbol, interval, range){
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(symbol) +
      '?interval=' + encodeURIComponent(interval || '1d') +
      '&range=' + encodeURIComponent(range || '5d');

    return await fetchJsonDirectOrProxy(url);
  };

  // Repair/override Yahoo quote helper if old code uses allorigins
  window.zynqelYahooQuoteFallback = async function(symbol){
    var data = await window.zynqelFetchYahooChart(symbol, '1d', '5d');
    var result = data && data.chart && data.chart.result && data.chart.result[0];
    if(!result || !result.meta) throw new Error('Bad Yahoo response for '+symbol);
    return result;
  };

  console.log('✅ ZYNQEL proxy fallback enabled');
})();


// ---- extracted inline script block 41 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL VERCEL YAHOO API FIRST
// Uses your own Vercel Serverless API: /api/yahoo
// This avoids browser CORS, allorigins 520/522 and corsproxy 403.
// ═══════════════════════════════════════════════════════
(function(){
  async function fetchLocalYahoo(symbol, interval, range){
    var url = '/api/yahoo?symbol=' + encodeURIComponent(symbol) +
      '&interval=' + encodeURIComponent(interval || '1d') +
      '&range=' + encodeURIComponent(range || '5d');

    var r = await fetch(url, {cache:'no-store'});
    if(!r.ok){
      var txt = '';
      try{ txt = await r.text(); }catch(e){}
      throw new Error('Local Yahoo API HTTP ' + r.status + ' ' + txt.slice(0,120));
    }
    return await r.json();
  }

  var oldYahooChart = window.zynqelFetchYahooChart;
  window.zynqelFetchYahooChart = async function(symbol, interval, range){
    try{
      return await fetchLocalYahoo(symbol, interval || '1d', range || '5d');
    }catch(e){
      console.warn('Local /api/yahoo failed, trying fallback:', symbol, e.message);
      if(typeof oldYahooChart === 'function'){
        return await oldYahooChart(symbol, interval, range);
      }
      throw e;
    }
  };

  window.zynqelFetchYahooLocal = fetchLocalYahoo;

  console.log('✅ ZYNQEL local Vercel Yahoo API enabled');
})();
