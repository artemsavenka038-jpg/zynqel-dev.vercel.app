// ZYNQEL data/fearGreed.js
// Extracted from original marketData.js. Classic global script, not module.

// ---- extracted inline script block 13 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL V5 INSTITUTIONAL SIGNAL FILTER
// Do not ask Groq to guess weak 45-55 / low-confluence signals.
// Strong signals may call Groq. Weak signals become WAIT / NO TRADE.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_V5_FILTER = {
    weakConfluence: 60,
    strongConfluence: 70,
    veryStrongConfluence: 75,
    minDirectionalEdge: 10,
    enabled: true
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }

  function getAssetPrice(asset){
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : null;
    var p = d ? num(d.price, null) : null;
    return p && p > 0 ? p : null;
  }

  function fmt(x, asset){
    x = num(x, null);
    if(!x || x <= 0) return '';
    var dec = 2;
    if(asset === 'XRP' || asset === 'SUI' || asset === 'EUR' || asset === 'GBP') dec = 4;
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }

  function getTech(asset){
    try{ if(typeof window.getTechnicalSnapshot === 'function') return window.getTechnicalSnapshot(asset) || {}; }catch(e){}
    return {};
  }

  function getCandle(asset){
    try{ if(typeof window.getCandleIntelligence === 'function') return window.getCandleIntelligence(asset) || {}; }catch(e){}
    return {};
  }

  function calculateSignalQuality(asset){
    var p = getAssetPrice(asset);
    var td = getTech(asset);
    var ci = getCandle(asset);
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : {};
    var change24 = num(d.change24h, 0);
    var rsi = num(td.rsi, 50);
    var macdHist = num(td.macdHist, 0);
    var trend = String(td.trend || 'neutral').toLowerCase();
    var candleBias = String(ci.bias || 'neutral').toLowerCase();
    var candleScore = num(ci.score, 0);
    var fg = num(window.fearGreed, 50);

    var bull = 0, bear = 0, notes = [];

    if(change24 > 1.2){ bull += 8; notes.push('positive 24h momentum'); }
    if(change24 < -1.2){ bear += 8; notes.push('negative 24h momentum'); }

    if(rsi > 57){ bull += 10; notes.push('RSI bullish'); }
    else if(rsi < 43){ bear += 10; notes.push('RSI bearish'); }
    else notes.push('RSI neutral');

    if(macdHist > 0){ bull += 8; notes.push('MACD positive'); }
    if(macdHist < 0){ bear += 8; notes.push('MACD negative'); }

    if(trend === 'bullish'){ bull += 12; notes.push('technical trend bullish'); }
    if(trend === 'bearish'){ bear += 12; notes.push('technical trend bearish'); }

    if(candleBias === 'bullish'){ bull += Math.min(18, Math.abs(candleScore)); notes.push('candle bias bullish'); }
    if(candleBias === 'bearish'){ bear += Math.min(18, Math.abs(candleScore)); notes.push('candle bias bearish'); }
    if(candleBias === 'neutral') notes.push('candle bias neutral');

    if(fg > 65){ bull += 5; notes.push('risk sentiment supportive'); }
    if(fg < 35){ bear += 5; notes.push('risk sentiment fearful'); }

    var totalDirectional = bull + bear;
    var edge = Math.abs(bull - bear);
    var confluence = Math.round(Math.max(35, Math.min(92, 45 + edge + Math.min(18, totalDirectional/3))));
    var action = 'wait';
    if(confluence >= window.ZYNQEL_V5_FILTER.weakConfluence && edge >= window.ZYNQEL_V5_FILTER.minDirectionalEdge){
      action = bull > bear ? 'buy' : 'sell';
    }

    var status = 'WEAK_NO_TRADE';
    if(confluence >= window.ZYNQEL_V5_FILTER.veryStrongConfluence) status = 'VERY_STRONG';
    else if(confluence >= window.ZYNQEL_V5_FILTER.strongConfluence) status = 'STRONG';
    else if(confluence >= window.ZYNQEL_V5_FILTER.weakConfluence) status = 'MODERATE';

    return {
      asset: asset,
      price: p,
      bull: Math.round(bull),
      bear: Math.round(bear),
      edge: Math.round(edge),
      confluence: confluence,
      action: action,
      status: status,
      notes: notes.slice(0,5),
      rsi: rsi,
      trend: trend,
      candleBias: candleBias,
      candleScore: candleScore
    };
  }

  window.zynqelV5SignalQuality = calculateSignalQuality;

  function buildNoTradeForecast(asset, q){
    var ru = window.appLang === 'ru';
    var p = q.price || getAssetPrice(asset);
    var td = getTech(asset);
    var ci = getCandle(asset);
    var support = num(td.support, null) || num(ci.support, null) || (p ? p*0.985 : null);
    var resistance = num(td.resistance, null) || num(ci.resistance, null) || (p ? p*1.015 : null);

    return {
      source: 'V5 FILTER',
      sentiment: 'neutral',
      action: 'wait',
      probability: 50,
      upwardProbability: 50,
      confidence: q.confluence,
      entryZone: p ? ((ru?'Зона наблюдения: ':'Watch zone: ') + fmt(support, asset) + ' – ' + fmt(resistance, asset)) : (ru?'Ожидание market feed':'Waiting for market feed'),
      zone: p ? ((ru?'Зона наблюдения: ':'Watch zone: ') + fmt(support, asset) + ' – ' + fmt(resistance, asset)) : (ru?'Ожидание market feed':'Waiting for market feed'),
      entry: p ? ((ru?'Зона наблюдения: ':'Watch zone: ') + fmt(support, asset) + ' – ' + fmt(resistance, asset)) : (ru?'Ожидание market feed':'Waiting for market feed'),
      invalidation: ru ? 'Нет активной сделки до подтверждения' : 'No active trade until confirmation',
      target1: ru ? 'После подтверждения направления' : 'After directional confirmation',
      target: ru ? 'После подтверждения направления' : 'After directional confirmation',
      waitFor: ru ? 'Жду confluence выше 60, пробой/ретест уровня и подтверждение объёма' : 'Waiting for confluence above 60, breakout/retest and volume confirmation',
      shortTerm: ru ? '24ч: нет преимущества, лучше ждать' : '24h: no edge, waiting is preferred',
      midTerm: ru ? '7д: сценарий зависит от выхода из диапазона' : '7d: scenario depends on range breakout',
      reasoning: ru ?
        [
          'V5-фильтр не видит достаточного преимущества для сделки.',
          'Bull и Bear факторы слишком близко: '+q.bull+' / '+q.bear+', confluence '+q.confluence+'/100.',
          'В такой зоне Groq не должен угадывать направление — лучше ждать подтверждения.'
        ] :
        [
          'V5 filter does not see enough edge for a trade.',
          'Bull and Bear factors are too close: '+q.bull+' / '+q.bear+', confluence '+q.confluence+'/100.',
          'In this zone Groq should not guess direction — waiting for confirmation is preferred.'
        ],
      factors: ru ?
        ['V5: слабый сигнал', 'Confluence: '+q.confluence+'/100', 'Bull/Bear: '+q.bull+'/'+q.bear, 'Требуется подтверждение'] :
        ['V5: weak signal', 'Confluence: '+q.confluence+'/100', 'Bull/Bear: '+q.bull+'/'+q.bear, 'Confirmation required']
    };
  }

  // Wrap generateForecast: if weak signal, skip Groq entirely.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__v5FilterWrapped){
    var oldGenerateForecast = window.generateForecast;
    var wrappedGenerateForecast = async function(assetId){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      var q = calculateSignalQuality(assetId);

      if(window.ZYNQEL_V5_FILTER.enabled && q.status === 'WEAK_NO_TRADE'){
        if(typeof window.setGroqStatus === 'function') window.setGroqStatus('V5 FILTER: no Groq / weak signal', 'warn');
        var nf = buildNoTradeForecast(assetId, q);
        if(typeof window.normalizeForecast === 'function') nf = window.normalizeForecast(assetId, nf);
        if(typeof window.zynqelFinalNormalize === 'function') nf = window.zynqelFinalNormalize(assetId, nf);
        if(typeof window.zynqelCleanFinalForecast === 'function') nf = window.zynqelCleanFinalForecast(assetId, nf);
        nf.source = 'V5 FILTER';
        nf.v5Quality = q;
        return nf;
      }

      // Strong enough: Groq is allowed, but we inject V5 quality to context when possible.
      var res = await oldGenerateForecast.apply(this, arguments);
      try{
        res.v5Quality = q;
        res.confidence = Math.max(num(res.confidence, 55), q.confluence);
        if(q.action !== 'wait' && q.confluence >= window.ZYNQEL_V5_FILTER.strongConfluence){
          res.action = q.action;
          res.sentiment = q.action === 'buy' ? 'bullish' : 'bearish';
        }
        if(typeof window.zynqelFinalNormalize === 'function') res = window.zynqelFinalNormalize(assetId, res);
        if(typeof window.zynqelCleanFinalForecast === 'function') res = window.zynqelCleanFinalForecast(assetId, res);
      }catch(e){}
      return res;
    };
    wrappedGenerateForecast.__v5FilterWrapped = true;
    window.generateForecast = wrappedGenerateForecast;
  }

  // Visual cleanup for current old duplicate text.
  function cleanVisibleV5(){
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
      .replace(/This is not fimarket datacial advice/gi, 'This is not financial advice');
  }
  setInterval(cleanVisibleV5, 1500);
})();
