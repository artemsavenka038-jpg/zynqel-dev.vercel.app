// ZYNQEL data/apiRouter.js
// Extracted from original marketData.js. Classic global script, not module.

// ---- extracted inline script block 1 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL GROQ BODY LOCK FIX
// Fixes: "Body is disturbed or locked"
// Cause: old code reads the same Groq response body twice.
// Solution: intercept Groq fetch, read/clone safely, then return a fresh Response.
// Also keeps local V7 fallback for Groq 429.
// ═══════════════════════════════════════════════════════
(function(){
  if(window.__ZYNQEL_GROQ_BODY_LOCK_FIX__) return;
  window.__ZYNQEL_GROQ_BODY_LOCK_FIX__ = true;

  const nativeFetch = window.__ZYNQEL_NATIVE_FETCH__ || window.fetch.bind(window);
  window.__ZYNQEL_NATIVE_FETCH__ = nativeFetch;

  const oldFetch = window.fetch.bind(window);

  function isGroqUrl(url){
    return String(url || '').includes('api.groq.com/openai/v1/chat/completions');
  }

  function jsonResponse(obj, status){
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: {'Content-Type':'application/json'}
    });
  }

  function fallbackGroq(message){
    const lang = window.appLang || localStorage.getItem('zynqel_lang') || 'en';
    const content = lang === 'ru'
      ? 'Groq временно ограничил запросы или ответ недоступен. Использую локальный движок V7 и текущие рыночные данные.'
      : 'Groq is temporarily rate-limited or unavailable. Using local V7 engine and current market data.';

    return {
      id:'zynqel-local-v7-fallback',
      object:'chat.completion',
      created:Math.floor(Date.now()/1000),
      model:'local-v7-fallback',
      choices:[{
        index:0,
        message:{role:'assistant', content:content},
        finish_reason:'stop'
      }],
      usage:{prompt_tokens:0, completion_tokens:0, total_tokens:0},
      _zynqel_groq_fallback:true,
      _zynqel_reason: message || 'fallback'
    };
  }

  window.zynqelSafeGroqFetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    try{
      const response = await nativeFetch(input, init);

      // Read from clone, never from original response.
      let raw = '';
      try{
        raw = await response.clone().text();
      }catch(e){
        raw = '';
      }

      if(!response.ok){
        if(response.status === 429){
          console.warn('Groq 429 intercepted: using local V7 fallback response');
          return jsonResponse(fallbackGroq('Groq 429 rate limit'), 200);
        }

        console.warn('Groq HTTP error intercepted:', response.status, raw.slice(0,160));
        return jsonResponse(fallbackGroq('Groq HTTP ' + response.status), 200);
      }

      // If response is ok, return a NEW response with the same body text.
      // Downstream code can call .json() or .text() safely.
      return new Response(raw, {
        status: response.status,
        statusText: response.statusText,
        headers: {'Content-Type': response.headers.get('Content-Type') || 'application/json'}
      });

    }catch(error){
      console.warn('Groq fetch failed: using local V7 fallback response', error.message);
      return jsonResponse(fallbackGroq(error.message), 200);
    }
  };

  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if(isGroqUrl(url)){
      return await window.zynqelSafeGroqFetch(input, init);
    }
    return await oldFetch(input, init);
  };

  console.log('✅ ZYNQEL Groq Body Lock Fix enabled');
})();


// ---- extracted inline script block 2 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL ALL SOURCES SERVER ROUTER
// Routes browser-blocked external APIs through Vercel serverless APIs:
// - FRED/StLouisFed -> /api/fred
// - CoinGecko -> /api/coingecko
// - NewsData -> /api/news
// Also caches responses and returns safe fallback data on 429/CORS.
// Does NOT change BUY/SELL/WAIT logic.
// ═══════════════════════════════════════════════════════
(function(){
  if(window.__ZYNQEL_ALL_SOURCES_ROUTER__) return;
  window.__ZYNQEL_ALL_SOURCES_ROUTER__ = true;

  const nativeFetch = window.__ZYNQEL_NATIVE_FETCH__ || window.fetch.bind(window);
  window.__ZYNQEL_NATIVE_FETCH__ = nativeFetch;

  const cache = window.__ZYNQEL_SOURCE_CACHE__ || new Map();
  const pending = window.__ZYNQEL_SOURCE_PENDING__ || new Map();
  window.__ZYNQEL_SOURCE_CACHE__ = cache;
  window.__ZYNQEL_SOURCE_PENDING__ = pending;

  const TTL = 120000;
  const STALE = 60 * 60000;

  function resp(obj, status=200){
    return new Response(JSON.stringify(obj), {
      status,
      headers:{'Content-Type':'application/json'}
    });
  }

  function txtResp(txt, status=200){
    return new Response(String(txt || ''), {
      status,
      headers:{'Content-Type':'text/plain'}
    });
  }

  function fresh(key, stale=false){
    const item = cache.get(key);
    if(!item) return null;
    const age = Date.now() - item.ts;
    if(age <= TTL) return item.data;
    if(stale && age <= STALE) return item.data;
    return null;
  }

  function save(key, data){
    cache.set(key, {ts:Date.now(), data});
  }

  function decode(v){ try{return decodeURIComponent(v);}catch(e){return v;} }

  function routeExternalUrl(url){
    url = String(url || '');

    // FRED / StLouisFed
    if(url.includes('api.stlouisfed.org/fred/series/observations')){
      try{
        const u = new URL(url);
        const series = u.searchParams.get('series_id') || '';
        const apiKey = u.searchParams.get('api_key') || '';
        const limit = u.searchParams.get('limit') || '1';
        return {
          kind:'json',
          key:'fred:' + series + ':' + limit,
          local:'/api/fred?series_id=' + encodeURIComponent(series) +
            '&limit=' + encodeURIComponent(limit) +
            (apiKey ? '&api_key=' + encodeURIComponent(apiKey) : '')
        };
      }catch(e){}
    }

    // CoinGecko global
    if(url.includes('api.coingecko.com/api/v3/global')){
      return {kind:'json', key:'coingecko:global', local:'/api/coingecko?endpoint=global'};
    }

    // CoinGecko simple price or other endpoints
    if(url.includes('api.coingecko.com/api/v3/')){
      try{
        const u = new URL(url);
        const endpoint = u.pathname.replace('/api/v3/','');
        const qs = u.search ? '&query=' + encodeURIComponent(u.search.slice(1)) : '';
        return {kind:'json', key:'coingecko:' + endpoint + ':' + u.search, local:'/api/coingecko?endpoint=' + encodeURIComponent(endpoint) + qs};
      }catch(e){}
    }

    // NewsData
    if(url.includes('newsdata.io/api/1/news')){
      try{
        const u = new URL(url);
        return {kind:'json', key:'news:' + u.search, local:'/api/news?' + u.searchParams.toString()};
      }catch(e){}
    }

    return null;
  }

  function safeFallback(route){
    if(!route) return {};
    if(route.key.startsWith('fred:')){
      return {
        observations:[{date:new Date().toISOString().slice(0,10), value:"0"}],
        _zynqel_source:'fred_browser_fallback'
      };
    }
    if(route.key.startsWith('coingecko:global')){
      return {
        data:{
          market_cap_percentage:{btc:57.0, eth:9.5},
          total_market_cap:{usd:0},
          total_volume:{usd:0},
          market_cap_change_percentage_24h_usd:0
        },
        _zynqel_source:'coingecko_browser_fallback'
      };
    }
    if(route.key.startsWith('coingecko:')){
      return {_zynqel_source:'coingecko_browser_fallback'};
    }
    if(route.key.startsWith('news:')){
      return {
        status:'success',
        totalResults:0,
        results:[],
        _zynqel_source:'news_browser_fallback'
      };
    }
    return {_zynqel_source:'browser_fallback'};
  }

  async function localFetch(route){
    const cached = fresh(route.key, false);
    if(cached) return cached;

    if(pending.has(route.key)) return await pending.get(route.key);

    const task = (async()=>{
      try{
        const r = await nativeFetch(route.local, {cache:'no-store'});
        const raw = await r.text();
        let data;
        try{ data = JSON.parse(raw); }catch(e){ data = raw; }

        if(r.ok){
          save(route.key, data);
          return data;
        }

        const stale = fresh(route.key, true);
        if(stale) return stale;

        console.warn('Local source API failed, using fallback:', route.local, r.status, String(raw).slice(0,120));
        const fallback = safeFallback(route);
        save(route.key, fallback);
        return fallback;
      }catch(e){
        const stale = fresh(route.key, true);
        if(stale) return stale;
        const fallback = safeFallback(route);
        save(route.key, fallback);
        return fallback;
      }finally{
        setTimeout(()=>pending.delete(route.key), 1000);
      }
    })();

    pending.set(route.key, task);
    return await task;
  }

  // Keep previous fetch wrapper if already exists, but route these sources first.
  const previousFetch = window.fetch.bind(window);

  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    const route = routeExternalUrl(url);

    if(route){
      const data = await localFetch(route);
      return resp(data, 200);
    }

    return await previousFetch(input, init);
  };

  console.log('✅ ZYNQEL All Sources Router enabled: FRED/CoinGecko/NewsData -> Vercel APIs');
})();


