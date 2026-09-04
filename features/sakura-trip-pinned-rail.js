/* Sakura Trip Pinned Rail v1 — keep itinerary rail legs primary inside the real Railway System. */
(function initializeSakuraTripPinnedRail(){
  'use strict';
  if(window.SakuraTripPinnedRail?.version>=1)return;

  const ESC=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const ARROW=/\s*(?:→|->|⇒|➜|➝)\s*/;
  const S=()=>window.SakuraTripStore;
  const baseRescue=window.SakuraTransitRescue||null;
  const liveTools=window.SakuraTripLiveTools||null;
  let ctx={trip:null,day:null,dayIndex:0,city:'tokyo',pairs:[],selected:0,checking:false};

  function css(){
    if(document.getElementById('sakura-trip-pinned-rail-style'))return;
    const style=document.createElement('style');
    style.id='sakura-trip-pinned-rail-style';
    style.textContent=`
      #travel-rail-view.stpr-trip-mode .stpr-card{margin:0 0 11px;padding:13px;border:1px solid color-mix(in srgb,var(--color-primary) 30%,var(--color-border));border-radius:17px;background:linear-gradient(145deg,var(--color-primary-soft),var(--color-surface));color:var(--color-text)}
      #travel-rail-view .stpr-kicker{display:block;color:var(--color-primary-dark);font-size:8px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
      #travel-rail-view .stpr-card h2{margin:5px 0 3px;font-size:20px;line-height:1.25}
      #travel-rail-view .stpr-route{margin-top:10px;padding:11px;border:1px solid color-mix(in srgb,var(--color-primary) 22%,var(--color-border));border-radius:14px;background:var(--color-surface)}
      #travel-rail-view .stpr-route small{display:block;color:var(--color-text-muted);font-size:8px;font-weight:800}
      #travel-rail-view .stpr-route strong{display:block;margin-top:3px;color:var(--color-primary-dark);font-size:16px;line-height:1.35}
      #travel-rail-view .stpr-route span{display:block;margin-top:4px;color:var(--color-text-muted);font-size:9px;line-height:1.45}
      #travel-rail-view .stpr-legs{display:flex;gap:6px;overflow:auto;margin-top:9px;padding-bottom:2px;scrollbar-width:none}
      #travel-rail-view .stpr-legs::-webkit-scrollbar{display:none}
      #travel-rail-view .stpr-legs button{flex:0 0 auto;min-width:132px;padding:8px 9px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-background);color:inherit;text-align:left;font-size:9px}
      #travel-rail-view .stpr-legs button.on{border-color:var(--color-primary);background:var(--color-primary-soft)}
      #travel-rail-view .stpr-legs small,#travel-rail-view .stpr-legs strong{display:block}
      #travel-rail-view .stpr-legs small{color:var(--color-primary-dark);font-size:7px;font-weight:900}
      #travel-rail-view .stpr-legs strong{margin-top:2px;font-size:9px;line-height:1.35}
      #travel-rail-view .stpr-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      #travel-rail-view .stpr-actions button{min-height:42px;padding:8px 10px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-background);color:inherit;font-size:10px;font-weight:850}
      #travel-rail-view .stpr-actions .primary{background:var(--color-primary);border-color:var(--color-primary);color:#fff}
      #travel-rail-view .stpr-note{margin-top:8px;padding:9px 10px;border-radius:12px;background:#fff6d9;color:#705914;font-size:9px;line-height:1.45}
      #travel-rail-view .stpr-manual-note{margin-top:8px;color:var(--color-text-muted);font-size:8px;line-height:1.4}
      #travel-rail-view.stpr-trip-mode>.travel-category-description,
      #travel-rail-view.stpr-trip-mode>#rail-city-tabs,
      #travel-rail-view.stpr-trip-mode>#rail-operator-tabs,
      #travel-rail-view.stpr-trip-mode>.rail-search-wrap,
      #travel-rail-view.stpr-trip-mode>#rail-search-scope,
      #travel-rail-view.stpr-trip-mode>#rail-search-results,
      #travel-rail-view.stpr-trip-mode>.rail-section-heading,
      #travel-rail-view.stpr-trip-mode>#rail-line-list,
      #travel-rail-view.stpr-trip-mode>.rail-line-panel,
      #travel-rail-view.stpr-trip-mode>#rail-city-note{display:none!important}
      #travel-rail-view.stpr-trip-mode .rail-network-planner-heading,
      #travel-rail-view.stpr-trip-mode .rail-network-planner-copy,
      #travel-rail-view.stpr-trip-mode .rail-network-fields,
      #travel-rail-view.stpr-trip-mode .rail-network-actions{display:none!important}
      #travel-rail-view.stpr-trip-mode.stpr-checking .rail-network-planner-heading{display:flex!important}
      #travel-rail-view.stpr-trip-mode.stpr-checking .rail-network-planner-copy{display:block!important}
      #travel-rail-view.stpr-trip-mode.stpr-checking .rail-network-fields{display:grid!important}
      #travel-rail-view.stpr-trip-mode.stpr-checking .rail-network-actions{display:flex!important}
      #travel-rail-view.stpr-trip-mode .rail-network-planner{margin-top:0}
    `;
    document.head.appendChild(style);
  }

  function guessCity(trip,day){
    const text=clean(`${trip?.destination||''} ${day?.title||''} ${day?.route||''}`).toLowerCase();
    if(text.includes('osaka')||text.includes('大阪'))return'osaka';
    if(text.includes('kyoto')||text.includes('京都'))return'kyoto';
    return'tokyo';
  }
  function dayIndex(trip,day){
    if(!trip?.days?.length)return 0;
    const byDate=day?.date?trip.days.findIndex(x=>x.date===day.date):-1;
    if(byDate>=0)return byDate;
    return S()?.currentDayIndex?.(trip)??0;
  }
  function timeMinutes(value){const m=String(value||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null}
  function nowMinutes(tz='Asia/Tokyo'){
    try{const p=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),m=Object.fromEntries(p.map(x=>[x.type,x.value]));return Number(m.hour)*60+Number(m.minute)}catch{return 0}
  }
  function stripSegment(value){
    return clean(value)
      .replace(/^[📌📍🚆🚉🚌✅⭐🌟👉✈️🛬🧳🛄💳💵🌅🌙\s]+/u,'')
      .replace(/^~?\d{1,2}:\d{2}(?:\s*[–—-]\s*~?\d{1,2}:\d{2})?\s*[–—-]\s*/,'')
      .replace(/^(?:recommended route|route|from|to|go to|destination|step\s*\d+|take|train)\s*:\s*/i,'')
      .replace(/\s*\((?:take|walk|allow|target|next|bound|transfer|use)[^)]*\)\s*$/i,'')
      .replace(/\s*;.*$/,'')
      .trim();
  }
  function rawArrowPairs(text,itemIndex=-1,time=''){
    const parts=String(text||'').split(ARROW).map(stripSegment).filter(Boolean);
    if(parts.length<2)return[];
    const out=[];
    for(let i=0;i<parts.length-1;i++){
      const from=parts[i],to=parts[i+1];
      const service=x=>/\b(?:JR\s+)?[A-Za-z0-9'’.-]+(?:\s+[A-Za-z0-9'’.-]+){0,3}\s+Line\b|\bNarita Express\b|\bN['’]?EX\b/i.test(x);
      if(!from||!to||(service(from)&&service(to))||/\bLine\b/i.test(from)&&!/\bStation\b|Airport/i.test(from))continue;
      if(/^walk\s+to\b/i.test(to))continue;
      out.push({from,to,itemIndex,time,source:'arrow'});
    }
    return out;
  }
  function routeChunks(day){return String(day?.route||'').split(/\s*[•\n]\s*/).map(clean).filter(Boolean)}
  function explicitFrom(day){
    for(const chunk of routeChunks(day)){
      const m=chunk.match(/\bFrom\s*:\s*(.+)$/i);if(m)return stripSegment(m[1]);
    }
    return'';
  }
  function destinationFromTitle(title){
    const value=stripSegment(title);
    let m=value.match(/^(?:travel|go|head|ride)\s+to\s+(.+)$/i);if(m)return stripSegment(m[1]);
    m=value.match(/^arrive\s+(?:at|in)\s+(.+)$/i);if(m)return stripSegment(m[1]);
    return'';
  }
  function rawPairsForDay(day){
    const pairs=[];const seen=new Set();let last='';const initialFrom=explicitFrom(day);
    const add=p=>{const key=`${clean(p.from).toLowerCase()}→${clean(p.to).toLowerCase()}`;if(!p.from||!p.to||p.from===p.to||seen.has(key))return;seen.add(key);pairs.push(p);last=p.to};
    (day?.items||[]).forEach((item,index)=>{
      const transport=/transport|train|rail|bus/i.test(item.type||'')||/→|->|\btravel\b|\btrain\b|\bstation\b|n['’]?ex/i.test(`${item.title||''} ${item.place||''}`);
      if(!transport)return;
      const arrowPairs=rawArrowPairs(item.title||item.place,index,item.time||'');
      if(arrowPairs.length){arrowPairs.forEach(add);return}
      const to=destinationFromTitle(item.title||item.place);if(to){const from=last||initialFrom;if(from)add({from,to,itemIndex:index,time:item.time||'',source:'destination'})}
    });
    for(const chunk of routeChunks(day))rawArrowPairs(chunk,-1,'').forEach(add);
    return pairs.slice(0,8);
  }
  function selectedPairIndex(pairs,trip,day){
    if(!pairs.length)return 0;
    if(!S()?.isTripLive?.(trip))return 0;
    const now=nowMinutes(trip?.timezone||'Asia/Tokyo');
    const timed=pairs.map((pair,index)=>({pair,index,minutes:timeMinutes(pair.time)})).filter(x=>x.minutes!==null);
    const next=timed.find(x=>x.minutes>=now-20);return next?.index??timed.at(-1)?.index??0;
  }
  function routeHint(day){
    const chunks=routeChunks(day);
    const preferred=chunks.find(x=>/recommended route/i.test(x))||chunks.find(x=>/\b(?:JR|Metro|Subway|N['’]?EX|Narita Express|Seibu)\b.*(?:→|->)/i.test(x));
    return preferred?clean(preferred.replace(/^[✅📌🚆\s]+/u,'')):'';
  }
  function guidance(day){
    const values=[day?.reminder,day?.route,...(day?.items||[]).flatMap(i=>[i.note,i.reminder])].filter(Boolean).join(' • ').split(/\s*•\s*|\n+/);
    const re=/(do not|must|exit|platform|bus stop|bound for|get off|south exit|east exit|west exit|north exit|武\d+|乗り場|番線)/i;
    return [...new Set(values.map(clean).filter(x=>x&&re.test(x)))].slice(0,3);
  }

  async function waitFor(fn,ms=5000){const start=Date.now();while(Date.now()-start<ms){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,50))}return null}
  async function ensureRail(city){
    if(typeof showRoute==='function')showRoute('travel-rail');
    await waitFor(()=>document.getElementById('travel-rail-view'),2500);
    if(typeof selectRailCity==='function')await selectRailCity(city);
    else if(typeof openRailGuide==='function')await openRailGuide();
    await waitFor(()=>typeof railNetworkMatchesForInput==='function'&&typeof renderRailNetworkPlanner==='function'&&document.getElementById('rail-network-route-result'),5000);
  }
  function resolveHub(text){
    if(typeof railNetworkMatchesForInput!=='function')return null;
    const raw=stripSegment(text);const candidates=[raw]
      .concat(raw.replace(/\b(?:Station|駅)\b/gi,'').trim())
      .concat(raw.replace(/^(?:Travel|Go|Head|Ride|Arrive)\s+(?:to|at|in)\s+/i,'').trim())
      .filter(Boolean);
    for(const candidate of [...new Set(candidates)]){
      const matches=railNetworkMatchesForInput(candidate)||[],best=matches[0],second=matches[1];
      if(best&&(best.score>=200||(best.score>=165&&(!second||second.score<best.score))||(best.score>=140&&(!second||second.score<best.score))))return best.hub;
    }
    return null;
  }
  function resolvedPair(pair){if(!pair)return null;const from=resolveHub(pair.from),to=resolveHub(pair.to);return from&&to&&from.key!==to.key?{from,to}:null}
  function bestResolvablePair(day,pairs){
    for(const pair of pairs){const resolved=resolvedPair(pair);if(resolved)return resolved}
    for(const chunk of routeChunks(day)){
      const parts=String(chunk).split(ARROW).map(stripSegment).filter(Boolean),hubs=parts.map(resolveHub).filter(Boolean);
      for(let i=0;i<hubs.length-1;i++)if(hubs[i].key!==hubs[i+1].key)return{from:hubs[i],to:hubs[i+1]};
    }
    return null;
  }
  function setPlannerRoute(resolved){
    if(!resolved?.from||!resolved?.to)return false;
    try{
      railNetworkPlannerState={city:railGuideCityData?.city||ctx.city,from:resolved.from.key,to:resolved.to.key};
      railNetworkRouteOptions=[];railNetworkSelectedRouteIndex=0;
      renderRailNetworkPlanner();renderRailNetworkRoute(resolved.from.key,resolved.to.key,{recompute:true});
      return true;
    }catch(error){console.warn('Pinned itinerary route could not be rendered in Railway System.',error);return false}
  }
  function planner(){return document.querySelector('#travel-rail-view .rail-network-planner')}
  function configurePlannerVisibility(checking=false){const view=document.getElementById('travel-rail-view');if(!view)return;ctx.checking=!!checking;view.classList.toggle('stpr-checking',ctx.checking);if(ctx.checking){const plan=planner();if(plan)plan.hidden=false}}
  function clearPlannerForCheck(){
    try{railNetworkPlannerState={city:railGuideCityData?.city||ctx.city,from:'',to:''};railNetworkRouteOptions=[];railNetworkSelectedRouteIndex=0;renderRailNetworkPlanner()}catch{}
    const from=document.getElementById('rail-network-from-input'),to=document.getElementById('rail-network-to-input');if(from)from.value='';if(to)to.value='';from?.focus();
  }
  function currentRawPair(){return ctx.pairs[Math.max(0,Math.min(ctx.selected,ctx.pairs.length-1))]||null}
  function usePinned(){
    configurePlannerVisibility(false);
    const pair=currentRawPair(),resolved=resolvedPair(pair)||bestResolvablePair(ctx.day,ctx.pairs);
    const plan=planner();
    if(resolved){if(plan)plan.hidden=false;setPlannerRoute(resolved)}else{
      if(plan)plan.hidden=true;
      try{railNetworkPlannerState={city:railGuideCityData?.city||ctx.city,from:'',to:''};railNetworkRouteOptions=[];railNetworkSelectedRouteIndex=0;renderRailNetworkPlanner()}catch{}
    }
    renderContext();
  }
  function renderContext(){
    const view=document.getElementById('travel-rail-view');if(!view||!ctx.trip||!ctx.day)return;
    css();view.classList.add('stpr-trip-mode');view.querySelector('.stlv-rail-context')?.remove();view.querySelector('.stpr-card')?.remove();
    const pair=currentRawPair(),hint=routeHint(ctx.day),warnings=guidance(ctx.day),resolved=resolvedPair(pair),offlineNote=pair&&!resolved?'This itinerary leg stays pinned even though one endpoint is outside Sakura’s offline station map. Follow your itinerary instructions; use “Check another route” only when you need a different station pair.':'';
    const card=document.createElement('section');card.className='stpr-card';card.innerHTML=`
      <span class="stpr-kicker">Trip Companion · pinned itinerary route</span>
      <h2>${ESC(ctx.day.title||'Itinerary rail route')}</h2>
      ${pair?`<div class="stpr-route"><small>YOUR SAVED ROUTE</small><strong>${ESC(pair.from)} → ${ESC(pair.to)}</strong>${pair.time?`<span>${ESC(pair.time)}</span>`:''}${hint?`<span>${ESC(hint)}</span>`:''}</div>`:`<div class="stpr-route"><small>YOUR SAVED ROUTE</small><strong>Itinerary route</strong><span>Sakura could not isolate a station pair, so your day instructions remain pinned here.</span></div>`}
      ${ctx.pairs.length>1?`<div class="stpr-legs">${ctx.pairs.map((p,index)=>`<button type="button" class="${index===ctx.selected?'on':''}" data-stpr-leg="${index}"><small>ITINERARY LEG ${index+1}</small><strong>${ESC(p.from)} → ${ESC(p.to)}</strong></button>`).join('')}</div>`:''}
      <div class="stpr-actions"><button type="button" class="primary" data-stpr-use>📌 Use pinned route</button><button type="button" data-stpr-check>↪ Check another route</button>${ctx.trip.hotel?'<button type="button" data-stpr-home>🏠 Get me home</button>':''}</div>
      ${ctx.checking?'<div class="stpr-manual-note">You’re checking a different route below. Your itinerary route above stays pinned and is not replaced.</div>':''}
      ${offlineNote?`<div class="stpr-note">${ESC(offlineNote)}</div>`:''}
      ${warnings.length?`<div class="stpr-note">${warnings.map(ESC).join('<br>')}</div>`:''}`;
    const header=view.querySelector('.rail-page-header,.travel-category-header')||view.firstElementChild;header?.insertAdjacentElement('afterend',card);
    const back=view.querySelector('.back-button');if(back){back.dataset.stprReturn='1';back.setAttribute('aria-label','Back to Trip Companion')}
    const plan=planner();if(plan&&card.nextElementSibling!==plan)card.insertAdjacentElement('afterend',plan);
  }
  function cleanupRailMode(){
    const view=document.getElementById('travel-rail-view');if(!view)return;view.classList.remove('stpr-trip-mode','stpr-checking');view.querySelector('.stpr-card')?.remove();view.querySelector('.stlv-rail-context')?.remove();const plan=planner(),railHeading=view.querySelector('.rail-section-heading');if(plan){plan.hidden=false;if(railHeading)railHeading.insertAdjacentElement('beforebegin',plan)}const back=view.querySelector('.back-button');if(back){delete back.dataset.stprReturn;back.setAttribute('aria-label','Back to Trains & Stations')}
  }
  function returnToTrip(){
    const trip=ctx.trip,index=ctx.dayIndex;cleanupRailMode();
    if(trip?.id){try{S()?.setActiveTrip?.(trip.id);localStorage.setItem((S()?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:')+trip.id,String(index))}catch{}}
    ctx={trip:null,day:null,dayIndex:0,city:'tokyo',pairs:[],selected:0,checking:false};
    if(typeof showRoute==='function')showRoute('travel');
    setTimeout(()=>window.SakuraTripCompanion?.open?.(index),0);
  }
  async function open(trip,day){
    const activeTrip=trip||S()?.currentTrip?.();if(!activeTrip)return;
    const activeDay=day||activeTrip.days?.[S()?.currentDayIndex?.(activeTrip)||0];if(!activeDay)return;
    const pairs=rawPairsForDay(activeDay),selected=selectedPairIndex(pairs,activeTrip,activeDay),city=guessCity(activeTrip,activeDay);
    ctx={trip:activeTrip,day:activeDay,dayIndex:dayIndex(activeTrip,activeDay),city,pairs,selected,checking:false};
    window.SakuraTripCompanion?.close?.();
    await ensureRail(city);
    usePinned();
    renderContext();
  }

  function bind(){
    window.addEventListener('click',event=>{
      const back=event.target.closest?.('#travel-rail-view .back-button[data-stpr-return]');if(!back)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();returnToTrip();
    },true);
    document.addEventListener('click',event=>{
      const target=event.target.closest?.('#travel-rail-view [data-stpr-use],#travel-rail-view [data-stpr-check],#travel-rail-view [data-stpr-leg],#travel-rail-view [data-stpr-home]');if(!target)return;
      event.preventDefault();event.stopPropagation();
      if(target.hasAttribute('data-stpr-use'))return usePinned();
      if(target.hasAttribute('data-stpr-check')){configurePlannerVisibility(true);clearPlannerForCheck();return renderContext()}
      if(target.hasAttribute('data-stpr-leg')){const index=Number(target.dataset.stprLeg);if(Number.isInteger(index)&&ctx.pairs[index]){ctx.selected=index;return usePinned()}return}
      if(target.hasAttribute('data-stpr-home')){configurePlannerVisibility(true);renderContext();return liveTools?.getMeHome?.(ctx.trip,ctx.day)}
    },true);
  }
  function patchRescue(){
    const previous=window.SakuraTransitRescue||baseRescue||{};
    window.SakuraTransitRescue=Object.freeze({...previous,version:4,open,openRailway:open});
  }
  function init(){css();patchRescue();bind()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  window.SakuraTripPinnedRail=Object.freeze({version:1,open,returnToTrip,rawPairsForDay,routeHint});
}());
