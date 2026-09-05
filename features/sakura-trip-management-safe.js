/* Sakura Trip Management Safe v2 — deletion cleanup follows actual store changes, never a canceled prompt. */
(function initializeSafeTripManagement(){
  'use strict';
  const api=window.SakuraTripManagement,store=window.SakuraTripStore;
  if(!api||!store||api.__stabilizerV2)return;
  let known=new Set((store.loadTrips?.()||[]).map(t=>t.id));
  function cleanup(id){
    if(!id)return;
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i)||'';
      if((key.startsWith('sakuraTripRuntimeV1:')||key.startsWith('sakuraTripRecheckV1:')||key.startsWith('sakuraTripHomeStationV1:')||key.startsWith('sakuraTripPreviewDayV1:'))&&key.includes(id))localStorage.removeItem(key);
    }
    for(const key of ['sakuraTripSourceMetaV1','sakuraTripExtrasV1']){
      try{const map=JSON.parse(localStorage.getItem(key)||'{}');if(map?.[id]){delete map[id];localStorage.setItem(key,JSON.stringify(map))}}catch{}
    }
    try{
      const pending=JSON.parse(sessionStorage.getItem('sakuraTripPendingGoogleConnectionV1')||'null');
      if(pending?.tripId===id)sessionStorage.removeItem('sakuraTripPendingGoogleConnectionV1');
    }catch{}
    try{
      const req=indexedDB.open('sakuraTripProofWalletV1');
      req.onsuccess=()=>{
        const db=req.result;if(!db.objectStoreNames.contains('proofs'))return;
        const tx=db.transaction('proofs','readwrite'),objectStore=tx.objectStore('proofs'),cursor=objectStore.openCursor();
        cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;if(String(c.key||'').startsWith(id+'|'))c.delete();c.continue()};
      };
    }catch{}
  }
  function reconcile(){
    const current=new Set((store.loadTrips?.()||[]).map(t=>t.id));
    for(const id of known)if(!current.has(id))cleanup(id);
    known=current;
  }
  document.addEventListener('sakura:trips-changed',()=>setTimeout(reconcile,0));
  window.SakuraTripManagement=Object.freeze({...api,version:Math.max(2,api.version||1),__stabilizerV2:true,cleanupRemovedTripData:cleanup,reconcile});
}());
