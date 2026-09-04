/* Sakura Travel Airports launcher v1 */
(function initializeSakuraTravelAirports(){
'use strict';
if(window.SakuraTravelAirports?.version>=1)return;
function ensure(){
  const grid=document.querySelector('#travel-view .travel-category-grid');if(!grid||grid.querySelector('[data-travel-category="airports"]'))return;
  const button=document.createElement('button');button.className='travel-category-card';button.type='button';button.dataset.route='travel-airports';button.dataset.travelCategory='airports';button.innerHTML='<span aria-hidden="true">空</span><div><h2>Airports &amp; Immigration</h2><p>Check-in, immigration, baggage and boarding.</p></div><b aria-hidden="true">→</b>';
  const trains=grid.querySelector('[data-travel-category="trains"]');trains?.insertAdjacentElement('afterend',button)||grid.prepend(button);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
window.SakuraTravelAirports=Object.freeze({version:1,ensure});
}());