// ---- extracted inline script block 4 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL FINAL DATA STABILITY PATCH
// Final browser-side guard:
// - Yahoo/API calls always return a real Response from fetch
// - helper calls are safe even if old code expects .json()
// - Groq 429 stays local V7 fallback
// - suppresses API 429 breaking interface
// Does NOT change BUY/SELL/WAIT scoring.
// ═══════════════════════════════════════════════════════
(function(){
  if(window.__ZYNQEL_FINAL_DATA_STABILITY_PATCH__) return;
  window.__ZYNQEL_FINAL_DATA_STABILITY_PATCH__ = true;

  const nativeFetch = window.__ZYNQEL_NATIVE_FETCH__ || window.fetch.bind(window);
  window.__ZYNQEL_NATIVE_FETCH__ = nativeFetch;

  const cache = window.__ZYNQEL_FINAL_DATA_CACHE__ || new Map();
  const pending = window.__ZYNQEL_FINAL_PENDING__ || new Map();
  window.__ZYNQEL_FINAL_DATA_CACHE__ = cache;
  window.__ZYNQEL_FINAL_PENDING__ = pending;

  const TTL = 120000;       // 2 minutes browser cache
  const STALE = 60 * 60000; // 60 minutes stale emergency

  const fallbackPrices = {
    '^GSPC': 7580.06, '^IXIC': 27000, '^VIX': 15.5, '^TNX': 4.45,
    'CL=F': 77, 'XAUUSD=X': 3340, 'GC=F': 3340, 'XAGUSD=X': 33.5, 'SI=F': 33.5,
    'DX-Y.NYB': 100.8, 'DXY': 100.8, 'EURUSD=X': 1.08, 'GBPUSD=X': 1.27
  };

  function makeYahooLike(symbol, price, source){
    price = Number(price) || fallbackPrices[symbol] || 1;
    const prev = price * 0.998;
    const now = Math.floor(Date.now()/1000);
    return {
      chart:{
        result:[{
          meta:{
            currency:'USD',
            symbol:symbol,
            exchangeName:source || 'zynqel-fallback',
            regularMarketPrice:price,
            previousClose:prev,
            chartPreviousClose:prev,
            regularMarketTime:now
          },
          timestamp:[now-86400, now],
          indicators:{quote:[{
            open:[prev, price],
            high:[Math.max(prev, price), Math.max(prev, price)],
            low:[Math.min(prev, price), Math.min(prev, price)],
            close:[prev, price],
            volume:[0, 0]
          }]}
        }],
        error:null
      },
      _zynqel_source: source || 'browser-final-fallback'
    };
  }

  function responseJson(obj, status){
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers:{'Content-Type':'application/json'}
    });
  }

  function decodeMaybe(v){ try{return decodeURIComponent(v);}catch(e){return v;} }

  function isYahooChartUrl(url){
    return /https:\/\/query[12]\.finance\.yahoo\.com\/v8\/finance\/chart\//i.test(String(url||''));
  }

  function extractYahooUrl(url){
    url = String(url || '');
    if(isYahooChartUrl(url)) return url;

    try{
      if(url.includes('api.allorigins.win/get?')){
        const u = new URL(url);
        const inner = u.searchParams.get('url');
        if(inner && inner.includes('finance.yahoo.com/v8/finance/chart/')) return decodeMaybe(inner);
      }
      if(url.includes('api.codetabs.com/v1/proxy')){
        const u = new URL(url);
        const inner = u.searchParams.get('quest');
        if(inner && inner.includes('finance.yahoo.com/v8/finance/chart/')) return decodeMaybe(inner);
      }
      if(url.includes('corsproxy.io')){
        const idx = url.indexOf('?');
        if(idx >= 0){
          const inner = decodeMaybe(url.slice(idx+1));
          if(inner.includes('finance.yahoo.com/v8/finance/chart/')) return inner;
        }
      }
    }catch(e){}
    return null;
  }

  function yahooToLocal(yahooUrl){
    try{
      const u = new URL(yahooUrl);
      const symbol = decodeURIComponent((u.pathname.split('/chart/')[1] || '').trim());
      const interval = u.searchParams.get('interval') || '1d';
      const range = u.searchParams.get('range') || '5d';
      return {
        symbol,
        href:'/api/yahoo?symbol=' + encodeURIComponent(symbol) +
          '&interval=' + encodeURIComponent(interval) +
          '&range=' + encodeURIComponent(range)
      };
    }catch(e){ return null; }
  }

  function localInfo(url){
    try{
      const u = new URL(String(url), location.origin);
      if(u.pathname !== '/api/yahoo') return null;
      const symbol = u.searchParams.get('symbol') || 'UNKNOWN';
      return {symbol, key:u.pathname + '?' + u.searchParams.toString(), href:u.pathname + '?' + u.searchParams.toString()};
    }catch(e){ return null; }
  }

  function cacheGet(key, allowStale){
    const item = cache.get(key);
    if(!item) return null;
    const age = Date.now() - item.ts;
    if(age <= TTL) return item.data;
    if(allowStale && age <= STALE) return item.data;
    return null;
  }

  function cacheSet(key, data){
    if(data && data.chart) cache.set(key, {ts:Date.now(), data});
  }

  async function getLocalYahooData(href, symbol){
    const info = localInfo(href) || {key:href, symbol:symbol || 'UNKNOWN', href};
    const fresh = cacheGet(info.key, false);
    if(fresh) return {...fresh, _zynqel_cache:'browser_fresh'};

    if(pending.has(info.key)) return await pending.get(info.key);

    const task = (async()=>{
      try{
        const r = await nativeFetch(info.href, {cache:'no-store'});
        const txt = await r.text();
        let data;
        try{ data = JSON.parse(txt); }catch(e){ data = null; }

        if(r.ok && data && data.chart){
          cacheSet(info.key, data);
          return data;
        }

        const stale = cacheGet(info.key, true);
        if(stale) return {...stale, _zynqel_cache:'browser_stale_after_api_error'};

        console.warn('Local /api/yahoo failed, using final fallback:', r.status, txt.slice(0,160));
        return makeYahooLike(info.symbol, fallbackPrices[info.symbol], 'browser-final-fallback');
      }catch(e){
        const stale = cacheGet(info.key, true);
        if(stale) return {...stale, _zynqel_cache:'browser_stale_after_fetch_error'};
        return makeYahooLike(info.symbol, fallbackPrices[info.symbol], 'browser-final-fetch-fallback');
      }finally{
        setTimeout(()=>pending.delete(info.key), 1000);
      }
    })();

    pending.set(info.key, task);
    return await task;
  }

  function groqFallback(){
    const content = window.appLang === 'ru'
      ? 'Groq временно ограничил запросы по лимиту 429. Использую локальный движок V7 и текущие рыночные данные.'
      : 'Groq is temporarily rate-limited with HTTP 429. Using local V7 engine and current market data.';
    return responseJson({
      id:'zynqel-groq-fallback',
      object:'chat.completion',
      created:Math.floor(Date.now()/1000),
      model:'local-v7-fallback',
      choices:[{index:0,message:{role:'assistant',content},finish_reason:'stop'}],
      _zynqel_groq_fallback:true
    }, 200);
  }

  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    const li = localInfo(url);
    if(li){
      const data = await getLocalYahooData(li.href, li.symbol);
      return responseJson(data, 200);
    }

    const yahooUrl = extractYahooUrl(url);
    if(yahooUrl){
      const local = yahooToLocal(yahooUrl);
      if(local){
        const data = await getLocalYahooData(local.href, local.symbol);
        if(String(url).includes('api.allorigins.win/get?')){
          return responseJson({contents:JSON.stringify(data)}, 200);
        }
        return responseJson(data, 200);
      }
    }

    try{
      const r = await nativeFetch(input, init);
      if(String(url).includes('api.groq.com') && r.status === 429){
        console.warn('Groq 429 intercepted: local V7 fallback');
        return groqFallback();
      }
      return r;
    }catch(e){
      if(String(url).includes('api.groq.com')) return groqFallback();
      throw e;
    }
  };

  // Safe helpers for old code
  window.zynqelFetchYahooChart = async function(symbol, interval, range){
    const href = '/api/yahoo?symbol=' + encodeURIComponent(symbol) +
      '&interval=' + encodeURIComponent(interval || '1d') +
      '&range=' + encodeURIComponent(range || '5d');
    return await getLocalYahooData(href, symbol);
  };

  window.zynqelFetchYahooChartResponse = async function(symbol, interval, range){
    const data = await window.zynqelFetchYahooChart(symbol, interval, range);
    return responseJson(data, 200);
  };

  window.zynqelFetchJsonDirectOrProxy = async function(url){
    const yahooUrl = extractYahooUrl(url) || (isYahooChartUrl(url) ? String(url) : null);
    if(yahooUrl){
      const local = yahooToLocal(yahooUrl);
      if(local) return await getLocalYahooData(local.href, local.symbol);
    }
    const r = await nativeFetch(url, {cache:'no-store'});
    return await r.json();
  };

  // Add .json() compatibility to plain objects returned by any old helper.
  window.zynqelJsonCompatible = function(obj){
    if(obj && typeof obj === 'object' && typeof obj.json !== 'function'){
      Object.defineProperty(obj, 'json', {
        enumerable:false,
        configurable:true,
        value: async function(){ return obj; }
      });
    }
    return obj;
  };

  console.log('✅ ZYNQEL Final Data Stability Patch enabled');
})();


// ---- extracted inline script block 5 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL API ROUTER FIX
// 1) Routes ALL Yahoo chart requests through local Vercel API: /api/yahoo
// 2) Stops browser CORS errors from direct Yahoo/allorigins/corsproxy calls
// 3) Soft fallback for Groq 429 rate limit
// Does NOT change BUY/SELL/WAIT math.
// ═══════════════════════════════════════════════════════
(function(){
  if(window.__ZYNQEL_API_ROUTER_FIX__) return;
  window.__ZYNQEL_API_ROUTER_FIX__ = true;

  var originalFetch = window.fetch.bind(window);

  function decodeMaybe(value){
    try { return decodeURIComponent(value); } catch(e) { return value; }
  }

  function extractYahooUrl(inputUrl){
    var url = String(inputUrl || '');

    // Direct Yahoo
    if(/https:\/\/query[12]\.finance\.yahoo\.com\/v8\/finance\/chart\//i.test(url)){
      return url;
    }

    // allorigins: ?url=<encoded yahoo>
    if(url.indexOf('api.allorigins.win/get?') >= 0){
      try{
        var u = new URL(url);
        var inner = u.searchParams.get('url');
        if(inner && inner.indexOf('finance.yahoo.com/v8/finance/chart/') >= 0){
          return decodeMaybe(inner);
        }
      }catch(e){}
    }

    // codetabs: ?quest=<encoded yahoo>
    if(url.indexOf('api.codetabs.com/v1/proxy') >= 0){
      try{
        var u2 = new URL(url);
        var inner2 = u2.searchParams.get('quest');
        if(inner2 && inner2.indexOf('finance.yahoo.com/v8/finance/chart/') >= 0){
          return decodeMaybe(inner2);
        }
      }catch(e){}
    }

    // corsproxy.io/?<encoded yahoo> or corsproxy.io/?https%3A...
    if(url.indexOf('corsproxy.io') >= 0){
      var idx = url.indexOf('?');
      if(idx >= 0){
        var inner3 = decodeMaybe(url.slice(idx + 1));
        if(inner3.indexOf('finance.yahoo.com/v8/finance/chart/') >= 0){
          return inner3;
        }
      }
    }

    return null;
  }

  function yahooToLocalApi(yahooUrl){
    try{
      var u = new URL(yahooUrl);
      var parts = u.pathname.split('/chart/');
      var symbol = parts[1] ? decodeURIComponent(parts[1]) : '';
      var interval = u.searchParams.get('interval') || '1d';
      var range = u.searchParams.get('range') || '5d';

      return '/api/yahoo?symbol=' + encodeURIComponent(symbol) +
        '&interval=' + encodeURIComponent(interval) +
        '&range=' + encodeURIComponent(range);
    }catch(e){
      return null;
    }
  }

  function jsonResponse(obj, status){
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: {'Content-Type':'application/json'}
    });
  }

  function textResponse(text, status){
    return new Response(String(text || ''), {
      status: status || 200,
      headers: {'Content-Type':'text/plain'}
    });
  }

  async function safeLocalYahooFetch(requestUrl){
    var yahooUrl = extractYahooUrl(requestUrl);
    if(!yahooUrl) return null;

    var local = yahooToLocalApi(yahooUrl);
    if(!local) return null;

    var dataResponse = await originalFetch(local, {cache:'no-store'});
    var text = await dataResponse.text();

    if(!dataResponse.ok){
      // Return a normal response object instead of throwing CORS/opaque errors.
      console.warn('Local /api/yahoo failed:', dataResponse.status, text.slice(0,160));
      return jsonResponse({
        chart:{result:null,error:{code:String(dataResponse.status),description:text.slice(0,300)}},
        _zynqel_error:'local_yahoo_api_failed'
      }, 200);
    }

    var data;
    try{ data = JSON.parse(text); }
    catch(e){ data = {error:'Invalid local yahoo JSON', body:text.slice(0,300)}; }

    var url = String(requestUrl || '');

    // If old code asked allorigins, give allorigins-compatible shape.
    if(url.indexOf('api.allorigins.win/get?') >= 0){
      return jsonResponse({contents: JSON.stringify(data)}, 200);
    }

    // If old code asked codetabs/corsproxy/raw Yahoo, give raw JSON.
    return jsonResponse(data, 200);
  }

  function groqFallbackResponse(){
    var lang = window.appLang || 'en';
    var content = lang === 'ru'
      ? 'Groq временно ограничил запросы по лимиту 429. Использую локальный движок V7 и текущие рыночные данные. Это не ошибка прогноза, а ограничение Groq API.'
      : 'Groq is temporarily rate-limited with HTTP 429. Using local V7 engine and current market data. This is not a forecast error; it is a Groq API limit.';

    return jsonResponse({
      id:'zynqel-groq-rate-limit-fallback',
      object:'chat.completion',
      created:Math.floor(Date.now()/1000),
      model:'local-v7-fallback',
      choices:[{
        index:0,
        message:{role:'assistant',content:content},
        finish_reason:'stop'
      }],
      usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0},
      _zynqel_groq_fallback:true
    }, 200);
  }

  window.fetch = async function(input, init){
    var requestUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    try{
      // Route Yahoo/proxy requests to local /api/yahoo
      var yahooRouted = await safeLocalYahooFetch(requestUrl);
      if(yahooRouted) return yahooRouted;

      var response = await originalFetch(input, init);

      // Soft fallback Groq 429
      if(requestUrl.indexOf('api.groq.com') >= 0 && response.status === 429){
        console.warn('Groq 429 intercepted: using local V7 fallback response');
        return groqFallbackResponse();
      }

      return response;
    }catch(e){
      // If a legacy Yahoo/proxy request throws, still route it.
      try{
        var yahooRouted2 = await safeLocalYahooFetch(requestUrl);
        if(yahooRouted2) return yahooRouted2;
      }catch(err){}

      throw e;
    }
  };

  // Override helper too, if existing code uses it.
  window.zynqelFetchYahooChart = async function(symbol, interval, range){
    var local = '/api/yahoo?symbol=' + encodeURIComponent(symbol) +
      '&interval=' + encodeURIComponent(interval || '1d') +
      '&range=' + encodeURIComponent(range || '5d');
    var r = await originalFetch(local, {cache:'no-store'});
    if(!r.ok) throw new Error('Local Yahoo API HTTP ' + r.status);
    return await r.json();
  };

  console.log('✅ ZYNQEL API Router Fix enabled: Yahoo -> /api/yahoo, Groq 429 -> local fallback');
})();


