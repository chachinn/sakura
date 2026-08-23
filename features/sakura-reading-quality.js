/* Sakura Reading Garden Production Library v3.1
   Extends the existing Article/Story runtime with the remaining approved shelves.
   Compact indexes load per shelf; learner body shards load only when opened.
   Editorial source/body-ready evidence is never parsed by the browser. */
(function(){
'use strict';
if(window.SakuraReadingQuality)return;

const MANIFEST_URL='./data/reading/library/manifest.json?v=1';
const LIBRARY_BASE='./data/reading/library/';
const LIBRARY_KEY='sakuraReadingGardenLibraryV2';
const PREFS_KEY='sakuraReadingGardenPrefsV3';
const PROGRESS_KEY='sakuraReadingProgressV1';
const READER_PREFS_KEY='sakuraReadingReaderPrefsV1';
const GENERIC_COMPLETED_KEY='sakuraReadingGenericCompletedV1';
const GENERIC_OFFLINE_KEY='sakuraReadingGenericOfflineV1';
const GENERIC_SHELVES=new Set(['news','travel','folklore','essays','school-work','recipes','interviews','documents','novels','micro']);
const BODY_CACHE_LIMIT=6;
const PAGE_SIZE=24;
let ready=false,manifest=null,manifestInFlight=null,activeShelf='',activeScreen='',currentIndex=[],currentView=[],currentRecord=null,visibleCount=PAGE_SIZE,translationVisible=false,scrollFrame=0,saveTimer=0,restoredId='',searchQuery='';
const indexCache=new Map(),indexInFlight=new Map(),bodyCache=new Map(),bodyInFlight=new Map();

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const clone=value=>JSON.parse(JSON.stringify(value));
function read(key,fallback){try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return parsed&&typeof parsed==='object'?parsed:clone(fallback)}catch{return clone(fallback)}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(error){console.warn('Reading Garden: local data could not be saved.',error)}}
function prefs(){return read(PREFS_KEY,{level:'all',mode:'furigana',material:'articles'})}
function library(){return read(LIBRARY_KEY,{saved:[],completed:[],lastReadingId:'',lastReadingType:''})}
function readerPrefs(){const value=read(READER_PREFS_KEY,{fontScale:1,lineHeight:'comfortable'});return{fontScale:Math.max(.9,Math.min(1.3,Number(value.fontScale)||1)),lineHeight:value.lineHeight==='compact'?'compact':'comfortable'}}
function progressStore(){const value=read(PROGRESS_KEY,{version:1,items:{}});if(!value.items||typeof value.items!=='object')value.items={};return value}
function genericCompleted(){const value=read(GENERIC_COMPLETED_KEY,{version:1,ids:[]});return new Set(Array.isArray(value.ids)?value.ids:[])}
function offlineState(){return read(GENERIC_OFFLINE_KEY,{version:1,shelves:{}})}
function isSaved(id){return Array.isArray(library().saved)&&library().saved.includes(id)}
function isCompleted(id){return Array.isArray(library().completed)&&library().completed.includes(id)}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}

function mergeGenericCompleted(){
 const protectedIds=genericCompleted();if(!protectedIds.size)return;
 const value=library(),completed=new Set(Array.isArray(value.completed)?value.completed:[]);let changed=false;
 protectedIds.forEach(id=>{if(!completed.has(id)){completed.add(id);changed=true}});
 if(changed){value.completed=[...completed];write(LIBRARY_KEY,value)}
}
function markGenericComplete(id){
 if(!id)return;
 const protectedIds=genericCompleted();protectedIds.add(id);write(GENERIC_COMPLETED_KEY,{version:1,ids:[...protectedIds]});
 const value=library(),completed=new Set(Array.isArray(value.completed)?value.completed:[]);completed.add(id);value.completed=[...completed];write(LIBRARY_KEY,value);
 saveProgress(id,activeShelf,document.getElementById('reading-garden-body')?.scrollTop||0,100);patchLibraryStrip();renderReader();
}
function setLastReading(record){
 const value=library();value.lastReadingId=record.id;value.lastReadingType=record.shelf;value.lastReadingTitle=record.title;value.lastGenericShelf=record.shelf;write(LIBRARY_KEY,value);patchLibraryStrip();
}
function toggleSavedViaCore(id){
 const dialog=document.getElementById('reading-garden-dialog');if(!dialog||!id)return;
 const button=document.createElement('button');button.type='button';button.hidden=true;button.dataset.readingSaveArticle=id;dialog.appendChild(button);button.click();button.remove();patchLibraryStrip();
}
function patchLibraryStrip(){
 mergeGenericCompleted();const strip=document.getElementById('reading-garden-library-strip');if(!strip)return;
 const value=library(),items=[...strip.querySelectorAll('.reading-garden-library-item')];
 const find=label=>items.find(item=>item.querySelector('strong')?.textContent.trim()===label);
 const saved=find('Saved')?.querySelector('small');if(saved)saved.textContent=`${Array.isArray(value.saved)?value.saved.length:0} saved`;
 const finished=find('Finished')?.querySelector('small');if(finished)finished.textContent=`${Array.isArray(value.completed)?value.completed.length:0} complete`;
 const cont=find('Continue')?.querySelector('small');if(cont&&value.lastReadingId&&GENERIC_SHELVES.has(value.lastReadingType))cont.textContent=value.lastReadingTitle||value.lastReadingType;
}

