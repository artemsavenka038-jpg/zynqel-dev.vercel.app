// ZYNQEL data/fred.js
// Extracted from original marketData.js. Classic global script, not module.

// ---- extracted inline script block 9 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V4 GROQ + CANDLE FIX
// Fixes: ignored scripts, oversized Groq context, old proxy-only prompt,
// slow model order, and missing candle intelligence inside AI Analysis.
// ═══════════════════════════════════════════════════════
(function(){
  // Faster Groq response first. Stronger model still available as fallback.
  try{
    window.GROQ_TIMEOUT_MS = 16000;
    window.GROQ_MODELS = ['llama-3.3-70b-versatile','llama-3.1-8b-instant'];
  }catch(e){}

  function n(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function round(x, d){ x=n(x,null); return x===null?null:Number(x.toFixed(d||2)); }
  function assetMeta(id){ try{return (ASSETS||[]).find(function(a){return a.id===id;})||{};}catch(e){return{};} }
  function compactLive(assetId){
    var d=(window.liveData&&window.liveData[assetId])?window.liveData[assetId]:{};
    return {
      asset:assetId,
      name:assetMeta(assetId).name||assetId,
      category:assetMeta(assetId).category||'unknown',
      price:round(d.price,6),
      change1h:round(d.change1h||0,3),
      change24h:round(d.change24h||0,3),
      change7d:round(d.change7d||0,3),
      volume24h:d.volume||'unknown',
      source:d.source||'market_feed'
    };
  }
  function candleSnapshot(assetId){
    var ci=null;
    try{ if(typeof window.getCandleIntelligence==='function') ci=window.getCandleIntelligence(assetId); }catch(e){}
    if(!ci) return null;
    var frames={};
    ['15m','1h','4h','1d'].forEach(function(tf){
      var f=ci.frames&&ci.frames[tf];
      if(f){
        frames[tf]={bias:f.bias,score:f.score,structure:f.structure,pattern:f.pattern,volumeSpike:!!f.volumeSpike,levelPosition:f.levelPosition};
      }
    });
    return {source:ci.source,bias:ci.bias,score:ci.score,summary:ci.summary,support:round(ci.support,6),resistance:round(ci.resistance,6),frames:frames};
  }
  function techSnapshot(assetId){
    var t={};
    try{ t = (typeof buildTechnicalSnapshot==='function' ? buildTechnicalSnapshot(assetId) : {}) || {}; }catch(e){ t={}; }
    var real={};
    try{ if(typeof getTechnicalSnapshot==='function') real=getTechnicalSnapshot(assetId)||{}; }catch(e){ real={}; }
    return {
      trend: real.trend || t.trend || 'neutral',
      rsi: round(real.rsi!==undefined?real.rsi:t.rsiProxy,2),
      ema20: round(real.ema20||t.ema20,6),
      ema50: round(real.ema50||t.ema50,6),
      ema200: round(real.ema200||t.ema200,6),
      macdHist: round(real.macdHist,6),
      atr: round(real.atr,6),
      support: round(real.support||t.support1,6),
      resistance: round(real.resistance||t.resistance1,6),
      volatility: real.volatility || t.volatility || 'unknown',
      source: real.source || 'V4_TECHNICAL_PROXY',
      candle: candleSnapshot(assetId)
    };
  }
  function relevantNews(assetId){
    var cat=assetMeta(assetId).category||'';
    var allowed=['fed','cpi','inflation','rate','dollar','dxy','treasury','yields','vix','oil','etf','crypto','bitcoin','ethereum','solana','xrp','gold','silver','stock','nasdaq','s&p','fed rate'];
    var arr=(window.allNews||[]).filter(function(x){
      var txt=((x.title||'')+' '+(x.summary||'')+' '+((x.assets||[]).join(' '))).toLowerCase();
      if((x.assets||[]).indexOf(assetId)>=0) return true;
      if(assetId==='BTC' && /bitcoin|btc|crypto|etf/.test(txt)) return true;
      if(assetId==='ETH' && /ethereum|eth|crypto|etf/.test(txt)) return true;
      if(assetId==='SOL' && /solana|sol|crypto/.test(txt)) return true;
      if(assetId==='XRP' && /xrp|ripple|crypto/.test(txt)) return true;
      if(assetId==='XAU' && /gold|xau|dollar|yields|fed|inflation/.test(txt)) return true;
      if(assetId==='XAG' && /silver|xag|gold|dollar|yields|fed|inflation/.test(txt)) return true;
      if(assetId==='SPX' || assetId==='NDX') return /stock|nasdaq|s&p|fed|rate|inflation|earnings|vix/.test(txt);
      if(assetId==='DXY' || cat==='forex') return /dollar|fed|rate|inflation|currency|euro|pound/.test(txt);
      return allowed.some(function(w){return txt.indexOf(w)>=0;});
    }).slice(0,5).map(function(x){
      return {title:x.title,impact:x.impact||'neutral',importance:x.importance||'medium',assets:x.assets||[],time:x.time||x.timeRu||'',source:x.source||'news'};
    });
    return arr;
  }
  function selectedContext(assetId){
    var live=compactLive(assetId);
    var v4=null;
    try{ if(typeof computeV4InstitutionalSignal==='function') v4=computeV4InstitutionalSignal(assetId); }catch(e){}
    var ctx={
      timestamp:new Date().toISOString(),
      asset:live,
      macro:{
        fearGreed:window.fearGreed||null,
        fedRate:window.fredData&&fredData.fedRate||null,
        cpiMoM:window.fredData&&fredData.cpiChange||null,
        dxy:compactLive('DXY'),
        vix:window.marketRiskData&&marketRiskData.VIX||null,
        oil:window.marketRiskData&&marketRiskData.OIL||null,
        us10y:window.marketRiskData&&marketRiskData.US10Y||null
      },
      technicals:techSnapshot(assetId),
      news:relevantNews(assetId),
      v4_engine_signal:v4,
      strict_rules:[
        'Use only this JSON. Never invent whale/insider/SEC/world events.',
        'Do not default to WAIT. Use WAIT only when technicals + candles + macro are mixed.',
        'If V4 engine and candle bias agree, follow that direction unless macro strongly contradicts.',
        'If price is missing, return action wait and explain market feed is loading.',
        'Do not repeat reasoning. Do not mention unavailable data as if it is real.'
      ]
    };
    return ctx;
  }
  window.zynqelBuildSelectedGroqContext = selectedContext;

  // Override generateForecast with compact selected-asset Groq context.
  window.generateForecast = async function(assetId){
    var isRu=window.appLang==='ru';
    var ctx=selectedContext(assetId);
    var sys=isRu?
      'Ты Zynqel AI analyst. Дай конкретный прогноз только по выбранному активу. Используй JSON: price, macro, RSI/EMA/MACD/ATR, candle structure 15m/1h/4h/1d, volume spike, V4 engine signal, relevant news. Не выдумывай события. Не пиши WAIT по умолчанию. Верни только валидный JSON.' :
      'You are Zynqel AI analyst. Forecast only the selected asset. Use JSON: price, macro, RSI/EMA/MACD/ATR, candle structure 15m/1h/4h/1d, volume spike, V4 engine signal, relevant news. Do not invent events. Do not default to WAIT. Return only valid JSON.';
    var schema=isRu?
      {sentiment:'bullish/bearish/neutral',action:'buy/sell/wait',probability:55,confidence:65,entryZone:'диапазон цены или зона наблюдения',invalidation:'уровень отмены или null',target1:'цель или null',waitFor:'что ждать если wait',shortTerm:'24ч сценарий',midTerm:'7д сценарий',reasoning:'2-4 предложения без дублей',factors:['RSI/EMA/MACD/candle factor','macro/news factor','risk factor']} :
      {sentiment:'bullish/bearish/neutral',action:'buy/sell/wait',probability:55,confidence:65,entryZone:'price range or watch zone',invalidation:'invalidation level or null',target1:'target or null',waitFor:'what to wait for if wait',shortTerm:'24h scenario',midTerm:'7d scenario',reasoning:'2-4 sentences, no duplicates',factors:['RSI/EMA/MACD/candle factor','macro/news factor','risk factor']};
    var usr=JSON.stringify({assetToAnalyze:assetId,context:ctx,requiredOutput:schema});
    try{
      if(typeof setGroqStatus==='function') setGroqStatus('GROQ: compact context','thinking');
      var res=await callGroq(sys,usr,650);
      var parsed=(typeof safeParseGroqObject==='function')?safeParseGroqObject(res):JSON.parse(res);
      if(parsed){
        parsed.source='GROQ AI';
        parsed.fullContext=true;
        parsed.compactContext=true;
        if(typeof normalizeForecast==='function') parsed=normalizeForecast(assetId, parsed);
        if(typeof window.zynqelFinalNormalize==='function') parsed=window.zynqelFinalNormalize(assetId, parsed);
        return parsed;
      }
      throw new Error('bad_groq_json');
    }catch(e){
      console.warn('Forecast Groq compact failed:',assetId,e.message);
      if(typeof setGroqStatus==='function') setGroqStatus('GROQ unavailable → LOCAL ENGINE','error');
      var fb=(typeof buildFallbackForecast==='function')?buildFallbackForecast(assetId):{action:'wait',probability:50,confidence:50,reasoning:'Local fallback'};
      if(typeof normalizeForecast==='function') fb=normalizeForecast(assetId, fb);
      if(typeof window.zynqelFinalNormalize==='function') fb=window.zynqelFinalNormalize(assetId, fb);
      fb.source='LOCAL ENGINE';
      return fb;
    }
  };
})();


// ---- extracted inline script block 17 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V7 HYBRID DECISION ENGINE
// V6 = technical decision maker.
// Groq = news/macro scorer + explanation.
// Final = V6 technical score + Groq news_score, with anti-random-guess filter.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_V7 = {
    enabled: true,
    newsScoreMax: 20,
    minFinalTradeConfluence: 65,
    strongFinalConfluence: 78,
    allowNewsFlipOnlyAbove: 82,
    newsCacheMs: 10 * 60 * 1000,
    cache: window.ZYNQEL_V7 && window.ZYNQEL_V7.cache ? window.ZYNQEL_V7.cache : {}
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
  function cfg(asset){
    try{ return (window.ASSETS || []).find(function(a){return a.id === asset;}) || {id:asset, name:asset, category:'unknown'}; }catch(e){}
    return {id:asset, name:asset, category:'unknown'};
  }
  function tech(asset){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {}; }catch(e){}
    return {};
  }
  function candle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }
  function relevantNews(asset){
    try{
      var c = cfg(asset);
      var arr = (window.allNews || []).filter(function(n){
        var txt = ((n.title || '') + ' ' + (n.summary || '') + ' ' + ((n.assets || []).join(' '))).toLowerCase();
        if((n.assets || []).indexOf(asset) >= 0) return true;
        if(asset === 'BTC' || asset === 'ETH' || c.category === 'crypto') return /crypto|bitcoin|ethereum|etf|fed|rate|dollar|risk|liquidity|binance|sec/.test(txt);
        if(c.category === 'metals') return /gold|silver|xau|xag|dollar|yield|fed|inflation|cpi|war|risk/.test(txt);
        if(c.category === 'forex') return /dollar|fed|ecb|boe|rate|inflation|cpi|yield|eur|gbp|dxy/.test(txt);
        if(c.category === 'indices') return /nasdaq|spx|s&p|stocks|earnings|fed|rate|yield|vix|ai|tech/.test(txt);
        return false;
      });
      return arr.slice(0,5).map(function(n){
        return {title:n.title || '', assets:n.assets || [], source:n.source || '', time:n.time || ''};
      });
    }catch(e){ return []; }
  }
  function macroSnapshot(){
    return {
      fearGreed: num(window.fearGreed, 50),
      fedRate: window.fredData ? window.fredData.fedRate : null,
      cpiChange: window.fredData ? window.fredData.cpiChange : null,
      dxy: window.liveData && window.liveData.DXY ? {price:window.liveData.DXY.price, change24h:window.liveData.DXY.change24h} : null,
      vix: window.marketRiskData && window.marketRiskData.VIX ? window.marketRiskData.VIX : null,
      oil: window.marketRiskData && window.marketRiskData.OIL ? window.marketRiskData.OIL : null,
      us10y: window.marketRiskData && window.marketRiskData.US10Y ? window.marketRiskData.US10Y : null
    };
  }
  function getV6(asset){
    try{
      if(typeof window.zynqelV6Decision === 'function') return window.zynqelV6Decision(asset);
    }catch(e){}
    // Small fallback if old function missing
    return {
      asset: asset,
      action: 'wait',
      confidence: 35,
      confluence: 35,
      bullScore: 0,
      bearScore: 0,
      probability: 50,
      upwardProbability: 50,
      sentiment: 'neutral',
      source: 'V6 ENGINE FALLBACK',
      factors: ['V6 unavailable']
    };
  }

  async function groqNewsScore(asset, v6){
    var now = Date.now();
    var cache = window.ZYNQEL_V7.cache[asset];
    if(cache && (now - cache.time) < window.ZYNQEL_V7.newsCacheMs) return cache.data;

    var news = relevantNews(asset);
    var macro = macroSnapshot();
    var td = tech(asset);
    var ci = candle(asset);
    var isRu = ru();

    // If no Groq/call function, neutral score.
    if(typeof window.callGroq !== 'function'){
      return {news_score:0, macro_score:0, impact:'low', affected_assets:[asset], summary:isRu?'Groq недоступен, новости не оценены.':'Groq unavailable, news not scored.', source:'NO_GROQ'};
    }

    var sys = isRu ?
      'Ты новостной и макро-аналитик Zynqel. Твоя задача НЕ давать buy/sell. Только оцени влияние новостей/макро на выбранный актив. Верни только валидный JSON.' :
      'You are Zynqel news and macro analyst. Your job is NOT to give buy/sell. Only score news/macro impact on the selected asset. Return valid JSON only.';

    var schema = {
      news_score: "integer from -20 to +20. Positive supports price, negative pressures price.",
      macro_score: "integer from -10 to +10",
      impact: "low/medium/high/extreme",
      affected_assets: [asset],
      risk_events: ["short list"],
      summary: "one short sentence, same language as UI",
      confidence: "0-100"
    };

    var usr = JSON.stringify({
      asset: asset,
      assetInfo: cfg(asset),
      v6TechnicalDecision: {
        action: v6.action,
        confluence: v6.confluence,
        bullScore: v6.bullScore,
        bearScore: v6.bearScore,
        trend: v6.trend,
        rsi: v6.rsi,
        candleBias: v6.candleBias
      },
      macro: macro,
      relevantNews: news,
      instructions: [
        "Do not invent news.",
        "If news list is empty or generic, return news_score 0.",
        "Do not return buy/sell/wait.",
        "Score only catalyst impact."
      ],
      requiredOutput: schema
    });

    try{
      if(typeof window.setGroqStatus === 'function') window.setGroqStatus('GROQ: scoring news/macro', 'thinking');
      var raw = await window.callGroq(sys, usr, 450);
      var parsed = null;
      try{
        parsed = typeof window.safeParseGroqObject === 'function' ? window.safeParseGroqObject(raw) : JSON.parse(raw);
      }catch(e){
        var m = String(raw || '').match(/\{[\s\S]*\}/);
        if(m) parsed = JSON.parse(m[0]);
      }
      if(!parsed) parsed = {news_score:0, macro_score:0, impact:'low', affected_assets:[asset], risk_events:[], summary:isRu?'Groq лимит: новости временно нейтральны.':'Groq limit: news temporarily neutral.', confidence:30};

      parsed.news_score = Math.max(-20, Math.min(20, Math.round(num(parsed.news_score, 0))));
      parsed.macro_score = Math.max(-10, Math.min(10, Math.round(num(parsed.macro_score, 0))));
      parsed.confidence = Math.max(0, Math.min(100, Math.round(num(parsed.confidence, 50))));
      parsed.source = 'GROQ NEWS';
      window.ZYNQEL_V7.cache[asset] = {time: now, data: parsed};
      return parsed;
    }catch(e){
      console.warn('Groq news score failed:', e.message);
      if(typeof window.setGroqStatus === 'function') window.setGroqStatus('GROQ news unavailable', 'warn');
      return {news_score:0, macro_score:0, impact:'low', affected_assets:[asset], risk_events:[], summary:isRu?'Новости не повлияли на сигнал.':'News did not change the signal.', confidence:30, source:'GROQ_NEWS_FAILED'};
    }
  }

  function combineV7(asset, v6, news){
    var isRu = ru();
    var price = assetPrice(asset);
    var td = tech(asset);
    var ci = candle(asset);
    var support = num(v6.support, null) || num(td.support, null) || num(ci.support, null) || (price ? price*0.985 : null);
    var resistance = num(v6.resistance, null) || num(td.resistance, null) || num(ci.resistance, null) || (price ? price*1.015 : null);

    var newsScore = num(news && news.news_score, 0);
    var macroScore = num(news && news.macro_score, 0);
    var catalystScore = Math.max(-25, Math.min(25, newsScore + macroScore));

    var bull = num(v6.bullScore, 0);
    var bear = num(v6.bearScore, 0);

    if(catalystScore > 0) bull += catalystScore;
    if(catalystScore < 0) bear += Math.abs(catalystScore);

    var edge = Math.abs(bull - bear);
    var confluence = Math.round(Math.max(35, Math.min(94, num(v6.confluence, 50) + Math.abs(catalystScore) * 0.7)));
    var technicalAction = v6.action || 'wait';
    var action = technicalAction;

    // News can downgrade a technical trade if it conflicts.
    if(technicalAction === 'buy' && catalystScore <= -12 && confluence < window.ZYNQEL_V7.allowNewsFlipOnlyAbove){
      action = 'wait';
    }
    if(technicalAction === 'sell' && catalystScore >= 12 && confluence < window.ZYNQEL_V7.allowNewsFlipOnlyAbove){
      action = 'wait';
    }

    // News can upgrade WAIT only if catalyst is strong and V6 is not totally weak.
    if(technicalAction === 'wait' && num(v6.confluence, 35) >= 55 && Math.abs(catalystScore) >= 16){
      action = catalystScore > 0 ? 'buy' : 'sell';
      confluence = Math.max(confluence, 66);
    }

    // Still block weak final trades.
    if(confluence < window.ZYNQEL_V7.minFinalTradeConfluence || edge < 12){
      action = 'wait';
    }

    var probability = action === 'buy' ? Math.min(84, Math.max(55, confluence)) :
                      action === 'sell' ? Math.max(16, Math.min(45, 100 - confluence)) : 50;

    var entry, target, invalidation, waitFor;
    if(action === 'buy'){
      entry = (isRu?'Зона покупки: ':'Buy zone: ') + fmt(Math.min(support, price*0.996), asset) + ' – ' + fmt(Math.max(support, price*1.003), asset);
      target = (isRu?'Цель: ':'Target: ') + fmt(resistance || price*1.02, asset);
      invalidation = (isRu?'Отмена: ниже ':'Invalidation: below ') + fmt(support || price*0.982, asset);
      waitFor = isRu?'Удержание поддержки + подтверждение объёма':'Support hold + volume confirmation';
    } else if(action === 'sell'){
      entry = (isRu?'Зона продажи: ':'Sell zone: ') + fmt(Math.min(resistance, price*0.997), asset) + ' – ' + fmt(Math.max(resistance, price*1.004), asset);
      target = (isRu?'Цель: ':'Target: ') + fmt(support || price*0.98, asset);
      invalidation = (isRu?'Отмена: выше ':'Invalidation: above ') + fmt(resistance || price*1.018, asset);
      waitFor = isRu?'Отбой от сопротивления или пробой поддержки с объёмом':'Resistance rejection or support breakdown with volume';
    } else {
      entry = price ? ((isRu?'Зона наблюдения: ':'Watch zone: ') + fmt(support, asset) + ' – ' + fmt(resistance, asset)) : (isRu?'Ожидание market feed':'Waiting for market feed');
      target = isRu?'После подтверждения направления':'After directional confirmation';
      invalidation = isRu?'Нет активной сделки до подтверждения':'No active trade until confirmation';
      waitFor = isRu?'Confluence выше 65, пробой/ретест уровня и подтверждение новостей/объёма':'Confluence above 65, breakout/retest and news/volume confirmation';
    }

    var reasoning = [];
    if(isRu){
      reasoning.push('V7 Hybrid: V6 считает технику, Groq оценивает новости/макро.');
      reasoning.push('Техника V6: '+(v6.action||'wait')+', confluence '+num(v6.confluence,35)+'/100, bull/bear '+num(v6.bullScore,0)+'/'+num(v6.bearScore,0)+'.');
      reasoning.push('Groq news-score: '+catalystScore+' ('+(news && news.summary ? news.summary : 'без сильного новостного влияния')+').');
      reasoning.push(action==='wait' ? 'Итог: преимущества недостаточно, лучше ждать подтверждения.' : 'Итог: сигнал активен, но вход только после подтверждения уровня и объёма.');
    } else {
      reasoning.push('V7 Hybrid: V6 scores technicals, Groq scores news/macro.');
      reasoning.push('V6 technicals: '+(v6.action||'wait')+', confluence '+num(v6.confluence,35)+'/100, bull/bear '+num(v6.bullScore,0)+'/'+num(v6.bearScore,0)+'.');
      reasoning.push('Groq news-score: '+catalystScore+' ('+(news && news.summary ? news.summary : 'no strong news impact')+').');
      reasoning.push(action==='wait' ? 'Final: not enough edge, waiting for confirmation is preferred.' : 'Final: signal is active, but entry requires level and volume confirmation.');
    }

    return {
      source: news && news.source === 'GROQ NEWS' ? 'V7 HYBRID: V6 + GROQ NEWS' : 'V7 HYBRID: V6 + NEWS FALLBACK',
      sentiment: action === 'buy' ? 'bullish' : action === 'sell' ? 'bearish' : 'neutral',
      action: action,
      probability: Math.round(probability),
      upwardProbability: Math.round(probability),
      confidence: confluence,
      entryZone: entry,
      entry: entry,
      zone: entry,
      invalidation: invalidation,
      target1: target,
      target: target,
      waitFor: waitFor,
      shortTerm: action === 'wait' ? (isRu?'24ч: ждать подтверждения':'24h: wait for confirmation') : (isRu?'24ч: сценарий активен при подтверждении':'24h: active if confirmed'),
      midTerm: isRu?'7д: зависит от удержания ключевых уровней и новостного фона':'7d: depends on key levels and news backdrop',
      reasoning: reasoning,
      factors: [
        'V6 confluence: '+num(v6.confluence,35)+'/100',
        'V6 bull/bear: '+num(v6.bullScore,0)+'/'+num(v6.bearScore,0),
        'Groq news-score: '+catalystScore,
        'News impact: '+(news && news.impact ? news.impact : 'low'),
        'Candles: '+(v6.candleBias || 'neutral')
      ],
      v6Decision: v6,
      groqNews: news,
      v7Final: {action:action, confluence:confluence, catalystScore:catalystScore, edge:edge}
    };
  }

  window.zynqelV7NewsScore = groqNewsScore;
  window.zynqelV7Combine = combineV7;

  // Override generateForecast: V6 technical decision + Groq news-score.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__v7HybridWrapped){
    var previousGenerate = window.generateForecast;
    var wrapped = async function(assetId, opts){
      opts = opts || {};
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';

      if(!window.ZYNQEL_V7.enabled){
        return previousGenerate.apply(this, arguments);
      }

      var v6 = getV6(assetId);
      var news = await groqNewsScore(assetId, v6);
      var finalForecast = combineV7(assetId, v6, news);

      try{
        if(typeof window.normalizeForecast === 'function') finalForecast = window.normalizeForecast(assetId, finalForecast);
        if(typeof window.zynqelFinalNormalize === 'function') finalForecast = window.zynqelFinalNormalize(assetId, finalForecast);
        if(typeof window.zynqelCleanFinalForecast === 'function') finalForecast = window.zynqelCleanFinalForecast(assetId, finalForecast);
      }catch(e){}

      // Force preserve V7 source after old normalizers.
      finalForecast.source = news && news.source === 'GROQ NEWS' ? 'V7 HYBRID: V6 + GROQ NEWS' : 'V7 HYBRID: V6 + NEWS FALLBACK';

      try{
        if(typeof window.zynqelSetAiSource === 'function'){
          if(news && news.source === 'GROQ NEWS'){
            window.zynqelSetAiSource('V7 HYBRID', 'used', ru() ? 'Groq оценил новости/макро' : 'Groq scored news/macro');
          }else{
            window.zynqelSetAiSource('V7 HYBRID', 'error', ru() ? 'Groq news недоступен, нейтральный news-score' : 'Groq news unavailable, neutral news-score');
          }
        }
      }catch(e){}

      return finalForecast;
    };
    wrapped.__v7HybridWrapped = true;
    window.generateForecast = wrapped;
  }

  function cleanV7(){
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
  setInterval(cleanV7, 1200);
})();