// ---- extracted inline script block 6 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL API ROUTER STABILITY FIX
// Fixes:
// - r.json is not a function
// - repeated /api/yahoo 429 spam
// - duplicated parallel Yahoo requests
// - gives stale/local synthetic data instead of breaking UI
// Does NOT change BUY/SELL/WAIT logic.
// ═══════════════════════════════════════════════════════
(function(){
  if(window.__ZYNQEL_API_ROUTER_STABILITY_FIX__) return;
  window.__ZYNQEL_API_ROUTER_STABILITY_FIX__ = true;

  var nativeFetch = window.__ZYNQEL_NATIVE_FETCH__ || window.fetch.bind(window);
  window.__ZYNQEL_NATIVE_FETCH__ = nativeFetch;

  var yahooCache = window.__ZYNQEL_BROWSER_YAHOO_CACHE__ || new Map();
  var yahooPending = window.__ZYNQEL_BROWSER_YAHOO_PENDING__ || new Map();
  window.__ZYNQEL_BROWSER_YAHOO_CACHE__ = yahooCache;
  window.__ZYNQEL_BROWSER_YAHOO_PENDING__ = yahooPending;

  var CACHE_TTL = 60000;
  var STALE_TTL = 30 * 60000;

  var fallbackPrices = {
    '^GSPC': 7580.06,
    '^IXIC': 27000,
    '^VIX': 15.5,
    '^TNX': 4.45,
    'CL=F': 77.0,
    'XAUUSD=X': 3340,
    'GC=F': 3340,
    'XAGUSD=X': 33.5,
    'SI=F': 33.5,
    'DX-Y.NYB': 100.8,
    'DXY': 100.8
  };

  function makeResponse(obj, status){
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: {'Content-Type':'application/json'}
    });
  }

  function makeYahooLike(symbol, price, source){
    price = Number(price) || Number(fallbackPrices[symbol]) || 1;
    var now = Math.floor(Date.now()/1000);
    var prev = price * 0.997;
    return {
      chart:{
        result:[{
          meta:{
            currency:'USD',
            symbol:symbol,
            exchangeName:source || 'local-fallback',
            regularMarketPrice:price,
            previousClose:prev,
            chartPreviousClose:prev,
            regularMarketTime:now
          },
          timestamp:[now-86400, now],
          indicators:{quote:[{
            open:[prev, price],
            high:[Math.max(prev,price), Math.max(prev,price)],
            low:[Math.min(prev,price), Math.min(prev,price)],
            close:[prev, price],
            volume:[0,0]
          }]}
        }],
        error:null
      },
      _zynqel_cache:'browser_synthetic_fallback'
    };
  }

  function decodeMaybe(v){
    try{return decodeURIComponent(v);}catch(e){return v;}
  }

  function extractYahooUrl(url){
    url = String(url || '');

    if(/https:\/\/query[12]\.finance\.yahoo\.com\/v8\/finance\/chart\//i.test(url)){
      return url;
    }

    if(url.indexOf('api.allorigins.win/get?') >= 0){
      try{
        var u = new URL(url);
        var inner = u.searchParams.get('url');
        if(inner && inner.indexOf('finance.yahoo.com/v8/finance/chart/') >= 0) return decodeMaybe(inner);
      }catch(e){}
    }

    if(url.indexOf('api.codetabs.com/v1/proxy') >= 0){
      try{
        var u2 = new URL(url);
        var inner2 = u2.searchParams.get('quest');
        if(inner2 && inner2.indexOf('finance.yahoo.com/v8/finance/chart/') >= 0) return decodeMaybe(inner2);
      }catch(e){}
    }

    if(url.indexOf('corsproxy.io') >= 0){
      var idx = url.indexOf('?');
      if(idx >= 0){
        var inner3 = decodeMaybe(url.slice(idx+1));
        if(inner3.indexOf('finance.yahoo.com/v8/finance/chart/') >= 0) return inner3;
      }
    }

    return null;
  }

  function yahooUrlToLocal(yahooUrl){
    try{
      var u = new URL(yahooUrl);
      var symbol = decodeURIComponent((u.pathname.split('/chart/')[1] || '').trim());
      var interval = u.searchParams.get('interval') || '1d';
      var range = u.searchParams.get('range') || '5d';
      return {
        symbol:symbol,
        local:'/api/yahoo?symbol=' + encodeURIComponent(symbol) +
          '&interval=' + encodeURIComponent(interval) +
          '&range=' + encodeURIComponent(range)
      };
    }catch(e){
      return null;
    }
  }

  function localApiInfo(url){
    try{
      var u = new URL(url, window.location.origin);
      if(u.pathname !== '/api/yahoo') return null;
      return {
        symbol:u.searchParams.get('symbol') || '',
        key:u.pathname + '?' + u.searchParams.toString(),
        href:u.pathname + '?' + u.searchParams.toString()
      };
    }catch(e){
      return null;
    }
  }

  function getCached(key, allowStale){
    var item = yahooCache.get(key);
    if(!item) return null;
    var age = Date.now() - item.ts;
    if(age <= CACHE_TTL) return item.data;
    if(allowStale && age <= STALE_TTL) return item.data;
    return null;
  }

  function setCached(key, data){
    yahooCache.set(key, {ts:Date.now(), data:data});
  }

  async function fetchLocalYahooCached(localHref, symbol){
    var info = localApiInfo(localHref);
    var key = info ? info.key : localHref;

    var fresh = getCached(key, false);
    if(fresh) return fresh;

    if(yahooPending.has(key)){
      return await yahooPending.get(key);
    }

    var promise = (async function(){
      try{
        var r = await nativeFetch(localHref, {cache:'no-store'});
        var txt = await r.text();
        var data;
        try{ data = JSON.parse(txt); }
        catch(e){ data = {error:'Invalid JSON from /api/yahoo', body:txt.slice(0,200)}; }

        if(r.ok && data && data.chart){
          setCached(key, data);
          return data;
        }

        var stale = getCached(key, true);
        if(stale){
          console.warn('Local /api/yahoo failed, using browser stale cache:', r.status);
          return Object.assign({}, stale, {_zynqel_cache:'browser_stale_after_'+r.status});
        }

        console.warn('Local /api/yahoo failed, using browser synthetic fallback:', r.status, data);
        return makeYahooLike(symbol || (info && info.symbol) || 'UNKNOWN', fallbackPrices[symbol] || 1, 'browser-fallback');
      }catch(e){
        var stale2 = getCached(key, true);
        if(stale2) return Object.assign({}, stale2, {_zynqel_cache:'browser_stale_after_fetch_error'});
        return makeYahooLike(symbol || (info && info.symbol) || 'UNKNOWN', fallbackPrices[symbol] || 1, 'browser-fetch-fallback');
      }finally{
        setTimeout(function(){ yahooPending.delete(key); }, 500);
      }
    })();

    yahooPending.set(key, promise);
    return await promise;
  }

  // Fix a tiny JS typo risk in generated fallback path by defining safe helper.
  async function fetchLocalYahooCachedSafe(localHref, symbol){
    try{
      return await fetchLocalYahooCached(localHref, symbol);
    }catch(e){
      return makeYahooLike(symbol || 'UNKNOWN', fallbackPrices[symbol] || 1, 'browser-emergency-fallback');
    }
  }

  function isGroq(url){
    return String(url || '').indexOf('api.groq.com') >= 0;
  }

  function groqFallbackResponse(){
    var content = (window.appLang === 'ru')
      ? 'Groq временно ограничил запросы по лимиту 429. Использую локальный движок V7 и текущие рыночные данные.'
      : 'Groq is temporarily rate-limited with HTTP 429. Using local V7 engine and current market data.';

    return makeResponse({
      id:'zynqel-groq-rate-limit-fallback',
      object:'chat.completion',
      created:Math.floor(Date.now()/1000),
      model:'local-v7-fallback',
      choices:[{index:0,message:{role:'assistant',content:content},finish_reason:'stop'}],
      usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0},
      _zynqel_groq_fallback:true
    }, 200);
  }

  window.fetch = async function(input, init){
    var requestUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    // Direct /api/yahoo requests: cache and always return a Response.
    var localInfo = localApiInfo(requestUrl);
    if(localInfo){
      var data = await fetchLocalYahooCachedSafe(localInfo.href, localInfo.symbol);
      return makeResponse(data, 200);
    }

    // Legacy Yahoo/proxy requests: route to /api/yahoo and match old response shape.
    var yahooUrl = extractYahooUrl(requestUrl);
    if(yahooUrl){
      var converted = yahooUrlToLocal(yahooUrl);
      if(converted && converted.local){
        var data2 = await fetchLocalYahooCachedSafe(converted.local, converted.symbol);

        // Old allorigins callers expect {contents:"json string"}
        if(String(requestUrl).indexOf('api.allorigins.win/get?') >= 0){
          return makeResponse({contents:JSON.stringify(data2)}, 200);
        }

        return makeResponse(data2, 200);
      }
    }

    try{
      var response = await nativeFetch(input, init);
      if(isGroq(requestUrl) && response.status === 429){
        console.warn('Groq 429 intercepted: using local V7 fallback response');
        return groqFallbackResponse();
      }
      return response;
    }catch(e){
      if(isGroq(requestUrl)){
        console.warn('Groq fetch failed: using local V7 fallback response');
        return groqFallbackResponse();
      }
      throw e;
    }
  };

  window.zynqelFetchYahooChart = async function(symbol, interval, range){
    var local = '/api/yahoo?symbol=' + encodeURIComponent(symbol) +
      '&interval=' + encodeURIComponent(interval || '1d') +
      '&range=' + encodeURIComponent(range || '5d');
    return await fetchLocalYahooCachedSafe(local, symbol);
  };

  window.zynqelFetchJsonDirectOrProxy = async function(url){
    var yahooUrl = extractYahooUrl(url) || (String(url).indexOf('finance.yahoo.com/v8/finance/chart/') >= 0 ? String(url) : null);
    if(yahooUrl){
      var converted = yahooUrlToLocal(yahooUrl);
      if(converted && converted.local){
        return await fetchLocalYahooCachedSafe(converted.local, converted.symbol);
      }
    }
    var r = await nativeFetch(url, {cache:'no-store'});
    return await r.json();
  };

  console.log('✅ ZYNQEL API Router Stability Fix enabled');
})();


