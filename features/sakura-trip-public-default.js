/* Sakura Trip Public Default v1
   Keeps fresh installs empty while preserving trips already saved on-device. */
(function initializeSakuraTripPublicDefault(){
  'use strict';
  if(window.SakuraTripPublicDefault?.version>=1)return;

  const TRIPS_KEY='sakuraTripsV1';
  const ACTIVE_TRIP_KEY='sakuraActiveTripIdV1';
  const EMPTY_ID='__sakura_empty_trip_state__';
  const EMPTY_SENTINEL=Object.freeze({
    id:EMPTY_ID,
    name:'',destination:'',startDate:'',endDate:'',timezone:'Asia/Tokyo',hotel:'',source:'system-empty',days:[]
  });

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function rawTrips(){
    try{
      const parsed=JSON.parse(localStorage.getItem(TRIPS_KEY)||'null');
      return Array.isArray(parsed)?parsed:null;
    }catch{return null;}
  }
  function visible(list){return (Array.isArray(list)?list:[]).filter(trip=>trip?.id!==EMPTY_ID);}
  function persistVisible(trips){
    const clean=visible(trips);
    try{
      localStorage.setItem(TRIPS_KEY,JSON.stringify(clean.length?clean:[EMPTY_SENTINEL]));
      if(!clean.length)localStorage.removeItem(ACTIVE_TRIP_KEY);
    }catch{}
    return clean;
  }

  function preflight(){
    window.SAKURA_TRIP_SEED_OCTOBER_2026=EMPTY_SENTINEL;
    if(rawTrips()===null)persistVisible([]);
  }

  function patchStore(){
    const original=window.SakuraTripStore;
    if(!original||original.__publicDefaultV1)return;
    const baseApply=original.applyImport.bind(original);
    const baseTripMatch=original.tripMatch.bind(original);

    const loadTrips=()=>visible(rawTrips()||[]);
    const getTrips=()=>loadTrips().map(clone);
    const saveTrips=trips=>{
      const clean=persistVisible(trips);
      document.dispatchEvent(new CustomEvent('sakura:trips-changed'));
      return clean;
    };
    const selectedTrip=()=>{
      const trips=loadTrips();
      let wanted='';
      try{wanted=localStorage.getItem(ACTIVE_TRIP_KEY)||'';}catch{}
      return trips.find(t=>t.id===wanted)||trips[0]||null;
    };
    const liveTrip=()=>loadTrips().find(trip=>{
      if(!trip.startDate||!trip.endDate)return false;
      const today=original.dateKeyInTimezone(trip.timezone||'Asia/Tokyo');
      return today>=trip.startDate&&today<=trip.endDate;
    })||null;
    const upcomingTrip=()=>loadTrips().filter(trip=>{
      if(!trip.startDate)return false;
      const today=original.dateKeyInTimezone(trip.timezone||'Asia/Tokyo');
      return trip.startDate>today;
    }).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0]||null;
    const currentTrip=()=>liveTrip()||selectedTrip()||upcomingTrip();
    const tripMatch=(imported,trips=loadTrips())=>baseTripMatch(imported,trips);
    const applyImport=(imported,mode='add')=>{
      const id=baseApply(imported,mode);
      persistVisible(rawTrips()||[]);
      if(id){try{localStorage.setItem(ACTIVE_TRIP_KEY,id);}catch{}}
      document.dispatchEvent(new CustomEvent('sakura:trips-changed'));
      return id;
    };

    window.SakuraTripStore=Object.freeze({
      ...original,
      version:2,
      __publicDefaultV1:true,
      loadTrips,saveTrips,getTrips,selectedTrip,liveTrip,upcomingTrip,currentTrip,tripMatch,applyImport,
      seedTrip:()=>null
    });
  }

  function ensureEmptyLauncher(){
    const store=window.SakuraTripStore;
    if(!store||store.loadTrips().length)return;
    const view=document.getElementById('travel-view');
    const grid=view?.querySelector('.travel-category-grid');
    if(!view||!grid)return;
    let button=view.querySelector('.sakura-trip-companion-launch');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='travel-feature-card sakura-trip-companion-launch';
      const sakutalk=view.querySelector('.sakura-travel-interpreter-card');
      sakutalk?sakutalk.insertAdjacentElement('beforebegin',button):grid.insertAdjacentElement('beforebegin',button);
    }
    button.innerHTML='<span aria-hidden="true">🧳</span><div><h2>My Trips</h2><p>Paste an itinerary to build your Trip Companion.</p></div><b aria-hidden="true">→</b>';
  }

  function patchUi(){
    ensureEmptyLauncher();
    if(window.__sakuraTripPublicDefaultUiBound)return;
    window.__sakuraTripPublicDefaultUiBound=true;
    document.addEventListener('sakura:trips-changed',()=>setTimeout(ensureEmptyLauncher,0));
    document.addEventListener('click',event=>{
      if(window.SakuraTripStore?.loadTrips?.().length)return;
      if(!event.target.closest?.('#sakura-trip-companion [data-back]'))return;
      setTimeout(()=>window.SakuraTripCompanion?.close?.(),0);
    },true);
  }

  preflight();
  window.SakuraTripPublicDefault=Object.freeze({version:1,preflight,patchStore,patchUi,ensureEmptyLauncher});
}());
