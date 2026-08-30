/* Sakura October Trip Companion Preview v1
   Previewable before travel; automatically becomes live Oct 18–25, 2026 in Japan time. */
(function initializeSakuraTripCompanion(){
  'use strict';
  if(window.SakuraTripCompanion?.version>=1)return;

  const STORAGE_KEY='sakuraOctoberTripPreviewDayV1';
  const TRIP_START='2026-10-18';
  const TRIP_END='2026-10-25';

  const DAYS=[
    {
      date:'2026-10-18', day:1, weekday:'Sun', emoji:'🛬', title:'Arrival in Tokyo', subtitle:'Narita → Shinjuku → Takadanobaba',
      next:{time:'19:49 target',title:'Narita Express to Shinjuku',note:'Take the next comfortable N’EX after immigration and baggage.'},
      later:{time:'~21:00',title:'Hananosato Takadanobaba',note:'Check in, confirm Wi‑Fi, then keep dinner and groceries simple.'},
      reminder:'Withdraw the planned trip cash and load about ¥5,000 per person on Suica on arrival.',
      route:'Narita Airport → N’EX → Shinjuku → JR Yamanote Line → Takadanobaba',
      planB:'If immigration runs late, skip the target train and take the next comfortable N’EX. The itinerary already has buffer.',
      phrases:[
        ['新宿まで、指定席でお願いします。','Shinjuku made, shiteiseki de onegaishimasu.','To Shinjuku, reserved seat please.'],
        ['この電車は新宿に行きますか？','Kono densha wa Shinjuku ni ikimasu ka?','Does this train go to Shinjuku?'],
        ['予約しています。','Yoyaku shiteimasu.','I have a reservation.']
      ]
    },
    {
      date:'2026-10-19', day:2, weekday:'Mon', emoji:'🌊', title:'Kamakura + Enoshima', subtitle:'Enoden coast · local streets · Iwaya · sunset',
      next:{time:'09:40',title:'Hasedera',note:'Classic Kamakura stop before moving into the quieter coastal neighborhoods.'},
      later:{time:'15:25',title:'Enoshima Iwaya',note:'Protected cave-entry target before Chigogafuchi sunset.'},
      reminder:'Buy the Enoden Noriorikun 1‑day pass at Kamakura Station before hopping along the coast.',
      route:'Takadanobaba → Kamakura → Hase → Gokurakuji → Koshigoe → Enoshima',
      planB:'Use the Enoshima Escar if your legs are tired; the itinerary is intentionally walking-heavy.',
      phrases:[
        ['江ノ電の一日乗車券を二枚お願いします。','Enoden no ichinichi joshaken o nimai onegaishimasu.','Two Enoden one-day passes, please.'],
        ['ここから江の島まで歩けますか？','Koko kara Enoshima made arukemasu ka?','Can we walk to Enoshima from here?'],
        ['生しらすはありますか？','Nama shirasu wa arimasu ka?','Do you have raw shirasu today?']
      ]
    },
    {
      date:'2026-10-20', day:3, weekday:'Tue', emoji:'💇', title:'Shinjuku + Nakano + Shibuya', subtitle:'Lutia · kissaten · anime shopping · fashion',
      next:{time:'11:00',title:'Lutia Shinjuku',note:'Hair appointment. Aim to arrive 10–15 minutes early.'},
      later:{time:'15:45',title:'Nakano Broadway',note:'Collector-focused anime shopping before Shibuya and Mega Donki.'},
      reminder:'The salon can run slightly over. Protect the appointment first and trim 100‑yen shopping if needed.',
      route:'Takadanobaba → Shinjuku → Nakano → Shibuya → Shinjuku',
      planB:'If Lutia finishes late, shorten the 100‑yen-store block rather than rushing Nakano or the evening.',
      phrases:[
        ['11時に予約しています。','Juichi-ji ni yoyaku shiteimasu.','I have an 11:00 reservation.'],
        ['もう少し短くできますか？','Mo sukoshi mijikaku dekimasu ka?','Can you make it a little shorter?'],
        ['これは中古ですか？','Kore wa chuko desu ka?','Is this second-hand?']
      ]
    },
    {
      date:'2026-10-21', day:4, weekday:'Wed', emoji:'🏮', title:'Asakusa + MAPPA', subtitle:'Shichimi · knives · rakugo · keyboards · MAPPA · Ginza',
      next:{time:'11:30',title:'Komagata Maekawa',note:'Protected lunch window before the rakugo block.'},
      later:{time:'16:00',title:'MAPPA EXPO 15th',note:'Be at YURAKUCHO MUSEUM by about 15:25. JJK first, then merchandise.'},
      reminder:'Nothing should eat into the 15:25–16:00 MAPPA arrival buffer.',
      route:'Takadanobaba → Asakusa → Suehirocho → Yurakucho/Ginza → Takadanobaba',
      planB:'If lunch or Asakusa shopping slips, cut flex time first. Do not sacrifice the MAPPA buffer.',
      phrases:[
        ['これは在庫がありますか？','Kore wa zaiko ga arimasu ka?','Is this in stock?'],
        ['お手入れは難しいですか？','Oteire wa muzukashii desu ka?','Is this difficult to maintain?'],
        ['写真を撮ってもいいですか？','Shashin o totte mo ii desu ka?','May I take a photo?']
      ]
    },
    {
      date:'2026-10-22', day:5, weekday:'Thu', emoji:'🌃', title:'Yokohama + BSD', subtitle:'Yamate · literature museum · waterfront · Animate · night views',
      next:{time:'11:05',title:'Kanagawa Museum × BSD',note:'Complete the collaboration worksheet and keep the dated ticket stub.'},
      later:{time:'18:50',title:'Minato Mirai night-view highlight',note:'Kishamichi + canal + skyline. This is a priority block, not filler.'},
      reminder:'Keep the dated museum ticket stub accessible for the BSD benefit at Animate Yokohama VIVRE.',
      route:'Takadanobaba → Ishikawacho/Yamate → Chinatown → Waterfront → Yokohama VIVRE → Minato Mirai → Noge',
      planB:'Yamate is hilly. Use a local bus or short taxi instead of forcing the full walk if energy drops.',
      phrases:[
        ['このチケットで特典はもらえますか？','Kono chiketto de tokuten wa moraemasu ka?','Can I receive the bonus with this ticket?'],
        ['この場所はどこですか？','Kono basho wa doko desu ka?','Where is this place?'],
        ['夜景がきれいに見える場所はどこですか？','Yakei ga kirei ni mieru basho wa doko desu ka?','Where is a good place to see the night view?']
      ]
    },
    {
      date:'2026-10-23', day:6, weekday:'Fri', emoji:'🎭', title:'Gotokuji + SPY×FAMILY', subtitle:'Lucky cats · Harajuku · Omotesando · 2.5D musical',
      next:{time:'09:45',title:'Gotokuji',note:'Morning temple visit while the temple office is comfortably open.'},
      later:{time:'17:45',title:'SPY×FAMILY 2 Musical',note:'Tokyo Tatemono Brillia HALL. Stay near the theater from about 16:05.'},
      reminder:'Have the physical tickets ready and leave Harajuku/Omotesando by 15:30 to protect the theater buffer.',
      route:'Takadanobaba → Gotokuji → Harajuku/Omotesando → Ikebukuro → Takadanobaba',
      planB:'If shopping runs long, cut Omotesando browsing first. The 17:45 performance is fixed.',
      phrases:[
        ['会場はどちらですか？','Kaijo wa dochira desu ka?','Which way is the venue?'],
        ['グッズ売り場はどこですか？','Guzzu uriba wa doko desu ka?','Where is the merchandise area?'],
        ['開演は何時ですか？','Kaien wa nanji desu ka?','What time does the performance start?']
      ]
    },
    {
      date:'2026-10-24', day:7, weekday:'Sat', emoji:'🍵', title:'Sayama + Koganei + Kichijoji', subtitle:'Tea picking · historic architecture · local evening',
      next:{time:'08:49',title:'Seibu Bus 狭山31',note:'From 狭山市駅東口 stop #2 → 狭山台南. Backup is 09:14.'},
      later:{time:'10:00',title:'Miyanoen tea-picking',note:'Reservation for 2 adults; chamusume outfit request should be confirmed in advance.'},
      reminder:'Koganei bus warning: DO NOT TAKE 武17. Use 武12 / 武13 / 武14 / 武15 / 武21 for 小金井公園西口.',
      route:'Takadanobaba → Sayamashi → 狭山台南 → Miyanoen → Hana-Koganei → Koganei Park → Kichijoji',
      planB:'Missed 08:49? Take the 09:14 backup. If Koganei transit gets confusing or you are >15–20 min late, taxi to Musashi-Koganei.',
      phrases:[
        ['このバスは狭山台南に行きますか？','Kono basu wa Sayamadai-minami ni ikimasu ka?','Does this bus go to Sayamadai-minami?'],
        ['このバスは小金井公園西口に止まりますか？','Kono basu wa Koganei-koen Nishiguchi ni tomarimasu ka?','Does this bus stop at Koganei Park West Entrance?'],
        ['10時に予約しています。','Ju-ji ni yoyaku shiteimasu.','I have a reservation at 10:00.']
      ]
    },
    {
      date:'2026-10-25', day:8, weekday:'Sun', emoji:'✈️', title:'Departure', subtitle:'Takadanobaba → Shinjuku → Narita',
      next:{time:'07:27',title:'N’EX 7 from Shinjuku',note:'Reserved-seat departure. Be on the platform with buffer.'},
      later:{time:'~09:00',title:'Narita Airport',note:'Planned arrival gives a large buffer for the 13:00 flight.'},
      reminder:'Before leaving the room: passport, wallet/Suica, chargers, adapters, tickets and final luggage sweep.',
      route:'Takadanobaba → Shinjuku → N’EX 7 → Narita Airport → 13:00 flight',
      planB:'The departure plan intentionally arrives early. Protect the 07:27 N’EX rather than adding a last-minute stop.',
      phrases:[
        ['成田空港までお願いします。','Narita Kuko made onegaishimasu.','To Narita Airport, please.'],
        ['この電車は成田空港に行きますか？','Kono densha wa Narita Kuko ni ikimasu ka?','Does this train go to Narita Airport?'],
        ['チェックインカウンターはどこですか？','Chekku-in kaunta wa doko desu ka?','Where is the check-in counter?']
      ]
    }
  ];

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function japanDateKey(){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function liveDayIndex(){
    const today=japanDateKey();
    if(today<TRIP_START||today>TRIP_END)return -1;
    return DAYS.findIndex(item=>item.date===today);
  }

  function isBeforeTrip(){ return japanDateKey()<TRIP_START; }

  function ensureStyle(){
    if(document.getElementById('sakura-trip-companion-style'))return;
    const style=document.createElement('style');
    style.id='sakura-trip-companion-style';
    style.textContent=`
      #travel-view .sakura-trip-companion-launch{margin-top:0;margin-bottom:8px;border-color:rgba(238,83,128,.28);background:linear-gradient(135deg,rgba(255,245,249,.98),rgba(255,255,255,.98))}
      #travel-view .sakura-trip-companion-launch>span{background:rgba(238,83,128,.10)}
      #sakura-trip-companion{position:fixed;inset:0;z-index:12000;background:#fffafc;color:#232229;display:none;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Hiragino Sans","Yu Gothic",sans-serif}
      #sakura-trip-companion.is-open{display:block}
      #sakura-trip-companion *{box-sizing:border-box}
      .stc-shell{height:100%;overflow:auto;padding:0 14px calc(34px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}
      .stc-topbar{position:sticky;top:0;z-index:3;margin:0 -14px;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;background:rgba(255,250,252,.96);backdrop-filter:blur(18px);border-bottom:1px solid #f0dce3;display:grid;grid-template-columns:48px 1fr 48px;align-items:center}
      .stc-back,.stc-close{width:44px;height:44px;border:1px solid #ead9df;border-radius:15px;background:#fff;box-shadow:0 4px 14px rgba(72,44,55,.05);font-size:24px;color:#25242a}
      .stc-title{text-align:center;min-width:0}.stc-title small{display:block;color:#cb416c;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.stc-title strong{display:block;font-size:19px;line-height:1.1;margin-top:3px}
      .stc-days{display:flex;gap:7px;overflow:auto;padding:12px 0 10px;scrollbar-width:none}.stc-days::-webkit-scrollbar{display:none}
      .stc-day{flex:0 0 auto;min-width:58px;min-height:42px;border:1px solid #ead9df;border-radius:14px;background:#fff;color:#6c6972;font-weight:800;font-size:12px;padding:6px 9px}.stc-day.is-active{border-color:#ee5380;background:#fff0f5;color:#c93f69}
      .stc-preview-note{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:14px;background:#fff0f5;color:#a83c5e;font-size:12px;font-weight:700;margin-bottom:10px}
      .stc-hero{border:1px solid #efc5d2;background:linear-gradient(145deg,#fff,#fff3f7);border-radius:22px;padding:17px;margin-bottom:10px;box-shadow:0 8px 22px rgba(107,55,74,.06)}
      .stc-eyebrow{color:#cb416c;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}.stc-hero h2{font-size:28px;line-height:1.08;margin:0 0 7px}.stc-hero p{font-size:14px;line-height:1.45;color:#77727c;margin:0}
      .stc-timeline{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.stc-time-card{border:1px solid #efdee4;background:#fff;border-radius:16px;padding:12px;min-height:112px}.stc-time-card small{font-size:11px;color:#c94169;font-weight:900}.stc-time-card strong{display:block;font-size:15px;line-height:1.2;margin:5px 0}.stc-time-card p{font-size:11px;line-height:1.35;color:#77727c}
      .stc-alert{margin-top:10px;padding:12px;border-radius:16px;background:#fff1f5;border:1px solid #f1c8d4;font-size:12px;line-height:1.45;color:#5e4b52}.stc-alert b{color:#bd3d63}
      .stc-section{margin:14px 0}.stc-section-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:8px}.stc-section-head small{color:#cb416c;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.stc-section-head h3{margin:2px 0 0;font-size:20px}.stc-section-head span{font-size:11px;color:#8a858d}
      .stc-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.stc-quick{min-height:96px;text-align:left;border:1px solid #ead9df;border-radius:17px;background:#fff;padding:12px;color:#25242a}.stc-quick i{font-style:normal;font-size:22px}.stc-quick strong{display:block;font-size:14px;margin:6px 0 2px}.stc-quick small{display:block;color:#817c85;font-size:11px;line-height:1.3}.stc-quick[data-preview-only]::after{content:'Preview';display:inline-block;margin-top:6px;padding:3px 7px;border-radius:999px;background:#fff0f5;color:#c94169;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      .stc-trip-card,.stc-plan-card{border:1px solid #ead9df;background:#fff;border-radius:18px;padding:14px}.stc-trip-row{display:flex;justify-content:space-between;gap:12px;align-items:center}.stc-trip-card strong{font-size:16px}.stc-trip-card small{display:block;color:#7c7780;font-size:11px;margin-top:3px}.stc-route{margin-top:11px;padding-top:10px;border-top:1px dashed #ead9df;font-size:12px;line-height:1.45;color:#66616a}
      .stc-phrases{display:grid;gap:8px}.stc-phrase{border:1px solid #ead9df;background:#fff;border-radius:17px;padding:13px}.stc-phrase b{display:block;font-size:19px;line-height:1.35}.stc-phrase em{display:block;color:#cb416c;font-size:12px;font-style:normal;margin:4px 0}.stc-phrase span{display:block;color:#69656d;font-size:12px;line-height:1.35}
      .stc-plan-card{background:#fff8fa}.stc-plan-card b{display:block;color:#c13f66;font-size:13px;margin-bottom:5px}.stc-plan-card p{margin:0;font-size:12px;line-height:1.5;color:#615d65}
      .stc-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;transition:.2s ease;z-index:12002;background:#2c2930;color:#fff;padding:10px 14px;border-radius:999px;font-size:12px;font-weight:700;max-width:88%;text-align:center}.stc-toast.is-show{opacity:1;transform:translateX(-50%) translateY(0)}
      @media(max-width:360px){.stc-hero h2{font-size:24px}.stc-timeline{grid-template-columns:1fr}.stc-quick{min-height:90px}}
    `;
    document.head.appendChild(style);
  }

  function render(dayIndex){
    const root=document.getElementById('sakura-trip-companion');
    const day=DAYS[dayIndex]||DAYS[0];
    if(!root)return;
    try{localStorage.setItem(STORAGE_KEY,String(dayIndex))}catch{}
    root.dataset.day=String(dayIndex);
    root.querySelectorAll('.stc-day').forEach((button,index)=>button.classList.toggle('is-active',index===dayIndex));
    const content=root.querySelector('[data-stc-content]');
    const live=liveDayIndex()===dayIndex;
    content.innerHTML=`
      ${live?'':`<div class="stc-preview-note">👀 Preview mode · This is how Day ${day.day} will look during the trip.</div>`}
      <section class="stc-hero">
        <div class="stc-eyebrow">${esc(day.emoji)} Day ${day.day} · ${esc(day.weekday)} · ${esc(day.date.slice(5).replace('-','/'))}</div>
        <h2>${esc(day.title)}</h2>
        <p>${esc(day.subtitle)}</p>
        <div class="stc-timeline">
          <article class="stc-time-card"><small>NEXT · ${esc(day.next.time)}</small><strong>${esc(day.next.title)}</strong><p>${esc(day.next.note)}</p></article>
          <article class="stc-time-card"><small>LATER · ${esc(day.later.time)}</small><strong>${esc(day.later.title)}</strong><p>${esc(day.later.note)}</p></article>
        </div>
        <div class="stc-alert"><b>Don’t forget</b><br>${esc(day.reminder)}</div>
      </section>

      <section class="stc-section">
        <div class="stc-section-head"><div><small>Quick help</small><h3>Need something now?</h3></div><span>One-tap travel help</span></div>
        <div class="stc-quick-grid">
          <button class="stc-quick" type="button" data-stc-sakutalk><i>💬</i><strong>SakuTalk</strong><small>Say it naturally with Travel context.</small></button>
          <button class="stc-quick" type="button" data-preview-only data-preview-label="Show This Place"><i>🗺️</i><strong>Show This Place</strong><small>Large Japanese destination card for staff or taxi.</small></button>
          <button class="stc-quick" type="button" data-preview-only data-preview-label="Transit Rescue"><i>🚆</i><strong>Transit Rescue</strong><small>Lines, stops and the safest next move.</small></button>
          <button class="stc-quick" type="button" data-preview-only data-preview-label="Camera Japanese"><i>📷</i><strong>Camera Japanese</strong><small>Read menus, signs, notices and tickets.</small></button>
        </div>
      </section>

      <section class="stc-section">
        <div class="stc-section-head"><div><small>My trip</small><h3>October Japan Trip</h3></div><span>Day ${day.day} of 8</span></div>
        <div class="stc-trip-card"><div class="stc-trip-row"><div><strong>Oct 18–25 · Tokyo & nearby</strong><small>Today · All Days · Reservations</small></div><span>→</span></div><div class="stc-route">${esc(day.route)}</div></div>
      </section>

      <section class="stc-section">
        <div class="stc-section-head"><div><small>今日の日本語</small><h3>Japanese for Today</h3></div><span>3 useful phrases</span></div>
        <div class="stc-phrases">${day.phrases.map(phrase=>`<article class="stc-phrase"><b>${esc(phrase[0])}</b><em>${esc(phrase[1])}</em><span>${esc(phrase[2])}</span></article>`).join('')}</div>
      </section>

      <section class="stc-section"><div class="stc-plan-card"><b>Plan B · no-drama fallback</b><p>${esc(day.planB)}</p></div></section>
    `;
  }

  function buildOverlay(){
    if(document.getElementById('sakura-trip-companion'))return;
    ensureStyle();
    const overlay=document.createElement('section');
    overlay.id='sakura-trip-companion';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<div class="stc-shell">
      <header class="stc-topbar"><button type="button" class="stc-back" data-stc-close aria-label="Back">‹</button><div class="stc-title"><small>October 2026</small><strong>Trip Companion</strong></div><button type="button" class="stc-close" data-stc-close aria-label="Close">×</button></header>
      <nav class="stc-days" aria-label="Preview itinerary days">${DAYS.map((day,index)=>`<button type="button" class="stc-day" data-stc-day="${index}">Day ${day.day}<br><span>${day.date.slice(5).replace('-','/')}</span></button>`).join('')}</nav>
      <main data-stc-content></main>
    </div><div class="stc-toast" role="status" aria-live="polite"></div>`;
    document.body.appendChild(overlay);
  }

  function showToast(message){
    const toast=document.querySelector('#sakura-trip-companion .stc-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('is-show');
    clearTimeout(showToast.timer);
    showToast.timer=setTimeout(()=>toast.classList.remove('is-show'),2200);
  }

  function close(){
    const root=document.getElementById('sakura-trip-companion');
    if(!root)return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';
    document.body.style.overflow='';
  }

  function open(dayIndex){
    buildOverlay();
    const live=liveDayIndex();
    let target=Number.isInteger(dayIndex)?dayIndex:live;
    if(target<0||target>=DAYS.length){
      const saved=Number(localStorage.getItem(STORAGE_KEY));
      target=Number.isInteger(saved)&&saved>=0&&saved<DAYS.length?saved:3;
    }
    render(target);
    const root=document.getElementById('sakura-trip-companion');
    root.classList.add('is-open');
    root.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
    root.querySelector('.stc-shell').scrollTop=0;
  }

  function ensureLauncher(){
    ensureStyle();
    const view=document.getElementById('travel-view');
    const grid=view?.querySelector('.travel-category-grid');
    if(!view||!grid)return;
    const live=liveDayIndex();
    const shouldShow=live>=0||isBeforeTrip();
    let button=view.querySelector('.sakura-trip-companion-launch');
    if(!shouldShow){ button?.remove(); return; }
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='travel-feature-card sakura-trip-companion-launch';
      const sakutalk=view.querySelector('.sakura-travel-interpreter-card');
      if(sakutalk)sakutalk.insertAdjacentElement('beforebegin',button);
      else grid.insertAdjacentElement('beforebegin',button);
    }
    if(live>=0){
      const day=DAYS[live];
      button.innerHTML=`<span aria-hidden="true">${esc(day.emoji)}</span><div><h2>Today in Japan</h2><p>Day ${day.day} · ${esc(day.title)}</p></div><b aria-hidden="true">→</b>`;
    }else{
      button.innerHTML='<span aria-hidden="true">🌸</span><div><h2>Preview October Trip Companion</h2><p>See Day 1–8 before the trip starts.</p></div><b aria-hidden="true">→</b>';
    }
  }

  document.addEventListener('click',event=>{
    const launch=event.target.closest?.('.sakura-trip-companion-launch');
    if(launch){event.preventDefault();open();return;}
    const dayButton=event.target.closest?.('[data-stc-day]');
    if(dayButton){render(Number(dayButton.dataset.stcDay));document.querySelector('#sakura-trip-companion .stc-shell')?.scrollTo({top:0,behavior:'smooth'});return;}
    if(event.target.closest?.('[data-stc-close]')){close();return;}
    if(event.target.closest?.('[data-stc-sakutalk]')){
      close();
      setTimeout(()=>{
        const travelLauncher=document.querySelector('#travel-view .sakura-travel-interpreter-card');
        if(travelLauncher)travelLauncher.click();
        else window.SakuraPracticeGridPolish?.openSakuTalk?.();
      },80);
      return;
    }
    const preview=event.target.closest?.('[data-preview-only]');
    if(preview)showToast(`${preview.dataset.previewLabel} is shown for layout preview. We’ll wire it after you approve this screen.`);
  },true);

  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});

  function init(){buildOverlay();ensureLauncher();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.SakuraTripCompanion=Object.freeze({version:1,open,close,ensureLauncher,days:DAYS.map(item=>({...item}))});
}());
