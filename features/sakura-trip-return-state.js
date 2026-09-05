/* Sakura Trip Companion Return State v1 — preserve exact day position across subtools and internal screens. */
(function initializeSakuraTripReturnState(){
'use strict';
if(window.SakuraTripReturnState?.version>=1)return;

const S=()=>window.SakuraTripStore;
const R=()=>document.getElementById('sakura-trip-companion');
let pending=null,restoreTimer=0,wrapped=false;

function activeDayIndex(t){
  if(!t?.days?.length)return 0;
  const on=R()?.querySelector('.stc-day.on');
  if(on){const n=Number(on.dataset.day);if(Number.isInteger(n)&&t.days[n])return n}
  try{
    const key=(S()?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:')+t.id;
    const n=Number(localStorage.getItem(key));
    if(Number.isInteger(n)&&t.days[n])return n;
  }catch{}
  return S()?.currentDayIndex?.(t)||0;
}
function isDayView(){
  const r=R(),days=r?.querySelector('[data-days]');
  return !!(r?.classList.contains('open')&&days&&!days.hidden);
}
function currentContext(){
  if(!isDayView())return null;
  const t=S()?.currentTrip?.(),r=R(),scroller=r?.querySelector('.stc-scroll'),days=r?.querySelector('[data-days]');
  if(!t||!scroller)return null;
  return {tripId:t.id,dayIndex:activeDayIndex(t),scrollTop:scroller.scrollTop||0,daysScrollLeft:days?.scrollLeft||0,hadTimeline:!!r.querySelector('.stz2-timeline')};
}
function capture(reason='tool'){
  const ctx=currentContext();if(!ctx)return null;
  pending={...ctx,reason,capturedAt:Date.now(),returnRequested:false};
  setTimeout(()=>{if(pending&&!pending.returnRequested&&sameContext()&&!blockingToolOpen())clear()},450);
  return {...pending};
}
function clear(){pending=null;clearTimeout(restoreTimer);restoreTimer=0}
function sameContext(){
  if(!pending||!isDayView())return false;
  const t=S()?.currentTrip?.();
  return !!(t&&t.id===pending.tripId&&activeDayIndex(t)===pending.dayIndex);
}
function blockingToolOpen(){
  if(document.querySelector('#stz-place-v2.open,#sakura-camera-japanese.open'))return true;
  const talk=document.getElementById('sakura-interpreter');
  if(talk&&!talk.hidden)return true;
  const rail=document.getElementById('travel-rail-view');
  if(rail?.classList.contains('stpr-trip-mode')&&!R()?.classList.contains('open'))return true;
  return false;
}
function applyPosition(){
  if(!pending||!sameContext()||blockingToolOpen())return false;
  const r=R(),scroller=r?.querySelector('.stc-scroll'),days=r?.querySelector('[data-days]');if(!scroller)return false;
  const max=Math.max(0,scroller.scrollHeight-scroller.clientHeight),top=Math.max(0,Math.min(pending.scrollTop,max));
  scroller.scrollTop=top;
  if(days)days.scrollLeft=Math.max(0,pending.daysScrollLeft||0);
  return true;
}
function restoreWhenReady(attempt=0){
  if(!pending||!pending.returnRequested)return;
  const waitingForTimeline=!!(pending.hadTimeline&&!R()?.querySelector('.stz2-timeline'));
  if(blockingToolOpen()||!sameContext()||waitingForTimeline){
    if(attempt<18){restoreTimer=setTimeout(()=>restoreWhenReady(attempt+1),35);return}
    return;
  }
  // Trip Companion decorators inject the timeline/live cards just after the base day renders.
  // Wait a couple of frames, then set the position twice so late decoration cannot bump the user to the top.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!pending||!sameContext())return;
    applyPosition();
    restoreTimer=setTimeout(()=>{
      if(!pending||!sameContext())return;
      applyPosition();
      clear();
    },55);
  }));
}
function requestRestore(reason='back'){
  if(!pending)return;
  pending.returnRequested=true;pending.returnReason=reason;pending.returnAt=Date.now();
  clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>restoreWhenReady(0),20);
}
function wrapCompanionOpen(){
  if(wrapped)return;
  const api=window.SakuraTripCompanion;if(!api?.open)return;
  if(api.__returnStateV1){wrapped=true;return}
  const originalOpen=api.open.bind(api);
  window.SakuraTripCompanion=Object.freeze({...api,__returnStateV1:true,open:(index,...args)=>{
    const out=originalOpen(index,...args);
    if(pending)requestRestore('companion-open');
    return out;
  }});
  wrapped=true;
}

const LEAVE_SELECTOR=[
  '#sakura-trip-companion [data-help="place"]',
  '#sakura-trip-companion [data-help="transit"]',
  '#sakura-trip-companion [data-help="camera"]',
  '#sakura-trip-companion [data-help="sakutalk"]',
  '#sakura-trip-companion [data-stz2-show]',
  '#sakura-trip-companion [data-stz2-rail]',
  '#sakura-trip-companion [data-stlv-home]',
  '#sakura-trip-companion [data-all]',
  '#sakura-trip-companion [data-trips]'
].join(',');
const RETURN_SELECTOR=[
  '#stz-place-v2 [data-stz2-back]',
  '#sakura-camera-japanese [data-scj2-back]',
  '#sakura-interpreter [data-ti-close]',
  '#travel-rail-view .back-button[data-stpr-return]'
].join(',');
const CANCEL_SELECTOR=[
  '#sakura-trip-companion .stc-day',
  '#sakura-trip-companion [data-open-day]',
  '#sakura-trip-companion [data-open-trip]',
  '#sakura-trip-companion [data-import]',
  '#sakura-trip-companion [data-save]'
].join(',');

window.addEventListener('click',event=>{
  const target=event.target;
  if(target?.closest?.(LEAVE_SELECTOR)){capture(target.closest('[data-help]')?.dataset.help||'trip-screen');return}
  if(target?.closest?.(RETURN_SELECTOR)){requestRestore('tool-back');return}
  const companionBack=target?.closest?.('#sakura-trip-companion [data-back]');
  if(companionBack){
    if(isDayView()){clear();return}
    if(pending)requestRestore('companion-back');
    return;
  }
  if(target?.closest?.(CANCEL_SELECTOR)){clear();return}
},true);

window.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!pending)return;
  const r=R();if(r?.classList.contains('open')&&!isDayView())requestRestore('escape-back');
},true);

function init(){wrapCompanionOpen()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setTimeout(wrapCompanionOpen,0);

window.SakuraTripReturnState=Object.freeze({version:1,capture,requestRestore,clear,getPending:()=>pending?{...pending}:null});
}());
