/* Sakura Smart Itinerary File Import v1 — XLSX-first, local workbook parsing. */
(function initializeSakuraTripFileImport(){
  'use strict';
  if(window.SakuraTripFileImport?.version>=1)return;

  const MAX_AI_CHARS=17000;
  const DAY_BLOCK_CHARS=1350;
  const RESERVATION_BLOCK_CHARS=3600;
  const BOOKING_BLOCK_CHARS=1100;
  const encoder=new TextDecoder('utf-8');
  let pending=null;
  let lastDecorateQueued=false;

  const S=()=>window.SakuraTripStore;
  const root=()=>document.getElementById('sakura-trip-companion');
  const main=()=>root()?.querySelector('[data-main]');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const compact=value=>clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
  const uniq=list=>[...new Set((list||[]).map(clean).filter(Boolean))];

  function css(){
    if(document.getElementById('sakura-trip-file-import-style'))return;
    const style=document.createElement('style');
    style.id='sakura-trip-file-import-style';
    style.textContent=`
      #sakura-trip-companion .stfi-choice{display:grid;gap:9px}
      #sakura-trip-companion .stfi-choice button{width:100%;min-height:64px;padding:12px;border:1px solid var(--color-border);border-radius:15px;background:var(--color-background);color:inherit;text-align:left;display:grid;grid-template-columns:34px 1fr;gap:9px;align-items:center}
      #sakura-trip-companion .stfi-choice button i{font-style:normal;font-size:23px;text-align:center}
      #sakura-trip-companion .stfi-choice button strong{display:block;font-size:13px}
      #sakura-trip-companion .stfi-choice button small{display:block;margin-top:3px;color:var(--color-text-muted);font-size:10px;line-height:1.35}
      #sakura-trip-companion .stfi-progress{display:grid;gap:8px;margin-top:10px}
      #sakura-trip-companion .stfi-progress div{padding:10px 11px;border-radius:13px;background:var(--color-background);border:1px solid var(--color-border);font-size:10px;line-height:1.4;color:var(--color-text-muted)}
      #sakura-trip-companion .stfi-progress div.on{background:var(--color-primary-soft);border-color:color-mix(in srgb,var(--color-primary) 28%,var(--color-border));color:var(--color-primary-dark);font-weight:850}
      #sakura-trip-companion .stfi-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
      #sakura-trip-companion .stfi-stat{padding:10px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-background)}
      #sakura-trip-companion .stfi-stat b{display:block;font-size:18px;color:var(--color-primary-dark)}
      #sakura-trip-companion .stfi-stat span{display:block;margin-top:2px;color:var(--color-text-muted);font-size:9px;line-height:1.25}
      #sakura-trip-companion .stfi-review{margin-top:10px;padding:10px 11px;border-radius:13px;background:#fff6d9;color:#705914;font-size:10px;line-height:1.45}
      #sakura-trip-companion .stfi-privacy{margin-top:9px;padding:10px 11px;border-radius:13px;background:var(--color-primary-soft);color:var(--color-text-muted);font-size:10px;line-height:1.45}
      #sakura-trip-companion .stfi-file{display:none}
      @media(max-width:360px){#sakura-trip-companion .stfi-summary{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function setHeader(title,kicker='My Trips'){
    const r=root();if(!r)return;
    const small=r.querySelector('.stc-title small'),strong=r.querySelector('.stc-title strong');
    if(small)small.textContent=kicker;
    if(strong)strong.textContent=title;
    const days=r.querySelector('[data-days]');if(days)days.hidden=true;
  }

  function openNativePaste(){
    const r=root();if(!r)return;
    const temp=document.createElement('button');
    temp.type='button';temp.hidden=true;temp.dataset.import='1';
    r.appendChild(temp);temp.click();temp.remove();
  }

  function tripsView(){
    root()?.querySelector('[data-trips]')?.click();
  }

  function addMenu(){
    css();pending=null;setHeader('Add Trip');
    const m=main();if(!m)return;
    m.innerHTML=`
      <section class="stc-card">
        <div class="stc-kicker">Add trip</div>
        <h3>How do you want to add it?</h3>
        <div class="stfi-choice">
          <button type="button" data-stfi-paste><i>📋</i><span><strong>Paste Itinerary</strong><small>Paste a Sakura Trip Pack or ordinary itinerary text.</small></span></button>
          <button type="button" data-stfi-choose><i>📁</i><span><strong>Import Itinerary File</strong><small>Choose an Excel itinerary from Files, iCloud Drive or Downloads.</small></span></button>
        </div>
        <input class="stfi-file" data-stfi-file type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
        <div class="stfi-privacy"><b>Private by default.</b> Sakura reads the spreadsheet on this device. Only selected itinerary rows are sent to Sakura's Gemini parser when semantic interpretation is needed; the Excel file itself is not uploaded or stored remotely.</div>
        <div class="stc-actions"><button type="button" data-stfi-back>Back</button></div>
      </section>`;
  }

  function progressView(file){
    setHeader('Import Itinerary File');
    const m=main();if(!m)return;
    m.innerHTML=`
      <section class="stc-card">
        <div class="stc-kicker">Smart file import</div>
        <h3>Reading your itinerary…</h3>
        <div class="stc-muted">${esc(file.name)} · ${Math.max(1,Math.round(file.size/1024))} KB</div>
        <div class="stfi-progress">
          <div class="on" data-stfi-step="read">Reading workbook locally…</div>
          <div data-stfi-step="sheets">Looking for itinerary days, reservations and travel instructions…</div>
          <div data-stfi-step="ai">Understanding the useful parts with Gemini…</div>
        </div>
        <div class="stc-status busy" data-stfi-status>Opening Excel workbook…</div>
      </section>`;
  }

  function step(name,text){
    const r=root();if(!r)return;
    const el=r.querySelector(`[data-stfi-step="${name}"]`);
    if(el)el.classList.add('on');
    const status=r.querySelector('[data-stfi-status]');
    if(status&&text)status.textContent=text;
  }

  function errorView(error){
    setHeader('Import Itinerary File');
    const m=main();if(!m)return;
    m.innerHTML=`
      <section class="stc-card">
        <div class="stc-kicker">Could not import</div>
        <h3>This file needs another look</h3>
        <div class="stc-status bad">${esc(error?.message||'Sakura could not read this itinerary file.')}</div>
        <div class="stc-actions"><button type="button" class="primary" data-stfi-retry>Choose another file</button><button type="button" data-stfi-menu>Back</button></div>
      </section>`;
  }

  function summaryView(result){
    pending=result;setHeader('Review File Import');
    const {trip,summary,workbook}=result,m=main();if(!m)return;
    const dateText=trip.startDate&&trip.endDate?`${trip.startDate} → ${trip.endDate}`:'Dates need review';
    const review=summary.reviewNotes.length
      ? summary.reviewNotes.map(x=>`• ${esc(x)}`).join('<br>')
      : '• Semantic details were interpreted by Gemini. Verify fixed times, booking statuses and transit restrictions in the next review screen.';
    m.innerHTML=`
      <section class="stc-card">
        <div class="stc-kicker">Sakura understood this as</div>
        <h2>${esc(trip.name||'Imported Trip')}</h2>
        <div class="stc-muted">${esc(trip.destination||'Trip')} · ${esc(dateText)}</div>
        <div class="stfi-summary">
          <div class="stfi-stat"><b>${summary.activeDays}</b><span>itinerary days</span></div>
          <div class="stfi-stat"><b>${summary.reservations}</b><span>reservation / booking rows</span></div>
          <div class="stfi-stat"><b>${summary.reconfirm}</b><span>items to reserve / recheck</span></div>
          <div class="stfi-stat"><b>${summary.transitWarnings}</b><span>transit instructions / warnings</span></div>
          <div class="stfi-stat"><b>${summary.fixedEvents}</b><span>fixed-time booking anchors</span></div>
          <div class="stfi-stat"><b>${summary.weatherDependent}</b><span>weather-sensitive notes</span></div>
        </div>
        <div class="stfi-review"><b>Needs Review</b><br>${review}</div>
        <div class="stc-actions"><button type="button" data-stfi-menu>Back</button><button type="button" class="primary" data-stfi-review>Review Import</button></div>
      </section>
      <section class="stc-card">
        <div class="stc-kicker">Workbook detected</div>
        <h3>${workbook.sheets.length} sheets</h3>
        <div class="stc-muted">${workbook.sheets.map(s=>`${esc(s.name)} · ${esc(roleLabel(s.role))}`).join('<br>')}</div>
      </section>`;
  }

  function roleLabel(role){
    return ({
      day_itinerary:'itinerary day',reservations:'reservations',booking_tasks:'booking tasks',
      budget:'budget (not stops)',packing:'packing (not stops)',shopping:'shopping / notes',
      archive:'archive (ignored as active day)',notes:'notes',unknown:'needs review'
    })[role]||role;
  }

  function decorate(){
    const r=root();if(!r)return;
    css();
    r.querySelectorAll('button[data-import]').forEach(button=>{
      if(!/paste itinerary/i.test(clean(button.textContent)))return;
      button.removeAttribute('data-import');
      button.dataset.stfiAdd='1';
      button.textContent='＋ Add Trip';
    });
    const launcher=document.querySelector('#travel-view .sakura-trip-companion-launch p');
    if(launcher&&/paste an itinerary/i.test(launcher.textContent||'')){
      launcher.textContent='Add or import an itinerary to build your Trip Companion.';
    }
  }
  function queueDecorate(){
    if(lastDecorateQueued)return;lastDecorateQueued=true;
    requestAnimationFrame(()=>{lastDecorateQueued=false;decorate()});
  }

  function u16(view,offset){return view.getUint16(offset,true)}
  function u32(view,offset){return view.getUint32(offset,true)}
  function xml(bytes){return new DOMParser().parseFromString(encoder.decode(bytes),'application/xml')}
  function xmlError(doc){return doc.querySelector('parsererror')?.textContent||''}
  function joinPath(base,target){
    if(target.startsWith('/'))return target.replace(/^\//,'');
    const parts=base.split('/');parts.pop();
    for(const piece of target.split('/')){
      if(!piece||piece==='.')continue;
      if(piece==='..')parts.pop();else parts.push(piece);
    }
    return parts.join('/');
  }

  async function unzip(arrayBuffer){
    const bytes=new Uint8Array(arrayBuffer),view=new DataView(arrayBuffer);
    let eocd=-1,start=Math.max(0,bytes.length-65557);
    for(let i=bytes.length-22;i>=start;i--){
      if(u32(view,i)===0x06054b50){eocd=i;break}
    }
    if(eocd<0)throw new Error('This does not look like a valid .xlsx workbook.');
    const count=u16(view,eocd+10),directoryOffset=u32(view,eocd+16),files=new Map();
    let p=directoryOffset;
    for(let n=0;n<count;n++){
      if(u32(view,p)!==0x02014b50)throw new Error('The Excel file directory is damaged.');
      const method=u16(view,p+10),compressedSize=u32(view,p+20),nameLen=u16(view,p+28),extraLen=u16(view,p+30),commentLen=u16(view,p+32),localOffset=u32(view,p+42);
      const name=encoder.decode(bytes.slice(p+46,p+46+nameLen));
      if(u32(view,localOffset)!==0x04034b50)throw new Error('The Excel file contains an invalid ZIP entry.');
      const localNameLen=u16(view,localOffset+26),localExtraLen=u16(view,localOffset+28),dataStart=localOffset+30+localNameLen+localExtraLen;
      files.set(name,{method,data:bytes.slice(dataStart,dataStart+compressedSize)});
      p+=46+nameLen+extraLen+commentLen;
    }
    async function read(name){
      const entry=files.get(name);if(!entry)return null;
      if(entry.method===0)return entry.data;
      if(entry.method!==8)throw new Error(`Unsupported Excel compression method (${entry.method}).`);
      if(typeof DecompressionStream!=='function')throw new Error('This browser cannot unpack Excel files yet. Update Safari/iOS and try again.');
      let ds;
      try{ds=new DecompressionStream('deflate-raw')}catch{throw new Error('This browser cannot unpack Excel files yet. Update Safari/iOS and try again.')}
      const stream=new Blob([entry.data]).stream().pipeThrough(ds);
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    return {read,has:name=>files.has(name),names:[...files.keys()]};
  }

  function textOf(node){return clean([...node.getElementsByTagName('t')].map(x=>x.textContent||'').join(''))}
  function columnIndex(ref){
    const letters=String(ref||'').match(/^[A-Z]+/i)?.[0]?.toUpperCase()||'A';
    let n=0;for(const c of letters)n=n*26+(c.charCodeAt(0)-64);return n-1;
  }

  async function parseXlsx(file){
    if(!/\.xlsx$/i.test(file.name||''))throw new Error('File Import v1 currently supports .xlsx Excel itineraries. Export Google Sheets as Microsoft Excel (.xlsx) and try again.');
    const zip=await unzip(await file.arrayBuffer());
    const workbookBytes=await zip.read('xl/workbook.xml');
    if(!workbookBytes)throw new Error('Sakura could not find the Excel workbook structure.');
    const workbookDoc=xml(workbookBytes);if(xmlError(workbookDoc))throw new Error('The Excel workbook structure could not be read.');
    const relBytes=await zip.read('xl/_rels/workbook.xml.rels');
    if(!relBytes)throw new Error('Sakura could not resolve the workbook sheets.');
    const relDoc=xml(relBytes),rels=new Map();
    [...relDoc.getElementsByTagName('Relationship')].forEach(r=>rels.set(r.getAttribute('Id'),joinPath('xl/workbook.xml',r.getAttribute('Target')||'')));

    let shared=[];
    if(zip.has('xl/sharedStrings.xml')){
      const sharedDoc=xml(await zip.read('xl/sharedStrings.xml'));
      shared=[...sharedDoc.getElementsByTagName('si')].map(si=>textOf(si));
    }

    const workbookSheets=[...workbookDoc.getElementsByTagName('sheet')].map((s,index)=>({
      name:s.getAttribute('name')||`Sheet ${index+1}`,
      state:s.getAttribute('state')||'visible',
      relId:s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||'',
      index
    }));
    const sheets=[];
    for(const meta of workbookSheets){
      const path=rels.get(meta.relId);if(!path)continue;
      const data=await zip.read(path);if(!data)continue;
      const doc=xml(data);if(xmlError(doc))continue;
      const rows=[];
      for(const row of [...doc.getElementsByTagName('row')]){
        const cells=[];
        for(const c of [...row.getElementsByTagName('c')]){
          const type=c.getAttribute('t')||'',ref=c.getAttribute('r')||'';
          let value='';
          if(type==='inlineStr')value=textOf(c);
          else{
            const v=c.getElementsByTagName('v')[0]?.textContent??'';
            if(type==='s')value=shared[Number(v)]??v;
            else if(type==='b')value=v==='1'?'TRUE':'FALSE';
            else value=clean(v);
          }
          value=clean(value);if(value)cells.push({column:columnIndex(ref),value});
        }
        if(cells.length)rows.push({row:Number(row.getAttribute('r'))||rows.length+1,cells,text:cells.sort((a,b)=>a.column-b.column).map(c=>c.value).join(' | ')});
      }
      sheets.push({...meta,role:classifySheet(meta.name,rows),rows});
    }
    if(!sheets.length)throw new Error('The workbook does not contain readable worksheets.');
    return {fileName:file.name,fileSize:file.size,sheets};
  }

  function classifySheet(name,rows=[]){
    const n=compact(name),sample=compact(rows.slice(0,8).map(r=>r.text).join(' '));
    if(/\barchive\b|\bold\b/.test(n))return'archive';
    if(/\bday\s*\d+\b/.test(n)&&monthDayFromText(name))return'day_itinerary';
    if(/\breservation/.test(n)||/\breservation booking\b/.test(sample))return'reservations';
    if(/\bto book\b|\bbooking task/.test(n))return'booking_tasks';
    if(/\bbudget\b|\bcost\b/.test(n))return'budget';
    if(/\bpack/.test(n))return'packing';
    if(/\bpasalubong\b|\bshopping\b|\bsouvenir\b/.test(n))return'shopping';
    if(/\bto add in itinerary\b|\brequirements?\b|\bvisa\b|\bnotes?\b/.test(n))return'notes';
    return'unknown';
  }

  const MONTHS={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
  function inferYear(workbook){
    const text=[workbook.fileName,...workbook.sheets.map(s=>s.name),...workbook.sheets.slice(0,3).flatMap(s=>s.rows.slice(0,2).map(r=>r.text))].join(' ');
    const m=text.match(/\b(20\d{2})\b/);return m?Number(m[1]):new Date().getFullYear();
  }
  function monthDayFromText(value){
    const text=clean(value),m=text.match(/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i);
    if(!m)return null;return {month:MONTHS[m[1].toLowerCase()],day:Number(m[2])};
  }
  function isoDate(year,md){return md?`${year}-${String(md.month).padStart(2,'0')}-${String(md.day).padStart(2,'0')}`:''}
  function datesInText(value,year){
    const text=clean(value),re=/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/ig,out=[];
    let m;while((m=re.exec(text)))out.push(isoDate(year,{month:MONTHS[m[1].toLowerCase()],day:Number(m[2])}));
    return uniq(out);
  }
  function timeFromText(value){
    const m=clean(value).match(/(?:^|[^\d])(~?\d{1,2}:\d{2})(?!\d)/);return m?m[1].replace(/^~/,'~'):'';
  }
  function scheduleTitle(value){
    const text=clean(value);
    const m=text.match(/(?:^|[^\d])(~?\d{1,2}:\d{2})(?:\s*[–—-]\s*~?\d{1,2}:\d{2})?\s*[–—-]\s*(.+)$/);
    if(!m)return null;
    return {time:m[1],title:clean(m[2]).replace(/^[^\p{L}\p{N}]+/u,'')};
  }
  function warningLike(text){return /\b(do not|don't|dont|must|important|required|reserve|reservation|paid|pending|keep|bring|ticket|stub|protect|recheck|reconfirm|warning|avoid|have tickets ready|arrive \d|nothing else)\b/i.test(text)}
  function transitLike(text){return /\b(from:|train:|line\b|station\b|platform\b|exit\b|bus\b|bus stop|bound for|get off|transfer\b|walk\b|n['’]?ex|narita express)\b|武\d+|乗り場|番線|南口|東口|西口|北口/i.test(text)}
  function planBLike(text){return /\b(plan b|fallback|if .*behind|if .*tired|if .*delay|taxi|weather|rain|storm|cancelled|canceled|optional if)\b/i.test(text)}
  function noisyCost(text){return /\b(budget|estimated cost|couple fare|shopping budget|day \d+ estimated|total \(couple\)|allowance)\b|¥|₱/i.test(text)}

  function dayInfo(sheet,year){
    const md=monthDayFromText(sheet.name)||monthDayFromText(sheet.rows[0]?.text||'');
    const date=isoDate(year,md),first=sheet.rows[0]?.text||sheet.name;
    let title=clean(first).replace(/^[^\p{L}\p{N}]+/u,'').replace(/^Day\s*\d+\s*[–—-]\s*/i,'').replace(/\([^)]*\)\s*$/,'').trim();
    if(!title)title=sheet.name.replace(/^Day\s*\d+\s*/i,'').trim();
    const items=[],warnings=[],planBs=[],allText=[];
    for(const row of sheet.rows){
      const text=clean(row.text);if(!text)continue;allText.push(text);
      const scheduled=scheduleTitle(text);
      if(scheduled&&scheduled.title&&!/budget|cost/i.test(scheduled.title))items.push({...scheduled,sourceRow:row.row});
      if(warningLike(text)||(/do not take/i.test(text)))warnings.push(text);
      if(planBLike(text))planBs.push(text);
    }
    return {sheet,date,title,items,warnings:uniq(warnings),planBs:uniq(planBs),allText};
  }

  function rowScore(text,index){
    if(!text)return-1;
    let score=index<2?7:0;
    if(/do not take|do not buy|paid|shipping|pickup pending|required reservation|fixed event|keep .*ticket|bring .*ticket|protect .*buffer|recheck|reconfirm/i.test(text))score=Math.max(score,12);
    if(warningLike(text))score=Math.max(score,10);
    if(transitLike(text))score=Math.max(score,9);
    if(scheduleTitle(text))score=Math.max(score,8);
    if(planBLike(text))score=Math.max(score,8);
    if(/^📍|location|address/i.test(text))score=Math.max(score,6);
    if(noisyCost(text)&&score<10)score-=5;
    return score;
  }
  function selectedRows(sheet,maxChars){
    const candidates=sheet.rows.map((r,i)=>({...r,score:rowScore(r.text,i)})).filter(r=>r.score>=6);
    candidates.sort((a,b)=>b.score-a.score||a.row-b.row);
    const chosen=[];let used=0;
    for(const row of candidates){
      const line=`ROW ${row.row} | ${clean(row.text)}`;
      if(used+line.length+1>maxChars)continue;
      chosen.push({...row,line});used+=line.length+1;
    }
    chosen.sort((a,b)=>a.row-b.row);
    return chosen;
  }

  function parseReservationSheet(sheet,year){
    if(!sheet)return[];
    const header=sheet.rows[0]?.cells?.map(c=>compact(c.value))||[];
    const col=name=>header.findIndex(v=>v.includes(name));
    const indexes={
      name:col('reservation'),date:col('date'),type:col('type'),status:col('status'),
      needs:col('needs booking'),action:col('what to do'),when:col('when'),notes:col('notes')
    };
    const valueAt=(row,index)=>index<0?'':clean(row.cells.find(c=>c.column===index)?.value||'');
    return sheet.rows.slice(1).map(row=>{
      const entry={
        name:valueAt(row,indexes.name),dateText:valueAt(row,indexes.date),type:valueAt(row,indexes.type),
        status:valueAt(row,indexes.status),needs:valueAt(row,indexes.needs),action:valueAt(row,indexes.action),
        when:valueAt(row,indexes.when),notes:valueAt(row,indexes.notes),sourceRow:row.row
      };
      entry.dates=datesInText(entry.dateText,year);entry.time=timeFromText(entry.dateText);
      return entry;
    }).filter(e=>e.name);
  }

  function buildIR(workbook,days,reservations){
    const blocks=[],year=inferYear(workbook);
    blocks.push(`SAKURA WORKBOOK IR v1\nWorkbook: ${clean(workbook.fileName)}\nYear: ${year}\nActive itinerary sheets: ${days.length}\nWorkbook sheet roles are preserved below. Archive, budget and packing sheets are not active itinerary days.`);
    const reservationSheet=workbook.sheets.find(s=>s.role==='reservations');
    if(reservationSheet){
      const lines=reservationSheet.rows.slice(0,40).map(r=>`ROW ${r.row} | ${clean(r.text)}`).filter(Boolean);
      let block=`\n[SHEET role=reservations name="${clean(reservationSheet.name)}"]\n`;
      for(const line of lines){if(block.length+line.length+1>RESERVATION_BLOCK_CHARS)break;block+=line+'\n'}
      blocks.push(block.trimEnd());
    }
    const booking=workbook.sheets.find(s=>s.role==='booking_tasks');
    if(booking){
      const rows=selectedRows(booking,BOOKING_BLOCK_CHARS);
      if(rows.length)blocks.push(`\n[SHEET role=booking_tasks name="${clean(booking.name)}"]\n${rows.map(r=>r.line).join('\n')}`);
    }
    for(const info of days){
      const rows=selectedRows(info.sheet,DAY_BLOCK_CHARS);
      const header=`\n[SHEET role=day_itinerary name="${clean(info.sheet.name)}" date="${info.date}"]`;
      blocks.push(`${header}\n${rows.map(r=>r.line).join('\n')}`.trimEnd());
    }
    let text=blocks.join('\n');
    if(text.length>MAX_AI_CHARS)text=text.slice(0,MAX_AI_CHARS).replace(/\n[^\n]*$/,'')+'\n[IR truncated to privacy/size budget]';
    return text;
  }

  function aiConfig(){
    const c=window.SAKURA_AI_CONFIG||{};
    const endpoint=String(c.endpoint||'').replace(/\/sakura-ai-translator(?:\?.*)?$/,'/sakura-trip-parser');
    return {endpoint,key:c.gatewayKey||c.publishableKey||''};
  }
  async function understandIR(text){
    const cfg=aiConfig();
    if(!cfg.endpoint||!cfg.key)throw new Error('Sakura itinerary understanding is unavailable right now.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(cfg.endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key},body:JSON.stringify({text}),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`Could not understand workbook (${response.status}).`);
      const trip=S()?.normalizeTrip?.(data.trip||data);
      if(!trip?.days?.length)throw new Error('Sakura read the workbook, but could not identify dated itinerary days.');
      return trip;
    }catch(error){
      if(error?.name==='AbortError')throw new Error('Itinerary understanding took too long. Please try again.');
      throw error;
    }finally{clearTimeout(timer)}
  }

  function similarity(a,b){
    const A=new Set(compact(a).split(' ').filter(x=>x.length>=3)),B=new Set(compact(b).split(' ').filter(x=>x.length>=3));
    if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;
    return hit/Math.min(A.size,B.size);
  }
  function append(a,b,max=650){
    const A=clean(a),B=clean(b);if(!B)return A;if(A&&compact(A).includes(compact(B).slice(0,80)))return A;
    return clean([A,B].filter(Boolean).join(' • ')).slice(0,max);
  }
  function findItem(day,name,time=''){
    const items=day?.items||[];let best=null,bestScore=0;
    for(const item of items){
      let score=similarity(`${item.title} ${item.place}`,name);
      if(time&&clean(item.time).replace('~','')===clean(time).replace('~',''))score+=0.45;
      if(/n['’]?ex|narita express/i.test(name)&&/n['’]?ex|narita express/i.test(`${item.title} ${item.note}`))score+=0.8;
      if(score>bestScore){best=item;bestScore=score}
    }
    return bestScore>=0.48?best:null;
  }
  function bookingRequired(entry){
    const text=compact([entry.status,entry.needs,entry.action].join(' '));
    if(/no reservation|walk in|same day|not required|optional advance/.test(text))return false;
    return /required|already bought|done|paid|to reserve|reserve seats|to buy reserve/.test(text);
  }

  function mergeDeterministic(aiTrip,workbook,dayInfos,reservations){
    const trip=S().clone(aiTrip),byDate=new Map((trip.days||[]).map(d=>[d.date,d]));
    for(const info of dayInfos){
      let day=byDate.get(info.date);
      if(!day){
        day={date:info.date,title:info.title,emoji:'🌸',route:'',reminder:'',planB:'',items:[],phrases:[]};
        trip.days.push(day);byDate.set(info.date,day);
      }else if(!day.title)day.title=info.title;
      for(const local of info.items){
        if(findItem(day,local.title,local.time))continue;
        day.items.push({time:local.time,title:local.title,place:'',japaneseName:'',address:'',type:/train|bus|travel|station|n['’]?ex/i.test(local.title)?'transport':'other',priority:'normal',reservation:false,leaveBy:'',note:'',reminder:'',planB:''});
      }
      const critical=info.warnings.filter(x=>/do not|must|required|reserve|paid|pending|keep|bring|ticket|protect|recheck|warning/i.test(x)).slice(0,3);
      if(critical.length)day.reminder=append(day.reminder,critical.join(' • '),700);
      if(!day.planB&&info.planBs.length)day.planB=clean(info.planBs.slice(0,2).join(' • ')).slice(0,700);
      day.items.sort((a,b)=>{
        const mins=v=>{const m=String(v||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):9999};
        return mins(a.time)-mins(b.time);
      });
    }
    for(const entry of reservations){
      if(/^hotel$/i.test(entry.type)&&!trip.hotel)trip.hotel=entry.name;
      const dates=entry.dates.length?entry.dates:[];
      for(const date of dates){
        const day=byDate.get(date);if(!day)continue;
        let item=findItem(day,entry.name,entry.time);
        if(!item&&/n['’]?ex|narita express/i.test(entry.name))item=(day.items||[]).find(i=>/n['’]?ex|narita express/i.test(`${i.title} ${i.note}`));
        if(!item&&entry.time){
          item={time:entry.time,title:entry.name,place:entry.name,japaneseName:'',address:'',type:/transport/i.test(entry.type)?'transport':'other',priority:'normal',reservation:false,leaveBy:'',note:'',reminder:'',planB:''};
          day.items.push(item);
        }
        if(!item)continue;
        const required=bookingRequired(entry);
        if(required)item.reservation=true;
        if(required&&entry.time)item.priority='critical';
        const bookingText=[
          entry.status&&`Booking: ${entry.status}`,
          entry.action,
          entry.when&&`When: ${entry.when}`,
          entry.notes
        ].filter(Boolean).join(' · ');
        item.note=append(item.note,bookingText,500);
        if(/do not buy again|arrive \d|protect|pending|required|recheck|reconfirm/i.test(bookingText))item.reminder=append(item.reminder,bookingText,500);
      }
    }
    trip.days.sort((a,b)=>a.date.localeCompare(b.date));
    const dates=dayInfos.map(d=>d.date).filter(Boolean).sort();
    if(dates.length){trip.startDate=dates[0];trip.endDate=dates.at(-1)}
    if(!trip.name||/^my trip$/i.test(trip.name))trip.name=clean(workbook.fileName).replace(/\.xlsx$/i,'').replace(/[_-]+/g,' ');
    const context=compact(`${trip.name} ${trip.destination} ${workbook.fileName}`);
    if(!trip.destination&&/japan|tokyo|osaka|kyoto/.test(context))trip.destination='Japan';
    if(/japan|tokyo|osaka|kyoto/.test(context))trip.timezone='Asia/Tokyo';
    return S().normalizeTrip(trip);
  }

  function summary(workbook,dayInfos,reservations){
    const allDayRows=dayInfos.flatMap(d=>d.sheet.rows.map(r=>r.text));
    const transit=uniq(allDayRows.filter(x=>/do not take|do not rely|south exit|north exit|east exit|west exit|bus stop|platform|bound for|get off/i.test(x)));
    const weather=uniq(allDayRows.filter(x=>/\b(weather|rain|storm|outdoor|cancelled because of rain|canceled because of rain)\b/i.test(x)));
    const reconfirm=reservations.filter(e=>/to reserve|pending|recheck|reconfirm|reserve seats|to buy \/ reserve|optional advance/i.test([e.status,e.action,e.when,e.notes].join(' ')));
    const fixed=reservations.filter(e=>e.time&&bookingRequired(e));
    const unknown=workbook.sheets.filter(s=>s.role==='unknown').map(s=>s.name);
    const reviewNotes=[];
    if(unknown.length)reviewNotes.push(`${unknown.length} sheet${unknown.length===1?'':'s'} could not be confidently classified: ${unknown.slice(0,3).join(', ')}${unknown.length>3?'…':''}`);
    const archives=workbook.sheets.filter(s=>s.role==='archive').length;
    if(archives)reviewNotes.push(`${archives} archive sheet${archives===1?' was':'s were'} kept out of the active itinerary.`);
    reviewNotes.push('Sakura does not assume perfect AI confidence; verify fixed times, booking statuses and transit restrictions on the next screen.');
    return {
      activeDays:dayInfos.length,reservations:reservations.length,reconfirm:reconfirm.length,
      transitWarnings:transit.length,fixedEvents:fixed.length,weatherDependent:weather.length,reviewNotes
    };
  }

  function tripPack(trip){
    const line=value=>clean(value).replace(/\n/g,' ');
    const out=['SAKURA TRIP PACK',`Trip: ${line(trip.name||'Imported Trip')}`];
    if(trip.destination)out.push(`Destination: ${line(trip.destination)}`);
    if(trip.startDate)out.push(`Dates: ${trip.startDate} to ${trip.endDate||trip.startDate}`);
    out.push(`Timezone: ${line(trip.timezone||'Asia/Tokyo')}`);
    if(trip.hotel)out.push(`Hotel: ${line(trip.hotel)}`);
    (trip.days||[]).forEach((day,index)=>{
      out.push('',`DAY ${index+1} | ${day.date} | ${line(day.title||`Day ${index+1}`)}`);
      if(day.route)out.push(`Route: ${line(day.route)}`);
      if(day.reminder)out.push(`Reminder: ${line(day.reminder)}`);
      if(day.planB)out.push(`Plan B: ${line(day.planB)}`);
      (day.items||[]).forEach(item=>{
        out.push(`${line(item.time||'Anytime')} | ${line(item.title||item.place||'Stop')}`);
        if(item.type)out.push(`Type: ${line(item.type)}`);
        if(item.place)out.push(`Place: ${line(item.place)}`);
        if(item.japaneseName)out.push(`Japanese name: ${line(item.japaneseName)}`);
        if(item.address)out.push(`Address: ${line(item.address)}`);
        if(item.priority&&item.priority!=='normal')out.push(`Priority: ${line(item.priority)}`);
        if(item.reservation)out.push('Reservation: yes');
        if(item.leaveBy)out.push(`Leave by: ${line(item.leaveBy)}`);
        if(item.note)out.push(`Note: ${line(item.note)}`);
        if(item.reminder)out.push(`Reminder: ${line(item.reminder)}`);
        if(item.planB)out.push(`Plan B: ${line(item.planB)}`);
      });
    });
    return out.join('\n');
  }

  async function processFile(file){
    if(!file)return;
    progressView(file);
    try{
      const workbook=await parseXlsx(file);
      step('sheets',`Workbook detected · ${workbook.sheets.length} sheets · classifying structure…`);
      const year=inferYear(workbook);
      const dayInfos=workbook.sheets.filter(s=>s.role==='day_itinerary').map(s=>dayInfo(s,year)).filter(d=>d.date).sort((a,b)=>a.date.localeCompare(b.date));
      if(!dayInfos.length)throw new Error('Sakura could not find any active dated itinerary-day sheets in this workbook.');
      const reservationSheet=workbook.sheets.find(s=>s.role==='reservations');
      const reservations=parseReservationSheet(reservationSheet,year);
      const ir=buildIR(workbook,dayInfos,reservations);
      step('ai',`Workbook understood structurally · ${dayInfos.length} active days · sending selected itinerary rows to Gemini…`);
      const aiTrip=await understandIR(ir);
      const trip=mergeDeterministic(aiTrip,workbook,dayInfos,reservations);
      const result={workbook,trip,summary:summary(workbook,dayInfos,reservations),pack:tripPack(trip),ir};
      summaryView(result);
    }catch(error){console.warn('Sakura XLSX import failed',error);errorView(error)}
  }

  async function reviewPending(){
    if(!pending?.pack)return;
    const pack=pending.pack;
    openNativePaste();
    await Promise.resolve();
    const textarea=root()?.querySelector('[data-text]');
    const understand=root()?.querySelector('[data-understand]');
    if(!textarea||!understand){errorView(new Error('The existing Sakura review screen could not be opened.'));return}
    textarea.value=pack;
    const status=root()?.querySelector('[data-status]');
    if(status){status.className='stc-status busy';status.textContent='Opening the standard Sakura review…'}
    understand.click();
  }

  document.addEventListener('click',event=>{
    const z=s=>event.target.closest?.(s);
    if(z('#sakura-trip-companion [data-stfi-add]')){event.preventDefault();event.stopPropagation();return addMenu()}
    if(z('#sakura-trip-companion [data-stfi-paste]')){event.preventDefault();event.stopPropagation();return openNativePaste()}
    if(z('#sakura-trip-companion [data-stfi-choose]')){event.preventDefault();event.stopPropagation();root()?.querySelector('[data-stfi-file]')?.click();return}
    if(z('#sakura-trip-companion [data-stfi-back]')){event.preventDefault();event.stopPropagation();return tripsView()}
    if(z('#sakura-trip-companion [data-stfi-menu]')){event.preventDefault();event.stopPropagation();return addMenu()}
    if(z('#sakura-trip-companion [data-stfi-retry]')){event.preventDefault();event.stopPropagation();return addMenu()}
    if(z('#sakura-trip-companion [data-stfi-review]')){event.preventDefault();event.stopPropagation();return void reviewPending()}
  },true);

  document.addEventListener('change',event=>{
    const input=event.target.closest?.('#sakura-trip-companion [data-stfi-file]');if(!input)return;
    const file=input.files?.[0];input.value='';if(file)processFile(file);
  },true);

  const observer=new MutationObserver(queueDecorate);
  function init(){
    css();const r=root();if(r)observer.observe(r,{childList:true,subtree:true});
    decorate();
    document.addEventListener('sakura:trips-changed',queueDecorate);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);

  window.SakuraTripFileImport=Object.freeze({
    version:1,
    parseXlsx,
    classifySheet,
    buildIR,
    processFile,
    showAddMenu:addMenu
  });
}());
