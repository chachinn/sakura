/* Sakura Trip Companion loader v2 */
(function loadSakuraTripCompanion(){
  'use strict';
  if(window.SakuraTripCompanion?.version>=2)return;
  if(window.__sakuraTripCompanionLoadingV2)return;
  window.__sakuraTripCompanionLoadingV2=true;

  const assets=[
    ['./data/trips/japan-october-2026.js?v=1','sakura-trip-seed'],
    ['./features/sakura-trip-store.js?v=1','sakura-trip-store'],
    ['./features/sakura-trip-companion-ui.js?v=1','sakura-trip-ui']
  ];

  const load=(src,key)=>new Promise((resolve,reject)=>{
    if((key==='sakura-trip-seed'&&window.SAKURA_TRIP_SEED_OCTOBER_2026)||
       (key==='sakura-trip-store'&&window.SakuraTripStore)||
       (key==='sakura-trip-ui'&&window.SakuraTripCompanion?.version>=2)){resolve();return;}
    const existing=document.querySelector(`script[data-${key}]`);
    if(existing){
      if(existing.dataset.loaded==='1'){resolve();return;}
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src;
    script.dataset[key.replace(/^sakura-/,'sakura')]='1';
    script.setAttribute(`data-${key}`,'1');
    script.onload=()=>{script.dataset.loaded='1';resolve();};
    script.onerror=()=>reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });

  (async()=>{
    try{
      for(const [src,key] of assets)await load(src,key);
      window.SakuraTripCompanion?.ensureLauncher?.();
    }catch(error){
      console.warn('Sakura Trip Companion could not load. Normal Travel Mode remains available.',error);
    }finally{
      window.__sakuraTripCompanionLoadingV2=false;
    }
  })();
}());
