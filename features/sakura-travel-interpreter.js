/* SakuTalk v2.1 — natural Japanese for real conversations in any situation. */
(function(){
'use strict';
if(window.SakuraInterpreter||window.SakuraTravelInterpreter)return;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let result=null,busy=false,recognition=null,listening=false,stopRequested=false,heardSpeech=false;
const contexts=['Any Situation','Everyday','Friends','Work','Travel','Restaurant / Café','Shopping','Service / Staff','Medical','Social / Events','Online / Messaging','Custom'];
const tones=[{label:'Natural',value:'Natural for the situation'},{label:'Polite',value:'Polite'},{label:'Friendly',value:'Friendly'},{label:'Casual',value:'Casual'},{label:'Very polite',value:'Very polite'}];

function style(){
if($('sakura-travel-interpreter-style'))return;
const s=document.createElement('style');s.id='sakura-travel-interpreter-style';s.textContent=`.sakura-interpreter-launch{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;margin:0 0 12px;padding:13px;border:1px solid color-mix(in srgb,var(--color-primary) 25%,var(--color-border));border-radius:16px;background:linear-gradient(145deg,var(--color-primary-soft),var(--color-surface));color:var(--color-text);text-align:left}.sakura-interpreter-launch>span{font-size:24px}.sakura-interpreter-launch strong{display:block;font-size:12px}.sakura-interpreter-launch small{display:block;margin-top:2px;color:var(--color-text-muted);font-size:8px;line-height:1.4}.sakura-interpreter-launch b{color:var(--color-primary-dark);font-size:18px}#sakura-interpreter{position:fixed;inset:0;z-index:10050;width:100vw;height:100dvh;box-sizing:border-box;background:var(--color-background);color:var(--color-text);overflow:hidden}#sakura-interpreter[hidden]{display:none}.sakura-interpreter-head{height:calc(62px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 14px 0;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;border-bottom:1px solid var(--color-border);background:var(--color-surface)}.sakura-interpreter-head button{width:42px;height:42px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background);color:var(--color-text);font-size:20px}.sakura-interpreter-title{text-align:center;min-width:0}.sakura-interpreter-title small{display:block;color:var(--color-primary-dark);font-size:8px;font-weight:900;letter-spacing:.12em}.sakura-interpreter-title strong{display:block;font-size:15px}.sakura-interpreter-body{height:calc(100dvh - 62px - env(safe-area-inset-top));box-sizing:border-box;overflow-y:auto;overflow-x:hidden;padding:14px 14px calc(30px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}.sakura-interpreter-card{display:grid;gap:10px;margin-bottom:12px;padding:13px;border:1px solid var(--color-border);border-radius:17px;background:var(--color-surface)}.sakura-interpreter-card h3{margin:0;font-size:11px}.sakura-interpreter-card p{margin:0;color:var(--color-text-muted);font-size:8px;line-height:1.5}.sakura-interpreter-input{width:100%;min-height:108px;box-sizing:border-box;resize:vertical;padding:12px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background);color:var(--color-text);font:inherit;font-size:15px;line-height:1.5}.sakura-interpreter-situation{min-height:74px;font-size:12px}.sakura-interpreter-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.sakura-interpreter-chips::-webkit-scrollbar{display:none}.sakura-interpreter-chip{flex:0 0 auto;min-height:34px;padding:7px 10px;border:1px solid var(--color-border);border-radius:999px;background:var(--color-background);color:var(--color-text-muted);font-size:8px;font-weight:800}.sakura-interpreter-chip.active{border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary-dark)}.sakura-interpreter-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sakura-interpreter-actions button,.sakura-interpreter-result-actions button{min-height:45px;padding:9px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-background);color:var(--color-text);font-size:9px;font-weight:900}.sakura-interpreter-actions .primary{grid-column:1/-1;background:var(--color-primary);border-color:var(--color-primary);color:white}.sakura-interpreter-actions [data-ti-mic].is-listening{border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary-dark);box-shadow:0 0 0 2px color-mix(in srgb,var(--color-primary) 16%,transparent)}.sakura-interpreter-actions [data-ti-translate]:disabled{opacity:.48}.sakura-interpreter-status{min-height:18px;color:var(--color-text-muted);font-size:8px;text-align:center}.sakura-interpreter-status.is-listening{min-height:38px;padding:9px 11px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--color-primary) 35%,var(--color-border));border-radius:12px;background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:9px;font-weight:850}.sakura-interpreter-status.is-listening::before{content:'●';margin-right:7px;animation:sakutalk-listening-pulse 1.1s ease-in-out infinite}.sakura-interpreter-jp{font-size:22px!important;font-weight:850;line-height:1.55!important;color:var(--color-text)!important;overflow-wrap:anywhere}.sakura-interpreter-kana{font-size:11px!important;color:var(--color-primary-dark)!important}.sakura-interpreter-romaji{font-size:9px!important;font-style:italic}.sakura-interpreter-meaning{padding:10px;border-radius:12px;background:var(--color-primary-soft)}.sakura-interpreter-meaning strong{display:block;margin-bottom:3px;font-size:8px;color:var(--color-primary-dark)}.sakura-interpreter-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.sakura-interpreter-staff{position:fixed;inset:0;z-index:10060;display:grid;grid-template-rows:auto 1fr auto;background:white;color:#17171b;padding:calc(16px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}.sakura-interpreter-staff[hidden]{display:none}.sakura-interpreter-staff button{justify-self:end;width:48px;height:48px;border:1px solid #ddd;border-radius:15px;background:white;font-size:22px}.sakura-interpreter-staff-main{align-self:center;text-align:center;font-size:clamp(26px,8vw,44px);font-weight:850;line-height:1.55;overflow-wrap:anywhere}.sakura-interpreter-staff small{text-align:center;color:#666;font-size:13px;line-height:1.5}@keyframes sakutalk-listening-pulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}@media(prefers-reduced-motion:reduce){.sakura-interpreter-status.is-listening::before{animation:none}}`;document.head.appendChild(s);
}

function markup(){
const h=document.createElement('div');h.id='sakura-interpreter';h.hidden=true;h.innerHTML=`<header class="sakura-interpreter-head"><button type="button" data-ti-close>‹</button><div class="sakura-interpreter-title"><small>CONVERSATION</small><strong>SakuTalk</strong></div><span></span></header><main class="sakura-interpreter-body"><section class="sakura-interpreter-card"><h3>Say what you mean naturally</h3><p>Sakura turns your English intention into contemporary Japanese for the person and situation — not a word-for-word translation.</p><textarea id="sakura-ti-input" class="sakura-interpreter-input" maxlength="500" placeholder="Example: I know you already apologized. It’s okay — I’m not upset with you."></textarea><h3>Context</h3><div class="sakura-interpreter-chips" data-ti-context>${contexts.map((x,i)=>`<button type="button" class="sakura-interpreter-chip${i?'':' active'}" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div><h3>Who are you talking to / what’s happening?</h3><textarea id="sakura-ti-situation" class="sakura-interpreter-input sakura-interpreter-situation" maxlength="160" placeholder="Example: I’m talking to a Japanese coworker who I know pretty well."></textarea><p>Optional for most contexts. Use this when the relationship or situation changes how natural Japanese should sound.</p><h3>Tone</h3><div class="sakura-interpreter-chips" data-ti-tone>${tones.map((x,i)=>`<button type="button" class="sakura-interpreter-chip${i?'':' active'}" data-value="${esc(x.value)}">${esc(x.label)}</button>`).join('')}</div><div class="sakura-interpreter-actions"><button type="button" data-ti-mic aria-pressed="false">🎙️ Speak English</button><button type="button" data-ti-clear>Clear</button><button type="button" class="primary" data-ti-translate>Translate naturally →</button></div><div class="sakura-interpreter-status" data-ti-status aria-live="polite"></div></section><section id="sakura-ti-result" class="sakura-interpreter-card" hidden></section></main>`;document.body.appendChild(h);
const st=document.createElement('div');st.id='sakura-ti-staff';st.className='sakura-interpreter-staff';st.hidden=true;st.innerHTML='<button type="button" data-ti-staff-close>×</button><div class="sakura-interpreter-staff-main" lang="ja" data-ti-staff-jp></div><small data-ti-staff-en></small>';document.body.appendChild(st);
}

function launch(){
let b=document.querySelector('.sakura-interpreter-launch');
const f=$('translation-form');if(!f)return;
if(b?.dataset.sakuraInterpreterUi==='2')return;
if(!b){b=document.createElement('button');b.type='button';b.className='sakura-interpreter-launch';f.parentNode.insertBefore(b,f)}
b.dataset.tiOpen='';
b.dataset.sakuraInterpreterUi='2';
b.innerHTML='<span>🗣️</span><div><strong>SakuTalk</strong><small>Natural Japanese for real conversations · voice · meaning check · full-screen display</small></div><b>›</b>';
}

const sel=q=>document.querySelector(`${q} .active`)?.dataset.value||'';
function status(t,active=false){const n=document.querySelector('[data-ti-status]');if(!n)return;n.textContent=t;n.classList.toggle('is-listening',active)}
function setContext(value){document.querySelectorAll('[data-ti-context] .sakura-interpreter-chip').forEach(x=>x.classList.toggle('active',x.dataset.value===value))}
function setMicUi(active){
const b=document.querySelector('[data-ti-mic]'),translateButton=document.querySelector('[data-ti-translate]');
if(b){b.classList.toggle('is-listening',active);b.setAttribute('aria-pressed',String(active));b.textContent=active?'⏹ Stop listening':'🎙️ Speak English'}
if(translateButton)translateButton.disabled=active;
}
function finishListening(message){listening=false;setMicUi(false);status(message||'')}
function stopListening(){
if(!recognition||!listening)return;
stopRequested=true;
status('Finishing your sentence…',true);
try{recognition.stop()}catch{finishListening(heardSpeech?'Stopped. Check your sentence, then translate.':'Listening stopped.')}
}
function open(preset=''){if(preset)setContext(preset);$('sakura-interpreter').hidden=false;document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden'}
function close(){if(listening)stopListening();$('sakura-interpreter').hidden=true;document.documentElement.style.overflow='';document.body.style.overflow='';try{speechSynthesis.cancel()}catch{}}
function speak(t){if(!t)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.9;speechSynthesis.speak(u)}catch{}}
function mediumFor(context){return context==='Online / Messaging'?'Written message / chat':'Spoken face-to-face conversation'}
function contextFor(context,situation){if(situation){const prefix=(context==='Any Situation'||context==='Custom')?'':`${context}: `;return `${prefix}${situation}`.slice(0,100)}return context==='Any Situation'?'General conversation; infer the appropriate relationship and register; do not assume travel.':context}

async function translate(){
if(busy||listening)return;
const text=$('sakura-ti-input').value.trim(),situation=$('sakura-ti-situation').value.trim(),context=sel('[data-ti-context]')||'Any Situation',tone=sel('[data-ti-tone]')||'Natural for the situation',c=window.SAKURA_AI_CONFIG||{},aiContext=contextFor(context,situation);
if(!text){status('Type or speak an English sentence first.');return}
if(context==='Custom'&&!situation){status('Describe the custom situation or relationship first.');$('sakura-ti-situation').focus();return}
if(!c.enabled||!c.endpoint||!c.gatewayKey){status('Natural AI translation is unavailable right now.');return}
busy=true;status('Finding natural Japanese for this situation…');$('sakura-ti-result').hidden=true;
try{
const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),45000);let r;
try{r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','apikey':c.gatewayKey},body:JSON.stringify({text:text.slice(0,500),direction:'english-to-japanese',context:aiContext,situation:situation.slice(0,160),tone,medium:mediumFor(context),jlpt_level:'N5-N1',response_style:'native-tutor',interpreter_mode:'general',natural_interpreter:true,travel_interpreter:context==='Travel',preserve_facts:true}),signal:ac.signal,cache:'no-store',credentials:'omit'})}finally{clearTimeout(timer)}
const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Translation failed (${r.status}).`);if(!d?.recommended?.japanese)throw new Error('Translation returned an incomplete result.');
result=d;const x=d.recommended,o=$('sakura-ti-result');o.innerHTML=`<h3>Natural Japanese</h3><p class="sakura-interpreter-jp" lang="ja">${esc(x.japanese)}</p>${x.kana?`<p class="sakura-interpreter-kana" lang="ja">${esc(x.kana)}</p>`:''}${x.romaji?`<p class="sakura-interpreter-romaji">${esc(x.romaji)}</p>`:''}<div class="sakura-interpreter-meaning"><strong>Meaning check</strong><p>${esc(x.english||text)}</p></div>${d.why_natural?`<p>${esc(d.why_natural)}</p>`:''}<div class="sakura-interpreter-result-actions"><button type="button" data-ti-hear>🔊 Speak Japanese</button><button type="button" data-ti-staff>📱 Show full screen</button><button type="button" data-ti-copy>Copy</button><button type="button" data-ti-again>New phrase</button></div>`;o.hidden=false;status('Ready · check the meaning before showing or playing it.');o.scrollIntoView({behavior:'smooth',block:'start'});
}catch(e){status(e?.name==='AbortError'?'Translation timed out. Please try again.':(e.message||'Translation failed.'))}finally{busy=false}
}

