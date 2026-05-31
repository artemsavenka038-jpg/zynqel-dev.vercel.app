// ZYNQEL data/coingecko.js
// Extracted from original marketData.js. Classic global script, not module.

// ---- extracted inline script block 7 ----
// ═══════════════════════════════════════════════════════
// FIREBASE INIT
// ═══════════════════════════════════════════════════════
var DOMAINS = ["zynqel.vercel.app","app.zynqel.com","zynqel.com","www.zynqel.com","zynqel.vip",
  "zynqel-dev.vercel.app",
  "zynqel-dev-vercel-app.vercel.app","www.zynqel.vip","zynqel-1c401.firebaseapp.com","zynqel-1c401.web.app","localhost","127.0.0.1"];
var okDomain = DOMAINS.indexOf(location.hostname) >= 0;
var auth = null;

// Show auth immediately - don't wait for Firebase
if(!okDomain){
  showErr('login-msg', 'Not authorized on this domain.');
  g('login-btn').disabled = true;
  g('google-btn').disabled = true;
}

// Firebase init - scripts loaded via defer in head
try{
  firebase.initializeApp({
    apiKey:"AIzaSyA-fU5ZYgdGXKW5JhddeNHKiCZvPACEh1k",
    authDomain:"zynqel-1c401.firebaseapp.com",
    projectId:"zynqel-1c401",
    storageBucket:"zynqel-1c401.firebasestorage.app",
    messagingSenderId:"71225579542",
    appId:"1:71225579542:web:7fa790efdc459ab5643d37"
  });
  auth = firebase.auth();
  auth.onAuthStateChanged(function(user){
    if(user){
      g('auth-screen').classList.remove('show');
      var badge = g('user-badge');
      if(badge) badge.textContent = (user.displayName||user.email||'U')[0].toUpperCase();
      g('app').classList.add('show');
      startApp();
    }
  });
  console.log('Firebase ready');
}catch(e){
  console.warn('Firebase error:', e.message);
}

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
var appLang = 'en';
var currentTF = '24h';
var currentAsset = 'BTC';
var allAlerts = [];
var allNews = [];
var liveData = {};  // {BTC:{price,change1h,change24h,change7d,volume}}
var marketRiskData = {}; // VIX, oil, 10Y yield proxies from Yahoo/other feeds
var fredData = {};  // {fedRate, cpiChange}
var fearGreed = 0;
var chatHistory = [];
var currentAnalysisAsset = null;
var currentFilter = 'all';
var analysisLoadingNow = false;
var analysisLastReloadAt = 0;
var lastAnalysisForecast = null;
var lastAnalysisAsset = null;
var lastAnalysisRenderedLang = appLang;

// ASSETS config
var ASSETS = [
  {id:'BTC', name:'Bitcoin', pair:'BTC/USD', color:'#f7931a', category:'crypto'},
  {id:'ETH', name:'Ethereum', pair:'ETH/USD', color:'#627eea', category:'crypto'},
  {id:'SOL', name:'Solana', pair:'SOL/USD', color:'#14f195', category:'crypto'},
  {id:'XRP', name:'XRP', pair:'XRP/USD', color:'#9ca3af', category:'crypto'},
  {id:'SUI', name:'Sui', pair:'SUI/USD', color:'#4da2ff', category:'crypto'},
  {id:'AVAX', name:'Avalanche', pair:'AVAX/USD', color:'#e84142', category:'crypto'},
  {id:'XAU', name:'Gold', pair:'XAU/USD', color:'#ffd700', category:'metals'},
  {id:'XAG', name:'Silver', pair:'XAG/USD', color:'#c0c0c0', category:'metals'},
  {id:'EUR', name:'Euro', pair:'EUR/USD', color:'#003399', category:'forex'},
  {id:'GBP', name:'Pound', pair:'GBP/USD', color:'#012169', category:'forex'},
  {id:'DXY', name:'Dollar Index', pair:'DXY', color:'#3b82f6', category:'forex'},
  {id:'NDX', name:'NASDAQ', pair:'NASDAQ', color:'#00cc88', category:'indices'},
  {id:'SPX', name:'S&P 500', pair:'SP500', color:'#ff6b35', category:'indices'},
];

// ═══════════════════════════════════════════════════════
// i18n
// ═══════════════════════════════════════════════════════
var TX = {
  en: {
    signin:'Sign In', reset:'Reset Password', google:'Continue with Google',
    sub:'AI Market Intelligence', email:'EMAIL', pass:'PASSWORD',
    resetEmail:'YOUR EMAIL', resetBtn:'Send Reset Link', note:'Access granted after payment',
    eDom:'Not authorized on this domain.', eUser:'Account not found.',
    ePass:'Incorrect password.', eGen:'Error. Try again.', eSent:'Reset link sent!',
    live:'LIVE', analyzing:'Analyzing markets...', loading:'Loading...',
    scanAlerts:'Scanning for anomalies...', loadNews:'Loading news...',
    selectNews:'Select a news item for AI analysis',
    askAI:'Ask me about any market, asset, or forecast...',
    pulse:'Analyzing market data...',
    noAlerts:'No alerts yet. AI is monitoring markets...',
    analysisLoading:'Analyzing markets...', analysisSub:'Loading prices • Reading news • Checking Fed data',
    fedRate:'Fed Rate', dataSource:'Data Source', heatmap:'Market Heatmap',
    latestNews:'Latest News', liveMarkets:'Live Markets', fearGreed:'Fear & Greed Index',
    macroDash:'Macro Data', aiPulse:'AI Market Pulse', asset:'Asset', price:'Price',
    change:'Change', vol:'Volume 24H', sentiment:'Sentiment', newsFinancial:'Financial News',
    aiAnalysis:'AI Analysis', all:'All', critical:'Critical', medium:'Medium',
    alertsTitle:'Smart Alerts', newsTitle:'Market News', analysisTitle:'AI Analysis',
    dashboard:'Dashboard', alerts:'Alerts', news:'News',
    charts:'Charts', correlations:'Correlations',
    tvChart:'TradingView Chart', levels:'Support & Resistance',
    suppLevel:'Support', resLevel:'Resistance',
    corrTitle:'Asset Correlations', corrSub:'How assets move together (24h)',
    positive:'Positive', negative:'Negative', neutral:'Neutral',
    levelsTitle:'Key Price Levels', calcLevels:'AI is calculating levels...',
  },
  ru: {
    signin:'Войти', reset:'Сброс пароля', google:'Войти через Google',
    sub:'ИИ-Аналитика Финансовых Рынков', email:'EMAIL', pass:'ПАРОЛЬ',
    resetEmail:'ВАШ EMAIL', resetBtn:'Отправить ссылку', note:'Доступ после оплаты',
    eDom:'Домен не авторизован.', eUser:'Аккаунт не найден.',
    ePass:'Неверный пароль.', eGen:'Ошибка. Попробуйте снова.', eSent:'Ссылка отправлена!',
    live:'ПРЯМОЙ ЭФИР', analyzing:'Анализирую рынки...', loading:'Загрузка...',
    scanAlerts:'Сканирую аномалии...', loadNews:'Загружаю новости...',
    selectNews:'Выберите новость для ИИ-анализа',
    askAI:'Спросите о любом рынке, активе или прогнозе...',
    pulse:'Анализирую данные рынка...',
    noAlerts:'Алертов нет. ИИ следит за рынками...',
    analysisLoading:'Анализирую рынки...', analysisSub:'Загружаю цены • Читаю новости • Проверяю данные ФРС',
    fedRate:'Ставка ФРС', dataSource:'Источник', heatmap:'Тепловая карта',
    latestNews:'Последние новости', liveMarkets:'Рынки в реальном времени', fearGreed:'Индекс Страха и Жадности',
    macroDash:'Макро Данные', aiPulse:'ИИ Пульс Рынка', asset:'Актив', price:'Цена',
    change:'Изменение', vol:'Объём 24Ч', sentiment:'Сентимент', newsFinancial:'Финансовые новости',
    aiAnalysis:'ИИ Анализ', all:'Все', critical:'Критические', medium:'Средние',
    alertsTitle:'Умные Алерты', newsTitle:'Рыночные Новости', analysisTitle:'ИИ Анализ',
    dashboard:'Дашборд', alerts:'Алерты', news:'Новости',
    charts:'Графики', correlations:'Корреляции',
    tvChart:'График TradingView', levels:'Поддержка и Сопротивление',
    suppLevel:'Поддержка', resLevel:'Сопротивление',
    corrTitle:'Корреляции Активов', corrSub:'Как активы движутся вместе (24ч)',
    positive:'Позитивная', negative:'Негативная', neutral:'Нейтральная',
    levelsTitle:'Ключевые Уровни', calcLevels:'ИИ рассчитывает уровни...',
  }
};
function escapeHtml(str){return String(str||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function t(k){return TX[appLang][k]||k;}
function g(id){return document.getElementById(id);}

function setLang(l){
  appLang=l;
  document.querySelectorAll('.lang-btn').forEach(function(b,i){
    b.classList.toggle('active',(i===0&&l==='en')||(i===1&&l==='ru'));
  });
  g('auth-sub').textContent=t('sub');
  g('lbl-email').textContent=t('email');
  g('lbl-pass').textContent=t('pass');
  g('lbl-reset').textContent=t('resetEmail');
  g('login-text').textContent=t('signin');
  g('reset-text').textContent=t('resetBtn');
  g('google-text').textContent=t('google');
  g('auth-note').textContent=t('note');
  g('tab-login').textContent=t('signin');
  g('tab-reset').textContent=t('reset');
  g('lang-toggle').textContent=l==='en'?'🇷🇺 RU':'🇺🇸 EN';
  g('live-text').textContent=t('live');
  g('login-msg').innerHTML='';
  // Update nav
  ['dashboard','analysis','news','alerts','charts'].forEach(function(p){
    var btn=g('nav-'+p);
    if(btn) btn.textContent=t(p);
  });
  // Update data-en/ru elements
  document.querySelectorAll('[data-'+l+']').forEach(function(el){
    el.textContent=el.getAttribute('data-'+l);
  });
  // Update chat
  g('chat-title').textContent=l==='en'?'Zynqel AI Assistant':'Zynqel ИИ Ассистент';
  g('chat-input').placeholder=l==='en'?'Ask about markets...':'Спросите о рынках...';
  g('chat-welcome').textContent=t('askAI');
  g('pulse-loading-text').textContent=t('analyzing');
  // Charts page labels
  var ct=g('chart-title-label'); if(ct) ct.textContent=t('tvChart');
  var lt=g('levels-title'); if(lt) lt.textContent=t('levelsTitle');
  var crt=g('corr-title'); if(crt) crt.textContent=t('corrTitle');
  var crs=g('corr-sub'); if(crs) crs.textContent=t('corrSub');
  var llt=g('levels-loading-text'); if(llt) llt.textContent=t('calcLevels');
  // Re-render correlations in new language
  renderCorrelations();
  g('news-loading-text').textContent=t('loadNews');
  g('news-select-hint').textContent=t('selectNews');
  g('analysis-loading-text').textContent=t('analysisLoading');
  g('analysis-loading-sub').textContent=t('analysisSub');
  g('alerts-loading-text').textContent=t('scanAlerts');
  g('af-all').textContent=t('all');
  g('af-critical').textContent=t('critical');
  g('af-medium').textContent=t('medium');
  // If language changes while AI Analysis is open, rebuild the active analysis in the selected language.
  try{
    if(g('page-analysis') && g('page-analysis').classList.contains('active') && currentAnalysisAsset && !analysisLoadingNow){
      setTimeout(function(){ loadAnalysis(currentAnalysisAsset, {force:true}); }, 50);
    }
    if(g('page-alerts') && g('page-alerts').classList.contains('active')){
      allAlerts = buildFallbackAlerts();
      renderAlerts();
    }
  }catch(e){}

}

function toggleLang(){setLang(appLang==='en'?'ru':'en'); refreshUI();}

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════
function showTab(tab){
  g('form-login').style.display=tab==='login'?'':'none';
  g('form-reset').style.display=tab==='reset'?'':'none';
  g('tab-login').classList.toggle('active',tab==='login');
  g('tab-reset').classList.toggle('active',tab==='reset');
}
function showErr(id,msg){g(id).innerHTML='<div class="msg-err">'+msg+'</div>';}
function showOk(id,msg){g(id).innerHTML='<div class="msg-ok">'+msg+'</div>';}
function getAuthErr(code){
  return({'auth/user-not-found':t('eUser'),'auth/wrong-password':t('ePass'),
    'auth/invalid-credential':t('ePass'),'auth/too-many-requests':'Too many attempts.',
    'auth/network-request-failed':'Network error.'})[code]||t('eGen');
}
function setLoginLoading(on){
  g('login-btn').disabled=on;
  g('login-text').innerHTML=on?'<span class="spinner"></span>':t('signin');
}
function doLogin(){
  if(!okDomain){showErr('login-msg',t('eDom'));return;}
  if(!auth){showErr('login-msg', appLang==='ru'?'Подключение... Попробуйте снова':'Connecting... Please try again');return;}
  var em=g('inp-email').value.trim(),pw=g('inp-pass').value;
  if(!em||!pw)return;
  setLoginLoading(true);
  auth.signInWithEmailAndPassword(em,pw).catch(function(e){
    setLoginLoading(false);
    showErr('login-msg',getAuthErr(e.code));
    g('inp-pass').classList.add('err');g('inp-pass').value='';
    setTimeout(function(){g('inp-pass').classList.remove('err');},400);
  });
}
function signInGoogle(){
  if(!okDomain){showErr('login-msg',t('eDom'));return;}
  if(!auth){showErr('login-msg','Connecting to server, please wait...');return;}
  g('google-btn').disabled=true;
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function(e){
    g('google-btn').disabled=false;
    if(e.code!=='auth/popup-closed-by-user')showErr('login-msg',getAuthErr(e.code));
  });
}
function doReset(){
  if(!auth){return;}
  var em=g('inp-reset').value.trim();if(!em)return;
  auth.sendPasswordResetEmail(em)
    .then(function(){showOk('reset-msg',t('eSent'));})
    .catch(function(e){showErr('reset-msg',getAuthErr(e.code));});
}
// Safe DOM event listeners
document.addEventListener('DOMContentLoaded', function(){
  var pp = g('inp-pass'); if(pp) pp.addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
  var em = g('inp-email'); if(em) em.addEventListener('keydown',function(e){if(e.key==='Enter')g('inp-pass').focus();});
});

// Auth handled in loadFirebase()

document.addEventListener('contextmenu',function(e){e.preventDefault();});
document.addEventListener('keydown',function(e){
  if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&'IJC'.includes(e.key))||(e.ctrlKey&&e.key==='u')){
    e.preventDefault();return false;
  }
});

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
function showPage(page){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  g('page-'+page).classList.add('active');
  var navBtn = g('nav-'+page);
  if(navBtn) navBtn.classList.add('active');
  if(page==='analysis') renderAnalysisChips();
  if(page==='alerts' && allAlerts.length===0) generateAIAlerts();
  if(page==='news') renderNews();
  if(page==='charts'){
    initChartChips();
    loadTVChart();
    loadLevels(currentChartAsset);
    renderCorrelations();
  }
}

// ═══════════════════════════════════════════════════════
// REAL DATA ENGINE
// ═══════════════════════════════════════════════════════
function startApp(){
  fetchCoinGecko();
  fetchForex();
  fetchMetals();
  fetchFearGreed();
  fetchFRED();
  fetchNews();
  fetchIndices();
  fetchMacroRisk();
  fetchAllTechnicalIndicators();
  startBinanceWS();
  setInterval(fetchCoinGecko, 30000);
  setInterval(fetchForex, 60000);
  setInterval(fetchFearGreed, 300000);
  setInterval(fetchNews, 600000);
  setInterval(fetchIndices, 60000);
  setInterval(fetchMacroRisk, 60000);
  setInterval(fetchAllTechnicalIndicators, 5*60*1000);
  setInterval(fetchMetals, 60000);
  setInterval(function(){ renderDashboard(); updateActiveAnalysisLive(); }, 3000);
  fetchIndices();
  setInterval(fetchIndices, 60000);
  // After data loads, generate AI content
  setTimeout(function(){
    generateMarketPulse();
    generateAIAlerts();
  }, 5000);
  setInterval(function(){
    generateMarketPulse();
    generateAIAlerts();
  }, 15*60*1000);
}

function setCryptoQuote(id, obj, source){
  if(!obj || !obj.usd) return;
  liveData[id]={
    price:obj.usd,
    change1h:obj.usd_1h_change||0,
    change24h:obj.usd_24h_change||0,
    change7d:obj.usd_7d_change||0,
    volume:obj.usd_24h_vol?(obj.usd_24h_vol/1e9).toFixed(1)+'B':'—',
    source:source||'CoinGecko'
  };
}
function fetchCoinGecko(){
  // Crypto list: BTC, ETH + requested SOL, XRP, SUI, AVAX.
  fetch('/api/coingecko?endpoint=simple/price&query=ids%3Dbitcoin%2Cethereum%2Csolana%2Cripple%2Csui%2Cavalanche-2%26vs_currencies%3Dusd%26include_24hr_change%3Dtrue%26include_1hr_change%3Dtrue%26include_7d_change%3Dtrue%26include_24hr_vol%3Dtrue')
  .then(function(r){return r.json();}).then(function(d){
    setCryptoQuote('BTC', d.bitcoin, 'CoinGecko');
    setCryptoQuote('ETH', d.ethereum, 'CoinGecko');
    setCryptoQuote('SOL', d.solana, 'CoinGecko');
    setCryptoQuote('XRP', d.ripple, 'CoinGecko');
    setCryptoQuote('SUI', d.sui, 'CoinGecko');
    setCryptoQuote('AVAX', d['avalanche-2'], 'CoinGecko');
    renderDashboard();
    if(currentAnalysisAsset) updateActiveAnalysisLive();
    console.log('✅ CoinGecko crypto');
  }).catch(function(e){console.warn('CG:',e.message);});
}

