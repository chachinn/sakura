/* Sakura Trip source persistence v1 — make Google Sheet connections survive review/save handoffs. */
(function initializeSakuraTripSourcePersistence(){
  'use strict';
  if(window.SakuraTripSourcePersistence?.version>=1)return;

  const META_KEY='sakuraTripSourceMetaV1';
  const PENDING_KEY='sakuraTripPendingGoogleConnectionV1';
  const S=()=>window.SakuraTripStore;
  const root=()=>document.getElementById('sakura-trip-companion');
  let connectTargetId='';
  let decorating=false;

  function loadMeta(){
    try{const x=JSON.parse(localStorage.getItem(META_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}
  }
  function saveMeta(map){try{localStorage.setItem(META_KEY,JSON.stringify(map))}catch{}}
  function loadPending(){
    try{const x=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');return x&&typeof x==='object'?x:null}catch{return null}
  }
  function savePending(value){
    try{if(value)sessionStorage.setItem(PENDING_KEY,JSON.stringify(value));else sessionStorage.removeItem(PENDING_KEY)}catch{}
  }
  function sheetId(url){
    try{const u=new URL(String(url||'').trim());if(u.protocol!=='https:'||u.hostname!=='docs.google.com')return'';return u.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/)?.[1]||''}catch{return''}
  }
  function currentTrip(){return S()?.currentTrip?.()||null}
  function sourceFor(id){return id?loadMeta()[id]||null:null}
  function notify(){
    document.dispatchEvent(new CustomEvent('sakura:trip-source-changed'));
    setTimeout(()=>window.SakuraTripCompanionPolish?.decorate?.(),0);
  }
  function attachSource(tripId,source){
    if(!tripId||!source?.url||!sheetId(source.url))return false;
    const map=loadMeta();
    map[tripId]={
      ...source,
      type:'google-sheet',
      sheetId:source.sheetId||sheetId(source.url),
      connectedAt:source.connectedAt||new Date().toISOString(),
      lastSynced:source.lastSynced||new Date().toISOString()
    };
    saveMeta(map);notify();return true;
  }

  function repairOrphan(){
    const trips=S()?.loadTrips?.()||[];if(!trips.length)return false;
    const ids=new Set(trips.map(t=>t.id));const map=loadMeta();
    const orphan=Object.entries(map).filter(([id,src])=>src?.type==='google-sheet'&&src?.url&&!ids.has(id));
    if(orphan.length!==1)return false;
    const candidates=trips.filter(t=>map[t.id]?.type!=='google-sheet');
    if(candidates.length!==1)return false;
    const [oldId,src]=orphan[0],target=candidates[0];
    map[target.id]={...src,recoveredFromTripId:oldId};delete map[oldId];saveMeta(map);notify();return true;
  }

  function markConnectTarget(){
    const t=currentTrip();connectTargetId=t?.id||'';
  }
  function rememberPendingFromForm(){
    if(!connectTargetId)return;
    const input=root()?.querySelector('[data-stfs-url]');const url=String(input?.value||'').trim(),id=sheetId(url);
    if(!id)return;
    savePending({tripId:connectTargetId,url,sheetId:id,startedAt:new Date().toISOString()});
  }
  function confirmPendingIfReady(){
    if(decorating)return;decorating=true;
    try{
      const pending=loadPending(),r=root();if(!pending||!r)return;
      const successfulReview=r.querySelector('[data-stfs-review]');
      if(!successfulReview)return;
      if(attachSource(pending.tripId,{type:'google-sheet',url:pending.url,sheetId:pending.sheetId,connectedAt:new Date().toISOString(),lastSynced:new Date().toISOString()})){
        savePending(null);connectTargetId='';
      }
    }finally{decorating=false}
  }

  document.addEventListener('click',event=>{
    const z=s=>event.target.closest?.(s);
    const sync=z('#sakura-trip-companion [data-stcp-sync]');
    if(sync&&sync.dataset.stcpMode!=='resync'){markConnectTarget();return}
    if(z('#sakura-trip-companion [data-stfs-import-link]')){rememberPendingFromForm();return}
    if(z('#sakura-trip-companion [data-stfs-file-button],#sakura-trip-companion [data-stfs-paste]')){connectTargetId='';savePending(null);return}
  },true);

  document.addEventListener('sakura:trips-changed',()=>setTimeout(()=>{repairOrphan();confirmPendingIfReady()},0));
  const observer=new MutationObserver(()=>setTimeout(confirmPendingIfReady,0));
  function init(){
    repairOrphan();
    const r=root();if(r)observer.observe(r,{childList:true,subtree:true});
    confirmPendingIfReady();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);

  window.SakuraTripSourcePersistence=Object.freeze({version:1,sourceFor,attachSource,repairOrphan,confirmPendingIfReady});
}());
