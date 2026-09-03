/* Sakura Trip Companion loader v9 */
(function loadSakuraTripCompanion(){
  'use strict';
  if(window.__sakuraTripCompanionLoadingV9)return;
  window.__sakuraTripCompanionLoadingV9=true;

  const refreshSakuTalkV3=()=>{
    const api=window.SakuraInterpreter;
    if(api?.version>=3){
      try{api.setDirection?.(api.getDirection?.()||'english-to-japanese',{clear:false});}catch{}
    }
    document.querySelectorAll('.sakura-interpreter-launch small').forEach(note=>{
      note.textContent='Japanese ↔ English · voice · meaning check';
    });
    document.querySelectorAll('#travel-view .sakura-travel-interpreter-card p').forEach(note=>{
      note.textContent='Japanese ↔ English · Travel preset';
    });
  };

  const assets=[
    ['./features/sakura-travel-interpreter.js?v=10','sakura-sakutalk-v3'],
    ['./features/sakura-trip-public-default.js?v=1','sakura-trip-public-default'],
    ['./features/sakura-trip-store.js?v=1','sakura-trip-store'],
    ['./features/sakura-trip-companion-ui.js?v=1','sakura-trip-ui'],
    ['./features/sakura-transit-rescue.js?v=2','sakura-transit-rescue'],
    ['./features/sakura-camera-japanese.js?v=1','sakura-camera-japanese'],
    ['./features/sakura-trip-management.js?v=1','sakura-trip-management'],
    ['./features/sakura-trip-live-tools.js?v=1','sakura-trip-live-tools']
  ];

  const load=(src,key)=>new Promise((resolve,reject)=>{
    if((key==='sakura-sakutalk-v3'&&window.SakuraInterpreter?.version>=3)||
       (key==='sakura-trip-public-default'&&window.SakuraTripPublicDefault)||
       (key==='sakura-trip-store'&&window.SakuraTripStore)||
       (key==='sakura-trip-ui'&&window.SakuraTripCompanion?.version>=2)||
       (key==='sakura-transit-rescue'&&window.SakuraTransitRescue?.version>=2)||
       (key==='sakura-camera-japanese'&&window.SakuraCameraJapanese?.version>=1)||
       (key==='sakura-trip-management'&&window.SakuraTripManagement?.version>=1)||
       (key==='sakura-trip-live-tools'&&window.SakuraTripLiveTools?.version>=1)){resolve();return;}

    const existing=document.querySelector(`script[data-${key}]`);
    if(existing){
      if(existing.dataset.loaded==='1'){
        if(key==='sakura-sakutalk-v3')refreshSakuTalkV3();
        resolve();return;
      }
      existing.addEventListener('load',()=>{if(key==='sakura-sakutalk-v3')refreshSakuTalkV3();resolve();},{once:true});
      existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});
      return;
    }

    if(key==='sakura-sakutalk-v3'){
      document.querySelectorAll('script[data-sakura-travel-interpreter]').forEach(script=>{
        if(script.dataset.sakuraTravelInterpreterLoading!=='1')script.remove();
      });
    }

    const script=document.createElement('script');
    script.src=src;
    script.setAttribute(`data-${key}`,'1');
    if(key==='sakura-sakutalk-v3')script.dataset.sakuraTravelInterpreter='1';
    script.onload=()=>{
      script.dataset.loaded='1';
      if(key==='sakura-sakutalk-v3'){
        if(window.SakuraInterpreter?.version<3){reject(new Error('SakuTalk v3 did not initialize.'));return;}
        refreshSakuTalkV3();
        setTimeout(refreshSakuTalkV3,0);
      }
      resolve();
    };
    script.onerror=()=>reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });

  (async()=>{
    try{
      for(const [src,key] of assets){
        await load(src,key);
        if(key==='sakura-trip-store')window.SakuraTripPublicDefault?.patchStore?.();
        if(key==='sakura-trip-ui')window.SakuraTripPublicDefault?.patchUi?.();
      }
      window.SakuraTripCompanion?.ensureLauncher?.();
      window.SakuraTripPublicDefault?.ensureEmptyLauncher?.();
      window.SakuraTripLiveTools?.decorate?.();
      refreshSakuTalkV3();
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshSakuTalkV3,{once:true});
    }catch(error){
      console.warn('Sakura Trip Companion could not fully load. Normal Travel Mode remains available.',error);
    }finally{
      window.__sakuraTripCompanionLoadingV9=false;
    }
  })();
}());
