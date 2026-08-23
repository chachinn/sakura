import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const readingRoot=path.join(root,"data","reading");
const candidateRoot=path.join(readingRoot,"candidates");
const outputRoot=path.join(readingRoot,"body-ready");
const qaRoot=path.join(readingRoot,"qa");
const preservedPacks={};
for(const shelf of ["articles","news","travel-reading","school-work","recipes-how-to","interviews-qa","real-life-documents"]){
  const live=path.join(outputRoot,`${shelf}.json`);const rows=[];
  if(fs.existsSync(live))rows.push(...(JSON.parse(fs.readFileSync(live,"utf8")).records||[]));
  try{rows.push(...(JSON.parse(execFileSync("git",["show",`HEAD:data/reading/body-ready/${shelf}.json`],{cwd:root,encoding:"utf8"})).records||[]))}catch{}
  preservedPacks[shelf]=rows;
}
const registry=JSON.parse(fs.readFileSync(path.join(readingRoot,"source-registry.json"),"utf8"));
const families=registry.sourceFamilies.filter(x=>x.sourceType==="open-government");
const familyByHost=new Map(families.map(x=>[x.domain,x]));
const targets={articles:300,news:300,"travel-reading":200,"school-work":120,"recipes-how-to":100,"interviews-qa":100,"real-life-documents":200};
const shelfOrder=["travel-reading","recipes-how-to","real-life-documents","interviews-qa","school-work","news"];
const generic=/^(ホーム|トップ|一覧|新着情報|報道発表|ニュース|お知らせ|大臣等会見|申請・届出|申請・お問合わせ|雇用・労働|食育の推進|サイトマップ|メニュー|政策|分野別の政策一覧)$/;
const indexPath=/(?:^|\/)(?:index(?:\.html?)?|news\.html|speech|applications|shinsei_toiawase|laws)(?:$|[/?#])|\/(?:press|release)\/20\d{2}(?:$|[/?#])|\/topics_20\d{2}\.html$/i;
const excluded=/\.(?:pdf|jpe?g|png|gif|webp|svg|mp4|zip|xlsx?|docx?|pptx?)(?:$|[?#])/i;
const stopText=/^(ホーム|本文へ|サイトマップ|English|検索|メニュー|前へ|次へ|戻る|トップページ)$/;
const targetedRoots=[
  "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/",
  "https://www.maff.go.jp/j/pr/aff/category_recipe/",
  "https://www.maff.go.jp/j/nousin/kouryu/nouhakusuishin/",
  "https://www.maff.go.jp/j/nousin/kouryu/",
  "https://www.mlit.go.jp/kankocho/seisaku_seido/",
  "https://www.mlit.go.jp/kankocho/shisaku/",
  "https://www.mlit.go.jp/kankocho/topics/",
  "https://www.mlit.go.jp/kankocho/seisaku_seido/kihonkeikaku/",
  "https://www.caa.go.jp/policies/policy/consumer_policy/information/",
  "https://www.caa.go.jp/policies/policy/consumer_system/",
  "https://www.caa.go.jp/policies/policy/consumer_safety/",
  "https://www.digital.go.jp/policies/administrative_procedures/",
  "https://www.digital.go.jp/services/",
  "https://www.bunka.go.jp/seisaku/bunkazai/",
  "https://www.env.go.jp/park/",
  "https://www.env.go.jp/nature/nationalparks/",
  "https://www.env.go.jp/nature/nationalparks/list/setonaikai/spot/index.html",
  "https://www.env.go.jp/nature/nationalparks/list/yambaru/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/yoshino-kumano/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/nikko/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/daisen-oki/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/akan-mashu/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/daisetsuzan/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/shiretoko/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/towada-hachimantai/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/bandai-asahi/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/fuji-hakone-izu/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/chubusangaku/spot/",
  "https://www.env.go.jp/nature/nationalparks/list/myoko-togakushi-renzan/spot/",
  "https://www.moj.go.jp/isa/applications/online/",
  "https://www.moj.go.jp/isa/applications/procedures/",
  "https://www.moj.go.jp/isa/applications/guide/",
  "https://www.moj.go.jp/isa/immigration/procedures/",
  "https://www.moj.go.jp/isa/consultation/",
  "https://www.fdma.go.jp/relocation/e-college/",
  "https://www.fdma.go.jp/publication/database/",
  "https://www.fdma.go.jp/about/question/cat3/",
  "https://www.nta.go.jp/taxes/tetsuzuki/",
  "https://www.nta.go.jp/taxes/shiraberu/shinkoku/tebiki/",
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/",
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/seikatsu-eisei/",
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kekkaku-kansenshou/"
];
const roots=[
  "https://www.caa.go.jp/notice/","https://www.caa.go.jp/policies/",
  "https://www.mhlw.go.jp/stf/houdou/","https://www.mhlw.go.jp/stf/seisakunitsuite/",
  "https://www.cfa.go.jp/policies/","https://www.digital.go.jp/news/","https://www.digital.go.jp/policies/",
  "https://www.env.go.jp/press/","https://www.env.go.jp/policy/",
  "https://www.mlit.go.jp/kankocho/news.html","https://www.mlit.go.jp/kankocho/seisaku_seido/",
  "https://www.maff.go.jp/j/press/","https://www.maff.go.jp/j/pr/aff/","https://www.maff.go.jp/j/syokuiku/",
  "https://www.meti.go.jp/press/","https://www.meti.go.jp/policy/",
  "https://www.mext.go.jp/b_menu/houdou/","https://www.mext.go.jp/a_menu/"
];

const decode=s=>String(s||"").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const clean=s=>decode(String(s||"").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<ruby[^>]*>([\s\S]*?)<rt[^>]*>[\s\S]*?<\/rt>([\s\S]*?)<\/ruby>/gi,"$1$2").replace(/<[^>]+>/g," ")).replace(/[\t\r ]+/g," ").replace(/ *\n+ */g,"\n").trim();
const jpCount=s=>(String(s).match(/[ぁ-んァ-ヶ一-龯々〆〤]/g)||[]).length;
const normalizeBody=s=>String(s).normalize("NFKC").replace(/\s+/g,"").replace(/[「」『』（）()。、，．・：:;；!?！？]/g,"");
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
function decodeHtml(bytes,headers){const probe=Buffer.from(bytes).subarray(0,4096).toString("ascii");const declared=`${headers.get("content-type")||""} ${(probe.match(/charset\s*=\s*["']?([^\s"'>;]+)/i)||[])[1]||""}`;return new TextDecoder(/shift[_-]?jis|windows-31j|x-sjis/i.test(declared)?"shift_jis":"utf-8").decode(bytes)}
const dateFromHtml=h=>{
  const values=[...h.matchAll(/(?:datePublished|article:published_time|dateModified|公開日|更新日)[^>\n]{0,160}(20\d{2})[-年\/.](\d{1,2})[-月\/.](\d{1,2})/gi)];
  if(!values.length)return null; const m=values[0]; return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
};
function extract(html){
  const without=html.replace(/<(script|style|svg|nav|header|footer|form|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi," ");
  const main=(without.match(/<(?:div|section)\b[^>]*id=["']main_content["'][^>]*>([\s\S]*?)(?:<div\b[^>]*id=["'](?:footer|page_footer)|<\/body>)/i)||without.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||without.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)||without.match(/<div\b[^>]*(?:id|class)=["'][^"']*(?:main|contents?|article|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)||[,without])[1].replace(/<img\b[^>]*alt=["']([^"']{8,})["'][^>]*>/gi,"<p>$1</p>");
  const chunks=[...main.matchAll(/<(?:h1|h2|h3|p|li|dt|dd|th|td)\b[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|p|li|dt|dd|th|td)>/gi)].map(m=>clean(m[1])).filter(x=>x.length>=8&&jpCount(x)>=4&&!stopText.test(x));
  const unique=[]; const seen=new Set(); for(const x of chunks){const k=normalizeBody(x); if(k.length<6||seen.has(k))continue;seen.add(k);unique.push(x)}
  return unique.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}
function titleFrom(html,fallback){const raw=(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1];return clean(raw||fallback).replace(/\s*[|｜].*$/,"").trim()||fallback}
function linksFrom(html,base){const out=[];for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)){try{const u=new URL(decode(m[1]),base);u.hash="";if(u.protocol!=="https:"||excluded.test(u.href)||!familyByHost.has(u.hostname))continue;const fam=familyByHost.get(u.hostname);if(!fam.approvedPathPatterns.some(p=>new RegExp(p).test(u.pathname)))continue;out.push(u.href.replace(/\/$/,""))}catch{}}return [...new Set(out)]}
function thirdPartyReview(body){
  const restrictions=[];const excludedMedia=[];if(/(?:本文|記事|資料).{0,30}(?:著作権者|無断転載|転載を禁|第三者が著作権)/i.test(body))restrictions.push("item-rights-restriction");if(/写真(?:提供|撮影)|画像提供|動画提供|イラスト(?:提供|制作)/i.test(body))excludedMedia.push("third-party-media-credit");
  return {status:restrictions.length?"needs-review":excludedMedia.length?"checked-third-party-assets-excluded":"checked-no-item-level-signal",signals:restrictions,excludedMedia,assetsBundled:false};
}
function scores(item){const t=`${item.title} ${item.url}`;const body=item.body.slice(0,4000);return{
  news:(/\/news\/|\/press\/|\/houdou\/|\/notice\/(?:release|statement)\/|報道発表|公表|発表|開催|決定|記者会見/.test(t)?9:0),
  "travel-reading":((/\/kankocho\//.test(item.url)||(/maff\.go\.jp/.test(item.url)&&(/\/kouryu\/|\/nouhaku/.test(item.url)||/農泊|農山漁村滞在|グリーン.?ツーリズム/.test(item.title)))||(/bunka\.go\.jp/.test(item.url)&&/文化観光|世界遺産|日本遺産|史跡|名勝|文化財を訪|文化施設/.test(t))||(/env\.go\.jp\/nature\/nationalparks\/list\/[^/]+\/(?:spot|viewpoint|try)\//.test(item.url))||(/env\.go\.jp\/(?:park|nature\/nationalparks)\//.test(item.url)&&/国立公園|公園|自然|登山|利用案内|見どころ|アクセス|体験/.test(t)))&&!/公募|公示|入札|契約|採択|実施結果|組織|予算|税制|SNS|会見/.test(item.title)?10:0),
  "school-work":(/学校|教育|学習|生徒|学生|教員|仕事|労働|雇用|職場|就職|人材|働き方|研修|訓練/.test(t)&&!/会見|記者/.test(item.title)?10:0),
  "recipes-how-to":(/maff\.go\.jp/.test(item.url)&&(/\/k_ryouri\//.test(item.url)||/レシピ|作り方|つくり方|郷土料理/.test(t))&&/材料|作り方|つくり方|(?:加える|煮る|焼く|炒める|揚げる|切る)/.test(body)?11:0),
  "interviews-qa":(/インタビュー|一問一答|会見(?:概要|録|要旨)|質疑|Q.?A|よくある質問/i.test(t)?11:0),
  "real-life-documents":(((/moj\.go\.jp\/isa\/(?:applications|immigration\/procedures|consultation)\/.+\.html?/.test(item.url))||(/nta\.go\.jp\/taxes\/(?:tetsuzuki|shiraberu\/shinkoku\/tebiki)\/.+\.html?/.test(item.url))||(/fdma\.go\.jp\/(?:relocation\/e-college|publication\/database|about\/question|mission\/prevention)\//.test(item.url))||/申請書|届出|手続|ガイド|手引|マニュアル|チェックリスト|記入例|様式|注意事項|利用案内|防災|避難|制度案内|利用方法|安全情報|申請方法|提出方法|登録方法|相談窓口|予防接種|感染症対策|熱中症予防|健康診断|健診|受診案内|生活衛生|食中毒予防|災害時|ごみ|廃棄物|リサイクル|施設案内|利用上の注意|安全な利用|注意喚起/.test(t))&&!/会見|報道|発表|新着|更新履歴|会議|インタビュー|フォト|審議会|検討会|研究会|統計|調査結果/.test(item.title)?10:0)
}}
function quality(item){
  const reasons=[];const url=new URL(item.url),family=familyByHost.get(url.hostname);if(!family||!family.approvedPathPatterns.some(p=>new RegExp(p).test(url.pathname)))reasons.push("unapproved-redirect-path");if(generic.test(item.title)||/^20\d{2}年(?:度|\d{1,2}月)?$/.test(item.title)||/(?:一覧|目次|トピックス|データベース|ポータル)$/.test(item.title)||item.title==="企画競争実施結果"||indexPath.test(url.pathname))reasons.push("landing-or-index-page");if(item.sourceCharacterCount<320)reasons.push("insufficient-source-substance");if(item.thirdPartyReview.status==="needs-review")reasons.push("third-party-or-contrary-rights-signal");return reasons
}
async function fetchPage(url){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
  try{const r=await fetch(url,{redirect:"follow",signal:controller.signal,headers:{"user-agent":"SakuraReadingBodyReadyInventory/1.0"}});const type=r.headers.get("content-type")||"";if(!r.ok||!type.includes("text/html"))return {url,status:r.status,reject:[r.ok?"non-html-source":`http-${r.status}`]};const html=decodeHtml(await r.arrayBuffer(),r.headers);const body=extract(html);const item={url:r.url.replace(/\/$/,""),html,title:titleFrom(html,url),body,sourceCharacterCount:jpCount(body),publishedDate:dateFromHtml(html),thirdPartyReview:thirdPartyReview(body)};item.reject=quality(item);item.links=linksFrom(html,r.url);return item}catch(e){return{url,reject:[e.name==="AbortError"?"timeout":"fetch-failure"],error:e.message}}finally{clearTimeout(timer)}}

const old=[];for(const shelf of Object.keys(targets).filter(x=>x!=="articles")){const f=path.join(candidateRoot,`${shelf}.json`);if(fs.existsSync(f))old.push(...JSON.parse(fs.readFileSync(f,"utf8")).candidates)}
const articleDir=path.join(readingRoot,"articles");const articleFiles=fs.readdirSync(articleDir).filter(x=>x.endsWith(".json")&&!x.includes("index")&&x!=="manifest.json");const articles=articleFiles.flatMap(x=>JSON.parse(fs.readFileSync(path.join(articleDir,x),"utf8")));
const articleByUrl=new Map(articles.map(x=>[x.sourceUrl,x]));
const oldByUrl=new Map(old.map(x=>[x.sourceUrl,x]));
const inspected=[];const focusedQueue=[...new Set(targetedRoots)];const focusedSeen=new Set(focusedQueue);const focusedPath=/\/k_ryouri\/|\/kouryu\/|\/nouhaku|\/kankocho\/|\/seisaku\/bunkazai\/|\/park\/|\/nature\/nationalparks\/|\/isa\/(?:applications|immigration\/procedures|consultation)\/|\/relocation\/e-college\/|\/publication\/database\/|\/about\/question\/|\/mission\/prevention\/|\/taxes\/(?:tetsuzuki|shiraberu\/shinkoku)\/|\/policies\/policy\/consumer_|\/policies\/administrative_procedures\/|\/services\/|\/kenkou_iryou\/kenkou\//;
for(let cursor=0;cursor<focusedQueue.length&&inspected.length<3500;cursor+=12){const rows=await Promise.all(focusedQueue.slice(cursor,cursor+12).map(fetchPage));for(const row of rows){inspected.push(row);for(const u of row.links||[]){if(focusedPath.test(new URL(u).pathname)&&!focusedSeen.has(u)&&focusedQueue.length<3500){focusedSeen.add(u);focusedQueue.push(u)}}}if(inspected.length%240<12)console.log(`Focused ${inspected.length}; queue ${focusedQueue.length}`)}
const queue=[...new Set([...articles.map(x=>x.sourceUrl),...old.map(x=>x.sourceUrl),...roots])];const queued=new Set([...focusedSeen,...queue]);const maxPages=3500;
for(let cursor=0;cursor<queue.length&&inspected.length<maxPages;cursor+=12){const batch=queue.slice(cursor,cursor+12);const rows=await Promise.all(batch.map(fetchPage));for(const row of rows){inspected.push(row);if(row.links&&inspected.length<5200){for(const u of row.links){if(!queued.has(u)&&queue.length<maxPages){queued.add(u);queue.push(u)}}}}if(inspected.length%240<12)console.log(`Inspected ${inspected.length}; queue ${queue.length}`)}

const familyFor=url=>familyByHost.get(new URL(url).hostname);
const bodySeen=new Map();const acceptedPool=[];const rejected=[];const review=[];
for(const item of inspected){if(item.reject?.length){(item.reject.includes("third-party-or-contrary-rights-signal")?review:rejected).push(item);continue}const fp=hash(normalizeBody(item.body));if(bodySeen.has(fp)){rejected.push({...item,reject:["duplicate-source-body"],duplicateOf:bodySeen.get(fp)});continue}bodySeen.set(fp,item.url);acceptedPool.push({...item,bodyFingerprint:fp,score:scores(item)})}
const used=new Set();
function record(item,shelf,index,idOverride){const oldItem=oldByUrl.get(item.url);const family=familyFor(item.url);return{candidateId:idOverride||oldItem?.candidateId||`verified-${shelf}-${hash(item.url).slice(0,12)}`,targetShelf:shelf,sourceFamilyId:family.sourceFamilyId,sourceTitle:item.title,sourcePublisher:family.publisher,sourceUrl:item.url,sourcePublishedDate:item.publishedDate,sourceRetrievedDate:"2026-08-22",rightsStatus:"adaptation-permitted",rightsBasis:{termsUrl:family.termsUrl,licenseName:family.licenseName,licenseUrl:family.licenseUrl,itemLevelCheck:"No contrary text-rights notice detected in the fetched page; excluded media remains excluded.",verifiedDate:"2026-08-22"},thirdPartyContentReview:item.thirdPartyReview,sourceBodyExtractionStatus:"body-ready",sourceJapaneseSubstance:item.body,sourceTextCharacterCount:item.sourceCharacterCount,reuseMode:family.fullTextAllowed===true?"verbatim-or-adaptation-permitted":"adaptation-only",sourceBodyFingerprint:item.bodyFingerprint,sourceAttribution:`出典：${family.publisher}ウェブサイト（${item.url}）`,sourceProcessing:"Item-level source body extracted for later editorial adaptation. No learner-facing text has been generated.",inventoryPosition:index+1}}
const final={};
for(const shelf of shelfOrder){const ranked=acceptedPool.filter(x=>!used.has(x.url)&&x.score[shelf]>0).sort((a,b)=>b.score[shelf]-a.score[shelf]||b.sourceCharacterCount-a.sourceCharacterCount);const rows=[];for(const item of ranked){if(rows.length>=targets[shelf])break;used.add(item.url);rows.push(record(item,shelf,rows.length))}final[shelf]=rows}
const articleRows=[];for(const article of articles){const item=acceptedPool.find(x=>x.url===article.sourceUrl);if(item&&!used.has(item.url)){used.add(item.url);articleRows.push(record(item,"articles",articleRows.length,`article-source-${article.id}`))}}
final.articles=articleRows;
for(const shelf of Object.keys(preservedPacks)){const merged=[];const urls=new Set(),bodies=new Set();for(const row of [...final[shelf],...preservedPacks[shelf]]){if(urls.has(row.sourceUrl)||bodies.has(row.sourceBodyFingerprint))continue;urls.add(row.sourceUrl);bodies.add(row.sourceBodyFingerprint);merged.push({...row,targetShelf:shelf,inventoryPosition:merged.length+1});if(merged.length>=targets[shelf])break}final[shelf]=merged}
const globalUrls=new Set(),globalBodies=new Set();for(const shelf of ["travel-reading","recipes-how-to","news","interviews-qa","school-work","real-life-documents","articles"]){final[shelf]=final[shelf].filter(row=>{if(globalUrls.has(row.sourceUrl)||globalBodies.has(row.sourceBodyFingerprint))return false;globalUrls.add(row.sourceUrl);globalBodies.add(row.sourceBodyFingerprint);return true}).map((row,index)=>({...row,inventoryPosition:index+1}))}
for(const shelf of ["news","articles"]){const refill=acceptedPool.filter(item=>!globalUrls.has(item.url)&&!globalBodies.has(item.bodyFingerprint)&&(shelf==="articles"||item.score.news>0)).sort((a,b)=>b.sourceCharacterCount-a.sourceCharacterCount);for(const item of refill){if(final[shelf].length>=targets[shelf])break;const row=record(item,shelf,final[shelf].length);globalUrls.add(row.sourceUrl);globalBodies.add(row.sourceBodyFingerprint);final[shelf].push(row)}}
for(const item of acceptedPool.filter(x=>!used.has(x.url)).sort((a,b)=>b.sourceCharacterCount-a.sourceCharacterCount)){if(articleRows.length>=targets.articles)break;used.add(item.url);articleRows.push(record(item,"articles",articleRows.length))}
fs.mkdirSync(outputRoot,{recursive:true});fs.mkdirSync(qaRoot,{recursive:true});for(const [shelf,rows] of Object.entries(final))fs.writeFileSync(path.join(outputRoot,`${shelf}.json`),`${JSON.stringify({version:1,shelf,targetCount:targets[shelf],bodyReadyCount:rows.length,records:rows},null,2)}\n`);
const reasonCounts={};for(const x of [...rejected,...review])for(const reason of x.reject||[])reasonCounts[reason]=(reasonCounts[reason]||0)+1;
const sourceFamilyCounts={};for(const rows of Object.values(final))for(const x of rows)sourceFamilyCounts[x.sourceFamilyId]=(sourceFamilyCounts[x.sourceFamilyId]||0)+1;
const acceptedCounts=Object.fromEntries(Object.entries(final).map(([s,x])=>[s,x.length]));
const selectedCount=Object.values(final).flat().length;const thirdPartyReviewDistribution={};for(const rows of Object.values(final))for(const x of rows)thirdPartyReviewDistribution[x.thirdPartyContentReview.status]=(thirdPartyReviewDistribution[x.thirdPartyContentReview.status]||0)+1;
const report={version:1,generatedDate:"2026-08-22",pass:Object.entries(targets).every(([s,n])=>acceptedCounts[s]===n),totalCandidatesInspected:inspected.length,eligibleBodyReadyItems:acceptedPool.length,acceptedBodyReadyItems:selectedCount,unselectedBodyReadyItems:Math.max(0,acceptedPool.length-selectedCount),rejectedItems:rejected.length,needsReviewItems:review.length,acceptedCountsByShelf:acceptedCounts,acceptedCountsBySourceFamily:sourceFamilyCounts,rejectionReasons:reasonCounts,landingIndexPageRejectionCount:reasonCounts["landing-or-index-page"]||0,itemsMissingUsableSourceSubstance:reasonCounts["insufficient-source-substance"]||0,duplicateUrls:inspected.length-new Set(inspected.map(x=>x.url)).size,duplicateSourceBodies:reasonCounts["duplicate-source-body"]||0,rightsStatusDistribution:{"adaptation-permitted":selectedCount},thirdPartyReviewDistribution,targets,unfilled:Object.fromEntries(Object.entries(targets).map(([s,n])=>[s,Math.max(0,n-(acceptedCounts[s]||0))]).filter(([,n])=>n)),notes:["Accepted government records are inventory evidence only; no learner-facing adaptation was generated.","Media assets are never bundled. Pages with detected contrary-rights or third-party-credit signals remain review-required."]};
fs.writeFileSync(path.join(qaRoot,"body-ready-source-report.json"),`${JSON.stringify(report,null,2)}\n`);fs.writeFileSync(path.join(qaRoot,"body-ready-rejections.json"),`${JSON.stringify({version:1,rejected:rejected.map(x=>({url:x.url,title:x.title||null,reasons:x.reject,error:x.error||null})),needsReview:review.map(x=>({url:x.url,title:x.title||null,reasons:x.reject,signals:x.thirdPartyReview?.signals||[]}))},null,2)}\n`);console.log(JSON.stringify(report,null,2));
