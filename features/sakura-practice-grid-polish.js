/* Sakura Practice Grid Compatibility v3
   Keeps Practice cleanup lightweight and makes the Travel Interpreter loader
   resilient even when an older compatibility shim already initialized. */
(function initializeSakuraPracticeGridCompatibility(){
  'use strict';

  function ensureTravelInterpreterLaunch(){
    const view=document.getElementById('travel-view');
    const grid=view?.querySelector('.travel-category-grid');
    if(!view||!grid||view.querySelector('.sakura-travel-interpreter-card'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='travel-feature-card travel-language-others sakura-travel-interpreter-card';
    button.dataset.tiOpen='';
    button.innerHTML='<span aria-hidden="true">🗣️</span><div><h2>Travel Interpreter</h2><p>Speak or type naturally, then show or play Japanese in real conversations.</p></div><b aria-hidden="true">→</b>';
    grid.insertAdjacentElement('beforebegin',button);
  }

  function loadTravelInterpreter(){
    if(window.SakuraTravelInterpreter){
      ensureTravelInterpreterLaunch();
      return;
    }
    const existing=document.querySelector('script[data-sakura-travel-interpreter]');
    if(existing){
      existing.addEventListener('load',ensureTravelInterpreterLaunch,{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src='./features/sakura-travel-interpreter.js?v=2';
    script.defer=true;
    script.dataset.sakuraTravelInterpreter='1';
    script.onload=ensureTravelInterpreterLaunch;
    script.onerror=()=>console.warn('Sakura Travel Interpreter could not load. Existing Travel and Translator tools remain available.');
    document.head.appendChild(script);
  }

  // Run this before the version guard. An older shim may already exist in an
  // installed PWA session, but that must never suppress the interpreter loader.
  loadTravelInterpreter();

  if(window.SakuraPracticeGridPolish?.version>=3)return;

  function cleanup(){
    document.getElementById('source-practice-launch')?.remove();
    document.querySelector('#practice-view .practice-coming-grid')?.classList.remove('practice-grid-balanced');
  }

  window.SakuraPracticeGridPolish=Object.freeze({version:3,cleanup,ensureTravelInterpreterLaunch});
  if(document.body)cleanup();
  else document.addEventListener('DOMContentLoaded',cleanup,{once:true});
}());