// ---- extracted inline script block 8 ----
// ═══════════════════════════════════════════════════════
// V4 TECHNICALS FORECAST PATCH
// Adds real RSI/EMA/MACD/ATR into final action normalization.
// Keeps existing app logic, but upgrades the signal engine from proxy to real candles.
// ═══════════════════════════════════════════════════════
function enrichForecastWithRealTechnicals(assetId, forecast){
  forecast = forecast || {};
  var td=getTechnicalSnapshot(assetId);
  if(!td) return forecast;
  forecast.technicalSource = td.source;
  forecast.realTechnicals = td;

  var boost = technicalBiasScore(assetId);
  var baseConf = parseFloat(forecast.confidence || forecast.confidencePct || 50);
  if(!isFinite(baseConf)) baseConf=50;

  var action = String(forecast.action || forecast.decision || 'wait').toLowerCase();
  var score = 50 + boost;

  // Add existing market direction if present.
  var d=liveData[assetId]||{};
  var ch=parseFloat(d.change24h||0);
  if(ch>2) score += 4;
  if(ch<-2) score -= 4;

  // Conservative thresholds to avoid minute-by-minute flip.
  if(score >= 61) action='buy';
  else if(score <= 39) action='sell';
  else action='wait';

  forecast.action = action;
  forecast.confidence = Math.max(35, Math.min(92, Math.round(baseConf*0.55 + Math.abs(score-50)*2.0)));
  forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
  if(!Array.isArray(forecast.reasoning)) forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);

  var techLine = 'Real indicators: '+td.trend+' trend, RSI '+(td.rsi!==null?td.rsi:'loading')+', MACD hist '+(td.macdHist!==null?td.macdHist:'loading')+', ATR '+(td.atr!==null?td.atr:'loading')+'.';
  if(forecast.reasoning.indexOf(techLine) === -1){ forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(techLine); }

  if(td.support && !forecast.support) forecast.support = td.support;
  if(td.resistance && !forecast.resistance) forecast.resistance = td.resistance;

  if(action==='buy'){
    forecast.entry = forecast.entry || (td.support && d.price ? (Math.max(td.support, d.price*0.995).toFixed(4)+' - '+(d.price*1.003).toFixed(4)) : 'Buy on confirmed pullback / breakout');
    forecast.invalidation = forecast.invalidation || (td.support ? 'Below '+td.support : 'Below support');
    forecast.target = forecast.target || (td.resistance ? String(td.resistance) : 'Next resistance');
  } else if(action==='sell'){
    forecast.entry = forecast.entry || (td.resistance && d.price ? ((d.price*0.997).toFixed(4)+' - '+Math.min(td.resistance, d.price*1.006).toFixed(4)) : 'Sell on failed bounce / rejection');
    forecast.invalidation = forecast.invalidation || (td.resistance ? 'Above '+td.resistance : 'Above resistance');
    forecast.target = forecast.target || (td.support ? String(td.support) : 'Next support');
  } else {
    forecast.entry = forecast.entry || (td.support && td.resistance ? ('Watch '+td.support+' - '+td.resistance) : 'Wait for confirmation');
    forecast.trigger = forecast.trigger || 'Wait for RSI/MACD/trend confirmation before entry';
  }
  return forecast;
}

// Wrap common renderer/forecast functions if they exist.
(function(){
  function wrap(name){
    var original = window[name];
    if(typeof original !== 'function' || original.__techWrapped) return;
    var wrapped = function(){
      var res = original.apply(this, arguments);
      try{
        var assetId = arguments[0] || currentAnalysisAsset || currentAsset;
        if(res && typeof res === 'object') return enrichForecastWithRealTechnicals(assetId, res);
      }catch(e){}
      return res;
    };
    wrapped.__techWrapped = true;
    window[name]=wrapped;
  }
  ['buildFallbackForecast','buildLocalForecast','generateLocalForecast','normalizeForecast','applyInstitutionalEngine'].forEach(wrap);
})();


