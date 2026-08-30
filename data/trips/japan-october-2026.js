/* Sakura October 2026 trip seed v1 — curated from the live planning sheet. */
(function(){
  'use strict';
  if(window.SAKURA_TRIP_SEED_OCTOBER_2026)return;
  window.SAKURA_TRIP_SEED_OCTOBER_2026=Object.freeze({
    id:'japan-october-2026',
    name:'Japan · October 2026',
    destination:'Japan',
    startDate:'2026-10-18',
    endDate:'2026-10-25',
    timezone:'Asia/Tokyo',
    hotel:'Hananosato Takadanobaba',
    source:'seed',
    days:[
      {
        date:'2026-10-18',title:'Arrival in Tokyo',emoji:'🛬',
        route:'Narita Airport → N’EX → Shinjuku → JR Yamanote Line → Takadanobaba',
        reminder:'Withdraw the planned trip cash and load about ¥5,000 per person on Suica on arrival.',
        planB:'If immigration runs late, skip the target train and take the next comfortable N’EX.',
        items:[
          {time:'18:00',title:'Land at Narita Airport',place:'Narita Airport',type:'transport',priority:'high',note:'Immigration + baggage about 45–60 minutes.'},
          {time:'19:00',title:'Cash + Suica',place:'Narita Airport',type:'task',priority:'high',note:'Planned cash withdrawal ¥88,000 total; initial Suica load ~¥5,000 each.'},
          {time:'19:49',title:'N’EX target to Shinjuku',place:'Narita Airport Station',japaneseName:'成田空港駅',type:'transport',priority:'critical',reservation:true,note:'Take the next comfortable N’EX if this target is too tight.'},
          {time:'21:18',title:'Arrive Shinjuku + transfer',place:'Shinjuku Station',japaneseName:'新宿駅',type:'transport',priority:'high',note:'Do not exit; follow JR Yamanote Line toward Ikebukuro / Ueno.'},
          {time:'21:30',title:'Hotel check-in',place:'Hananosato Takadanobaba',type:'hotel',priority:'high',note:'Apartment-style stay; keep booking details accessible.'},
          {time:'22:00',title:'Light dinner + groceries',place:'Takadanobaba',type:'food',priority:'normal'}
        ],
        phrases:[
          ['新宿まで、指定席でお願いします。','Shinjuku made, shiteiseki de onegaishimasu.','To Shinjuku, reserved seat please.'],
          ['この電車は新宿に行きますか？','Kono densha wa Shinjuku ni ikimasu ka?','Does this train go to Shinjuku?'],
          ['予約しています。','Yoyaku shiteimasu.','I have a reservation.']
        ]
      },
      {
        date:'2026-10-19',title:'Kamakura + Enoshima',emoji:'🌊',
        route:'Takadanobaba → Kamakura → Hase → Gokurakuji → Koshigoe → Enoshima',
        reminder:'Buy the Enoden Noriorikun 1-day pass at Kamakura Station before hopping along the coast.',
        planB:'Use the Enoshima Escar if your legs are tired; the day is intentionally walking-heavy.',
        items:[
          {time:'09:00',title:'Kamakura Renbai Farmers’ Market',place:'Kamakura',type:'sightseeing',priority:'normal'},
          {time:'09:20',title:'Buy Enoden Noriorikun',place:'Enoden Kamakura Station',japaneseName:'江ノ電 鎌倉駅',type:'transport',priority:'high',note:'¥800/adult.'},
          {time:'09:40',title:'Hasedera',place:'Hasedera',japaneseName:'長谷寺',type:'sightseeing',priority:'high'},
          {time:'10:35',title:'Great Buddha',place:'Kotoku-in',japaneseName:'高徳院 鎌倉大仏',type:'sightseeing',priority:'high'},
          {time:'11:45',title:'Gokurakuji + station area',place:'Gokurakuji',japaneseName:'極楽寺',type:'sightseeing',priority:'normal'},
          {time:'12:40',title:'Shirasu lunch',place:'Koshigoe',japaneseName:'腰越',type:'food',priority:'high'},
          {time:'14:20',title:'Enoshima Shrine area',place:'Enoshima',japaneseName:'江の島',type:'sightseeing',priority:'high'},
          {time:'15:25',title:'Enoshima Iwaya',place:'Enoshima Iwaya',japaneseName:'江の島岩屋',type:'sightseeing',priority:'critical',note:'Protected entry target before the 17:00 closing.'},
          {time:'16:10',title:'Chigogafuchi sunset',place:'Chigogafuchi',japaneseName:'稚児ヶ淵',type:'sightseeing',priority:'high'}
        ],
        phrases:[
          ['江ノ電の一日乗車券を二枚お願いします。','Enoden no ichinichi joshaken o nimai onegaishimasu.','Two Enoden one-day passes, please.'],
          ['ここから江の島まで歩けますか？','Koko kara Enoshima made arukemasu ka?','Can we walk to Enoshima from here?'],
          ['生しらすはありますか？','Nama shirasu wa arimasu ka?','Do you have raw shirasu today?']
        ]
      },
      {
        date:'2026-10-20',title:'Shinjuku + Nakano + Shibuya',emoji:'💇',
        route:'Takadanobaba → Shinjuku → Nakano → Shibuya → Shinjuku',
        reminder:'Lutia can run slightly over. Protect the appointment first and trim 100-yen shopping if needed.',
        planB:'If Lutia finishes late, shorten the 100-yen-store block rather than rushing the rest of the day.',
        items:[
          {time:'10:45',title:'Arrive at Lutia',place:'Lutia Shinjuku',type:'appointment',priority:'critical',leaveBy:'10:05',note:'Aim to arrive 10–15 minutes early.'},
          {time:'11:00',title:'Hair appointment',place:'Lutia Shinjuku',type:'appointment',priority:'critical',reservation:true,note:'Cut + straightening + treatment.'},
          {time:'13:30',title:'Cafe Aaliya',place:'Cafe Aaliya',type:'food',priority:'normal'},
          {time:'14:30',title:'100-yen store shopping',place:'Shinjuku',type:'shopping',priority:'normal'},
          {time:'15:45',title:'Nakano Broadway',place:'Nakano Broadway',japaneseName:'中野ブロードウェイ',type:'shopping',priority:'high',note:'BSD / JJK / Dr. Stone collector hunt.'},
          {time:'17:35',title:'Shibuya shopping',place:'Shibuya 109',type:'shopping',priority:'high'},
          {time:'20:10',title:'MEGA Don Quijote',place:'MEGA Don Quijote Shibuya Honten',type:'shopping',priority:'high'},
          {time:'22:20',title:'Omoide Yokocho',place:'Omoide Yokocho',japaneseName:'思い出横丁',type:'food',priority:'normal'}
        ],
        phrases:[
          ['11時に予約しています。','Juichi-ji ni yoyaku shiteimasu.','I have an 11:00 reservation.'],
          ['もう少し短くできますか？','Mo sukoshi mijikaku dekimasu ka?','Can you make it a little shorter?'],
          ['これは中古ですか？','Kore wa chuko desu ka?','Is this second-hand?']
        ]
      },
      {
        date:'2026-10-21',title:'Asakusa + MAPPA',emoji:'🏮',
        route:'Takadanobaba → Asakusa → Suehirocho → Yurakucho / Ginza → Takadanobaba',
        reminder:'Nothing should eat into the 15:25–16:00 MAPPA arrival buffer.',
        planB:'If lunch or Asakusa shopping slips, cut flex time first. Do not sacrifice the MAPPA buffer.',
        items:[
          {time:'09:30',title:'Senso-ji',place:'Senso-ji',japaneseName:'浅草寺',type:'sightseeing',priority:'normal'},
          {time:'10:00',title:'Custom shichimi',place:'Yagenbori Shichimi',japaneseName:'やげん堀',type:'shopping',priority:'high'},
          {time:'10:30',title:'Japanese knife shopping',place:'Musashi / Seisuke Knife',type:'shopping',priority:'high',note:'Compare steel, maintenance, handle and sharpening.'},
          {time:'11:30',title:'Komagata Maekawa',place:'Komagata Maekawa Asakusa',japaneseName:'駒形前川',type:'food',priority:'critical',reservation:true,note:'Reserve for 2 if possible to protect rakugo timing.'},
          {time:'12:30',title:'Rakugo',place:'Asakusa Engei Hall',japaneseName:'浅草演芸ホール',type:'event',priority:'high',note:'Same-day ticket; planned stay about 45–50 min.'},
          {time:'14:00',title:'YushaKobo',place:'YushaKobo',japaneseName:'遊舎工房',type:'shopping',priority:'high'},
          {time:'15:25',title:'MAPPA arrival buffer',place:'YURAKUCHO MUSEUM',type:'reminder',priority:'critical',reminder:'Bathroom, water, tickets ready; schedule nothing else in this buffer.'},
          {time:'16:00',title:'MAPPA EXPO 15th Anniversary',place:'YURAKUCHO MUSEUM',type:'event',priority:'critical',reservation:true,note:'JJK first; leave time for merchandise.'},
          {time:'18:10',title:'CHA・GINZA',place:'CHA・GINZA',japaneseName:'茶・銀座',type:'shopping',priority:'high'},
          {time:'18:35',title:'Bar Lupin',place:'Bar Lupin Ginza',japaneseName:'ルパン',type:'experience',priority:'high'},
          {time:'21:35',title:'Karaoke ONE',place:'Karaoke ONE Takadanobaba',type:'experience',priority:'normal'}
        ],
        phrases:[
          ['これは在庫がありますか？','Kore wa zaiko ga arimasu ka?','Is this in stock?'],
          ['お手入れは難しいですか？','Oteire wa muzukashii desu ka?','Is this difficult to maintain?'],
          ['写真を撮ってもいいですか？','Shashin o totte mo ii desu ka?','May I take a photo?']
        ]
      },
      {
        date:'2026-10-22',title:'Yokohama + BSD',emoji:'🌃',
        route:'Takadanobaba → Ishikawacho / Yamate → Chinatown → Waterfront → Yokohama VIVRE → Minato Mirai → Noge',
        reminder:'Keep the dated museum ticket stub accessible for the BSD benefit at Animate Yokohama VIVRE.',
        planB:'Yamate is hilly. Use a local bus or short taxi instead of forcing the full walk if energy drops.',
        items:[
          {time:'09:30',title:'Yamate Italian Garden',place:'Yamate Italian Garden',type:'sightseeing',priority:'normal'},
          {time:'10:35',title:'France-yama + Harbor View Park',place:'Harbor View Park',type:'sightseeing',priority:'normal'},
          {time:'11:05',title:'Kanagawa Museum × BSD',place:'Kanagawa Museum of Modern Literature',japaneseName:'神奈川近代文学館',type:'event',priority:'critical',note:'Complete the worksheet and keep the dated ticket stub.'},
          {time:'12:20',title:'Motomachi',place:'Motomachi',type:'shopping',priority:'normal'},
          {time:'13:50',title:'Yokohama Chinatown',place:'Yokohama Chinatown',japaneseName:'横浜中華街',type:'food',priority:'normal'},
          {time:'14:35',title:'Yamashita Park',place:'Yamashita Park',japaneseName:'山下公園',type:'sightseeing',priority:'normal'},
          {time:'15:05',title:'Osanbashi Pier',place:'Osanbashi',japaneseName:'大さん橋',type:'sightseeing',priority:'high'},
          {time:'16:25',title:'Red Brick Warehouse',place:'Yokohama Red Brick Warehouse',japaneseName:'横浜赤レンガ倉庫',type:'shopping',priority:'normal'},
          {time:'17:35',title:'Animate Yokohama VIVRE',place:'Animate Yokohama VIVRE',type:'shopping',priority:'high',reminder:'Bring the dated literature-museum ticket stub for the BSD collaboration benefit.'},
          {time:'18:50',title:'Minato Mirai night views',place:'Kishamichi / Minato Mirai',japaneseName:'みなとみらい',type:'sightseeing',priority:'critical'},
          {time:'19:45',title:'Noge dinner',place:'Noge',japaneseName:'野毛',type:'food',priority:'high'}
        ],
        phrases:[
          ['このチケットで特典はもらえますか？','Kono chiketto de tokuten wa moraemasu ka?','Can I receive the bonus with this ticket?'],
          ['この場所はどこですか？','Kono basho wa doko desu ka?','Where is this place?'],
          ['夜景がきれいに見える場所はどこですか？','Yakei ga kirei ni mieru basho wa doko desu ka?','Where is a good place to see the night view?']
        ]
      },
      {
        date:'2026-10-23',title:'Gotokuji + SPY×FAMILY',emoji:'🎭',
        route:'Takadanobaba → Gotokuji → Harajuku / Omotesando → Ikebukuro → Takadanobaba',
        reminder:'Have the physical tickets ready and leave Harajuku / Omotesando by 15:30 to protect the theater buffer.',
        planB:'If shopping runs long, cut Omotesando browsing first. The 17:45 performance is fixed.',
        items:[
          {time:'09:45',title:'Gotokuji',place:'Gotokuji Temple',japaneseName:'豪徳寺',type:'sightseeing',priority:'high'},
          {time:'12:00',title:'Harajuku lunch',place:'Harajuku / Omotesando',type:'food',priority:'normal'},
          {time:'13:00',title:'Harajuku shopping',place:'Takeshita Street',japaneseName:'竹下通り',type:'shopping',priority:'high'},
          {time:'14:30',title:'Omotesando',place:'Omotesando',japaneseName:'表参道',type:'shopping',priority:'normal'},
          {time:'15:30',title:'Leave for Ikebukuro',place:'Harajuku Station',type:'transport',priority:'critical',reminder:'Do not let shopping eat into the theater buffer.'},
          {time:'16:05',title:'Ikebukuro buffer',place:'Ikebukuro',japaneseName:'池袋',type:'reminder',priority:'high'},
          {time:'17:05',title:'Walk to theater + entry',place:'Tokyo Tatemono Brillia HALL',type:'event',priority:'critical'},
          {time:'17:45',title:'SPY×FAMILY 2 Musical',place:'Tokyo Tatemono Brillia HALL',type:'event',priority:'critical',reservation:true,note:'Physical tickets paid; pickup/shipping logistics pending.'},
          {time:'20:30',title:'Dinner in Ikebukuro',place:'Ikebukuro',type:'food',priority:'normal'}
        ],
        phrases:[
          ['会場はどちらですか？','Kaijo wa dochira desu ka?','Which way is the venue?'],
          ['グッズ売り場はどこですか？','Guzzu uriba wa doko desu ka?','Where is the merchandise area?'],
          ['開演は何時ですか？','Kaien wa nanji desu ka?','What time does the performance start?']
        ]
      },
      {
        date:'2026-10-24',title:'Sayama + Koganei + Kichijoji',emoji:'🍵',
        route:'Takadanobaba → Sayamashi → 狭山台南 → Miyanoen → Hana-Koganei → Koganei Park → Kichijoji',
        reminder:'Koganei bus warning: DO NOT TAKE 武17. Use 武12 / 武13 / 武14 / 武15 / 武21 for 小金井公園西口.',
        planB:'Missed 08:49? Take the 09:14 backup. If Koganei transit gets confusing or you are >15–20 min late, taxi to Musashi-Koganei.',
        items:[
          {time:'07:41',title:'Seibu train to Sayamashi',place:'Takadanobaba Station',type:'transport',priority:'high',note:'Current Saturday target; arrive Sayamashi about 08:32.'},
          {time:'08:49',title:'Seibu Bus 狭山31',place:'狭山市駅東口 stop #2',japaneseName:'狭山市駅東口',type:'transport',priority:'critical',note:'Bound for 狭山台団地; get off 狭山台南. Backup 09:14.'},
          {time:'10:00',title:'Miyanoen tea-picking',place:'Miyanoen',japaneseName:'宮野園',address:'25-2 Kitairiso, Sayama, Saitama',type:'experience',priority:'critical',reservation:true,note:'2 adults; request chamusume outfits and confirm fee/availability.'},
          {time:'12:03',title:'Bus back to Sayamashi',place:'狭山台南',japaneseName:'狭山台南',type:'transport',priority:'high'},
          {time:'13:20',title:'Quick museum lunch',place:'Edo-Tokyo Open Air Architectural Museum',type:'food',priority:'normal'},
          {time:'13:45',title:'Edo-Tokyo Open Air Architectural Museum',place:'Edo-Tokyo Open Air Architectural Museum',japaneseName:'江戸東京たてもの園',type:'sightseeing',priority:'critical',note:'JJK / Zenin-house reference priority. Last admission 16:00; closes 16:30.'},
          {time:'17:15',title:'Kichijoji Sunroad',place:'Kichijoji',japaneseName:'吉祥寺',type:'shopping',priority:'normal'},
          {time:'18:30',title:'Harmonica Yokocho dinner',place:'Harmonica Yokocho',japaneseName:'ハモニカ横丁',type:'food',priority:'high'}
        ],
        phrases:[
          ['このバスは狭山台南に行きますか？','Kono basu wa Sayamadai-minami ni ikimasu ka?','Does this bus go to Sayamadai-minami?'],
          ['このバスは小金井公園西口に止まりますか？','Kono basu wa Koganei-koen Nishiguchi ni tomarimasu ka?','Does this bus stop at Koganei Park West Entrance?'],
          ['10時に予約しています。','Ju-ji ni yoyaku shiteimasu.','I have a reservation at 10:00.']
        ]
      },
      {
        date:'2026-10-25',title:'Departure',emoji:'✈️',
        route:'Takadanobaba → Shinjuku → N’EX 7 → Narita Airport → 13:00 flight',
        reminder:'Before leaving the room: passport, wallet / Suica, chargers, adapters, tickets and final luggage sweep.',
        planB:'The departure plan intentionally arrives early. Protect the 07:27 N’EX rather than adding a last-minute stop.',
        items:[
          {time:'06:00',title:'Wake + final prep',place:'Hananosato Takadanobaba',type:'task',priority:'high'},
          {time:'06:45',title:'Leave for Shinjuku',place:'Takadanobaba Station',type:'transport',priority:'critical'},
          {time:'07:00',title:'N’EX platform buffer',place:'Shinjuku Station',japaneseName:'新宿駅',type:'transport',priority:'critical'},
          {time:'07:27',title:'N’EX 7 to Narita',place:'Shinjuku Station',type:'transport',priority:'critical',reservation:true,note:'Reserved-seat train. Scheduled Narita arrival around 09:00.'},
          {time:'09:00',title:'Narita Airport',place:'Narita Airport',japaneseName:'成田空港',type:'transport',priority:'high'},
          {time:'12:20',title:'Boarding',place:'Narita Airport',type:'flight',priority:'critical'},
          {time:'13:00',title:'Flight departure',place:'Narita Airport',type:'flight',priority:'critical'}
        ],
        phrases:[
          ['成田空港までお願いします。','Narita Kuko made onegaishimasu.','To Narita Airport, please.'],
          ['この電車は成田空港に行きますか？','Kono densha wa Narita Kuko ni ikimasu ka?','Does this train go to Narita Airport?'],
          ['チェックインカウンターはどこですか？','Chekku-in kaunta wa doko desu ka?','Where is the check-in counter?']
        ]
      }
    ]
  });
}());
