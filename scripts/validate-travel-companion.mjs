import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const context={console};context.globalThis=context;context.window=context;vm.createContext(context);
vm.runInContext(read('features/sakura-trip-core.js'),context,{filename:'sakura-trip-core.js'});
const C=context.SakuraTripCore;assert.equal(C.version,2);

const day={date:'2026-10-19',items:[
  {time:'07:00',title:'Morning Prep + Light Breakfast | Place | Time',type:'other'},
  {time:'09:30',title:'Hasedera Temple',place:'Hasedera',address:'3-11-2 Hase, Kamakura',type:'attraction'},
  {time:'15:30',title:'Travel to Enoshima',type:'transport'}
]};
assert.equal(C.bestDestination(day).item.title,'Hasedera Temple','Show This Place must ignore prep/header rows');
assert.equal(C.bestDestination(day).item.japaneseName,'長谷寺','known destinations must gain an offline Japanese name');
assert.ok(C.destinationScore(day.items[0])<0,'prep/header row must score as non-destination');
const renbai=C.resolveDestinationDisplay({title:'Kamakura Renbai Farmers’ Market',type:'attraction'});
assert.equal(renbai.japaneseName,'鎌倉市農協連即売所','Renbai must use its official Japanese destination name');
assert.match(renbai.japaneseAddress,/神奈川県鎌倉市小町1-13-10/,'Renbai must have its Japanese address offline');
assert.equal(C.resolveDestinationDisplay({title:'Unknown Private Venue'}).japaneseName,'','unknown named venues must not receive fabricated Japanese names');
assert.equal(C.resolveDestinationDisplay({title:'Hasedera Temple',japaneseName:'保存済み正式名'}).japaneseName,'保存済み正式名','saved itinerary japaneseName must remain authoritative');

const guidance=C.guidanceLines({route:'convenient brand option near Shinjuku East Exit • SOUTH EXIT • Seibu bus stop 1 • DO NOT TAKE 武17',items:[]});
assert.ok(!guidance.some(x=>/convenient brand/i.test(x)),'near-exit shop prose must not become transit guidance');
assert.ok(guidance.some(x=>/SOUTH EXIT/i.test(x)),'explicit exit instruction must remain');
assert.ok(guidance.some(x=>/bus stop 1/i.test(x)),'bus-stop instruction must remain');
assert.ok(guidance.some(x=>/武17/i.test(x)),'do-not-take warning must remain');

const checklist=C.checklistLines({reminder:'SPY×FAMILY tickets are already paid and secured. Keep the Animate Yokohama ticket stub. JR Yamanote Line → Shinjuku → station/walking buffer.',items:[]});
assert.ok(checklist.some(x=>/ticket stub/i.test(x)),'real keep reminder must remain');
assert.ok(!checklist.some(x=>/already paid/i.test(x)),'completed booking prose must not become checklist');
assert.ok(!checklist.some(x=>/Yamanote/i.test(x)),'route prose must not become checklist');

const oldTrip={days:[{date:'2026-10-21',title:'MAPPA Day',items:[{time:'16:00',title:'MAPPA Expo',place:'Yurakucho Museum',reservation:true}]}]};
const newTrip={days:[{date:'2026-10-21',title:'MAPPA Day',items:[{time:'15:45',title:'MAPPA Expo',place:'Yurakucho Museum',reservation:true}]}]};
const oldId=C.assignStableIds(oldTrip.days[0])[0].id,newId=C.assignStableIds(newTrip.days[0])[0].id;
assert.equal(oldId,newId,'time-only changes must keep stable stop identity');
const diff=C.diffTrip(oldTrip,newTrip);
assert.equal(diff.filter(x=>x.kind==='changed').length,1,'time-only change must be reported as changed');
assert.equal(diff.filter(x=>x.kind==='added'||x.kind==='removed').length,0,'time-only change must not become add/remove');

