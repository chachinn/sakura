/* Sakura Practice Grid Compatibility v7
   Keeps Practice cleanup lightweight, keeps the SakuTalk loader resilient,
   and promotes SakuTalk without touching core navigation. */
(function initializeSakuraPracticeGridCompatibility(){
  'use strict';

  let pendingSakuTalkOpen=false;
  let sakutalkHeaderBound=false;
  const SAKUTALK_CACHE_PREFIX='sakuraSakuTalkCacheV2:';
  const SAKUTALK_CACHE_TTL_MS=30*24*60*60*1000;

  const sakutalkIcon=()=>`
    <svg viewBox="0 0 28 28" width="27" height="27" aria-hidden="true" focusable="false">
      <path d="M6.3 5.4h15.4a2.9 2.9 0 0 1 2.9 2.9v8.1a2.9 2.9 0 0 1-2.9 2.9h-7.3l-4.7 3.2v-3.2H6.3a2.9 2.9 0 0 1-2.9-2.9V8.3a2.9 2.9 0 0 1 2.9-2.9Z"
        fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="14" y="15.8" text-anchor="middle" fill="currentColor"
        font-size="10.5" font-weight="800" font-family="-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif">あ</text>
    </svg>`;

  function cacheHash(value){
    let hash=2166136261;
    const text=String(value||'');
    for(let i=0;i<text.length;i++){
      hash^=text.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36);
  }

  function installSakuTalkFetchCache(){
    if(typeof window.fetch!=='function'||window.fetch.__sakuraSakuTalkCacheV2)return;
    const nativeFetch=window.fetch.bind(window);
    const cachedFetch=async(input,init={})=>{
      const method=String(init?.method||input?.method||'GET').toUpperCase();
      const url=String(typeof input==='string'||input instanceof URL?input:input?.url||'');
      const rawBody=typeof init?.body==='string'?init.body:'';
      if(method!=='POST'||!url.includes('/functions/v1/sakura-ai-translator')||!rawBody){
        return nativeFetch(input,init);
      }

      let payload;
      try{payload=JSON.parse(rawBody)}catch{return nativeFetch(input,init)}
      const isSakuTalk=payload?.natural_interpreter===true||payload?.interpreter_mode==='general'||payload?.response_style==='interpreter-compact';
      if(!isSakuTalk)return nativeFetch(input,init);

      const cacheKey=`${SAKUTALK_CACHE_PREFIX}${cacheHash(rawBody)}`;
      try{
        const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
        if(cached?.savedAt&&Date.now()-cached.savedAt<SAKUTALK_CACHE_TTL_MS&&cached?.body?.recommended?.japanese){
          return new Response(JSON.stringify({...cached.body,cache_hit:true}),{
            status:200,
            headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Sakura-Cache':'hit'}
          });
        }
        if(cached?.savedAt)localStorage.removeItem(cacheKey);
      }catch{}

      const response=await nativeFetch(input,init);
      if(response.ok){
        response.clone().json().then(body=>{
          if(!body?.recommended?.japanese)return;
          try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),body}))}catch{}
        }).catch(()=>{});
      }
      return response;
    };
    cachedFetch.__sakuraSakuTalkCacheV2=true;
    cachedFetch.__sakuraNativeFetch=nativeFetch;
    window.fetch=cachedFetch;
  }

  function ensureCompactTravelStyle(){
    if(document.getElementById('sakura-compact-travel-style'))return;
    const style=document.createElement('style');
    style.id='sakura-compact-travel-style';
    style.textContent=`
      #sakura-interpreter .sakura-interpreter-body{padding-top:10px}
      #sakura-interpreter .sakura-interpreter-card:first-child{gap:8px;padding:12px;margin-bottom:10px}
      #sakura-interpreter .sakura-interpreter-card:first-child>p:first-of-type{display:none}
      #sakura-interpreter .sakura-interpreter-card h3{font-size:15px}
      #sakura-interpreter .sakura-interpreter-input{min-height:88px;padding:12px;font-size:18px}
      #sakura-interpreter .sakura-interpreter-situation{min-height:62px;font-size:15px}
      #sakura-interpreter .sakura-interpreter-helper{display:none}
      #sakura-interpreter .sakura-interpreter-chips{gap:6px;padding-bottom:1px}
      #sakura-interpreter .sakura-interpreter-chip{min-height:34px;padding:6px 10px;font-size:12px}
      #sakura-interpreter .sakura-interpreter-actions{gap:7px}
      #sakura-interpreter .sakura-interpreter-actions button{min-height:48px;font-size:15px}
      #sakura-interpreter .sakura-interpreter-actions .primary{min-height:52px}
      #sakura-interpreter .sakura-interpreter-status:empty{display:none}
      #sakura-interpreter .sakura-result-card{gap:10px;padding:12px}
      #sakura-interpreter .sakura-result-state{min-height:88px;padding:14px}
      #sakura-interpreter .sakura-result-state[hidden]{display:none!important}
      #travel-view .travel-category-grid{gap:8px}
      #travel-view .travel-category-card{min-height:104px;padding:12px;gap:7px;border-radius:16px}
      #travel-view .travel-category-card>span{width:36px;height:36px;border-radius:12px;font-size:20px}
      #travel-view .travel-category-card h2{margin:0 0 2px;font-size:14px;line-height:1.2}
      #travel-view .travel-category-card p{padding-right:14px;font-size:11px;line-height:1.28}
      #travel-view .travel-category-card>b{right:11px;bottom:9px;font-size:17px}
      #travel-view .travel-feature-card{min-height:64px;margin-top:8px;padding:10px 12px;gap:10px;border-radius:16px}
      #travel-view .travel-feature-card>span{width:38px;height:38px;border-radius:12px;font-size:20px}
      #travel-view .travel-feature-card h2{margin:0 0 2px;font-size:15px;line-height:1.2}
      #travel-view .travel-feature-card p{font-size:11px;line-height:1.3}
      #travel-view .travel-feature-card>b{font-size:18px}
      @media(max-width:350px){
        #travel-view .travel-category-card{min-height:98px;padding:11px}
        #travel-view .travel-category-card h2{font-size:13px}
        #travel-view .travel-category-card p{font-size:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function brandInterpreterUi(){
    const title=document.querySelector('#sakura-interpreter .sakura-interpreter-title strong');
    if(title)title.textContent='SakuTalk';
    const firstCard=document.querySelector('#sakura-interpreter .sakura-interpreter-card');
    const headings=firstCard?.querySelectorAll('h3');
    if(headings?.[0])headings[0].textContent='Say it naturally in Japanese';
    if(headings?.[2])headings[2].textContent='Situation / relationship (optional)';
    const launcher=document.querySelector('.sakura-interpreter-launch');
    if(launcher){
      const name=launcher.querySelector('strong');
      const note=launcher.querySelector('small');
      if(name)name.textContent='SakuTalk';
      if(note)note.textContent='Natural Japanese for real conversations · voice · meaning check';
    }
  }

  function ensureSakuTalkHeader(){
    const button=document.getElementById('header-appearance');
    if(!button)return;
    button.dataset.sakutalkHeader='1';
    button.setAttribute('aria-label','Open SakuTalk');
    button.setAttribute('title','SakuTalk');
    button.innerHTML=sakutalkIcon();
    button.style.fontSize='';
    button.style.fontWeight='';
    button.style.letterSpacing='';
    button.style.display='grid';
    button.style.placeItems='center';
    button.style.color='var(--color-text)';
  }

  function ensureTravelInterpreterLaunch(){
    ensureCompactTravelStyle();
    const view=document.getElementById('travel-view');
    const grid=view?.querySelector('.travel-category-grid');
    if(!view||!grid)return;
    let button=view.querySelector('.sakura-travel-interpreter-card');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='travel-feature-card travel-language-others sakura-travel-interpreter-card';
      grid.insertAdjacentElement('beforebegin',button);
    }
    button.dataset.tiOpen='';
    button.dataset.tiPreset='Travel';
    button.innerHTML='<span aria-hidden="true">💬</span><div><h2>SakuTalk</h2><p>Natural Japanese · Travel preset</p></div><b aria-hidden="true">→</b>';
    brandInterpreterUi();
  }

  function afterInterpreterLoad(){
    ensureTravelInterpreterLaunch();
    brandInterpreterUi();
    if(pendingSakuTalkOpen&&window.SakuraInterpreter?.open){
      pendingSakuTalkOpen=false;
      window.SakuraInterpreter.open();
    }
  }

  function loadTravelInterpreter(){
    if(window.SakuraInterpreter||window.SakuraTravelInterpreter){
      afterInterpreterLoad();
      return;
    }

    const existing=document.querySelector('script[data-sakura-travel-interpreter]');
    if(existing?.dataset.sakuraTravelInterpreterLoading==='1'){
      existing.addEventListener('load',afterInterpreterLoad,{once:true});
      return;
    }
    existing?.remove();

    const script=document.createElement('script');
    script.src='./features/sakura-travel-interpreter.js?v=8';
    script.defer=true;
    script.dataset.sakuraTravelInterpreter='1';
    script.dataset.sakuraTravelInterpreterLoading='1';
    script.onload=()=>{
      delete script.dataset.sakuraTravelInterpreterLoading;
      afterInterpreterLoad();
    };
    script.onerror=()=>{
      pendingSakuTalkOpen=false;
      delete script.dataset.sakuraTravelInterpreterLoading;
      script.remove();
      console.warn('SakuTalk could not load. Existing Travel and Translator tools remain available.');
    };
    document.head.appendChild(script);
  }

  function openSakuTalk(){
    if(window.SakuraInterpreter?.open){
      window.SakuraInterpreter.open();
      return;
    }
    if(window.SakuraTravelInterpreter?.open){
      window.SakuraTravelInterpreter.open();
      return;
    }
    pendingSakuTalkOpen=true;
    loadTravelInterpreter();
  }

  function bindSakuTalkHeader(){
    if(sakutalkHeaderBound)return;
    sakutalkHeaderBound=true;
    document.addEventListener('click',event=>{
      const button=event.target.closest?.('#header-appearance[data-sakutalk-header="1"]');
      if(!button)return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openSakuTalk();
    },true);
  }

  // Run these before the compatibility version guard. An older installed PWA
  // shim must not suppress the SakuTalk shortcut, cache, compact Travel CSS, or loader.
  installSakuTalkFetchCache();
  ensureCompactTravelStyle();
  ensureSakuTalkHeader();
  bindSakuTalkHeader();
  loadTravelInterpreter();

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      installSakuTalkFetchCache();
      ensureCompactTravelStyle();
      ensureSakuTalkHeader();
      ensureTravelInterpreterLaunch();
      brandInterpreterUi();
    },{once:true});
  }else{
    installSakuTalkFetchCache();
    ensureTravelInterpreterLaunch();
    ensureSakuTalkHeader();
    brandInterpreterUi();
  }

  if(window.SakuraPracticeGridPolish?.version>=7)return;

  function cleanup(){
    document.getElementById('source-practice-launch')?.remove();
    document.querySelector('#practice-view .practice-coming-grid')?.classList.remove('practice-grid-balanced');
  }

  window.SakuraPracticeGridPolish=Object.freeze({
    version:7,
    cleanup,
    ensureTravelInterpreterLaunch,
    ensureSakuTalkHeader,
    openSakuTalk,
    installSakuTalkFetchCache
  });

  if(document.body)cleanup();
  else document.addEventListener('DOMContentLoaded',cleanup,{once:true});
}());