function fetchForex(){
  fetch('https://api.exchangerate-api.com/v4/latest/USD')
  .then(function(r){return r.json();}).then(function(d){
    if(d.rates){
      if(d.rates.EUR)liveData.EUR={price:parseFloat((1/d.rates.EUR).toFixed(4)),change1h:0,change24h:0,change7d:0,volume:'—'};
      if(d.rates.GBP)liveData.GBP={price:parseFloat((1/d.rates.GBP).toFixed(4)),change1h:0,change24h:0,change7d:0,volume:'—'};
      var e=d.rates.EUR||0.92,j=d.rates.JPY||150,gg=d.rates.GBP||0.79,c=d.rates.CAD||1.36,s=d.rates.SEK||10.5,f=d.rates.CHF||0.89;
      var dxy=Math.pow(1/e,0.576)*Math.pow(j,0.136)*Math.pow(1/gg,0.119)*Math.pow(1/c,0.091)*Math.pow(1/s,0.042)*Math.pow(1/f,0.036)*50.14348112;
      liveData.DXY={price:parseFloat(dxy.toFixed(2)),change1h:0,change24h:0,change7d:0,volume:'—'};
      console.log('✅ Forex DXY:'+dxy.toFixed(2));
    }
  }).catch(function(e){console.warn('FX:',e.message);});
}

function isValidMetalPrice(id, price){
  price=parseFloat(price);
  if(!isFinite(price) || price<=0) return false;
  if(id==='XAG') return price>10 && price<150;     // Silver spot/futures cannot be 0
  if(id==='XAU') return price>500 && price<10000;  // Gold spot/futures sanity range
  return true;
}
function setMetalQuote(id, price, prev, source){
  price=parseFloat(price); prev=parseFloat(prev||0);
  if(!isValidMetalPrice(id, price)) return false;
  var old=liveData[id]||{};
  var ch=prev>0 ? ((price-prev)/prev*100) : (old.change24h||0);
  liveData[id]={price:price,change1h:old.change1h||0,change24h:ch,change7d:old.change7d||0,volume:'—',source:source||'metals'};
  renderDashboard();
  if(currentAnalysisAsset===id) updateActiveAnalysisLive();
  console.log('✅ '+id+' metals feed:', price, source||'metals');
  return true;
}
function fetchYahooMetal(symbol,id,done){
  var url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?interval=1d&range=5d';
  window.zynqelFetchJsonDirectOrProxy(url).then(function(result){
    var meta=result.chart.result[0].meta||{};
    var price=meta.regularMarketPrice||meta.previousClose;
    var prev=meta.chartPreviousClose||meta.previousClose;
    done(setMetalQuote(id, price, prev, 'Yahoo '+symbol));
  }).catch(function(e){ done(false); });
}
function fetchMetalWithFallback(id, symbols){
  var i=0;
  function next(){
    if(i>=symbols.length){ return; }
    fetchYahooMetal(symbols[i++], id, function(ok){ if(!ok) next(); });
  }
  next();
}
function fetchMetals(){
  // Не берём XAG из CoinGecko: там часто попадается tokenized/crypto silver, а не spot XAG/USD.
  // Берём реальные market symbols: XAGUSD / XAUUSD, с futures fallback.
  fetchMetalWithFallback('XAG',['XAGUSD=X','SI=F']);
  fetchMetalWithFallback('XAU',['XAUUSD=X','GC=F']);

  // Последний резерв: metals.live, только если цена проходит sanity-check.
  fetch('https://api.metals.live/v1/spot/gold,silver')
  .then(function(r){return r.json();}).then(function(d){
    if(Array.isArray(d))d.forEach(function(m){
      if(m.gold) setMetalQuote('XAU', m.gold, 0, 'metals.live');
      if(m.silver) setMetalQuote('XAG', m.silver, 0, 'metals.live');
    });
  }).catch(function(e){});
}

function fetchFearGreed(){
  fetch('https://api.alternative.me/fng/?limit=1')
  .then(function(r){return r.json();}).then(function(d){
    if(d.data&&d.data[0]){
      fearGreed=parseInt(d.data[0].value);
      var label=d.data[0].value_classification||'';
      var color=fearGreed>60?'var(--green)':fearGreed<40?'var(--red)':'var(--gold)';
      g('fg-value').textContent=fearGreed;
      g('fg-value').style.color=color;
      g('fg-label').textContent=label.toUpperCase();
      g('fg-label').style.color=color;
      g('fg-bar').style.width=fearGreed+'%';
      g('fg-bar').style.background=color;
      console.log('✅ F&G:',fearGreed);
    }
  }).catch(function(e){console.warn('FG:',e.message);});
}

function fetchFRED(){
  fetch('/api/fred?series_id=FEDFUNDS&limit=1')
  .then(function(r){return r.json();}).then(function(d){
    if(d.observations&&d.observations[0]){
      fredData.fedRate=parseFloat(d.observations[0].value);
      g('fed-rate').textContent=fredData.fedRate+'%';
      console.log('✅ Fed Rate:',fredData.fedRate);
    }
  }).catch(function(e){console.warn('FRED:',e.message);});
  fetch('/api/fred?series_id=CPIAUCSL&limit=2')
  .then(function(r){return r.json();}).then(function(d){
    if(d.observations&&d.observations.length>=2){
      var l=parseFloat(d.observations[0].value),p=parseFloat(d.observations[1].value);
      fredData.cpiChange=((l-p)/p*100).toFixed(2);
      g('cpi-rate').textContent=fredData.cpiChange+'%';
      console.log('✅ CPI:',fredData.cpiChange);
    }
  }).catch(function(e){console.warn('FRED CPI:',e.message);});
}

function fetchIndices(){
  var syms=[{sym:'^IXIC',id:'NDX'},{sym:'^GSPC',id:'SPX'}];
  syms.forEach(function(s){
    var url='https://query1.finance.yahoo.com/v8/finance/chart/'+s.sym+'?interval=1d&range=2d';
    window.zynqelFetchJsonDirectOrProxy(url).then(function(result){
      try{
        var meta=result.chart.result[0].meta;
        var price=meta.regularMarketPrice;
        var prev=meta.chartPreviousClose||meta.previousClose;
        var ch=prev?((price-prev)/prev*100):0;
        liveData[s.id]={price:price,change1h:0,change24h:ch,change7d:0,volume:'—'};
        console.log('✅',s.id,price);
      }catch(e){}
    }).catch(function(){});
  });
}


function setYahooQuoteTo(objId, result, label){
  try{
    var meta=result.chart.result[0].meta;
    var price=parseFloat(meta.regularMarketPrice);
    var prev=parseFloat(meta.chartPreviousClose||meta.previousClose||0);
    var ch=prev?((price-prev)/prev*100):0;
    if(isFinite(price) && price>0){
      marketRiskData[objId]={value:price,change24h:ch,label:label,source:'Yahoo Finance'};
    }
  }catch(e){}
}

function fetchYahooChartSymbol(sym, cb){
  var url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range=2d';
  window.zynqelFetchJsonDirectOrProxy(url)
  .then(function(data){
    try{ cb((data && data.chart) ? data : JSON.parse(data.contents)); }catch(e){}
  }).catch(function(){});
}

function fetchMacroRisk(){
  // Extra risk layer for the AI engine. These are not shown as main assets, but are sent to Groq.
  fetchYahooChartSymbol('^VIX', function(r){ setYahooQuoteTo('VIX', r, 'CBOE Volatility Index'); });
  fetchYahooChartSymbol('CL=F', function(r){ setYahooQuoteTo('OIL', r, 'WTI Crude Oil'); });
  fetchYahooChartSymbol('^TNX', function(r){ setYahooQuoteTo('US10Y', r, 'US 10Y Yield'); });
}

function startBinanceWS(){
  try{
    var streams=['btcusdt','ethusdt','solusdt','xrpusdt','suiusdt','avaxusdt'].map(function(x){return x+'@ticker';}).join('/');
    var idMap={BTCUSDT:'BTC',ETHUSDT:'ETH',SOLUSDT:'SOL',XRPUSDT:'XRP',SUIUSDT:'SUI',AVAXUSDT:'AVAX'};
    var ws=new WebSocket('wss://stream.binance.com:9443/stream?streams='+streams);
    ws.onmessage=function(e){
      var msg=JSON.parse(e.data);
      if(msg.data){
        var d=msg.data,id=idMap[d.s];
        if(!id) return;
        var price=parseFloat(d.c),ch=parseFloat(d.P);
        if(!liveData[id])liveData[id]={};
        liveData[id].price=price;
        liveData[id].change24h=ch;
        liveData[id].volume=(parseFloat(d.v)*price/1e9).toFixed(1)+'B';
        liveData[id].source='Binance WS';
        if(currentAnalysisAsset===id) updateActiveAnalysisLive();
      }
    };
    ws.onclose=function(){setTimeout(startBinanceWS,5000);};
    ws.onerror=function(){try{ws.close();}catch(e){} setTimeout(startBinanceWS,5000);};
    ws.onopen=function(){console.log('✅ Binance WS LIVE extended crypto');};
  }catch(e){}
}

function fetchNews(){
  var isRu=appLang==='ru';
  var queries=[
    '/api/news?apikey=pub_b62504538945430fb587b35bd66d1895&q=bitcoin+OR+ethereum+OR+solana+OR+xrp+OR+sui+OR+avalanche+OR+crypto+OR+gold&language=en&category=business,technology&size=8',
    '/api/news?apikey=pub_b62504538945430fb587b35bd66d1895&q=federal+reserve+OR+inflation+OR+nasdaq&language=en&category=business&size=4'
  ];
  if(isRu) queries.push('/api/news?apikey=pub_b62504538945430fb587b35bd66d1895&q=биткоин+OR+крипто+OR+золото&language=ru&category=business&size=5');
  
  var gathered=[];
  var done=0;
  queries.forEach(function(url){
    fetch(url).then(function(r){return r.json();}).then(function(d){
      if(d.results){
        d.results.forEach(function(item){
          if(gathered.length>=15)return;
          var title=item.title||'';
          var desc=(item.description||'').slice(0,250);
          var txt=(title+' '+desc).toLowerCase();
          var bull=['surge','rise','gain','bull','record','etf','rally','growth','up','high','approve','launch'].filter(function(w){return txt.includes(w);}).length;
          var bear=['fall','drop','crash','ban','hack','sell','decline','fear','risk','loss','dump','warn','concern'].filter(function(w){return txt.includes(w);}).length;
          var assets=[];
          if(item.currencies)item.currencies.forEach(function(c){if(c.code)assets.push(c.code);});
          if(!assets.length){
            if(txt.includes('bitcoin')||txt.includes('btc'))assets.push('BTC');
            if(txt.includes('ethereum')||txt.includes('eth'))assets.push('ETH');
            if(txt.includes('solana')||txt.includes(' sol '))assets.push('SOL');
            if(txt.includes('xrp')||txt.includes('ripple'))assets.push('XRP');
            if(txt.includes('sui'))assets.push('SUI');
            if(txt.includes('avalanche')||txt.includes('avax'))assets.push('AVAX');
            if(txt.includes('gold')||txt.includes('xau'))assets.push('XAU');
            if(txt.includes('fed')||txt.includes('rate')||txt.includes('dollar'))assets.push('DXY');
            if(txt.includes('nasdaq')||txt.includes('stock'))assets.push('NDX');
            if(!assets.length)assets.push('BTC');
          }
          var pub=item.pubDate?new Date(item.pubDate):new Date();
          var diff=Math.floor((Date.now()-pub)/60000);
          var timeStr=diff<60?diff+'m ago':diff<1440?Math.floor(diff/60)+'h ago':Math.floor(diff/1440)+'d ago';
          var timeStrRu=diff<60?diff+' мин':diff<1440?Math.floor(diff/60)+' ч':Math.floor(diff/1440)+' д';
          var imp=['fed','rate','etf','sec','ban','inflation','cpi','war','sanction'].some(function(w){return txt.includes(w);})?'high':'medium';
          gathered.push({
            id:gathered.length+1,title:title,summary:desc,
            impact:bull>bear?'bullish':bear>bull?'bearish':'neutral',
            assets:assets.slice(0,3),importance:imp,
            time:timeStr,timeRu:timeStrRu,
            url:item.link||'#',source:item.source_id||'NewsData',lang:item.language||'en'
          });
        });
      }
      done++;
      if(done===queries.length){
        var seen={};
        allNews=gathered.filter(function(n){if(seen[n.title])return false;seen[n.title]=true;return true;});
        allNews.sort(function(a,b){return a.importance==='high'?-1:1;});
        allNews=allNews.slice(0,12);
        renderNews();
        renderNewsPreview();
        console.log('✅ News:',allNews.length);
      }
    }).catch(function(e){done++;console.warn('News:',e.message);});
  });
}


// ═══════════════════════════════════════════════════════
// V4 REAL TECHNICAL INDICATORS ENGINE
// Real OHLC candles + RSI / EMA / MACD / ATR.
// This replaces weak proxy indicators when enough candle data is available.
// ═══════════════════════════════════════════════════════
var candleData = {};       // {ASSET:[{t,o,h,l,c,v}]}
var technicalData = {};    // {ASSET:{rsi,ema20,ema50,ema200,macd,macdSignal,macdHist,atr,trend,momentum,volatility}}

var YAHOO_SYMBOLS = {
  BTC:'BTC-USD', ETH:'ETH-USD', SOL:'SOL-USD', XRP:'XRP-USD', SUI:'SUI-USD', AVAX:'AVAX-USD',
  XAU:'GC=F', XAG:'SI=F',
  EUR:'EURUSD=X', GBP:'GBPUSD=X', DXY:'DX-Y.NYB',
  SPX:'^GSPC', NDX:'^IXIC'
};

function sma(values, period){
  if(!values || values.length < period) return null;
  var s=0;
  for(var i=values.length-period;i<values.length;i++) s += values[i];
  return s/period;
}

function emaSeries(values, period){
  if(!values || values.length < period) return [];
  var k = 2/(period+1);
  var out = [];
  var seed = 0;
  for(var i=0;i<period;i++) seed += values[i];
  var prev = seed/period;
  out[period-1]=prev;
  for(var j=period;j<values.length;j++){
    prev = values[j]*k + prev*(1-k);
    out[j]=prev;
  }
  return out.filter(function(x){return typeof x === 'number' && isFinite(x);});
}

function last(arr){
  return arr && arr.length ? arr[arr.length-1] : null;
}

function calcRSI(closes, period){
  period = period || 14;
  if(!closes || closes.length <= period+1) return null;
  var gains=0, losses=0;
  for(var i=1;i<=period;i++){
    var d=closes[i]-closes[i-1];
    if(d>=0) gains += d; else losses -= d;
  }
  var avgGain=gains/period, avgLoss=losses/period;
  for(var j=period+1;j<closes.length;j++){
    var ch=closes[j]-closes[j-1];
    var gain=ch>0?ch:0, loss=ch<0?-ch:0;
    avgGain=(avgGain*(period-1)+gain)/period;
    avgLoss=(avgLoss*(period-1)+loss)/period;
  }
  if(avgLoss===0) return 100;
  var rs=avgGain/avgLoss;
  return 100 - (100/(1+rs));
}

function calcMACD(closes){
  if(!closes || closes.length < 35) return null;
  var e12=emaSeries(closes,12);
  var e26=emaSeries(closes,26);
  if(!e12.length || !e26.length) return null;
  var offset=e12.length-e26.length;
  var macdLine=[];
  for(var i=0;i<e26.length;i++){
    macdLine.push(e12[i+offset]-e26[i]);
  }
  var sig=emaSeries(macdLine,9);
  if(!sig.length) return null;
  var macd=last(macdLine), signal=last(sig), hist=macd-signal;
  return {macd:macd, signal:signal, hist:hist};
}

