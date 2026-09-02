/* Sakura Trip Companion loader v7 */
(function loadSakuraTripCompanion(){
  'use strict';
  if(window.__sakuraTripCompanionLoadingV7)return;
  window.__sakuraTripCompanionLoadingV7=true;

  const assets=[
    ['./features/sakura-travel-interpreter.js?v=9','sakura-sakutalk-v3'],
    ['./features/sakura-trip-public-default.js?v=1','sakura-trip-public-default'],
    ['./features/sakura-trip-store.js?v=1','sakura-trip-store'],
    ['./features/sakura-trip-companion-ui.js?v=1','sakura-trip-ui'],
    ['./features/sakura-transit-rescue.js?v=2','sakura-transit-rescue'],
    ['./features/sakura-camera-japanese.js?v=1','sakura-camera-japanese'],
    ['./features/sakura-trip-management.js?v=1','sakura-trip-management']
  ];

  const load=(src,key)=>new Promise((resolve,reject)=>{
    if((key==='sakura-sakutalk-v3'&&window.SakuraInterpreter?.version>=3)||
       (key==='sakura-trip-public-default'&&window.SakuraTripPublicDefault)||
       (key==='sakura-trip-store'&&window.SakuraTripStore)||
       (key==='sakura-trip-ui'&&window.SakuraTripCompanion?.version>=2)||
       (key==='sakura-transit-rescue'&&window.SakuraTransitRescue?.version>=2)||
       (key==='sakura-camera-japanese'&&window.SakuraCameraJapanese?.version>=1)||
       (key==='sakura-trip-management'&&window.SakuraTripManagement?.version>=1)){resolve();return;}
    const existing=document.querySelector(`script[data-${key}]`);
    if(existing){
      if(existing.dataset.loaded==='1'){resolve();return;}
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src;
    script.setAttribute(`data-${key}`,'1');
    script.onload=()=>{script.dataset.loaded='1';resolve();};
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
    }catch(error){
      console.warn('Sakura Trip Companion could not load. Normal Travel Mode remains available.',error);
    }finally{
      window.__sakuraTripCompanionLoadingV7=false;
    }
  })();
}());
