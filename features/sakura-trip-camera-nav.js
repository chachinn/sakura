/* Sakura Trip Camera navigation v1 — Camera Back returns to the same Trip Companion day. */
(function initializeSakuraTripCameraNav(){
'use strict';
if(window.SakuraTripCameraNav?.version>=1)return;

document.addEventListener('click',event=>{
  const back=event.target.closest?.('#sakura-camera-japanese [data-scj-back]');
  if(!back)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  window.SakuraCameraJapanese?.close?.({returnToDay:false});
  const companion=document.getElementById('sakura-trip-companion');
  if(companion&&!companion.classList.contains('open')){
    const t=window.SakuraTripStore?.currentTrip?.();
    const index=t?window.SakuraTripStore?.currentDayIndex?.(t)||0:0;
    setTimeout(()=>window.SakuraTripCompanion?.open?.(index),0);
  }
},true);

window.SakuraTripCameraNav=Object.freeze({version:1});
}());