const savedTrips=[{id:'october',name:'Japan',startDate:'2026-10-21',endDate:'2026-10-21',timezone:'Asia/Tokyo',days:[{date:'2026-10-21',title:'MAPPA Day',items:[{id:'existing-mappa-id',time:'16:00',title:'MAPPA Expo',place:'Yurakucho Museum',type:'event',priority:'critical',reservation:true}]}]}];
const memory=new Map([['active','october']]);let persisted=structuredClone(savedTrips);
const storeContext={console,structuredClone,JSON,Math,Date,setTimeout,clearTimeout};storeContext.globalThis=storeContext;storeContext.window=storeContext;storeContext.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};storeContext.document={dispatchEvent(){}};storeContext.CustomEvent=function(){};vm.createContext(storeContext);vm.runInContext(read('features/sakura-trip-core.js'),storeContext);
const stripTrip=raw=>({id:String(raw.id||'incoming'),name:String(raw.name||'Japan'),destination:String(raw.destination||''),startDate:String(raw.startDate||raw.days?.[0]?.date||''),endDate:String(raw.endDate||raw.days?.at?.(-1)?.date||raw.days?.[0]?.date||''),timezone:String(raw.timezone||'Asia/Tokyo'),hotel:String(raw.hotel||''),source:String(raw.source||'import'),days:(raw.days||[]).map(d=>({date:d.date,title:d.title||'Day',emoji:d.emoji||'🌸',route:d.route||'',reminder:d.reminder||'',planB:d.planB||'',phrases:d.phrases||[],items:(d.items||[]).map(i=>({time:i.time||'',title:i.title||'',place:i.place||'',japaneseName:i.japaneseName||'',address:i.address||'',type:i.type||'other',priority:i.priority||'normal',reservation:!!i.reservation,leaveBy:i.leaveBy||'',note:i.note||'',reminder:i.reminder||'',planB:i.planB||''}))}))});
storeContext.SakuraTripStore={version:1,keys:{ACTIVE_TRIP_KEY:'active',PREVIEW_DAY_PREFIX:'preview:'},loadTrips:()=>structuredClone(persisted),saveTrips:x=>{persisted=structuredClone(x)},normalizeTrip:stripTrip,tripMatch:(incoming,trips)=>trips.find(t=>t.id==='october')||null,setActiveTrip:id=>memory.set('active',id),isTripLive:()=>false,dateKeyInTimezone:()=> '2026-09-05',parseTripPack:x=>x,understand:async x=>x};
vm.runInContext(read('features/sakura-trip-store-upgrade.js'),storeContext,{filename:'sakura-trip-store-upgrade.js'});
storeContext.SakuraTripStore.applyImport({id:'incoming',name:'Japan',startDate:'2026-10-21',endDate:'2026-10-21',timezone:'Asia/Tokyo',days:[{date:'2026-10-21',title:'MAPPA Day',items:[{time:'15:45',title:'MAPPA Expo',place:'Yurakucho Museum',type:'event',priority:'critical',reservation:true}]}]},'replace-trip');
assert.equal(persisted[0].days[0].items[0].id,'existing-mappa-id','replace/resync must preserve the existing stop ID');
assert.equal(persisted[0].days[0].items[0].time,'15:45','replace/resync must still apply the changed time');

const extras=C.extractWorkbookExtras({sheets:[
  {name:'Packing',role:'packing',rows:[{row:1,text:'Packing'},{row:2,text:'Passport and power bank'}]},
  {name:'Budget',role:'budget',rows:[{row:2,text:'Day 2 Kamakura ¥45,000 couple'}]},
  {name:'Pasalubong',role:'shopping',rows:[{row:2,text:'Japanese coaster set'}]},
  {name:'To Book',role:'booking_tasks',rows:[{row:2,text:'Reserve Komagata Maekawa'}]},
  {name:'To add in itinerary',role:'notes',rows:[{row:2,text:'Keep Yokohama ticket stub'}]}
]});
assert.equal(extras.packing.length,1);assert.equal(extras.budget.length,1);assert.equal(extras.shopping.length,1);assert.equal(extras.booking.length,1);assert.equal(extras.notes.length,1);

const railContext={console,setTimeout,clearTimeout,Intl,Date};railContext.globalThis=railContext;railContext.window=railContext;railContext.document={readyState:'loading',addEventListener(){},getElementById(){return null}};vm.createContext(railContext);vm.runInContext(read('features/sakura-trip-pinned-rail.js'),railContext,{filename:'sakura-trip-pinned-rail.js'});
const P=railContext.SakuraTripPinnedRail;assert.equal(P.version,2);
const day2={route:'From: Takadanobaba Station • JR Yamanote Line → Shinjuku • JR Shonan-Shinjuku Line / Yokosuka-through service → Kamakura • At Enoden Kamakura Station:',items:[
  {time:'06:45',title:'Travel to Kamakura',type:'transport'},
  {time:'08:20',title:'Buy Enoden 1-Day Pass + Travel to Hase',type:'transport'},
  {time:'09:25',title:'Walk to Great Buddha',type:'other'},
  {time:'10:50',title:'Walk / Enoden to Gokurakuji',type:'other'},
  {time:'11:25',title:'Enoden Coastal Ride to Koshigoe',type:'other'},
  {time:'18:35',title:'Descend + Return to Katase-Enoshima',type:'other'},
  {time:'19:10',title:'Return to Takadanobaba',type:'other'}
]};
const railPairs=Array.from(P.rawPairsForDay(day2),x=>`${x.from} → ${x.to}`);
assert.ok(railPairs.includes('Takadanobaba Station → Kamakura'),'Day 2 must produce the outbound Takadanobaba → Kamakura rail leg');
assert.ok(railPairs.includes('Kamakura → Hase'),'Day 2 must produce the Kamakura → Hase Enoden leg');
assert.ok(railPairs.includes('Hase → Gokurakuji'),'Day 2 must carry the last station anchor across attraction walks');
assert.ok(railPairs.includes('Gokurakuji → Koshigoe'),'Day 2 must produce the coastal Enoden leg');
assert.ok(!railPairs.some(x=>/Great Buddha/.test(x)),'attractions must not be promoted to railway station anchors');