async function fetchJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}`);return response.json()}
async function loadManifest(){
 if(manifest)return manifest;if(manifestInFlight)return manifestInFlight;
 manifestInFlight=fetchJson(MANIFEST_URL).then(data=>{if(data?.totalTarget!==2000||!data?.shelves)throw new Error('Production Reading Garden manifest is invalid.');manifest=data;patchHome();return data}).finally(()=>{manifestInFlight=null});
 return manifestInFlight;
}
function configFor(shelf){return manifest?.shelves?.[shelf]||null}
async function loadIndex(shelf){
 if(indexCache.has(shelf))return indexCache.get(shelf);if(indexInFlight.has(shelf))return indexInFlight.get(shelf);
 const config=configFor(shelf);if(!config||!config.learnerReadyCount||!config.index)return[];
 const task=fetchJson(`${LIBRARY_BASE}${config.index}?v=1`).then(rows=>{if(!Array.isArray(rows)||rows.length!==Number(config.learnerReadyCount))throw new Error(`${shelf} index count does not match the production manifest.`);if(rows.some(row=>row?.shelf!==shelf||!row?.id||!row?.pack))throw new Error(`${shelf} index contains an invalid row.`);indexCache.set(shelf,rows);return rows}).finally(()=>indexInFlight.delete(shelf));
 indexInFlight.set(shelf,task);return task;
}
function touchBody(url,records){if(bodyCache.has(url))bodyCache.delete(url);bodyCache.set(url,records);while(bodyCache.size>BODY_CACHE_LIMIT)bodyCache.delete(bodyCache.keys().next().value)}
async function loadBodyShard(shelf,pack){
 const url=`${LIBRARY_BASE}${shelf}/${pack}?v=1`;if(bodyCache.has(url)){const records=bodyCache.get(url);touchBody(url,records);return records}if(bodyInFlight.has(url))return bodyInFlight.get(url);
 const task=fetchJson(url).then(records=>{if(!Array.isArray(records)||!records.length||records.length>20)throw new Error(`${shelf}/${pack} is not a valid learner body shard.`);if(records.some(record=>record?.shelf!==shelf||!record?.id||!Array.isArray(record?.paragraphs)))throw new Error(`${shelf}/${pack} contains an invalid learner record.`);touchBody(url,records);return records}).finally(()=>bodyInFlight.delete(url));
 bodyInFlight.set(url,task);return task;
}

function readyStatus(id,config){
 const readyCount=Number(config?.learnerReadyCount||0),target=Number(config?.target||0);
 if(id==='articles')return config?.readyForFinal?'Ready now':'300 sourced · depth rewrite pending';
 if(id==='short-stories')return config?.readyForFinal?'Ready now':`${readyCount} / ${target} learner-ready`;
 if(!readyCount)return'Learner build pending';return readyCount===target&&config?.readyForFinal?'Ready now':`${readyCount} / ${target} ready`;
}
function patchHome(){
 const rg=window.SakuraReadingGarden,dialog=document.getElementById('reading-garden-dialog');if(!rg||!dialog||!manifest)return;
 rg.materials?.forEach(item=>{const config=configFor(item.id);if(config)item.status=readyStatus(item.id,config)});
 const stats=dialog.querySelectorAll('.reading-garden-stat strong'),labels=dialog.querySelectorAll('.reading-garden-stat small');
 if(stats[0])stats[0].textContent='12';if(labels[0])labels[0].textContent='approved completion shelves';
 if(stats[1])stats[1].textContent='2,000';if(labels[1])labels[1].textContent='permission-safe corpus target';
 if(stats[2])stats[2].textContent=Number(manifest.learnerReadyCount||0).toLocaleString();if(labels[2])labels[2].textContent='learner records built now';
 const entry=document.querySelector('[data-open-reading-garden] p');if(entry)entry.textContent=`${Number(manifest.learnerReadyCount||0).toLocaleString()} learner readings built toward the verified 2,000-reading library.`;
 dialog.querySelectorAll('[data-reading-material]').forEach(button=>{const id=button.dataset.readingMaterial,config=configFor(id),item=rg.materials?.find(x=>x.id===id);if(!config||!item)return;const count=button.querySelector('.reading-material-main small');if(count)count.textContent=`${Number(config.learnerReadyCount||0).toLocaleString()} / ${Number(config.target||item.count).toLocaleString()} ${item.unit}`;const status=button.querySelector('.reading-material-status');if(status)status.textContent=readyStatus(id,config)});
 patchSelection();patchLibraryStrip();
}
function patchSelection(){
 const dialog=document.getElementById('reading-garden-dialog'),selection=document.getElementById('reading-garden-selection');if(!dialog||!selection||!manifest)return;
 const id=dialog.querySelector('[data-reading-material].active')?.dataset.readingMaterial;if(!id)return;
 const small=selection.querySelector('small');
 if(id==='articles'){if(small)small.textContent='All 300 source-grounded Article records remain browseable. The final one-source substantial-depth rewrite is still pending, so Sakura does not label Articles final yet.';return}
 if(id==='short-stories'){if(small)small.textContent='100 of 250 learner-facing public-domain Short Stories are ready now. The remaining 150 will come only from verified public-domain works; no invented Story filler will be used.';return}
 if(!GENERIC_SHELVES.has(id))return;
 const config=configFor(id),readyCount=Number(config?.learnerReadyCount||0),target=Number(config?.target||0);
 if(small)small.textContent=readyCount?`${readyCount.toLocaleString()} of ${target.toLocaleString()} reviewed learner readings are available in the production pack. Browsing loads only this shelf’s compact index; bodies load one shard at a time.`:'The verified source inventory for this shelf is preserved, but learner-facing population is not committed yet. Sakura will not show filler or a fake Ready label.';
 selection.querySelector('.reading-garden-selection-actions')?.remove();
 if(readyCount){const actions=document.createElement('div');actions.className='reading-garden-selection-actions';actions.innerHTML=`<button class="reading-garden-primary" type="button" data-sakura-browse-shelf="${esc(id)}">Browse ${esc(config.title)}</button><button class="reading-garden-secondary" type="button" data-sakura-surprise-shelf="${esc(id)}">Surprise Me</button>`;selection.appendChild(actions)}
}

function ensureScreens(){
 const body=document.getElementById('reading-garden-body');if(!body)return null;
 let browser=document.getElementById('sakura-reading-generic-browser');if(!browser){browser=document.createElement('section');browser.id='sakura-reading-generic-browser';browser.hidden=true;body.appendChild(browser)}
 let reader=document.getElementById('sakura-reading-generic-reader');if(!reader){reader=document.createElement('article');reader.id='sakura-reading-generic-reader';reader.hidden=true;body.appendChild(reader)}return{body,browser,reader};
}
function hideCoreScreens(){['reading-garden-home','reading-articles-browser','reading-article-reader','reading-stories-browser','reading-story-reader'].forEach(id=>{const node=document.getElementById(id);if(node)node.hidden=true})}
function setHeader(title,kicker='Practice'){const heading=document.getElementById('reading-garden-heading'),label=document.getElementById('reading-garden-kicker');if(heading)heading.textContent=title;if(label)label.textContent=kicker}
function showBrowser(){const screens=ensureScreens();if(!screens)return;hideCoreScreens();screens.reader.hidden=true;screens.browser.hidden=false;activeScreen='browser';setHeader(configFor(activeShelf)?.title||'Reading','Source-checked');screens.body.scrollTo({top:0,behavior:'auto'})}
function showReader(){const screens=ensureScreens();if(!screens)return;hideCoreScreens();screens.browser.hidden=true;screens.reader.hidden=false;activeScreen='reader';setHeader(currentRecord?.titleEnglish||currentRecord?.title||'Reading',currentRecord?.studyDifficulty||'Reading');screens.body.scrollTo({top:0,behavior:'auto'})}
function showHome(){const screens=ensureScreens();if(screens){screens.browser.hidden=true;screens.reader.hidden=true}activeShelf='';activeScreen='';currentRecord=null;searchQuery='';const home=document.getElementById('reading-garden-home');if(home)home.hidden=false;setHeader('Reading Garden','Practice');patchHome();document.getElementById('reading-garden-body')?.scrollTo({top:0,behavior:'auto'})}

function filterCurrentView(){const p=prefs(),q=searchQuery.trim().toLowerCase();currentView=currentIndex.filter(row=>(p.level==='all'||row.studyDifficulty===p.level)&&(!q||`${row.title} ${row.titleKana} ${row.titleEnglish} ${row.summary} ${row.sourcePublisher}`.toLowerCase().includes(q)));return p}
function renderBrowserResults(){
 const browser=document.getElementById('sakura-reading-generic-browser');if(!browser)return;const p=filterCurrentView(),list=browser.querySelector('#sakura-generic-list'),count=browser.querySelector('#sakura-generic-count'),level=browser.querySelector('#sakura-generic-level'),more=browser.querySelector('[data-sakura-show-more]');
 if(count)count.textContent=`${currentView.length.toLocaleString()} reading${currentView.length===1?'':'s'}`;if(level)level.textContent=p.level==='all'?'All levels':p.level;
 if(list)list.innerHTML=currentView.length?currentView.slice(0,visibleCount).map(cardMarkup).join(''):'<div class="reading-browser-empty">🌸 No readings match these filters.</div>';if(more)more.hidden=visibleCount>=currentView.length;
}
function renderBrowser(){
 const browser=document.getElementById('sakura-reading-generic-browser'),config=configFor(activeShelf);if(!browser||!config)return;const p=prefs(),offline=offlineState().shelves?.[activeShelf];
 browser.innerHTML=`<section class="reading-browser-hero"><span class="reading-garden-kicker">📖 Reviewed production shelf</span><h2>${esc(config.title)}</h2><p>${Number(config.learnerReadyCount).toLocaleString()} learner readings are currently committed from verified reusable sources. The compact index is loaded now; individual body shards load only when opened.</p></section><div class="reading-browser-toolbar"><input id="sakura-generic-search" type="search" autocomplete="off" value="${esc(searchQuery)}" placeholder="Search title, Japanese, source…" aria-label="Search ${esc(config.title)}"><div class="reading-browser-levels" role="group">${['all','N5','N4','N3','N2','N1'].map(level=>`<button class="reading-garden-chip${p.level===level?' active':''}" type="button" data-reading-level="${level}">${level==='all'?'All Levels':level}</button>`).join('')}</div></div><div class="reading-browser-offline"><span id="sakura-generic-offline-status">${offline?'✓ This shelf pack was prepared for offline use on this device.':'Prepare only this shelf’s compact index and body shards for offline reading.'}</span><button class="reading-garden-secondary" type="button" data-sakura-download-shelf>${offline?'Refresh Offline Pack':'Download Shelf Pack'}</button></div><div class="reading-browser-meta"><span id="sakura-generic-count"></span><span id="sakura-generic-level"></span></div><div id="sakura-generic-list" class="reading-article-list"></div><button class="reading-garden-secondary reading-load-more" type="button" data-sakura-show-more>Show More</button>`;renderBrowserResults();
}
function cardMarkup(row){return`<div class="reading-article-card sakura-production-reading" data-sakura-open-reading="${esc(row.id)}" role="button" tabindex="0"><div><div class="reading-article-tags"><span class="reading-article-tag">Study ${esc(row.studyDifficulty)}</span><span class="reading-article-tag">${esc(String(row.estimatedMinutes||1))} min</span>${isCompleted(row.id)?'<span class="reading-article-tag">✓ Read</span>':''}</div><h3>${esc(row.title)}</h3><span class="reading-en-title">${esc(row.titleEnglish)}</span><p>${esc(row.summary||'')}</p><small class="reading-source-inline">Source: ${esc(row.sourcePublisher||'Verified source')}${row.sourceYear?` · ${esc(row.sourceYear)}`:''}</small></div><button class="reading-article-save${isSaved(row.id)?' saved':''}" type="button" data-sakura-save-reading="${esc(row.id)}" aria-label="${isSaved(row.id)?'Remove from Saved':'Save reading'}">${isSaved(row.id)?'♥':'♡'}</button></div>`}
async function openShelf(shelf){await loadManifest();const config=configFor(shelf);if(!GENERIC_SHELVES.has(shelf)||!config?.learnerReadyCount)return;activeShelf=shelf;currentRecord=null;visibleCount=PAGE_SIZE;searchQuery='';currentIndex=await loadIndex(shelf);showBrowser();renderBrowser()}
async function openReading(id){const row=currentIndex.find(item=>item.id===id);if(!row)return;const records=await loadBodyShard(activeShelf,row.pack),record=records.find(item=>item.id===id);if(!record)throw new Error(`${id} is missing from ${row.pack}.`);currentRecord=record;translationVisible=false;restoredId='';setLastReading(record);showReader();renderReader();restorePosition()}
function displayParagraph(paragraph){const mode=prefs().mode;return mode==='furigana'?(paragraph.furigana||esc(paragraph.japanese)):esc(mode==='kana'?paragraph.kana:paragraph.japanese)}
function displayTitle(record){const mode=prefs().mode;if(mode==='furigana'&&record.titleFurigana)return record.titleFurigana;return esc(mode==='kana'?record.titleKana:record.title)}
function sourceDate(record){return record.sourcePublishedDate||record.sourceYear||record.sourceRetrievedDate||'Date not listed'}
function questionMarkup(record){const q=record.comprehension?.[0];if(!q)return'';const mode=prefs().mode,question=mode==='furigana'?(q.questionFurigana||esc(q.questionJapanese)):esc(mode==='kana'?q.questionKana:q.questionJapanese);return`<section class="reading-reader-section"><h3>🧠 Check My Understanding</h3><div class="reading-reader-question">${question}</div><div class="reading-reader-choices">${(q.choices||[]).map((choice,index)=>{const label=mode==='furigana'?(choice.furigana||esc(choice.japanese)):esc(mode==='kana'?choice.kana:choice.japanese);return`<button class="reading-reader-choice" type="button" data-sakura-answer="${index}">${label}</button>`}).join('')}</div><div id="sakura-generic-answer-explanation" class="reading-reader-explanation" hidden></div></section>`}
function toolMarkup(record){const p=readerPrefs(),saved=progressStore().items[record.id],percent=saved?.percent||0;return`<aside class="sakura-reader-tools"><div class="sakura-reader-progress"><div><strong>Reading progress</strong><span data-sakura-generic-percent>${percent}%</span></div><div class="sakura-reader-progress-track"><i data-sakura-generic-progress-bar style="width:${percent}%"></i></div></div><div class="sakura-reader-controls"><button type="button" data-sakura-font-minus>A−</button><span>${Math.round(p.fontScale*100)}%</span><button type="button" data-sakura-font-plus>A+</button><button type="button" data-sakura-leading>${p.lineHeight==='compact'?'Comfortable spacing':'Compact spacing'}</button><button type="button" data-sakura-start-over>Start over</button></div></aside>`}
function renderReader(){
 const reader=document.getElementById('sakura-reading-generic-reader'),record=currentRecord;if(!reader||!record)return;applyReaderPrefs();const mode=prefs().mode;
 reader.innerHTML=`<header class="reading-reader-header"><div class="reading-reader-header-top"><div class="reading-reader-tags"><span class="reading-article-tag">Study ${esc(record.studyDifficulty)}</span><span class="reading-article-tag">${esc(configFor(record.shelf)?.title||record.shelf)}</span><span class="reading-article-tag">Source-checked</span></div><button class="reading-article-save${isSaved(record.id)?' saved':''}" type="button" data-sakura-save-reading="${esc(record.id)}">${isSaved(record.id)?'♥':'♡'}</button></div><h2 class="reading-reader-title">${displayTitle(record)}</h2><p class="reading-reader-english-title">${esc(record.titleEnglish)}</p><p class="reading-level-note">${esc(record.levelNote||'Sakura study-support level; the original source is not officially JLPT-graded.')}</p><div class="reading-reader-actions"><button class="reading-garden-secondary" type="button" data-sakura-hear>🔊 Hear Japanese</button><button class="reading-garden-secondary" type="button" data-sakura-translation>${translationVisible?'Hide Translation':'Show Translation'}</button></div><div class="reading-reader-mode-row">${[['furigana','漢字 + Furigana'],['kana','Kana Only'],['japanese','Japanese Only']].map(([id,label])=>`<button class="reading-garden-chip${mode===id?' active':''}" type="button" data-reading-mode="${id}">${label}</button>`).join('')}</div></header>${toolMarkup(record)}<section class="reading-source-card"><div><span class="reading-source-badge">Verified reusable source · ${esc(sourceDate(record))}</span><h3>${esc(record.sourceTitle)}</h3><p>${esc(record.sourcePublisher)}${record.sourceLicense?` · ${esc(record.sourceLicense)}`:''}</p></div><a href="${esc(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Read Original ↗</a>${record.sourceProcessing?`<small>${esc(record.sourceProcessing)}</small>`:''}${record.sourceAttribution?`<small>${esc(record.sourceAttribution)}</small>`:''}${record.rightsNote?`<small>${esc(record.rightsNote)}</small>`:''}</section><section class="reading-reader-content">${record.paragraphs.map(paragraph=>`<p class="reading-reader-paragraph">${displayParagraph(paragraph)}</p>${translationVisible?`<p class="reading-reader-translation">${esc(paragraph.english)}</p>`:''}`).join('')}</section>${record.vocabularyFocus?.length?`<section class="reading-reader-section"><h3>🌸 Vocabulary Focus</h3><div class="reading-reader-vocab">${record.vocabularyFocus.map(word=>`<div><strong>${esc(word.word)}</strong><span>${esc(word.kana||'')}</span><span>${esc(word.meaning||'')}</span></div>`).join('')}</div></section>`:''}${record.grammarFocus?.length?`<section class="reading-reader-section"><h3>文 Grammar in this reading</h3><div class="reading-reader-grammar">${record.grammarFocus.map(grammar=>`<span class="reading-article-tag">${esc(grammar)}</span>`).join('')}</div></section>`:''}${questionMarkup(record)}<div class="reading-reader-footer"><button class="reading-garden-secondary" type="button" data-sakura-prev>‹ Previous</button><button class="reading-garden-secondary" type="button" data-sakura-next>Next ›</button><button class="reading-garden-primary reading-reader-complete${isCompleted(record.id)?' done':''}" type="button" data-sakura-complete>${isCompleted(record.id)?'✓ Reading Complete':'Mark Reading Complete'}</button></div>`;updateProgressUi(progressStore().items[record.id]?.percent||0);
}

