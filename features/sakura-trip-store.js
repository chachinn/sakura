/* Sakura Trip Store + Smart Itinerary Import v1 */
(function initializeSakuraTripStore(){
  'use strict';
  if(window.SakuraTripStore?.version>=1)return;
  const TRIPS_KEY='sakuraTripsV1';
  const ACTIVE_TRIP_KEY='sakuraActiveTripIdV1';
  const PREVIEW_DAY_PREFIX='sakuraTripPreviewDayV1:';
  const OCTOBER_TRIP_ID='japan-october-2026';
  const SEED_TRIP=window.SAKURA_TRIP_SEED_OCTOBER_2026;
  if(!SEED_TRIP){console.warn('Sakura trip seed was not available.');return;}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function slug(value){return String(value||'trip').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'trip';}
  function normalizeDate(value){
    const s=String(value||'').trim();
    const m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if(!m)return '';
    return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  }
  function dayLabel(date){
    try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));}
    catch{return date;}
  }
  function dateKeyInTimezone(timezone='Asia/Tokyo'){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }
  function minutesNow(timezone='Asia/Tokyo'){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return Number(map.hour)*60+Number(map.minute);
  }
  function timeMinutes(value){
    const m=String(value||'').match(/(\d{1,2}):(\d{2})/);
    if(!m)return null;
    const n=Number(m[1])*60+Number(m[2]);
    return Number.isFinite(n)?n:null;
  }

  function loadTrips(){
    try{
      const parsed=JSON.parse(localStorage.getItem(TRIPS_KEY)||'null');
      if(Array.isArray(parsed)&&parsed.length)return parsed;
    }catch{}
    const seeded=[clone(SEED_TRIP)];
    try{localStorage.setItem(TRIPS_KEY,JSON.stringify(seeded));localStorage.setItem(ACTIVE_TRIP_KEY,OCTOBER_TRIP_ID);}catch{}
    return seeded;
  }
  function saveTrips(trips){
    localStorage.setItem(TRIPS_KEY,JSON.stringify(trips));
    document.dispatchEvent(new CustomEvent('sakura:trips-changed'));
  }
  function getTrips(){return loadTrips().map(clone);}
  function selectedTrip(){
    const trips=loadTrips();
    const wanted=localStorage.getItem(ACTIVE_TRIP_KEY);
    return trips.find(t=>t.id===wanted)||trips.find(t=>t.id===OCTOBER_TRIP_ID)||trips[0]||null;
  }
  function setActiveTrip(id){try{localStorage.setItem(ACTIVE_TRIP_KEY,id);}catch{}}
  function liveTrip(){
    const trips=loadTrips();
    return trips.find(trip=>{
      const today=dateKeyInTimezone(trip.timezone||'Asia/Tokyo');
      return trip.startDate&&trip.endDate&&today>=trip.startDate&&today<=trip.endDate;
    })||null;
  }
  function upcomingTrip(){
    const trips=loadTrips();
    const today=dateKeyInTimezone('Asia/Tokyo');
    return trips.filter(t=>t.startDate&&t.startDate>today).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0]||null;
  }
  function currentTrip(){return liveTrip()||selectedTrip()||upcomingTrip();}

  function normalizeItem(item={}){
    return {
      time:String(item.time||'').trim(),
      title:String(item.title||item.place||'Untitled stop').trim().slice(0,160),
      place:String(item.place||'').trim().slice(0,180),
      japaneseName:String(item.japaneseName||item.japanese_name||'').trim().slice(0,180),
      address:String(item.address||'').trim().slice(0,240),
      type:String(item.type||'other').trim().toLowerCase().slice(0,40),
      priority:String(item.priority||'normal').trim().toLowerCase().slice(0,30),
      reservation:Boolean(item.reservation===true||/^(yes|true|required|booked)$/i.test(String(item.reservation||''))),
      leaveBy:String(item.leaveBy||item.leave_by||'').trim().slice(0,30),
      note:String(item.note||'').trim().slice(0,500),
      reminder:String(item.reminder||'').trim().slice(0,500),
      planB:String(item.planB||item.plan_b||'').trim().slice(0,500)
    };
  }
  function normalizeDay(day={},index=0){
    return {
      date:normalizeDate(day.date),
      title:String(day.title||`Day ${index+1}`).trim().slice(0,180),
      emoji:String(day.emoji||'🌸').trim().slice(0,8),
      route:String(day.route||'').trim().slice(0,700),
      reminder:String(day.reminder||'').trim().slice(0,700),
      planB:String(day.planB||day.plan_b||'').trim().slice(0,700),
      items:Array.isArray(day.items)?day.items.map(normalizeItem).filter(i=>i.title):[],
      phrases:Array.isArray(day.phrases)?day.phrases.map(p=>{
        if(Array.isArray(p))return [String(p[0]||''),String(p[1]||''),String(p[2]||'')];
        return [String(p.japanese||''),String(p.romaji||''),String(p.english||'')];
      }).filter(p=>p[0]):[]
    };
  }
  function normalizeTrip(raw={}){
    const days=Array.isArray(raw.days)?raw.days.map(normalizeDay).filter(d=>d.date):[];
    days.sort((a,b)=>a.date.localeCompare(b.date));
    const start=normalizeDate(raw.startDate||raw.start_date)||(days[0]?.date||'');
    const end=normalizeDate(raw.endDate||raw.end_date)||(days.at(-1)?.date||start);
    const name=String(raw.name||raw.trip||'My Trip').trim().slice(0,180)||'My Trip';
    return {
      id:String(raw.id||`${slug(name)}-${start||Date.now()}`).slice(0,100),
      name,
      destination:String(raw.destination||'').trim().slice(0,120),
      startDate:start,
      endDate:end,
      timezone:String(raw.timezone||'Asia/Tokyo').trim().slice(0,80)||'Asia/Tokyo',
      hotel:String(raw.hotel||'').trim().slice(0,220),
      source:String(raw.source||'import').slice(0,30),
      days
    };
  }

  function parseDateRange(value){
    const matches=String(value||'').match(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g)||[];
    return [normalizeDate(matches[0]),normalizeDate(matches[1]||matches[0])];
  }
  function parseTripPack(text){
    const lines=String(text||'').replace(/\r/g,'').split('\n');
    if(!lines.some(line=>/^\s*SAKURA\s+(TRIP|DAY)\s+PACK/i.test(line)))throw new Error('This does not look like a Sakura Trip Pack.');
    const trip={name:'My Trip',destination:'',timezone:'Asia/Tokyo',hotel:'',days:[],source:'trip-pack'};
    let day=null,item=null;
    for(const raw of lines){
      const line=raw.trim();
      if(!line||/^SAKURA\s+(TRIP|DAY)\s+PACK/i.test(line))continue;
      let m;
      if((m=line.match(/^Trip\s*:\s*(.+)$/i))){trip.name=m[1].trim();continue;}
      if((m=line.match(/^Destination\s*:\s*(.+)$/i))){trip.destination=m[1].trim();continue;}
      if((m=line.match(/^Dates?\s*:\s*(.+)$/i))){[trip.startDate,trip.endDate]=parseDateRange(m[1]);continue;}
      if((m=line.match(/^Timezone\s*:\s*(.+)$/i))){trip.timezone=m[1].trim();continue;}
      if((m=line.match(/^Hotel\s*:\s*(.+)$/i))){trip.hotel=m[1].trim();continue;}
      if((m=line.match(/^DAY\s+(\d+)?\s*\|\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})(?:\s*\|\s*(.+))?$/i))){
        day={date:normalizeDate(m[2]),title:(m[3]||`Day ${m[1]||trip.days.length+1}`).trim(),items:[],phrases:[]};
        trip.days.push(day);item=null;continue;
      }
      if(!day)continue;
      if((m=line.match(/^Title\s*:\s*(.+)$/i))&&!item){day.title=m[1].trim();continue;}
      if((m=line.match(/^Route\s*:\s*(.+)$/i))&&!item){day.route=m[1].trim();continue;}
      if((m=line.match(/^Reminder\s*:\s*(.+)$/i))&&!item){day.reminder=m[1].trim();continue;}
      if((m=line.match(/^Plan\s*B\s*:\s*(.+)$/i))&&!item){day.planB=m[1].trim();continue;}
      if((m=line.match(/^([~]?\d{1,2}:\d{2}|Anytime|Morning|Afternoon|Evening)\s*\|\s*(.+)$/i))){
        item={time:m[1],title:m[2].trim()};day.items.push(item);continue;
      }
      if((m=line.match(/^IMPORTANT\s*:\s*(.+)$/i))){
        if(item)item.reminder=m[1].trim(); else day.reminder=m[1].trim();continue;
      }
      if(!item)continue;
      if((m=line.match(/^Type\s*:\s*(.+)$/i))){item.type=m[1].trim();continue;}
      if((m=line.match(/^Place\s*:\s*(.+)$/i))){item.place=m[1].trim();continue;}
      if((m=line.match(/^(?:Japanese|Japanese name)\s*:\s*(.+)$/i))){item.japaneseName=m[1].trim();continue;}
      if((m=line.match(/^Address\s*:\s*(.+)$/i))){item.address=m[1].trim();continue;}
      if((m=line.match(/^Priority\s*:\s*(.+)$/i))){item.priority=m[1].trim();continue;}
      if((m=line.match(/^Reservation\s*:\s*(.+)$/i))){item.reservation=/yes|true|required|booked|paid/i.test(m[1]);continue;}
      if((m=line.match(/^Leave\s*by\s*:\s*(.+)$/i))){item.leaveBy=m[1].trim();continue;}
      if((m=line.match(/^Note\s*:\s*(.+)$/i))){item.note=m[1].trim();continue;}
      if((m=line.match(/^Reminder\s*:\s*(.+)$/i))){item.reminder=m[1].trim();continue;}
      if((m=line.match(/^Plan\s*B\s*:\s*(.+)$/i))){item.planB=m[1].trim();continue;}
    }
    const normalized=normalizeTrip(trip);
    if(!normalized.days.length)throw new Error('I could not find any dated days in this Trip Pack.');
    return normalized;
  }

  function aiConfig(){
    const c=window.SAKURA_AI_CONFIG||{};
    const endpoint=String(c.endpoint||'').replace(/\/sakura-ai-translator(?:\?.*)?$/,'/sakura-trip-parser');
    return {endpoint,key:c.gatewayKey||c.publishableKey||''};
  }
  async function parseWithAI(text){
    const cfg=aiConfig();
    if(!cfg.endpoint||!cfg.key)throw new Error('Sakura itinerary understanding is unavailable right now.');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(cfg.endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':cfg.key},
        body:JSON.stringify({text:String(text||'').slice(0,18000)}),
        signal:controller.signal
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`Could not understand itinerary (${response.status}).`);
      const trip=normalizeTrip(data.trip||data);
      if(!trip.days.length)throw new Error('Sakura understood the text, but no dated itinerary days were found.');
      return trip;
    }finally{clearTimeout(timer);}
  }
  async function understand(text){
    const raw=String(text||'').trim();
    if(!raw)throw new Error('Paste an itinerary first.');
    if(/^\s*SAKURA\s+(TRIP|DAY)\s+PACK/im.test(raw))return parseTripPack(raw);
    return parseWithAI(raw);
  }

  function tripMatch(imported,trips=loadTrips()){
    if(imported.id&&trips.some(t=>t.id===imported.id))return trips.find(t=>t.id===imported.id);
    if(imported.days?.length===1){
      const date=imported.days[0].date;
      const containing=trips.find(t=>t.days?.some(d=>d.date===date));
      if(containing)return containing;
    }
    const compact=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    return trips.find(t=>
      imported.startDate&&imported.endDate&&t.startDate===imported.startDate&&t.endDate===imported.endDate
    )||trips.find(t=>compact(t.name)===compact(imported.name))||null;
  }
  function mergeDay(existing,incoming){
    const map=new Map((existing.items||[]).map(item=>[`${item.time}|${item.title}`.toLowerCase(),item]));
    for(const item of incoming.items||[])map.set(`${item.time}|${item.title}`.toLowerCase(),item);
    return {...existing,...incoming,items:[...map.values()].sort((a,b)=>(timeMinutes(a.time)??9999)-(timeMinutes(b.time)??9999))};
  }
  function applyImport(imported,mode='add'){
    imported=normalizeTrip(imported);
    const trips=loadTrips();
    const match=tripMatch(imported,trips);
    if(!match){
      const id=imported.id&& !trips.some(t=>t.id===imported.id)?imported.id:`${slug(imported.name)}-${imported.startDate||Date.now()}`;
      trips.push({...imported,id});
      saveTrips(trips);setActiveTrip(id);return id;
    }
    const index=trips.findIndex(t=>t.id===match.id);
    if(imported.days.length===1&&match.days.some(d=>d.date===imported.days[0].date)){
      const date=imported.days[0].date;
      const dayIndex=match.days.findIndex(d=>d.date===date);
      const next=clone(match);
      next.days[dayIndex]=mode==='merge-day'?mergeDay(next.days[dayIndex],imported.days[0]):imported.days[0];
      trips[index]=normalizeTrip({...next,id:match.id,source:'import'});
    }else if(mode==='merge-trip'){
      const next=clone(match);
      const byDate=new Map(next.days.map(d=>[d.date,d]));
      for(const d of imported.days)byDate.set(d.date,byDate.has(d.date)?mergeDay(byDate.get(d.date),d):d);
      trips[index]=normalizeTrip({...next,...imported,id:match.id,days:[...byDate.values()],source:'import'});
    }else{
      trips[index]=normalizeTrip({...imported,id:match.id,source:'import'});
    }
    saveTrips(trips);setActiveTrip(match.id);return match.id;
  }

  function getTripDay(trip,date){return trip?.days?.find(d=>d.date===date)||null;}
  function currentDayIndex(trip){
    if(!trip)return 0;
    const today=dateKeyInTimezone(trip.timezone||'Asia/Tokyo');
    const live=trip.days.findIndex(d=>d.date===today);
    if(live>=0)return live;
    const saved=Number(localStorage.getItem(PREVIEW_DAY_PREFIX+trip.id));
    return Number.isInteger(saved)&&saved>=0&&saved<trip.days.length?saved:0;
  }
  function isTripLive(trip){
    if(!trip?.startDate||!trip?.endDate)return false;
    const today=dateKeyInTimezone(trip.timezone||'Asia/Tokyo');
    return today>=trip.startDate&&today<=trip.endDate;
  }
  function summaryItems(day,trip){
    const items=day?.items||[];
    if(!items.length)return [null,null];
    if(isTripLive(trip)&&day.date===dateKeyInTimezone(trip.timezone||'Asia/Tokyo')){
      const now=minutesNow(trip.timezone||'Asia/Tokyo');
      const future=items.filter(i=>timeMinutes(i.time)!==null&&timeMinutes(i.time)>=now);
      if(future.length)return [future[0],future[1]||items.at(-1)];
    }
    const first=items[0];
    const key=items.find((i,index)=>index>0&&(i.priority==='critical'||i.reservation))||items[1]||items.at(-1);
    return [first,key];
  }
  function dayReminder(day){
    return day.reminder||day.items?.find(i=>i.reminder)?.reminder||day.items?.find(i=>i.priority==='critical')?.note||'Keep the day flexible and protect fixed-time reservations.';
  }
  function dayPlanB(day){
    return day.planB||day.items?.find(i=>i.planB)?.planB||'If the day slips, protect fixed reservations first and trim optional stops.';
  }
  function dayRoute(day){
    if(day.route)return day.route;
    const names=(day.items||[]).map(i=>i.place||i.title).filter(Boolean);
    return names.slice(0,7).join(' → ');
  }
  function defaultPhrases(day){
    const types=new Set((day.items||[]).map(i=>i.type));
    const phrases=[];
    if((day.items||[]).some(i=>i.reservation))phrases.push(['予約しています。','Yoyaku shiteimasu.','I have a reservation.']);
    if(types.has('transport'))phrases.push(['この電車で合っていますか？','Kono densha de atteimasu ka?','Is this the right train?']);
    if(types.has('shopping'))phrases.push(['これは在庫がありますか？','Kore wa zaiko ga arimasu ka?','Is this in stock?']);
    if(types.has('food'))phrases.push(['おすすめは何ですか？','Osusume wa nan desu ka?','What do you recommend?']);
    phrases.push(['すみません、ちょっと教えていただけますか？','Sumimasen, chotto oshiete itadakemasu ka?','Excuse me, could you help me for a moment?']);
    return phrases.slice(0,3);
  }

  window.SakuraTripStore=Object.freeze({
    version:1,
    keys:Object.freeze({TRIPS_KEY,ACTIVE_TRIP_KEY,PREVIEW_DAY_PREFIX}),
    clone,
    loadTrips,
    saveTrips,
    getTrips,
    selectedTrip,
    setActiveTrip,
    liveTrip,
    upcomingTrip,
    currentTrip,
    normalizeTrip,
    parseTripPack,
    understand,
    tripMatch,
    applyImport,
    getTripDay,
    currentDayIndex,
    isTripLive,
    summaryItems,
    dayReminder,
    dayPlanB,
    dayRoute,
    defaultPhrases,
    dateKeyInTimezone,
    dayLabel,
    seedTrip:()=>clone(SEED_TRIP)
  });
  loadTrips();
}());