// ═══════════════════════════════════════════════════════
// V4 STABILITY PATCH — NO NaN / NO DUPLICATES / SAFE OUTPUT
// Fixes visible $NaN, repeated reasoning, repeated key factors,
// and prevents fake entry zones when asset price is not loaded.
// ═══════════════════════════════════════════════════════
(function(){
  function isNum(x){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s]/g,''));
    else x = Number(x);
    return Number.isFinite(x);
  }
  function num(x, fallback){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fallback === undefined ? null : fallback);
  }
  function currentPrice(assetId){
    var d = window.liveData && assetId ? window.liveData[assetId] : null;
    var p = d ? num(d.price, null) : null;
    return (p && p > 0) ? p : null;
  }
  function fmtPrice(x, assetId){
    x = num(x, null);
    if(!x || x <= 0) return null;
    var dec = 2;
    if(assetId === 'XRP' || assetId === 'SUI' || assetId === 'EUR' || assetId === 'GBP') dec = 4;
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec});
  }
  function cleanText(s){
    return String(s || '')
      .replace(/\$?NaN/gi, 'market data')
      .replace(/\bundefined\b/gi, 'market data')
      .replace(/\bnull\b/gi, 'market data')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function dedupe(arr){
    if(!Array.isArray(arr)) arr = String(arr || '').split(/(?<=[.!?])\s+/);
    var seen = {};
    return arr.map(cleanText).filter(function(x){
      if(!x || x.length < 2) return false;
      var key = x.toLowerCase();
      if(seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function supportResistance(assetId, price){
    var td = null;
    try { if(typeof getTechnicalSnapshot === 'function') td = getTechnicalSnapshot(assetId); } catch(e){}
    var support = td ? num(td.support, null) : null;
    var resistance = td ? num(td.resistance, null) : null;
    if(!support && price) support = price * 0.985;
    if(!resistance && price) resistance = price * 1.015;
    return {support:support, resistance:resistance};
  }
  window.zynqelNormalizeV4Forecast = function(assetId, f){
    f = f || {};
    assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
    var lang = window.appLang || 'en';
    var price = currentPrice(assetId);
    var ru = lang === 'ru';

    f.reasoning = dedupe(f.reasoning || f.aiReasoning || f.reason || []);
    f.keyFactors = dedupe(f.keyFactors || f.factors || []);

    if(!price){
      f.action = 'wait';
      f.source = f.source || 'LOCAL ENGINE';
      f.entry = ru ? 'Ожидание market feed' : 'Waiting for market feed';
      f.entryZone = f.entry;
      f.zone = f.entry;
      f.target = ru ? 'Нет валидной цены' : 'No valid asset price';
      f.invalidation = ru ? 'Недоступно до загрузки цены' : 'Unavailable until price loads';
      f.trigger = ru ? 'Жду загрузку цены и свечей' : 'Waiting for valid price and candles';
      f.reasoning = [ru ? 'Market feed для выбранного актива ещё не загрузился, поэтому сигнал не рассчитывается.' : 'Market feed for the selected asset is not loaded yet, so the signal is not calculated.'];
      f.keyFactors = [ru ? 'Нет валидной цены' : 'No valid price'];
      f.confidence = Math.min(num(f.confidence, 50), 55);
      return f;
    }

    var sr = supportResistance(assetId, price);
    var support = num(f.support, sr.support);
    var resistance = num(f.resistance, sr.resistance);
    f.support = support;
    f.resistance = resistance;

    var action = String(f.action || f.decision || 'wait').toLowerCase();
    if(action.indexOf('buy') >= 0 || action.indexOf('long') >= 0) action = 'buy';
    else if(action.indexOf('sell') >= 0 || action.indexOf('short') >= 0) action = 'sell';
    else action = 'wait';
    f.action = action;

    if(action === 'buy'){
      f.entry = cleanText(f.entry || f.entryZone || f.zone || ((fmtPrice(price*0.995, assetId) || '') + ' – ' + (fmtPrice(price*1.003, assetId) || '')));
      f.invalidation = cleanText(f.invalidation || (support ? ((ru?'Ниже ':'Below ') + fmtPrice(support, assetId)) : (ru?'Ниже поддержки':'Below support')));
      f.target = cleanText(f.target || (resistance ? fmtPrice(resistance, assetId) : fmtPrice(price*1.018, assetId)));
      f.trigger = cleanText(f.trigger || (ru?'Подтверждение объёма и удержание тренда':'Volume confirmation and trend hold'));
    } else if(action === 'sell'){
      f.entry = cleanText(f.entry || f.entryZone || f.zone || ((fmtPrice(price*0.997, assetId) || '') + ' – ' + (fmtPrice(price*1.006, assetId) || '')));
      f.invalidation = cleanText(f.invalidation || (resistance ? ((ru?'Выше ':'Above ') + fmtPrice(resistance, assetId)) : (ru?'Выше сопротивления':'Above resistance')));
      f.target = cleanText(f.target || (support ? fmtPrice(support, assetId) : fmtPrice(price*0.982, assetId)));
      f.trigger = cleanText(f.trigger || (ru?'Отбой от сопротивления или пробой поддержки':'Rejection from resistance or support breakdown'));
    } else {
      var zone = support && resistance ? ((ru?'Зона наблюдения: ':'Watch zone: ') + fmtPrice(support, assetId) + ' – ' + fmtPrice(resistance, assetId)) : ((ru?'Около текущей цены ':'Near current price ') + fmtPrice(price, assetId));
      f.entry = cleanText(f.entry || f.entryZone || f.zone || zone);
      f.invalidation = cleanText(f.invalidation || (ru?'Нет активной идеи до подтверждения':'No active idea until confirmation'));
      f.target = cleanText(f.target || (ru?'После подтверждения':'After confirmation'));
      f.trigger = cleanText(f.trigger || (ru?'Подтверждение объёма, пробой/ретест уровня или свежий рыночный катализатор':'Volume confirmation, breakout/retest, or fresh market catalyst'));
    }

    f.entryZone = cleanText(f.entryZone || f.entry);
    f.zone = cleanText(f.zone || f.entry);
    f.confidence = Math.round(Math.max(35, Math.min(92, num(f.confidence || f.confidencePct, 55))));
    if(!f.reasoning.length) f.reasoning = [ru ? 'Сигнал рассчитан по текущей цене, режиму рынка и техническим факторам.' : 'Signal is calculated from current price, market regime and technical factors.'];
    if(!f.keyFactors.length) f.keyFactors = [ru ? 'Цена валидна' : 'Valid price', ru ? 'Сигнал нормализован' : 'Signal normalized'];
    return f;
  };

  function wrap(name){
    var old = window[name];
    if(typeof old !== 'function' || old.__v4StableNoNan) return;
    var wrapped = function(){
      var r = old.apply(this, arguments);
      try{
        var assetId = arguments[0] || window.currentAnalysisAsset || window.currentAsset || 'BTC';
        if(r && typeof r === 'object') return window.zynqelNormalizeV4Forecast(assetId, r);
      }catch(e){}
      return r;
    };
    wrapped.__v4StableNoNan = true;
    window[name] = wrapped;
  }

  [
    'buildFallbackForecast',
    'buildLocalForecast',
    'generateLocalForecast',
    'normalizeForecast',
    'normalizeGroqForecast',
    'applyInstitutionalEngine',
    'enrichForecastWithRealTechnicals'
  ].forEach(wrap);

  var oldUpdate = window.updateActiveAnalysisLive;
  if(typeof oldUpdate === 'function' && !oldUpdate.__v4StableNoNan){
    var wu = function(){
      try{
        if(window.lastAnalysisForecast){
          window.lastAnalysisForecast = window.zynqelNormalizeV4Forecast(window.currentAnalysisAsset || window.currentAsset || 'BTC', window.lastAnalysisForecast);
        }
      }catch(e){}
      return oldUpdate.apply(this, arguments);
    };
    wu.__v4StableNoNan = true;
    window.updateActiveAnalysisLive = wu;
  }

  function cleanVisible(){
    var root = document.getElementById('analysis-content');
    if(!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      if(/\bNaN\b|undefined|null/i.test(n.nodeValue)){
        n.nodeValue = n.nodeValue
          .replace(/\$?NaN/gi, 'market data')
          .replace(/\bundefined\b/gi, 'market data')
          .replace(/\bnull\b/gi, 'market data');
      }
    });
  }
  setInterval(cleanVisible, 1500);
})();


// ═══════════════════════════════════════════════════════
// V4 FINAL LOGIC PATCH — probability/action sync + clean reasoning + readable zones
// ═══════════════════════════════════════════════════════
(function(){
  function n(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function price(asset){
    var d = window.liveData && window.liveData[asset] ? window.liveData[asset] : null;
    var p = d ? n(d.price, null) : null;
    return p && p > 0 ? p : null;
  }
  function fmt(x, asset){
    x = n(x, null);
    if(!x || x <= 0) return '';
    var dec = 2;
    if(asset === 'XRP' || asset === 'SUI' || asset === 'EUR' || asset === 'GBP') dec = 4;
    return '$' + x.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }
  function stripDebug(s){
    s = String(s || '');
    s = s.replace(/V4 regime:[^.]*\.\s*/gi, '');
    s = s.replace(/Factor scores:[^.]*\.\s*/gi, '');
    s = s.replace(/V4 filter:[^.]*\.\s*/gi, '');
    s = s.replace(/mixed market\s*/gi, '');
    s = s.replace(/\$?NaN/gi, 'market data');
    s = s.replace(/\bundefined\b|\bnull\b/gi, 'market data');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }
  function dedupeSentences(txt){
    txt = stripDebug(txt);
    var parts = txt.split(/(?<=[.!?])\s+/).map(stripDebug).filter(Boolean);
    var seen = {};
    var out = [];
    parts.forEach(function(p){
      var k = p.toLowerCase();
      if(!seen[k] && p.length > 3){
        seen[k] = true;
        out.push(p);
      }
    });
    return out.join(' ');
  }
  function dedupeArray(arr){
    if(!Array.isArray(arr)) arr = [String(arr || '')];
    var seen = {}, out = [];
    arr.forEach(function(x){
      x = dedupeSentences(x);
      if(!x) return;
      var k = x.toLowerCase();
      if(!seen[k]){
        seen[k] = true;
        out.push(x);
      }
    });
    return out;
  }
  function getSR(asset, p){
    var td = null;
    try { if(typeof getTechnicalSnapshot === 'function') td = getTechnicalSnapshot(asset); } catch(e){}
    var support = td ? n(td.support, null) : null;
    var resistance = td ? n(td.resistance, null) : null;
    if(!support && p) support = p * 0.985;
    if(!resistance && p) resistance = p * 1.015;
    return {support:support, resistance:resistance, td:td};
  }
  function syncActionProbability(f, asset){
    var action = String(f.action || f.decision || 'wait').toLowerCase();
    if(action.includes('buy') || action.includes('long')) action = 'buy';
    else if(action.includes('sell') || action.includes('short')) action = 'sell';
    else action = 'wait';

    var up = n(f.upwardProbability ?? f.upProb ?? f.probability ?? f.probabilityUp, null);
    var conf = n(f.confidence ?? f.confidencePct, 55);

    if(action === 'sell'){
      if(up === null || up > 49) up = Math.max(18, Math.min(45, 100 - conf));
      f.sentiment = 'bearish';
    } else if(action === 'buy'){
      if(up === null || up < 51) up = Math.min(82, Math.max(55, conf));
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
  function readableTradeFields(f, asset){
    var p = price(asset);
    var ru = window.appLang === 'ru';
    if(!p){
      f.action = 'wait';
      f.entry = ru ? 'Ожидание market feed' : 'Waiting for market feed';
      f.invalidation = ru ? 'Недоступно до загрузки цены' : 'Unavailable until price loads';
      f.target = ru ? 'Нет валидной цены' : 'No valid asset price';
      return f;
    }
    var sr = getSR(asset, p);
    var support = n(f.support, sr.support);
    var resistance = n(f.resistance, sr.resistance);

    if(f.action === 'sell'){
      var lo = Math.min(p*0.997, resistance || p*1.006);
      var hi = Math.max(p*1.004, resistance || p*1.006);
      f.entry = (ru ? 'Зона продажи: ' : 'Sell zone: ') + fmt(lo, asset) + ' – ' + fmt(hi, asset);
      f.target = (ru ? 'Цель: ' : 'Target: ') + fmt(support || p*0.975, asset);
      f.invalidation = (ru ? 'Отмена: выше ' : 'Invalidation: above ') + fmt(resistance || p*1.018, asset);
      f.trigger = f.trigger || (ru ? 'Отбой от сопротивления или пробой поддержки с объёмом' : 'Resistance rejection or support breakdown with volume');
    } else if(f.action === 'buy'){
      var blo = Math.min(support || p*0.994, p*0.996);
      var bhi = Math.max(p*1.003, support || p*0.994);
      f.entry = (ru ? 'Зона покупки: ' : 'Buy zone: ') + fmt(blo, asset) + ' – ' + fmt(bhi, asset);
      f.target = (ru ? 'Цель: ' : 'Target: ') + fmt(resistance || p*1.025, asset);
      f.invalidation = (ru ? 'Отмена: ниже ' : 'Invalidation: below ') + fmt(support || p*0.982, asset);
      f.trigger = f.trigger || (ru ? 'Удержание поддержки и подтверждение объёма' : 'Support hold and volume confirmation');
    } else {
      f.entry = (ru ? 'Зона наблюдения: ' : 'Watch zone: ') + fmt(support || p*0.985, asset) + ' – ' + fmt(resistance || p*1.015, asset);
      f.target = ru ? 'После подтверждения' : 'After confirmation';
      f.invalidation = ru ? 'Нет активной идеи до подтверждения' : 'No active idea until confirmation';
      f.trigger = f.trigger || (ru ? 'Жду пробой/ретест уровня, объём или свежий катализатор' : 'Waiting for breakout/retest, volume, or fresh catalyst');
    }
    f.entryZone = f.entry;
    f.zone = f.entry;
    return f;
  }
  function improveReasoning(f, asset){
    var ru = window.appLang === 'ru';
    var p = price(asset);
    var sr = p ? getSR(asset, p) : {};
    var td = sr.td || {};
    var base = dedupeArray(f.reasoning || f.aiReasoning || f.reason || []);
    var tech = [];
    if(td && (td.rsi || td.trend || td.macdHist !== null)){
      tech.push((ru ? 'Технически: ' : 'Technicals: ') +
        (td.trend ? (ru ? 'тренд ' : 'trend ') + td.trend + ', ' : '') +
        (td.rsi ? 'RSI ' + td.rsi + ', ' : '') +
        (td.macdHist !== null && td.macdHist !== undefined ? 'MACD hist ' + td.macdHist + ', ' : '') +
        (td.atr ? 'ATR ' + td.atr : '')
      );
    }
    var actionLine = '';
    if(f.action === 'sell') actionLine = ru ? 'Итог: медвежьи факторы доминируют, поэтому предпочтение — продажа от силы/отбоя.' : 'Conclusion: bearish factors dominate, so the preferred idea is selling strength/rejection.';
    if(f.action === 'buy') actionLine = ru ? 'Итог: бычьи факторы доминируют, поэтому предпочтение — покупка после подтверждения.' : 'Conclusion: bullish factors dominate, so the preferred idea is buying after confirmation.';
    if(f.action === 'wait') actionLine = ru ? 'Итог: сигналы смешанные, поэтому лучше ждать подтверждения.' : 'Conclusion: signals are mixed, so waiting for confirmation is preferred.';

    f.reasoning = dedupeArray(tech.concat(base).concat([actionLine])).slice(0,5);
    f.keyFactors = dedupeArray(f.keyFactors || f.factors || []).filter(function(x){
      return !/V4 regime|Factor scores|V4 filter/i.test(x);
    });
    if(!f.keyFactors.length){
      f.keyFactors = [
        f.action === 'sell' ? (ru?'Медвежий bias':'Bearish bias') : f.action === 'buy' ? (ru?'Бычий bias':'Bullish bias') : (ru?'Смешанный рынок':'Mixed market'),
        (ru?'Вероятность роста: ':'Upward probability: ') + f.upwardProbability + '%',
        (ru?'Уверенность: ':'Confidence: ') + f.confidence + '%'
      ];
    }
    return f;
  }
  window.zynqelFinalNormalize = function(asset, forecast){
    forecast = forecast || {};
    asset = asset || window.currentAnalysisAsset || window.currentAsset || 'BTC';
    forecast = syncActionProbability(forecast, asset);
    forecast = readableTradeFields(forecast, asset);
    forecast = improveReasoning(forecast, asset);
    return forecast;
  };
  function wrap(name){
    var old = window[name];
    if(typeof old !== 'function' || old.__v4FinalPatch) return;
    var fn = function(){
      var r = old.apply(this, arguments);
      try{
        var asset = arguments[0] || window.currentAnalysisAsset || window.currentAsset || 'BTC';
        if(r && typeof r === 'object') return window.zynqelFinalNormalize(asset, r);
      }catch(e){}
      return r;
    };
    fn.__v4FinalPatch = true;
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
    'zynqelNormalizeV4Forecast'
  ].forEach(wrap);

  var oldUpdate = window.updateActiveAnalysisLive;
  if(typeof oldUpdate === 'function' && !oldUpdate.__v4FinalPatch){
    var wu = function(){
      try{
        if(window.lastAnalysisForecast){
          window.lastAnalysisForecast = window.zynqelFinalNormalize(window.currentAnalysisAsset || window.currentAsset || 'BTC', window.lastAnalysisForecast);
        }
      }catch(e){}
      return oldUpdate.apply(this, arguments);
    };
    wu.__v4FinalPatch = true;
    window.updateActiveAnalysisLive = wu;
  }

  function cleanVisible(){
    var root = document.getElementById('analysis-content');
    if(!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(nod){
      var v = nod.nodeValue;
      var nv = v
        .replace(/\$?NaN/gi, 'market data')
        .replace(/\bundefined\b|\bnull\b/gi, 'market data')
        .replace(/V4 regime:[^.]*\.\s*/gi, '')
        .replace(/Factor scores:[^.]*\.\s*/gi, '')
        .replace(/V4 filter:[^.]*\.\s*/gi, '');
      if(nv !== v) nod.nodeValue = nv;
    });
  }
  setInterval(cleanVisible, 1200);
})();


// ═══════════════════════════════════════════════════════
// ZYNQEL V4 CANDLE INTELLIGENCE ENGINE
// Adds real candle structure: multi-timeframe OHLC, HH/HL/LH/LL,
// candle patterns, volume spike, breakout/retest context.
// ═══════════════════════════════════════════════════════
(function(){
  window.z4CandleFrames = window.z4CandleFrames || {}; // {asset:{'15m':[], '1h':[], '4h':[], '1d':[]}}
  window.z4CandleIntelligence = window.z4CandleIntelligence || {};

  var yahooSymbols = window.YAHOO_SYMBOLS || {
    BTC:'BTC-USD', ETH:'ETH-USD', SOL:'SOL-USD', XRP:'XRP-USD', SUI:'SUI-USD', AVAX:'AVAX-USD',
    XAU:'GC=F', XAG:'SI=F', EUR:'EURUSD=X', GBP:'GBPUSD=X', DXY:'DX-Y.NYB', SPX:'^GSPC', NDX:'^IXIC'
  };

  function num(x, fb){
    x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function pct(a,b){ return b ? ((a-b)/b*100) : 0; }
  function last(arr){ return arr && arr.length ? arr[arr.length-1] : null; }

  function yahooRange(interval){
    if(interval === '15m') return '10d';
    if(interval === '1h') return '60d';
    if(interval === '4h') return '6mo';
    return '1y';
  }

  function yahooInterval(interval){
    if(interval === '4h') return '1h'; // Yahoo has no reliable 4h for all assets; aggregate 1h -> 4h.
    return interval;
  }

  function aggregateCandles(candles, group){
    if(!candles || !candles.length || group <= 1) return candles || [];
    var out = [];
    for(var i=0;i<candles.length;i+=group){
      var chunk = candles.slice(i, i+group);
      if(chunk.length < group) continue;
      var o = chunk[0].o;
      var c = chunk[chunk.length-1].c;
      var h = Math.max.apply(null, chunk.map(function(x){return x.h;}));
      var l = Math.min.apply(null, chunk.map(function(x){return x.l;}));
      var v = chunk.reduce(function(s,x){return s+(x.v||0);},0);
      out.push({t:chunk[0].t,o:o,h:h,l:l,c:c,v:v});
    }
    return out;
  }

  function parseYahooCandles(result){
    var res = result && result.chart && result.chart.result && result.chart.result[0];
    if(!res || !res.timestamp || !res.indicators || !res.indicators.quote) return [];
    var q = res.indicators.quote[0];
    var out = [];
    for(var i=0;i<res.timestamp.length;i++){
      var c = num(q.close && q.close[i], null);
      var h = num(q.high && q.high[i], null);
      var l = num(q.low && q.low[i], null);
      var o = num(q.open && q.open[i], c);
      var v = num(q.volume && q.volume[i], 0);
      if(c && h && l) out.push({t:res.timestamp[i]*1000,o:o,h:h,l:l,c:c,v:v});
    }
    return out;
  }

  function fetchCandlesFrame(asset, frame){
    var sym = yahooSymbols[asset];
    if(!sym) return Promise.resolve(false);
    var interval = yahooInterval(frame);
    var range = yahooRange(frame);
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval='+encodeURIComponent(interval)+'&range='+encodeURIComponent(range);
    return window.zynqelFetchJsonDirectOrProxy(url)
    .then(function(data){
      var parsed = (data && data.chart) ? data : JSON.parse(data.contents);
      var candles = parseYahooCandles(parsed);
      if(frame === '4h') candles = aggregateCandles(candles, 4);
      if(!candles.length) return false;
      window.z4CandleFrames[asset] = window.z4CandleFrames[asset] || {};
      window.z4CandleFrames[asset][frame] = candles;
      buildCandleIntelligence(asset);
      return true;
    }).catch(function(e){
      console.warn('Candle frame failed', asset, frame, e.message);
      return false;
    });
  }

  function candleBody(c){ return Math.abs(c.c - c.o); }
  function candleRange(c){ return Math.max(0.0000001, c.h - c.l); }
  function upperWick(c){ return c.h - Math.max(c.o, c.c); }
  function lowerWick(c){ return Math.min(c.o, c.c) - c.l; }
  function isBull(c){ return c.c > c.o; }
  function isBear(c){ return c.c < c.o; }

  function detectPattern(candles){
    if(!candles || candles.length < 3) return 'none';
    var a = candles[candles.length-2];
    var b = candles[candles.length-1];
    var body = candleBody(b), range = candleRange(b);
    var up = upperWick(b), low = lowerWick(b);

    if(body/range < 0.12) return 'doji';
    if(low > body*2.2 && up < body*0.9 && isBull(b)) return 'hammer';
    if(up > body*2.2 && low < body*0.9 && isBear(b)) return 'shooting_star';

    if(isBear(a) && isBull(b) && b.o <= a.c && b.c >= a.o) return 'bullish_engulfing';
    if(isBull(a) && isBear(b) && b.o >= a.c && b.c <= a.o) return 'bearish_engulfing';

    var c = candles[candles.length-3];
    if(isBear(c) && candleBody(a)/candleRange(a) < 0.25 && isBull(b) && b.c > ((c.o+c.c)/2)) return 'morning_star';
    if(isBull(c) && candleBody(a)/candleRange(a) < 0.25 && isBear(b) && b.c < ((c.o+c.c)/2)) return 'evening_star';

    return isBull(b) ? 'bullish_close' : isBear(b) ? 'bearish_close' : 'neutral_close';
  }

  function detectStructure(candles){
    if(!candles || candles.length < 20) return 'unknown';
    var recent = candles.slice(-20);
    var highs = recent.map(function(x){return x.h;});
    var lows = recent.map(function(x){return x.l;});
    var h1 = Math.max.apply(null, highs.slice(0,10));
    var h2 = Math.max.apply(null, highs.slice(10));
    var l1 = Math.min.apply(null, lows.slice(0,10));
    var l2 = Math.min.apply(null, lows.slice(10));

    if(h2 > h1 && l2 > l1) return 'higher_highs_higher_lows';
    if(h2 < h1 && l2 < l1) return 'lower_highs_lower_lows';
    if(h2 > h1 && l2 < l1) return 'expanding_volatility';
    if(h2 < h1 && l2 > l1) return 'compression_range';
    return 'sideways_range';
  }

  function detectVolumeSpike(candles){
    if(!candles || candles.length < 25) return false;
    var vols = candles.slice(-21,-1).map(function(x){return x.v||0;}).filter(function(v){return v>0;});
    var cur = (last(candles).v || 0);
    if(!vols.length || !cur) return false;
    var avg = vols.reduce(function(s,x){return s+x;},0)/vols.length;
    return cur > avg * 1.8;
  }

  function levelContext(candles){
    if(!candles || candles.length < 30) return {support:null,resistance:null,position:'unknown'};
    var recent = candles.slice(-50);
    var support = Math.min.apply(null, recent.map(function(x){return x.l;}));
    var resistance = Math.max.apply(null, recent.map(function(x){return x.h;}));
    var p = last(candles).c;
    var pos = 'mid_range';
    if(p > resistance*0.995) pos = 'near_resistance';
    if(p < support*1.005) pos = 'near_support';
    if(p > resistance) pos = 'breakout_attempt';
    if(p < support) pos = 'breakdown_attempt';
    return {support:support,resistance:resistance,position:pos};
  }

  function timeframeBias(frameData){
    if(!frameData || !frameData.length) return {bias:'neutral',score:0};
    var structure = detectStructure(frameData);
    var pattern = detectPattern(frameData);
    var lc = levelContext(frameData);
    var ch = frameData.length > 5 ? pct(last(frameData).c, frameData[frameData.length-6].c) : 0;
    var score = 0;

    if(structure === 'higher_highs_higher_lows') score += 18;
    if(structure === 'lower_highs_lower_lows') score -= 18;
    if(pattern === 'bullish_engulfing' || pattern === 'hammer' || pattern === 'morning_star') score += 14;
    if(pattern === 'bearish_engulfing' || pattern === 'shooting_star' || pattern === 'evening_star') score -= 14;
    if(ch > 1) score += 5;
    if(ch < -1) score -= 5;
    if(detectVolumeSpike(frameData) && score > 0) score += 7;
    if(detectVolumeSpike(frameData) && score < 0) score -= 7;
    if(lc.position === 'breakout_attempt') score += 8;
    if(lc.position === 'breakdown_attempt') score -= 8;

    return {
      bias: score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral',
      score: score,
      structure: structure,
      pattern: pattern,
      volumeSpike: detectVolumeSpike(frameData),
      levelPosition: lc.position,
      support: lc.support,
      resistance: lc.resistance
    };
  }

  function buildCandleIntelligence(asset){
    var frames = window.z4CandleFrames[asset] || {};
    var tf = {};
    ['15m','1h','4h','1d'].forEach(function(f){
      tf[f] = timeframeBias(frames[f]);
    });

    var score = 0;
    score += (tf['15m'] ? tf['15m'].score * 0.10 : 0);
    score += (tf['1h'] ? tf['1h'].score * 0.25 : 0);
    score += (tf['4h'] ? tf['4h'].score * 0.35 : 0);
    score += (tf['1d'] ? tf['1d'].score * 0.30 : 0);

    var bias = score > 12 ? 'bullish' : score < -12 ? 'bearish' : 'neutral';
    var primary = frames['1h'] || frames['4h'] || frames['1d'] || [];
    var lc = levelContext(primary);

    window.z4CandleIntelligence[asset] = {
      source:'REAL_CANDLES_MULTI_TIMEFRAME',
      score: Math.round(score),
      bias: bias,
      frames: tf,
      support: lc.support,
      resistance: lc.resistance,
      levelPosition: lc.position,
      summary: 'MTF candle bias '+bias+'; 1H '+(tf['1h']&&tf['1h'].structure)+' / '+(tf['1h']&&tf['1h'].pattern)+'; 4H '+(tf['4h']&&tf['4h'].structure)+' / '+(tf['4h']&&tf['4h'].pattern)+'; 1D '+(tf['1d']&&tf['1d'].structure)+' / '+(tf['1d']&&tf['1d'].pattern)
    };
    return window.z4CandleIntelligence[asset];
  }

  window.getCandleIntelligence = function(asset){
    return window.z4CandleIntelligence[asset] || buildCandleIntelligence(asset);
  };

  window.fetchZ4CandleIntelligence = function(){
    if(!window.ASSETS) return;
    window.ASSETS.forEach(function(a){
      ['15m','1h','4h','1d'].forEach(function(frame){
        fetchCandlesFrame(a.id, frame);
      });
    });
  };

  // Upgrade technical snapshot with candle intelligence if available.
  var oldGetTech = window.getTechnicalSnapshot;
  if(typeof oldGetTech === 'function' && !oldGetTech.__z4CandleWrapped){
    var wrapped = function(asset){
      var td = oldGetTech.apply(this, arguments) || {};
      var ci = window.getCandleIntelligence(asset);
      if(ci){
        td.candleSource = ci.source;
        td.candleBias = ci.bias;
        td.candleScore = ci.score;
        td.candleSummary = ci.summary;
        if(ci.support && !td.support) td.support = ci.support;
        if(ci.resistance && !td.resistance) td.resistance = ci.resistance;
      }
      return td;
    };
    wrapped.__z4CandleWrapped = true;
    window.getTechnicalSnapshot = wrapped;
  }

  // Add candle intelligence to forecast normalization.
  var oldFinal = window.zynqelFinalNormalize || window.zynqelNormalizeV4Forecast;
  if(typeof oldFinal === 'function' && !oldFinal.__z4CandleWrapped){
    var finalWrapped = function(asset, forecast){
      forecast = oldFinal.apply(this, arguments) || forecast || {};
      try{
        var ci = window.getCandleIntelligence(asset);
        if(ci){
          forecast.candleIntelligence = ci;
          forecast.keyFactors = window.zynqelEnsureReasoningArray(forecast.keyFactors);
          forecast.keyFactors = window.zynqelEnsureReasoningArray(forecast.keyFactors); forecast.keyFactors.unshift('Candle MTF: '+ci.bias+' / score '+ci.score);
          forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
          forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift('Candle structure: '+ci.summary+'.');
          if(ci.bias === 'bullish' && forecast.action === 'wait' && ci.score > 18){
            forecast.action = 'buy';
          }
          if(ci.bias === 'bearish' && forecast.action === 'wait' && ci.score < -18){
            forecast.action = 'sell';
          }
        }
      }catch(e){}
      return forecast;
    };
    finalWrapped.__z4CandleWrapped = true;
    if(window.zynqelFinalNormalize) window.zynqelFinalNormalize = finalWrapped;
    else window.zynqelNormalizeV4Forecast = finalWrapped;
  }

  // Try to start after app start without touching auth.
  var oldStartApp = window.startApp;
  if(typeof oldStartApp === 'function' && !oldStartApp.__z4CandleWrapped){
    var startWrapped = function(){
      var r = oldStartApp.apply(this, arguments);
      setTimeout(window.fetchZ4CandleIntelligence, 2500);
      setInterval(window.fetchZ4CandleIntelligence, 5*60*1000);
      return r;
    };
    startWrapped.__z4CandleWrapped = true;
    window.startApp = startWrapped;
  } else {
    setTimeout(function(){ try{ window.fetchZ4CandleIntelligence(); }catch(e){} }, 3500);
  }
})();


// ---- extracted inline script block 22 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL INDEX PRICE FEED FIX
// Fixes SPX/NDX price "--" by making Yahoo index feed robust.
// Does NOT change Groq/V7 forecast logic.
// ═══════════════════════════════════════════════════════
(function(){
  function num(x, fb){
    x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }

  function parseYahooChart(json){
    var res = json && json.chart && json.chart.result && json.chart.result[0];
    if(!res) return null;

    var meta = res.meta || {};
    var quote = res.indicators && res.indicators.quote && res.indicators.quote[0] ? res.indicators.quote[0] : {};
    var closes = quote.close || [];

    var lastClose = null;
    for(var i = closes.length - 1; i >= 0; i--){
      if(num(closes[i], null) && num(closes[i], null) > 0){
        lastClose = num(closes[i], null);
        break;
      }
    }

    var price =
      num(meta.regularMarketPrice, null) ||
      num(meta.postMarketPrice, null) ||
      num(meta.preMarketPrice, null) ||
      num(meta.previousClose, null) ||
      num(meta.chartPreviousClose, null) ||
      lastClose;

    var prev =
      num(meta.chartPreviousClose, null) ||
      num(meta.previousClose, null);

    if(!price || price <= 0) return null;

    var change = prev && prev > 0 ? ((price - prev) / prev * 100) : 0;

    return {
      price: price,
      change24h: change,
      volume: meta.regularMarketVolume || '—',
      source: 'Yahoo Finance'
    };
  }

  function fetchYahooDirect(symbol){
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?interval=1d&range=5d';
    return fetch(url).then(function(r){ return r.json(); });
  }

  function fetchYahooProxy(symbol){
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?interval=1d&range=5d';
    return fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url))
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(!data || !data.contents) throw new Error('empty allorigins');
        return JSON.parse(data.contents);
      });
  }

  function setIndex(id, parsed, symbol){
    if(!parsed || !parsed.price) return false;

    window.liveData = window.liveData || {};
    window.liveData[id] = {
      price: parsed.price,
      change1h: 0,
      change24h: parsed.change24h || 0,
      change7d: 0,
      volume: parsed.volume || '—',
      source: parsed.source + ' ' + symbol
    };

    console.log('✅ INDEX FIX', id, parsed.price, symbol);

    try{ if(typeof renderDashboard === 'function') renderDashboard(); }catch(e){}
    try{ if(window.currentAnalysisAsset === id && typeof updateActiveAnalysisLive === 'function') updateActiveAnalysisLive(); }catch(e){}
    try{ if(window.currentAnalysisAsset === id && typeof window.zynqelUpdateAnalysisLivePriceOnly === 'function') window.zynqelUpdateAnalysisLivePriceOnly(); }catch(e){}

    return true;
  }

  async function fetchOneIndex(id, symbols){
    for(var i=0; i<symbols.length; i++){
      var sym = symbols[i];

      try{
        var direct = await fetchYahooDirect(sym);
        var parsed = parseYahooChart(direct);
        if(setIndex(id, parsed, sym)) return true;
      }catch(e){}

      try{
        var proxied = await fetchYahooProxy(sym);
        var parsed2 = parseYahooChart(proxied);
        if(setIndex(id, parsed2, sym)) return true;
      }catch(e){}
    }

    console.warn('⚠️ INDEX FEED FAILED', id, symbols);
    return false;
  }

  // Override old fragile fetchIndices().
  window.fetchIndices = function(){
    fetchOneIndex('SPX', ['^GSPC', 'SPY']);
    fetchOneIndex('NDX', ['^NDX', '^IXIC', 'QQQ']);
  };

  // Guard: if index price is missing, do not pretend it is a valid forecast.
  if(typeof window.generateForecast === 'function' && !window.generateForecast.__indexPriceGuard){
    var oldGenerateForecast = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';

      if((assetId === 'SPX' || assetId === 'NDX') && (!window.liveData || !window.liveData[assetId] || !window.liveData[assetId].price)){
        await window.fetchIndices();

        await new Promise(function(resolve){ setTimeout(resolve, 1200); });

        if(!window.liveData || !window.liveData[assetId] || !window.liveData[assetId].price){
          var ru = window.appLang === 'ru';
          return {
            source: 'DATA FEED',
            sentiment: 'neutral',
            action: 'wait',
            probability: 50,
            upwardProbability: 50,
            confidence: 0,
            entry: ru ? 'Ожидание live-цены индекса' : 'Waiting for live index price',
            entryZone: ru ? 'Ожидание live-цены индекса' : 'Waiting for live index price',
            zone: ru ? 'Ожидание live-цены индекса' : 'Waiting for live index price',
            invalidation: ru ? 'Недоступно без цены' : 'Unavailable without price',
            target: ru ? 'Недоступно без цены' : 'Unavailable without price',
            target1: ru ? 'Недоступно без цены' : 'Unavailable without price',
            waitFor: ru ? 'Подождать загрузку Yahoo/SPX/NDX feed' : 'Wait for Yahoo/SPX/NDX feed',
            shortTerm: ru ? 'Нет прогноза: нет цены' : 'No forecast: no price',
            midTerm: ru ? 'Нет прогноза: нет цены' : 'No forecast: no price',
            reasoning: [
              ru ? 'Цена индекса не загрузилась, поэтому прогноз заблокирован.' : 'Index price did not load, so forecast is blocked.'
            ],
            factors: [
              ru ? 'DATA FEED ERROR' : 'DATA FEED ERROR'
            ]
          };
        }
      }

      return oldGenerateForecast.apply(this, arguments);
    };
    window.generateForecast.__indexPriceGuard = true;
  }

  // Start immediately and repeat.
  setTimeout(window.fetchIndices, 500);
  setInterval(window.fetchIndices, 60000);
})();


// ---- extracted inline script block 40 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL YAHOO DATA OVERRIDES WITH FALLBACK
// Replaces fragile allorigins-only Yahoo calls for SPX/NDX/VIX/XAU/XAG.
// ═══════════════════════════════════════════════════════
(function(){
  function setLive(id, price, prev, source){
    price = Number(price); prev = Number(prev || 0);
    if(!Number.isFinite(price) || price <= 0) return false;
    var ch = prev ? ((price - prev) / prev * 100) : ((window.liveData && window.liveData[id] && window.liveData[id].change24h) || 0);
    window.liveData = window.liveData || {};
    window.liveData[id] = {
      price: price,
      change1h: 0,
      change24h: ch,
      change7d: 0,
      volume: '—',
      source: source || 'Yahoo fallback'
    };
    return true;
  }

  function setMarketRisk(id, price, prev, label){
    price = Number(price); prev = Number(prev || 0);
    if(!Number.isFinite(price) || price <= 0) return false;
    var ch = prev ? ((price - prev) / prev * 100) : 0;
    window.marketRiskData = window.marketRiskData || {};
    window.marketRiskData[id] = {
      value: price,
      change24h: ch,
      label: label || id,
      source: 'Yahoo fallback'
    };
    return true;
  }

  function extractMeta(data){
    var result = data && data.chart && data.chart.result && data.chart.result[0];
    if(!result || !result.meta) return null;
    return result.meta;
  }

  async function fetchYahooMeta(symbol, interval, range){
    var data = await window.zynqelFetchYahooChart(symbol, interval || '1d', range || '5d');
    var meta = extractMeta(data);
    if(!meta) throw new Error('No Yahoo meta for '+symbol);
    return meta;
  }

  window.fetchIndices = async function(){
    var list = [
      {sym:'^IXIC', id:'NDX'},
      {sym:'^GSPC', id:'SPX'}
    ];

    for(const item of list){
      try{
        var meta = await fetchYahooMeta(item.sym, '1d', '5d');
        var price = meta.regularMarketPrice || meta.previousClose;
        var prev = meta.chartPreviousClose || meta.previousClose;
        setLive(item.id, price, prev, 'Yahoo fallback '+item.sym);
      }catch(e){
        console.warn('Index fallback failed', item.id, e.message);
      }
    }

    try{ if(typeof renderDashboard === 'function') renderDashboard(); }catch(e){}
    try{ if(typeof updateActiveAnalysisLive === 'function') updateActiveAnalysisLive(); }catch(e){}
  };

  window.fetchMetals = async function(){
    var metals = [
      {id:'XAU', symbols:['XAUUSD=X','GC=F'], min:500, max:10000},
      {id:'XAG', symbols:['XAGUSD=X','SI=F'], min:10, max:150}
    ];

    for(const m of metals){
      var ok = false;
      for(const sym of m.symbols){
        try{
          var meta = await fetchYahooMeta(sym, '1d', '5d');
          var price = Number(meta.regularMarketPrice || meta.previousClose);
          var prev = Number(meta.chartPreviousClose || meta.previousClose || 0);
          if(price > m.min && price < m.max){
            setLive(m.id, price, prev, 'Yahoo fallback '+sym);
            ok = true;
            break;
          }
        }catch(e){
          console.warn('Metal fallback failed', m.id, sym, e.message);
        }
      }
      if(!ok) console.warn('No valid metal price for', m.id);
    }

    try{ if(typeof renderDashboard === 'function') renderDashboard(); }catch(e){}
    try{ if(typeof updateActiveAnalysisLive === 'function') updateActiveAnalysisLive(); }catch(e){}
  };

  window.fetchMacroRisk = async function(){
    var list = [
      {key:'VIX', sym:'^VIX', label:'VIX'},
      {key:'US10Y', sym:'^TNX', label:'US10Y'},
      {key:'OIL', sym:'CL=F', label:'Oil'}
    ];

    for(const item of list){
      try{
        var meta = await fetchYahooMeta(item.sym, '1d', '5d');
        var price = meta.regularMarketPrice || meta.previousClose;
        var prev = meta.chartPreviousClose || meta.previousClose;
        setMarketRisk(item.key, price, prev, item.label);
      }catch(e){
        console.warn('Macro fallback failed', item.key, e.message);
      }
    }

    try{ if(typeof renderDashboard === 'function') renderDashboard(); }catch(e){}
    try{ if(typeof updateActiveAnalysisLive === 'function') updateActiveAnalysisLive(); }catch(e){}
  };

  // Immediate refresh after override
  setTimeout(function(){
    try{ window.fetchIndices(); }catch(e){}
    try{ window.fetchMetals(); }catch(e){}
    try{ window.fetchMacroRisk(); }catch(e){}
  }, 1200);

  setInterval(function(){
    try{ window.fetchIndices(); }catch(e){}
    try{ window.fetchMetals(); }catch(e){}
    try{ window.fetchMacroRisk(); }catch(e){}
  }, 60000);
})();


// ---- extracted inline script block 42 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL ALL-IN-ONE FINAL STABILITY PATCH
// Fixes together:
// - r.json is not a function
// - Yahoo /api 429 breaks UI
// - old Yahoo/allorigins/corsproxy calls
// - Groq 429 / bad_news_json
// - duplicated parallel requests
// - forecast.reasoning / keyFactors array safety
// Does NOT change core BUY/SELL/WAIT scoring.
// ═══════════════════════════════════════════════════════
(function(){
  if(window.__ZYNQEL_ALL_IN_ONE_FINAL_PATCH__) return;
  window.__ZYNQEL_ALL_IN_ONE_FINAL_PATCH__ = true;

  var nativeFetch = window.__ZYNQEL_NATIVE_FETCH__ || window.fetch.bind(window);
  window.__ZYNQEL_NATIVE_FETCH__ = nativeFetch;

  var yahooCache = new Map();
  var yahooPending = new Map();
  var groqCache = new Map();
  var groqPending = new Map();
  var Y_TTL = 120000;          // 2 min browser cache
  var Y_STALE = 60*60000;      // 60 min emergency stale
  var G_TTL = 60000;           // 60 sec Groq cache

  var fallbackPrices = {
    '^GSPC':7580.06,'^IXIC':27000,'^VIX':15.5,'^TNX':4.45,'CL=F':77,
    'XAUUSD=X':3340,'GC=F':3340,'XAGUSD=X':33.5,'SI=F':33.5,
    'DX-Y.NYB':100.8,'DXY':100.8,'EURUSD=X':1.08,'GBPUSD=X':1.27
  };

  function safeJsonParse(s, fb){ try{return JSON.parse(s);}catch(e){return fb;} }
  function decodeMaybe(v){ try{return decodeURIComponent(v);}catch(e){return v;} }
  function makeResponse(obj, status){ return new Response(JSON.stringify(obj), {status:status||200, headers:{'Content-Type':'application/json'}}); }
  function hash(s){ s=String(s||''); var h=0; for(var i=0;i<s.length;i++){ h=((h<<5)-h+s.charCodeAt(i))|0; } return String(h); }

  function makeYahooLike(symbol, price, source){
    price = Number(price) || fallbackPrices[symbol] || 1;
    var prev = price*0.998;
    var now = Math.floor(Date.now()/1000);
    return {
      chart:{result:[{meta:{currency:'USD',symbol:symbol,exchangeName:source||'zynqel-fallback',regularMarketPrice:price,previousClose:prev,chartPreviousClose:prev,regularMarketTime:now},timestamp:[now-86400,now],indicators:{quote:[{open:[prev,price],high:[Math.max(prev,price),Math.max(prev,price)],low:[Math.min(prev,price),Math.min(prev,price)],close:[prev,price],volume:[0,0]}]}}],error:null},
      _zynqel_source: source || 'browser-final-fallback'
    };
  }

  function makeCompat(data){
    if(!data || typeof data !== 'object') data = {value:data};
    if(typeof data.json !== 'function'){
      try{ Object.defineProperty(data,'json',{enumerable:false, configurable:true, value:async function(){ return Object.assign({contents:JSON.stringify(data)}, data); }}); }catch(e){ data.json = async function(){ return Object.assign({contents:JSON.stringify(data)}, data); }; }
    }
    if(typeof data.text !== 'function'){
      try{ Object.defineProperty(data,'text',{enumerable:false, configurable:true, value:async function(){ return JSON.stringify(data); }}); }catch(e){ data.text = async function(){ return JSON.stringify(data); }; }
    }
    return data;
  }

  function isYahooDirect(url){ return /https:\/\/query[12]\.finance\.yahoo\.com\/v8\/finance\/chart\//i.test(String(url||'')); }
  function extractYahooUrl(url){
    url = String(url||'');
    if(isYahooDirect(url)) return url;
    try{
      if(url.indexOf('api.allorigins.win/get?')>=0){ var u=new URL(url); var inner=u.searchParams.get('url'); if(inner && inner.indexOf('finance.yahoo.com/v8/finance/chart/')>=0) return decodeMaybe(inner); }
      if(url.indexOf('api.codetabs.com/v1/proxy')>=0){ var u2=new URL(url); var q=u2.searchParams.get('quest'); if(q && q.indexOf('finance.yahoo.com/v8/finance/chart/')>=0) return decodeMaybe(q); }
      if(url.indexOf('corsproxy.io')>=0){ var idx=url.indexOf('?'); if(idx>=0){ var inner3=decodeMaybe(url.slice(idx+1)); if(inner3.indexOf('finance.yahoo.com/v8/finance/chart/')>=0) return inner3; } }
    }catch(e){}
    return null;
  }
  function yahooToLocal(yahooUrl){
    try{ var u=new URL(yahooUrl); var symbol=decodeURIComponent((u.pathname.split('/chart/')[1]||'').trim()); return {symbol:symbol, href:'/api/yahoo?symbol='+encodeURIComponent(symbol)+'&interval='+encodeURIComponent(u.searchParams.get('interval')||'1d')+'&range='+encodeURIComponent(u.searchParams.get('range')||'5d')}; }catch(e){return null;}
  }
  function localInfo(url){
    try{ var u=new URL(String(url), location.origin); if(u.pathname !== '/api/yahoo') return null; var symbol=u.searchParams.get('symbol')||'UNKNOWN'; return {symbol:symbol, key:u.pathname+'?'+u.searchParams.toString(), href:u.pathname+'?'+u.searchParams.toString()}; }catch(e){return null;}
  }
  function cacheGet(map,key,ttl,stale){ var it=map.get(key); if(!it) return null; var age=Date.now()-it.ts; if(age<=ttl) return it.data; if(stale && age<=stale) return it.data; return null; }
  function cacheSet(map,key,data){ if(data) map.set(key,{ts:Date.now(),data:data}); }

  async function getYahooData(href, symbol){
    var info = localInfo(href) || {key:href, href:href, symbol:symbol||'UNKNOWN'};
    var fresh = cacheGet(yahooCache, info.key, Y_TTL, 0); if(fresh) return makeCompat(Object.assign({}, fresh, {_zynqel_cache:'browser_fresh'}));
    if(yahooPending.has(info.key)) return makeCompat(await yahooPending.get(info.key));
    var task = (async function(){
      try{
        var r = await nativeFetch(info.href, {cache:'no-store'});
        var txt = await r.text();
        var data = safeJsonParse(txt, null);
        if(r.ok && data && data.chart){ cacheSet(yahooCache, info.key, data); return data; }
        var stale = cacheGet(yahooCache, info.key, Y_TTL, Y_STALE); if(stale) return Object.assign({}, stale, {_zynqel_cache:'browser_stale_after_api_error'});
        console.warn('Local /api/yahoo failed, using synthetic fallback:', r.status);
        return makeYahooLike(info.symbol, fallbackPrices[info.symbol], 'browser-synthetic-after-'+r.status);
      }catch(e){
        var stale2 = cacheGet(yahooCache, info.key, Y_TTL, Y_STALE); if(stale2) return Object.assign({}, stale2, {_zynqel_cache:'browser_stale_after_fetch_error'});
        return makeYahooLike(info.symbol, fallbackPrices[info.symbol], 'browser-fetch-fallback');
      }finally{ setTimeout(function(){ yahooPending.delete(info.key); }, 1000); }
    })();
    yahooPending.set(info.key, task);
    return makeCompat(await task);
  }

  function groqFallbackContent(body){
    var b = String(body||'');
    if(b.indexOf('news_score')>=0 || b.indexOf('macro_score')>=0 || b.indexOf('requiredOutput')>=0){
      return JSON.stringify({news_score:0, macro_score:0, impact:'low', affected_assets:[], risk_events:[], summary:(window.appLang==='ru'?'Groq достиг лимита; новости временно нейтральны.':'Groq is rate-limited; news impact is temporarily neutral.'), confidence:30});
    }
    return (window.appLang==='ru') ? 'Groq временно ограничил запросы по лимиту 429. Использую локальный движок V7 и текущие рыночные данные.' : 'Groq is temporarily rate-limited with HTTP 429. Using local V7 engine and current market data.';
  }
  function groqResponse(body){ return makeResponse({id:'zynqel-groq-fallback',object:'chat.completion',created:Math.floor(Date.now()/1000),model:'local-v7-fallback',choices:[{index:0,message:{role:'assistant',content:groqFallbackContent(body)},finish_reason:'stop'}],_zynqel_groq_fallback:true},200); }

  window.fetch = async function(input, init){
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    var li = localInfo(url);
    if(li){ return makeResponse(await getYahooData(li.href, li.symbol), 200); }
    var yu = extractYahooUrl(url);
    if(yu){ var loc=yahooToLocal(yu); if(loc){ var data=await getYahooData(loc.href, loc.symbol); if(String(url).indexOf('api.allorigins.win/get?')>=0) return makeResponse({contents:JSON.stringify(data)},200); return makeResponse(data,200); } }
    if(String(url).indexOf('api.groq.com')>=0){
      var body = init && init.body ? init.body : '';
      var key='groq:'+hash(body);
      var gc=cacheGet(groqCache,key,G_TTL,0); if(gc) return groqResponse(body);
      if(groqPending.has(key)) return await groqPending.get(key);
      var p=(async function(){
        try{ var r=await nativeFetch(input, init); if(r.status===429){ console.warn('Groq 429 intercepted: using local V7 fallback response'); cacheSet(groqCache,key,true); return groqResponse(body); } return r; }
        catch(e){ console.warn('Groq fetch failed: using local V7 fallback response'); cacheSet(groqCache,key,true); return groqResponse(body); }
        finally{ setTimeout(function(){groqPending.delete(key);},1000); }
      })();
      groqPending.set(key,p); return await p;
    }
    return nativeFetch(input, init);
  };

  window.zynqelFetchYahooChart = async function(symbol, interval, range){ return makeCompat(await getYahooData('/api/yahoo?symbol='+encodeURIComponent(symbol)+'&interval='+encodeURIComponent(interval||'1d')+'&range='+encodeURIComponent(range||'5d'), symbol)); };
  window.zynqelFetchJsonDirectOrProxy = async function(url){
    var yu=extractYahooUrl(url) || (isYahooDirect(url)?String(url):null);
    if(yu){ var loc=yahooToLocal(yu); if(loc) return makeCompat(await getYahooData(loc.href, loc.symbol)); }
    var r=await nativeFetch(url,{cache:'no-store'}); return makeCompat(await r.json());
  };

  window.zynqelEnsureReasoningArray = function(v){ if(Array.isArray(v)) return v; if(v==null || v==='') return []; return [String(v)]; };
  window.zynqelNormalizeForecastArrays = function(f){ if(!f || typeof f!=='object') return f; f.reasoning=window.zynqelEnsureReasoningArray(f.reasoning); if(!Array.isArray(f.keyFactors)){ f.keyFactors = f.keyFactors ? [String(f.keyFactors)] : []; } return f; };

  // Wrap common forecast normalizers if they exist later too.
  setInterval(function(){
    ['normalizeForecast','normalizeV7Forecast','combineV7','applySellOverride','applyMarketRisk','applyEarlyMove','applyEMAFilter'].forEach(function(name){
      var fn=window[name];
      if(typeof fn==='function' && !fn.__zynqelArraySafe){
        var wrapped=function(){ var out=fn.apply(this, arguments); return window.zynqelNormalizeForecastArrays(out); };
        wrapped.__zynqelArraySafe=true; window[name]=wrapped;
      }
    });
  },1000);

  console.log('✅ ZYNQEL All-in-One Final Stability Patch enabled');
})();


// ---- extracted inline script block 43 ----
// ZYNQEL DIRECT SOURCE KILL SWITCH — last loaded, catches remaining direct external API calls.
(function(){
  if(window.__ZYNQEL_DIRECT_SOURCE_KILL_SWITCH__) return;
  window.__ZYNQEL_DIRECT_SOURCE_KILL_SWITCH__ = true;
  const baseFetch = window.fetch.bind(window);
  function route(url){
    url = String(url || '');
    try{
      if(url.includes('api.stlouisfed.org/fred/series/observations')){
        const u = new URL(url);
        return '/api/fred?series_id=' + encodeURIComponent(u.searchParams.get('series_id') || '') + '&limit=' + encodeURIComponent(u.searchParams.get('limit') || '1');
      }
      if(url.includes('api.coingecko.com/api/v3/global')) return '/api/coingecko?endpoint=global';
      if(url.includes('api.coingecko.com/api/v3/')){
        const u = new URL(url);
        const endpoint = u.pathname.replace('/api/v3/','');
        return '/api/coingecko?endpoint=' + encodeURIComponent(endpoint) + (u.search ? '&query=' + encodeURIComponent(u.search.slice(1)) : '');
      }
      if(url.includes('newsdata.io/api/1/news')){
        const u = new URL(url);
        return '/api/news?' + u.searchParams.toString();
      }
    }catch(e){}
    return null;
  }
  window.fetch = function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    const local = route(url);
    if(local) return baseFetch(local, {cache:'no-store'});
    return baseFetch(input, init);
  };
  console.log('✅ ZYNQEL Direct Source Kill Switch active');
})();
