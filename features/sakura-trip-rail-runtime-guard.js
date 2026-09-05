/* Sakura Trip Rail Runtime Guard v2 — make Trip Companion rail result-first and always return to itinerary. */
(function initializeSakuraTripRailRuntimeGuard(){
  'use strict';
  if(window.SakuraTripRailRuntimeGuard?.version>=2)return;

  const REQUIRED_PINNED_VERSION=2;
  const PINNED_SRC='./features/sakura-trip-pinned-rail.js?v=2&runtime=guard2';
  let loading=null,opening=false,normalizeTimer=0;
  let returnContext={active:false,tripId:'',index:0};

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

  function rememberReturnContext(source='rail-runtime-guard'){
    const {trip,index}=activeTripDay();
    if(!trip)return null;
    returnContext={active:true,tripId:trip.id||'',index};
    window.SakuraTripReturnState?.capture?.(source);
    return{trip,index};
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

  function routeResult(){return document.getElementById('rail-network-route-result')}
  function routeHasContent(){return Boolean(routeResult()?.textContent?.trim())}
  function focusRouteResult(){
    const result=routeResult();
    if(!result||!routeHasContent())return false;
    const top=Math.max(0,window.scrollY+result.getBoundingClientRect().top-118);
    window.scrollTo({top,behavior:'auto'});
    return true;
  }

  function normalizeLiveToolsRail(){
    const view=document.getElementById('travel-rail-view');
    const legacy=view?.querySelector('.stlv-rail-context');
    if(!view||!legacy)return false;
    if(!returnContext.active)rememberReturnContext('live-tools-rail-fallback');
    view.dataset.tripRailOrigin='1';
    let attempts=0;
    clearInterval(normalizeTimer);
    normalizeTimer=window.setInterval(()=>{
      attempts+=1;
      if(routeHasContent()){
        clearInterval(normalizeTimer);normalizeTimer=0;
        legacy.remove();
        requestAnimationFrame(()=>focusRouteResult());
      }else if(attempts>=50){clearInterval(normalizeTimer);normalizeTimer=0}
    },60);
    return true;
  }

  function returnToTrip(){
    const store=window.SakuraTripStore;
    const trips=store?.loadTrips?.()||[];
    const current=returnContext.tripId?trips.find(item=>item.id===returnContext.tripId):store?.currentTrip?.();
    const trip=current||store?.currentTrip?.();
    const index=trip?.days?.length?Math.max(0,Math.min(returnContext.index,trip.days.length-1)):0;
    window.SakuraTripReturnState?.requestRestore?.('railway-back');
    if(trip?.id){
      try{
        store?.setActiveTrip?.(trip.id);
        localStorage.setItem((store?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:')+trip.id,String(index));
      }catch{}
    }
    const view=document.getElementById('travel-rail-view');
    if(view){delete view.dataset.tripRailOrigin;view.querySelector('.stlv-rail-context')?.remove()}
    returnContext={active:false,tripId:'',index:0};
    if(typeof showRoute==='function')showRoute('travel');
    setTimeout(()=>window.SakuraTripCompanion?.open?.(index),0);
  }

  async function openCurrentRail(trip,day){
    if(opening)return;
    opening=true;
    try{
      rememberReturnContext('transit-runtime-guard');
      const api=await loadPinned();
      await api.open(trip,day);
      document.querySelector('#travel-rail-view .stlv-rail-context')?.remove();
      const from=document.getElementById('rail-network-from-input');
      const to=document.getElementById('rail-network-to-input');
      const result=routeResult();
      if(from?.value&&to?.value&&!result?.textContent?.trim()){
        from.dispatchEvent(new Event('input',{bubbles:true}));
        to.dispatchEvent(new Event('input',{bubbles:true}));
        await new Promise(resolve=>setTimeout(resolve,80));
        document.getElementById('rail-network-plan-button')?.click();
        await new Promise(resolve=>setTimeout(resolve,80));
      }
      if(routeHasContent())requestAnimationFrame(()=>focusRouteResult());
      else console.warn('Trip Companion Railway opened without a fully populated route.',{from:from?.value||'',to:to?.value||'',route:Boolean(result?.textContent?.trim())});
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
    const tripMode=Boolean(returnContext.active||view?.dataset.tripRailOrigin==='1'||view?.classList.contains('stpr-trip-mode')||view?.querySelector('.stpr-card')||view?.querySelector('.stlv-rail-context'));
    if(!tripMode)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if((view?.classList.contains('stpr-trip-mode')||view?.querySelector('.stpr-card'))&&currentPinned()?.returnToTrip)return currentPinned().returnToTrip();
    returnToTrip();
  },true);

  const observer=new MutationObserver(()=>{if(document.querySelector('#travel-rail-view .stlv-rail-context'))normalizeLiveToolsRail()});
  const startObserver=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
  setTimeout(normalizeLiveToolsRail,0);

  window.SakuraTripRailRuntimeGuard=Object.freeze({version:2,activeTripDay,loadPinned,openCurrentRail,normalizeLiveToolsRail,focusRouteResult,returnToTrip});
}());
