/* Sakura Trip Store Upgrade v2 — stable stop identity and safer merge/replace semantics. */
(function upgradeSakuraTripStore(){
  'use strict';
  const base=window.SakuraTripStore,core=window.SakuraTripCore;
  if(!base||!core||base.version>=2)return;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const compact=core.compact;
  const timeMinutes=value=>{const m=String(value||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):9999};
  const slug=value=>String(value||'trip').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'trip';

  function preserveIds(raw,normalized){
    const rawDays=new Map((raw?.days||[]).map(d=>[d.date,d]));
    const out=clone(normalized);
    for(const day of out.days||[]){
      const source=rawDays.get(day.date);if(!source)continue;
      const used=new Set();
      for(const item of day.items||[]){
        const sig=core.baseItemSignature(item,day.date);
        let match=(source.items||[]).find((candidate,index)=>candidate?.id&&!used.has(index)&&core.baseItemSignature(candidate,day.date)===sig);
        if(!match)match=(source.items||[]).find((candidate,index)=>candidate?.id&&!used.has(index)&&compact(candidate.title)===compact(item.title)&&compact(candidate.place||'')===compact(item.place||''));
        if(match){item.id=String(match.id);used.add((source.items||[]).indexOf(match))}
      }
    }
    return core.upgradeTrip(out);
  }
  function normalizeTrip(raw={}){return preserveIds(raw,base.normalizeTrip(raw))}
  function upgradeDay(day={}){const copy=clone(day);copy.items=core.assignStableIds(copy);return copy}
  function upgradeExisting(trip){const copy=clone(trip);copy.days=(copy.days||[]).map(upgradeDay);return copy}
  function loadTrips(){return base.loadTrips().map(upgradeExisting)}
  function saveTrips(trips){return base.saveTrips((trips||[]).map(upgradeExisting))}
  function getTrips(){return loadTrips().map(clone)}
  function selectedTrip(){const trips=loadTrips(),wanted=localStorage.getItem(base.keys.ACTIVE_TRIP_KEY);return trips.find(t=>t.id===wanted)||trips.find(t=>t.id==='japan-october-2026')||trips[0]||null}
  function liveTrip(){return loadTrips().find(t=>base.isTripLive(t))||null}
  function upcomingTrip(){const today=base.dateKeyInTimezone('Asia/Tokyo');return loadTrips().filter(t=>t.startDate&&t.startDate>today).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0]||null}
  function currentTrip(){return liveTrip()||selectedTrip()||upcomingTrip()}
  function itemKey(item,date){return item?.id?`id:${item.id}`:`sig:${core.baseItemSignature(item,date)}`}
  function carryIds(existing,incoming){
    const prev=upgradeDay(existing||{}),next=clone(incoming||{}),bySig=new Map((prev.items||[]).map(i=>[core.baseItemSignature(i,prev.date||next.date),i]));
    next.items=(next.items||[]).map(item=>{if(item.id)return item;const match=bySig.get(core.baseItemSignature(item,next.date));return match?{...item,id:match.id}:item});
    next.items=core.assignStableIds(next);return next;
  }
  function mergeDay(existing,incoming){
    const next=carryIds(existing,incoming),map=new Map();
    for(const item of upgradeDay(existing||{}).items||[])map.set(itemKey(item,existing?.date),item);
    for(const item of next.items||[]){const sig=core.baseItemSignature(item,next.date);let key=itemKey(item,next.date);if(!map.has(key)){const old=[...map.entries()].find(([,v])=>core.baseItemSignature(v,next.date)===sig);if(old)key=old[0]}const previous=map.get(key);map.set(key,{...(previous||{}),...item,id:item.id||previous?.id})}
    return {...existing,...next,items:[...map.values()].sort((a,b)=>timeMinutes(a.time)-timeMinutes(b.time))};
  }
  function preserveTripIds(existing,incoming){const byDate=new Map((existing?.days||[]).map(d=>[d.date,d]));return {...incoming,days:(incoming.days||[]).map(d=>byDate.has(d.date)?carryIds(byDate.get(d.date),d):upgradeDay(d))}}
  function tripMatch(imported,trips=loadTrips()){return base.tripMatch(imported,trips)}
  function applyImport(imported,mode='add'){
    imported=normalizeTrip(imported);const trips=loadTrips(),match=tripMatch(imported,trips);
    if(!match){let id=imported.id&&!trips.some(t=>t.id===imported.id)?imported.id:`${slug(imported.name)}-${imported.startDate||Date.now()}`;while(trips.some(t=>t.id===id))id=`${id}-${Math.random().toString(36).slice(2,6)}`;trips.push({...imported,id});saveTrips(trips);base.setActiveTrip(id);return id}
    const index=trips.findIndex(t=>t.id===match.id),next=clone(match);
    if(imported.days.length===1&&match.days.some(d=>d.date===imported.days[0].date)){
      const d=imported.days[0],n=next.days.findIndex(x=>x.date===d.date);next.days[n]=mode==='merge-day'?mergeDay(next.days[n],d):carryIds(next.days[n],d);trips[index]=normalizeTrip({...next,id:match.id,source:'import'});
    }else if(mode==='merge-trip'){
      const byDate=new Map(next.days.map(d=>[d.date,d]));for(const d of imported.days)byDate.set(d.date,byDate.has(d.date)?mergeDay(byDate.get(d.date),d):upgradeDay(d));trips[index]=normalizeTrip({...next,...imported,id:match.id,days:[...byDate.values()],source:'import'});
    }else trips[index]=normalizeTrip({...preserveTripIds(match,imported),id:match.id,source:'import'});
    saveTrips(trips);base.setActiveTrip(match.id);return match.id;
  }
  function parseTripPack(text){return normalizeTrip(base.parseTripPack(text))}
  async function understand(text){return normalizeTrip(await base.understand(text))}
  const api=Object.freeze({...base,version:2,loadTrips,saveTrips,getTrips,selectedTrip,liveTrip,upcomingTrip,currentTrip,normalizeTrip,parseTripPack,understand,tripMatch,applyImport,mergeDay,stableItemId:(item,index,day)=>item?.id||core.assignStableIds({...day,items:[item]})[0]?.id||`${index}`});
  window.SakuraTripStore=api;
  try{const before=base.loadTrips(),after=before.map(upgradeExisting);if(JSON.stringify(before)!==JSON.stringify(after))base.saveTrips(after)}catch(error){console.warn('Sakura trip stable-ID migration skipped.',error)}
}());
