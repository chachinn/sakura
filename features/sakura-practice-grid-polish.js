/* Sakura Practice Grid Compatibility v2
   The former full-width Real-Life Drills card was merged into What Would You Say?.
   Keep this lightweight compatibility shim until the next loader cleanup.
*/
(function initializeSakuraPracticeGridCompatibility(){
  'use strict';
  if(window.SakuraPracticeGridPolish?.version>=2)return;

  function cleanup(){
    document.getElementById('source-practice-launch')?.remove();
    document.querySelector('#practice-view .practice-coming-grid')?.classList.remove('practice-grid-balanced');
  }

  function loadTravelInterpreter(){
    if(document.querySelector('script[data-sakura-travel-interpreter]'))return;
    const script=document.createElement('script');
    script.src='features/sakura-travel-interpreter.js?v=1';
    script.defer=true;
    script.dataset.sakuraTravelInterpreter='1';
    document.head.appendChild(script);
  }

  window.SakuraPracticeGridPolish=Object.freeze({version:2,cleanup});
  loadTravelInterpreter();
  if(document.body)cleanup();else document.addEventListener('DOMContentLoaded',cleanup,{once:true});
}());
