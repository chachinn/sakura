import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const context={console};context.globalThis=context;context.window=context;vm.createContext(context);
vm.runInContext(read('features/sakura-trip-core.js'),context,{filename:'sakura-trip-core.js'});
const C=context.SakuraTripCore;assert.equal(C.version,1);

const day={date:'2026-10-19',items:[
  {time:'07:00',title:'Morning Prep + Light Breakfast | Place | Time',type:'other'},
  {time:'09:30',title:'Hasedera Temple',place:'Hasedera',address:'3-11-2 Hase, Kamakura',type:'attraction'},
  {time:'15:30',title:'Travel to Enoshima',type:'transport'}
]};
assert.equal(C.bestDestination(day).item.title,'Hasedera Temple','Show This Place must ignore prep/header rows');
assert.ok(C.destinationScore(day.items[0])<0,'prep/header row must score as non-destination');

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

const extras=C.extractWorkbookExtras({sheets:[
  {name:'Packing',role:'packing',rows:[{row:1,text:'Packing'},{row:2,text:'Passport and power bank'}]},
  {name:'Budget',role:'budget',rows:[{row:2,text:'Day 2 Kamakura ¥45,000 couple'}]},
  {name:'Pasalubong',role:'shopping',rows:[{row:2,text:'Japanese coaster set'}]},
  {name:'To Book',role:'booking_tasks',rows:[{row:2,text:'Reserve Komagata Maekawa'}]},
  {name:'To add in itinerary',role:'notes',rows:[{row:2,text:'Keep Yokohama ticket stub'}]}
]});
assert.equal(extras.packing.length,1);assert.equal(extras.budget.length,1);assert.equal(extras.shopping.length,1);assert.equal(extras.booking.length,1);assert.equal(extras.notes.length,1);

const loader=read('features/sakura-trip-companion.js');
for(const required of ['sakura-trip-core.js','sakura-trip-store-upgrade.js','sakura-trip-workbook-extras.js','sakura-camera-japanese-v2.js','sakura-trip-companion-stabilize-v2.js'])assert.ok(loader.includes(required),`loader missing ${required}`);
assert.ok(loader.indexOf('sakura-trip-store-upgrade.js')<loader.indexOf('sakura-trip-companion-ui.js'),'stable store upgrade must load before Trip UI captures the store');
assert.ok(loader.indexOf('sakura-trip-workbook-extras.js')<loader.indexOf('sakura-trip-file-sync.js'),'workbook extras must register before file-sync clears the file input');

const camera=read('features/sakura-camera-japanese-v2.js');
assert.ok(camera.includes('Visible Japanese')&&camera.includes('English translation'),'Camera Japanese must show transcription and translation separately');
assert.ok(camera.includes('returnContext')&&camera.includes('SakuraTripCompanion?.open'),'Camera Japanese must restore Trip Companion context');
const stabilizer=read('features/sakura-trip-companion-stabilize-v2.js');
assert.ok(stabilizer.includes('Full day timeline'));assert.ok(stabilizer.includes('Useful workbook tabs'));assert.ok(stabilizer.includes('Japan offline readiness'));
const sw=read('service-worker.js');assert.ok(sw.includes('sakura-shell-v176'));assert.ok(sw.includes('sakura-trip-companion-stabilize-v2.'));

console.log('Travel Companion QA: all regression checks passed.');