function calcATR(candles, period){
  period=period||14;
  if(!candles || candles.length < period+1) return null;
  var trs=[];
  for(var i=1;i<candles.length;i++){
    var h=candles[i].h, l=candles[i].l, pc=candles[i-1].c;
    if(!isFinite(h)||!isFinite(l)||!isFinite(pc)) continue;
    trs.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  if(trs.length < period) return null;
  return sma(trs.slice(-period), period);
}

function calcTechnicalForAsset(id){
  var candles=(candleData[id]||[]).filter(function(x){return x && isFinite(x.c) && x.c>0;});
  if(candles.length < 30) return null;
  var closes=candles.map(function(x){return x.c;});
  var price=last(closes);
  var ema20=last(emaSeries(closes,20));
  var ema50=last(emaSeries(closes,50));
  var ema200=last(emaSeries(closes,200));
  var rsi=calcRSI(closes,14);
  var macdObj=calcMACD(closes);
  var atr=calcATR(candles,14);
  var prev=closes.length>5?closes[closes.length-6]:closes[0];
  var momentum=prev ? ((price-prev)/prev*100) : 0;
  var volatility=atr && price ? (atr/price*100) : Math.abs(momentum);

  var trend='neutral';
  if(ema20 && ema50 && price > ema20 && ema20 > ema50) trend='bullish';
  if(ema20 && ema50 && price < ema20 && ema20 < ema50) trend='bearish';
  if(ema200 && price > ema200 && trend==='neutral') trend='bullish';
  if(ema200 && price < ema200 && trend==='neutral') trend='bearish';

  var td={
    source:'REAL_OHLC_YAHOO',
    candles:candles.length,
    rsi: rsi===null?null:parseFloat(rsi.toFixed(2)),
    ema20: ema20?parseFloat(ema20.toFixed(6)):null,
    ema50: ema50?parseFloat(ema50.toFixed(6)):null,
    ema200: ema200?parseFloat(ema200.toFixed(6)):null,
    macd: macdObj?parseFloat(macdObj.macd.toFixed(6)):null,
    macdSignal: macdObj?parseFloat(macdObj.signal.toFixed(6)):null,
    macdHist: macdObj?parseFloat(macdObj.hist.toFixed(6)):null,
    atr: atr?parseFloat(atr.toFixed(6)):null,
    momentum: parseFloat(momentum.toFixed(3)),
    volatility: parseFloat(volatility.toFixed(3)),
    trend: trend,
    support: price && atr ? parseFloat((price - atr*1.2).toFixed(6)) : null,
    resistance: price && atr ? parseFloat((price + atr*1.2).toFixed(6)) : null
  };
  technicalData[id]=td;
  return td;
}

function fetchYahooCandles(id, interval, range){
  var sym=YAHOO_SYMBOLS[id];
  if(!sym) return Promise.resolve(false);
  interval = interval || '1h';
  range = range || '60d';
  var url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval='+encodeURIComponent(interval)+'&range='+encodeURIComponent(range);
  return window.zynqelFetchJsonDirectOrProxy(url)
  .then(function(data){
    var result=(data && data.chart) ? data : JSON.parse(data.contents);
    var res=result.chart && result.chart.result && result.chart.result[0];
    if(!res || !res.timestamp || !res.indicators || !res.indicators.quote) return false;
    var q=res.indicators.quote[0];
    var timestamps=res.timestamp;
    var candles=[];
    for(var i=0;i<timestamps.length;i++){
      var c=parseFloat(q.close && q.close[i]);
      var h=parseFloat(q.high && q.high[i]);
      var l=parseFloat(q.low && q.low[i]);
      var o=parseFloat(q.open && q.open[i]);
      var v=parseFloat(q.volume && q.volume[i]);
      if(isFinite(c) && c>0 && isFinite(h) && isFinite(l)){
        candles.push({t:timestamps[i]*1000,o:isFinite(o)?o:c,h:h,l:l,c:c,v:isFinite(v)?v:0});
      }
    }
    if(candles.length){
      candleData[id]=candles;
      calcTechnicalForAsset(id);
      if(currentAnalysisAsset===id) updateActiveAnalysisLive();
      return true;
    }
    return false;
  }).catch(function(e){
    console.warn('Candles failed for '+id+':', e.message);
    return false;
  });
}

function fetchAllTechnicalIndicators(){
  ASSETS.forEach(function(a){
    fetchYahooCandles(a.id,'1h','60d');
  });
}

function getTechnicalSnapshot(id){
  var td=technicalData[id] || calcTechnicalForAsset(id);
  if(td) return td;
  // Fallback proxy only while real candles are loading.
  var d=liveData[id]||{};
  var ch=parseFloat(d.change24h||0);
  var trend=ch>0.8?'bullish':ch<-0.8?'bearish':'neutral';
  return {
    source:'PROXY_LOADING',
    candles:0,
    rsi: ch>3?65:ch<-3?35:50+ch*3,
    ema20:null, ema50:null, ema200:null,
    macd:null, macdSignal:null, macdHist:null,
    atr:null,
    momentum:ch,
    volatility:Math.abs(ch),
    trend:trend,
    support:d.price?d.price*(1-Math.max(0.006,Math.abs(ch)/100)):null,
    resistance:d.price?d.price*(1+Math.max(0.006,Math.abs(ch)/100)):null
  };
}

function technicalBiasScore(id){
  var td=getTechnicalSnapshot(id);
  var score=0;
  if(!td) return 0;
  if(td.trend==='bullish') score += 14;
  if(td.trend==='bearish') score -= 14;
  if(td.rsi!==null){
    if(td.rsi < 30) score += 8;       // oversold bounce potential
    else if(td.rsi > 70) score -= 8;  // overheated
    else if(td.rsi > 55) score += 5;
    else if(td.rsi < 45) score -= 5;
  }
  if(td.macdHist!==null){
    if(td.macdHist > 0) score += 7;
    if(td.macdHist < 0) score -= 7;
  }
  if(td.momentum > 1) score += 5;
  if(td.momentum < -1) score -= 5;
  return score;
}


// ═══════════════════════════════════════════════════════
// GROQ AI
// ═══════════════════════════════════════════════════════
var GROQ_KEY='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';
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';

var GROQ_TIMEOUT_MS = 26000;
// Strong model first for structured trading JSON, then faster fallbacks.
var GROQ_MODELS = ['llama-3.3-70b-versatile','deepseek-r1-distill-llama-70b','llama-3.1-8b-instant','openai/gpt-oss-20b'];
var groqQueue = Promise.resolve();
var groqLastStatus = 'idle';
var groqLastError = '';

function setGroqStatus(text, kind){
  groqLastStatus = text || '';
  try{
    var el = g('groq-status');
    if(el){
      el.textContent = text;
      el.style.color = kind==='ok' ? 'var(--green)' : kind==='warn' ? 'var(--gold)' : kind==='err' ? 'var(--red)' : 'var(--muted)';
    }
  }catch(e){}
}

function withTimeout(ms){
  var ctrl = new AbortController();
  var timer = setTimeout(function(){ try{ ctrl.abort(); }catch(e){} }, ms);
  return {ctrl:ctrl, clear:function(){clearTimeout(timer);}};
}

async function callGroqDirect(sys,usr,tok,model){
  var lim = withTimeout(GROQ_TIMEOUT_MS);
  try{
    var r=await fetch(GROQ_URL,{
      method:'POST',
      signal:lim.ctrl.signal,
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+GROQ_KEY},
      body:JSON.stringify({
        model:model,
        max_tokens:Math.min(tok||500, 700),
        temperature:0.25,
        top_p:0.9,
        stream:false,
        messages:[{role:'system',content:sys},{role:'user',content:usr}]
      })
    });
    var raw=await r.text();
    var d={};
    try{ d=JSON.parse(raw); }catch(parseErr){ d={raw:raw}; }
    if(!r.ok){
      var msg=(d.error&&d.error.message)?d.error.message:(raw||('HTTP '+r.status));
      throw new Error('HTTP '+r.status+' '+msg);
    }
    var out=d.choices&&d.choices[0]&&d.choices[0].message?d.choices[0].message.content:'';
    if(!out) throw new Error('empty_response');
    return out;
  }finally{
    lim.clear();
  }
}

async function callGroq(sys,usr,tok){
  // Queue requests instead of skipping them. Previously groqBusy returned empty responses,
  // so the app immediately fell back to LOCAL ENGINE while another Groq request was running.
  var task = async function(){
    setGroqStatus('GROQ: thinking...', 'warn');
    var lastErr='';
    for(var i=0;i<GROQ_MODELS.length;i++){
      var model=GROQ_MODELS[i];
      try{
        console.log('Groq request ->', model);
        var out = await callGroqDirect(sys,usr,tok,model);
        setGroqStatus('GROQ: '+model, 'ok');
        groqLastError='';
        return out;
      }catch(e){
        lastErr = e.name==='AbortError' ? 'timeout' : (e.message||String(e));
        console.warn('Groq failed on '+model+':', lastErr);
        setGroqStatus('GROQ retry: '+lastErr.slice(0,60), 'warn');
      }
    }
    groqLastError=lastErr;
    setGroqStatus('GROQ unavailable → LOCAL ENGINE', 'err');
    return '';
  };
  var run = groqQueue.then(task, task);
  // Keep queue alive even if one request fails.
  groqQueue = run.catch(function(){return '';});
  return run;
}

function stripGroqJsonText(text){
  var x=String(text||'').trim();
  x=x.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  x=x.replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
  return x;
}
function extractBalancedJson(text, openCh, closeCh){
  var x=stripGroqJsonText(text), start=x.indexOf(openCh);
  if(start<0) return '';
  var depth=0, inStr=false, esc=false;
  for(var i=start;i<x.length;i++){
    var ch=x[i];
    if(inStr){
      if(esc){esc=false;continue;}
      if(ch==='\\'){esc=true;continue;}
      if(ch==='"') inStr=false;
      continue;
    }
    if(ch==='"'){inStr=true;continue;}
    if(ch===openCh) depth++;
    if(ch===closeCh){depth--; if(depth===0) return x.slice(start,i+1);}
  }
  return '';
}
function safeParseGroqObject(text){
  var raw=extractBalancedJson(text,'{','}');
  if(!raw) return null;
  raw=raw.replace(/,\s*([}\]])/g,'$1');
  try{return JSON.parse(raw);}catch(e){console.warn('Groq object parse failed:',e.message, raw.slice(0,220));return null;}
}
function safeParseGroqArray(text){
  var raw=extractBalancedJson(text,'[',']');
  if(!raw) return null;
  raw=raw.replace(/,\s*([}\]])/g,'$1');
  try{return JSON.parse(raw);}catch(e){console.warn('Groq array parse failed:',e.message, raw.slice(0,220));return null;}
}
function normalizeForecast(assetId, forecast){
  var isRu=appLang==='ru';
  forecast=forecast||{};
  var d=liveData[assetId]||{}, price=parseFloat(d.price||0);
  forecast.sentiment=String(forecast.sentiment||'neutral').toLowerCase();
  if(['bullish','bearish','neutral'].indexOf(forecast.sentiment)<0) forecast.sentiment='neutral';
  forecast.action=String(forecast.action||'wait').toLowerCase();
  if(['buy','sell','wait'].indexOf(forecast.action)<0) forecast.action='wait';
  forecast.probability=clampNum(forecast.probability,5,95)||50;
  forecast.confidence=clampNum(forecast.confidence,5,95)||50;
  if(!forecast.reasoning || String(forecast.reasoning).trim().length<12){
    forecast.reasoning=isRu?
      'Groq не вернул полноценное объяснение, поэтому Zynqel показывает резервную интерпретацию по текущим данным: цена, импульс, волатильность, Fear & Greed, макро и новости.':
      'Groq did not return a full reasoning block, so Zynqel is showing a fallback interpretation based on current price, momentum, volatility, Fear & Greed, macro and news data.';
    if(!forecast.source || String(forecast.source).indexOf('GROQ')<0) forecast.source='LOCAL ENGINE';
  }
  if(!forecast.factors || !forecast.factors.map || !forecast.factors.length){
    forecast.factors=[
      isRu?'Цена и импульс':'Price and momentum',
      isRu?'Fear & Greed / macro':'Fear & Greed / macro',
      isRu?'Волатильность и новости':'Volatility and news'
    ];
  }
  if(!forecast.shortTerm){
    forecast.shortTerm=price?(isRu?'24ч сценарий: следить за зоной '+fmtPrice(price*0.99)+' — '+fmtPrice(price*1.01):'24h scenario: watch '+fmtPrice(price*0.99)+' — '+fmtPrice(price*1.01)):(isRu?'Недостаточно данных':'Not enough data');
  }
  if(!forecast.midTerm){
    forecast.midTerm=price?(isRu?'7д сценарий: подтверждение после закрепления за уровнем':'7d scenario: confirmation after level hold'):(isRu?'Недостаточно данных':'Not enough data');
  }
  try{ forecast = mergeV4WithGroq(assetId, forecast); }catch(e){ console.warn('V4 merge failed:', e.message); }
  return forecast;
}

function clampNum(x,min,max){ x=parseFloat(x); if(!isFinite(x)) x=0; return Math.max(min,Math.min(max,x)); }
function getAssetMeta(id){ return ASSETS.find(function(a){return a.id===id;}) || {id:id,category:'unknown'}; }
function pctNum(x){ x=parseFloat(x); return isFinite(x)?x:0; }
function estimateEMA(price, changePct, days){
  price=parseFloat(price||0); changePct=parseFloat(changePct||0);
  if(!price) return null;
  // Proxy only: without full candles we estimate trend levels from recent percentage change.
  var weight = days===20?0.33:days===50?0.55:0.9;
  return price/(1+(changePct/100)*weight);
}
function confluenceGrade(items){
  var score=0, used=0;
  items.forEach(function(x){ if(x){score+=x; used++;} });
  if(!used) return 50;
  return Math.round(clampNum(50 + score/used*12, 0, 100));
}
function buildTechnicalSnapshot(assetId){
  var d=liveData[assetId]||{};
  var price=parseFloat(d.price||0);
  var ch1=pctNum(d.change1h), ch24=pctNum(d.change24h), ch7=pctNum(d.change7d);
  var meta=getAssetMeta(assetId);
  var category=meta.category||'unknown';
  var rsiProxy=Math.round(clampNum(50 + ch24*4 + ch7*1.2 + ch1*1.5, 8, 92));
  var momentumScore=Math.round(clampNum(50 + ch1*4 + ch24*4 + ch7*1.1, 0, 100));
  var ema20=estimateEMA(price,ch24,20), ema50=estimateEMA(price,ch7||ch24,50), ema200=estimateEMA(price,ch7||ch24,200);
  var emaStack='neutral';
  if(price && ema20 && ema50){ emaStack=(price>ema20 && ema20>ema50)?'bullish':(price<ema20 && ema20<ema50)?'bearish':'mixed'; }
  var trend = momentumScore>=58 || emaStack==='bullish' ? 'bullish' : momentumScore<=42 || emaStack==='bearish' ? 'bearish' : 'neutral';
  var volatility=Math.abs(ch24)>=5?'high':Math.abs(ch24)>=2?'medium':'low';
  var atrBase = category==='crypto'?0.018:category==='metals'?0.008:category==='forex'?0.004:0.007;
  var atrPct=clampNum(Math.abs(ch24)/100*0.65 + atrBase, category==='crypto'?0.012:0.003, category==='crypto'?0.11:category==='forex'?0.018:0.055);
  var support1=price?price*(1-atrPct):null, support2=price?price*(1-atrPct*2.1):null;
  var resistance1=price?price*(1+atrPct):null, resistance2=price?price*(1+atrPct*2.1):null;
  var dxyCh=pctNum((liveData.DXY||{}).change24h);
  var vixCh=pctNum((marketRiskData.VIX||{}).change24h);
  var oilCh=pctNum((marketRiskData.OIL||{}).change24h);
  var y10Ch=pctNum((marketRiskData.US10Y||{}).change24h);
  var macroBias='neutral', macroNotes=[];
  if(['crypto','metals','indices'].indexOf(category)>=0){
    if(dxyCh>0.15){ macroBias='headwind'; macroNotes.push('DXY headwind'); }
    if(dxyCh<-0.15){ macroBias='tailwind'; macroNotes.push('DXY tailwind'); }
  }
  if(['indices','crypto'].indexOf(category)>=0 && vixCh>3){ macroBias='headwind'; macroNotes.push('VIX risk-off'); }
  if(category==='metals' && y10Ch>1.2){ macroNotes.push('US10Y/yields pressure'); }
  if(category==='forex' && assetId!=='DXY'){ macroNotes.push('Check DXY direction and rate differential'); }
  if(assetId==='DXY') macroBias=dxyCh>0?'positive':'neutral';
  var confluence=confluenceGrade([
    trend==='bullish'?1:trend==='bearish'?-1:0,
    rsiProxy>58?1:rsiProxy<42?-1:0,
    macroBias==='tailwind'?1:macroBias==='headwind'?-1:0,
    fearGreed>60?1:fearGreed<35?-1:0
  ]);
  var assetRules={
    crypto:'Use BTC/ETH direction, Fear&Greed, volatility, funding/liquidation proxies if present, macro risk and news. Avoid calling buy only because price fell.',
    metals:'Use DXY, US10Y/yields proxy, risk sentiment, gold/silver relationship, commodity news and support/resistance. Silver can rise in fear but falls under dollar/yield pressure.',
    forex:'Use DXY, Fed/CPI, rate differential proxy, macro headlines and trend/momentum.',
    indices:'Use VIX, DXY, US10Y/yields, oil shock, macro/news and momentum/breadth proxy.'
  };
  var setup='wait_for_confirmation';
  if(trend==='bullish' && rsiProxy<72 && macroBias!=='headwind') setup='long_on_pullback_or_breakout_retest';
  if(trend==='bearish' && rsiProxy>28 && macroBias!=='tailwind') setup='short_on_retest_or_breakdown';
  if(rsiProxy>=72) setup='overbought_wait_for_pullback';
  if(rsiProxy<=28) setup='oversold_wait_for_reclaim';
  function roundP(x){ return x ? Number(x.toFixed(price>100?2:4)) : null; }
  return {
    asset:assetId, category:category, price:price||null,
    change1h:ch1, change24h:ch24, change7d:ch7,
    rsi_proxy:rsiProxy,
    ema_proxy:{ema20:roundP(ema20),ema50:roundP(ema50),ema200:roundP(ema200),stack:emaStack},
    momentum_score:momentumScore,
    trend_bias:trend,
    volatility:volatility,
    atr_percent_proxy:Number((atrPct*100).toFixed(2)),
    macro_bias:macroBias,
    macro_notes:macroNotes,
    confluence_score:confluence,
    support: support1 ? [roundP(support1), roundP(support2)] : [],
    resistance: resistance1 ? [roundP(resistance1), roundP(resistance2)] : [],
    setup_hint:setup,
    analysis_rules:assetRules[category]||'use price, news, macro and risk data only'
  };
}
function buildAllTechnicalSnapshots(){
  var out={};
  ASSETS.forEach(function(a){ out[a.id]=buildTechnicalSnapshot(a.id); });
  return out;
}
function getMarketContext(){
  var now=new Date().toISOString();
  var snap=[];
  ASSETS.forEach(function(a){
    var d=liveData[a.id]||{};
    if(d&&d.price){
      snap.push({
        asset:a.id,
        name:a.name,
        pair:a.pair,
        price:parseFloat(d.price),
        change1h:parseFloat(d.change1h||0),
        change24h:parseFloat(d.change24h||0),
        change7d:parseFloat(d.change7d||0),
        volume24h:d.volume||'unknown'
      });
    }
  });
  var news=allNews.slice(0,10).map(function(n){
    return {
      title:n.title,
      summary:n.summary||'',
      impact:n.impact||'neutral',
      importance:n.importance||'medium',
      assets:n.assets||[],
      source:n.source||'news',
      time:n.time||n.timeRu||''
    };
  });
  var verifiedAlerts=(allAlerts||[]).slice(0,8).map(function(a){
    return {type:a.type,asset:a.asset,severity:a.severity,message:a.message,time:a.time};
  });
  var ctx={
    timestamp:now,
    instruction:'Use ONLY the facts inside this JSON. Do not invent whale trades, shareholder sales, SEC filings, wars, rate decisions, or news that are not present here. Do NOT default to WAIT. If bullish factors dominate, give BUY bias; if bearish factors dominate, give SELL bias. Use WAIT only when signals are genuinely mixed or confidence is weak. Respect zynqel_v4_signal as the decision engine.',
    live_prices:snap,
    macro:{fearGreed:fearGreed||null,fedRate:fredData.fedRate||null,cpiMoM:fredData.cpiChange||null,dxy:liveData.DXY||null, risk:marketRiskData},
    technicals:buildAllTechnicalSnapshots(),
    news:news,
    current_alerts:verifiedAlerts,
    zynqel_v4_signal: (typeof currentAnalysisAsset==='string' && currentAnalysisAsset ? computeV4InstitutionalSignal(currentAnalysisAsset) : null),
    available_sources:['CoinGecko/Binance crypto live prices','Yahoo XAGUSD/XAUUSD metals feed','Exchange-rate API / DXY estimate','FRED macro if loaded','NewsData filtered headlines','Alternative.me Fear & Greed']
  };
  return JSON.stringify(ctx);
}

