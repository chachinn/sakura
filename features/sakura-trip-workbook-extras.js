/* Sakura Trip Workbook Extras v1 — preserve non-itinerary workbook tabs for Trip Companion. */
(function initializeTripWorkbookExtras(){
  'use strict';
  if(window.SakuraTripWorkbookExtras?.version>=1)return;
  const KEY='sakuraTripExtrasV1';let pending=null,pendingPromise=null;
  const S=()=>window.SakuraTripStore,C=()=>window.SakuraTripCore,root=()=>document.getElementById('sakura-trip-companion');
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
  function save(tripId,extras){if(!tripId||!extras)return;const map=load();map[tripId]={...extras,updatedAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(map));document.dispatchEvent(new CustomEvent('sakura:trip-extras-changed',{detail:{tripId}}))}
  async function parseFile(file){if(!file||!window.SakuraTripFileImport?.parseXlsx||!C())return null;const workbook=await window.SakuraTripFileImport.parseXlsx(file);return C().extractWorkbookExtras(workbook)}
  function captureFile(file){const token={};pending=token;pendingPromise=parseFile(file).then(extras=>{if(pending===token)pending=extras;return extras}).catch(()=>{if(pending===token)pending=null;return null})}
  function gateway(){const c=window.SAKURA_AI_CONFIG||{};return {url:String(c.endpoint||'').replace(/\/sakura-ai-translator(?:\?.*)?$/,'/sakura-google-sheet-xlsx'),key:c.gatewayKey||c.publishableKey||''}}
  async function parseGoogle(url){const cfg=gateway();if(!cfg.url||!cfg.key||!url)return null;const response=await fetch(cfg.url,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key},body:JSON.stringify({url})});if(!response.ok)return null;const blob=await response.blob(),file=new File([blob],'Google Sheet.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});return parseFile(file)}
  function captureGoogle(url){const token={};pending=token;pendingPromise=parseGoogle(url).then(extras=>{if(pending===token)pending=extras;return extras}).catch(()=>{if(pending===token)pending=null;return null})}
  async function commit(){const token=pending,promise=pendingPromise;if(token&&(!token.packing)&&promise)await promise.catch(()=>null);const extras=pending;if(!extras?.packing)return;const id=localStorage.getItem(S()?.keys?.ACTIVE_TRIP_KEY||'sakuraActiveTripIdV1')||S()?.currentTrip?.()?.id;if(id)save(id,extras);pending=null;pendingPromise=null}
  function sourceForTrip(t){return window.SakuraTripFileSync?.getSource?.(t?.id)||window.SakuraTripSourcePersistence?.sourceFor?.(t?.id)||null}

  document.addEventListener('change',event=>{const input=event.target.closest?.('#sakura-trip-companion [data-stfs-file]');if(input?.files?.[0])captureFile(input.files[0])},true);
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('#sakura-trip-companion [data-stfs-import-link]');if(link){const url=root()?.querySelector('[data-stfs-url]')?.value||'';if(url)captureGoogle(url)}
    const sync=event.target.closest?.('#sakura-trip-companion [data-stcp-sync],#sakura-trip-companion [data-stfs-resync]');if(sync){const t=S()?.currentTrip?.(),src=sourceForTrip(t);if((sync.dataset.stcpMode==='resync'||sync.hasAttribute('data-stfs-resync'))&&src?.url)captureGoogle(src.url)}
    if(event.target.closest?.('#sakura-trip-companion [data-save]'))void commit();
    if(event.target.closest?.('#sakura-trip-companion [data-stfs-menu],#sakura-trip-companion [data-stfs-back]')){pending=null;pendingPromise=null}
  },true);

  window.SakuraTripWorkbookExtras=Object.freeze({version:1,load,save,captureFile,captureGoogle,commit,key:KEY});
}());
