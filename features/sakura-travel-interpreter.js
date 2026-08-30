/* SakuTalk v2.2 — natural Japanese for real conversations in any situation. */
(function(){
'use strict';

if(window.SakuraInterpreter||window.SakuraTravelInterpreter)return;

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let result=null;
let busy=false;
let recognition=null;
let listening=false;
let stopRequested=false;
let heardSpeech=false;
let loadingTimers=[];

const contexts=[
  'Any Situation','Everyday','Friends','Work','Travel','Restaurant / Café',
  'Shopping','Service / Staff','Medical','Social / Events','Online / Messaging','Custom'
];
const tones=[
  {label:'Natural',value:'Natural for the situation'},
  {label:'Polite',value:'Polite'},
  {label:'Friendly',value:'Friendly'},
  {label:'Casual',value:'Casual'},
  {label:'Very polite',value:'Very polite'}
];

function style(){
  if($('sakura-travel-interpreter-style'))return;
  const s=document.createElement('style');
  s.id='sakura-travel-interpreter-style';
  s.textContent=`
.sakura-interpreter-launch{
  width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;
  margin:0 0 14px;padding:15px;border:1px solid color-mix(in srgb,var(--color-primary) 25%,var(--color-border));
  border-radius:18px;background:linear-gradient(145deg,var(--color-primary-soft),var(--color-surface));
  color:var(--color-text);text-align:left
}
.sakura-interpreter-launch>span{font-size:26px}
.sakura-interpreter-launch strong{display:block;font-size:16px}
.sakura-interpreter-launch small{display:block;margin-top:3px;color:var(--color-text-muted);font-size:13px;line-height:1.45}
.sakura-interpreter-launch b{color:var(--color-primary-dark);font-size:20px}

#sakura-interpreter{
  position:fixed;inset:0;z-index:10050;width:100vw;height:100dvh;box-sizing:border-box;
  background:var(--color-background);color:var(--color-text);overflow:hidden
}
#sakura-interpreter[hidden]{display:none}
.sakura-interpreter-head{
  height:calc(64px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 14px 0;
  display:grid;grid-template-columns:48px minmax(0,1fr) 48px;align-items:center;
  border-bottom:1px solid var(--color-border);background:var(--color-surface)
}
.sakura-interpreter-head button{
  width:44px;height:44px;border:1px solid var(--color-border);border-radius:15px;
  background:var(--color-background);color:var(--color-text);font-size:24px
}
.sakura-interpreter-title{text-align:center;min-width:0}
.sakura-interpreter-title small{
  display:block;color:var(--color-primary-dark);font-size:11px;font-weight:900;letter-spacing:.13em
}
.sakura-interpreter-title strong{display:block;margin-top:1px;font-size:21px}
.sakura-interpreter-body{
  height:calc(100dvh - 64px - env(safe-area-inset-top));box-sizing:border-box;
  overflow-y:auto;overflow-x:hidden;padding:16px 14px calc(34px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling:touch
}
.sakura-interpreter-card{
  display:grid;gap:13px;margin-bottom:14px;padding:16px;border:1px solid var(--color-border);
  border-radius:20px;background:var(--color-surface);min-width:0
}
.sakura-interpreter-card h3{margin:0;font-size:17px;line-height:1.3}
.sakura-interpreter-card p{margin:0;color:var(--color-text-muted);font-size:14px;line-height:1.55}
.sakura-interpreter-input{
  width:100%;min-height:132px;box-sizing:border-box;resize:vertical;padding:15px;
  border:1px solid var(--color-border);border-radius:16px;background:var(--color-background);
  color:var(--color-text);font:inherit;font-size:19px;line-height:1.5
}
.sakura-interpreter-input::placeholder{color:color-mix(in srgb,var(--color-text-muted) 68%,transparent)}
.sakura-interpreter-situation{min-height:104px;font-size:17px}
.sakura-interpreter-helper{font-size:13px!important}
.sakura-interpreter-chips{
  display:flex;gap:8px;overflow-x:auto;padding:1px 0 3px;scrollbar-width:none
}
.sakura-interpreter-chips::-webkit-scrollbar{display:none}
.sakura-interpreter-chip{
  flex:0 0 auto;min-height:42px;padding:9px 14px;border:1px solid var(--color-border);
  border-radius:999px;background:var(--color-background);color:var(--color-text-muted);
  font-size:14px;font-weight:800
}
.sakura-interpreter-chip.active{
  border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary-dark)
}
.sakura-interpreter-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.sakura-interpreter-actions button,.sakura-interpreter-result-actions button{
  min-height:54px;padding:11px;border:1px solid var(--color-border);border-radius:15px;
  background:var(--color-background);color:var(--color-text);font-size:16px;font-weight:900
}
.sakura-interpreter-actions .primary{
  grid-column:1/-1;min-height:58px;background:var(--color-primary);border-color:var(--color-primary);color:white
}
.sakura-interpreter-actions [data-ti-mic].is-listening{
  border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary-dark);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--color-primary) 16%,transparent)
}
.sakura-interpreter-actions [data-ti-translate]:disabled{opacity:.55}
.sakura-interpreter-status{
  min-height:24px;color:var(--color-text-muted);font-size:13px;line-height:1.45;text-align:center
}
.sakura-interpreter-status.is-listening{
  min-height:44px;padding:10px 12px;display:flex;align-items:center;justify-content:center;
  border:1px solid color-mix(in srgb,var(--color-primary) 35%,var(--color-border));
  border-radius:13px;background:var(--color-primary-soft);color:var(--color-primary-dark);
  font-size:14px;font-weight:850
}
.sakura-interpreter-status.is-listening::before{
  content:'●';margin-right:8px;animation:sakutalk-listening-pulse 1.1s ease-in-out infinite
}

.sakura-result-card{gap:14px;border-color:color-mix(in srgb,var(--color-primary) 28%,var(--color-border))}
.sakura-result-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sakura-result-head h3{font-size:19px}
.sakura-result-head span{
  padding:5px 9px;border-radius:999px;background:var(--color-primary-soft);
  color:var(--color-primary-dark);font-size:12px;font-weight:850
}
.sakura-result-state{
  min-height:118px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;
  padding:18px;border:1px dashed color-mix(in srgb,var(--color-primary) 30%,var(--color-border));
  border-radius:16px;background:color-mix(in srgb,var(--color-primary-soft) 32%,var(--color-background));
  color:var(--color-text-muted);font-size:16px;line-height:1.55;text-align:center
}
.sakura-result-state.is-loading{
  border-style:solid;color:var(--color-primary-dark);font-weight:800
}
.sakura-result-state.is-loading::before{
  content:'';width:10px;height:10px;flex:0 0 auto;margin-right:10px;border-radius:50%;
  background:var(--color-primary);animation:sakutalk-loading-pulse 1.1s ease-in-out infinite
}
.sakura-result-state.is-error{
  border-style:solid;border-color:color-mix(in srgb,#c4495f 34%,var(--color-border));
  background:color-mix(in srgb,#fff0f3 66%,var(--color-background));color:var(--color-text)
}
.sakura-result-state.is-error{display:grid;gap:12px}
.sakura-result-state button{
  min-height:46px;padding:10px 14px;border:1px solid var(--color-primary);border-radius:14px;
  background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:15px;font-weight:900
}
.sakura-result-content{display:grid;gap:12px;min-width:0}
.sakura-result-content[hidden]{display:none}
.sakura-result-block{
  min-width:0;padding:14px;border:1px solid var(--color-border);border-radius:16px;background:var(--color-background)
}
.sakura-result-label{
  display:block;margin-bottom:8px;color:var(--color-primary-dark);font-size:13px;font-weight:900;
  letter-spacing:.02em;text-transform:none
}
.sakura-interpreter-jp{
  margin:0!important;color:var(--color-text)!important;font-size:clamp(30px,7vw,38px)!important;
  font-weight:850;line-height:1.45!important;overflow-wrap:anywhere;word-break:normal;line-break:strict
}
.sakura-interpreter-jp.fit-medium{font-size:clamp(26px,6vw,32px)!important}
.sakura-interpreter-jp.fit-long{font-size:clamp(22px,5vw,27px)!important}
.sakura-interpreter-jp.fit-xlong{font-size:clamp(19px,4.4vw,23px)!important}
.sakura-interpreter-kana{
  margin:0!important;font-size:20px!important;line-height:1.55!important;color:var(--color-primary-dark)!important;
  overflow-wrap:anywhere
}
.sakura-interpreter-romaji{
  margin:0!important;font-size:17px!important;line-height:1.55!important;color:var(--color-text)!important;
  font-style:italic;overflow-wrap:anywhere
}
.sakura-interpreter-meaning{padding:14px;border-radius:16px;background:var(--color-primary-soft)}
.sakura-interpreter-meaning strong{display:block;margin-bottom:7px;font-size:13px;color:var(--color-primary-dark)}
.sakura-interpreter-meaning p{font-size:16px!important;color:var(--color-text)!important}
.sakura-interpreter-why{font-size:14px!important}
.sakura-interpreter-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}

.sakura-interpreter-staff{
  position:fixed;inset:0;z-index:10060;display:grid;grid-template-rows:auto 1fr auto;background:white;color:#17171b;
  padding:calc(16px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box
}
.sakura-interpreter-staff[hidden]{display:none}
.sakura-interpreter-staff button{
  justify-self:end;width:48px;height:48px;border:1px solid #ddd;border-radius:15px;background:white;font-size:22px
}
.sakura-interpreter-staff-main{
  align-self:center;text-align:center;font-size:clamp(26px,8vw,44px);font-weight:850;line-height:1.55;overflow-wrap:anywhere
}
.sakura-interpreter-staff small{text-align:center;color:#666;font-size:15px;line-height:1.5}

@keyframes sakutalk-listening-pulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
@keyframes sakutalk-loading-pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
@media(max-width:390px){
  .sakura-interpreter-card{padding:14px}
  .sakura-interpreter-input{font-size:18px}
  .sakura-interpreter-actions button,.sakura-interpreter-result-actions button{font-size:15px}
}
@media(prefers-reduced-motion:reduce){
  .sakura-interpreter-status.is-listening::before,.sakura-result-state.is-loading::before{animation:none}
}`;
  document.head.appendChild(s);
}

function markup(){
  const h=document.createElement('div');
  h.id='sakura-interpreter';
  h.hidden=true;
  h.innerHTML=`
<header class="sakura-interpreter-head">
  <button type="button" data-ti-close aria-label="Close SakuTalk">‹</button>
  <div class="sakura-interpreter-title"><small>CONVERSATION</small><strong>SakuTalk</strong></div>
  <span></span>
</header>
<main class="sakura-interpreter-body">
  <section class="sakura-interpreter-card">
    <h3>Say what you mean naturally</h3>
    <p>Sakura turns your English intention into contemporary Japanese for the person and situation — not a word-for-word translation.</p>
    <textarea id="sakura-ti-input" class="sakura-interpreter-input" maxlength="500" placeholder="Example: I know you already apologized. It’s okay — I’m not upset with you."></textarea>

    <h3>Context</h3>
    <div class="sakura-interpreter-chips" data-ti-context>
      ${contexts.map((x,i)=>`<button type="button" class="sakura-interpreter-chip${i?'':' active'}" data-value="${esc(x)}">${esc(x)}</button>`).join('')}
    </div>

    <h3>Who are you talking to / what’s happening?</h3>
    <textarea id="sakura-ti-situation" class="sakura-interpreter-input sakura-interpreter-situation" maxlength="160" placeholder="Example: I’m talking to a Japanese coworker who I know pretty well."></textarea>
    <p class="sakura-interpreter-helper">Optional for most contexts. Add it when the relationship or situation should change how natural Japanese sounds.</p>

    <h3>Tone</h3>
    <div class="sakura-interpreter-chips" data-ti-tone>
      ${tones.map((x,i)=>`<button type="button" class="sakura-interpreter-chip${i?'':' active'}" data-value="${esc(x.value)}">${esc(x.label)}</button>`).join('')}
    </div>

    <div class="sakura-interpreter-actions">
      <button type="button" data-ti-mic aria-pressed="false">🎙️ Speak English</button>
      <button type="button" data-ti-clear>Clear</button>
      <button type="button" class="primary" data-ti-translate>Translate naturally →</button>
    </div>
    <div class="sakura-interpreter-status" data-ti-status aria-live="polite"></div>
  </section>

  <section id="sakura-ti-result" class="sakura-interpreter-card sakura-result-card" aria-live="polite">
    <div class="sakura-result-head"><h3>Result</h3><span>Natural Japanese</span></div>
    <div class="sakura-result-state" data-ti-result-state>Your natural Japanese will appear here.</div>
    <div class="sakura-result-content" data-ti-result-content hidden></div>
  </section>
</main>`;
  document.body.appendChild(h);

  const st=document.createElement('div');
  st.id='sakura-ti-staff';
  st.className='sakura-interpreter-staff';
  st.hidden=true;
  st.innerHTML='<button type="button" data-ti-staff-close aria-label="Close full-screen phrase">×</button><div class="sakura-interpreter-staff-main" lang="ja" data-ti-staff-jp></div><small data-ti-staff-en></small>';
  document.body.appendChild(st);
}

function launch(){
  let b=document.querySelector('.sakura-interpreter-launch');
  const f=$('translation-form');
  if(!f)return;
  if(b?.dataset.sakuraInterpreterUi==='2')return;
  if(!b){
    b=document.createElement('button');
    b.type='button';
    b.className='sakura-interpreter-launch';
    f.parentNode.insertBefore(b,f);
  }
  b.dataset.tiOpen='';
  b.dataset.sakuraInterpreterUi='2';
  b.innerHTML='<span aria-hidden="true">💬</span><div><strong>SakuTalk</strong><small>Natural Japanese for real conversations · voice · meaning check · full-screen display</small></div><b aria-hidden="true">›</b>';
}

const sel=q=>document.querySelector(`${q} .active`)?.dataset.value||'';

function status(t,active=false){
  const n=document.querySelector('[data-ti-status]');
  if(!n)return;
  n.textContent=t;
  n.classList.toggle('is-listening',active);
}

function clearLoadingTimers(){
  loadingTimers.forEach(clearTimeout);
  loadingTimers=[];
}

function setTranslateBusy(active){
  const b=document.querySelector('[data-ti-translate]');
  if(!b)return;
  b.disabled=active||listening;
  b.textContent=active?'Translating…':'Translate naturally →';
}

function resultState(message,type='empty',retry=false){
  const state=document.querySelector('[data-ti-result-state]');
  const content=document.querySelector('[data-ti-result-content]');
  if(!state||!content)return;
  content.hidden=true;
  content.innerHTML='';
  state.hidden=false;
  state.className=`sakura-result-state${type==='loading'?' is-loading':type==='error'?' is-error':''}`;
  state.innerHTML=retry
    ? `<div>${esc(message)}</div><button type="button" data-ti-retry>Try again</button>`
    : esc(message);
}

function resultLoading(){
  resultState('Finding the most natural Japanese for this situation…','loading');
  clearLoadingTimers();
  loadingTimers.push(setTimeout(()=>{
    if(busy)resultState('Still working — SakuTalk is choosing natural wording for the situation…','loading');
  },7000));
  loadingTimers.push(setTimeout(()=>{
    if(busy)resultState('This is taking a little longer than usual. You can keep this screen open.','loading');
  },15000));
}

function resultFitClass(text){
  const len=String(text||'').length;
  if(len>220)return 'fit-xlong';
  if(len>140)return 'fit-long';
  if(len>75)return 'fit-medium';
  return '';
}

function showResult(data,sourceText){
  const x=data?.recommended||{};
  const state=document.querySelector('[data-ti-result-state]');
  const content=document.querySelector('[data-ti-result-content]');
  if(!state||!content)return;

  state.hidden=true;
  content.hidden=false;
  const fit=resultFitClass(x.japanese);
  content.innerHTML=`
    <div class="sakura-result-block">
      <span class="sakura-result-label">Japanese</span>
      <p class="sakura-interpreter-jp ${fit}" lang="ja">${esc(x.japanese||'')}</p>
    </div>
    ${x.kana?`<div class="sakura-result-block"><span class="sakura-result-label">Kana</span><p class="sakura-interpreter-kana" lang="ja">${esc(x.kana)}</p></div>`:''}
    ${x.romaji?`<div class="sakura-result-block"><span class="sakura-result-label">Romaji</span><p class="sakura-interpreter-romaji">${esc(x.romaji)}</p></div>`:''}
    <div class="sakura-interpreter-meaning">
      <strong>Meaning check</strong>
      <p>${esc(x.english||sourceText)}</p>
    </div>
    ${data?.why_natural?`<p class="sakura-interpreter-why">${esc(data.why_natural)}</p>`:''}
    <div class="sakura-interpreter-result-actions">
      <button type="button" data-ti-hear>🔊 Speak Japanese</button>
      <button type="button" data-ti-staff>▣ Show full screen</button>
      <button type="button" data-ti-copy>Copy</button>
      <button type="button" data-ti-again>New phrase</button>
    </div>`;
}

function setContext(value){
  document.querySelectorAll('[data-ti-context] .sakura-interpreter-chip')
    .forEach(x=>x.classList.toggle('active',x.dataset.value===value));
}

function setMicUi(active){
  const b=document.querySelector('[data-ti-mic]');
  if(b){
    b.classList.toggle('is-listening',active);
    b.setAttribute('aria-pressed',String(active));
    b.textContent=active?'⏹ Stop listening':'🎙️ Speak English';
  }
  const translateButton=document.querySelector('[data-ti-translate]');
  if(translateButton)translateButton.disabled=active||busy;
}

function finishListening(message){
  listening=false;
  setMicUi(false);
  status(message||'');
}

function stopListening(){
  if(!recognition||!listening)return;
  stopRequested=true;
  status('Finishing your sentence…',true);
  try{
    recognition.stop();
  }catch{
    finishListening(heardSpeech?'Stopped. Check your sentence, then translate.':'Listening stopped.');
  }
}

function resetResult(){
  result=null;
  resultState('Your natural Japanese will appear here.');
}

function open(preset=''){
  if(preset)setContext(preset);
  $('sakura-interpreter').hidden=false;
  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';
}

function close(){
  if(listening)stopListening();
  $('sakura-interpreter').hidden=true;
  document.documentElement.style.overflow='';
  document.body.style.overflow='';
  try{speechSynthesis.cancel()}catch{}
}

function speak(t){
  if(!t)return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(t);
    u.lang='ja-JP';
    u.rate=.9;
    speechSynthesis.speak(u);
  }catch{}
}

function mediumFor(context){
  return context==='Online / Messaging'?'Written message / chat':'Spoken face-to-face conversation';
}

function contextFor(context,situation){
  if(situation){
    const prefix=(context==='Any Situation'||context==='Custom')?'':`${context}: `;
    return `${prefix}${situation}`.slice(0,100);
  }
  return context==='Any Situation'
    ?'General conversation; infer the appropriate relationship and register; do not assume travel.'
    :context;
}

async function translate(){
  if(busy||listening)return;

  const text=$('sakura-ti-input').value.trim();
  const situation=$('sakura-ti-situation').value.trim();
  const context=sel('[data-ti-context]')||'Any Situation';
  const tone=sel('[data-ti-tone]')||'Natural for the situation';
  const c=window.SAKURA_AI_CONFIG||{};
  const aiContext=contextFor(context,situation);

  if(!text){
    status('Type or speak an English sentence first.');
    $('sakura-ti-input').focus();
    return;
  }
  if(context==='Custom'&&!situation){
    status('Describe the custom situation or relationship first.');
    $('sakura-ti-situation').focus();
    return;
  }
  if(!c.enabled||!c.endpoint||!c.gatewayKey){
    const message='Natural AI translation is unavailable right now.';
    status(message);
    resultState(message,'error',true);
    return;
  }

  busy=true;
  setTranslateBusy(true);
  status('');
  resultLoading();
  $('sakura-ti-result')?.scrollIntoView({behavior:'smooth',block:'nearest'});

  try{
    const ac=new AbortController();
    const timer=setTimeout(()=>ac.abort(),35000);
    let r;
    try{
      r=await fetch(c.endpoint,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Accept':'application/json',
          'apikey':c.gatewayKey
        },
        body:JSON.stringify({
          text:text.slice(0,500),
          direction:'english-to-japanese',
          context:aiContext,
          situation:situation.slice(0,160),
          tone,
          medium:mediumFor(context),
          jlpt_level:'N5-N1',
          response_style:'native-tutor',
          interpreter_mode:'general',
          natural_interpreter:true,
          travel_interpreter:context==='Travel',
          preserve_facts:true
        }),
        signal:ac.signal,
        cache:'no-store',
        credentials:'omit'
      });
    }finally{
      clearTimeout(timer);
    }

    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||`Translation failed (${r.status}).`);
    if(!d?.recommended?.japanese)throw new Error('Translation returned an incomplete result.');

    result=d;
    showResult(d,text);
    status('Ready · check the meaning before showing or playing it.');
    $('sakura-ti-result')?.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    const message=e?.name==='AbortError'
      ?'SakuTalk took too long to respond. Please try again.'
      :(e.message||'Translation failed.');
    status('');
    resultState(message,'error',true);
  }finally{
    clearLoadingTimers();
    busy=false;
    setTranslateBusy(false);
  }
}