function getMarketContextText(){
  var ctx={};
  try{ctx=JSON.parse(getMarketContext());}catch(e){}
  var prices=(ctx.live_prices||[]).map(function(x){return x.asset+':$'+Number(x.price||0).toFixed(2)+'('+Number(x.change24h||0).toFixed(2)+'%24h)';}).join(' ');
  var news=(ctx.news||[]).slice(0,3).map(function(n){return n.title;}).join('; ');
  return 'LIVE PRICES: '+prices+' | Fear&Greed:'+(ctx.macro&&ctx.macro.fearGreed||'?')+' | FedRate:'+(ctx.macro&&ctx.macro.fedRate||'?')+'% | CPI:'+(ctx.macro&&ctx.macro.cpiMoM||'?')+'% | TopNews:'+news;
}

function fallbackScore(assetId){
  var d=liveData[assetId]||{};
  var ch24=parseFloat(d.change24h||0), ch7=parseFloat(d.change7d||0), score=50;
  score += Math.max(-18, Math.min(18, ch24*4));
  score += Math.max(-12, Math.min(12, ch7*1.5));
  if(fearGreed){ score += (fearGreed-50)*0.25; }
  var dxy=liveData.DXY||{};
  var dxyCh=parseFloat(dxy.change24h||0);
  if(['BTC','ETH','XAU','XAG','NDX','SPX'].indexOf(assetId)>=0) score -= dxyCh*4;
  if(['DXY'].indexOf(assetId)>=0) score += dxyCh*6;
  allNews.slice(0,8).forEach(function(n){
    if(n.assets && n.assets.indexOf(assetId)>=0){
      score += n.impact==='bullish'?4:n.impact==='bearish'?-4:0;
      if(n.importance==='high') score += n.impact==='bullish'?3:n.impact==='bearish'?-3:0;
    }
  });
  score=Math.max(15,Math.min(85,Math.round(score)));
  return {score:score,ch24:ch24,ch7:ch7};
}


// ═══════════════════════════════════════════════════════
// ZYNQEL V4 INSTITUTIONAL DECISION ENGINE
// Directional bias + anti-flip + regime memory.
// This layer prevents endless WAIT, but also blocks candle-by-candle flipping.
// ═══════════════════════════════════════════════════════
var ZYNQEL_V4 = {
  version:'v4 institutional core',
  cooldownMs: 15*60*1000,
  strongFlipThreshold: 74,
  directionalThreshold: 59,
  waitBand: 6
};

function getSignalState(assetId){
  try{
    return JSON.parse(localStorage.getItem('zynqel_v4_state_'+assetId)||'{}')||{};
  }catch(e){return {};}
}
function setSignalState(assetId,state){
  try{ localStorage.setItem('zynqel_v4_state_'+assetId, JSON.stringify(state||{})); }catch(e){}
}
function assetCategory(assetId){
  var a=getAssetMeta(assetId)||{};
  return a.category || 'unknown';
}
function classifyRegime(assetId, score, tech, components){
  var cat=assetCategory(assetId);
  var dxy=liveData.DXY||{};
  var dxyCh=pctNum(dxy.change24h);
  var vix=marketRiskData.VIX||{};
  var vixCh=pctNum(vix.change24h);
  var fg=parseFloat(fearGreed||50);
  var ch24=tech.change24h||0, ch7=tech.change7d||0;

  if(cat==='crypto'){
    if(fg<28 && ch24<0 && dxyCh>0) return 'RISK_OFF_CRYPTO_PRESSURE';
    if(fg>62 && ch24>0 && ch7>0) return 'RISK_ON_CRYPTO_MOMENTUM';
    if(Math.abs(ch24)<1.2 && Math.abs(ch7)<4) return 'RANGE_CRYPTO';
  }
  if(cat==='metals'){
    if(dxyCh>0.15 && score<48) return 'DOLLAR_PRESSURE_ON_METALS';
    if(dxyCh<0 && score>55) return 'METALS_RELIEF_BID';
  }
  if(cat==='indices'){
    if(vixCh>3 && score<50) return 'EQUITY_RISK_OFF';
    if(vixCh<0 && score>55) return 'EQUITY_RISK_ON';
  }
  if(assetId==='DXY'){
    if(dxyCh>0.15) return 'DOLLAR_STRENGTH';
    if(dxyCh<-0.15) return 'DOLLAR_WEAKNESS';
  }
  if(score>=62) return 'BULLISH_CONTINUATION';
  if(score<=38) return 'BEARISH_CONTINUATION';
  return 'MIXED_NEUTRAL';
}

function computeV4InstitutionalSignal(assetId){
  var d=liveData[assetId]||{};
  var price=parseFloat(d.price||0);
  var ch1=pctNum(d.change1h), ch24=pctNum(d.change24h), ch7=pctNum(d.change7d);
  var cat=assetCategory(assetId);
  var tech=buildTechnicalSnapshot(assetId)||{};
  var dxy=liveData.DXY||{};
  var dxyCh=pctNum(dxy.change24h);
  var vix=marketRiskData.VIX||{};
  var vixCh=pctNum(vix.change24h);
  var us10=marketRiskData.US10Y||{};
  var us10Ch=pctNum(us10.change24h);
  var oil=marketRiskData.OIL||{};
  var oilCh=pctNum(oil.change24h);
  var fg=parseFloat(fearGreed||50);

  var trendScore=0, macroScore=0, momentumScore=0, newsScore=0, volScore=0;
  var reasons=[];

  // Momentum / trend
  momentumScore += Math.max(-22, Math.min(22, ch24*4.2));
  momentumScore += Math.max(-12, Math.min(12, ch7*1.7));
  momentumScore += Math.max(-6, Math.min(6, ch1*5));
  if(tech.trend==='bullish'){ trendScore += 16; reasons.push('EMA trend bullish'); }
  if(tech.trend==='bearish'){ trendScore -= 16; reasons.push('EMA trend bearish'); }
  if(tech.rsiProxy>=63){ trendScore += 5; reasons.push('RSI momentum strong'); }
  if(tech.rsiProxy<=37){ trendScore -= 5; reasons.push('RSI momentum weak/oversold'); }

  // Macro weights by asset class
  if(cat==='crypto'){
    macroScore += (fg-50)*0.22;
    macroScore -= dxyCh*8;
    macroScore -= vixCh*1.1;
    if(fg<25) reasons.push('crypto fear is extreme');
    if(dxyCh>0.15) reasons.push('DXY pressure on crypto');
  }else if(cat==='metals'){
    macroScore -= dxyCh*12;
    macroScore -= us10Ch*1.4;
    macroScore += vixCh*0.45;
    if(dxyCh>0.15) reasons.push('strong dollar pressures metals');
    if(vixCh>2) reasons.push('risk hedge demand possible');
  }else if(cat==='forex'){
    if(assetId==='DXY') macroScore += dxyCh*15;
    else macroScore -= dxyCh*9;
  }else if(cat==='indices'){
    macroScore += (fg-50)*0.12;
    macroScore -= vixCh*1.3;
    macroScore -= us10Ch*0.9;
    macroScore -= oilCh*0.25;
    if(vixCh>3) reasons.push('VIX risk-off pressure');
  }

  // News relevance score
  (allNews||[]).slice(0,12).forEach(function(n){
    var rel=false;
    if(n.assets && n.assets.indexOf(assetId)>=0) rel=true;
    var txt=((n.title||'')+' '+(n.summary||'')).toLowerCase();
    if(cat==='crypto' && /(bitcoin|btc|ethereum|eth|solana|sol|xrp|sui|avalanche|crypto|etf|sec)/.test(txt)) rel=true;
    if(cat==='metals' && /(gold|silver|xau|xag|dollar|yields|inflation|fed)/.test(txt)) rel=true;
    if(cat==='indices' && /(nasdaq|s&p|stock|fed|cpi|inflation|earnings|rate)/.test(txt)) rel=true;
    if(!rel) return;
    var w=(n.importance==='high'?6:3);
    if(n.impact==='bullish') newsScore+=w;
    if(n.impact==='bearish') newsScore-=w;
  });
  newsScore=Math.max(-14,Math.min(14,newsScore));

  // Volatility: high volatility reduces confidence, not necessarily direction.
  var vol=Math.abs(ch24);
  if(vol>4) volScore-=6;
  else if(vol>1.2) volScore+=2;

  var raw=50 + trendScore*0.30 + momentumScore*0.30 + macroScore*0.25 + newsScore*0.12 + volScore*0.03;
  raw=Math.max(15,Math.min(85,raw));
  var score=Math.round(raw);
  var direction=score>=ZYNQEL_V4.directionalThreshold?'buy':score<=100-ZYNQEL_V4.directionalThreshold?'sell':'wait';

  // If mixed but momentum is meaningfully one-sided, allow weak directional bias.
  if(direction==='wait'){
    if(score>=56 && trendScore+momentumScore>18) direction='buy';
    if(score<=44 && trendScore+momentumScore<-18) direction='sell';
  }

  var state=getSignalState(assetId);
  var now=Date.now();
  var previousAction=state.action||'wait';
  var previousScore=parseFloat(state.score||50);
  var age=state.ts?now-state.ts:999999999;

  // Anti-flip: do not immediately reverse unless the new score is strong.
  if(age<ZYNQEL_V4.cooldownMs && previousAction && previousAction!=='wait' && direction!==previousAction){
    var strongEnough = (direction==='buy' && score>=ZYNQEL_V4.strongFlipThreshold) || (direction==='sell' && score<=100-ZYNQEL_V4.strongFlipThreshold);
    if(!strongEnough){
      direction=previousAction;
      score=Math.round((score+previousScore*1.25)/2.25);
      reasons.push('bias persistence: previous thesis still active');
    }
  }

  var confidence=Math.round(Math.max(45, Math.min(88, 50+Math.abs(score-50)*1.15 + (reasons.length>=2?5:0) - (vol>5?8:0))));
  if(direction==='wait') confidence=Math.min(confidence,62);

  var sentiment=direction==='buy'?'bullish':direction==='sell'?'bearish':'neutral';
  var regime=classifyRegime(assetId, score, {change24h:ch24,change7d:ch7}, {trendScore:trendScore,macroScore:macroScore,momentumScore:momentumScore,newsScore:newsScore});

  var bullProb=Math.max(8,Math.min(88,score));
  var bearProb=Math.max(8,Math.min(88,100-score));
  var neutralProb=Math.max(4,100-bullProb-bearProb);
  // Normalize for UI/prompt.
  var total=bullProb+bearProb+neutralProb;
  bullProb=Math.round(bullProb/total*100);
  bearProb=Math.round(bearProb/total*100);
  neutralProb=100-bullProb-bearProb;

  var support=tech.support || (price?price*0.985:0);
  var resistance=tech.resistance || (price?price*1.015:0);
  var entryZone='';
  if(price){
    if(direction==='buy') entryZone=fmtPrice(price*0.988)+' — '+fmtPrice(price*0.998);
    else if(direction==='sell') entryZone=fmtPrice(price*1.002)+' — '+fmtPrice(price*1.014);
    else entryZone=fmtPrice(support)+' — '+fmtPrice(resistance);
  }

  var invalidation=null, target1=null, waitFor='';
  if(price && direction==='buy'){
    invalidation=fmtPrice(price*0.972);
    target1=fmtPrice(Math.max(resistance, price*(1+Math.max(0.012,(score-50)/700))));
  }else if(price && direction==='sell'){
    invalidation=fmtPrice(price*1.028);
    target1=fmtPrice(Math.min(support, price*(1-Math.max(0.012,(50-score)/700))));
  }else{
    waitFor=appLang==='ru'
      ? 'жду закрепление выше сопротивления '+fmtPrice(resistance)+' или потерю поддержки '+fmtPrice(support)+' с объёмом'
      : 'wait for a hold above resistance '+fmtPrice(resistance)+' or loss of support '+fmtPrice(support)+' with volume';
  }

  var explanationRu = 'V4 regime: '+regime+'. Скоринг факторов: trend '+Math.round(trendScore)+', momentum '+Math.round(momentumScore)+', macro '+Math.round(macroScore)+', news '+Math.round(newsScore)+'. ';
  var explanationEn = 'V4 regime: '+regime+'. Factor scores: trend '+Math.round(trendScore)+', momentum '+Math.round(momentumScore)+', macro '+Math.round(macroScore)+', news '+Math.round(newsScore)+'. ';
  var reasoning=(appLang==='ru'?explanationRu:explanationEn) + (reasons.slice(0,3).join(', ') || (appLang==='ru'?'рынок смешанный':'mixed market'));

  var out={
    action:direction,
    sentiment:sentiment,
    probability: direction==='sell' ? bearProb : direction==='buy' ? bullProb : Math.max(bullProb,bearProb),
    confidence:confidence,
    entryZone:entryZone,
    invalidation:invalidation,
    target1:target1,
    waitFor:waitFor,
    shortTerm: appLang==='ru'
      ? ('24ч: '+(direction==='buy'?'покупатели удерживают структуру выше поддержки':direction==='sell'?'продавцы сохраняют давление от сопротивления':'диапазон без подтверждения')+' · '+regime)
      : ('24h: '+(direction==='buy'?'buyers hold structure above support':direction==='sell'?'sellers keep pressure from resistance':'range without confirmation')+' · '+regime),
    midTerm: appLang==='ru'
      ? ('7д: сценарии bull '+bullProb+'% / bear '+bearProb+'% / neutral '+neutralProb+'%')
      : ('7d: scenarios bull '+bullProb+'% / bear '+bearProb+'% / neutral '+neutralProb+'%'),
    reasoning:reasoning,
    factors:[
      'Regime: '+regime,
      'Confluence: '+score+'/100',
      'Scenarios: BULL '+bullProb+'% / BEAR '+bearProb+'% / NEUTRAL '+neutralProb+'%'
    ],
    v4:{
      score:score,
      regime:regime,
      previousAction:previousAction,
      ageMinutes:Math.round(age/60000),
      scenario:{bullish:bullProb,bearish:bearProb,neutral:neutralProb},
      components:{trend:Math.round(trendScore),momentum:Math.round(momentumScore),macro:Math.round(macroScore),news:Math.round(newsScore)}
    },
    source:'LOCAL ENGINE · V4'
  };

  setSignalState(assetId,{action:direction,score:score,regime:regime,confidence:confidence,ts:now});
  return out;
}

function mergeV4WithGroq(assetId, forecast){
  var v4=computeV4InstitutionalSignal(assetId);
  forecast=forecast||{};
  var src=(forecast.source||'').toUpperCase();

  // Use V4 as decision authority, Groq as reasoning/style layer.
  // This prevents Groq from defaulting to WAIT for every asset.
  var groqAction=String(forecast.action||'').toLowerCase();
  var groqConf=parseFloat(forecast.confidence||0);
  var v4Strong = (v4.action!=='wait' && v4.confidence>=58);

  if(v4Strong || groqAction==='wait' || !groqAction){
    forecast.action=v4.action;
    forecast.sentiment=v4.sentiment;
    forecast.probability=v4.probability;
    forecast.confidence=Math.max(parseFloat(forecast.confidence||0), v4.confidence);
    forecast.entryZone=v4.entryZone;
    forecast.invalidation=v4.invalidation;
    forecast.target1=v4.target1;
    forecast.waitFor=v4.waitFor;
  }

  // Always attach V4 scenarios/factors so the UI stops looking generic.
  forecast.shortTerm = forecast.shortTerm || v4.shortTerm;
  forecast.midTerm = v4.midTerm;
  forecast.factors = (forecast.factors && forecast.factors.length ? forecast.factors.slice(0,2) : []).concat(v4.factors).slice(0,5);
  forecast.reasoning = (forecast.reasoning && String(forecast.reasoning).trim().length>40)
    ? (forecast.reasoning + ' ' + (appLang==='ru'?'V4-фильтр: ':'V4 filter: ') + v4.reasoning)
    : v4.reasoning;
  forecast.v4=v4.v4;
  forecast.source = src.indexOf('GROQ')>=0 ? 'GROQ AI · V4 ENGINE' : 'LOCAL ENGINE · V4';
  return forecast;
}


function cleanDecisionField(v){
  if(v===undefined || v===null) return '';
  var x=String(v).trim();
  var low=x.toLowerCase();
  if(!x || low==='wait' || low==='none' || low==='null' || low==='n/a' || low==='na' || low==='-' || low==='—') return '';
  return x;
}


function zynqelResolveGroqStatus(){
  try{ if(window.__zynqelLastGroqStatus) return window.__zynqelLastGroqStatus; if(window.zynqelGroqRoute) return 'server route'; }catch(e){}
  return 'local fallback';
}
function zynqelCandleDataStatus(asset){
  try{
    asset = String(asset || window.currentAnalysisAsset || window.currentAsset || 'BTC').toUpperCase().replace('/USD','').replace('USD','').replace('USDT','').replace(/[^A-Z0-9]/g,'');
    var frames = window.z4CandleFrames && window.z4CandleFrames[asset] ? window.z4CandleFrames[asset] : {};
    var required=['15m','1h','4h','1d'], missing=[], stale=[], now=Date.now();

    required.forEach(function(tf){
      var arr=frames[tf];
      if(window.zynqelNormalizeCandles) arr = window.zynqelNormalizeCandles(arr);
      if(!arr||arr.length<30){missing.push(tf);return;}
      var last=arr[arr.length-1]||{}; var t=Number(last.t||last.time||last[0]||0); if(t&&t<1000000000000)t*=1000;
      var max=tf==='15m'?45*60*1000:tf==='1h'?3*60*60*1000:tf==='4h'?10*60*60*1000:36*60*60*1000;
      if(t && now-t>max) stale.push(tf);
    });

    if((missing.length || stale.length) && typeof window.zynqelRepairCandles === 'function'){
      window.zynqelRepairCandles(asset, false);
      return {ok:false, missing:missing, stale:stale, syncing:true};
    }

    return {ok:missing.length===0&&stale.length===0,missing:missing,stale:stale,syncing:false};
  }catch(e){return {ok:false,missing:['unknown'],stale:[],syncing:true};}
}

