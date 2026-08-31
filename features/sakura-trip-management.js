/* Sakura Trip Management v1 — user-owned trip deletion and clean replacement workflow. */
(function initializeSakuraTripManagement(){
  'use strict';
  if(window.SakuraTripManagement?.version>=1)return;

  const style=document.createElement('style');
  style.id='sakura-trip-management-style';
  style.textContent=`
    #sakura-trip-companion .stc-trip-manage-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch;margin-top:8px}
    #sakura-trip-companion .stc-trip-manage-row>.stc-row{margin:0}
    #sakura-trip-companion .stc-delete-trip{min-width:48px;padding:8px 10px;border:1px solid color-mix(in srgb,#c4495f 30%,var(--color-border));border-radius:14px;background:color-mix(in srgb,#fff0f3 70%,var(--color-surface));color:#a72d4f;font-size:11px;font-weight:900}
  `;
  document.head.appendChild(style);

  function trips(){return window.SakuraTripStore?.loadTrips?.()||[]}
  function save(next){window.SakuraTripStore?.saveTrips?.(next)}
  function removeTrip(id){
    const current=trips();
    const target=current.find(t=>t.id===id);if(!target)return false;
    const ok=window.confirm(`Delete “${target.name}”?\n\nThis removes the saved itinerary from this device. You can paste it again later.`);
    if(!ok)return false;
    const next=current.filter(t=>t.id!==id);
    try{
      const activeKey=window.SakuraTripStore?.keys?.ACTIVE_TRIP_KEY||'sakuraActiveTripIdV1';
      const previewPrefix=window.SakuraTripStore?.keys?.PREVIEW_DAY_PREFIX||'sakuraTripPreviewDayV1:';
      if(localStorage.getItem(activeKey)===id)localStorage.removeItem(activeKey);
      localStorage.removeItem(previewPrefix+id);
    }catch{}
    save(next);
    setTimeout(()=>{
      document.querySelector('#sakura-trip-companion [data-trips]')?.click();
      window.SakuraTripPublicDefault?.ensureEmptyLauncher?.();
    },0);
    return true;
  }

  function decorate(){
    const root=document.getElementById('sakura-trip-companion');if(!root)return;
    root.querySelectorAll('[data-open-trip]').forEach(open=>{
      const id=open.dataset.openTrip;if(!id||open.closest('.stc-trip-manage-row'))return;
      const wrap=document.createElement('div');wrap.className='stc-trip-manage-row';
      open.parentNode.insertBefore(wrap,open);wrap.appendChild(open);
      const del=document.createElement('button');del.type='button';del.className='stc-delete-trip';del.dataset.deleteTrip=id;del.setAttribute('aria-label','Delete trip');del.textContent='Delete';wrap.appendChild(del);
    });
  }

  const observer=new MutationObserver(()=>decorate());
  function init(){
    const root=document.getElementById('sakura-trip-companion');
    if(root)observer.observe(root,{childList:true,subtree:true});
    decorate();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#sakura-trip-companion [data-delete-trip]');
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    removeTrip(button.dataset.deleteTrip);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
  window.SakuraTripManagement=Object.freeze({version:1,deleteTrip:removeTrip,decorate});
}());
