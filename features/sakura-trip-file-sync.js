/* Sakura Trip File + Google Sheet Sync v1 — resilient local-first import and safe resync. */
(function initializeSakuraTripFileSync(){
  'use strict';
  if(window.SakuraTripFileSync?.version>=1)return;

  const META_KEY='sakuraTripSourceMetaV1';
  const AI_TIMEOUT_MS=12000;
  const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  let pendingSource=null;
  let pendingResult=null;
  let decorating=false;

  const S=()=>window.SakuraTripStore;
  const V1=()=>window.SakuraTripFileImport;
  const root=()=>document.getElementById('sakura-trip-companion');
  const main=()=>root()?.querySelector('[data-main]');
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const compact=v=>clean(v).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const uniq=list=>[...new Set((list||[]).map(clean).filter(Boolean))];

  function css(){
    if(document.getElementById('sakura-trip-file-sync-style'))return;
    const style=document.createElement('style');
    style.id='sakura-trip-file-sync-style';
    style.textContent=`
      #sakura-trip-companion .stfs-choice{display:grid;gap:9px}
      #sakura-trip-companion .stfs-choice button{width:100%;min-height:64px;padding:12px;border:1px solid var(--color-border);border-radius:15px;background:var(--color-background);color:inherit;text-align:left;display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center}
      #sakura-trip-companion .stfs-choice button i{font-style:normal;font-size:23px;text-align:center}
      #sakura-trip-companion .stfs-choice button strong{display:block;font-size:13px}
      #sakura-trip-companion .stfs-choice button small{display:block;margin-top:3px;color:var(--color-text-muted);font-size:10px;line-height:1.35}
      #sakura-trip-companion .stfs-link-form{display:grid;gap:9px}
      #sakura-trip-companion .stfs-link-form input{width:100%;min-height:46px;padding:10px 11px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-background);color:inherit;font:inherit;font-size:11px;outline:none}
      #sakura-trip-companion .stfs-link-form input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--color-primary) 14%,transparent)}
      #sakura-trip-companion .stfs-progress{display:grid;gap:8px;margin-top:10px}
      #sakura-trip-companion .stfs-progress div{padding:10px 11px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-background);color:var(--color-text-muted);font-size:10px;line-height:1.4}
      #sakura-trip-companion .stfs-progress div.on{background:var(--color-primary-soft);border-color:color-mix(in srgb,var(--color-primary) 28%,var(--color-border));color:var(--color-primary-dark);font-weight:850}
      #sakura-trip-companion .stfs-progress div.done::before{content:'✓ ';font-weight:950}
      #sakura-trip-companion .stfs-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
      #sakura-trip-companion .stfs-stat{padding:10px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-background)}
      #sakura-trip-companion .stfs-stat b{display:block;font-size:18px;color:var(--color-primary-dark)}
      #sakura-trip-companion .stfs-stat span{display:block;margin-top:2px;color:var(--color-text-muted);font-size:9px;line-height:1.25}
      #sakura-trip-companion .stfs-banner{margin-top:10px;padding:10px 11px;border-radius:13px;background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:10px;line-height:1.45}
      #sakura-trip-companion .stfs-review{margin-top:10px;padding:10px 11px;border-radius:13px;background:#fff6d9;color:#705914;font-size:10px;line-height:1.45}
      #sakura-trip-companion .stfs-file{display:none}
      #sakura-trip-companion .stfs-resync{background:var(--color-primary-soft);border-color:color-mix(in srgb,var(--color-primary) 25%,var(--color-border))}
      @media(max-width:360px){#sakura-trip-companion .stfs-summary{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function setHeader(title,kicker='My Trips'){
    const r=root();if(!r)return;
    const small=r.querySelector('.stc-title small'),strong=r.querySelector('.stc-title strong');
    if(small)small.textContent=kicker;
    if(strong)strong.textContent=title;
    const days=r.querySelector('[data-days]');if(days)days.hidden=true;
  }

  function loadMeta(){
    try{const value=JSON.parse(localStorage.getItem(META_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}
  }
  function saveMeta(map){try{localStorage.setItem(META_KEY,JSON.stringify(map))}catch{}}
  function activeTripId(){return localStorage.getItem(S()?.keys?.ACTIVE_TRIP_KEY||'sakuraActiveTripIdV1')||S()?.selectedTrip?.()?.id||''}
  function getSource(tripId){return loadMeta()[tripId]||null}
  function setSource(tripId,source){
    if(!tripId||!source)return;
    const map=loadMeta();map[tripId]={...source,lastSynced:new Date().toISOString()};saveMeta(map);
  }

  function tripsView(){root()?.querySelector('[data-trips]')?.click()}
  function openNativePaste(){
    const r=root();if(!r)return;
    const temp=document.createElement('button');temp.type='button';temp.hidden=true;temp.dataset.import='1';
    r.appendChild(temp);temp.click();temp.remove();
  }

  function showAddMenu(){
    css();pendingResult=null;pendingSource=null;setHeader('Add Trip');
    const m=main();if(!m)return;
    m.innerHTML=`<section class="stc-card">
      <div class="stc-kicker">Add trip</div><h3>How do you want to add it?</h3>
      <div class="stfs-choice">
        <button type="button" data-stfs-paste><i>📋</i><span><strong>Paste Itinerary</strong><small>Paste a Sakura Trip Pack or ordinary itinerary text.</small></span></button>
        <button type="button" data-stfs-file-button><i>📁</i><span><strong>Import Excel File</strong><small>Choose an .xlsx itinerary from Files, iCloud Drive or Downloads.</small></span></button>
        <button type="button" data-stfs-google><i>🔗</i><span><strong>Google Sheets Link</strong><small>Connect a viewable Google Sheet once, then resync it whenever you update the itinerary.</small></span></button>
      </div>
      <input class="stfs-file" data-stfs-file type="file" accept=".xlsx,${XLSX_MIME}">
      <div class="stfs-banner"><b>Local-first import.</b> Sakura builds a usable trip from workbook structure first. Gemini only enriches it; if AI is slow, the import still continues.</div>
      <div class="stc-actions"><button type="button" data-stfs-back>Back</button></div>
    </section>`;
  }

  function showGoogleLink(){
    setHeader('Google Sheets Link');const m=main();if(!m)return;
    m.innerHTML=`<section class="stc-card">
      <div class="stc-kicker">Connect itinerary</div><h3>Paste your Google Sheets link</h3>
      <div class="stfs-link-form"><input data-stfs-url type="url" inputmode="url" autocomplete="off" placeholder="https://docs.google.com/spreadsheets/d/…"></div>
      <div class="stfs-banner"><b>For this version:</b> the sheet must be shared as <b>Anyone with the link · Viewer</b>. Sakura never edits your Google Sheet; it only reads the latest version when you import or resync.</div>
      <div class="stc-status" data-stfs-link-status></div>
      <div class="stc-actions"><button type="button" data-stfs-menu>Back</button><button type="button" class="primary" data-stfs-import-link>Import Google Sheet</button></div>
    </section>`;
    setTimeout(()=>root()?.querySelector('[data-stfs-url]')?.focus(),0);
  }

  function showProgress(label,sourceType='file'){
    setHeader(sourceType==='google-sheet'?'Sync Google Sheet':'Import Itinerary File');const m=main();if(!m)return;
    m.innerHTML=`<section class="stc-card">
      <div class="stc-kicker">Smart itinerary import</div><h3>${sourceType==='google-sheet'?'Reading the latest sheet…':'Reading your itinerary…'}</h3>
      <div class="stc-muted">${esc(label)}</div>
      <div class="stfs-progress">
        <div class="on" data-stfs-step="read">${sourceType==='google-sheet'?'Downloading the latest workbook…':'Reading workbook locally…'}</div>
        <div data-stfs-step="structure">Building a local trip from dates, schedules, reservations and warnings…</div>
        <div data-stfs-step="ai">Optional AI enrichment…</div>
      </div><div class="stc-status busy" data-stfs-status>Starting…</div>
    </section>`;
  }

  function setStep(name,text,done=false){
    const r=root();if(!r)return;const el=r.querySelector(`[data-stfs-step="${name}"]`);if(el){el.classList.add('on');if(done)el.classList.add('done')}
    const status=r.querySelector('[data-stfs-status]');if(status&&text)status.textContent=text;
  }

  function showError(error,back='menu'){
    setHeader('Itinerary Import');const m=main();if(!m)return;
    m.innerHTML=`<section class="stc-card"><div class="stc-kicker">Could not import</div><h3>This source needs another look</h3>
      <div class="stc-status bad">${esc(error?.message||'Sakura could not read this itinerary.')}</div>
      <div class="stc-actions"><button type="button" data-stfs-${back==='google'?'google':'menu'}>Back</button></div></section>`;
  }

  const MONTHS={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,september:9,sept:9,sep:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
  function md(value){const m=clean(value).match(/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i);return m?{month:MONTHS[m[1].toLowerCase()],day:Number(m[2])}:null}
  function yearOf(workbook){const text=[workbook.fileName,...workbook.sheets.map(s=>s.name),...workbook.sheets.slice(0,4).flatMap(s=>s.rows.slice(0,3).map(r=>r.text))].join(' ');return Number(text.match(/\b(20\d{2})\b/)?.[1]||new Date().getFullYear())}
  function iso(year,x){return x?`${year}-${String(x.month).padStart(2,'0')}-${String(x.day).padStart(2,'0')}`:''}
  function datesIn(value,year){const out=[];const re=/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/ig;let m;while((m=re.exec(clean(value))))out.push(iso(year,{month:MONTHS[m[1].toLowerCase()],day:Number(m[2])}));return uniq(out)}
  function timeIn(value){const m=clean(value).match(/(?:^|[^\d])(~?\d{1,2}:\d{2})(?!\d)/);return m?m[1]:''}
  function scheduled(value){const text=clean(value);const m=text.match(/(?:^|[^\d])(~?\d{1,2}:\d{2})(?:\s*[–—-]\s*~?\d{1,2}:\d{2})?\s*[–—-]\s*(.+)$/);return m?{time:m[1],title:clean(m[2]).replace(/^[^\p{L}\p{N}]+/u,'')}:null}
  function warningLike(text){return /\b(do not|don't|dont|must|important|required|reserve|reservation|paid|pending|keep|bring|ticket|stub|protect|recheck|reconfirm|warning|avoid|have tickets ready|arrive \d|nothing else)\b/i.test(text)}
  function transitLike(text){return /\b(from:|train:|line\b|station\b|platform\b|exit\b|bus\b|bus stop|bound for|get off|transfer\b|walk\b|n['’]?ex|narita express)\b|武\d+|乗り場|番線|南口|東口|西口|北口/i.test(text)}
  function planBLike(text){return /\b(plan b|fallback|if .*behind|if .*tired|if .*delay|taxi|weather|rain|storm|cancelled|canceled|optional if)\b/i.test(text)}
  function isNoise(text){return /\b(budget|estimated cost|couple fare|shopping budget|allowance|total \(couple\))\b|¥|₱/i.test(text)}

  function dayInfo(sheet,year){
    const date=iso(year,md(sheet.name)||md(sheet.rows[0]?.text||''));
    let title=clean(sheet.rows[0]?.text||sheet.name).replace(/^[^\p{L}\p{N}]+/u,'').replace(/^Day\s*\d+\s*[–—-]\s*/i,'').replace(/\([^)]*\)\s*$/,'').trim();
    if(!title)title=sheet.name.replace(/^Day\s*\d+\s*/i,'').trim();
    const items=[],warnings=[],planBs=[],transit=[],allText=[];
    for(const row of sheet.rows){
      const text=clean(row.text);if(!text)continue;allText.push(text);
      const item=scheduled(text);if(item&&item.title&&!isNoise(item.title))items.push({...item,sourceRow:row.row});
      if(warningLike(text))warnings.push(text);
      if(planBLike(text))planBs.push(text);
      if(transitLike(text)&&!isNoise(text))transit.push(text);
    }
    warnings.sort((a,b)=>Number(!/\bdo not\b|don't|dont|must/i.test(a))-Number(!/\bdo not\b|don't|dont|must/i.test(b)));
    return {sheet,date,title,items,warnings:uniq(warnings),planBs:uniq(planBs),transit:uniq(transit),allText};
  }

  function reservationRows(sheet,year){
    if(!sheet?.rows?.length)return[];
    const header=sheet.rows[0].cells||[];
    const findCol=needle=>header.find(c=>compact(c.value).includes(needle))?.column;
    const cols={name:findCol('reservation'),date:findCol('date'),type:findCol('type'),status:findCol('status'),needs:findCol('needs booking'),action:findCol('what to do'),when:findCol('when'),notes:findCol('notes')};
    const at=(row,col)=>col==null?'':clean(row.cells.find(c=>c.column===col)?.value||'');
    return sheet.rows.slice(1).map(row=>{const e={name:at(row,cols.name),dateText:at(row,cols.date),type:at(row,cols.type),status:at(row,cols.status),needs:at(row,cols.needs),action:at(row,cols.action),when:at(row,cols.when),notes:at(row,cols.notes),sourceRow:row.row};e.dates=datesIn(e.dateText,year);e.time=timeIn(e.dateText);return e}).filter(e=>e.name);
  }
  function bookingRequired(e){const t=compact([e.status,e.needs,e.action].join(' '));if(/no reservation|walk in|same day|not required/.test(t))return false;return /required|already bought|done|paid|to reserve|reserve seats|to buy reserve|booked/.test(t)}
  function similarity(a,b){const A=new Set(compact(a).split(' ').filter(x=>x.length>=3)),B=new Set(compact(b).split(' ').filter(x=>x.length>=3));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.min(A.size,B.size)}
  function findItem(day,name,time=''){let best=null,score=0;for(const item of day.items||[]){let s=similarity(`${item.title} ${item.place}`,name);if(time&&clean(item.time).replace('~','')===clean(time).replace('~',''))s+=.45;if(/n['’]?ex|narita express/i.test(name)&&/n['’]?ex|narita express/i.test(`${item.title} ${item.note}`))s+=.8;if(s>score){score=s;best=item}}return score>=.48?best:null}
  function append(a,b,max=650){const A=clean(a),B=clean(b);if(!B)return A;if(A&&compact(A).includes(compact(B).slice(0,80)))return A;return clean([A,B].filter(Boolean).join(' • ')).slice(0,max)}

  function localTrip(workbook,dayInfos,reservations){
    const days=dayInfos.map(info=>({
      date:info.date,title:info.title||'Itinerary Day',emoji:'🌸',
      route:info.transit.slice(0,4).join(' • ').slice(0,700),
      reminder:info.warnings.slice(0,3).join(' • ').slice(0,700),
      planB:info.planBs.slice(0,2).join(' • ').slice(0,700),
      items:info.items.map(x=>({time:x.time,title:x.title,place:'',japaneseName:'',address:'',type:/train|bus|station|n['’]?ex|travel/i.test(x.title)?'transport':'other',priority:'normal',reservation:false,leaveBy:'',note:'',reminder:'',planB:''})),phrases:[]
    }));
    const byDate=new Map(days.map(d=>[d.date,d]));let hotel='';
    for(const e of reservations){
      if(/^hotel$/i.test(e.type)&&!hotel)hotel=e.name;
      for(const date of e.dates){
        const day=byDate.get(date);if(!day)continue;
        let item=findItem(day,e.name,e.time);
        if(!item&&e.time){item={time:e.time,title:e.name,place:e.name,japaneseName:'',address:'',type:/transport/i.test(e.type)?'transport':'other',priority:'normal',reservation:false,leaveBy:'',note:'',reminder:'',planB:''};day.items.push(item)}
        if(!item)continue;
        const required=bookingRequired(e);if(required)item.reservation=true;if(required&&e.time)item.priority='critical';
        const note=[e.status&&`Booking: ${e.status}`,e.action,e.when&&`When: ${e.when}`,e.notes].filter(Boolean).join(' · ');
        item.note=append(item.note,note,500);if(/do not buy again|arrive \d|protect|pending|required|recheck|reconfirm/i.test(note))item.reminder=append(item.reminder,note,500);
      }
    }
    for(const d of days)d.items.sort((a,b)=>(timeMinutes(a.time)??9999)-(timeMinutes(b.time)??9999));
    const dates=days.map(d=>d.date).sort();const text=compact(`${workbook.fileName} ${dayInfos.flatMap(d=>d.allText.slice(0,3)).join(' ')}`);
    return S().normalizeTrip({name:clean(workbook.fileName).replace(/\.xlsx$/i,'').replace(/[_-]+/g,' '),destination:/japan|tokyo|osaka|kyoto/.test(text)?'Japan':'',startDate:dates[0]||'',endDate:dates.at(-1)||dates[0]||'',timezone:'Asia/Tokyo',hotel,source:'workbook-local',days});
  }
  function timeMinutes(v){const m=String(v||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null}

  function aiConfig(){const c=window.SAKURA_AI_CONFIG||{};return {endpoint:String(c.endpoint||'').replace(/\/sakura-ai-translator(?:\?.*)?$/,'/sakura-trip-parser'),key:c.gatewayKey||c.publishableKey||''}}
  async function enrich(ir){
    const cfg=aiConfig();if(!cfg.endpoint||!cfg.key)throw new Error('AI enrichment is not configured.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),AI_TIMEOUT_MS);
    try{const response=await fetch(cfg.endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key},body:JSON.stringify({text:String(ir||'').slice(0,17000)}),signal:controller.signal});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`AI enrichment failed (${response.status}).`);const trip=S().normalizeTrip(data.trip||data);if(!trip.days.length)throw new Error('AI did not return dated itinerary days.');return trip}finally{clearTimeout(timer)}
  }

  function mergeAI(local,ai){
    const out=S().clone(local),aiByDate=new Map((ai.days||[]).map(d=>[d.date,d]));
    if(ai.destination)out.destination=ai.destination;if(ai.hotel&&!out.hotel)out.hotel=ai.hotel;
    for(const day of out.days){
      const a=aiByDate.get(day.date);if(!a)continue;
      if(a.title&&!/^day\s*\d+/i.test(a.title))day.title=a.title;
      if(a.route)day.route=append(a.route,day.route,700);
      if(!day.planB&&a.planB)day.planB=a.planB;
      for(const item of day.items){
        const match=findItem(a,item.title,item.time);if(!match)continue;
        item.title=match.title||item.title;item.place=match.place||item.place;item.japaneseName=match.japaneseName||item.japaneseName;item.address=match.address||item.address;
        item.type=match.type&&match.type!=='other'?match.type:item.type;item.note=append(match.note,item.note,500);item.reminder=append(item.reminder,match.reminder,500);item.planB=item.planB||match.planB;item.reservation=item.reservation||match.reservation;item.priority=item.priority==='critical'?'critical':(match.priority||item.priority);
      }
      for(const item of a.items||[]){if(!findItem(day,item.title,item.time))day.items.push(item)}
      day.items.sort((x,y)=>(timeMinutes(x.time)??9999)-(timeMinutes(y.time)??9999));
    }
    return S().normalizeTrip(out);
  }

  function summarize(workbook,dayInfos,reservations,aiUsed,aiNote=''){
    const rows=dayInfos.flatMap(d=>d.allText),reconfirm=reservations.filter(e=>/to reserve|pending|recheck|reconfirm|reserve seats|to buy \/ reserve|optional advance/i.test([e.status,e.action,e.when,e.notes].join(' '))),fixed=reservations.filter(e=>e.time&&bookingRequired(e));
    const notes=[];const archives=workbook.sheets.filter(s=>s.role==='archive').length,unknown=workbook.sheets.filter(s=>s.role==='unknown').map(s=>s.name);
    if(archives)notes.push(`${archives} archive sheet${archives===1?' was':'s were'} kept out of the active itinerary.`);if(unknown.length)notes.push(`${unknown.length} sheet${unknown.length===1?' needs':'s need'} review: ${unknown.slice(0,3).join(', ')}${unknown.length>3?'…':''}`);
    if(!aiUsed)notes.push(`AI enrichment was skipped${aiNote?` (${aiNote})`:''}. The trip was still built locally from the workbook.`);else notes.push('Gemini enrichment completed. Fixed times, booking statuses and warnings still come from the workbook-first pass.');
    return {activeDays:dayInfos.length,reservations:reservations.length,reconfirm:reconfirm.length,transitWarnings:uniq(rows.filter(x=>/do not take|do not rely|south exit|north exit|east exit|west exit|bus stop|platform|bound for|get off/i.test(x))).length,fixedEvents:fixed.length,weatherDependent:uniq(rows.filter(x=>/\b(weather|rain|storm|outdoor|cancelled because of rain|canceled because of rain)\b/i.test(x))).length,reviewNotes:notes,aiUsed};
  }

  function tripPack(trip){
    const line=v=>clean(v).replace(/\n/g,' '),out=['SAKURA TRIP PACK',`Trip: ${line(trip.name||'Imported Trip')}`];if(trip.destination)out.push(`Destination: ${line(trip.destination)}`);if(trip.startDate)out.push(`Dates: ${trip.startDate} to ${trip.endDate||trip.startDate}`);out.push(`Timezone: ${line(trip.timezone||'Asia/Tokyo')}`);if(trip.hotel)out.push(`Hotel: ${line(trip.hotel)}`);
    (trip.days||[]).forEach((day,index)=>{out.push('',`DAY ${index+1} | ${day.date} | ${line(day.title||`Day ${index+1}`)}`);if(day.route)out.push(`Route: ${line(day.route)}`);if(day.reminder)out.push(`Reminder: ${line(day.reminder)}`);if(day.planB)out.push(`Plan B: ${line(day.planB)}`);(day.items||[]).forEach(item=>{out.push(`${line(item.time||'Anytime')} | ${line(item.title||item.place||'Stop')}`);if(item.type)out.push(`Type: ${line(item.type)}`);if(item.place)out.push(`Place: ${line(item.place)}`);if(item.japaneseName)out.push(`Japanese name: ${line(item.japaneseName)}`);if(item.address)out.push(`Address: ${line(item.address)}`);if(item.priority&&item.priority!=='normal')out.push(`Priority: ${line(item.priority)}`);if(item.reservation)out.push('Reservation: yes');if(item.leaveBy)out.push(`Leave by: ${line(item.leaveBy)}`);if(item.note)out.push(`Note: ${line(item.note)}`);if(item.reminder)out.push(`Reminder: ${line(item.reminder)}`);if(item.planB)out.push(`Plan B: ${line(item.planB)}`)})});return out.join('\n')
  }

  async function buildFromWorkbook(file,source){
    if(!V1()?.parseXlsx)throw new Error('Sakura Excel support is still loading. Close and reopen Travel, then try again.');
    const workbook=await V1().parseXlsx(file);setStep('read','Workbook opened.',true);setStep('structure',`Found ${workbook.sheets.length} sheets. Building the trip locally…`);
    const year=yearOf(workbook),days=workbook.sheets.filter(s=>s.role==='day_itinerary').map(s=>dayInfo(s,year)).filter(d=>d.date).sort((a,b)=>a.date.localeCompare(b.date));if(!days.length)throw new Error('Sakura could not find active dated itinerary-day sheets in this workbook.');
    const reservations=reservationRows(workbook.sheets.find(s=>s.role==='reservations'),year);let trip=localTrip(workbook,days,reservations);setStep('structure',`Local trip ready · ${days.length} active days.`,true);setStep('ai','Trying optional AI enrichment…');
    let aiUsed=false,aiNote='';
    try{const ir=V1().buildIR?.(workbook,days,reservations)||'';if(ir){const ai=await enrich(ir);trip=mergeAI(trip,ai);aiUsed=true;setStep('ai','AI enrichment complete.',true)}else{aiNote='no compact AI representation was available';setStep('ai','Local import complete · AI skipped.',true)}}catch(error){aiNote=error?.name==='AbortError'?'timed out':clean(error?.message||'unavailable');setStep('ai','AI was slow/unavailable — continuing with the local workbook import.',true)}
    return {workbook,trip,summary:summarize(workbook,days,reservations,aiUsed,aiNote),pack:tripPack(trip),source:{...source,lastSynced:new Date().toISOString()}};
  }

  function showSummary(result,isResync=false){
    pendingResult=result;pendingSource=result.source;setHeader(isResync?'Review Resync':'Review Import');const m=main();if(!m)return;const {trip,summary,workbook}=result;
    const review=summary.reviewNotes.map(x=>`• ${esc(x)}`).join('<br>');
    m.innerHTML=`<section class="stc-card"><div class="stc-kicker">${isResync?'Latest Google Sheet':'Sakura understood this as'}</div><h2>${esc(trip.name||'Imported Trip')}</h2><div class="stc-muted">${esc(trip.destination||'Trip')} · ${esc(trip.startDate||'')} → ${esc(trip.endDate||'')}</div>
      <div class="stfs-summary"><div class="stfs-stat"><b>${summary.activeDays}</b><span>itinerary days</span></div><div class="stfs-stat"><b>${summary.reservations}</b><span>reservation / booking rows</span></div><div class="stfs-stat"><b>${summary.reconfirm}</b><span>items to reserve / recheck</span></div><div class="stfs-stat"><b>${summary.transitWarnings}</b><span>transit warnings</span></div><div class="stfs-stat"><b>${summary.fixedEvents}</b><span>fixed-time anchors</span></div><div class="stfs-stat"><b>${summary.weatherDependent}</b><span>weather-sensitive notes</span></div></div>
      <div class="stfs-banner"><b>${summary.aiUsed?'AI enrichment completed.':'Imported locally — no AI wait required.'}</b> ${summary.aiUsed?'Workbook facts remain authoritative.':'You can still review and save the trip normally.'}</div>
      <div class="stfs-review"><b>Needs Review</b><br>${review}</div><div class="stc-actions"><button type="button" data-stfs-menu>Back</button><button type="button" class="primary" data-stfs-review>Review ${isResync?'Changes':'Import'}</button></div></section>
      <section class="stc-card"><div class="stc-kicker">Workbook detected</div><h3>${workbook.sheets.length} sheets</h3><div class="stc-muted">${workbook.sheets.map(s=>`${esc(s.name)} · ${esc(s.role)}`).join('<br>')}</div></section>`;
  }

  function googleSheetId(url){try{const u=new URL(clean(url));if(u.protocol!=='https:'||u.hostname!=='docs.google.com')return'';return u.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/)?.[1]||''}catch{return''}}
  function gatewayConfig(){const c=window.SAKURA_AI_CONFIG||{};return {endpoint:String(c.endpoint||'').replace(/\/sakura-ai-translator(?:\?.*)?$/,'/sakura-google-sheet-xlsx'),key:c.gatewayKey||c.publishableKey||''}}
  async function downloadGoogleSheet(url){
    const id=googleSheetId(url);if(!id)throw new Error('Paste a valid Google Sheets link.');const cfg=gatewayConfig();if(!cfg.endpoint||!cfg.key)throw new Error('Google Sheet sync is not configured yet.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{const response=await fetch(cfg.endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key},body:JSON.stringify({url}),signal:controller.signal});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||`Could not read Google Sheet (${response.status}).`)}const blob=await response.blob();const name=decodeURIComponent(response.headers.get('X-Sakura-File-Name')||`Google Sheet ${id}.xlsx`);return {file:new File([blob],/\.xlsx$/i.test(name)?name:`${name}.xlsx`,{type:XLSX_MIME}),source:{type:'google-sheet',url:clean(url),sheetId:id}}}catch(error){if(error?.name==='AbortError')throw new Error('Google Sheet download took too long. Check the connection and try again.');throw error}finally{clearTimeout(timer)}
  }

  async function importGoogle(url,isResync=false){
    showProgress(url,'google-sheet');try{const {file,source}=await downloadGoogleSheet(url);setStep('read','Latest Google Sheet downloaded.');const result=await buildFromWorkbook(file,source);showSummary(result,isResync)}catch(error){showError(error,'google')}
  }
  async function importFile(file){showProgress(`${file.name} · ${Math.max(1,Math.round(file.size/1024))} KB`,'file');try{const result=await buildFromWorkbook(file,{type:'file',name:file.name});showSummary(result,false)}catch(error){showError(error,'menu')}}

  async function reviewPending(){
    if(!pendingResult?.pack)return;openNativePaste();await Promise.resolve();const textarea=root()?.querySelector('[data-text]'),understand=root()?.querySelector('[data-understand]');if(!textarea||!understand){showError(new Error('The standard Sakura review screen could not be opened.'));return}textarea.value=pendingResult.pack;const status=root()?.querySelector('[data-status]');if(status){status.className='stc-status busy';status.textContent='Opening the standard Sakura review…'}understand.click();
  }

  function decorate(){
    if(decorating)return;decorating=true;try{css();const r=root();if(!r)return;
      const all=r.querySelector('[data-main]');if(!all)return;
      if(all.querySelector('[data-stfi-add]')&&!all.querySelector('[data-stfs-paste]')&&/How do you want to add it/i.test(all.textContent||''))showAddMenu();
      const current=S()?.currentTrip?.(),source=current?.id?getSource(current.id):null;
      const actions=[...all.querySelectorAll('.stc-actions')].find(x=>x.querySelector('[data-import]'));
      if(actions&&source?.type==='google-sheet'&&!actions.querySelector('[data-stfs-resync]')){const b=document.createElement('button');b.type='button';b.className='stfs-resync';b.dataset.stfsResync='1';b.textContent='↻ Resync Google Sheet';actions.insertBefore(b,actions.firstChild)}
    }finally{decorating=false}
  }

  document.addEventListener('click',event=>{
    const z=s=>event.target.closest?.(s);
    if(z('#sakura-trip-companion [data-stfi-add]')){queueMicrotask(showAddMenu);return}
    if(z('#sakura-trip-companion [data-stfs-paste]')){event.preventDefault();event.stopPropagation();return openNativePaste()}
    if(z('#sakura-trip-companion [data-stfs-file-button]')){event.preventDefault();event.stopPropagation();return root()?.querySelector('[data-stfs-file]')?.click()}
    if(z('#sakura-trip-companion [data-stfs-google]')){event.preventDefault();event.stopPropagation();return showGoogleLink()}
    if(z('#sakura-trip-companion [data-stfs-import-link]')){event.preventDefault();event.stopPropagation();const input=root()?.querySelector('[data-stfs-url]'),url=input?.value||'';if(!googleSheetId(url)){const s=root()?.querySelector('[data-stfs-link-status]');if(s){s.className='stc-status bad';s.textContent='Paste a valid Google Sheets link.'}return}return void importGoogle(url,false)}
    if(z('#sakura-trip-companion [data-stfs-review]')){event.preventDefault();event.stopPropagation();return void reviewPending()}
    if(z('#sakura-trip-companion [data-stfs-resync]')){event.preventDefault();event.stopPropagation();const trip=S()?.currentTrip?.(),source=trip?.id?getSource(trip.id):null;if(!source?.url)return;pendingSource={...source};return void importGoogle(source.url,true)}
    if(z('#sakura-trip-companion [data-stfs-menu]')){event.preventDefault();event.stopPropagation();return showAddMenu()}
    if(z('#sakura-trip-companion [data-stfs-back]')){event.preventDefault();event.stopPropagation();return tripsView()}
    if(z('#sakura-trip-companion [data-save]')&&pendingSource){const source={...pendingSource};queueMicrotask(()=>{const id=activeTripId();if(id)setSource(id,source);pendingSource=null;pendingResult=null;setTimeout(decorate,0)});return}
  },true);

  document.addEventListener('change',event=>{const input=event.target.closest?.('#sakura-trip-companion [data-stfs-file]');if(!input)return;const file=input.files?.[0];input.value='';if(file)void importFile(file)},true);
  document.addEventListener('sakura:trips-changed',()=>setTimeout(decorate,0));
  const observer=new MutationObserver(()=>setTimeout(decorate,0));
  function init(){css();const r=root();if(r)observer.observe(r,{childList:true,subtree:true});decorate()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);

  window.SakuraTripFileSync=Object.freeze({version:1,showAddMenu,importGoogleSheet:importGoogle,resyncCurrent:()=>{const t=S()?.currentTrip?.(),src=t?.id?getSource(t.id):null;if(!src?.url)throw new Error('This trip is not connected to a Google Sheet.');return importGoogle(src.url,true)},getSource});
}());
