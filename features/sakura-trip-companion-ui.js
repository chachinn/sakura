/* Sakura Trip Companion UI v2 */
(function(){
'use strict';
if(window.SakuraTripCompanion?.version>=2)return;
const S=window.SakuraTripStore;if(!S)return;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let screen='day',draft=null,dayIndex=0;
const q=s=>document.querySelector('#sakura-trip-companion '+s);
function css(){
 if(document.getElementById('sakura-trip-companion-style'))return;
 const st=document.createElement('style');st.id='sakura-trip-companion-style';st.textContent=`
 #travel-view .sakura-trip-companion-launch{margin-top:0;margin-bottom:8px;border-color:color-mix(in srgb,var(--color-primary) 30%,var(--color-border));background:linear-gradient(135deg,var(--color-primary-soft),var(--color-surface))}
 #sakura-trip-companion{position:fixed;inset:0;z-index:12000;display:none;background:var(--color-background,#fffafc);color:var(--color-text,#222);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Hiragino Sans","Yu Gothic",sans-serif}
 #sakura-trip-companion.open{display:block}#sakura-trip-companion *{box-sizing:border-box}
 .stc-scroll{height:100%;overflow:auto;padding:0 14px calc(34px + env(safe-area-inset-bottom))}
 .stc-head{position:sticky;top:0;z-index:5;margin:0 -14px;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;display:grid;grid-template-columns:46px 1fr 46px;align-items:center;background:color-mix(in srgb,var(--color-background,#fffafc) 94%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--color-border,#ead9df)}
 .stc-icon{width:42px;height:42px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-surface);color:inherit;font-size:20px}.stc-title{text-align:center}.stc-title small{display:block;color:var(--color-primary-dark);font-size:9px;font-weight:900;letter-spacing:.12em}.stc-title strong{font-size:18px}
 .stc-days{display:flex;gap:7px;overflow:auto;padding:11px 0}.stc-days[hidden]{display:none}.stc-day{flex:0 0 auto;min-width:60px;padding:7px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-surface);color:var(--color-text-muted);font-size:11px;font-weight:800}.stc-day.on{border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary-dark)}
 .stc-note,.stc-card{border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface)}.stc-note{margin-bottom:10px;padding:10px 12px;background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:11px;font-weight:750}
 .stc-card{padding:14px;margin-bottom:11px}.stc-kicker{color:var(--color-primary-dark);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.09em}.stc-card h2{margin:5px 0 4px;font-size:24px}.stc-card h3{margin:3px 0 10px;font-size:17px}.stc-muted{color:var(--color-text-muted);font-size:11px;line-height:1.45}
 .stc-timing,.stc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.stc-mini,.stc-help{padding:11px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background);text-align:left;color:inherit}.stc-mini small{color:var(--color-primary-dark);font-size:9px;font-weight:900}.stc-mini strong,.stc-help strong{display:block;margin-top:4px;font-size:13px}.stc-mini p,.stc-help small{display:block;margin:4px 0 0;color:var(--color-text-muted);font-size:10px;line-height:1.35}.stc-help i{font-style:normal;font-size:21px}
 .stc-warn{margin-top:9px;padding:10px 11px;border-radius:13px;background:#fff6d9;color:#705914;font-size:11px;line-height:1.45}.stc-route,.stc-plan{padding:10px 11px;border-radius:13px;font-size:11px;line-height:1.5}.stc-route{background:var(--color-primary-soft);color:var(--color-text-muted)}.stc-plan{background:#f2f7ff;color:#536273}
 .stc-row{width:100%;padding:12px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background);color:inherit;text-align:left}.stc-row+ .stc-row{margin-top:8px}.stc-row strong{display:block;font-size:14px}.stc-row small{display:block;margin-top:3px;color:var(--color-text-muted);font-size:10px;line-height:1.4}
 .stc-phrase{padding:10px 11px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-background)}.stc-phrase+.stc-phrase{margin-top:7px}.stc-phrase b{font-size:17px}.stc-phrase em,.stc-phrase span{display:block;margin-top:2px}.stc-phrase em{color:var(--color-primary-dark);font-size:11px;font-style:normal}.stc-phrase span{color:var(--color-text-muted);font-size:10px}
 .stc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.stc-actions button{min-height:44px;padding:9px 12px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-surface);color:inherit;font-size:12px;font-weight:850}.stc-actions .primary{background:var(--color-primary);border-color:var(--color-primary);color:#fff}
 .stc-paste{width:100%;min-height:220px;padding:13px;border:1px solid var(--color-border);border-radius:15px;background:var(--color-background);color:inherit;font:inherit;font-size:14px;line-height:1.5}.stc-status{min-height:20px;margin-top:7px;color:var(--color-text-muted);font-size:10px}.stc-status.bad{color:#a72d4f}.stc-status.busy{color:var(--color-primary-dark);font-weight:800}
 .stc-stop{display:grid;grid-template-columns:55px 1fr;gap:7px;padding:8px 0;border-bottom:1px solid var(--color-border)}.stc-stop:last-child{border:0}.stc-stop>b{color:var(--color-primary-dark);font-size:11px}.stc-stop strong{font-size:12px}.stc-stop small{display:block;color:var(--color-text-muted);font-size:9px}.stc-badge{display:inline-block;margin:3px 3px 0 0;padding:2px 6px;border-radius:999px;background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:8px;font-weight:800}
 .stc-show{min-height:55vh;display:grid;place-items:center;text-align:center}.stc-show h2{font-size:30px}.stc-show h3{font-size:20px;margin:0}.stc-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translate(-50%,12px);opacity:0;pointer-events:none;max-width:calc(100% - 28px);padding:9px 12px;border-radius:12px;background:#2b2930;color:#fff;font-size:10px;transition:.2s}.stc-toast.on{opacity:1;transform:translate(-50%,0)}
 @media(max-width:360px){.stc-timing,.stc-grid{grid-template-columns:1fr}.stc-card h2{font-size:21px}}
 `;document.head.appendChild(st);
}
function shell(){
 if(document.getElementById('sakura-trip-companion'))return;
 css();const r=document.createElement('section');r.id='sakura-trip-companion';r.setAttribute('aria-hidden','true');
 r.innerHTML=`<div class="stc-scroll"><header class="stc-head"><button class="stc-icon" data-back>‹</button><div class="stc-title"><small>TRAVEL</small><strong>Trip Companion</strong></div><button class="stc-icon" data-trips>🧳</button></header><nav class="stc-days" data-days></nav><main data-main></main></div><div class="stc-toast" data-toast></div>`;
 document.body.appendChild(r);
}
function setTitle(a,b='Travel'){q('.stc-title small').textContent=b;q('.stc-title strong').textContent=a}
function toast(t){const e=q('[data-toast]');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)}
function nav(show,trip,index){const n=q('[data-days]');n.hidden=!show;if(!show)return;n.innerHTML=trip.days.map((d,i)=>`<button class="stc-day ${i===index?'on':''}" data-day="${i}">Day ${i+1}<br>${E(d.date.slice(5).replace('-','/'))}</button>`).join('')}
function trip(){return S.currentTrip()}
function day(){return trip()?.days?.[dayIndex]}
function dayView(index=0){
 screen='day';const t=trip();if(!t)return tripsView();dayIndex=Math.max(0,Math.min(index,t.days.length-1));localStorage.setItem(S.keys.PREVIEW_DAY_PREFIX+t.id,String(dayIndex));const d=t.days[dayIndex];
 setTitle(S.isTripLive(t)?'Today in Japan':'Trip Companion',t.name);nav(true,t,dayIndex);
 if(!d){q('[data-main]').innerHTML='<div class="stc-card">No itinerary days yet.</div>';return}
 const [a,b]=S.summaryItems(d,t),phr=(d.phrases?.length?d.phrases:S.defaultPhrases(d)).slice(0,3);
 q('[data-main]').innerHTML=`
 ${S.isTripLive(t)?'':`<div class="stc-note">🌸 Preview mode · This becomes “Today in Japan” automatically during the trip.</div>`}
 <section class="stc-card"><div class="stc-kicker">${E(d.emoji||'🌸')} Day ${dayIndex+1} · ${E(S.dayLabel(d.date))}</div><h2>${E(d.title)}</h2><div class="stc-muted">${E(t.destination||'Trip')} · ${E(t.startDate)} → ${E(t.endDate)}</div>
 <div class="stc-timing" style="margin-top:11px">${a?mini(a,S.isTripLive(t)?'NEXT':'FIRST'):''}${b?mini(b,S.isTripLive(t)?'LATER':'KEY'):''}</div><div class="stc-warn"><b>Don’t forget</b><br>${E(S.dayReminder(d))}</div></section>
 <section class="stc-card"><div class="stc-kicker">Quick help</div><h3>Need something now?</h3><div class="stc-grid">
 ${help('💬','SakuTalk','Say it naturally with Travel context.','sakutalk')}${help('🗺️','Show This Place','Large destination card for staff or taxi.','place')}${help('🚆','Transit Rescue','Route, warnings and safest fallback.','transit')}${help('📷','Camera Japanese','Read menus, signs, notices and tickets.','camera')}</div></section>
 <section class="stc-card"><div class="stc-kicker">My trip</div><h3>${E(t.name)}</h3><button class="stc-row" data-all><strong>${E(t.startDate)} → ${E(t.endDate)}</strong><small>All Days · Reservations · Paste updates</small></button><div class="stc-route" style="margin-top:8px">${E(S.dayRoute(d))}</div></section>
 <section class="stc-card"><div class="stc-kicker">今日の日本語</div><h3>Japanese for Today</h3>${phr.map(p=>`<div class="stc-phrase"><b>${E(p[0])}</b><em>${E(p[1])}</em><span>${E(p[2])}</span></div>`).join('')}</section>
 <section class="stc-card"><div class="stc-plan"><b>Plan B · no-drama fallback</b><br>${E(S.dayPlanB(d))}</div></section>`;
}
function mini(i,k){return `<article class="stc-mini"><small>${k} · ${E(i.time||'Anytime')}</small><strong>${E(i.title)}</strong><p>${E(i.note||i.place||'')}</p></article>`}
function help(ic,t,n,key){return `<button class="stc-help" data-help="${key}"><i>${ic}</i><strong>${t}</strong><small>${n}</small></button>`}
function tripsView(){
 screen='trips';setTitle('My Trips');nav(false);const ts=S.loadTrips();q('[data-main]').innerHTML=`<section class="stc-card"><div class="stc-kicker">My trips</div><h3>Trips in Sakura</h3>${ts.map(t=>`<button class="stc-row" data-open-trip="${E(t.id)}"><strong>${E(t.name)}</strong><small>${E(t.startDate||'No date')} → ${E(t.endDate||'No date')} · ${t.days.length} days</small></button>`).join('')}<div class="stc-actions"><button class="primary" data-import>＋ Paste itinerary</button></div></section><section class="stc-card"><div class="stc-kicker">Fast workflow</div><h3>Ask ChatGPT → paste → done</h3><div class="stc-muted">Ask for a <b>Sakura Trip Pack</b> for instant on-device parsing, or paste normal itinerary text and Sakura will use Gemini. You always review before saving.</div></section>`;
}
function allView(){
 screen='all';const t=trip();setTitle(t.name,'All Days');nav(false);q('[data-main]').innerHTML=`<section class="stc-card"><div class="stc-kicker">Itinerary</div><h3>${t.days.length} days</h3>${t.days.map((d,i)=>`<button class="stc-row" data-open-day="${i}"><strong>Day ${i+1} · ${E(d.title)}</strong><small>${E(S.dayLabel(d.date))} · ${d.items.length} stops</small></button>`).join('')}<div class="stc-actions"><button data-res>Reservations</button><button class="primary" data-import>Paste update</button></div></section>`;
}
function reservations(){
 screen='res';const t=trip(),x=[];t.days.forEach(d=>d.items.forEach(i=>{if(i.reservation)x.push([d,i])}));setTitle('Reservations',t.name);nav(false);q('[data-main]').innerHTML=`<section class="stc-card"><div class="stc-kicker">Reservation wallet</div><h3>Fixed bookings</h3>${x.length?x.map(([d,i])=>`<div class="stc-row"><strong>${E(i.time)} · ${E(i.title)}</strong><small>${E(S.dayLabel(d.date))}${i.place?' · '+E(i.place):''}${i.note?'<br>'+E(i.note):''}</small></div>`).join(''):'<div class="stc-muted">No reservation-marked items yet.</div>'}</section>`;
}
function importView(){
 screen='import';draft=null;setTitle('Paste Itinerary','My Trips');nav(false);q('[data-main]').innerHTML=`<section class="stc-card"><div class="stc-kicker">Smart import</div><h3>Paste the whole thing</h3><textarea class="stc-paste" data-text placeholder="Paste a Sakura Trip Pack from ChatGPT, or paste normal itinerary text here…"></textarea><div class="stc-actions"><button data-paste>Paste from Clipboard</button><button class="primary" data-understand>✨ Understand Itinerary</button></div><div class="stc-status" data-status></div></section><section class="stc-card"><div class="stc-kicker">Fastest option</div><h3>Sakura Trip Pack</h3><div class="stc-muted">Ask ChatGPT: <b>“Give me a Sakura Trip Pack for this itinerary.”</b> That format is parsed instantly without an AI call. Messy text also works with Gemini.</div></section>`;
}
function preview(t){
 screen='preview';draft=t;setTitle('Review Import','Paste Itinerary');nav(false);const m=S.tripMatch(t),one=!!(m&&t.days.length===1&&m.days.some(d=>d.date===t.days[0].date));
 q('[data-main]').innerHTML=`<section class="stc-card"><div class="stc-kicker">Preview before save</div><h3>Did Sakura understand it correctly?</h3><div class="stc-note"><b>${E(t.name)}</b><br>${E(t.startDate)} → ${E(t.endDate)} · ${t.days.length} day${t.days.length===1?'':'s'} · ${E(t.timezone)}</div>${t.days.map((d,n)=>`<div class="stc-row"><strong>Day ${n+1} · ${E(d.title)}</strong><small>${E(d.date)} · ${d.items.length} stops</small>${d.items.slice(0,4).map(stop).join('')}${d.items.length>4?`<small>+ ${d.items.length-4} more stops</small>`:''}</div>`).join('')}<div class="stc-actions"><button data-import>Back</button>${one?'<button data-save="merge-day">Merge Day</button><button class="primary" data-save="replace-day">Replace Day</button>':m?'<button data-save="merge-trip">Merge Trip</button><button class="primary" data-save="replace-trip">Replace Trip</button>':'<button class="primary" data-save="add">Add Trip</button>'}</div></section>`;
}
function stop(i){return `<div class="stc-stop"><b>${E(i.time||'—')}</b><div><strong>${E(i.title)}</strong><small>${E(i.place||i.note||'')}</small>${i.reservation?'<span class="stc-badge">Reservation</span>':''}${i.priority==='critical'?'<span class="stc-badge">Critical</span>':''}</div></div>`}
function target(){const t=trip(),d=t?.days?.[dayIndex];return S.summaryItems(d,t)[0]||d?.items?.[0]}
function showPlace(){
 screen='place';const t=trip(),d=day(),i=target();setTitle('Show This Place',d?.title||t?.name);nav(false);q('[data-main]').innerHTML=i?`<section class="stc-card stc-show"><div><div class="stc-kicker">STAFF / TAXI SCREEN</div><h2>${E(i.japaneseName||i.place||i.title)}</h2>${i.japaneseName&&i.place?`<h3>${E(i.place)}</h3>`:''}${i.address?`<p>${E(i.address)}</p>`:''}<p>${E(i.time||'')} · ${E(i.title)}</p></div></section>`:'<section class="stc-card">No destination available.</section>';
}
function transit(){
 screen='transit';const d=day();setTitle('Transit Rescue',d?.title||'Travel');nav(false);const x=(d?.items||[]).filter(i=>i.type==='transport');q('[data-main]').innerHTML=`<section class="stc-card"><div class="stc-kicker">Route</div><h3>Safest path</h3><div class="stc-route">${E(S.dayRoute(d||{}))}</div>${x.map(i=>`<div class="stc-row"><strong>${E(i.time)} · ${E(i.title)}</strong><small>${E(i.place||'')}${i.note?'<br>'+E(i.note):''}</small></div>`).join('')}<div class="stc-plan" style="margin-top:9px"><b>Plan B</b><br>${E(S.dayPlanB(d||{}))}</div></section>`;
}
function open(index){
 shell();const t=trip();if(t)S.setActiveTrip(t.id);dayIndex=Number.isInteger(index)?index:S.currentDayIndex(t);dayView(dayIndex);const r=document.getElementById('sakura-trip-companion');r.classList.add('open');r.setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';q('.stc-scroll').scrollTop=0;
}
function close(){const r=document.getElementById('sakura-trip-companion');if(!r)return;r.classList.remove('open');r.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';document.body.style.overflow=''}
function back(){if(screen==='day')return close();if(screen==='trips')return dayView(S.currentDayIndex(trip()));if(screen==='import')return tripsView();if(screen==='preview')return importView();dayView(dayIndex)}
function launcher(){
 css();const v=document.getElementById('travel-view'),g=v?.querySelector('.travel-category-grid');if(!v||!g)return;const live=S.liveTrip(),up=S.upcomingTrip(),t=live||up||S.selectedTrip();let b=v.querySelector('.sakura-trip-companion-launch');if(!t){b?.remove();return}if(!b){b=document.createElement('button');b.type='button';b.className='travel-feature-card sakura-trip-companion-launch';const s=v.querySelector('.sakura-travel-interpreter-card');s?s.insertAdjacentElement('beforebegin',b):g.insertAdjacentElement('beforebegin',b)}
 const today=S.dateKeyInTimezone(t.timezone||'Asia/Tokyo');if(live){const d=S.getTripDay(t,today);b.innerHTML=`<span>${E(d?.emoji||'🌸')}</span><div><h2>Today in Japan</h2><p>${E(d?.title||t.name)} · ${E(S.dayLabel(today))}</p></div><b>→</b>`}else if(up&&up.id===t.id){b.innerHTML=`<span>🌸</span><div><h2>Preview ${E(t.name)}</h2><p>${E(t.startDate)}–${E(t.endDate.slice(5))} · Test the companion now</p></div><b>→</b>`}else b.innerHTML=`<span>🧳</span><div><h2>My Trips</h2><p>${S.loadTrips().length} saved trip${S.loadTrips().length===1?'':'s'}</p></div><b>→</b>`;
}
async function understand(){
 const ta=q('[data-text]'),st=q('[data-status]'),bt=q('[data-understand]'),text=ta?.value||'';if(st){st.className='stc-status busy';st.textContent=/^\s*SAKURA\s+(TRIP|DAY)\s+PACK/im.test(text)?'Reading Sakura Trip Pack…':'Sakura is understanding the itinerary with Gemini…'}if(bt)bt.disabled=true;
 try{preview(await S.understand(text))}catch(e){if(st){st.className='stc-status bad';st.textContent=e.message||'Could not understand the itinerary.'}}finally{if(bt)bt.disabled=false}
}
document.addEventListener('click',async e=>{
 const z=s=>e.target.closest?.(s);
 if(z('.sakura-trip-companion-launch'))return open();
 if(z('[data-day]')){dayIndex=Number(z('[data-day]').dataset.day);return dayView(dayIndex)}
 if(z('[data-back]'))return back();
 if(z('[data-trips]'))return tripsView();
 if(z('[data-open-trip]')){S.setActiveTrip(z('[data-open-trip]').dataset.openTrip);dayIndex=S.currentDayIndex(trip());return dayView(dayIndex)}
 if(z('[data-open-day]')){dayIndex=Number(z('[data-open-day]').dataset.openDay);return dayView(dayIndex)}
 if(z('[data-all]'))return allView();
 if(z('[data-res]'))return reservations();
 if(z('[data-import]'))return importView();
 if(z('[data-understand]'))return await understand();
 if(z('[data-paste]')){try{q('[data-text]').value=await navigator.clipboard.readText();q('[data-status]').textContent='Pasted from clipboard.'}catch{q('[data-status]').className='stc-status bad';q('[data-status]').textContent='Clipboard access was blocked. Paste normally.'}return}
 if(z('[data-save]')&&draft){const mode=z('[data-save]').dataset.save,id=S.applyImport(draft,mode);S.setActiveTrip(id);toast(mode.includes('merge')?'Trip update merged.':'Trip saved.');dayIndex=S.currentDayIndex(trip());launcher();return dayView(dayIndex)}
 const h=z('[data-help]')?.dataset.help;if(h==='sakutalk'){close();setTimeout(()=>document.querySelector('#travel-view .sakura-travel-interpreter-card')?.click()||window.SakuraPracticeGridPolish?.openSakuTalk?.(),70);return}if(h==='place')return showPlace();if(h==='transit')return transit();if(h==='camera')return toast('Camera Japanese is the next Travel integration stage.');
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')back()});
document.addEventListener('sakura:trips-changed',launcher);
function init(){shell();launcher()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.SakuraTripCompanion=Object.freeze({version:2,open,close,ensureLauncher:launcher,getTrips:S.getTrips,parseTripPack:S.parseTripPack,understand:S.understand,importTrip:S.applyImport,seedTrip:S.seedTrip});
}());
