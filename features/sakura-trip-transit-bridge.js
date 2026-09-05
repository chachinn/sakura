/* Sakura Trip Transit Bridge v3 — own every Trip Companion Railway entry before generic Transit fallbacks. */
(function initializeSakuraTripTransitBridge(){
  'use strict';
  if(window.SakuraTripTransitBridge?.version>=3)return;

  const REQUIRED_PINNED_VERSION=2;
  const PINNED_SRC='./features/sakura-trip-pinned-rail.js?v=2&runtime=bridge3';
  const TRIP_RAIL_ENTRY_SELECTOR='#sakura-trip-companion [data-help="transit"], #sakura-trip-companion [data-stz2-rail]';
  let loadingPinned=null,opening=false,repairingLegacy=false;
  let returnContext={tripId:'',index:0,active:false};

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

  function tripDayFromReturnContext(){
    const store=window.SakuraTripStore;
    const trips=store?.loadTrips?.()||[];
    const trip=returnContext.tripId?trips.find(item=>item.id===returnContext.tripId):store?.currentTrip?.();
    if(!trip?.days?.length)return{trip:null,day:null,index:0};
    const index=Math.max(0,Math.min(Number(returnContext.index)||0,trip.days.length-1));
    return{trip,day:trip.days[index]||null,index};
  }

  function rememberReturnContext(trip,index,source='transit-bridge-v3'){
    if(!trip?.days?.length)return;
    const safeIndex=Math.max(0,Math.min(Number.isInteger(index)?index:0,trip.days.length-1));
    returnContext={tripId:trip.id||'',index:safeIndex,active:true};
    window.SakuraTripReturnState?.capture?.(source);
  }

  function pinned(){
    const api=window.SakuraTripPinnedRail;
    return api?.version>=REQUIRED_PINNED_VERSION&&typeof api.open==='function'?api:null;
  }

  function ensurePinned(){
    const ready=pinned();
    if(ready)return Promise.resolve(ready);
    if(loadingPinned)return loadingPinned;
    loadingPinned=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-sakura-trip-pinned-rail]');
      if(existing&&existing.dataset.loaded!=='1'){
        existing.addEventListener('load',()=>{const api=pinned();api?resolve(api):reject(new Error('Trip Companion Railway loaded without the required runtime version.'))},{once:true});
        existing.addEventListener('error',()=>reject(new Error('Could not load Trip Companion Railway.')),{once:true});
        return;
      }
      if(existing&&!pinned())existing.remove();
      const script=document.createElement('script');
      script.src=PINNED_SRC;
      script.dataset.sakuraTripPinnedRail='1';
      script.dataset.sakuraTripPinnedRailBridge='1';
      script.onload=()=>{
        script.dataset.loaded='1';
        const api=pinned();
        api?resolve(api):reject(new Error('Trip Companion Railway loaded without the required runtime version.'));
      };
      script.onerror=()=>reject(new Error('Could not load Trip Companion Railway.'));
      document.head.appendChild(script);
    }).finally(()=>{loadingPinned=null});
    return loadingPinned;
  }

  const routeResult=()=>document.getElementById('rail-network-route-result');
  const routeHasContent=()=>Boolean(routeResult()?.textContent?.trim());
  async function waitForRoute(ms=2400){
    const start=Date.now();
    while(Date.now()-start<ms){if(routeHasContent())return routeResult();await new Promise(resolve=>setTimeout(resolve,50))}
    return routeHasContent()?routeResult():null;
  }
  function focusRouteResult(){
    const result=routeResult();
    if(!result||!routeHasContent())return false;
    const top=Math.max(0,window.scrollY+result.getBoundingClientRect().top-118);
    window.scrollTo({top,behavior:'auto'});
    return true;
  }

  async function openPinnedRail(trip,day,index,source='transit-bridge-v3'){
    if(opening)return;
    opening=true;
    rememberReturnContext(trip,index,source);
    try{
      const api=await ensurePinned();
      await api.open(trip,day);
      const view=document.getElementById('travel-rail-view');
      if(view)view.dataset.sttbTripRailOrigin='1';
      view?.querySelector('.stlv-rail-context')?.remove();

      let result=await waitForRoute(700);
      if(!result){
        const from=document.getElementById('rail-network-from-input');
        const to=document.getElementById('rail-network-to-input');
        if(from?.value&&to?.value){
          from.dispatchEvent(new Event('input',{bubbles:true}));
          to.dispatchEvent(new Event('input',{bubbles:true}));
          document.getElementById('rail-network-plan-button')?.click();
          result=await waitForRoute(1700);
        }
      }
      if(result)requestAnimationFrame(()=>focusRouteResult());
      else console.warn('Trip Companion Railway opened without a populated route result.');
    }finally{opening=false}
  }

  async function repairLegacyRail(){
    if(repairingLegacy||opening||!returnContext.active)return false;
    const view=document.getElementById('travel-rail-view');
    const legacy=view?.querySelector('.stlv-rail-context');
    if(!legacy||view?.classList.contains('stpr-trip-mode')||view?.querySelector('.stpr-card'))return false;
    const {trip,day,index}=tripDayFromReturnContext();
    if(!trip||!day)return false;
    repairingLegacy=true;
    legacy.remove();
    try{
      await openPinnedRail(trip,day,index,'legacy-trip-rail-repair');
      return true;
    }catch(error){
      console.warn('Could not replace legacy Trip Companion Railway wrapper.',error);
      return false;
    }finally{repairingLegacy=false}
  }

  function fallbackReturnToTrip(){
    const store=window.SakuraTripStore;
    const {trip,index}=tripDayFromReturnContext();
    window.SakuraTripReturnState?.requestRestore?.('railway-back');
    if(trip?.id){
      try{
        store?.setActiveTrip?.(trip.id);
        localStorage.setItem((store?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:')+trip.id,String(index));
      }catch{}
    }
    const view=document.getElementById('travel-rail-view');
    if(view){delete view.dataset.sttbTripRailOrigin;view.querySelector('.stlv-rail-context')?.remove()}
    returnContext={tripId:'',index:0,active:false};
    if(typeof showRoute==='function')showRoute('travel');
    setTimeout(()=>window.SakuraTripCompanion?.open?.(index),0);
  }

  window.addEventListener('click',event=>{
    const button=event.target.closest?.(TRIP_RAIL_ENTRY_SELECTOR);
    if(!button)return;
    const {trip,day,index}=activeTripDay();
    if(!trip||!day)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPinnedRail(trip,day,index,button.hasAttribute?.('data-stz2-rail')?'timeline-railway':'transit-rescue').catch(error=>{
      console.warn('Could not open Trip Companion Railway.',error);
      if(typeof window.alert==='function')window.alert('Sakura could not load the itinerary train route. Please close and reopen Sakura, then try Railway again.');
    });
  },true);

  window.addEventListener('click',event=>{
    const back=event.target.closest?.('#travel-rail-view .back-button');
    if(!back)return;
    const view=document.getElementById('travel-rail-view');
    const tripMode=Boolean(returnContext.active||view?.dataset.sttbTripRailOrigin==='1'||view?.classList.contains('stpr-trip-mode')||view?.querySelector('.stpr-card')||view?.querySelector('.stlv-rail-context'));
    if(!tripMode)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const api=pinned();
    if(api?.returnToTrip)return api.returnToTrip();
    fallbackReturnToTrip();
  },true);

  const observer=new MutationObserver(()=>{if(returnContext.active&&document.querySelector('#travel-rail-view .stlv-rail-context'))void repairLegacyRail()});
  const startObserver=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();

  window.SakuraTripTransitBridge=Object.freeze({version:3,activeTripDay,ensurePinned,openPinnedRail,repairLegacyRail,focusRouteResult,entrySelector:TRIP_RAIL_ENTRY_SELECTOR});
}());
