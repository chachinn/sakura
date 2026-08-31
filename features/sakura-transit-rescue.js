/* Sakura Transit Rescue v1 — itinerary-aware bridge to Sakura's offline Railway System. */
(function initializeSakuraTransitRescue(){
  'use strict';
  if(window.SakuraTransitRescue?.version>=1)return;

  const ESC=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let state={trip:null,day:null,city:'tokyo',hubs:[],selectedLeg:0,custom:false,lastPlan:null};

  function css(){
    if(document.getElementById('sakura-transit-rescue-style'))return;
    const style=document.createElement('style');
    style.id='sakura-transit-rescue-style';
    style.textContent=`
      #sakura-transit-rescue{position:fixed;inset:0;z-index:12030;display:none;background:var(--color-background,#fffafc);color:var(--color-text,#222);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Hiragino Sans","Yu Gothic",sans-serif}
      #sakura-transit-rescue.open{display:block}#sakura-transit-rescue *{box-sizing:border-box}
      .str-scroll{height:100%;overflow:auto;padding:0 14px calc(34px + env(safe-area-inset-bottom))}
      .str-head{position:sticky;top:0;z-index:4;margin:0 -14px;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;display:grid;grid-template-columns:46px 1fr 46px;align-items:center;background:color-mix(in srgb,var(--color-background,#fffafc) 94%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--color-border,#ead9df)}
      .str-back,.str-icon{width:42px;height:42px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-surface);color:inherit;font-size:20px}.str-title{text-align:center}.str-title small{display:block;color:var(--color-primary-dark);font-size:9px;font-weight:900;letter-spacing:.1em}.str-title strong{font-size:18px}
      .str-card{margin:11px 0;padding:14px;border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface)}.str-kicker{color:var(--color-primary-dark);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.09em}.str-card h2{margin:4px 0 5px;font-size:22px}.str-card h3{margin:3px 0 10px;font-size:16px}.str-muted{color:var(--color-text-muted);font-size:10px;line-height:1.45}
      .str-legs{display:flex;gap:7px;overflow:auto;margin-top:10px;padding-bottom:2px}.str-leg{flex:0 0 auto;min-width:148px;padding:9px 10px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-background);color:inherit;text-align:left}.str-leg.on{border-color:var(--color-primary);background:var(--color-primary-soft)}.str-leg small{display:block;color:var(--color-primary-dark);font-size:8px;font-weight:900}.str-leg strong{display:block;margin-top:3px;font-size:11px;line-height:1.35}
      .str-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;align-items:center;padding:11px;border-radius:14px;background:var(--color-primary-soft)}.str-summary span{font-size:9px;color:var(--color-text-muted)}.str-summary strong{font-size:16px;color:var(--color-primary-dark)}.str-summary b{grid-column:1 / -1;font-size:14px;line-height:1.35}
      .str-step{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;padding:11px 0;border-bottom:1px solid var(--color-border)}.str-step:last-child{border-bottom:0}.str-step-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:var(--color-primary-soft);font-size:16px}.str-step strong{display:block;font-size:13px;line-height:1.35}.str-step small{display:block;margin-top:3px;color:var(--color-text-muted);font-size:9px;line-height:1.45}.str-direction{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:999px;background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:8px;font-weight:850}
      .str-warning{margin-top:9px;padding:9px 10px;border-radius:12px;background:#fff6d9;color:#705914;font-size:9px;line-height:1.45}.str-error{padding:11px;border-radius:13px;background:#fff1f4;color:#963a56;font-size:10px;line-height:1.45}
      .str-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.str-actions button{min-height:44px;padding:9px 12px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-surface);color:inherit;font-size:11px;font-weight:850}.str-actions .primary{background:var(--color-primary);border-color:var(--color-primary);color:#fff}
      .str-detour{display:none;margin-top:10px}.str-detour.open{display:block}.str-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}.str-field label{display:block;margin:0 0 4px;color:var(--color-text-muted);font-size:8px;font-weight:800}.str-field input,.str-field select{width:100%;min-height:44px;padding:9px 10px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-background);color:inherit;font:inherit;font-size:12px}.str-field.city{grid-column:1 / -1}
      .str-loading{padding:20px 8px;text-align:center;color:var(--color-text-muted);font-size:11px}.str-route-note{margin-top:8px;padding:9px 10px;border-radius:12px;background:var(--color-background);color:var(--color-text-muted);font-size:9px;line-height:1.45}
      @media(max-width:360px){.str-fields{grid-template-columns:1fr}.str-field.city{grid-column:auto}.str-card h2{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function shell(){
    if(document.getElementById('sakura-transit-rescue'))return;
    css();
    const root=document.createElement('section');
    root.id='sakura-transit-rescue';
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`<div class="str-scroll"><header class="str-head"><button class="str-back" type="button" data-str-back>‹</button><div class="str-title"><small>TRAVEL</small><strong>Transit Rescue</strong></div><button class="str-icon" type="button" data-str-rail aria-label="Open Railway System">🚆</button></header><main data-str-main></main></div>`;
    document.body.appendChild(root);
  }

  function root(){return document.getElementById('sakura-transit-rescue')}
  function main(){return root()?.querySelector('[data-str-main]')}
  function normalize(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g,' ').trim()}
  function guessCity(trip,day){
    const text=normalize(`${trip?.destination||''} ${day?.route||''} ${day?.title||''}`);
    if(/\bosaka\b|大阪/.test(text))return 'osaka';
    if(/\bkyoto\b|京都/.test(text))return 'kyoto';
    return 'tokyo';
  }
  function segmentAlternatives(value){
    return String(value||'').split(/\s*\/\s*|\s+or\s+/i).map(v=>v.replace(/\b(JR|Metro|Subway)\s+(Line|線)$/i,'').trim()).filter(Boolean);
  }
  function itinerarySegments(day){return String(day?.route||'').split(/\s*→\s*|\s*->\s*/).map(v=>v.trim()).filter(Boolean)}

  async function ensureCity(city){
    if(typeof loadRailCity!=='function')throw new Error('Sakura Railway System is not available yet.');
    const safe=['tokyo','osaka','kyoto'].includes(city)?city:'tokyo';
    const data=await loadRailCity(safe);
    if(!data)throw new Error(`Could not load ${safe} rail data.`);
    railGuideCityData=data;
    railGuidePrefs.city=safe;
    return data;
  }

  function resolveHub(text){
    if(typeof railNetworkMatchesForInput!=='function')return null;
    for(const candidate of segmentAlternatives(text)){
      const matches=railNetworkMatchesForInput(candidate);
      const best=matches?.[0];
      const second=matches?.[1];
      if(!best)continue;
      const safe=best.score>=200 || (best.score>=170&&(!second||second.score<best.score)) || (best.score>=145&&(!second||second.score<best.score));
      if(safe)return best.hub;
    }
    return null;
  }

  function targetItem(day,trip){
    try{return window.SakuraTripStore?.summaryItems?.(day,trip)?.[0]||day?.items?.[0]||null}catch{return day?.items?.[0]||null}
  }

  function suggestedLegIndex(hubs,day,trip){
    if(hubs.length<2)return 0;
    if(!window.SakuraTripStore?.isTripLive?.(trip))return 0;
    const item=targetItem(day,trip);if(!item)return 0;
    const target=resolveHub(item.place||item.title||item.japaneseName||'');
    if(!target)return 0;
    const index=hubs.findIndex(h=>h.key===target.key);
    return index>0?index-1:0;
  }

  async function resolveItinerary(trip,day,city){
    await ensureCity(city);
    const hubs=[];
    for(const segment of itinerarySegments(day)){
      const hub=resolveHub(segment);
      if(hub && hubs.at(-1)?.key!==hub.key)hubs.push(hub);
    }
    return hubs;
  }

  function lineLabel(line){
    const code=String(line?.code||'').trim();
    const name=String(line?.name||'Train').trim();
    return code && !name.includes(code)?`${code} · ${name}`:name;
  }

  function planRoute(fromText,toText){
    const from=resolveHub(fromText),to=resolveHub(toText);
    if(!from||!to){
      const missing=[!from?`“${fromText}”`:'',!to?`“${toText}”`:''].filter(Boolean).join(' and ');
      throw new Error(`I couldn't match ${missing} to a station in Sakura's ${state.city} rail database.`);
    }
    const options=findRailNetworkRouteOptions(from.key,to.key,3);
    const route=options?.[0];
    if(!route)throw new Error(`No offline rail route was found between ${from.name} and ${to.name}.`);
    if(route.sameStation)return {from,to,route,steps:[],time:{totalMinutes:0},options};
    const steps=railNetworkRouteSteps(route);
    const time=railNetworkRouteTime(route);
    return {from,to,route,steps,time,options};
  }

  function rideMinutes(step){
    try{return railNetworkRideMinutes(step)}catch{return null}
  }
  function direction(step){
    const stations=step?.stations||[];
    if(stations.length<2)return '';
    try{return railDirectionForPair(step.line,stations[0].code,stations[1].code)||''}catch{return ''}
  }

  function renderPlan(plan,{label='ITINERARY ROUTE'}={}){
    state.lastPlan=plan;
    const box=document.querySelector('#sakura-transit-rescue [data-str-result]');
    if(!box)return;
    if(plan.route.sameStation){
      box.innerHTML=`<div class="str-summary"><span>${label}</span><strong>0 min</strong><b>${ESC(plan.from.name)}</b></div><div class="str-route-note">You're already at the selected station hub.</div>`;
      return;
    }
    const total=Number(plan.time?.totalMinutes)||0;
    const transfers=plan.route?.transfers||0;
    const steps=plan.steps.map(step=>{
      if(step.type==='ride'){
        const stations=step.stations||[],first=stations[0],last=stations.at(-1),stops=Math.max(0,stations.length-1),mins=rideMinutes(step),dir=direction(step);
        return `<div class="str-step"><div class="str-step-icon">🚆</div><div><strong>Take ${ESC(lineLabel(step.line))}</strong><small>${ESC(first?.name||'')} → ${ESC(last?.name||'')} · ${stops} stop${stops===1?'':'s'}${Number.isFinite(mins)?` · ~${mins} min`:''}${step.line?.operator?`<br>${ESC(step.line.operator)}`:''}</small>${dir?`<span class="str-direction">Direction: ${ESC(dir)}</span>`:''}</div></div>`;
      }
      const station=step.transferName||step.hub?.name||step.fromStation?.name||'Transfer';
      return `<div class="str-step"><div class="str-step-icon">🔁</div><div><strong>Transfer at ${ESC(station)}</strong><small>${ESC(lineLabel(step.fromLine))} → ${ESC(lineLabel(step.toLine))}${step.transferNote?`<br>${ESC(step.transferNote)}`:''}</small></div></div>`;
    }).join('');
    box.innerHTML=`<div class="str-summary"><span>${label} · OFFLINE ESTIMATE</span><strong>~${total} min</strong><b>${ESC(plan.from.name)} → ${ESC(plan.to.name)}</b><span>${transfers} transfer${transfers===1?'':'s'} · ${plan.route.rideStops||0} rail stops</span></div>${steps}<div class="str-route-note">This uses Sakura's offline Railway System map. It shows which lines and transfers to take, but not live departure times, delays, platform changes, or service disruptions.</div>`;
  }

  function renderBase(){
    const day=state.day,trip=state.trip;
    const hubs=state.hubs;
    const legs=hubs.length>1?hubs.slice(0,-1).map((hub,index)=>[hub,hubs[index+1]]):[];
    const selected=Math.max(0,Math.min(state.selectedLeg,Math.max(0,legs.length-1)));
    state.selectedLeg=selected;
    const pair=legs[selected]||[];
    const from=pair[0]?.name||'';const to=pair[1]?.name||'';
    main().innerHTML=`
      <section class="str-card"><div class="str-kicker">${window.SakuraTripStore?.isTripLive?.(trip)?'NEXT RAIL MOVE':'ITINERARY RAIL PLAN'}</div><h2>${ESC(day?.title||'Today')}</h2><div class="str-muted">Sakura reads the rail anchors from your saved itinerary and uses the same offline route engine as Railway System.</div>
      ${legs.length?`<div class="str-legs">${legs.map(([a,b],i)=>`<button type="button" class="str-leg ${i===selected?'on':''}" data-str-leg="${i}"><small>LEG ${i+1}</small><strong>${ESC(a.name)} → ${ESC(b.name)}</strong></button>`).join('')}</div>`:`<div class="str-warning">I couldn't identify two station stops from this day's itinerary route. You can still enter your own stations below.</div>`}</section>
      <section class="str-card"><div class="str-kicker">Take this route</div><div data-str-result><div class="str-loading">Finding the train route…</div></div><div class="str-actions"><button type="button" data-str-detour>↪ Change route / detour</button><button type="button" data-str-full>Open full Railway System</button></div>
      <div class="str-detour" data-str-detour-panel><div class="str-fields"><div class="str-field city"><label>Rail area</label><select data-str-city><option value="tokyo" ${state.city==='tokyo'?'selected':''}>Tokyo / Greater Tokyo</option><option value="osaka" ${state.city==='osaka'?'selected':''}>Osaka</option><option value="kyoto" ${state.city==='kyoto'?'selected':''}>Kyoto</option></select></div><div class="str-field"><label>From station</label><input data-str-from autocomplete="off" value="${ESC(from)}" placeholder="e.g. Shinjuku"></div><div class="str-field"><label>To station</label><input data-str-to autocomplete="off" value="${ESC(to)}" placeholder="e.g. Asakusa"></div></div><div class="str-actions"><button type="button" data-str-reset>Use itinerary route</button><button type="button" class="primary" data-str-plan>Find train route</button></div></div></section>
      ${day?.reminder?`<section class="str-card"><div class="str-kicker">Trip reminder</div><div class="str-warning">${ESC(day.reminder)}</div></section>`:''}`;
    if(from&&to){
      try{renderPlan(planRoute(from,to))}catch(error){document.querySelector('#sakura-transit-rescue [data-str-result]').innerHTML=`<div class="str-error">${ESC(error.message)}</div>`}
    }else document.querySelector('#sakura-transit-rescue [data-str-result]').innerHTML='<div class="str-route-note">Enter From and To stations below to build a route.</div>';
  }

  async function open({trip,day}={}){
    shell();
    const store=window.SakuraTripStore;
    const activeTrip=trip||store?.currentTrip?.();
    if(!activeTrip)return;
    const activeDay=day||activeTrip.days?.[store?.currentDayIndex?.(activeTrip)||0];
    state={trip:activeTrip,day:activeDay,city:guessCity(activeTrip,activeDay),hubs:[],selectedLeg:0,custom:false,lastPlan:null};
    const r=root();r.classList.add('open');r.setAttribute('aria-hidden','false');
    r.querySelector('[data-str-main]').innerHTML='<div class="str-loading">Preparing your itinerary rail route…</div>';
    try{
      state.hubs=await resolveItinerary(activeTrip,activeDay,state.city);
      state.selectedLeg=suggestedLegIndex(state.hubs,activeDay,activeTrip);
      renderBase();
    }catch(error){
      main().innerHTML=`<section class="str-card"><div class="str-kicker">Transit Rescue</div><h2>Enter your route</h2><div class="str-error">${ESC(error.message||'Rail data is unavailable right now.')}</div><div class="str-actions"><button type="button" data-str-retry>Try again</button><button type="button" data-str-full>Open Railway System</button></div></section>`;
    }
  }

  function close({returnToDay=true}={}){
    const r=root();if(!r)return;r.classList.remove('open');r.setAttribute('aria-hidden','true');
    if(returnToDay){
      setTimeout(()=>document.querySelector('#sakura-trip-companion [data-back]')?.click(),0);
    }
  }

  function openFullRail(){
    const plan=state.lastPlan;
    close({returnToDay:false});
    window.SakuraTripCompanion?.close?.();
    if(typeof showRoute!=='function')return;
    showRoute('travel-rail');
    setTimeout(async()=>{
      try{
        await selectRailCity(state.city);
        const from=plan?.from||resolveHub(document.querySelector('#sakura-transit-rescue [data-str-from]')?.value||'');
        const to=plan?.to||resolveHub(document.querySelector('#sakura-transit-rescue [data-str-to]')?.value||'');
        if(from&&to){
          railNetworkPlannerState.from=from.key;railNetworkPlannerState.to=to.key;
          const fi=document.getElementById('rail-network-from-input'),ti=document.getElementById('rail-network-to-input');
          if(fi)fi.value=from.name;if(ti)ti.value=to.name;
          renderRailNetworkRoute(from.key,to.key);
        }
      }catch(error){console.warn('Could not prefill Railway System from Transit Rescue.',error)}
    },120);
  }

  document.addEventListener('click',async event=>{
    const help=event.target.closest?.('#sakura-trip-companion [data-help="transit"]');
    if(help){
      const store=window.SakuraTripStore,trip=store?.currentTrip?.(),day=trip?.days?.[store?.currentDayIndex?.(trip)||0];
      setTimeout(()=>open({trip,day}),0);return;
    }
    if(!event.target.closest?.('#sakura-transit-rescue'))return;
    if(event.target.closest('[data-str-back]'))return close();
    if(event.target.closest('[data-str-rail],[data-str-full]'))return openFullRail();
    if(event.target.closest('[data-str-retry]'))return open({trip:state.trip,day:state.day});
    const leg=event.target.closest('[data-str-leg]');
    if(leg){state.selectedLeg=Number(leg.dataset.strLeg)||0;return renderBase()}
    const detour=event.target.closest('[data-str-detour]');
    if(detour){document.querySelector('#sakura-transit-rescue [data-str-detour-panel]')?.classList.toggle('open');return}
    if(event.target.closest('[data-str-reset]'))return renderBase();
    if(event.target.closest('[data-str-plan]')){
      const from=document.querySelector('#sakura-transit-rescue [data-str-from]')?.value.trim()||'';
      const to=document.querySelector('#sakura-transit-rescue [data-str-to]')?.value.trim()||'';
      const city=document.querySelector('#sakura-transit-rescue [data-str-city]')?.value||state.city;
      const result=document.querySelector('#sakura-transit-rescue [data-str-result]');
      if(!from||!to){if(result)result.innerHTML='<div class="str-error">Enter both From and To stations.</div>';return}
      if(result)result.innerHTML='<div class="str-loading">Finding your detour route…</div>';
      try{state.city=city;await ensureCity(city);renderPlan(planRoute(from,to),{label:'DETOUR ROUTE'})}catch(error){if(result)result.innerHTML=`<div class="str-error">${ESC(error.message)}</div>`}
      return;
    }
  });

  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root()?.classList.contains('open'))close()});
  window.SakuraTransitRescue=Object.freeze({version:1,open,close,plan:(from,to,city='tokyo')=>ensureCity(city).then(()=>planRoute(from,to))});
}());