function buildTradeDecision(assetId, forecast){
  forecast = Object.assign({}, forecast || {});
  var __modeNow = (typeof window.zynqelGetTradeMode === 'function')
    ? window.zynqelGetTradeMode()
    : (localStorage.getItem('zynqel_trade_mode') || 'safe');

  // In SAFE mode remove any stale ACTIVE residue from previous render/cache.
  if(__modeNow !== 'active'){
    if(forecast.isActiveModeSignal || String(forecast.source || '').indexOf('ACTIVE') >= 0){
      forecast.action = 'wait';
      forecast.signal = 'wait';
      forecast.sentiment = 'neutral';
      forecast.source = String(forecast.source || 'LOCAL ENGINE').replace(/\s*\+\s*ACTIVE MODE/g,'').replace(/\s*\+\s*ACTIVE/g,'');
      delete forecast.isActiveModeSignal;
      delete forecast.entryZone;
      delete forecast.zone;
      delete forecast.invalidation;
      delete forecast.target1;
      delete forecast.waitFor;
    }
  }

  var isRu=appLang==='ru';
  var d=liveData[assetId]||{};
  var price=parseFloat(d.price||0);
  var prob=parseFloat(forecast && forecast.probability || 50);
  var conf=parseFloat(forecast && forecast.confidence || 50);
  var sentiment=(forecast && forecast.sentiment || 'neutral').toLowerCase();
  var source=(forecast && forecast.source) || 'LOCAL ENGINE';
  var action=(forecast && forecast.action ? String(forecast.action).toLowerCase() : '');
  if(['buy','sell','wait'].indexOf(action)<0){
    if(sentiment==='bullish' && prob>=58 && conf>=50) action='buy';
    else if(sentiment==='bearish' && prob<=42 && conf>=50) action='sell';
    else action='wait';
  }
  // Active Mode direct action bridge.
  // This is inside the real buildTradeDecision() used by the renderer,
  // so Safe/Active finally changes My Action without touching DOM.
  var activePrepareSide = '';
  var activeEntryZone = '';
  var activeInvalidation = '';
  var activeTarget = '';
  var activeWaitFor = '';
  try{
    var activeMode = (__modeNow === 'active');
    if(activeMode && action === 'wait'){
      function zn(v, fb){ v = Number(v); return Number.isFinite(v) ? v : fb; }
      function zema(arr, period){
        if(!arr || arr.length < period) return null;
        var k = 2/(period+1), prev = 0;
        for(var zi=0; zi<period; zi++) prev += arr[zi];
        prev /= period;
        for(var zj=period; zj<arr.length; zj++) prev = arr[zj]*k + prev*(1-k);
        return prev;
      }
      var fr = (window.z4CandleFrames && window.z4CandleFrames[assetId]) ? window.z4CandleFrames[assetId] : {};
      var cs = (fr['15m'] && fr['15m'].length >= 30) ? fr['15m'] : ((fr['1h'] && fr['1h'].length >= 30) ? fr['1h'] : []);
      var closes = cs.map(function(c){ return zn(c.c,0); }).filter(function(v){ return v>0; });
      var vols = cs.map(function(c){ return zn(c.v,0); }).filter(function(v){ return v>0; });
      var e9 = zema(closes,9), e21 = zema(closes,21);
      var lastVol = vols.length ? vols[vols.length-1] : 0;
      var avgVol = vols.length > 22 ? vols.slice(-22,-2).reduce(function(s,v){return s+v;},0)/20 : 0;
      var volBoost = avgVol ? lastVol/avgVol : 1;
      var earlyScore = 0;
      try{
        if(typeof window.zynqelEarlyEntrySignal === 'function'){
          var ee = window.zynqelEarlyEntrySignal(assetId);
          if(ee && ee.ready) earlyScore = zn(ee.score,0);
        }
        if(!earlyScore && typeof window.zynqelEarlyMoveWarning === 'function'){
          var em = window.zynqelEarlyMoveWarning(assetId);
          if(em && em.ready) earlyScore = zn(em.score,0);
        }
      }catch(e){}
      var bullish = price && e9 && e21 && price > e9 && e9 >= e21;
      var bearish = price && e9 && e21 && price < e9 && e9 <= e21;
      if(conf >= 56 && earlyScore >= 70 && bullish){
        action = 'buy';
        activePrepareSide = 'buy';
        activeEntryZone = (isRu ? 'Active BUY watch zone: ' : 'Active BUY watch zone: ') + fmtPrice(price*0.994) + ' — ' + fmtPrice(price*1.006);
        activeInvalidation = fmtPrice(price*0.986);
        activeTarget = fmtPrice(price*1.014);
        activeWaitFor = isRu ? 'ACTIVE: жду подтверждение EMA/свечи и объёма' : 'ACTIVE: waiting for EMA/candle and volume confirmation';
      }else if(conf >= 56 && earlyScore >= 70 && bearish){
        action = 'sell';
        activePrepareSide = 'sell';
        activeEntryZone = (isRu ? 'Active SELL watch zone: ' : 'Active SELL watch zone: ') + fmtPrice(price*0.994) + ' — ' + fmtPrice(price*1.006);
        activeInvalidation = fmtPrice(price*1.014);
        activeTarget = fmtPrice(price*0.986);
        activeWaitFor = isRu ? 'ACTIVE: жду пробой/удержание ниже EMA и объём' : 'ACTIVE: waiting for breakdown/hold below EMA and volume';
      }
    }
  }catch(e){ console.warn('Active Mode bridge failed:', e.message); }

  var low=0, high=0, invalid=0, take=0;
  if(price){
    if(action==='buy'){
      low=price*0.985; high=price*0.997; invalid=price*0.972; take=price*(1+Math.max(0.012,(prob-50)/650));
    }else if(action==='sell'){
      low=price*1.003; high=price*1.015; invalid=price*1.028; take=price*(1-Math.max(0.012,(50-prob)/650));
    }else{
      low=price*0.99; high=price*1.01; invalid=0; take=0;
    }
  }
  var actionLabel=isRu?({buy:'Я бы купил',sell:'Я бы продал',wait:'Я бы подождал подтверждения'}[action]):({buy:'I would buy',sell:'I would sell',wait:'I would wait for confirmation'}[action]);
  if(activePrepareSide === 'buy') actionLabel = isRu ? 'Я бы готовился к раннему BUY' : 'I would prepare for early BUY';
  if(activePrepareSide === 'sell') actionLabel = isRu ? 'Я бы готовился к раннему SELL' : 'I would prepare for early SELL';
  var entryZone=cleanDecisionField(activeEntryZone || (forecast && forecast.entryZone));
  var inval=cleanDecisionField(activeInvalidation || (forecast && forecast.invalidation));
  var target=cleanDecisionField(activeTarget || (forecast && forecast.target1));
  var entryText;
  if(entryZone && action!=='wait'){
    entryText=(isRu?'Зона: ':'Zone: ')+escapeHtml(entryZone);
  }else if(!price){
    entryText=isRu?'Зона входа не определена: нет корректной цены по активу.':'Entry zone unavailable: no valid asset price.';
  }else if(action==='buy'){
    entryText=isRu?('Зона входа: '+fmtPrice(low)+' — '+fmtPrice(high)):('Entry zone: '+fmtPrice(low)+' — '+fmtPrice(high));
  }else if(action==='sell'){
    entryText=isRu?('Зона продажи/шорта: '+fmtPrice(low)+' — '+fmtPrice(high)):('Sell/short zone: '+fmtPrice(low)+' — '+fmtPrice(high));
  }else{
    var waitZone=cleanDecisionField(forecast && forecast.entryZone);
    entryText=isRu?('Зона наблюдения: '+(waitZone?escapeHtml(waitZone):(fmtPrice(low)+' — '+fmtPrice(high)))+' · вход только после подтверждения'):('Watch zone: '+(waitZone?escapeHtml(waitZone):(fmtPrice(low)+' — '+fmtPrice(high)))+' · enter only after confirmation');
  }
  var riskText;
  if(action!=='wait' && (inval || target)){
    riskText=(isRu?'Отмена: ':'Invalidation: ')+escapeHtml(inval||'—')+' · '+(isRu?'первая цель: ':'first target: ')+escapeHtml(target||'—');
  }else if(!price || action==='wait'){
    var waitFor=cleanDecisionField(activeWaitFor || (forecast && (forecast.waitFor || forecast.confirmation || forecast.trigger)));
    riskText=waitFor ? (isRu?'Что жду: ':'Waiting for: ')+escapeHtml(waitFor) : (isRu?'Пока без сделки: жду объём, пробой уровня, разворот свечи или свежую новость.':'No trade yet: wait for volume, level breakout, candle reversal, or fresh news.');
  }else{
    riskText=isRu?('Отмена идеи: '+fmtPrice(invalid)+' · первая цель: '+fmtPrice(take)):('Invalidation: '+fmtPrice(invalid)+' · first target: '+fmtPrice(take));
  }
  var note=isRu?'Это не финансовая рекомендация, а сигнал приложения по текущим данным.':'This is not financial advice; it is an app signal based on current data.';
  return {action:action, actionLabel:actionLabel, entryText:entryText, riskText:riskText, note:note, source:source};
}

function sourceBadgeHTML(source){
  var src=(source||'LOCAL ENGINE').toUpperCase();
  var isGroq=src.indexOf('GROQ')>=0;
  var label=isGroq?'GROQ AI':'LOCAL ENGINE';
  var style=isGroq?'background:rgba(0,229,160,.10);border-color:rgba(0,229,160,.28);color:var(--green);':'background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.28);color:#fcd34d;';
  var prefix=appLang==='ru'?'Источник':'Source';
  return '<span class="badge" style="'+style+'">'+prefix+': '+label+'</span>';
}

function buildFallbackForecast(assetId){
  var v4 = computeV4InstitutionalSignal(assetId);
  v4.source='LOCAL ENGINE · V4';
  return v4;
}

function buildFallbackPulse(){
  var isRu=appLang==='ru';
  var btc=liveData.BTC||{}, eth=liveData.ETH||{}, dxy=liveData.DXY||{};
  var parts=[];
  if(btc.price) parts.push('BTC '+fmtChg(btc.change24h||0));
  if(eth.price) parts.push('ETH '+fmtChg(eth.change24h||0));
  if(dxy.price) parts.push('DXY '+fmtChg(dxy.change24h||0));
  return isRu?
    'Резервный анализ: рынок сейчас '+(parts.join(', ')||'собирает данные')+'. Fear & Greed: '+(fearGreed||'нет данных')+'. Если Groq недоступен, прогноз считается по скорингу цены, новостей и макро.' :
    'Fallback analysis: market now '+(parts.join(', ')||'loading data')+'. Fear & Greed: '+(fearGreed||'no data')+'. If Groq is unavailable, forecast uses price, news and macro scoring.';
}

function buildFallbackAlerts(){
  var isRu=appLang==='ru';
  var alerts=[];
  ASSETS.forEach(function(a){
    var d=liveData[a.id]||{}, ch=parseFloat(d.change24h||0);
    if(Math.abs(ch)>=2){
      alerts.push({id:Date.now()+alerts.length,type:'volume',asset:a.id,
        severity:Math.abs(ch)>=4?'high':'medium',time:isRu?'только что':'just now',
        message:isRu?
          (a.id+': движение '+ch.toFixed(2)+'% за 24ч. Резервный алгоритм видит повышенную волатильность.'):
          (a.id+': '+ch.toFixed(2)+'% 24h move. Fallback engine detects elevated volatility.')});
    }
  });
  if(fearGreed && (fearGreed<30 || fearGreed>70)) alerts.push({id:Date.now()+99,type:'macro',asset:'MARKET',severity:'medium',time:isRu?'только что':'just now',message:isRu?'Fear & Greed в экстремальной зоне: '+fearGreed+'. Возможны резкие движения.':'Fear & Greed is in an extreme zone: '+fearGreed+'. Sharp moves are possible.'});
  if(!alerts.length) alerts.push({id:Date.now()+1,type:'macro',asset:'MARKET',severity:'low',time:isRu?'только что':'just now',message:isRu?'Резервный алгоритм не видит критических аномалий.':'Fallback engine sees no critical anomalies.'});
  return alerts.slice(0,6);
}

function buildFallbackLevels(assetId){
  var d=liveData[assetId]||{};
  var price=parseFloat(d.price||0);
  if(!price) return null;
  var vol=Math.max(0.008,Math.min(0.06,Math.abs(parseFloat(d.change24h||0))/100+0.012));
  return {
    support:[
      {price:price*(1-vol),strength:'weak',note:appLang==='ru'?'Ближайшая зона отката':'Nearest pullback zone'},
      {price:price*(1-vol*2),strength:'medium',note:appLang==='ru'?'Средняя поддержка по волатильности':'Medium volatility support'},
      {price:price*(1-vol*3.2),strength:'strong',note:appLang==='ru'?'Глубокая зона риска':'Deep risk zone'}
    ],
    resistance:[
      {price:price*(1+vol),strength:'weak',note:appLang==='ru'?'Ближайшее сопротивление':'Nearest resistance'},
      {price:price*(1+vol*2),strength:'medium',note:appLang==='ru'?'Целевая зона роста':'Upside target zone'},
      {price:price*(1+vol*3.2),strength:'strong',note:appLang==='ru'?'Сильная зона фиксации':'Strong take-profit zone'}
    ]
  };
}

async function generateMarketPulse(){
  var isRu=appLang==='ru';
  var sys=isRu?
    'Ты Zynqel AI. Дай краткий пульс рынка на русском. Используй только JSON-контекст пользователя. Не выдумывай события. 2-3 предложения + краткое действие: риск/ждать/можно искать вход.':
    'You are Zynqel AI. Give a concise market pulse. Use only the supplied JSON context. Do not invent events. 2-3 sentences + short action bias: risk/wait/look for entry.';
  var ctx=getMarketContext();
  g('market-pulse').innerHTML='<div class="loading-state" style="padding:12px;"><div class="ld-spin" style="width:14px;height:14px;"></div><span style="font-size:11px;color:var(--muted);margin-left:8px;font-family:JetBrains Mono,monospace;">'+t('analyzing')+'</span></div>';
  try{
    var result=await callGroq(sys,ctx,300);
    g('market-pulse').innerHTML='<p style="font-size:12px;color:#94a3b8;line-height:1.7;padding:4px 0;"><span style="color:'+(result?'var(--green)':'var(--gold)')+';font-family:JetBrains Mono,monospace;font-size:10px;">'+(result?'GROQ AI · FULL CONTEXT':'LOCAL ENGINE')+'</span><br>'+escapeHtml(result||buildFallbackPulse())+'</p>';
  }catch(e){
    console.warn('Pulse:',e.message);
    g('market-pulse').innerHTML='<p style="font-size:12px;color:#94a3b8;line-height:1.7;padding:4px 0;">'+buildFallbackPulse()+'</p>';
  }
}

async function generateForecast(assetId){
  var isRu=appLang==='ru';
  var d=liveData[assetId]||{};
  var ctx=getMarketContext();
  var sys=isRu?
    'Ты профессиональный рыночный AI-аналитик Zynqel. Используй ВСЮ доступную информацию из JSON: live prices, 1h/24h/7d, volume, technicals/support/resistance/RSI proxy, Fear&Greed, ставка ФРС, CPI, DXY, новости и текущие алерты. НЕЛЬЗЯ выдумывать новости, whale-сделки, инсайдерские продажи или мировые события, если их нет в JSON. Не выбирай WAIT по умолчанию. Если факторы явно в одну сторону — дай BUY или SELL. WAIT только если сигналы реально смешанные или V4 signal тоже WAIT. Верни ТОЛЬКО валидный JSON без markdown.':
    'You are Zynqel professional market AI analyst. Use ALL available information in JSON: live prices, 1h/24h/7d, volume, technicals/support/resistance/RSI/EMA proxies, confluence_score, Fear&Greed, Fed rate, CPI, DXY, VIX, oil, US10Y/yields proxy, news and current alerts. NEVER invent news, whale trades, insider/shareholder sales or world events if they are not in JSON. Do NOT default to WAIT. If factors clearly dominate one direction, choose BUY or SELL. Use WAIT only when signals are truly mixed or V4 signal is also WAIT. Return ONLY valid JSON, no markdown.';
  var tpl=isRu?
    '{"sentiment":"bullish/bearish/neutral","action":"buy/sell/wait","probability":65,"confidence":72,"entryZone":"точный диапазон цены или зона наблюдения из support/resistance; не пиши wait","invalidation":"цена отмены идеи; если action=wait, null","target1":"первая цель; если action=wait, null","waitFor":"если action=wait, что именно нужно дождаться: пробой/ретест/объём/новость","shortTerm":"сценарий на 24ч с условием и уровнем","midTerm":"сценарий на 7д с условием и уровнем","reasoning":"2-4 предложения: почему покупать/продавать/ждать, только по фактам из JSON; учитывай тип актива crypto/forex/metals/indices","factors":["технический фактор","новость/макро фактор","ключевой риск"]}':
    '{"sentiment":"bullish/bearish/neutral","action":"buy/sell/wait","probability":65,"confidence":72,"entryZone":"exact price range or watch zone from support/resistance; never write wait","invalidation":"invalidation price; if action=wait, null","target1":"first target; if action=wait, null","waitFor":"if action=wait, what exact confirmation is needed: breakout/retest/volume/news","shortTerm":"24h conditional scenario with level","midTerm":"7d conditional scenario with level","reasoning":"2-4 sentences: why buy/sell/wait, based only on JSON facts; respect asset type crypto/forex/metals/indices","factors":["technical factor","news/macro factor","key risk"]}';
  var parsedCtx=JSON.parse(ctx);
  var usr=JSON.stringify({assetToAnalyze:assetId,currentPrice:d.price||null,selectedAssetTechnical:parsedCtx.technicals&&parsedCtx.technicals[assetId],marketContext:parsedCtx,requiredOutput:tpl});
  try{
    var res=await callGroq(sys,usr,850);
    if(!res){ throw new Error('empty_groq'); }
    var parsed=safeParseGroqObject(res);
    if(parsed){
      parsed.source='GROQ AI';
      parsed.fullContext=true;
      return normalizeForecast(assetId, parsed);
    }
    throw new Error('bad_groq_json');
  }catch(e){console.warn('Forecast:',assetId,e.message);}
  return normalizeForecast(assetId, buildFallbackForecast(assetId));
}