function mic(){
if(listening){stopListening();return}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status('Voice recognition is not available here. You can still type.');return}
try{
recognition?.abort?.();
recognition=new SR();
recognition.lang='en-US';
recognition.interimResults=true;
recognition.continuous=true;
recognition.maxAlternatives=1;
stopRequested=false;heardSpeech=false;
let finalText='',interimText='';
recognition.onstart=()=>{listening=true;setMicUi(true);status('Listening — tap Stop listening when you’re done.',true)};
recognition.onresult=e=>{
interimText='';
for(let i=e.resultIndex;i<e.results.length;i++){
const text=e.results[i]?.[0]?.transcript||'';
if(e.results[i].isFinal)finalText+=`${text} `;else interimText+=text;
}
const combined=(finalText+interimText).trim();
if(combined){heardSpeech=true;$('sakura-ti-input').value=combined}
};
recognition.onerror=e=>{
if(e.error==='aborted'&&stopRequested)return;
const message=e.error==='not-allowed'?'Microphone permission is needed for voice input.':e.error==='no-speech'?'I didn’t hear anything. Tap Speak English and try again.':e.error==='audio-capture'?'SakuTalk could not access the microphone.':'Voice input did not work. You can type instead.';
finishListening(message);
};
recognition.onend=()=>{
const wasStopRequested=stopRequested;
stopRequested=false;
finishListening(heardSpeech?(wasStopRequested?'Stopped. Check your sentence, then translate.':'Got it. Check your sentence, then translate.'):'Listening ended. Tap Speak English to try again.');
};
recognition.start();
}catch{finishListening('Voice input could not start. You can type instead.')}
}

