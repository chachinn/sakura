/* Sakura Trip Import Runtime Hotfix v1 — guarantees resilient importer handoff on stale PWA sessions. */
(function initializeSakuraTripImportRuntimeHotfix(){
  'use strict';
  if(window.SakuraTripImportRuntimeHotfix?.version>=1)return;

  let loading=null;
  let repairing=false;
  const root=()=>document.getElementById('sakura-trip-companion');

  function loadSync(){
    if(window.SakuraTripFileSync?.version>=1)return Promise.resolve(window.SakuraTripFileSync);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(script=>/\/features\/sakura-trip-file-sync\.js(?:\?|$)/.test(script.src||''));
      const finish=()=>{
        if(window.SakuraTripFileSync?.version>=1)resolve(window.SakuraTripFileSync);
        else reject(new Error('The resilient itinerary importer did not initialize.'));
      };
      if(existing){
        existing.addEventListener('load',finish,{once:true});
        existing.addEventListener('error',()=>reject(new Error('Could not load the resilient itinerary importer.')),{once:true});
        setTimeout(()=>{if(window.SakuraTripFileSync?.version>=1)resolve(window.SakuraTripFileSync)},0);
        return;
      }
      const script=document.createElement('script');
      script.src='./features/sakura-trip-file-sync.js?v=2';
      script.dataset.sakuraTripFileSync='hotfix';
      script.onload=finish;
      script.onerror=()=>reject(new Error('Could not load the resilient itinerary importer.'));
      document.head.appendChild(script);
    }).finally(()=>{loading=null});
    return loading;
  }

  function fallback(){
    window.SakuraTripFileImport?.showAddMenu?.();
  }

  function openResilientMenu(){
    loadSync().then(api=>api.showAddMenu?.()).catch(error=>{
      console.warn('Sakura resilient itinerary importer handoff failed.',error);
      fallback();
    });
  }

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('#sakura-trip-companion [data-stfi-add]');
    if(!target)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openResilientMenu();
  },true);

  function repairLegacyMenu(){
    if(repairing)return;
    const r=root();
    if(!r)return;
    const legacy=r.querySelector('.stfi-choice');
    if(!legacy||r.querySelector('.stfs-choice'))return;
    repairing=true;
    loadSync().then(api=>api.showAddMenu?.()).catch(()=>{}).finally(()=>{repairing=false});
  }

  const observer=new MutationObserver(()=>queueMicrotask(repairLegacyMenu));
  function init(){
    const r=root();
    if(r)observer.observe(r,{childList:true,subtree:true});
    repairLegacyMenu();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);

  window.SakuraTripImportRuntimeHotfix=Object.freeze({version:1,loadSync,openResilientMenu});
}());
