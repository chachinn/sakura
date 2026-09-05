/* Sakura Trip Rail Runtime Guard v1 — force Trip Companion transit onto the current pinned Railway runtime. */
(function initializeSakuraTripRailRuntimeGuard(){
  'use strict';
  if(window.SakuraTripRailRuntimeGuard?.version>=1)return;

  const REQUIRED_PINNED_VERSION=2;
  const PINNED_SRC='./features/sakura-trip-pinned-rail.js?v=2&runtime=guard1';
  let loading=null,opening=false;

  function activeTripDay(){
    const store=window.SakuraTripStore;
    const trip=store?.currentTrip?.();
    if(!trip?.days?.length)return{trip:null,day:null,index:0};
    let index=NaN;
    const selected=document.querySelector('#sakura-trip-companion .stc-day.on');
    if(selected)index=Number(selected.dataset.day);
    if(!Number.isInteger(index)){
      try{index=Number(localStorage.getItem((store?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:')+trip.id));}catch{}
    }
    if(!Number.isInteger(index))index=store?.currentDayIndex?.(trip)??0;
    index=Math.max(0,Math.min(index,trip.days.length-1));
    return{trip,day:trip.days[index]||null,index};
  }

  function currentPinned(){
    const api=window.SakuraTripPinnedRail;
    return api?.version>=REQUIRED_PINNED_VERSION&&typeof api.open==='function'?api:null;
  }

  function loadPinned(){
    const ready=currentPinned();
    if(ready)return Promise.resolve(ready);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      document.querySelectorAll('script[data-sakura-trip-pinned-rail]').forEach(script=>{
        if(script.dataset.sakuraTripPinnedRailGuard!=='1')script.remove();
      });
      const script=document.createElement('script');
      script.src=PINNED_SRC;
      script.dataset.sakuraTripPinnedRail='1';
      script.dataset.sakuraTripPinnedRailGuard='1';
      script.onload=()=>{
        script.dataset.loaded='1';
        const api=currentPinned();
        if(api)resolve(api);else reject(new Error('Current Trip Companion Railway runtime did not initialize.'));
      };
      script.onerror=()=>reject(new Error('Could not load the current Trip Companion Railway runtime.'));
      document.head.appendChild(script);
    }).finally(()=>{loading=null});
    return loading;
  }

  async function openCurrentRail(trip,day){
    if(opening)return;
    opening=true;
    try{
      window.SakuraTripReturnState?.capture?.('transit-runtime-guard');
      const api=await loadPinned();
      await api.open(trip,day);
      document.querySelector('#travel-rail-view .stlv-rail-context')?.remove();
      const from=document.getElementById('rail-network-from-input');
      const to=document.getElementById('rail-network-to-input');
      const result=document.getElementById('rail-network-route-result');
      if(from?.value&&to?.value&&!result?.textContent?.trim()){
        from.dispatchEvent(new Event('input',{bubbles:true}));
        to.dispatchEvent(new Event('input',{bubbles:true}));
        await new Promise(resolve=>setTimeout(resolve,80));
        document.getElementById('rail-network-plan-button')?.click();
        await new Promise(resolve=>setTimeout(resolve,80));
      }
      if(!from?.value||!to?.value||!result?.textContent?.trim()){
        console.warn('Trip Companion Railway opened without a fully populated route.',{from:from?.value||'',to:to?.value||'',route:Boolean(result?.textContent?.trim())});
      }
    }finally{opening=false}
  }

  window.addEventListener('click',event=>{
    const button=event.target.closest?.('#sakura-trip-companion [data-help="transit"]');
    if(!button)return;
    const {trip,day}=activeTripDay();
    if(!trip||!day)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openCurrentRail(trip,day).catch(error=>{
      console.warn('Could not open the current Trip Companion Railway runtime.',error);
      if(typeof window.alert==='function')window.alert('Sakura could not load the itinerary train route. Please close and reopen Sakura, then try Transit Rescue again.');
    });
  },true);

  window.addEventListener('click',event=>{
    const back=event.target.closest?.('#travel-rail-view .back-button');
    if(!back)return;
    const view=document.getElementById('travel-rail-view');
    const tripMode=Boolean(view?.classList.contains('stpr-trip-mode')||view?.querySelector('.stpr-card'));
    if(!tripMode)return;
    const api=currentPinned();
    if(!api?.returnToTrip)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    api.returnToTrip();
  },true);

  window.SakuraTripRailRuntimeGuard=Object.freeze({version:1,activeTripDay,loadPinned,openCurrentRail});
}());
