/* Sakura Trip Transit Bridge v1 — sends Trip Companion Transit Rescue into the actual Railway System. */
(function initializeSakuraTripTransitBridge(){
  'use strict';
  if(window.SakuraTripTransitBridge?.version>=1)return;

  function activeTripDay(){
    const store=window.SakuraTripStore;
    const trip=store?.currentTrip?.();
    if(!trip?.days?.length)return{trip:null,day:null};
    let index=NaN;
    const selected=document.querySelector('#sakura-trip-companion .stc-day.on');
    if(selected)index=Number(selected.dataset.day);
    if(!Number.isInteger(index)){
      try{index=Number(localStorage.getItem((store?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:')+trip.id));}catch{}
    }
    if(!Number.isInteger(index))index=store?.currentDayIndex?.(trip)??0;
    index=Math.max(0,Math.min(index,trip.days.length-1));
    return{trip,day:trip.days[index]||null};
  }

  window.addEventListener('click',event=>{
    const button=event.target.closest?.('#sakura-trip-companion [data-help="transit"]');
    if(!button)return;
    const api=window.SakuraTransitRescue;
    if(!api?.open)return;
    const {trip,day}=activeTripDay();
    if(!trip||!day)return;

    // The legacy Trip Companion listener lives on document capture and renders
    // a static "Safest path" screen. Intercept one level earlier (window capture)
    // so the newer Railway-backed Transit Rescue gets the click instead.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    Promise.resolve().then(()=>{
      if((api.version||0)>=3)return api.open(trip,day);
      return api.open({trip,day});
    }).catch(error=>console.warn('Could not open Railway-backed Transit Rescue.',error));
  },true);

  window.SakuraTripTransitBridge=Object.freeze({version:1,activeTripDay});
}());