const loader=read('features/sakura-trip-companion.js');
for(const required of ['sakura-trip-core.js?v=2','sakura-trip-store-upgrade.js','sakura-trip-workbook-extras.js','sakura-camera-japanese-v2.js?v=2','sakura-trip-transit-bridge.js?v=2','sakura-trip-pinned-rail.js?v=2','sakura-trip-rail-runtime-guard.js?v=2','sakura-trip-companion-stabilize-v2.js'])assert.ok(loader.includes(required),`loader missing ${required}`);
assert.ok(loader.includes('__sakuraTripCompanionLoadingV26'),'loader guard must advance for the resilient Transit bridge release');
assert.ok(loader.includes('SakuraCameraJapanese?.version>=3'),'loader must require Camera Japanese v3');
assert.ok(loader.includes('SakuraTripTransitBridge?.version>=2'),'loader must reject the old Transit bridge that delegates to live-tools');
assert.ok(loader.includes('SakuraTripRailRuntimeGuard?.version>=2'),'loader must retain Trip Companion rail runtime guard v2');
assert.ok(loader.includes('existing.remove()'),'loader must replace already-loaded stale versioned assets');
assert.ok(loader.indexOf('sakura-trip-store-upgrade.js')<loader.indexOf('sakura-trip-companion-ui.js'),'stable store upgrade must load before Trip UI captures the store');
assert.ok(loader.indexOf('sakura-trip-workbook-extras.js')<loader.indexOf('sakura-trip-file-sync.js'),'workbook extras must register before file-sync clears the file input');
assert.ok(loader.indexOf('sakura-trip-live-tools.js')<loader.indexOf('sakura-trip-transit-bridge.js'),'live tools may initialize first, but the resilient Transit bridge must immediately supersede its generic Transit API');
assert.ok(loader.indexOf('sakura-trip-transit-bridge.js')<loader.indexOf('sakura-trip-pinned-rail.js'),'Transit bridge must load before pinned rail so it survives a later Railway-layer load failure');
assert.ok(loader.indexOf('sakura-trip-return-state.js')<loader.indexOf('sakura-trip-rail-runtime-guard.js'),'return-state must remain ready before the rail runtime guard');

const transitBridge=read('features/sakura-trip-transit-bridge.js');
assert.ok(transitBridge.includes('version:2'),'Transit bridge runtime must advance to v2');
assert.ok(transitBridge.includes('REQUIRED_PINNED_VERSION=2'),'Transit bridge must require the pinned Railway runtime rather than trust SakuraTransitRescue');
assert.ok(transitBridge.includes('ensurePinned'),'Transit bridge must be able to load pinned Railway itself');
assert.ok(!transitBridge.includes('const api=window.SakuraTransitRescue'),'Transit bridge must not delegate Trip Companion Transit to the generic live-tools Transit API');
assert.ok(transitBridge.includes('data-help="transit"'),'Transit bridge must own Trip Companion Transit clicks');
assert.ok(transitBridge.includes('stopImmediatePropagation'),'Transit bridge must block older transit handlers');
assert.ok(transitBridge.includes('focusRouteResult'),'Transit bridge must land on the actual Railway route result');
assert.ok(transitBridge.includes("#travel-rail-view .back-button"),'Transit bridge must own Railway Back for itinerary-origin trips');
assert.ok(transitBridge.includes('returnToTrip'),'Transit bridge must route Back through pinned Trip Companion return when available');

const railGuard=read('features/sakura-trip-rail-runtime-guard.js');
assert.ok(railGuard.includes('version:2'),'rail guard runtime must remain v2');
assert.ok(railGuard.includes('normalizeLiveToolsRail'),'rail guard must retain fallback normalization');
assert.ok(railGuard.includes('focusRouteResult'),'rail guard must retain result-first fallback behavior');

const camera=read('features/sakura-camera-japanese-v2.js');
assert.ok(camera.includes('version:3'),'Camera Japanese runtime must advance to v3');
assert.ok(camera.includes('Visible Japanese')&&camera.includes('English translation · visible text only'),'Camera Japanese must separate transcription from strictly visible English translation');
assert.ok(camera.includes("' · PARTIAL'")&&camera.includes('cropped or unclear fragments marked'),'Camera Japanese must surface partial/cropped output instead of silently completing it');
assert.ok(camera.includes('literal-visible-v2'),'Camera Japanese must request the stricter grounding profile');
assert.ok(camera.includes('returnContext')&&camera.includes('SakuraTripCompanion?.open'),'Camera Japanese must restore Trip Companion context');
const stabilizer=read('features/sakura-trip-companion-stabilize-v2.js');
assert.ok(stabilizer.includes('Full day timeline'));assert.ok(stabilizer.includes('Useful workbook tabs'));assert.ok(stabilizer.includes('Japan offline readiness'));
const sw=read('service-worker.js');assert.ok(sw.includes('sakura-shell-v179'));assert.ok(sw.includes('sakura-trip-transit-bridge.'));assert.ok(sw.includes('sakura-trip-rail-runtime-guard.'));assert.ok(sw.includes('sakura-trip-companion-stabilize-v2.'));

console.log('Travel Companion QA: all regression checks passed.');