function mic(){
  if(listening){
    stopListening();
    return;
  }

  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    status('Voice recognition is not available here. You can still type.');
    return;
  }

  try{
    recognition?.abort?.();
    recognition=new SR();
    recognition.lang='en-US';
    recognition.interimResults=true;
    recognition.continuous=true;
    recognition.maxAlternatives=1;
    stopRequested=false;
    heardSpeech=false;

    let finalText='';
    let interimText='';

    recognition.onstart=()=>{
      listening=true;
      setMicUi(true);
      status('Listening — tap Stop listening when you’re done.',true);
    };

    recognition.onresult=e=>{
      interimText='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const text=e.results[i]?.[0]?.transcript||'';
        if(e.results[i].isFinal)finalText+=`${text} `;
        else interimText+=text;
      }
      const combined=(finalText+interimText).trim();
      if(combined){
        heardSpeech=true;
        $('sakura-ti-input').value=combined;
      }
    };

    recognition.onerror=e=>{
      if(e.error==='aborted'&&stopRequested)return;
      const message=e.error==='not-allowed'
        ?'Microphone permission is needed for voice input.'
        :e.error==='no-speech'
          ?'I didn’t hear anything. Tap Speak English and try again.'
          :e.error==='audio-capture'
            ?'SakuTalk could not access the microphone.'
            :'Voice input did not work. You can type instead.';
      finishListening(message);
    };

    recognition.onend=()=>{
      const wasStopRequested=stopRequested;
      stopRequested=false;
      finishListening(
        heardSpeech
          ?(wasStopRequested?'Stopped. Check your sentence, then translate.':'Got it. Check your sentence, then translate.')
          :'Listening ended. Tap Speak English to try again.'
      );
    };

    recognition.start();
  }catch{
    finishListening('Voice input could not start. You can type instead.');
  }
}