function updateProgressUi(percent){const reader=document.getElementById('sakura-reading-generic-reader');if(!reader)return;const label=reader.querySelector('[data-sakura-generic-percent]'),bar=reader.querySelector('[data-sakura-generic-progress-bar]');if(label)label.textContent=`${percent}%`;if(bar)bar.style.width=`${percent}%`}
function saveProgress(id,type,scroll,percent){const store=progressStore();store.items[id]={type,scroll:Math.max(0,Math.round(scroll)),percent:clamp(Math.round(percent),0,100),updatedAt:Date.now()};const ids=Object.keys(store.items).sort((a,b)=>(store.items[b].updatedAt||0)-(store.items[a].updatedAt||0));ids.slice(200).forEach(key=>delete store.items[key]);write(PROGRESS_KEY,store)}
function onScroll(){if(activeScreen!=='reader'||!currentRecord||scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;const body=document.getElementById('reading-garden-body');if(!body)return;const max=Math.max(1,body.scrollHeight-body.clientHeight),percent=clamp(Math.round(body.scrollTop/max*100),0,100);updateProgressUi(percent);clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveProgress(currentRecord.id,currentRecord.shelf,body.scrollTop,percent),220)})}
function restorePosition(){if(!currentRecord||restoredId===currentRecord.id||isCompleted(currentRecord.id))return;const saved=progressStore().items[currentRecord.id];restoredId=currentRecord.id;if(!saved||saved.percent<4||saved.percent>=93)return;setTimeout(()=>{const body=document.getElementById('reading-garden-body');if(!body||currentRecord?.id!==restoredId)return;const max=Math.max(0,body.scrollHeight-body.clientHeight);body.scrollTo({top:Math.min(saved.scroll||0,max),behavior:'auto'});updateProgressUi(saved.percent||0)},80)}
function applyReaderPrefs(){const dialog=document.getElementById('reading-garden-dialog'),p=readerPrefs();if(!dialog)return;dialog.style.setProperty('--sakura-reader-scale',String(p.fontScale));dialog.style.setProperty('--sakura-reader-leading',p.lineHeight==='compact'?'1.65':'1.95')}
function adjustFont(delta){const p=readerPrefs();p.fontScale=clamp(Math.round((p.fontScale+delta)*20)/20,.9,1.3);write(READER_PREFS_KEY,p);renderReader()}
function toggleLeading(){const p=readerPrefs();p.lineHeight=p.lineHeight==='compact'?'comfortable':'compact';write(READER_PREFS_KEY,p);renderReader()}
function startOver(){if(!currentRecord)return;const body=document.getElementById('reading-garden-body');saveProgress(currentRecord.id,currentRecord.shelf,0,0);restoredId=currentRecord.id;body?.scrollTo({top:0,behavior:'smooth'});updateProgressUi(0)}
function move(direction){if(!currentRecord||!currentView.length)return;const index=currentView.findIndex(row=>row.id===currentRecord.id),next=clamp(index+direction,0,currentView.length-1);if(index>=0&&next!==index)openReading(currentView[next].id).catch(error=>console.warn('Reading Garden navigation failed.',error))}
function answer(index){const q=currentRecord?.comprehension?.[0];if(!q)return;document.querySelectorAll('#sakura-reading-generic-reader [data-sakura-answer]').forEach(button=>{const choice=Number(button.dataset.sakuraAnswer);button.disabled=true;if(choice===q.answerIndex)button.classList.add('correct');else if(choice===index)button.classList.add('wrong')});const box=document.getElementById('sakura-generic-answer-explanation');if(box){box.hidden=false;box.textContent=index===q.answerIndex?`✓ Correct. ${q.explanation||''}`:`Not quite. ${q.explanation||''}`}}
function speak(){if(!currentRecord||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(currentRecord.paragraphs.map(p=>p.japanese).join('\n'));utterance.lang='ja-JP';utterance.rate=.88;const voice=window.speechSynthesis.getVoices().find(item=>/^ja(-|_)/i.test(item.lang));if(voice)utterance.voice=voice;window.speechSynthesis.speak(utterance)}
async function downloadShelf(button){const config=configFor(activeShelf);if(!config?.learnerReadyCount)return;const status=document.getElementById('sakura-generic-offline-status');if(button){button.disabled=true;button.textContent='Preparing…'}if(status)status.textContent='Preparing this shelf in small batches…';try{await loadIndex(activeShelf);const urls=(config.shards||[]).map(path=>`${LIBRARY_BASE}${path}?v=1`);let cursor=0;async function worker(){while(cursor<urls.length){const url=urls[cursor++],response=await fetch(url);if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}`);await response.clone().arrayBuffer()}}await Promise.all(Array.from({length:Math.min(3,Math.max(1,urls.length))},worker));const state=offlineState();state.shelves[activeShelf]=new Date().toISOString();write(GENERIC_OFFLINE_KEY,state);if(status)status.textContent='✓ This shelf is prepared for offline reading.';if(button)button.textContent='Refresh Offline Pack'}catch(error){console.warn('Reading Garden shelf offline preparation failed.',error);if(status)status.textContent='Offline preparation could not finish. Already cached readings were kept.';if(button)button.textContent='Retry Download'}finally{if(button)button.disabled=false}}

function onCapture(event){
 if(event.type==='click'&&event.target?.closest?.('[data-reading-continue]')){const value=library();if(GENERIC_SHELVES.has(value.lastReadingType)&&value.lastReadingId){event.preventDefault();event.stopImmediatePropagation();openShelf(value.lastReadingType).then(()=>openReading(value.lastReadingId)).catch(error=>console.warn('Reading Garden Continue failed.',error));return}}
 if(!activeScreen)return;
 if(event.type==='click'&&event.target?.closest?.('[data-reading-back]')){event.preventDefault();event.stopImmediatePropagation();if(activeScreen==='reader'){showBrowser();renderBrowser()}else showHome();return}
 if(event.type==='click'&&event.target?.closest?.('[data-reading-close]')){activeShelf='';activeScreen='';currentRecord=null;searchQuery='';const screens=ensureScreens();if(screens){screens.browser.hidden=true;screens.reader.hidden=true}const home=document.getElementById('reading-garden-home');if(home)home.hidden=false}
}
function onClick(event){
 if(event.target.closest?.('[data-open-reading-garden]')){setTimeout(()=>{if(manifest)patchHome();else loadManifest().catch(()=>{})},0);return}
 const material=event.target.closest?.('[data-reading-material]');if(material){setTimeout(()=>{patchSelection();patchLibraryStrip()},0);return}
 const browse=event.target.closest?.('[data-sakura-browse-shelf]');if(browse){openShelf(browse.dataset.sakuraBrowseShelf).catch(error=>console.warn('Reading Garden shelf could not open.',error));return}
 const surprise=event.target.closest?.('[data-sakura-surprise-shelf]');if(surprise){openShelf(surprise.dataset.sakuraSurpriseShelf).then(()=>{const row=currentIndex[Math.floor(Math.random()*currentIndex.length)];if(row)return openReading(row.id)}).catch(error=>console.warn('Reading Garden surprise reading failed.',error));return}
 const open=event.target.closest?.('[data-sakura-open-reading]');if(open&&!event.target.closest('[data-sakura-save-reading]')){openReading(open.dataset.sakuraOpenReading).catch(error=>console.warn('Reading Garden reading could not open.',error));return}
 const save=event.target.closest?.('[data-sakura-save-reading]');if(save){event.preventDefault();event.stopPropagation();toggleSavedViaCore(save.dataset.sakuraSaveReading);if(activeScreen==='browser')renderBrowserResults();else renderReader();return}
 if(event.target.closest?.('[data-sakura-show-more]')){visibleCount+=PAGE_SIZE;renderBrowserResults();return}
 if(event.target.closest?.('[data-sakura-download-shelf]')){downloadShelf(event.target.closest('[data-sakura-download-shelf]'));return}
 if(event.target.closest?.('[data-sakura-translation]')){translationVisible=!translationVisible;renderReader();return}
 if(event.target.closest?.('[data-sakura-hear]')){speak();return}
 if(event.target.closest?.('[data-sakura-prev]')){move(-1);return}
 if(event.target.closest?.('[data-sakura-next]')){move(1);return}
 if(event.target.closest?.('[data-sakura-complete]')){markGenericComplete(currentRecord?.id);return}
 if(event.target.closest?.('[data-sakura-font-minus]')){adjustFont(-.1);return}
 if(event.target.closest?.('[data-sakura-font-plus]')){adjustFont(.1);return}
 if(event.target.closest?.('[data-sakura-leading]')){toggleLeading();return}
 if(event.target.closest?.('[data-sakura-start-over]')){startOver();return}
 const answerButton=event.target.closest?.('[data-sakura-answer]');if(answerButton){answer(Number(answerButton.dataset.sakuraAnswer));return}
 if(activeScreen&&event.target.closest?.('[data-reading-mode]'))setTimeout(()=>{if(activeScreen==='reader')renderReader()},0);
 if(activeScreen==='browser'&&event.target.closest?.('[data-reading-level]'))setTimeout(()=>{visibleCount=PAGE_SIZE;renderBrowserResults()},0);
 if(event.target.closest?.('[data-reading-save-article],[data-reading-save-story],[data-reading-complete]'))setTimeout(()=>{mergeGenericCompleted();patchLibraryStrip()},0);
}
function onInput(event){if(activeScreen==='browser'&&event.target?.id==='sakura-generic-search'){searchQuery=event.target.value;visibleCount=PAGE_SIZE;renderBrowserResults()}}
function onKey(event){if(activeScreen!=='browser'||!['Enter',' '].includes(event.key))return;const card=event.target.closest?.('[data-sakura-open-reading]');if(card&&!event.target.closest('[data-sakura-save-reading]')){event.preventDefault();openReading(card.dataset.sakuraOpenReading).catch(error=>console.warn('Reading Garden reading could not open.',error))}}
function style(){if(document.getElementById('sakura-reading-production-style'))return;const node=document.createElement('style');node.id='sakura-reading-production-style';node.textContent='.sakura-production-reading{content-visibility:auto;contain-intrinsic-size:150px}#sakura-reading-generic-reader .reading-reader-content{font-size:calc(1em * var(--sakura-reader-scale,1));line-height:var(--sakura-reader-leading,1.95)}#sakura-reading-generic-reader .reading-reader-paragraph{font-size:inherit!important;line-height:inherit!important}.sakura-reader-tools{display:grid;gap:9px;margin:12px 0;padding:11px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-surface)}.sakura-reader-progress{display:grid;gap:6px}.sakura-reader-progress>div:first-child{display:flex;justify-content:space-between;gap:10px;font-size:9px}.sakura-reader-progress-track{height:6px;overflow:hidden;border-radius:999px;background:var(--color-primary-soft)}.sakura-reader-progress-track i{display:block;height:100%;border-radius:inherit;background:var(--color-primary)}.sakura-reader-controls{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.sakura-reader-controls button{min-height:34px;padding:6px 9px;border:1px solid var(--color-border);border-radius:10px;background:var(--color-background);color:var(--color-text);font-size:8px;font-weight:850}.sakura-reader-controls span{min-width:36px;text-align:center;font-size:8px;color:var(--color-text-muted)}@media(max-width:420px){.sakura-reader-controls button{flex:1 1 auto}}';document.head.appendChild(node)}
function bind(){document.addEventListener('click',onCapture,true);document.addEventListener('click',onClick);document.addEventListener('input',onInput);document.addEventListener('keydown',onKey);document.getElementById('reading-garden-body')?.addEventListener('scroll',onScroll,{passive:true})}
async function init(){if(ready)return;const rg=window.SakuraReadingGarden;if(!rg){setTimeout(init,120);return}ready=true;style();ensureScreens();bind();mergeGenericCompleted();try{await loadManifest();patchHome()}catch(error){console.warn('Reading Garden production manifest is unavailable; the existing Article/Story runtime remains available.',error)}}
window.SakuraReadingQuality=Object.freeze({version:3.1,legacyCapRetired:true,loadManifest,openShelf,openReading,init,get learnerReadyCount(){return Number(manifest?.learnerReadyCount||0)},get activeShelf(){return activeShelf}});init();
}());
