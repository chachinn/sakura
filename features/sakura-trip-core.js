/* Sakura Trip Companion Core v1 — deterministic helpers shared by Travel UI and QA. */
(function initializeSakuraTripCore(global){
  'use strict';
  if(global.SakuraTripCore?.version>=1)return;

  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const compact=value=>clean(value).toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const fnv=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0)||0;h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
  const genericDestination=/\b(morning prep|breakfast\s*\|\s*place|place\s*\|\s*time|prep\b|free time|buffer|travel to|walk to|return to|head to|depart(?:ure)?|check[- ]?out|pack(?:ing)?|get ready|rest(?: at hotel)?|hotel rest|downtime)\b/i;
  const transportOnly=/\b(train|rail|bus|metro|subway|taxi|walk|transfer|station|platform|n['’]?ex|narita express)\b/i;
  const explicitPlace=/\b(temple|shrine|museum|cafe|café|restaurant|hall|expo|park|garden|market|mall|store|shop|castle|tower|aquarium|zoo|hotel|airport|station|beach|cave|island|street|center|centre|theater|theatre|salon|bar)\b/i;

  function baseItemSignature(item,date=''){
    const title=compact(item?.title||item?.place||'stop');
    const place=compact(item?.place||item?.address||'');
    return `${date}|${title}|${place}`;
  }
  function assignStableIds(day){
    const seen=new Map();
    return (day?.items||[]).map((item,index)=>{
      if(item?.id)return {...item,id:String(item.id)};
      const base=baseItemSignature(item,day?.date||'');
      const count=(seen.get(base)||0)+1;seen.set(base,count);
      return {...item,id:`stop-${fnv(`${base}|${count}`)}`};
    });
  }
  function upgradeTrip(trip){
    if(!trip||typeof trip!=='object')return trip;
    return {...trip,days:(trip.days||[]).map(day=>({...day,items:assignStableIds(day)}))};
  }
  function destinationScore(item){
    if(!item)return -999;
    const title=clean(item.title),place=clean(item.place),address=clean(item.address),jp=clean(item.japaneseName);
    const text=`${title} ${place}`;
    if(!title&&!place&&!address&&!jp)return -999;
    let score=0;
    if(address)score+=9;if(jp)score+=7;if(place)score+=6;
    if(explicitPlace.test(text))score+=5;
    if(item.reservation)score+=3;
    if(['food','shopping','attraction','event','hotel','other'].includes(String(item.type||'').toLowerCase()))score+=1;
    if(genericDestination.test(text)&&!place&&!address&&!jp)score-=14;
    if(transportOnly.test(title)&&!place&&!address&&!jp)score-=8;
    if(/[|]/.test(title)&&/place|time/i.test(title))score-=12;
    return score;
  }
  function destinationItems(day){return (day?.items||[]).map((item,index)=>({item,index,score:destinationScore(item)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index)}
  function bestDestination(day,{nowMinutes=null}={}){
    const candidates=destinationItems(day);if(!candidates.length)return null;
    if(Number.isFinite(nowMinutes)){
      const timed=candidates.filter(x=>{const m=String(x.item.time||'').match(/(\d{1,2}):(\d{2})/);if(!m)return false;return Number(m[1])*60+Number(m[2])>=nowMinutes-20}).sort((a,b)=>{
        const tm=i=>{const m=String(i.item.time||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):9999};return tm(a)-tm(b)});
      if(timed[0])return timed[0];
    }
    return candidates.sort((a,b)=>a.index-b.index)[0]||null;
  }
  function chunks(value){return clean(value).split(/\s*[•\n]\s*|(?<=[.!?])\s+/).map(clean).filter(Boolean)}
  function guidanceLines(day){
    const all=[day?.route,day?.reminder,...(day?.items||[]).flatMap(i=>[i.note,i.reminder])].filter(Boolean).flatMap(chunks);
    const strong=/(\b(?:platform|bus stop|bound for|get off|transfer at|take bus|do not take|don't take|south exit|east exit|west exit|north exit|exit \d|exit [A-Z]\d?)\b|武\d+|乗り場|番線|南口|東口|西口|北口)/i;
    const falsePositive=/(near .* exit|option near|shop near|cafe near|café near|restaurant near|brand option)/i;
    return [...new Set(all.filter(x=>strong.test(x)&&!falsePositive.test(x)))].slice(0,10);
  }
  function checklistLines(day){
    const out=[];const action=/\b(bring|carry|keep|save|pack|pickup|pick up|collect|buy|reserve|book|do not throw|don't throw|have .* ready|passport|ticket stub|ticket pickup)\b/i;
    const completed=/\b(already paid|already booked|already reserved|secured|no longer needed|not needed|removed|done)\b/i;
    const routeNoise=/\b(station|platform|yamanote|train|walk to|travel to|transfer|recommended route|step \d)\b/i;
    for(const item of day?.items||[]){
      if(/shop|shopping|merch|souvenir/i.test(item.type||''))out.push(`Buy / visit: ${clean(item.title)}`);
      for(const text of [item.reminder,item.note].filter(Boolean).flatMap(chunks))if(action.test(text)&&!completed.test(text)&&!(routeNoise.test(text)&&!/(ticket|passport|stub|pickup|bring|keep)/i.test(text)))out.push(text);
    }
    for(const text of [day?.reminder].filter(Boolean).flatMap(chunks))if(action.test(text)&&!completed.test(text)&&!(routeNoise.test(text)&&!/(ticket|passport|stub|pickup|bring|keep)/i.test(text)))out.push(text);
    return [...new Set(out.map(clean).filter(Boolean))].slice(0,12);
  }
  function diffTrip(oldTrip,newTrip){
    const changes=[];const oldDays=new Map((oldTrip?.days||[]).map(d=>[d.date,d])),newDays=new Map((newTrip?.days||[]).map(d=>[d.date,d]));
    for(const [date,d] of newDays)if(!oldDays.has(date))changes.push({kind:'added',label:`Added day · ${date} · ${d.title}`});
    for(const [date,d] of oldDays)if(!newDays.has(date))changes.push({kind:'removed',label:`Removed day · ${date} · ${d.title}`});
    for(const [date,nextDay] of newDays){
      const prevDay=oldDays.get(date);if(!prevDay)continue;
      if(clean(prevDay.title)!==clean(nextDay.title))changes.push({kind:'changed',label:`${date} day title · ${prevDay.title} → ${nextDay.title}`});
      const prevItems=assignStableIds(prevDay),nextItems=assignStableIds(nextDay),prevBySig=new Map(prevItems.map(i=>[baseItemSignature(i,date),i])),nextBySig=new Map(nextItems.map(i=>[baseItemSignature(i,date),i]));
      for(const [sig,item] of nextBySig){const before=prevBySig.get(sig);if(!before){changes.push({kind:'added',label:`${date} added · ${item.time||'Anytime'} ${item.title}`});continue}const fields=['time','place','address','note','reminder','planB'];const changed=fields.filter(k=>clean(before[k])!==clean(item[k]));if(Boolean(before.reservation)!==Boolean(item.reservation))changed.push('reservation');if(changed.length)changes.push({kind:'changed',label:`${date} changed · ${item.title} · ${changed.join(', ')}`})}
      for(const [sig,item] of prevBySig)if(!nextBySig.has(sig))changes.push({kind:'removed',label:`${date} removed · ${item.time||'Anytime'} ${item.title}`});
    }
    return changes;
  }
  function extractWorkbookExtras(workbook){
    const result={packing:[],budget:[],shopping:[],booking:[],notes:[]};
    const keyFor=role=>role==='packing'?'packing':role==='budget'?'budget':role==='shopping'?'shopping':role==='booking_tasks'?'booking':role==='notes'?'notes':null;
    for(const sheet of workbook?.sheets||[]){const key=keyFor(sheet.role);if(!key)continue;for(const row of sheet.rows||[]){const text=clean(row.text);if(!text)continue;if(/^(packing|budget|shopping|pasalubong|to book|notes?|item|description|category|status|estimated)/i.test(text)&&text.length<80)continue;result[key].push({sheet:sheet.name,row:row.row,text})}}
    for(const key of Object.keys(result)){const seen=new Set();result[key]=result[key].filter(x=>{const c=compact(x.text);if(!c||seen.has(c))return false;seen.add(c);return true}).slice(0,80)}
    return result;
  }

  global.SakuraTripCore=Object.freeze({version:1,clean,compact,stableHash:fnv,baseItemSignature,assignStableIds,upgradeTrip,destinationScore,destinationItems,bestDestination,guidanceLines,checklistLines,diffTrip,extractWorkbookExtras});
})(typeof window!=='undefined'?window:globalThis);
