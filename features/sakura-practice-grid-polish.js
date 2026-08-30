/* Sakura Practice Grid Compatibility v5
   Keeps Practice cleanup lightweight, keeps the SakuTalk loader resilient,
   and promotes SakuTalk without touching core navigation. */
(function initializeSakuraPracticeGridCompatibility(){
  'use strict';

  let pendingSakuTalkOpen=false;
  let sakutalkHeaderBound=false;

  const sakutalkIcon=()=>`
    <svg viewBox="0 0 28 28" width="27" height="27" aria-hidden="true" focusable="false">
      <path d="M6.3 5.4h15.4a2.9 2.9 0 0 1 2.9 2.9v8.1a2.9 2.9 0 0 1-2.9 2.9h-7.3l-4.7 3.2v-3.2H6.3a2.9 2.9 0 0 1-2.9-2.9V8.3a2.9 2.9 0 0 1 2.9-2.9Z"
        fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="14" y="15.8" text-anchor="middle" fill="currentColor"
        font-size="10.5" font-weight="800" font-family="-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif">あ</text>
    </svg>`;

  function brandInterpreterUi(){
    const title=document.querySelector('#sakura-interpreter .sakura-interpreter-title strong');
    if(title)title.textContent='SakuTalk';
    const launcher=document.querySelector('.sakura-interpreter-launch');
    if(launcher){
      const name=launcher.querySelector('strong');
      const note=launcher.querySelector('small');
      if(name)name.textContent='SakuTalk';
      if(note)note.textContent='Natural Japanese for real conversations · voice · meaning check · full-screen display';
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
    button.innerHTML='<span aria-hidden="true">💬</span><div><h2>SakuTalk</h2><p>Natural Japanese for real conversations. Opens with Travel context from here.</p></div><b aria-hidden="true">→</b>';
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
    script.src='./features/sakura-travel-interpreter.js?v=6';
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
  // shim must not suppress the SakuTalk header shortcut or interpreter loader.
  ensureSakuTalkHeader();
  bindSakuTalkHeader();
  loadTravelInterpreter();

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      ensureSakuTalkHeader();
      brandInterpreterUi();
    },{once:true});
  }else{
    ensureSakuTalkHeader();
    brandInterpreterUi();
  }

  if(window.SakuraPracticeGridPolish?.version>=5)return;

  function cleanup(){
    document.getElementById('source-practice-launch')?.remove();
    document.querySelector('#practice-view .practice-coming-grid')?.classList.remove('practice-grid-balanced');
  }

  window.SakuraPracticeGridPolish=Object.freeze({
    version:5,
    cleanup,
    ensureTravelInterpreterLaunch,
    ensureSakuTalkHeader,
    openSakuTalk
  });

  if(document.body)cleanup();
  else document.addEventListener('DOMContentLoaded',cleanup,{once:true});
}());
