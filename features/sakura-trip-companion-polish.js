/* Sakura Trip Companion polish v2 — concise checklists + reliable Google Sheet sync state. */
(function initializeSakuraTripCompanionPolish(){
  'use strict';
  if(window.SakuraTripCompanionPolish?.version>=2)return;

  const S=()=>window.SakuraTripStore;
  const root=()=>document.getElementById('sakura-trip-companion');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const META_KEY='sakuraTripSourceMetaV1';
  let queued=false;

  function css(){
    if(document.getElementById('sakura-trip-companion-polish-style'))return;
    const style=document.createElement('style');
    style.id='sakura-trip-companion-polish-style';
    style.textContent=`
      #sakura-trip-companion .stcp-sync{width:100%;min-height:44px;margin-top:8px;padding:9px 11px;border:1px solid color-mix(in srgb,var(--color-primary) 28%,var(--color-border));border-radius:13px;background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:11px;font-weight:850;text-align:left}
      #sakura-trip-companion .stcp-sync small{display:block;margin-top:2px;color:var(--color-text-muted);font-size:9px;font-weight:650;line-height:1.35}
      #sakura-trip-companion .stcp-empty{padding:9px 10px;border:1px dashed var(--color-border);border-radius:12px;color:var(--color-text-muted);font-size:10px;line-height:1.4}
    `;
    document.head.appendChild(style);
  }

  function currentTrip(){return S()?.currentTrip?.()||null}
  function activeDay(t=currentTrip()){
    if(!t?.days?.length)return null;
    const on=root()?.querySelector('.stc-day.on');
    if(on){const n=Number(on.dataset.day);if(Number.isInteger(n)&&t.days[n])return t.days[n]}
    try{const key=(S()?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:')+t.id,n=Number(localStorage.getItem(key));if(Number.isInteger(n)&&t.days[n])return t.days[n]}catch{}
    return t.days[S()?.currentDayIndex?.(t)||0]||t.days[0]||null;
  }
  function sourceFor(t){
    if(!t?.id)return null;
    const persisted=window.SakuraTripSourcePersistence?.sourceFor?.(t.id);
    if(persisted)return persisted;
    const synced=window.SakuraTripFileSync?.getSource?.(t.id);
    if(synced)return synced;
    try{const map=JSON.parse(localStorage.getItem(META_KEY)||'{}');return map?.[t.id]||null}catch{return null}
  }
  function runtimeState(t,d){
    const key=`sakuraTripRuntimeV1:${t?.id||'trip'}:${d?.date||'day'}`;
    try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return{}}
  }

  function splitPieces(value){
    return String(value||'')
      .replace(/\s*[•·]\s*/g,'\n')
      .replace(/\s+(?=[📌📍🎫🎟🧾🛍🛒🚆⭐🌟🏠])/g,'\n')
      .split(/\n+|(?<=[.!?])\s+/)
      .map(x=>clean(x.replace(/^[📌📍🎫🎟🧾🛍🛒🚆⭐🌟🏠\-–—•·]+\s*/u,'')))
      .filter(Boolean);
  }

  const ACTION_RE=/\b(bring|carry|keep|save|pack|pick\s*up|pickup|collect|buy|purchase|do not throw|don't throw|dont throw|have\b.{0,35}\bready|take\b.{0,35}\bwith you|remember to)\b/i;
  const IGNORE_RE=/\b(keep it light|already paid|already secured|no longer needed|will be added separately|convenient brand option|station\/walking buffer|optional brand option)\b/i;
  function actionable(value){
    const out=[];
    for(let piece of splitPieces(value)){
      if(!ACTION_RE.test(piece)||IGNORE_RE.test(piece))continue;
      piece=piece.replace(/\s+(?:🚆|⭐|🌟).*$/u,'').trim();
      if(piece.length>170){const short=piece.split(/\s+[–—-]\s+|\s+(?=\d{1,2}:\d{2})/)[0]?.trim();if(short?.length>=8)piece=short}
      if(piece.length>=8&&piece.length<=180)out.push(piece);
    }
    return out;
  }
  function checklistEntries(d){
    const out=[];
    for(const item of d?.items||[]){
      if(/shop|shopping|merch|souvenir/i.test(item.type||''))out.push(`Buy / visit: ${clean(item.title||item.place)}`);
      out.push(...actionable(item.note),...actionable(item.reminder));
    }
    out.push(...actionable(d?.reminder),...actionable(d?.route));
    const seen=new Set(),result=[];
    for(const x of out){const key=clean(x).toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g,' ');if(!key||seen.has(key))continue;seen.add(key);result.push(clean(x));if(result.length>=10)break}
    return result;
  }

  function polishChecklist(){
    const r=root(),t=currentTrip(),d=activeDay(t);if(!r||!t||!d)return;
    const card=[...r.querySelectorAll('.stlv-card')].find(c=>/Carry\s*\/\s*buy\s*\/\s*don[’']?t-forget checklist/i.test(c.textContent||''));
    const list=card?.querySelector('.stlv-list');if(!card||!list)return;
    const entries=checklistEntries(d),state=runtimeState(t,d),checks=state.checklist||{};
    const signature=JSON.stringify([entries,checks]);if(list.dataset.stcpSignature===signature)return;list.dataset.stcpSignature=signature;
    if(!entries.length){list.innerHTML='<div class="stcp-empty">No carry / buy reminders for this day.</div>';return}
    list.innerHTML=entries.map((text,n)=>`<label class="stlv-check ${checks['c'+n]?'done':''}"><input type="checkbox" data-stlv-check="c${n}" ${checks['c'+n]?'checked':''}><span>${esc(text)}</span></label>`).join('');
  }

  function syncMarkup(connected,compact=false){
    if(compact)return connected?'↻ Resync Google Sheet':'🔗 Connect Google Sheet';
    return connected
      ?'↻ Resync Google Sheet<small>Pull the latest itinerary from your connected Sheet, then review before merging.</small>'
      :'🔗 Connect Google Sheet<small>Your current trip came from a file. Connect the Sheet once to enable one-tap resync.</small>';
  }
  function renderSyncButton(button,connected){
    if(!button)return;
    const compact=!!button.closest('.stc-actions');
    const mode=connected?'resync':'connect';
    const signature=`${mode}:${compact?'compact':'full'}`;
    button.dataset.stcpMode=mode;
    button.setAttribute('aria-label',connected?'Resync Google Sheet':'Connect Google Sheet');
    if(button.dataset.stcpPresentation!==signature){
      button.dataset.stcpPresentation=signature;
      button.innerHTML=syncMarkup(connected,compact);
    }
  }

  function addSyncButton(){
    const r=root(),t=currentTrip();if(!r||!t)return;
    const src=sourceFor(t),connected=src?.type==='google-sheet'&&!!src?.url;
    const allActions=[...r.querySelectorAll('.stc-actions')].find(x=>x.querySelector('[data-import]'));
    if(allActions&&!allActions.querySelector('[data-stcp-sync]')&&!allActions.querySelector('[data-stfs-resync]')){
      const b=document.createElement('button');b.type='button';b.dataset.stcpSync='1';b.className='stcp-sync';allActions.insertBefore(b,allActions.firstChild);
    }
    const tripRow=r.querySelector('[data-all]');
    if(tripRow&&!tripRow.parentElement?.querySelector('[data-stcp-sync]')){
      const b=document.createElement('button');b.type='button';b.dataset.stcpSync='1';b.className='stcp-sync';tripRow.insertAdjacentElement('afterend',b);
    }
    r.querySelectorAll('[data-stcp-sync]').forEach(b=>renderSyncButton(b,connected));
  }

  function decorate(){queued=false;css();polishChecklist();addSyncButton()}
  function queue(){if(queued)return;queued=true;setTimeout(decorate,0)}

  document.addEventListener('click',event=>{
    const b=event.target.closest?.('#sakura-trip-companion [data-stcp-sync]');if(!b)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const api=window.SakuraTripFileSync,mode=b.dataset.stcpMode||'connect';
    if(mode==='resync'){
      try{const value=api?.resyncCurrent?.();Promise.resolve(value).catch(error=>alert(error?.message||'Could not resync the Google Sheet.'))}catch(error){alert(error?.message||'Could not resync the Google Sheet.')}
      return;
    }
    api?.showAddMenu?.();setTimeout(()=>root()?.querySelector('[data-stfs-google]')?.click(),0);
  },true);

  document.addEventListener('sakura:trips-changed',queue);
  document.addEventListener('sakura:trip-source-changed',queue);
  const observer=new MutationObserver(queue);
  function init(){css();const r=root();if(r)observer.observe(r,{childList:true,subtree:true});queue()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  window.SakuraTripCompanionPolish=Object.freeze({version:2,decorate,checklistEntries,syncMarkup});
}());
