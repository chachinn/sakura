/* Sakura Camera Japanese v1 — iPhone camera/photo Japanese understanding. */
(function initializeSakuraCameraJapanese(){
  'use strict';
  if(window.SakuraCameraJapanese?.version>=1)return;

  const ESC=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let photo=null;
  let context='auto';
  let busy=false;
  const contexts=[['auto','Auto detect'],['menu','Menu'],['sign','Sign'],['ticket','Ticket'],['product','Product'],['notice','Notice']];

  function css(){
    if(document.getElementById('sakura-camera-japanese-style'))return;
    const style=document.createElement('style');
    style.id='sakura-camera-japanese-style';
    style.textContent=`
      #sakura-camera-japanese{position:fixed;inset:0;z-index:12040;display:none;background:var(--color-background,#fffafc);color:var(--color-text,#222);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Hiragino Sans","Yu Gothic",sans-serif}
      #sakura-camera-japanese.open{display:block}#sakura-camera-japanese *{box-sizing:border-box}
      .scj-scroll{height:100%;overflow:auto;padding:0 14px calc(34px + env(safe-area-inset-bottom))}.scj-head{position:sticky;top:0;z-index:4;margin:0 -14px;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;display:grid;grid-template-columns:46px 1fr 46px;align-items:center;background:color-mix(in srgb,var(--color-background,#fffafc) 94%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--color-border,#ead9df)}
      .scj-back,.scj-icon{width:42px;height:42px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-surface);color:inherit;font-size:20px}.scj-title{text-align:center}.scj-title small{display:block;color:var(--color-primary-dark);font-size:9px;font-weight:900;letter-spacing:.1em}.scj-title strong{font-size:18px}
      .scj-card{margin:11px 0;padding:14px;border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface)}.scj-kicker{color:var(--color-primary-dark);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.09em}.scj-card h2{margin:4px 0 5px;font-size:22px}.scj-card h3{margin:3px 0 10px;font-size:16px}.scj-muted{color:var(--color-text-muted);font-size:10px;line-height:1.5}
      .scj-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.scj-actions button{min-height:46px;padding:10px 12px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-surface);color:inherit;font-size:11px;font-weight:850}.scj-actions .primary{background:var(--color-primary);border-color:var(--color-primary);color:#fff}.scj-actions button:disabled{opacity:.55}
      .scj-photo{display:grid;place-items:center;min-height:190px;margin-top:11px;border:1px dashed var(--color-border);border-radius:15px;background:var(--color-background);overflow:hidden}.scj-photo img{display:block;width:100%;max-height:48vh;object-fit:contain}.scj-placeholder{text-align:center;padding:25px;color:var(--color-text-muted)}.scj-placeholder span{display:block;font-size:32px}.scj-placeholder strong{display:block;margin-top:7px;font-size:12px}.scj-placeholder small{display:block;margin-top:4px;font-size:9px;line-height:1.45}
      .scj-contexts{display:flex;gap:7px;overflow:auto;margin-top:10px;padding-bottom:2px}.scj-context{flex:0 0 auto;min-height:36px;padding:7px 10px;border:1px solid var(--color-border);border-radius:999px;background:var(--color-background);color:var(--color-text-muted);font-size:10px;font-weight:800}.scj-context.on{border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary-dark)}
      .scj-status{margin-top:9px;padding:10px 11px;border-radius:12px;background:var(--color-primary-soft);color:var(--color-primary-dark);font-size:10px;line-height:1.45}.scj-status.bad{background:#fff1f4;color:#963a56}.scj-status[hidden]{display:none}
      .scj-result-head{padding:12px;border-radius:14px;background:var(--color-primary-soft)}.scj-result-head small{display:block;color:var(--color-primary-dark);font-size:8px;font-weight:900;text-transform:uppercase}.scj-result-head strong{display:block;margin-top:4px;font-size:17px;line-height:1.35}.scj-result-head p{margin:6px 0 0;color:var(--color-text-muted);font-size:11px;line-height:1.55}
      .scj-action{margin-top:9px;padding:10px 11px;border-radius:13px;background:#f2f7ff;color:#536273;font-size:10px;line-height:1.5}.scj-warning{margin-top:8px;padding:9px 10px;border-radius:12px;background:#fff6d9;color:#705914;font-size:9px;line-height:1.45}
      .scj-key{margin-top:8px;padding:11px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background)}.scj-key-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start}.scj-key b{font-size:18px;line-height:1.35}.scj-speak{width:36px;height:36px;border:1px solid var(--color-border);border-radius:11px;background:var(--color-surface);font-size:16px}.scj-key em,.scj-key span,.scj-key small{display:block;margin-top:3px}.scj-key em{color:var(--color-primary-dark);font-size:11px;font-style:normal}.scj-key span{font-size:11px}.scj-key small{color:var(--color-text-muted);font-size:9px}
      .scj-privacy{margin-top:10px;color:var(--color-text-muted);font-size:8px;line-height:1.45}.scj-meta{margin-top:7px;color:var(--color-text-muted);font-size:8px}.scj-loading{padding:20px 8px;text-align:center;color:var(--color-text-muted);font-size:11px}
      @media(max-width:360px){.scj-card h2{font-size:20px}.scj-actions button{flex:1 1 100%}}
    `;
    document.head.appendChild(style);
  }

  function shell(){
    if(document.getElementById('sakura-camera-japanese'))return;
    css();
    const root=document.createElement('section');root.id='sakura-camera-japanese';root.setAttribute('aria-hidden','true');
    root.innerHTML=`<div class="scj-scroll"><header class="scj-head"><button class="scj-back" type="button" data-scj-back>‹</button><div class="scj-title"><small>TRAVEL</small><strong>Camera Japanese</strong></div><button class="scj-icon" type="button" data-scj-new aria-label="New photo">📷</button></header><main data-scj-main></main></div>`;
    document.body.appendChild(root);
  }
  function root(){return document.getElementById('sakura-camera-japanese')}
  function main(){return root()?.querySelector('[data-scj-main]')}

  function render(){
    main().innerHTML=`
      <section class="scj-card"><div class="scj-kicker">Point · Read · Understand</div><h2>Read Japanese around you</h2><div class="scj-muted">Take a photo of a menu, sign, ticket, product label or notice. Sakura will focus on the visible text and explain what matters.</div>
        <div class="scj-actions"><button type="button" class="primary" data-scj-camera>📷 Take Photo</button><button type="button" data-scj-library>🖼 Choose Photo</button></div>
        <div class="scj-photo" data-scj-photo>${photo?`<img src="${photo.dataUrl}" alt="Selected photo">`:`<div class="scj-placeholder"><span>📷</span><strong>No photo yet</strong><small>Use the rear camera or choose an existing photo.</small></div>`}</div>
        ${photo?`<div class="scj-meta">Prepared on-device · ${Math.max(1,Math.round(photo.bytes/1024))} KB · JPEG</div>`:''}
      </section>
      <section class="scj-card"><div class="scj-kicker">What are you looking at?</div><div class="scj-contexts">${contexts.map(([key,label])=>`<button type="button" class="scj-context ${context===key?'on':''}" data-scj-context="${key}">${label}</button>`).join('')}</div>
        <div class="scj-actions"><button type="button" class="primary" data-scj-analyze ${!photo||busy?'disabled':''}>${busy?'Reading Japanese…':'✨ Read Japanese'}</button></div>
        <div class="scj-status" data-scj-status hidden></div>
        <div class="scj-privacy">The selected photo is compressed on your device and sent through Sakura's Supabase function to Google Gemini for analysis. Sakura does not save the photo to your trip or account. Avoid photographing sensitive personal information.</div>
      </section>
      <section class="scj-card" data-scj-result><div class="scj-kicker">Result</div><div class="scj-muted">Your translation and useful Japanese will appear here.</div></section>`;
  }

  function setStatus(message,bad=false){const el=root()?.querySelector('[data-scj-status]');if(!el)return;el.hidden=!message;el.textContent=message||'';el.className=`scj-status${bad?' bad':''}`}

  function chooseFile(capture){
    const input=document.createElement('input');input.type='file';input.accept='image/*';if(capture)input.setAttribute('capture','environment');
    input.style.position='fixed';input.style.left='-9999px';document.body.appendChild(input);
    input.addEventListener('change',async()=>{const file=input.files?.[0];input.remove();if(file)await preparePhoto(file)},{once:true});
    input.click();
  }

  function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Sakura could not read that image. Try another photo.'));image.src=url})}
  function canvasBlob(canvas,type='image/jpeg',quality=.82){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not prepare this photo.')),type,quality))}
  function blobDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Could not prepare this photo.'));reader.readAsDataURL(blob)})}

  async function preparePhoto(file){
    if(!file.type.startsWith('image/')){setStatus('Choose an image file.',true);return}
    setStatus('Preparing photo on your device…');
    try{
      const url=URL.createObjectURL(file);let image;
      try{image=await loadImage(url)}finally{URL.revokeObjectURL(url)}
      const max=1600,scale=Math.min(1,max/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height));
      const width=Math.max(1,Math.round((image.naturalWidth||image.width)*scale)),height=Math.max(1,Math.round((image.naturalHeight||image.height)*scale));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx)throw new Error('Camera image processing is unavailable on this device.');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
      const blob=await canvasBlob(canvas,'image/jpeg',.82);const dataUrl=await blobDataUrl(blob);const base64=dataUrl.split(',')[1]||'';
      if(!base64)throw new Error('Could not prepare this photo.');
      photo={dataUrl,base64,mime:'image/jpeg',bytes:blob.size,width,height};
      busy=false;render();setStatus('Photo ready. Tap Read Japanese.');
    }catch(error){photo=null;render();setStatus(error.message||'Could not prepare this photo.',true)}
  }

  function endpoint(){
    const cfg=window.SAKURA_AI_CONFIG||{};return {url:String(cfg.endpoint||'').replace(/\/sakura-ai-translator(?:\?.*)?$/,'/sakura-camera-japanese'),key:cfg.gatewayKey||cfg.publishableKey||''}
  }

  async function analyze(){
    if(!photo||busy)return;const cfg=endpoint();if(!cfg.url||!cfg.key){setStatus('Camera Japanese is not configured right now.',true);return}
    busy=true;render();setStatus('Gemini is reading the visible Japanese…');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(cfg.url,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key},body:JSON.stringify({image_base64:photo.base64,mime_type:photo.mime,context}),signal:controller.signal});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Camera Japanese failed (${response.status}).`);
      renderResult(data);setStatus('');
    }catch(error){setStatus(error.name==='AbortError'?'Image reading took too long. Please try again.':error.message||'Camera Japanese is temporarily unavailable.',true)}
    finally{clearTimeout(timer);busy=false;const button=root()?.querySelector('[data-scj-analyze]');if(button){button.disabled=!photo;button.textContent='✨ Read Japanese'}}
  }

  function renderResult(data){
    const box=root()?.querySelector('[data-scj-result]');if(!box)return;
    const keys=Array.isArray(data.key_text)?data.key_text.slice(0,12):[];const warnings=Array.isArray(data.warnings)?data.warnings.filter(Boolean).slice(0,6):[];
    box.innerHTML=`<div class="scj-kicker">${ESC(data.category||'Camera Japanese')} · ${ESC(data.confidence||'')}</div><div class="scj-result-head"><small>What it says</small><strong>${ESC(data.headline||'Japanese text')}</strong><p>${ESC(data.translation||'No readable Japanese translation was returned.')}</p></div>${data.action_needed?`<div class="scj-action"><b>What you need to do</b><br>${ESC(data.action_needed)}</div>`:''}${warnings.map(w=>`<div class="scj-warning">⚠️ ${ESC(w)}</div>`).join('')}${keys.length?`<h3 style="margin-top:14px">Japanese to know</h3>${keys.map((item,index)=>`<div class="scj-key"><div class="scj-key-top"><div><b>${ESC(item.japanese||'')}</b>${item.kana?`<em>${ESC(item.kana)}</em>`:''}</div><button class="scj-speak" type="button" data-scj-speak="${index}" aria-label="Speak Japanese">🔊</button></div>${item.romaji?`<small>${ESC(item.romaji)}</small>`:''}<span>${ESC(item.english||'')}</span></div>`).join('')}`:''}<div class="scj-actions"><button type="button" data-scj-copy>Copy translation</button><button type="button" class="primary" data-scj-new>New photo</button></div>`;
    box._cameraResult={...data,key_text:keys};
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function speak(index){const data=root()?.querySelector('[data-scj-result]')?._cameraResult;const text=data?.key_text?.[index]?.japanese;if(!text||!window.speechSynthesis)return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ja-JP';utterance.rate=.9;window.speechSynthesis.speak(utterance)}
  async function copy(){const data=root()?.querySelector('[data-scj-result]')?._cameraResult;if(!data)return;const text=[data.headline,data.translation,data.action_needed].filter(Boolean).join('\n');try{await navigator.clipboard.writeText(text);setStatus('Translation copied.')}catch{setStatus('Copy was blocked. Press and hold the translation to copy it.',true)}}

  function open(){shell();photo=null;context='auto';busy=false;render();const r=root();r.classList.add('open');r.setAttribute('aria-hidden','false')}
  function close({returnToDay=true}={}){const r=root();if(!r)return;r.classList.remove('open');r.setAttribute('aria-hidden','true');window.speechSynthesis?.cancel?.();if(returnToDay)setTimeout(()=>document.querySelector('#sakura-trip-companion [data-back]')?.click(),0)}

  document.addEventListener('click',async event=>{
    if(event.target.closest?.('#sakura-trip-companion [data-help="camera"]')){setTimeout(open,0);return}
    if(!event.target.closest?.('#sakura-camera-japanese'))return;
    if(event.target.closest('[data-scj-back]'))return close();
    if(event.target.closest('[data-scj-camera]'))return chooseFile(true);
    if(event.target.closest('[data-scj-library]'))return chooseFile(false);
    if(event.target.closest('[data-scj-new]')){photo=null;busy=false;render();return}
    const contextButton=event.target.closest('[data-scj-context]');if(contextButton){context=contextButton.dataset.scjContext||'auto';render();return}
    if(event.target.closest('[data-scj-analyze]'))return analyze();
    const speaker=event.target.closest('[data-scj-speak]');if(speaker)return speak(Number(speaker.dataset.scjSpeak)||0);
    if(event.target.closest('[data-scj-copy]'))return copy();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root()?.classList.contains('open'))close()});
  window.SakuraCameraJapanese=Object.freeze({version:1,open,close});
}());