async function generateAIAlerts(){
  var isRu=appLang==='ru';
  g('alerts-content').innerHTML='<div class="loading-state"><div class="loading-icon">⚡</div><div class="loading-text">'+t('scanAlerts')+'</div><div class="loading-sub">'+getMarketContextText().slice(0,100)+'...</div></div>';
  var ctx=getMarketContext();
  var sys=isRu?
    'Ты система алертов Zynqel. Создавай алерты ТОЛЬКО из фактов JSON: движение цены, волатильность, Fear&Greed, макро, реальные заголовки новостей. НЕЛЬЗЯ писать whale/shareholder/insider/SEC, если такого нет в новостях JSON. Отвечай ТОЛЬКО JSON массивом.':
    'You are Zynqel alert engine. Create alerts ONLY from JSON facts: price moves, volatility, Fear&Greed, macro, real news headlines. NEVER write whale/shareholder/insider/SEC alerts unless explicitly present in JSON news. Respond ONLY with JSON array.';
  var tpl=isRu?
    '[{"type":"price_move/news/macro/volatility","asset":"BTC","message":"алерт по реальному факту из JSON","severity":"critical/high/medium/low","evidence":"какой факт из JSON"}]':
    '[{"type":"price_move/news/macro/volatility","asset":"BTC","message":"alert based on a real JSON fact","severity":"critical/high/medium/low","evidence":"which JSON fact supports this"}]';
  var usr=JSON.stringify({marketContext:JSON.parse(ctx),rules:'No invented events. If no real evidence, create fewer alerts.',requiredOutput:tpl});
  try{
    var res=await callGroq(sys,usr,650);
    if(!res){ throw new Error('empty_groq'); }
    var parsed=safeParseGroqArray(res);
    if(parsed && parsed.map){
      allAlerts=parsed.slice(0,6).map(function(a,i){
        return {id:Date.now()+i,type:a.type||'price_move',asset:a.asset||'MARKET',
          message:(a.message||'')+(a.evidence?(' · '+(isRu?'Факт: ':'Evidence: ')+a.evidence):''),severity:a.severity||'medium',
          time:isRu?'только что':'just now',source:'GROQ AI'};
      }).filter(function(a){return a.message && a.message.length>8;});
      if(!allAlerts.length) allAlerts=buildFallbackAlerts();
      renderAlerts();
      console.log('✅ AI Alerts:',allAlerts.length);
      return;
    }
    allAlerts = buildFallbackAlerts();
    renderAlerts();
  }catch(e){
    console.warn('Alerts:',e.message);
    allAlerts = buildFallbackAlerts();
    renderAlerts();
  }
}

async function analyzeNewsItem(newsItem){
  var isRu=appLang==='ru';
  var d=g('news-detail');
  d.innerHTML='<div class="loading-state" style="padding:20px;"><div class="ld-spin"></div><div class="loading-text" style="font-size:11px;margin-top:8px;">'+t('analyzing')+'</div></div>';
  var ctx=getMarketContext();
  var sys=isRu?'Финансовый аналитик. Анализируй влияние новости на рынки. Отвечай на русском.':'Financial analyst. Analyze news market impact. Respond in English.';
  var usr=(isRu?'Новость: ':'News: ')+newsItem.title+'\n'+
    (isRu?'Активы: ':'Assets: ')+newsItem.assets.join(',')+'\n'+
    (isRu?'Контекст рынка: ':'Market context: ')+ctx+'\n\n'+
    (isRu?'Дай анализ: 1) Влияние на рынок 2) Какие активы затронуты и как 3) Краткосрочный прогноз':'Analyze: 1) Market impact 2) Which assets affected and how 3) Short-term forecast');
  try{
    var res=await callGroq(sys,usr,400);
    d.innerHTML='<div style="font-size:12px;color:#94a3b8;line-height:1.7;padding:4px;">'+res.replace(/\n/g,'<br>')+'</div>';
  }catch(e){
    d.innerHTML='<div style="font-size:12px;color:var(--muted);padding:8px;">'+t('eGen')+'</div>';
  }
}

async function sendChat(){
  var inp=g('chat-input');
  var msg=inp.value.trim();if(!msg)return;
  inp.value='';
  var msgs=g('chat-messages');
  msgs.innerHTML+='<div class="chat-msg chat-msg-user">'+msg+'</div>';
  msgs.innerHTML+='<div class="chat-msg chat-msg-ai" id="chat-thinking"><span class="ld-spin" style="width:12px;height:12px;"></span></div>';
  msgs.scrollTop=msgs.scrollHeight;
  chatHistory.push({role:'user',content:msg});
  var isRu=appLang==='ru';
  var sys=(isRu?'Ты Zynqel ИИ-аналитик. Используй реальные данные. Отвечай по-русски профессионально.\n':'You are Zynqel AI analyst. Use real market data. Respond professionally.\n')+getMarketContext();
  var messages=[{role:'system',content:sys}];
  chatHistory.slice(-6).forEach(function(m){messages.push({role:m.role,content:m.content});});
  try{
    var usr = chatHistory.slice(-6).map(function(m){return m.role+': '+m.content;}).join('\n');
    var reply = await callGroq(sys, usr, 400);
    if(!reply) reply = isRu ? ('Groq не ответил вовремя. Резервный ответ: '+buildFallbackPulse()) : ('Groq did not answer in time. Fallback: '+buildFallbackPulse());
    chatHistory.push({role:'assistant',content:reply});
    var t_el=g('chat-thinking');
    if(t_el)t_el.outerHTML='<div class="chat-msg chat-msg-ai">'+reply+'</div>';
  }catch(e){
    var t_el2=g('chat-thinking');
    if(t_el2)t_el2.outerHTML='<div class="chat-msg chat-msg-ai">'+(isRu?'Резервный анализ: ':'Fallback analysis: ')+buildFallbackPulse()+'</div>';
  }
  msgs.scrollTop=msgs.scrollHeight;
}

function toggleChat(){
  g('chat-panel').classList.toggle('open');
}

// ═══════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════
function fmtPrice(p){
  if(!p||isNaN(p) || parseFloat(p)<=0)return appLang==='ru'?'Ожидание feed':'Waiting feed';
  if(p>1000)return '$'+parseFloat(p).toLocaleString('en-US',{maximumFractionDigits:2});
  if(p>10)return '$'+parseFloat(p).toFixed(2);
  return '$'+parseFloat(p).toFixed(4);
}
function fmtChg(v){
  v=parseFloat(v)||0;
  return (v>0?'+':'')+v.toFixed(2)+'%';
}
function chgClass(v){
  v=parseFloat(v)||0;
  return v>0?'change-up':v<0?'change-down':'change-neutral';
}

function setTF(tf){
  currentTF=tf;
  ['1h','24h','7d'].forEach(function(t){
    var btn=g('tf-'+t);
    if(btn)btn.classList.toggle('active',t===tf);
  });
  renderAssetTable();
}

function renderDashboard(){
  renderAssetTable();
  renderHeatmap();
  if(allNews.length>0)renderNewsPreview();
}

function renderAssetTable(){
  var tbody=g('asset-tbody');
  if(!tbody)return;
  var tfKey='change'+currentTF.charAt(0).toUpperCase()+currentTF.slice(1);
  var html='';
  ASSETS.forEach(function(a){
    var d=liveData[a.id]||{};
    var price=d.price;
    var chg=d[tfKey]||d.change24h||0;
    var vol=d.volume||'—';
    var sent=parseFloat(chg||0);
    var sentBadge=sent>2?'<span class="badge badge-bullish">'+(appLang==='ru'?'БЫЧИЙ':'BULLISH')+'</span>':
      sent<-2?'<span class="badge badge-bearish">'+(appLang==='ru'?'МЕДВЕЖИЙ':'BEARISH')+'</span>':
      '<span class="badge badge-neutral">'+(appLang==='ru'?'НЕЙТРАЛЬНЫЙ':'NEUTRAL')+'</span>';
    html+='<tr onclick="openAnalysis(\''+a.id+'\')" style="cursor:pointer;">'+
      '<td><div style="display:flex;align-items:center;"><span class="asset-dot" style="background:'+a.color+';"></span><div><div class="asset-name">'+a.id+'</div><div class="asset-pair">'+a.pair+'</div></div></div></td>'+
      '<td class="asset-price">'+fmtPrice(price)+'</td>'+
      '<td class="'+chgClass(chg)+'">'+fmtChg(chg)+'</td>'+
      '<td style="color:var(--muted);font-size:12px;font-family:JetBrains Mono,monospace;">'+vol+'</td>'+
      '<td>'+sentBadge+'</td>'+
      '<td><button onclick="event.stopPropagation();openAnalysis(\''+a.id+'\')" style="background:rgba(0,229,160,.1);border:1px solid rgba(0,229,160,.2);border-radius:6px;color:var(--green);font-size:10px;padding:4px 10px;cursor:pointer;font-family:JetBrains Mono,monospace;">'+(appLang==='ru'?'АНАЛИЗ':'ANALYZE')+'</button></td>'+
      '</tr>';
  });
  tbody.innerHTML=html;
}

function renderHeatmap(){
  var el=g('heatmap');if(!el)return;
  var html='';
  ASSETS.forEach(function(a){
    var d=liveData[a.id]||{};
    var chg=parseFloat(d.change24h||0);
    var intensity=Math.min(Math.abs(chg)/8,1);
    var bg='rgba(30,42,58,0.4)';
    if(chg>0)bg='rgba(0,229,160,'+(0.08+intensity*0.35)+')';
    else if(chg<0)bg='rgba(239,68,68,'+(0.08+intensity*0.35)+')';
    else bg='rgba(30,42,58,0.4)';
    var border=chg>0?'rgba(0,229,160,0.2)':chg<0?'rgba(239,68,68,0.2)':'rgba(30,42,58,0.4)';
    html+='<div class="heatmap-cell" style="background:'+bg+';border:1px solid '+border+';" onclick="openAnalysis(\''+a.id+'\')">'+
      '<div class="heatmap-cell-name" style="color:var(--text);">'+a.id+'</div>'+
      '<div class="heatmap-cell-change '+chgClass(chg)+'">'+fmtChg(chg)+'</div>'+
      '</div>';
  });
  el.innerHTML=html;
}

function renderNewsPreview(){
  var el=g('news-preview');if(!el||!allNews.length)return;
  var html='';
  allNews.slice(0,3).forEach(function(n){
    html+='<div class="news-item" onclick="openNewsDetail('+n.id+')">'+
      '<div class="news-title">'+n.title+'</div>'+
      '<div class="news-meta">'+
      '<span class="badge badge-'+n.importance+'">'+n.importance.toUpperCase()+'</span>'+
      n.assets.map(function(a){return '<span class="badge badge-asset">'+a+'</span>';}).join('')+
      '<span class="badge badge-'+n.impact+'">'+(appLang==='ru'?{bullish:'БЫЧИЙ',bearish:'МЕДВЕЖИЙ',neutral:'НЕЙТРАЛЬНЫЙ'}[n.impact]||n.impact:n.impact.toUpperCase())+'</span>'+
      '<span class="news-time mono">'+(appLang==='ru'?n.timeRu:n.time)+'</span>'+
      '</div></div>';
  });
  el.innerHTML=html;
}

function renderNews(){
  var el=g('news-list');if(!el)return;
  if(!allNews.length){
    el.innerHTML='<div class="loading-state"><div class="ld-spin"></div><div class="loading-text">'+t('loadNews')+'</div></div>';
    return;
  }
  var html='';
  allNews.forEach(function(n){
    html+='<div class="news-item" onclick="openNewsDetail('+n.id+')">'+
      '<div class="news-title">'+n.title+'</div>'+
      '<div class="news-meta">'+
      '<span class="badge badge-'+n.importance+'">'+n.importance.toUpperCase()+'</span>'+
      n.assets.map(function(a){return '<span class="badge badge-asset">'+a+'</span>';}).join('')+
      '<span class="badge badge-'+n.impact+'">'+(appLang==='ru'?{bullish:'БЫЧИЙ',bearish:'МЕДВЕЖИЙ',neutral:'НЕЙТРАЛЬНЫЙ'}[n.impact]||n.impact:n.impact.toUpperCase())+'</span>'+
      '<span class="news-time mono">'+(appLang==='ru'?n.timeRu:n.time)+'</span>'+
      '</div></div>';
  });
  el.innerHTML=html;
}

function openNewsDetail(id){
  var n=allNews.find(function(x){return x.id===id;});
  if(!n)return;
  analyzeNewsItem(n);
}

function renderAlerts(){
  var el=g('alerts-content');if(!el)return;
  if(!allAlerts.length){
    el.innerHTML='<div class="loading-state"><div style="font-size:24px">⚡</div><div class="loading-text" style="color:var(--muted);">'+t('noAlerts')+'</div></div>';
    return;
  }
  var filtered=currentFilter==='all'?allAlerts:allAlerts.filter(function(a){return a.severity===currentFilter;});
  var icons={whale:'🐋',breakout:'💥',volume:'📊',divergence:'↗',macro:'🏛️'};
  var html='';
  filtered.forEach(function(a){
    html+='<div class="alert-item '+a.severity+'">'+
      '<div class="alert-meta">'+
      '<span style="font-size:16px;">'+( icons[a.type]||'⚡')+'</span>'+
      '<span class="badge badge-asset">'+a.type.toUpperCase()+'</span>'+
      '<span class="badge badge-asset">'+a.asset+'</span>'+
      '<span class="badge badge-'+(a.severity==='critical'||a.severity==='high'?'high':'medium')+'">'+a.severity.toUpperCase()+'</span>'+
      '<span class="news-time mono">'+a.time+'</span>'+
      '</div>'+
      '<div class="alert-msg">'+a.message+'</div>'+
      '</div>';
  });
  el.innerHTML=html||'<div class="loading-state"><div style="color:var(--muted);font-size:13px;">No '+currentFilter+' alerts</div></div>';
}

function filterAlerts(f){
  currentFilter=f;
  ['all','critical','medium'].forEach(function(x){
    var btn=g('af-'+x);if(btn)btn.classList.toggle('active',x===f);
  });
  renderAlerts();
}

// ═══════════════════════════════════════════════════════
// ANALYSIS PAGE
// ═══════════════════════════════════════════════════════
function renderAnalysisChips(){
  var el=g('analysis-chips');if(!el)return;
  el.innerHTML=ASSETS.map(function(a){
    return '<button class="chip'+(a.id===currentAsset?' active':'')+'" onclick="selectAnalysisAsset(\''+a.id+'\')">'+a.id+'</button>';
  }).join('');
  if(!currentAnalysisAsset)selectAnalysisAsset(currentAsset);
}

function selectAnalysisAsset(id){
  currentAsset=id;
  currentAnalysisAsset=id;
  var chips=document.querySelectorAll('#analysis-chips .chip');
  chips.forEach(function(c,i){c.classList.toggle('active',ASSETS[i]&&ASSETS[i].id===id);});
  loadAnalysis(id);
}

function openAnalysis(id){
  showPage('analysis');
  currentAsset=id;
  currentAnalysisAsset=id;
  renderAnalysisChips();
  loadAnalysis(id);
}

async function loadAnalysis(assetId, opts){
  opts = opts || {};
  var __modeSeqAtStart = window.__zynqelModeSeq || 0;
  var __modeAtStart = (typeof window.zynqelGetTradeMode === 'function')
    ? window.zynqelGetTradeMode()
    : (localStorage.getItem('zynqel_trade_mode') || 'safe');
  if(analysisLoadingNow && !opts.force) return;
  analysisLoadingNow = true;
  analysisLastReloadAt = Date.now();
  var el=g('analysis-content');if(!el){analysisLoadingNow=false;return;}
  var isRu=appLang==='ru';
  var d=liveData[assetId]||{};
  el.innerHTML='<div class="loading-state"><div class="loading-icon">🤖</div><div class="loading-text">'+t('analysisLoading')+'</div><div class="loading-sub">'+t('analysisSub')+'</div></div>';
  var forecast=null;
  try{ forecast=await generateForecast(assetId); }catch(e){ console.warn('loadAnalysis:',e.message); }
  if(!forecast){
    analysisLoadingNow=false;
    el.innerHTML='<div class="loading-state"><div style="font-size:28px;">⚠️</div><div class="loading-text" style="color:var(--muted);">'+(isRu?'Не удалось получить прогноз':'Could not get forecast')+'</div><button onclick="loadAnalysis(\''+assetId+'\')" style="margin-top:12px;background:linear-gradient(135deg,var(--green),var(--blue));border:none;border-radius:7px;color:#080c14;padding:9px 20px;cursor:pointer;font-size:12px;font-weight:700;">'+(isRu?'🔄 Повторить':'🔄 Retry')+'</button></div>';
    return;
  }
  // If user switched SAFE/ACTIVE while this async analysis was loading, cancel this stale render.
  var __modeNowBeforeRender = (typeof window.zynqelGetTradeMode === 'function')
    ? window.zynqelGetTradeMode()
    : (localStorage.getItem('zynqel_trade_mode') || 'safe');
  if((window.__zynqelModeSeq || 0) !== __modeSeqAtStart || __modeNowBeforeRender !== __modeAtStart){
    analysisLoadingNow = false;
    return;
  }

  forecast = normalizeForecast(assetId, forecast);
  forecast = Object.assign({}, forecast, { tradeMode: __modeAtStart });
  forecast.source = forecast.source || 'LOCAL ENGINE';
  if(!forecast.factors || !forecast.factors.map) forecast.factors=[];
  var trade=buildTradeDecision(assetId, forecast);
  var sc=(forecast.sentiment||'neutral').toLowerCase();
  var col=sc==='bullish'?'var(--green)':sc==='bearish'?'var(--red)':'var(--gold)';
  var scLabel=isRu?{bullish:'БЫЧИЙ',bearish:'МЕДВЕЖИЙ',neutral:'НЕЙТРАЛЬНЫЙ'}[sc]||sc.toUpperCase():sc.toUpperCase();
  var asset=ASSETS.find(function(a){return a.id===assetId;})||{};
  var price=d.price?fmtPrice(d.price):'--';
  var chg=parseFloat(d.change24h||0);
  
  el.innerHTML=
    '<div class="grid-2" style="margin-bottom:16px;">'+
      '<div class="card">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;"><div class="card-title" style="margin-bottom:0;">'+assetId+' / USD — '+scLabel+'</div>'+sourceBadgeHTML(forecast.source)+'</div>'+
        '<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">'+
          '<div>'+
            '<div style="font-size:10px;color:var(--muted);font-family:JetBrains Mono,monospace;margin-bottom:4px;">'+(isRu?'ЦЕНА':'PRICE')+'</div>'+
            '<div id="analysis-live-price" style="font-size:28px;font-weight:700;font-family:JetBrains Mono,monospace;color:var(--text);">'+price+'</div>'+
            '<div id="analysis-live-change" class="'+chgClass(chg)+'" style="font-size:13px;font-family:JetBrains Mono,monospace;margin-top:2px;">'+fmtChg(chg)+' 24H</div>'+
          '</div>'+
          '<div>'+
            '<div style="font-size:10px;color:var(--muted);font-family:JetBrains Mono,monospace;margin-bottom:4px;">'+(isRu?'ВЕРОЯТНОСТЬ РОСТА':'UPWARD PROB')+'</div>'+
            '<div style="font-size:42px;font-weight:800;font-family:JetBrains Mono,monospace;color:'+col+';line-height:1;">'+forecast.probability+'%</div>'+
          '</div>'+
          '<div>'+
            '<div style="font-size:10px;color:var(--muted);font-family:JetBrains Mono,monospace;margin-bottom:4px;">'+(isRu?'УВЕРЕННОСТЬ':'CONFIDENCE')+'</div>'+
            '<div style="font-size:42px;font-weight:800;font-family:JetBrains Mono,monospace;color:var(--blue);line-height:1;">'+forecast.confidence+'%</div>'+
          '</div>'+
        '</div>'+
        '<div style="margin-top:12px;"><div class="progress-bar"><div class="progress-fill" style="width:'+forecast.probability+'%;background:'+col+';"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:4px;font-family:JetBrains Mono,monospace;"><span>'+(isRu?'МЕДВЕЖИЙ 0%':'BEARISH 0%')+'</span><span>50%</span><span>100% '+(isRu?'БЫЧИЙ':'BULLISH')+'</span></div></div>'+
      '</div>'+
      '<div class="card">'+
        '<div class="card-title">'+(isRu?'ПРОГНОЗЫ':'FORECASTS')+'</div>'+
        '<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">'+
          '<span style="font-size:11px;color:var(--muted);font-family:JetBrains Mono,monospace;">'+(isRu?'24Ч ЦЕЛЬ':'24H TARGET')+'</span>'+
          '<span style="font-size:13px;font-weight:600;color:var(--green);font-family:JetBrains Mono,monospace;">'+forecast.shortTerm+'</span>'+
        '</div>'+
        '<div style="padding:10px 0;display:flex;justify-content:space-between;align-items:center;">'+
          '<span style="font-size:11px;color:var(--muted);font-family:JetBrains Mono,monospace;">'+(isRu?'7Д ЦЕЛЬ':'7D TARGET')+'</span>'+
          '<span style="font-size:13px;font-weight:600;color:var(--blue);font-family:JetBrains Mono,monospace;">'+forecast.midTerm+'</span>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div class="card" style="margin-bottom:16px;border-color:rgba(0,229,160,.22);background:linear-gradient(180deg,rgba(0,229,160,.055),rgba(15,20,35,.72));">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;"><div class="card-title" style="margin-bottom:0;color:var(--green);">'+(isRu?'МОЁ ДЕЙСТВИЕ':'MY ACTION')+'</div>'+sourceBadgeHTML(forecast.source)+'</div>'+
      '<div id="analysis-action-label" style="font-size:26px;font-weight:800;color:'+col+';line-height:1.15;margin-bottom:8px;">'+trade.actionLabel+'</div>'+
      '<div id="analysis-entry-text" style="font-size:14px;color:var(--text);font-family:JetBrains Mono,monospace;margin-bottom:8px;">'+trade.entryText+'</div>'+
      '<div id="analysis-risk-text" style="font-size:12px;color:#94a3b8;line-height:1.6;margin-bottom:8px;">'+trade.riskText+'</div>'+
      '<div style="font-size:10px;color:var(--muted);font-family:JetBrains Mono,monospace;">'+trade.note+'</div>'+
    '</div>'+
    '<div class="card" style="margin-bottom:16px;">'+
      '<div class="card-title" style="color:#a78bfa;">'+(isRu?'ИИ АНАЛИЗ':'AI REASONING')+'</div>'+
      '<p style="font-size:13px;color:#94a3b8;line-height:1.7;">'+escapeHtml(forecast.reasoning)+'</p>'+
    '</div>'+
    '<div class="card">'+
      '<div class="card-title">'+(isRu?'КЛЮЧЕВЫЕ ФАКТОРЫ':'KEY FACTORS')+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
      forecast.factors.map(function(f){return '<div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:7px;padding:8px 14px;color:#93c5fd;font-size:12px;font-family:JetBrains Mono,monospace;">◆ '+f+'</div>';}).join('')+
      '</div>'+
    '</div>';
  lastAnalysisForecast = forecast;
  lastAnalysisAsset = assetId;
  lastAnalysisRenderedLang = appLang;
  analysisLoadingNow = false;
}

