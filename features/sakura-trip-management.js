/* Sakura Trip Management v2 — deletion cleans every trip-owned local record. */
(function initializeSakuraTripManagement(){
  'use strict';
  if(window.SakuraTripManagement?.version>=2)return;

  const META_KEY='sakuraTripSourceMetaV1';
  const DELETED_KEY='sakuraTripDeletedIdsV1';
  const RUNTIME_PREFIX='sakuraTripRuntimeV1:';
  const HOME_PREFIX='sakuraTripHomeStationV1:';
  const RECHECK_PREFIX='sakuraTripRecheckV1:';
  const PROOF_DB='sakuraTripProofWalletV1';
  const PROOF_STORE='proofs';

  const style=document.createElement('style');style.id='sakura-trip-management-style';style.textContent=`
    #sakura-trip-companion .stc-trip-manage-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch;margin-top:8px}
    #sakura-trip-companion .stc-trip-manage-row>.stc-row{margin:0}
    #sakura-trip-companion .stc-delete-trip{min-width:48px;padding:8px 10px;border:1px solid color-mix(in srgb,#c4495f 30%,var(--color-border));border-radius:14px;background:color-mix(in srgb,#fff0f3 70%,var(--color-surface));color:#a72d4f;font-size:11px;font-weight:900}
  `;document.head.appendChild(style);

  const S=()=>window.SakuraTripStore;
  const trips=()=>S()?.loadTrips?.()||[];
  const save=next=>S()?.saveTrips?.(next);
  function markDeleted(id){try{const list=JSON.parse(localStorage.getItem(DELETED_KEY)||'[]'),next=[...new Set([...(Array.isArray(list)?list:[]),id])].slice(-100);localStorage.setItem(DELETED_KEY,JSON.stringify(next))}catch{}}
  function cleanupLocalStorage(id){
    try{
      const activeKey=S()?.keys?.ACTIVE_TRIP_KEY||'sakuraActiveTripIdV1',previewPrefix=S()?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:';
      if(localStorage.getItem(activeKey)===id)localStorage.removeItem(activeKey);
      localStorage.removeItem(previewPrefix+id);localStorage.removeItem(HOME_PREFIX+id);localStorage.removeItem(RECHECK_PREFIX+id);
      for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith(`${RUNTIME_PREFIX}${id}:`))localStorage.removeItem(key)}
      const meta=JSON.parse(localStorage.getItem(META_KEY)||'{}');if(meta&&typeof meta==='object'&&meta[id]){delete meta[id];localStorage.setItem(META_KEY,JSON.stringify(meta))}
    }catch{}
    try{const pending=JSON.parse(sessionStorage.getItem('sakuraTripPendingGoogleConnectionV1')||'null');if(pending?.tripId===id)sessionStorage.removeItem('sakuraTripPendingGoogleConnectionV1')}catch{}
  }
  function cleanupProofs(id){
    try{const request=indexedDB.open(PROOF_DB);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains(PROOF_STORE)){db.close();return}const tx=db.transaction(PROOF_STORE,'readwrite'),store=tx.objectStore(PROOF_STORE),cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;if(String(c.key||'').startsWith(`${id}|`))c.delete();c.continue()};tx.oncomplete=()=>db.close();tx.onerror=()=>db.close()}}catch{}
  }
  function cleanupTripState(id){if(!id)return;markDeleted(id);cleanupLocalStorage(id);cleanupProofs(id);window.SakuraTripSourcePersistence?.removeSource?.(id);document.dispatchEvent(new CustomEvent('sakura:trip-source-changed'))}
  function removeTrip(id){
    const current=trips(),target=current.find(t=>t.id===id);if(!target)return false;
    if(!window.confirm(`Delete “${target.name}”?\n\nThis removes the itinerary and its local trip data from this device. You can import it again later.`))return false;
    cleanupTripState(id);const next=current.filter(t=>t.id!==id);save(next);setTimeout(()=>{document.querySelector('#sakura-trip-companion [data-trips]')?.click();window.SakuraTripPublicDefault?.ensureEmptyLauncher?.()},0);return true
  }
  function decorate(){const root=document.getElementById('sakura-trip-companion');if(!root)return;root.querySelectorAll('[data-open-trip]').forEach(open=>{const id=open.dataset.openTrip;if(!id||open.closest('.stc-trip-manage-row'))return;const wrap=document.createElement('div');wrap.className='stc-trip-manage-row';open.parentNode.insertBefore(wrap,open);wrap.appendChild(open);const del=document.createElement('button');del.type='button';del.className='stc-delete-trip';del.dataset.deleteTrip=id;del.setAttribute('aria-label','Delete trip');del.textContent='Delete';wrap.appendChild(del)})}
  const observer=new MutationObserver(decorate);function init(){const root=document.getElementById('sakura-trip-companion');if(root)observer.observe(root,{childList:true,subtree:true});decorate()}
  document.addEventListener('click',event=>{const button=event.target.closest?.('#sakura-trip-companion [data-delete-trip]');if(!button)return;event.preventDefault();event.stopPropagation();removeTrip(button.dataset.deleteTrip)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
  window.SakuraTripManagement=Object.freeze({version:2,deleteTrip:removeTrip,cleanupTripState,decorate});
}());
