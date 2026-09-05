import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const bridgeSource=fs.readFileSync('features/sakura-trip-transit-bridge.js','utf8');
const loaderSource=fs.readFileSync('features/sakura-trip-companion.js','utf8');
const swSource=fs.readFileSync('service-worker.js','utf8');

assert.ok(bridgeSource.includes('version:3'),'Transit bridge must expose v3');
assert.ok(bridgeSource.includes('[data-help="transit"]'),'Transit bridge must own Quick Help Transit Rescue');
assert.ok(bridgeSource.includes('[data-stz2-rail]'),'Transit bridge must also own Full day timeline Railway buttons');
assert.ok(bridgeSource.includes('stopImmediatePropagation'),'Trip Companion rail entry must beat document-level legacy handlers');
assert.ok(bridgeSource.includes('repairLegacyRail'),'Transit bridge must be able to replace a legacy live-tools wrapper if one still appears');
assert.ok(bridgeSource.includes('.stlv-rail-context'),'Legacy live-tools wrapper must be explicitly detected and removed');
assert.ok(loaderSource.includes('__sakuraTripCompanionLoadingV27'),'Trip Companion loader must advance to v27');
assert.ok(loaderSource.includes('sakura-trip-transit-bridge.js?v=3'),'Loader must request Transit bridge v3');
assert.ok(loaderSource.indexOf('sakura-trip-transit-bridge.js')<loaderSource.indexOf('sakura-trip-companion-stabilize-v2.js'),'Transit bridge must load before timeline Railway controls are installed');
assert.ok(loaderSource.indexOf('sakura-trip-companion-stabilize-v2.js')<loaderSource.indexOf('sakura-trip-return-state.js'),'Established exact-position return layer must remain after the timeline stabilizer');
assert.ok(swSource.includes('sakura-shell-v180'),'PWA shell must advance for the rail-entry release');

const clickListeners=[];
let pinnedOpens=0;
const trip={id:'trip-1',days:[{date:'2026-10-19',title:'Kamakura Day'}]};
const routeResult={textContent:'Recommended · Offline Route',getBoundingClientRect:()=>({top:220})};
const railView={dataset:{},classList:{contains:()=>false},querySelector:()=>null};
const memory=new Map([['preview:trip-1','0']]);

const context={
  console,
  Date,
  Math,
  Promise,
  setTimeout,
  clearTimeout,
  requestAnimationFrame:fn=>fn(),
  Event:class Event{constructor(type,init={}){this.type=type;Object.assign(this,init)}},
  MutationObserver:class MutationObserver{constructor(callback){this.callback=callback}observe(){}},
};
context.window=context;
context.globalThis=context;
context.scrollY=0;
context.scrollTo=()=>{};
context.addEventListener=(type,listener)=>{if(type==='click')clickListeners.push(listener)};
context.localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,String(value)),
  removeItem:key=>memory.delete(key),
};
context.SakuraTripStore={
  keys:{PREVIEW_DAY_PREFIX:'preview:'},
  currentTrip:()=>trip,
  currentDayIndex:()=>0,
  loadTrips:()=>[trip],
  setActiveTrip:()=>{},
};
context.SakuraTripPinnedRail={
  version:2,
  open:async()=>{pinnedOpens+=1},
  returnToTrip:()=>{},
};
context.document={
  readyState:'complete',
  body:{},
  head:{appendChild(){}},
  querySelector(selector){
    if(selector==='#sakura-trip-companion .stc-day.on')return{dataset:{day:'0'}};
    return null;
  },
  createElement(){return{dataset:{},addEventListener(){},remove(){}}},
  getElementById(id){
    if(id==='travel-rail-view')return railView;
    if(id==='rail-network-route-result')return routeResult;
    return null;
  },
  addEventListener(){},
};

vm.createContext(context);
vm.runInContext(bridgeSource,context,{filename:'sakura-trip-transit-bridge.js'});
assert.equal(context.SakuraTripTransitBridge.version,3);
assert.equal(clickListeners.length,2,'bridge should install entry and Back capture listeners');

function eventFor(kind){
  const state={prevented:false,stopped:false,immediate:false};
  return {
    state,
    target:{
      closest(selector){
        if(kind==='timeline'&&selector.includes('[data-stz2-rail]'))return{hasAttribute:name=>name==='data-stz2-rail'};
        if(kind==='quick-help'&&selector.includes('[data-help="transit"]'))return{hasAttribute:()=>false};
        return null;
      },
    },
    preventDefault(){state.prevented=true},
    stopPropagation(){state.stopped=true},
    stopImmediatePropagation(){state.immediate=true},
  };
}

const timelineEvent=eventFor('timeline');
clickListeners[0](timelineEvent);
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(pinnedOpens,1,'timeline Railway must open pinned Railway, not live-tools Railway');
assert.deepEqual(timelineEvent.state,{prevented:true,stopped:true,immediate:true});

const quickHelpEvent=eventFor('quick-help');
clickListeners[0](quickHelpEvent);
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(pinnedOpens,2,'Quick Help Transit Rescue must open the same pinned Railway runtime');
assert.deepEqual(quickHelpEvent.state,{prevented:true,stopped:true,immediate:true});

console.log('Trip rail entry QA: Quick Help and timeline Railway both route through pinned Railway.');