function updateActiveAnalysisLive(){
  try{
    if(!g('page-analysis') || !g('page-analysis').classList.contains('active') || !currentAnalysisAsset) return;
    var d=liveData[currentAnalysisAsset]||{};
    var priceEl=g('analysis-live-price');
    var chgEl=g('analysis-live-change');
    if(priceEl && d.price) priceEl.textContent = fmtPrice(d.price);
    if(chgEl){
      var ch=parseFloat(d.change24h||0);
      chgEl.textContent = fmtChg(ch)+' 24H';
      chgEl.className = chgClass(ch);
    }
    if(!analysisLoadingNow && lastAnalysisForecast && lastAnalysisAsset===currentAnalysisAsset){
      var trade=buildTradeDecision(currentAnalysisAsset,Object.assign({}, lastAnalysisForecast));
      var actionEl=g('analysis-action-label'), entryEl=g('analysis-entry-text'), riskEl=g('analysis-risk-text');
      if(actionEl) actionEl.textContent=trade.actionLabel;
      if(entryEl) entryEl.textContent=trade.entryText;
      if(riskEl) riskEl.textContent=trade.riskText;
    }
    // Refresh full Groq/fallback analysis periodically so probabilities and reasoning follow live prices.
    if(!analysisLoadingNow && Date.now()-analysisLastReloadAt>60000){
      loadAnalysis(currentAnalysisAsset);
    }
  }catch(e){console.warn('updateActiveAnalysisLive:',e.message);}
}

function refreshUI(){
  renderDashboard();
  if(g('page-news').classList.contains('active'))renderNews();
  if(g('page-alerts').classList.contains('active'))renderAlerts();
  updateActiveAnalysisLive();
}

// Responsive mobile nav - wait for DOM
document.addEventListener('DOMContentLoaded', function(){
  var mn = g('mobile-nav');
  if(mn && window.innerWidth<=768) mn.style.display='flex';
  window.addEventListener('resize',function(){
    var mn2 = g('mobile-nav');
    if(mn2) mn2.style.display=window.innerWidth<=768?'flex':'none';
  });
});

// Mobile nav buttons
// Mobile nav already handled by onclick in HTML


var TV_SYMBOLS = {
  BTC:'BINANCE:BTCUSDT', ETH:'BINANCE:ETHUSDT', SOL:'BINANCE:SOLUSDT', XRP:'BINANCE:XRPUSDT', SUI:'BINANCE:SUIUSDT', AVAX:'BINANCE:AVAXUSDT',
  XAU:'OANDA:XAUUSD', XAG:'OANDA:XAGUSD',
  EUR:'OANDA:EURUSD', GBP:'OANDA:GBPUSD',
  DXY:'TVC:DXY', NDX:'NASDAQ:NDX', SPX:'SP:SPX'
};
var currentChartAsset = 'BTC';
var currentChartTF = 'D';

// ── CHARTS PAGE ──
function initChartChips(){
  var el = g('chart-chips'); if(!el) return;
  el.innerHTML = ASSETS.map(function(a){
    return '<button class="chip'+(a.id===currentChartAsset?' active':'')+
      '" onclick="selectChartAsset(\''+a.id+'\')">'+a.id+'</button>';
  }).join('');
}

function selectChartAsset(id){
  currentChartAsset = id;
  document.querySelectorAll('#chart-chips .chip').forEach(function(c,i){
    c.classList.toggle('active', ASSETS[i] && ASSETS[i].id === id);
  });
  loadTVChart();
  loadLevels(id);
  renderCorrelations();
}

function setChartTF(tf){
  currentChartTF = tf;
  ['D','W','60','240'].forEach(function(t){
    var btn = g('ctf-'+t);
    if(btn) btn.classList.toggle('active', t===tf);
  });
  loadTVChart();
}

function loadTVChart(){
  var container = g('tv-widget-container');
  if(!container) return;
  var sym = TV_SYMBOLS[currentChartAsset] || 'BINANCE:BTCUSDT';
  var locale = appLang === 'ru' ? 'ru' : 'en';
  container.innerHTML = '';
  var iframe = document.createElement('iframe');
  iframe.src = 'https://s.tradingview.com/widgetembed/?frameElementId=tv_chart'+
    '&symbol='+encodeURIComponent(sym)+
    '&interval='+currentChartTF+
    '&theme=dark'+
    '&style=1'+
    '&locale='+locale+
    '&toolbar_bg=%230c1220'+
    '&enable_publishing=0'+
    '&hide_top_toolbar=0'+
    '&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FBB%40tv-basicstudies'+
    '&withdateranges=1'+
    '&hideideas=1'+
    '&saveimage_showing=0';
  iframe.style.cssText = 'width:100%;height:460px;border:none;display:block;';
  iframe.title = 'TradingView Chart';
  container.appendChild(iframe);
}

async function loadLevels(assetId){
  var el = g('levels-content'); if(!el) return;
  var isRu = appLang === 'ru';
  var d = liveData[assetId] || {};
  if(!d.price){
    el.innerHTML = '<div class="loading-state" style="padding:20px;"><div class="ld-spin"></div></div>';
    return;
  }
  el.innerHTML = '<div class="loading-state" style="padding:20px;"><div class="ld-spin"></div><div class="loading-sub" style="margin-top:8px;">'+t('calcLevels')+'</div></div>';

  var price = parseFloat(d.price);
  var sys = isRu
    ? 'Финансовый аналитик. Рассчитай уровни поддержки и сопротивления. Отвечай ТОЛЬКО JSON без markdown.'
    : 'Financial analyst. Calculate support and resistance levels. Respond ONLY with valid JSON, no markdown.';
  var ctx = getMarketContext();
  var usr = (isRu ? 'Актив: ' : 'Asset: ') + assetId +
    (isRu ? ' Текущая цена: $' : ' Current price: $') + price.toFixed(2) +
    ' | ' + ctx +
    (isRu
      ? '\nРассчитай 3 уровня поддержки и 3 уровня сопротивления на основе цены и рыночного контекста. JSON: {"support":[{"price":0,"strength":"strong/medium/weak","note":"описание"}],"resistance":[{"price":0,"strength":"strong/medium/weak","note":"описание"}]}'
      : '\nCalculate 3 support and 3 resistance levels based on price and market context. JSON: {"support":[{"price":0,"strength":"strong/medium/weak","note":"description"}],"resistance":[{"price":0,"strength":"strong/medium/weak","note":"description"}]}');
  try{
    var res = await callGroq(sys, usr, 500);
    var clean = res.replace(/```json|```/g,'').trim();
    var m = clean.match(/{[\s\S]*}/);
    if(!m) throw new Error('No JSON');
    var data = JSON.parse(m[0]);
    var strColor = {strong:'var(--green)', medium:'var(--gold)', weak:'var(--muted)'};
    var html = '';
    if(data.resistance){
      data.resistance.slice(0,3).reverse().forEach(function(lv){
        html += '<div class="level-row resistance">'+
          '<div><div style="font-size:11px;color:var(--red);font-family:JetBrains Mono,monospace;margin-bottom:2px;">'+t('resLevel')+'</div>'+
          '<div style="font-size:11px;color:var(--muted);">'+lv.note+'</div></div>'+
          '<div style="text-align:right;"><div style="font-size:15px;font-weight:700;font-family:JetBrains Mono,monospace;color:var(--red);">$'+parseFloat(lv.price).toLocaleString()+'</div>'+
          '<div style="font-size:10px;color:'+(strColor[lv.strength]||'var(--muted)')+';">'+lv.strength+'</div></div></div>';
      });
    }
    html += '<div style="padding:8px 12px;text-align:center;font-size:11px;color:var(--muted);font-family:JetBrains Mono,monospace;">— $'+price.toLocaleString()+' —</div>';
    if(data.support){
      data.support.slice(0,3).forEach(function(lv){
        html += '<div class="level-row support">'+
          '<div><div style="font-size:11px;color:var(--green);font-family:JetBrains Mono,monospace;margin-bottom:2px;">'+t('suppLevel')+'</div>'+
          '<div style="font-size:11px;color:var(--muted);">'+lv.note+'</div></div>'+
          '<div style="text-align:right;"><div style="font-size:15px;font-weight:700;font-family:JetBrains Mono,monospace;color:var(--green);">$'+parseFloat(lv.price).toLocaleString()+'</div>'+
          '<div style="font-size:10px;color:'+(strColor[lv.strength]||'var(--muted)')+';">'+lv.strength+'</div></div></div>';
      });
    }
    el.innerHTML = html;
  }catch(e){
    console.warn('Levels:',e.message);
    var data = buildFallbackLevels(assetId);
    if(!data){
      el.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--muted);text-align:center;">'+(isRu?'Нет данных цены':'No price data')+'</div>';
      return;
    }
    var strColor = {strong:'var(--green)', medium:'var(--gold)', weak:'var(--muted)'};
    var html = '<div style="font-size:10px;color:var(--gold);font-family:JetBrains Mono,monospace;margin-bottom:8px;">'+(isRu?'Резервный расчёт без Groq':'Fallback calculation without Groq')+'</div>';
    data.resistance.slice(0,3).reverse().forEach(function(lv){
      html += '<div class="level-row resistance"><div><div style="font-size:11px;color:var(--red);font-family:JetBrains Mono,monospace;margin-bottom:2px;">'+t('resLevel')+'</div><div style="font-size:11px;color:var(--muted);">'+lv.note+'</div></div><div style="text-align:right;"><div style="font-size:15px;font-weight:700;font-family:JetBrains Mono,monospace;color:var(--red);">$'+parseFloat(lv.price).toLocaleString()+'</div><div style="font-size:10px;color:'+(strColor[lv.strength]||'var(--muted)')+';">'+lv.strength+'</div></div></div>';
    });
    html += '<div style="padding:8px 12px;text-align:center;font-size:11px;color:var(--muted);font-family:JetBrains Mono,monospace;">— $'+price.toLocaleString()+' —</div>';
    data.support.slice(0,3).forEach(function(lv){
      html += '<div class="level-row support"><div><div style="font-size:11px;color:var(--green);font-family:JetBrains Mono,monospace;margin-bottom:2px;">'+t('suppLevel')+'</div><div style="font-size:11px;color:var(--muted);">'+lv.note+'</div></div><div style="text-align:right;"><div style="font-size:15px;font-weight:700;font-family:JetBrains Mono,monospace;color:var(--green);">$'+parseFloat(lv.price).toLocaleString()+'</div><div style="font-size:10px;color:'+(strColor[lv.strength]||'var(--muted)')+';">'+lv.strength+'</div></div></div>';
    });
    el.innerHTML = html;
  }
}

function renderCorrelations(){
  var el = g('corr-content'); if(!el) return;
  var isRu = appLang === 'ru';
  // Calculate simple correlations based on 24h changes
  var pairs = [
    {a:'BTC', b:'ETH', label:'BTC ↔ ETH'},
    {a:'BTC', b:'DXY', label:'BTC ↔ DXY'},
    {a:'BTC', b:'NDX', label:'BTC ↔ NASDAQ'},
    {a:'XAU', b:'DXY', label:'Gold ↔ DXY'},
    {a:'XAU', b:'BTC', label:'Gold ↔ BTC'},
    {a:'ETH', b:'NDX', label:'ETH ↔ NASDAQ'},
  ];
  var html = '';
  pairs.forEach(function(pair){
    var da = liveData[pair.a];
    var db = liveData[pair.b];
    if(!da||!db||!da.change24h||!db.change24h){ return; }
    var ca = parseFloat(da.change24h);
    var cb = parseFloat(db.change24h);
    // Simple correlation: same direction = positive
    var corr = (ca*cb > 0) ? Math.min(Math.abs(ca+cb)/Math.max(Math.abs(ca),Math.abs(cb),1),1) : -Math.min(Math.abs(ca-cb)/Math.max(Math.abs(ca),Math.abs(cb),1),1);
    corr = Math.max(-1, Math.min(1, corr));
    var pct = Math.round(Math.abs(corr)*100);
    var color = corr > 0.3 ? 'var(--green)' : corr < -0.3 ? 'var(--red)' : 'var(--gold)';
    var label2 = corr > 0.3 ? t('positive') : corr < -0.3 ? t('negative') : t('neutral');
    html += '<div class="corr-row">'+
      '<div><div style="font-size:12px;color:var(--text);font-family:JetBrains Mono,monospace;">'+pair.label+'</div>'+
      '<div style="font-size:10px;color:'+color+';">'+label2+'</div></div>'+
      '<div style="display:flex;align-items:center;gap:8px;">'+
      '<div class="corr-bar-wrap"><div class="corr-bar-fill" style="width:'+pct+'%;background:'+color+';"></div></div>'+
      '<span style="font-size:12px;font-weight:600;color:'+color+';font-family:JetBrains Mono,monospace;width:36px;text-align:right;">'+( corr>0?'+':'')+Math.round(corr*100)+'%</span>'+
      '</div></div>';
  });
  el.innerHTML = html || '<div style="font-size:12px;color:var(--muted);padding:12px;text-align:center;">'+(isRu?'Загружаю данные...':'Loading data...')+'</div>';
}
// Indices and metals fetched in startApp() after login


