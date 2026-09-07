/* Sakura Trip Quick Help Jump v1 — compact day-view shortcut to the Quick Help tools. */
(function initializeSakuraTripQuickHelpJump(){
'use strict';
if(window.SakuraTripQuickHelpJump?.version>=1)return;

const ROOT=()=>document.getElementById('sakura-trip-companion');
let queued=false;

function css(){
  if(document.getElementById('sakura-trip-quick-help-jump-style'))return;
  const s=document.createElement('style');
  s.id='sakura-trip-quick-help-jump-style';
  s.textContent=`
#sakura-trip-companion .stqhj-jump{width:100%;min-height:44px;margin:0 0 10px;padding:9px 13px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid color-mix(in srgb,var(--color-primary) 34%,var(--color-border));border-radius:14px;background:var(--color-primary-soft);color:var(--color-primary-dark);font:inherit;font-size:12px;font-weight:900;letter-spacing:.01em;box-shadow:0 6px 18px color-mix(in srgb,var(--color-primary) 7%,transparent)}
#sakura-trip-companion .stqhj-jump:active{transform:translateY(1px)}
#sakura-trip-companion [data-stqhj-quick-card]{scroll-margin-top:calc(76px + env(safe-area-inset-top))}
`;
  document.head.appendChild(s);
}

function quickCard(root){
  return [...(root?.querySelectorAll('[data-main] .stc-card')||[])].find(card=>/quick help/i.test(card.querySelector('.stc-kicker')?.textContent||''))||null;
}

function decorate(){
  queued=false;css();
  const root=ROOT(),main=root?.querySelector('[data-main]'),days=root?.querySelector('[data-days]');
  if(!root?.classList.contains('open')||!main||!days||days.hidden){root?.querySelector('.stqhj-jump')?.remove();return}
  const quick=quickCard(root);if(!quick)return;
  quick.dataset.stqhjQuickCard='1';
  if(main.querySelector('.stqhj-jump'))return;
  const button=document.createElement('button');
  button.type='button';button.className='stqhj-jump';button.dataset.stqhjJump='1';
  button.innerHTML='<span aria-hidden="true">⚡</span><span>Quick Help</span><span aria-hidden="true">↓</span>';
  main.insertBefore(button,main.firstElementChild);
}

function queue(){if(queued)return;queued=true;setTimeout(decorate,0)}

document.addEventListener('click',event=>{
  const button=event.target.closest?.('#sakura-trip-companion [data-stqhj-jump]');if(!button)return;
  const root=ROOT(),quick=quickCard(root);if(!quick)return;
  quick.scrollIntoView({behavior:'smooth',block:'start'});
},true);

function init(){css();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});queue()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

window.SakuraTripQuickHelpJump=Object.freeze({version:1,decorate:queue});
}());
