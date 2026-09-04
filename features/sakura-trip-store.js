/* Sakura Trip Store + Smart Itinerary Import v2 */
(function initializeSakuraTripStore(){
  'use strict';
  if(window.SakuraTripStore?.version>=2)return;

  const TRIPS_KEY='sakuraTripsV1';
  const ACTIVE_TRIP_KEY='sakuraActiveTripIdV1';
  const PREVIEW_DAY_PREFIX='sakuraTripPreviewDayV1:';
  const OCTOBER_TRIP_ID='japan-october-2026';
  const EMPTY_ID='__sakura_empty_trip_state__';
  const SEED_TRIP=window.SAKURA_TRIP_SEED_OCTOBER_2026;
  if(!SEED_TRIP){console.warn('Sakura trip seed was not available.');return;}

  const clone=value=>JSON.parse(JSON.stringify(value));
  const clean=value=>String(value??'').trim();
  const slug=value=>String(value||'trip').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'trip';
  const uniq=list=>[...new Set((Array.isArray(list)?list:[]).map(v=>clean(v)).filter(Boolean))];
  function hash(value){let h=2166136261;for(const c of String(value||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function normalizeDate(value){const s=clean(value),m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:''}
  function dayLabel(date){try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`))}catch{return date}}
  function dateKeyInTimezone(timezone='Asia/Tokyo'){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),map=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${map.year}-${map.month}-${map.day}`}
  function minutesNow(timezone='Asia/Tokyo'){const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),map=Object.fromEntries(parts.map(p=>[p.type,p.value]));return Number(map.hour)*60+Number(map.minute)}
  function timeMinutes(value){const m=String(value||'').match(/(\d{1,2}):(\d{2})/);if(!m)return null;const n=Number(m[1])*60+Number(m[2]);return Number.isFinite(n)?n:null}

  function rawTrips(){try{const parsed=JSON.parse(localStorage.getItem(TRIPS_KEY)||'null');return Array.isArray(parsed)?parsed:null}catch{return null}}
  function loadTrips(){
    const parsed=rawTrips();
    if(parsed?.length)return parsed.map(t=>t?.id===EMPTY_ID?t:normalizeTrip(t));
    const seeded=[clone(SEED_TRIP)];
    try{localStorage.setItem(TRIPS_KEY,JSON.stringify(seeded));if(SEED_TRIP?.id&&SEED_TRIP.id!==EMPTY_ID)localStorage.setItem(ACTIVE_TRIP_KEY,SEED_TRIP.id||OCTOBER_TRIP_ID)}catch{}
    return seeded.map(t=>t?.id===EMPTY_ID?t:normalizeTrip(t));
  }
  function saveTrips(trips){const normalized=(Array.isArray(trips)?trips:[]).map(t=>t?.id===EMPTY_ID?t:normalizeTrip(t));localStorage.setItem(TRIPS_KEY,JSON.stringify(normalized));document.dispatchEvent(new CustomEvent('sakura:trips-changed'));return normalized}
  function getTrips(){return loadTrips().map(clone)}
  function selectedTrip(){const trips=loadTrips().filter(t=>t?.id!==EMPTY_ID),wanted=localStorage.getItem(ACTIVE_TRIP_KEY);return trips.find(t=>t.id===wanted)||trips.find(t=>t.id===OCTOBER_TRIP_ID)||trips[0]||null}
  function setActiveTrip(id){try{if(id)localStorage.setItem(ACTIVE_TRIP_KEY,id);else localStorage.removeItem(ACTIVE_TRIP_KEY)}catch{}}
  function liveTrip(){return loadTrips().filter(t=>t?.id!==EMPTY_ID).find(trip=>{const today=dateKeyInTimezone(trip.timezone||'Asia/Tokyo');return trip.startDate&&trip.endDate&&today>=trip.startDate&&today<=trip.endDate})||null}
  function upcomingTrip(){const trips=loadTrips().filter(t=>t?.id!==EMPTY_ID),today=dateKeyInTimezone('Asia/Tokyo');return trips.filter(t=>t.startDate&&t.startDate>today).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0]||null}
  function currentTrip(){return liveTrip()||selectedTrip()||upcomingTrip()}

  function stableId(prefix,parts,existing=''){return clean(existing).slice(0,120)||`${prefix}-${hash(parts.filter(v=>v!==undefined&&v!==null).join('|'))}`}
  function normalizeChecklistEntry(entry,index,dayDate=''){
    const object=typeof entry==='string'?{text:entry}:entry||{},text=clean(object.text||object.label).slice(0,320);if(!text)return null;
    return {id:stableId('check',[dayDate,object.sourceSheet,object.sourceRow,text,index],object.id),text,kind:clean(object.kind||'reminder').toLowerCase().slice(0,40),sourceSheet:clean(object.sourceSheet).slice(0,120),sourceRow:Number(object.sourceRow)||0}
  }
  function normalizeTransitLeg(leg,index,dayDate=''){
    const x=leg||{},from=clean(x.from).slice(0,160),to=clean(x.to).slice(0,160);if(!from&&!to)return null;
    return {id:stableId('leg',[dayDate,x.sourceSheet,x.sourceRow,from,to,index],x.id),from,to,time:clean(x.time).slice(0,30),line:clean(x.line).slice(0,160),note:clean(x.note).slice(0,420),sourceSheet:clean(x.sourceSheet).slice(0,120),sourceRow:Number(x.sourceRow)||0}
  }
  function normalizeItem(item={},ctx={}){
    const title=clean(item.title||item.place||'Untitled stop').slice(0,160),place=clean(item.place).slice(0,180),sourceSheet=clean(item.sourceSheet||item.source_sheet||ctx.sourceSheet).slice(0,120),sourceRow=Number(item.sourceRow||item.source_row)||0,index=Number(ctx.index)||0,dayDate=clean(ctx.dayDate);
    return {
      id:stableId('stop',[dayDate,sourceSheet,sourceRow,title,place,index],item.id),
      sourceSheet,sourceRow,
      time:clean(item.time),title,place,
      japaneseName:clean(item.japaneseName||item.japanese_name).slice(0,180),address:clean(item.address).slice(0,240),
      type:clean(item.type||'other').toLowerCase().slice(0,40),priority:clean(item.priority||'normal').toLowerCase().slice(0,30),
      reservation:Boolean(item.reservation===true||/^(yes|true|required|booked|paid)$/i.test(String(item.reservation||''))),
      leaveBy:clean(item.leaveBy||item.leave_by).slice(0,30),note:clean(item.note).slice(0,700),reminder:clean(item.reminder).slice(0,700),planB:clean(item.planB||item.plan_b).slice(0,700),
      transitFrom:clean(item.transitFrom||item.transit_from).slice(0,160),transitTo:clean(item.transitTo||item.transit_to).slice(0,160),line:clean(item.line).slice(0,160),platform:clean(item.platform).slice(0,80),exit:clean(item.exit).slice(0,100),busStop:clean(item.busStop||item.bus_stop).slice(0,100),
      guidance:uniq(item.guidance).slice(0,8)
    }
  }
  function normalizeDay(day={},index=0){
    const date=normalizeDate(day.date),sourceSheet=clean(day.sourceSheet||day.source_sheet).slice(0,120);
    return {
      id:stableId('day',[date,sourceSheet,index],day.id),date,
      title:clean(day.title||`Day ${index+1}`).slice(0,180),emoji:clean(day.emoji||'🌸').slice(0,8),sourceSheet,
      route:clean(day.route).slice(0,900),reminder:clean(day.reminder).slice(0,900),planB:clean(day.planB||day.plan_b).slice(0,900),
      guidance:uniq(day.guidance).slice(0,16),weatherSensitive:Boolean(day.weatherSensitive||day.weather_sensitive),
      transitLegs:(Array.isArray(day.transitLegs)?day.transitLegs:Array.isArray(day.transit_legs)?day.transit_legs:[]).map((leg,n)=>normalizeTransitLeg(leg,n,date)).filter(Boolean),
      checklist:(Array.isArray(day.checklist)?day.checklist:[]).map((entry,n)=>normalizeChecklistEntry(entry,n,date)).filter(Boolean),
      items:Array.isArray(day.items)?day.items.map((item,n)=>normalizeItem(item,{dayDate:date,sourceSheet,index:n})).filter(i=>i.title):[],
      phrases:Array.isArray(day.phrases)?day.phrases.map(p=>Array.isArray(p)?[String(p[0]||''),String(p[1]||''),String(p[2]||'')]:[String(p.japanese||''),String(p.romaji||''),String(p.english||'')]).filter(p=>p[0]):[]
    }
  }
  function normalizeExtraEntry(entry,index,section){
    const x=typeof entry==='string'?{label:entry}:entry||{},label=clean(x.label||x.text||x.name).slice(0,240);if(!label)return null;
    return {id:stableId(`extra-${section}`,[section,x.sourceSheet,x.sourceRow,x.group,x.person,label,index],x.id),label,group:clean(x.group).slice(0,100),person:clean(x.person).slice(0,100),amount:clean(x.amount).slice(0,120),status:clean(x.status).slice(0,100),detail:clean(x.detail||x.note).slice(0,600),sourceSheet:clean(x.sourceSheet).slice(0,120),sourceRow:Number(x.sourceRow)||0}
  }
  function normalizeExtras(extras={}){const out={};for(const section of ['budget','packing','shopping','toBook','notes'])out[section]=(Array.isArray(extras?.[section])?extras[section]:[]).map((x,n)=>normalizeExtraEntry(x,n,section)).filter(Boolean);return out}
  function normalizeTrip(raw={}){
    if(raw?.id===EMPTY_ID)return clone(raw);
    const days=Array.isArray(raw.days)?raw.days.map(normalizeDay).filter(d=>d.date):[];days.sort((a,b)=>a.date.localeCompare(b.date));
    const start=normalizeDate(raw.startDate||raw.start_date)||(days[0]?.date||''),end=normalizeDate(raw.endDate||raw.end_date)||(days.at(-1)?.date||start),name=clean(raw.name||raw.trip||'My Trip').slice(0,180)||'My Trip';
    return {id:clean(raw.id||`${slug(name)}-${start||Date.now()}`).slice(0,100),name,destination:clean(raw.destination).slice(0,120),startDate:start,endDate:end,timezone:clean(raw.timezone||'Asia/Tokyo').slice(0,80)||'Asia/Tokyo',hotel:clean(raw.hotel).slice(0,220),source:clean(raw.source||'import').slice(0,40),extras:normalizeExtras(raw.extras),days}
  }

  function parseDateRange(value){const matches=String(value||'').match(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g)||[];return [normalizeDate(matches[0]),normalizeDate(matches[1]||matches[0])]}
  function parseTripPack(text){
    const lines=String(text||'').replace(/\r/g,'').split('\n');if(!lines.some(line=>/^\s*SAKURA\s+(TRIP|DAY)\s+PACK/i.test(line)))throw new Error('This does not look like a Sakura Trip Pack.');
    const trip={name:'My Trip',destination:'',timezone:'Asia/Tokyo',hotel:'',days:[],extras:{budget:[],packing:[],shopping:[],toBook:[],notes:[]},source:'trip-pack'};let day=null,item=null,extraSection='';
    for(const raw of lines){const line=raw.trim();if(!line||/^SAKURA\s+(TRIP|DAY)\s+PACK/i.test(line))continue;let m;
      if((m=line.match(/^Trip\s*:\s*(.+)$/i))){trip.name=m[1].trim();continue}if((m=line.match(/^Destination\s*:\s*(.+)$/i))){trip.destination=m[1].trim();continue}if((m=line.match(/^Dates?\s*:\s*(.+)$/i))){[trip.startDate,trip.endDate]=parseDateRange(m[1]);continue}if((m=line.match(/^Timezone\s*:\s*(.+)$/i))){trip.timezone=m[1].trim();continue}if((m=line.match(/^Hotel\s*:\s*(.+)$/i))){trip.hotel=m[1].trim();continue}
      if((m=line.match(/^EXTRAS\s*\|\s*(budget|packing|shopping|toBook|notes)$/i))){day=null;item=null;extraSection=({tobook:'toBook'}[m[1].toLowerCase()]||m[1].toLowerCase());continue}
      if(extraSection&&(m=line.match(/^EXTRA\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*(.*)$/i))){trip.extras[extraSection].push({id:m[1].trim(),group:m[2].trim(),person:m[3].trim(),label:m[4].trim(),detail:m[5].trim()});continue}
      if((m=line.match(/^DAY\s+(\d+)?\s*\|\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})(?:\s*\|\s*(.+))?$/i))){extraSection='';day={date:normalizeDate(m[2]),title:(m[3]||`Day ${m[1]||trip.days.length+1}`).trim(),items:[],phrases:[],guidance:[],transitLegs:[],checklist:[]};trip.days.push(day);item=null;continue}
      if(!day)continue;
      if((m=line.match(/^Day ID\s*:\s*(.+)$/i))){day.id=m[1].trim();continue}if((m=line.match(/^Title\s*:\s*(.+)$/i))&&!item){day.title=m[1].trim();continue}if((m=line.match(/^Route\s*:\s*(.+)$/i))&&!item){day.route=m[1].trim();continue}if((m=line.match(/^Reminder\s*:\s*(.+)$/i))&&!item){day.reminder=m[1].trim();continue}if((m=line.match(/^Plan\s*B\s*:\s*(.+)$/i))&&!item){day.planB=m[1].trim();continue}if((m=line.match(/^Weather Sensitive\s*:\s*(.+)$/i))){day.weatherSensitive=/yes|true|1/i.test(m[1]);continue}if((m=line.match(/^Guidance\s*:\s*(.+)$/i))){day.guidance.push(m[1].trim());continue}if((m=line.match(/^Transit\s*:\s*(.+?)\s*→\s*(.+?)(?:\s*\|\s*(.*))?$/i))){day.transitLegs.push({from:m[1].trim(),to:m[2].trim(),note:(m[3]||'').trim()});continue}if((m=line.match(/^Checklist\s*:\s*([^|]+)\|\s*(.+)$/i))){day.checklist.push({kind:m[1].trim(),text:m[2].trim()});continue}
      if((m=line.match(/^([~]?\d{1,2}:\d{2}|Anytime|Morning|Afternoon|Evening)\s*\|\s*(.+)$/i))){item={time:m[1],title:m[2].trim()};day.items.push(item);continue}
      if((m=line.match(/^IMPORTANT\s*:\s*(.+)$/i))){if(item)item.reminder=m[1].trim();else day.reminder=m[1].trim();continue}if(!item)continue;
      if((m=line.match(/^Stop ID\s*:\s*(.+)$/i))){item.id=m[1].trim();continue}if((m=line.match(/^Source\s*:\s*(.*?)\s*\|\s*(\d+)$/i))){item.sourceSheet=m[1].trim();item.sourceRow=Number(m[2]);continue}if((m=line.match(/^Type\s*:\s*(.+)$/i))){item.type=m[1].trim();continue}if((m=line.match(/^Place\s*:\s*(.+)$/i))){item.place=m[1].trim();continue}if((m=line.match(/^(?:Japanese|Japanese name)\s*:\s*(.+)$/i))){item.japaneseName=m[1].trim();continue}if((m=line.match(/^Address\s*:\s*(.+)$/i))){item.address=m[1].trim();continue}if((m=line.match(/^Priority\s*:\s*(.+)$/i))){item.priority=m[1].trim();continue}if((m=line.match(/^Reservation\s*:\s*(.+)$/i))){item.reservation=/yes|true|required|booked|paid/i.test(m[1]);continue}if((m=line.match(/^Leave\s*by\s*:\s*(.+)$/i))){item.leaveBy=m[1].trim();continue}if((m=line.match(/^Note\s*:\s*(.+)$/i))){item.note=m[1].trim();continue}if((m=line.match(/^Reminder\s*:\s*(.+)$/i))){item.reminder=m[1].trim();continue}if((m=line.match(/^Plan\s*B\s*:\s*(.+)$/i))){item.planB=m[1].trim();continue}if((m=line.match(/^Transit From\s*:\s*(.+)$/i))){item.transitFrom=m[1].trim();continue}if((m=line.match(/^Transit To\s*:\s*(.+)$/i))){item.transitTo=m[1].trim();continue}if((m=line.match(/^Line\s*:\s*(.+)$/i))){item.line=m[1].trim();continue}if((m=line.match(/^Platform\s*:\s*(.+)$/i))){item.platform=m[1].trim();continue}if((m=line.match(/^Exit\s*:\s*(.+)$/i))){item.exit=m[1].trim();continue}if((m=line.match(/^Bus Stop\s*:\s*(.+)$/i))){item.busStop=m[1].trim();continue}
    }
    const normalized=normalizeTrip(trip);if(!normalized.days.length)throw new Error('I could not find any dated days in this Trip Pack.');return normalized
  }

  function aiConfig(){const c=window.SAKURA_AI_CONFIG||{};const endpoint=String(c.endpoint||'').replace(/\/sakura-ai-translator(?:\?.*)?$/,'/sakura-trip-parser');return {endpoint,key:c.gatewayKey||c.publishableKey||''}}
  async function parseWithAI(text){const cfg=aiConfig();if(!cfg.endpoint||!cfg.key)throw new Error('Sakura itinerary understanding is unavailable right now.');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);try{const response=await fetch(cfg.endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key},body:JSON.stringify({text:String(text||'').slice(0,18000)}),signal:controller.signal});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Could not understand itinerary (${response.status}).`);const trip=normalizeTrip(data.trip||data);if(!trip.days.length)throw new Error('Sakura understood the text, but no dated itinerary days were found.');return trip}finally{clearTimeout(timer)}}
  async function understand(text){const raw=String(text||'').trim();if(!raw)throw new Error('Paste an itinerary first.');if(/^\s*SAKURA\s+(TRIP|DAY)\s+PACK/im.test(raw))return parseTripPack(raw);return parseWithAI(raw)}

  function tripMatch(imported,trips=loadTrips()){if(imported.id&&trips.some(t=>t.id===imported.id))return trips.find(t=>t.id===imported.id);if(imported.days?.length===1){const date=imported.days[0].date,containing=trips.find(t=>t.days?.some(d=>d.date===date));if(containing)return containing}const compact=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'');return trips.find(t=>imported.startDate&&imported.endDate&&t.startDate===imported.startDate&&t.endDate===imported.endDate)||trips.find(t=>compact(t.name)===compact(imported.name))||null}
  function mergeEntries(a=[],b=[]){const map=new Map();for(const x of a)map.set(x.id||hash(JSON.stringify(x)),x);for(const x of b)map.set(x.id||hash(JSON.stringify(x)),x);return [...map.values()]}
  function mergeDay(existing,incoming){const map=new Map((existing.items||[]).map(item=>[item.id||`${item.time}|${item.title}`.toLowerCase(),item]));for(const item of incoming.items||[])map.set(item.id||`${item.time}|${item.title}`.toLowerCase(),item);return normalizeDay({...existing,...incoming,items:[...map.values()].sort((a,b)=>(timeMinutes(a.time)??9999)-(timeMinutes(b.time)??9999)),guidance:uniq([...(existing.guidance||[]),...(incoming.guidance||[])]),transitLegs:mergeEntries(existing.transitLegs,incoming.transitLegs),checklist:mergeEntries(existing.checklist,incoming.checklist)},0)}
  function mergeExtras(existing={},incoming={}){const out={};for(const section of ['budget','packing','shopping','toBook','notes'])out[section]=mergeEntries(existing?.[section],incoming?.[section]);return out}
  function applyImport(imported,mode='add'){
    imported=normalizeTrip(imported);const trips=loadTrips().filter(t=>t?.id!==EMPTY_ID),match=tripMatch(imported,trips);
    if(!match){const id=imported.id&&!trips.some(t=>t.id===imported.id)?imported.id:`${slug(imported.name)}-${imported.startDate||Date.now()}`;trips.push({...imported,id});saveTrips(trips);setActiveTrip(id);return id}
    const index=trips.findIndex(t=>t.id===match.id);
    if(imported.days.length===1&&match.days.some(d=>d.date===imported.days[0].date)){const date=imported.days[0].date,dayIndex=match.days.findIndex(d=>d.date===date),next=clone(match);next.days[dayIndex]=mode==='merge-day'?mergeDay(next.days[dayIndex],imported.days[0]):imported.days[0];trips[index]=normalizeTrip({...next,id:match.id,source:'import'})}
    else if(mode==='merge-trip'){const next=clone(match),byDate=new Map(next.days.map(d=>[d.date,d]));for(const d of imported.days)byDate.set(d.date,byDate.has(d.date)?mergeDay(byDate.get(d.date),d):d);trips[index]=normalizeTrip({...next,...imported,id:match.id,days:[...byDate.values()],extras:mergeExtras(next.extras,imported.extras),source:'import'})}
    else trips[index]=normalizeTrip({...imported,id:match.id,source:'import'});
    saveTrips(trips);setActiveTrip(match.id);return match.id
  }

  function getTripDay(trip,date){return trip?.days?.find(d=>d.date===date)||null}
  function currentDayIndex(trip){if(!trip)return 0;const today=dateKeyInTimezone(trip.timezone||'Asia/Tokyo'),live=trip.days.findIndex(d=>d.date===today);if(live>=0)return live;const saved=Number(localStorage.getItem(PREVIEW_DAY_PREFIX+trip.id));return Number.isInteger(saved)&&saved>=0&&saved<trip.days.length?saved:0}
  function isTripLive(trip){if(!trip?.startDate||!trip?.endDate)return false;const today=dateKeyInTimezone(trip.timezone||'Asia/Tokyo');return today>=trip.startDate&&today<=trip.endDate}
  function summaryItems(day,trip){const items=day?.items||[];if(!items.length)return [null,null];if(isTripLive(trip)&&day.date===dateKeyInTimezone(trip.timezone||'Asia/Tokyo')){const now=minutesNow(trip.timezone||'Asia/Tokyo'),future=items.filter(i=>timeMinutes(i.time)!==null&&timeMinutes(i.time)>=now);if(future.length)return [future[0],future[1]||items.at(-1)]}const first=items[0],key=items.find((i,index)=>index>0&&(i.priority==='critical'||i.reservation))||items[1]||items.at(-1);return [first,key]}
  function dayReminder(day){return day.reminder||day.items?.find(i=>i.reminder)?.reminder||day.items?.find(i=>i.priority==='critical')?.note||'Keep the day flexible and protect fixed-time reservations.'}
  function dayPlanB(day){return day.planB||day.items?.find(i=>i.planB)?.planB||'If the day slips, protect fixed reservations first and trim optional stops.'}
  function dayRoute(day){if(day.route)return day.route;const names=(day.items||[]).map(i=>i.place||i.title).filter(Boolean);return names.slice(0,7).join(' → ')}
  function defaultPhrases(day){const types=new Set((day.items||[]).map(i=>i.type)),phrases=[];if((day.items||[]).some(i=>i.reservation))phrases.push(['予約しています。','Yoyaku shiteimasu.','I have a reservation.']);if(types.has('transport'))phrases.push(['この電車で合っていますか？','Kono densha de atteimasu ka?','Is this the right train?']);if(types.has('shopping'))phrases.push(['これは在庫がありますか？','Kore wa zaiko ga arimasu ka?','Is this in stock?']);if(types.has('food'))phrases.push(['おすすめは何ですか？','Osusume wa nan desu ka?','What do you recommend?']);phrases.push(['すみません、ちょっと教えていただけますか？','Sumimasen, chotto oshiete itadakemasu ka?','Excuse me, could you help me for a moment?']);return phrases.slice(0,3)}

  function migrateStoredTrips(){const raw=rawTrips();if(!raw?.length)return;const next=raw.map(t=>t?.id===EMPTY_ID?t:normalizeTrip(t));try{if(JSON.stringify(next)!==JSON.stringify(raw))localStorage.setItem(TRIPS_KEY,JSON.stringify(next))}catch{}}

  window.SakuraTripStore=Object.freeze({version:2,keys:Object.freeze({TRIPS_KEY,ACTIVE_TRIP_KEY,PREVIEW_DAY_PREFIX}),clone,hash,loadTrips,saveTrips,getTrips,selectedTrip,setActiveTrip,liveTrip,upcomingTrip,currentTrip,normalizeTrip,normalizeDay,normalizeItem,normalizeExtras,parseTripPack,understand,tripMatch,applyImport,getTripDay,currentDayIndex,isTripLive,summaryItems,dayReminder,dayPlanB,dayRoute,defaultPhrases,dateKeyInTimezone,dayLabel,seedTrip:()=>clone(SEED_TRIP),migrateStoredTrips});
  migrateStoredTrips();loadTrips();
}());