function bind(){
  document.addEventListener('click',async e=>{
    const t=e.target;
    const opener=t.closest('[data-ti-open]');
    const chip=t.closest('.sakura-interpreter-chip');

    if(opener)return open(opener.dataset.tiPreset||'');
    if(t.closest('[data-ti-close]'))return close();

    if(chip){
      chip.parentElement.querySelectorAll('.sakura-interpreter-chip')
        .forEach(x=>x.classList.toggle('active',x===chip));
      if(chip.parentElement.matches('[data-ti-context]')&&chip.dataset.value==='Custom'){
        $('sakura-ti-situation')?.focus();
      }
      return;
    }

    if(t.closest('[data-ti-mic]'))return mic();

    if(t.closest('[data-ti-clear]')){
      if(listening)stopListening();
      $('sakura-ti-input').value='';
      $('sakura-ti-situation').value='';
      status('');
      resetResult();
      return;
    }

    if(t.closest('[data-ti-translate]')||t.closest('[data-ti-retry]'))return translate();
    if(t.closest('[data-ti-hear]'))return speak(result?.recommended?.japanese||'');

    if(t.closest('[data-ti-staff]')){
      const x=result?.recommended||{};
      $('sakura-ti-staff').hidden=false;
      document.querySelector('[data-ti-staff-jp]').textContent=x.japanese||'';
      document.querySelector('[data-ti-staff-en]').textContent=x.english||'';
      return;
    }

    if(t.closest('[data-ti-staff-close]')){
      $('sakura-ti-staff').hidden=true;
      return;
    }

    if(t.closest('[data-ti-copy]')){
      const x=result?.recommended||{};
      try{
        await navigator.clipboard.writeText([x.japanese,x.kana,x.romaji,x.english].filter(Boolean).join('\n'));
        status('Copied.');
      }catch{
        status('Copy was blocked.');
      }
      return;
    }

    if(t.closest('[data-ti-again]')){
      $('sakura-ti-input').value='';
      status('');
      resetResult();
      $('sakura-ti-input').focus();
    }
  });
}

function init(){
  style();
  markup();
  launch();
  bind();
  new MutationObserver(launch).observe(document.body,{childList:true,subtree:true});
  const api=Object.freeze({version:2.2,open,close});
  window.SakuraInterpreter=api;
  window.SakuraTravelInterpreter=api;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
}());