function bind(){
document.addEventListener('click',async e=>{
const t=e.target,opener=t.closest('[data-ti-open]'),chip=t.closest('.sakura-interpreter-chip');
if(opener)return open(opener.dataset.tiPreset||'');
if(t.closest('[data-ti-close]'))return close();
if(chip){chip.parentElement.querySelectorAll('.sakura-interpreter-chip').forEach(x=>x.classList.toggle('active',x===chip));if(chip.parentElement.matches('[data-ti-context]')&&chip.dataset.value==='Custom')$('sakura-ti-situation')?.focus();return}
if(t.closest('[data-ti-mic]'))return mic();
if(t.closest('[data-ti-clear]')){if(listening)stopListening();$('sakura-ti-input').value='';$('sakura-ti-situation').value='';$('sakura-ti-result').hidden=true;status('');return}
if(t.closest('[data-ti-translate]'))return translate();
if(t.closest('[data-ti-hear]'))return speak(result?.recommended?.japanese||'');
if(t.closest('[data-ti-staff]')){const x=result?.recommended||{};$('sakura-ti-staff').hidden=false;document.querySelector('[data-ti-staff-jp]').textContent=x.japanese||'';document.querySelector('[data-ti-staff-en]').textContent=x.english||'';return}
if(t.closest('[data-ti-staff-close]')){$('sakura-ti-staff').hidden=true;return}
if(t.closest('[data-ti-copy]')){const x=result?.recommended||{};try{await navigator.clipboard.writeText([x.japanese,x.kana,x.romaji,x.english].filter(Boolean).join('\n'));status('Copied.')}catch{status('Copy was blocked.')}return}
if(t.closest('[data-ti-again]')){$('sakura-ti-input').value='';$('sakura-ti-result').hidden=true;status('');$('sakura-ti-input').focus()}
});
}

function init(){
style();markup();launch();bind();new MutationObserver(launch).observe(document.body,{childList:true,subtree:true});
const api=Object.freeze({version:2.1,open,close});window.SakuraInterpreter=api;window.SakuraTravelInterpreter=api;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
