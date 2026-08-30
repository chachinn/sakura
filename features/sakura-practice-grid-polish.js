/* Sakura Practice Grid Compatibility v3
   Keeps Practice cleanup lightweight and makes the Sakura Interpreter loader
   resilient even when an older compatibility shim already initialized. */
(function initializeSakuraPracticeGridCompatibility(){
  'use strict';

  function ensureTravelInterpreterLaunch(){
    const view=document.getElementById('travel-view');
    const grid=view?.querySelector('.travel-category-grid');
    if(!view||!grid)return;
    let button=view.querySelector('.sakura-travel-interpreter-card');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='travel-feature-card travel-language-others sakura-travel-interpreter-card';
      grid.insertAdjacentElement('beforebegin',button);
    }
    button.dataset.tiOpen='';
    button.dataset.tiPreset='Travel';
    button.innerHTML='<span aria-hidden="true">🗣️</span><div><h2>Sakura Interpreter</h2><p>Natural Japanese for any conversation. Opens with Travel context from here.</p></div><b aria-hidden="true">→</b>';
  }

  function loadTravelInterpreter(){
    if(window.SakuraInterpreter||window.SakuraTravelInterpreter){
      ensureTravelInterpreterLaunch();
      return;
    }

    const existing=document.querySelector('script[data-sakura-travel-interpreter]');
    if(existing?.dataset.sakuraTravelInterpreterLoading==='1'){
      existing.addEventListener('load',ensureTravelInterpreterLaunch,{once:true});
      return;
    }
    existing?.remove();

    const script=document.createElement('script');
    script.src='./features/sakura-travel-interpreter.js?v=3';
    script.defer=true;
    script.dataset.sakuraTravelInterpreter='1';
    script.dataset.sakuraTravelInterpreterLoading='1';
    script.onload=()=>{
      delete script.dataset.sakuraTravelInterpreterLoading;
      ensureTravelInterpreterLaunch();
    };
    script.onerror=()=>{
      delete script.dataset.sakuraTravelInterpreterLoading;
      script.remove();
      console.warn('Sakura Interpreter could not load. Existing Travel and Translator tools remain available.');
    };
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
