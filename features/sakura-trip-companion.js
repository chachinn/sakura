/* Sakura Trip Companion loader v21 */
(function loadSakuraTripCompanion(){
  'use strict';
  if(window.__sakuraTripCompanionLoadingV21)return;
  window.__sakuraTripCompanionLoadingV21=true;

  const refreshSakuTalkV3=()=>{
    const api=window.SakuraInterpreter;
    if(api?.version>=3){try{api.setDirection?.(api.getDirection?.()||'english-to-japanese',{clear:false})}catch{}}
    document.querySelectorAll('.sakura-interpreter-launch small').forEach(note=>{note.textContent='Japanese ↔ English · voice · meaning check'});
    document.querySelectorAll('#travel-view .sakura-travel-interpreter-card p').forEach(note=>{note.textContent='Japanese ↔ English · Travel preset'});
  };

  const assets=[
    ['./features/sakura-travel-interpreter.js?v=10','sakura-sakutalk-v3'],
    ['./features/sakura-trip-public-default.js?v=1','sakura-trip-public-default'],
    ['./features/sakura-trip-store.js?v=1','sakura-trip-store'],
    ['./features/sakura-trip-core.js?v=1','sakura-trip-core'],
    ['./features/sakura-trip-store-upgrade.js?v=1','sakura-trip-store-upgrade'],
    ['./features/sakura-trip-companion-ui.js?v=1','sakura-trip-ui'],
    ['./features/sakura-trip-import-hotfix.js?v=1','sakura-trip-import-hotfix'],
    ['./features/sakura-trip-file-import.js?v=1','sakura-trip-file-import'],
    ['./features/sakura-trip-workbook-extras.js?v=1','sakura-trip-workbook-extras'],
    ['./features/sakura-trip-source-persistence.js?v=1','sakura-trip-source-persistence'],
    ['./features/sakura-trip-file-sync.js?v=2','sakura-trip-file-sync'],
    ['./features/sakura-transit-rescue.js?v=2','sakura-transit-rescue'],
    ['./features/sakura-camera-japanese-v2.js?v=1','sakura-camera-japanese-v2'],
    ['./features/sakura-trip-management.js?v=1','sakura-trip-management'],
    ['./features/sakura-trip-management-safe.js?v=1','sakura-trip-management-safe'],
    ['./features/sakura-trip-live-tools.js?v=1','sakura-trip-live-tools'],
    ['./features/sakura-trip-pinned-rail.js?v=1','sakura-trip-pinned-rail'],
    ['./features/sakura-trip-transit-bridge.js?v=1','sakura-trip-transit-bridge'],
    ['./features/sakura-trip-companion-polish.js?v=2','sakura-trip-companion-polish'],
    ['./features/sakura-trip-companion-stabilize-v2.js?v=1','sakura-trip-companion-stabilizer-v2'],
    ['./features/sakura-trip-return-state.js?v=1','sakura-trip-return-state']
  ];

  const ready=key=>
    (key==='sakura-sakutalk-v3'&&window.SakuraInterpreter?.version>=3)||
    (key==='sakura-trip-public-default'&&window.SakuraTripPublicDefault)||
    (key==='sakura-trip-store'&&window.SakuraTripStore)||
    (key==='sakura-trip-core'&&window.SakuraTripCore?.version>=1)||
    (key==='sakura-trip-store-upgrade'&&window.SakuraTripStore?.version>=2)||
    (key==='sakura-trip-ui'&&window.SakuraTripCompanion?.version>=2)||
    (key==='sakura-trip-import-hotfix'&&window.SakuraTripImportRuntimeHotfix?.version>=1)||
    (key==='sakura-trip-file-import'&&window.SakuraTripFileImport?.version>=1)||
    (key==='sakura-trip-workbook-extras'&&window.SakuraTripWorkbookExtras?.version>=1)||
    (key==='sakura-trip-source-persistence'&&window.SakuraTripSourcePersistence?.version>=1)||
    (key==='sakura-trip-file-sync'&&window.SakuraTripFileSync?.version>=1)||
    (key==='sakura-transit-rescue'&&window.SakuraTransitRescue?.version>=2)||
    (key==='sakura-camera-japanese-v2'&&window.SakuraCameraJapanese?.version>=2)||
    (key==='sakura-trip-management'&&window.SakuraTripManagement?.version>=1)||
    (key==='sakura-trip-management-safe'&&window.SakuraTripManagement?.__stabilizerV2===true)||
    (key==='sakura-trip-live-tools'&&window.SakuraTripLiveTools?.version>=1)||
    (key==='sakura-trip-pinned-rail'&&window.SakuraTripPinnedRail?.version>=1)||
    (key==='sakura-trip-transit-bridge'&&window.SakuraTripTransitBridge?.version>=1)||
    (key==='sakura-trip-companion-polish'&&window.SakuraTripCompanionPolish?.version>=2)||
    (key==='sakura-trip-companion-stabilizer-v2'&&window.SakuraTripCompanionStabilizer?.version>=2)||
    (key==='sakura-trip-return-state'&&window.SakuraTripReturnState?.version>=1);

  const load=(src,key)=>new Promise((resolve,reject)=>{
    if(ready(key)){resolve();return}
    const existing=document.querySelector(`script[data-${key}]`);
    if(existing){if(existing.dataset.loaded==='1'){if(key==='sakura-sakutalk-v3')refreshSakuTalkV3();resolve();return}existing.addEventListener('load',()=>{if(key==='sakura-sakutalk-v3')refreshSakuTalkV3();resolve()},{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});return}
    if(key==='sakura-sakutalk-v3')document.querySelectorAll('script[data-sakura-travel-interpreter]').forEach(script=>{if(script.dataset.sakuraTravelInterpreterLoading!=='1')script.remove()});
    const script=document.createElement('script');script.src=src;script.setAttribute(`data-${key}`,'1');if(key==='sakura-sakutalk-v3')script.dataset.sakuraTravelInterpreter='1';
    script.onload=()=>{script.dataset.loaded='1';if(key==='sakura-sakutalk-v3'){if(window.SakuraInterpreter?.version<3){reject(new Error('SakuTalk v3 did not initialize.'));return}refreshSakuTalkV3();setTimeout(refreshSakuTalkV3,0)}resolve()};
    script.onerror=()=>reject(new Error(`Could not load ${src}`));document.head.appendChild(script);
  });

  (async()=>{
    try{
      for(const [src,key] of assets){await load(src,key);if(key==='sakura-trip-store')window.SakuraTripPublicDefault?.patchStore?.();if(key==='sakura-trip-ui')window.SakuraTripPublicDefault?.patchUi?.()}
      window.SakuraTripCompanion?.ensureLauncher?.();window.SakuraTripPublicDefault?.ensureEmptyLauncher?.();window.SakuraTripLiveTools?.decorate?.();window.SakuraTripCompanionPolish?.decorate?.();window.SakuraTripCompanionStabilizer?.decorate?.();refreshSakuTalkV3();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshSakuTalkV3,{once:true});
    }catch(error){console.warn('Sakura Trip Companion could not fully load. Normal Travel Mode remains available.',error)}finally{window.__sakuraTripCompanionLoadingV21=false}
  })();
}());