// ---- extracted inline script block 29 ----
// ═══════════════════════════════════════════════════════
// ZYNQEL DERIVATIVES & MARKET STRUCTURE LAYER
// Adds Open Interest, Funding, Liquidations proxy, Order Book Imbalance,
// BTC Dominance, Fear & Greed and SPX/DXY correlation.
// Non-conflict design: only adjusts forecast when real data exists.
// ═══════════════════════════════════════════════════════
(function(){
  window.ZYNQEL_DERIVATIVES = {
    enabled: true,
    symbols: {
      BTC:'BTCUSDT', ETH:'ETHUSDT', SOL:'SOLUSDT', XRP:'XRPUSDT', SUI:'SUIUSDT', AVAX:'AVAXUSDT'
    },
    data: window.ZYNQEL_DERIVATIVES && window.ZYNQEL_DERIVATIVES.data ? window.ZYNQEL_DERIVATIVES.data : {},
    minScoreToAdjust: 8,
    strongScore: 18
  };

  function num(x, fb){
    if(typeof x === 'string') x = Number(x.replace(/[$,%\s,]/g,''));
    else x = Number(x);
    return Number.isFinite(x) ? x : (fb === undefined ? null : fb);
  }
  function ru(){ return window.appLang === 'ru'; }
  function isCrypto(asset){ return !!window.ZYNQEL_DERIVATIVES.symbols[asset]; }
  function ld(id){ return window.liveData && window.liveData[id] ? window.liveData[id] : {}; }
  function ch(id){ return num(ld(id).change24h, 0); }

  async function j(url){
    var r = await fetch(url);
    if(!r.ok) throw new Error('http '+r.status);
    return await r.json();
  }

  async function fetchBinanceDerivatives(asset){
    var symbol = window.ZYNQEL_DERIVATIVES.symbols[asset];
    if(!symbol) return null;

    var out = window.ZYNQEL_DERIVATIVES.data[asset] || {};
    out.asset = asset;
    out.symbol = symbol;
    out.ts = Date.now();

    // Funding
    try{
      var prem = await j('https://fapi.binance.com/fapi/v1/premiumIndex?symbol='+symbol);
      out.markPrice = num(prem.markPrice, null);
      out.indexPrice = num(prem.indexPrice, null);
      out.lastFundingRate = num(prem.lastFundingRate, null);
      out.nextFundingTime = prem.nextFundingTime || null;
    }catch(e){ out.fundingError = e.message; }

    // Open Interest
    try{
      var oi = await j('https://fapi.binance.com/fapi/v1/openInterest?symbol='+symbol);
      var oldOi = num(out.openInterest, null);
      out.openInterest = num(oi.openInterest, null);
      out.openInterestChange = oldOi && out.openInterest ? ((out.openInterest-oldOi)/oldOi*100) : null;
    }catch(e){ out.oiError = e.message; }

    // Ticker volume / price context
    try{
      var ticker = await j('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol='+symbol);
      out.futuresChange24h = num(ticker.priceChangePercent, null);
      out.futuresVolume = num(ticker.quoteVolume, null);
      out.futuresLastPrice = num(ticker.lastPrice, null);
    }catch(e){ out.tickerError = e.message; }

    // Order book imbalance
    try{
      var depth = await j('https://fapi.binance.com/fapi/v1/depth?symbol='+symbol+'&limit=20');
      var bidNotional = (depth.bids || []).reduce(function(s,b){ return s + num(b[0],0)*num(b[1],0); },0);
      var askNotional = (depth.asks || []).reduce(function(s,a){ return s + num(a[0],0)*num(a[1],0); },0);
      out.bidNotional = bidNotional;
      out.askNotional = askNotional;
      out.orderBookImbalance = (bidNotional+askNotional) > 0 ? ((bidNotional-askNotional)/(bidNotional+askNotional)*100) : null;
    }catch(e){ out.depthError = e.message; }

    // Liquidation proxy: Binance public endpoint is not ideal for aggregated history without streams.
    // We use recent taker long/short ratio + aggressive price move as proxy, not fake liquidations.
    try{
      var ratio = await j('https://fapi.binance.com/futures/data/takerlongshortRatio?symbol='+symbol+'&period=5m&limit=12');
      var last = ratio && ratio.length ? ratio[ratio.length-1] : null;
      out.takerBuySellRatio = last ? num(last.buySellRatio, null) : null;
      out.takerBuyVol = last ? num(last.buyVol, null) : null;
      out.takerSellVol = last ? num(last.sellVol, null) : null;
    }catch(e){ out.takerError = e.message; }

    window.ZYNQEL_DERIVATIVES.data[asset] = out;
    return out;
  }

  async function fetchBtcDominance(){
    try{
      var cg = await j('/api/coingecko?endpoint=global');
      var dom = cg && cg.data && cg.data.market_cap_percentage ? num(cg.data.market_cap_percentage.btc, null) : null;
      var old = num(window.ZYNQEL_DERIVATIVES.btcDominance, null);
      window.ZYNQEL_DERIVATIVES.btcDominance = dom;
      window.ZYNQEL_DERIVATIVES.btcDominanceChange = old && dom ? dom - old : null;
      window.ZYNQEL_DERIVATIVES.btcDominanceTs = Date.now();
    }catch(e){
      window.ZYNQEL_DERIVATIVES.btcDominanceError = e.message;
    }
  }

  window.zynqelFetchDerivativesLayer = async function(){
    try{
      var assets = Object.keys(window.ZYNQEL_DERIVATIVES.symbols);
      for(var i=0;i<assets.length;i++){
        fetchBinanceDerivatives(assets[i]);
      }
      fetchBtcDominance();
    }catch(e){ console.warn('Derivatives layer fetch failed:', e.message); }
  };

  function correlationHint(asset){
    var assetCh = ch(asset);
    var spx = ch('SPX');
    var ndx = ch('NDX');
    var dxy = ch('DXY');
    var btc = ch('BTC');

    var score = 0, reasons = [];

    if(isCrypto(asset)){
      if(btc < -1.5){ score -= 8; reasons.push('BTC weak correlation pressure'); }
      if(btc > 1.5){ score += 8; reasons.push('BTC strong correlation support'); }
      if(ndx < -0.9 || spx < -0.7){ score -= 6; reasons.push('equity risk-off correlation'); }
      if(ndx > 0.9 || spx > 0.7){ score += 5; reasons.push('equity risk-on support'); }
      if(dxy > 0.35){ score -= 6; reasons.push('DXY pressure'); }
      if(dxy < -0.35){ score += 5; reasons.push('DXY weakness'); }
    } else {
      if(dxy > 0.35){ score -= 4; reasons.push('DXY strong'); }
      if(dxy < -0.35){ score += 4; reasons.push('DXY weak'); }
    }

    return {score:score, reasons:reasons, snapshot:{asset24h:assetCh, btc24h:btc, spx24h:spx, ndx24h:ndx, dxy24h:dxy}};
  }

  window.zynqelDerivativesSignal = function(asset){
    var d = window.ZYNQEL_DERIVATIVES.data[asset] || {};
    var corr = correlationHint(asset);
    var score = corr.score;
    var reasons = [].concat(corr.reasons);
    var ready = false;

    if(isCrypto(asset)){
      if(num(d.openInterest, null) !== null){ ready = true; }
      if(num(d.lastFundingRate, null) !== null){ ready = true; }
      if(num(d.orderBookImbalance, null) !== null){ ready = true; }

      var oiCh = num(d.openInterestChange, 0);
      var funding = num(d.lastFundingRate, null);
      var obi = num(d.orderBookImbalance, null);
      var taker = num(d.takerBuySellRatio, null);
      var priceCh = num(d.futuresChange24h, ch(asset));

      // OI + price logic
      if(oiCh > 1.2 && priceCh > 0.5){ score += 8; reasons.push('OI rising with price'); }
      if(oiCh > 1.2 && priceCh < -0.5){ score -= 8; reasons.push('OI rising into selloff'); }
      if(oiCh < -1.2 && priceCh < -0.5){ score -= 4; reasons.push('OI flush during selloff'); }
      if(oiCh < -1.2 && priceCh > 0.5){ score += 4; reasons.push('short squeeze / OI flush up'); }

      // Funding
      if(funding !== null){
        if(funding > 0.00025 && priceCh < 0){ score -= 7; reasons.push('positive funding while price weak'); }
        else if(funding > 0.00025){ score -= 3; reasons.push('crowded longs funding'); }
        if(funding < -0.00015 && priceCh > 0){ score += 6; reasons.push('negative funding with price strength'); }
        else if(funding < -0.00015){ score += 2; reasons.push('short-heavy funding'); }
      }

      // Order book imbalance
      if(obi !== null){
        if(obi > 12){ score += 6; reasons.push('bid imbalance'); }
        if(obi < -12){ score -= 6; reasons.push('ask imbalance'); }
      }

      // Taker flow proxy
      if(taker !== null){
        if(taker > 1.15){ score += 4; reasons.push('taker buy pressure'); }
        if(taker < 0.85){ score -= 4; reasons.push('taker sell pressure'); }
      }

      // BTC dominance
      var domCh = num(window.ZYNQEL_DERIVATIVES.btcDominanceChange, 0);
      if(asset !== 'BTC' && domCh > 0.15){ score -= 4; reasons.push('BTC dominance rising pressures alts'); }
      if(asset !== 'BTC' && domCh < -0.15){ score += 4; reasons.push('BTC dominance falling supports alts'); }
    } else {
      ready = true; // non-crypto still gets correlation/F&G layer
    }

    // Fear & Greed
    var fg = num(window.fearGreed, 50);
    if(isCrypto(asset)){
      if(fg < 25){ score -= 4; reasons.push('Fear & Greed extreme fear'); }
      if(fg > 75){ score += 3; reasons.push('Fear & Greed greed/risk appetite'); }
    }

    var direction = score >= 8 ? 'bullish' : score <= -8 ? 'bearish' : 'neutral';
    var strength = Math.abs(score) >= 18 ? 'strong' : Math.abs(score) >= 8 ? 'medium' : 'low';

    return {
      ready:ready,
      asset:asset,
      score:Math.max(-35, Math.min(35, Math.round(score))),
      direction:direction,
      strength:strength,
      reasons:reasons.slice(0,8),
      derivatives:d,
      btcDominance:window.ZYNQEL_DERIVATIVES.btcDominance || null,
      btcDominanceChange:window.ZYNQEL_DERIVATIVES.btcDominanceChange || null,
      fearGreed:fg
    };
  };

  function applyDerivativesLayer(asset, forecast){
    if(!window.ZYNQEL_DERIVATIVES.enabled || !forecast) return forecast;

    var s = window.zynqelDerivativesSignal(asset);
    forecast.derivativesSignal = s;
    forecast.factors = forecast.factors || [];
    forecast.factors.unshift('Derivatives/MS: '+s.direction+' '+s.score);

    forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning);
    if(s.ready && Math.abs(s.score) >= window.ZYNQEL_DERIVATIVES.minScoreToAdjust){
      forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(
        ru()
          ? ('Derivatives/Market Structure: '+s.direction+' '+s.score+'. Причины: '+(s.reasons.join('; ') || 'нет сильных сигналов')+'.')
          : ('Derivatives/Market Structure: '+s.direction+' '+s.score+'. Reasons: '+(s.reasons.join('; ') || 'no strong signals')+'.')
      );
    }

    // Conservative adjustment:
    // - strong bearish can block BUY or turn weak WAIT into SELL
    // - strong bullish can block SELL or turn weak WAIT into BUY
    // - does not override high-confidence opposite signal unless very strong
    var action = String(forecast.action || 'wait').toLowerCase();
    var conf = num(forecast.confidence, 55);
    var prob = num(forecast.probability, 50);

    if(s.ready && s.score <= -window.ZYNQEL_DERIVATIVES.strongScore){
      if(action === 'buy'){
        forecast.preDerivativesAction = 'buy';
        forecast.action = 'wait';
        forecast.sentiment = 'neutral';
        forecast.confidence = Math.max(45, Math.min(conf - 12, 64));
        forecast.probability = Math.min(prob, 54);
        forecast.upwardProbability = forecast.probability;
        forecast.waitFor = ru()
          ? 'Деривативы против лонга: дождаться стабилизации OI/funding/order book'
          : 'Derivatives against long: wait for OI/funding/order book stabilization';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
          ? 'BUY заблокирован: деривативы/стакан показывают давление продавцов.'
          : 'BUY blocked: derivatives/order book show seller pressure.');
      } else if(action === 'wait' && conf < 66){
        forecast.action = 'sell';
        forecast.sentiment = 'bearish';
        forecast.confidence = Math.max(61, Math.min(74, 58 + Math.abs(s.score)));
        forecast.probability = Math.max(22, Math.min(43, 100 - forecast.confidence));
        forecast.upwardProbability = forecast.probability;
        forecast.waitFor = ru()
          ? 'Подтверждение продаж: цена ниже EMA9/EMA21 и давление в стакане сохраняется'
          : 'Sell confirmation: price below EMA9/EMA21 and order book pressure persists';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
          ? 'SELL включён деривативным слоем: сильное давление продавцов.'
          : 'SELL activated by derivatives layer: strong seller pressure.');
      }
      forecast.source = (forecast.source || 'V7') + ' + DERIVATIVES';
    }

    if(s.ready && s.score >= window.ZYNQEL_DERIVATIVES.strongScore){
      if(action === 'sell'){
        forecast.preDerivativesAction = 'sell';
        forecast.action = 'wait';
        forecast.sentiment = 'neutral';
        forecast.confidence = Math.max(45, Math.min(conf - 12, 64));
        forecast.probability = Math.max(prob, 50);
        forecast.upwardProbability = forecast.probability;
        forecast.waitFor = ru()
          ? 'Деривативы против шорта: дождаться ослабления bid pressure/funding'
          : 'Derivatives against short: wait for bid pressure/funding to weaken';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
          ? 'SELL заблокирован: деривативы/стакан показывают давление покупателей.'
          : 'SELL blocked: derivatives/order book show buyer pressure.');
      } else if(action === 'wait' && conf < 66){
        forecast.action = 'buy';
        forecast.sentiment = 'bullish';
        forecast.confidence = Math.max(61, Math.min(74, 58 + Math.abs(s.score)));
        forecast.probability = Math.max(57, Math.min(78, forecast.confidence));
        forecast.upwardProbability = forecast.probability;
        forecast.waitFor = ru()
          ? 'Подтверждение покупки: цена выше EMA9/EMA21 и bid pressure сохраняется'
          : 'Buy confirmation: price above EMA9/EMA21 and bid pressure persists';
        forecast.reasoning = window.zynqelEnsureReasoningArray(forecast.reasoning); forecast.reasoning.unshift(ru()
          ? 'BUY включён деривативным слоем: сильное давление покупателей.'
          : 'BUY activated by derivatives layer: strong buyer pressure.');
      }
      forecast.source = (forecast.source || 'V7') + ' + DERIVATIVES';
    }

    return forecast;
  }

  window.zynqelApplyDerivativesLayer = applyDerivativesLayer;

  if(typeof window.generateForecast === 'function' && !window.generateForecast.__derivativesLayer){
    var oldGenerate = window.generateForecast;
    window.generateForecast = async function(assetId, opts){
      assetId = assetId || window.currentAnalysisAsset || window.currentAsset || 'BTC';
      try{ if(isCrypto(assetId)) await fetchBinanceDerivatives(assetId); }catch(e){}
      var out = await oldGenerate.apply(this, arguments);
      try{ out = applyDerivativesLayer(assetId, out); }catch(e){ console.warn('Derivatives layer failed:', e.message); }
      return out;
    };
    window.generateForecast.__derivativesLayer = true;
  }

  if(typeof window.normalizeForecast === 'function' && !window.normalizeForecast.__derivativesLayer){
    var oldNormalize = window.normalizeForecast;
    window.normalizeForecast = function(assetId, forecast){
      var out = oldNormalize.apply(this, arguments);
      try{ out = applyDerivativesLayer(assetId, out); }catch(e){}
      return out;
    };
    window.normalizeForecast.__derivativesLayer = true;
  }

  function injectDerivativesCard(){
    try{
      var page = document.getElementById('page-analysis');
      if(page && !page.classList.contains('active')) return;
      var asset = window.currentAnalysisAsset || window.currentAsset;
      if(!asset || typeof window.zynqelDerivativesSignal !== 'function') return;
      var s = window.zynqelDerivativesSignal(asset);
      if(!s.ready) return;

      var root = document.getElementById('analysis-content');
      if(!root) return;

      var old = document.getElementById('zynqel-derivatives-card');
      if(old && old.parentNode) old.parentNode.removeChild(old);

      var color = s.direction === 'bullish' ? 'var(--green)' : s.direction === 'bearish' ? 'var(--red)' : 'var(--gold)';
      var title = ru() ? 'ДЕРИВАТИВЫ / СТРУКТУРА РЫНКА' : 'DERIVATIVES / MARKET STRUCTURE';
      var reasons = (s.reasons || []).slice(0,4).join(' • ') || (ru() ? 'нет сильного сигнала' : 'no strong signal');
      var html = '<div id="zynqel-derivatives-card" class="card" style="margin-bottom:12px;border-color:'+color+'33;background:rgba(255,255,255,.025);">' +
        '<div class="card-title" style="margin-bottom:8px;">'+title+'</div>' +
        '<div style="font-family:JetBrains Mono,monospace;font-size:22px;font-weight:800;color:'+color+';">'+s.direction.toUpperCase()+' '+s.score+'</div>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.45;">'+reasons+'</div>' +
      '</div>';

      var early = document.getElementById('zynqel-early-move-card');
      var market = document.getElementById('zynqel-market-risk-card');
      if(early) early.insertAdjacentHTML('afterend', html);
      else if(market) market.insertAdjacentHTML('afterend', html);
      else {
        var firstCard = root.querySelector('.card');
        if(firstCard) firstCard.insertAdjacentHTML('beforebegin', html);
        else root.insertAdjacentHTML('afterbegin', html);
      }
    }catch(e){}
  }

  setTimeout(window.zynqelFetchDerivativesLayer, 1500);
  setInterval(window.zynqelFetchDerivativesLayer, 60000);
  setInterval(injectDerivativesCard, 2500);
})();


(function(){
  if(window.__ZYNQEL_CANDLE_STATUS_POST_RENDER__) return;
  window.__ZYNQEL_CANDLE_STATUS_POST_RENDER__ = true;
  function show(){
    try{
      var asset=window.currentAnalysisAsset||window.currentAsset; if(!asset||typeof zynqelCandleDataStatus!=='function')return;
      var st=zynqelCandleDataStatus(asset); var root=document.getElementById('analysis-content')||document.getElementById('page-analysis'); if(!root)return;
      var line=document.getElementById('zynqel-candle-status-line');
      if(!line){ line=document.createElement('div'); line.id='zynqel-candle-status-line'; line.style.cssText='font-family:JetBrains Mono,monospace;font-size:10px;color:var(--muted);margin:6px 0 10px;'; var chips=document.getElementById('analysis-chips'); if(chips&&chips.parentNode)chips.parentNode.insertBefore(line,chips.nextSibling); else root.insertBefore(line,root.firstChild); }
      if(st.ok){ line.textContent='CANDLES: 15m / 1h / 4h / 1d OK'; line.style.color='var(--green)'; }
      else{ line.textContent=st.syncing ? 'CANDLES: syncing 15m / 1h / 4h / 1d...' : 'CANDLES CHECK: missing '+(st.missing.join(',')||'none')+' · stale '+(st.stale.join(',')||'none'); line.style.color='var(--gold)'; }
    }catch(e){}
  }
  document.addEventListener('DOMContentLoaded',show); setTimeout(show,800); setInterval(show,3000);
})();
