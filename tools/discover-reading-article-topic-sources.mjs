import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const articleRoot = path.join(readingRoot, "articles");
const qaRoot = path.join(readingRoot, "qa");
const registry = JSON.parse(fs.readFileSync(path.join(readingRoot, "source-registry.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(articleRoot, "manifest.json"), "utf8"));
const existingBodyReady = JSON.parse(fs.readFileSync(path.join(readingRoot, "body-ready", "articles.json"), "utf8"));
const reservedCrossShelfUrls = new Set();
const reservedCrossShelfBodies = new Set();
for (const name of fs.readdirSync(path.join(readingRoot, "body-ready")).filter((name) => name.endsWith(".json") && name !== "articles.json")) {
  const pack = JSON.parse(fs.readFileSync(path.join(readingRoot, "body-ready", name), "utf8"));
  for (const row of pack.records || []) {
    if (row.sourceUrl) reservedCrossShelfUrls.add(row.sourceUrl);
    if (row.sourceBodyFingerprint) reservedCrossShelfBodies.add(row.sourceBodyFingerprint);
  }
}
const TODAY = "2026-08-22";
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const TOPICS = ["beauty", "food", "travel", "digital", "consumer", "health", "environment", "culture", "work", "society"];
const TARGET_PER_TOPIC = 30;
const MIN_JP = 350;
const MIN_TOPIC_SCORE = 12;
const MAX_BEST_TOPIC_GAP = 10;
const MAX_FETCHES_PER_TOPIC = 900;
const MAX_CANDIDATES_PER_TOPIC = 75;
const MAX_BYTES = 2_200_000;
const CONCURRENCY = 8;
const genericTitle = /^(ホーム|トップ|一覧|目次|サイトマップ|新着情報|報道発表|ニュース|お知らせ|政策|分野別の政策一覧|メニュー)$/;
const excluded = /\.(?:pdf|jpe?g|png|gif|webp|svg|mp4|zip|xlsx?|docx?|pptx?|csv)(?:$|[?#])/i;
const stopText = /^(ホーム|本文へ|サイトマップ|English|検索|メニュー|前へ|次へ|戻る|トップページ)$/;
const rightsRestriction = /(?:本文|記事|資料|コンテンツ).{0,45}(?:著作権者|無断転載|転載を禁|第三者が著作権)/i;
const mediaCredit = /写真(?:提供|撮影)|画像提供|動画提供|イラスト(?:提供|制作)|出典：地理院地図/i;

const TOPIC_RULES = {
  beauty: [["化粧",10],["美容",10],["美容医療",14],["美容師",12],["美容所",11],["理容師",9],["理容",7],["香粧",10],["スキンケア",10],["コスメ",10],["毛髪",8],["ヘア",7],["シャンプー",7],["医薬部外品",5],["染毛",9],["まつ毛",10],["エクステ",9],["日焼け止め",8],["成分",3]],
  food: [["食育",10],["食品",8],["食事",8],["食料",8],["栄養",8],["食中毒",8],["飲食",7],["農業",6],["農林",6],["給食",6],["食品ロス",9],["賞味期限",8],["消費期限",8],["食品表示",9]],
  travel: [["観光",10],["旅行",10],["宿泊",9],["訪日",9],["旅行者",9],["旅客",8],["空港",8],["鉄道",8],["交通",7],["国立公園",8],["観光地",9],["ホテル",7],["旅",4],["インバウンド",8]],
  digital: [["デジタル",10],["生成AI",10],["人工知能",10],["AI",8],["オンライン",8],["電子",6],["情報システム",9],["サイバー",9],["データ",7],["DX",8],["マイナンバー",9],["アプリ",6],["システム",5],["ICT",8]],
  consumer: [["消費者",10],["消費生活",10],["消費",7],["契約",8],["取引",8],["詐欺",9],["通販",8],["通信販売",9],["製品事故",9],["リコール",9],["回収",6],["価格",5],["広告",6],["購入",5],["景品表示",9]],
  health: [["健康",10],["医療",10],["疾病",9],["感染",9],["熱中症",9],["健診",9],["検診",9],["病院",8],["診療",8],["医薬品",8],["予防",7],["ワクチン",9],["介護",7],["生活習慣病",9],["患者",7],["保健",7],["衛生",6]],
  environment: [["環境",10],["気候",9],["脱炭素",9],["生物多様",9],["廃棄",8],["リサイクル",9],["循環",7],["自然",6],["水質",8],["大気",7],["温室効果",9],["エネルギー",6],["資源",6],["自然公園",7]],
  culture: [["文化",10],["芸術",10],["著作権",10],["博物館",9],["美術館",9],["文化財",10],["日本遺産",9],["漫画",9],["マンガ",9],["音楽",7],["映画",7],["伝統",7],["文学",8],["展覧会",8],["国語",6],["日本語",5]],
  work: [["労働",10],["雇用",10],["職場",9],["求人",9],["仕事",8],["賃金",9],["働",7],["事業者",6],["企業",6],["産業",6],["人材",7],["生産性",8],["就業",8],["就職",8],["勤務",8],["職業",8],["安全衛生",7]],
  society: [["子ども",10],["こども",10],["子育て",10],["家庭",8],["福祉",9],["社会",7],["自治体",6],["人口",7],["少子",9],["若者",8],["児童",9],["保育",9],["支援",5],["障害",8],["生活支援",8],["ひとり親",9],["母子",8],["高齢",7]],
};

const FAMILY_PRIORS = {
  "gov-caa": { beauty:4, food:5, consumer:10, health:2 },
  "gov-mhlw": { beauty:5, health:10, work:7, society:5, food:2 },
  "gov-pmda": { beauty:14, health:4 },
  "gov-egov-law": { beauty:16 },
  "gov-maff": { food:10, environment:4, work:2, travel:2 },
  "gov-jta": { travel:12 },
  "gov-mlit": { travel:7, work:2 },
  "gov-digital": { digital:12, society:2 },
  "gov-meti": { digital:6, consumer:4, environment:4, work:8 },
  "gov-env": { environment:12, travel:4 },
  "gov-bunka": { culture:14 },
  "gov-mext": { culture:7, society:3, work:2 },
  "gov-cfa": { society:14 },
};

const TOPIC_CONFIG = {
  beauty: {
    families:["gov-mhlw","gov-caa","gov-pmda","gov-egov-law"],
    roots:[
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iyakuhin/keshouhin/index.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iyakuhin/index.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000123853.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000124086.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/seikatsu-eisei/seikatsu-eisei03/06.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou/riyoushi/index.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000124874.html",
      "https://www.mhlw.go.jp/stf/shingi/shingi-kousei_127723_00001.html",
      "https://www.mhlw.go.jp/stf/shingi-yakuji_39210.html",
      "https://www.mhlw.go.jp/stf/shingi/other-isei_436723_00013.html",
      "https://www.mhlw.go.jp/stf/newpage_65283.html",
      "https://www.pmda.go.jp/review-services/drug-reviews/about-reviews/q-drugs/0002.html",
      "https://www.pmda.go.jp/review-services/drug-reviews/about-reviews/q-drugs/0003.html",
      "https://www.pmda.go.jp/review-services/drug-reviews/about-reviews/q-drugs/0004.html",
      "https://www.pmda.go.jp/review-services/drug-reviews/about-reviews/q-drugs/0005.html",
      "https://www.pmda.go.jp/review-services/drug-reviews/about-reviews/q-drugs/0006.html",
      "https://www.pmda.go.jp/safety/info-services/qdrugs-cosmetics/0001.html",
      "https://www.pmda.go.jp/safety/info-services/qdrugs-cosmetics/0002.html",
      "https://www.pmda.go.jp/safety/info-services/qdrugs-cosmetics/0003.html",
      "https://www.pmda.go.jp/safety/info-services/qdrugs-cosmetics/0004.html",
      "https://www.pmda.go.jp/safety/reports/mah/0005.html",
      "https://www.pmda.go.jp/safety/consultation-for-mah/0004.html",
      "https://www.pmda.go.jp/review-services/f2f-pre/consultations/0017.html",
      "https://www.pmda.go.jp/review-services/f2f-pre/consultations/0067.html",
      "https://www.pmda.go.jp/review-services/symposia/0174.html",
      "https://www.caa.go.jp/business/labeling/",
      "https://www.caa.go.jp/policies/policy/representation/household_goods/",
      "https://laws.e-gov.go.jp/api/1/lawdata/332AC1000000163",
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tb8904&dataType=1&pageNo=1",
      "https://www.mhlw.go.jp/web/t_doc?dataId=00td0052&dataType=1&pageNo=1",
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc1147&dataType=1&pageNo=1",
      "https://www.mhlw.go.jp/web/t_doc?dataId=79081000",
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9325&dataType=1&pageNo=1",
      "https://www.mhlw.go.jp/stf/newpage_68162.html",
      "https://www.mhlw.go.jp/stf/newpage_04978.html",
      "https://www.pmda.go.jp/pnavi-07.html",
      "https://www.caa.go.jp/policies/policy/consumer_policy/information/information_002",
      "https://www.caa.go.jp/policies/policy/consumer_safety/child/project_001/mail/20240328/"
    ]
  },
  food: {
    families:["gov-maff","gov-caa"],
    roots:[
      "https://www.maff.go.jp/j/syokuiku/",
      "https://www.maff.go.jp/j/press/syouan/",
      "https://www.maff.go.jp/j/press/shokuhin/",
      "https://www.caa.go.jp/policies/policy/food_labeling/",
      "https://www.caa.go.jp/policies/policy/consumer_safety/food_safety/",
      "https://www.caa.go.jp/business/labeling/"
    ]
  },
  travel: {
    families:["gov-jta","gov-mlit","gov-env"],
    roots:[
      "https://www.mlit.go.jp/kankocho/seisaku_seido/",
      "https://www.mlit.go.jp/kankocho/shisaku/",
      "https://www.mlit.go.jp/kankocho/topics/",
      "https://www.mlit.go.jp/kankocho/news.html",
      "https://www.env.go.jp/nature/nationalparks/"
    ]
  },
  digital: {
    families:["gov-digital","gov-meti"],
    roots:[
      "https://www.digital.go.jp/policies/",
      "https://www.digital.go.jp/news/",
      "https://www.digital.go.jp/services/",
      "https://www.meti.go.jp/policy/it_policy/",
      "https://www.meti.go.jp/policy/mono_info_service/"
    ]
  },
  consumer: {
    families:["gov-caa","gov-meti"],
    roots:[
      "https://www.caa.go.jp/policies/",
      "https://www.caa.go.jp/notice/",
      "https://www.caa.go.jp/policies/policy/consumer_safety/",
      "https://www.caa.go.jp/policies/policy/consumer_transaction/",
      "https://www.caa.go.jp/policies/policy/representation/"
    ]
  },
  health: {
    families:["gov-mhlw","gov-caa"],
    roots:[
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kekkaku-kansenshou/",
      "https://www.mhlw.go.jp/stf/houdou/",
      "https://www.caa.go.jp/policies/policy/consumer_safety/"
    ]
  },
  environment: {
    families:["gov-env","gov-maff","gov-meti"],
    roots:[
      "https://www.env.go.jp/policy/",
      "https://www.env.go.jp/press/",
      "https://www.env.go.jp/nature/",
      "https://www.env.go.jp/earth/",
      "https://www.env.go.jp/recycle/",
      "https://www.maff.go.jp/j/kanbo/kankyo/",
      "https://www.meti.go.jp/policy/energy_environment/"
    ]
  },
  culture: {
    families:["gov-bunka","gov-mext"],
    roots:[
      "https://www.bunka.go.jp/seisaku/",
      "https://www.bunka.go.jp/seisaku/geijutsubunka/",
      "https://www.bunka.go.jp/seisaku/bunkazai/",
      "https://www.bunka.go.jp/seisaku/chosakuken/",
      "https://www.bunka.go.jp/seisaku/kokugo_nihongo/",
      "https://www.bunka.go.jp/seisaku/bunka_gyosei/",
      "https://www.mext.go.jp/a_menu/"
    ]
  },
  work: {
    families:["gov-mhlw","gov-meti"],
    roots:[
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/",
      "https://www.meti.go.jp/policy/economy/jinzai/",
      "https://www.meti.go.jp/policy/mono_info_service/"
    ]
  },
  society: {
    families:["gov-cfa","gov-mhlw","gov-digital"],
    roots:[
      "https://www.cfa.go.jp/policies/",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kodomo/",
      "https://www.digital.go.jp/policies/"
    ]
  },
};

const governmentFamilies = registry.sourceFamilies.filter((family) => family.sourceType === "open-government");
const familyById = new Map(governmentFamilies.map((family) => [family.sourceFamilyId, family]));
const familiesByHost = new Map();
for (const family of governmentFamilies) {
  if (!familiesByHost.has(family.domain)) familiesByHost.set(family.domain, []);
  familiesByHost.get(family.domain).push(family);
}

const decode = (value) => String(value || "")
  .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n))
  .replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const clean = (value) => decode(String(value || "").replace(/<br\s*\/?\s*>/gi,"\n")
  .replace(/<ruby[^>]*>([\s\S]*?)<rt[^>]*>[\s\S]*?<\/rt>([\s\S]*?)<\/ruby>/gi,"$1$2")
  .replace(/<[^>]+>/g," ")).replace(/[\t\r ]+/g," ").replace(/ *\n+ */g,"\n").trim();
const jpCount = (value) => (String(value).match(/[ぁ-んァ-ヶ一-龯々〆〤]/g) || []).length;
const normalizeBody = (value) => String(value).normalize("NFKC").replace(/\s+/g,"").replace(/[「」『』（）()。、，．・：:;；!?！？]+/g,"");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalizeText = (value) => String(value || "").normalize("NFKC").toLowerCase();

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.replace(/\/+$/, "/");
    return url.toString();
  } catch { return ""; }
}
function familyForUrl(value, allowedIds = null) {
  let url;
  try { url = new URL(value); } catch { return null; }
  const matches = (familiesByHost.get(url.hostname) || []).filter((family) => {
    if (allowedIds && !allowedIds.includes(family.sourceFamilyId)) return false;
    return (family.approvedPathPatterns || []).some((pattern) => new RegExp(pattern).test(url.pathname));
  });
  if (!matches.length) return null;
  if (url.hostname === "www.mlit.go.jp" && url.pathname.startsWith("/kankocho/")) {
    const jta = matches.find((family) => family.sourceFamilyId === "gov-jta");
    if (jta) return jta;
  }
  return matches.sort((a,b) => Number(b.adaptationAllowed === true) - Number(a.adaptationAllowed === true) || a.sourceFamilyId.localeCompare(b.sourceFamilyId))[0];
}
function dateFromHtml(html) {
  const match = html.match(/(?:datePublished|article:published_time|dateModified|公開日|更新日)[^>\n]{0,180}(20\d{2})[-年\/.](\d{1,2})[-月\/.](\d{1,2})/i);
  return match ? `${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}` : null;
}
function decodeHtml(bytes, headers) {
  const probe = Buffer.from(bytes).subarray(0,4096).toString("ascii");
  const declared = `${headers.get("content-type") || ""} ${(probe.match(/charset\s*=\s*["']?([^\s"'>;]+)/i) || [])[1] || ""}`;
  return new TextDecoder(/shift[_-]?jis|windows-31j|x-sjis/i.test(declared) ? "shift_jis" : "utf-8").decode(bytes);
}
function extractBody(html) {
  const without = html.replace(/<(script|style|svg|nav|header|footer|form|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi," ");
  const main = (without.match(/<(?:div|section)\b[^>]*id=["']main_content["'][^>]*>([\s\S]*?)(?:<div\b[^>]*id=["'](?:footer|page_footer)|<\/body>)/i)
    || without.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
    || without.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)
    || without.match(/<div\b[^>]*(?:id|class)=["'][^"']*(?:main|contents?|article|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    || [,without])[1];
  const chunks = [...main.matchAll(/<(?:h1|h2|h3|p|li|dt|dd|th|td)\b[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|p|li|dt|dd|th|td)>/gi)]
    .map((match) => clean(match[1])).filter((text) => text.length >= 8 && jpCount(text) >= 4 && !stopText.test(text));
  const out = []; const seen = new Set();
  for (const text of chunks) {
    const key = normalizeBody(text);
    if (key.length < 6 || seen.has(key)) continue;
    seen.add(key); out.push(text);
  }
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}
function titleFromHtml(html, fallback) {
  const raw = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  return clean(raw || fallback).replace(/\s*[|｜].*$/,"").trim() || fallback;
}
function termHits(text, term) {
  const needle = normalizeText(term); let count = 0; let cursor = 0;
  while (needle && cursor < text.length) {
    const at = text.indexOf(needle, cursor); if (at < 0) break; count += 1; cursor = at + needle.length;
  }
  return count;
}
function topicScoreParts(item, topic) {
  const title = normalizeText(item.title); const body = normalizeText(item.body).slice(0,10000); const url = normalizeText(item.url);
  let score = Number(FAMILY_PRIORS[item.family.sourceFamilyId]?.[topic] || 0); const evidence = [];
  for (const [term, weight] of TOPIC_RULES[topic]) {
    const titleHits = termHits(title, term); const bodyHits = Math.min(4, termHits(body, term)); const urlHits = termHits(url, term);
    if (!titleHits && !bodyHits && !urlHits) continue;
    const contribution = titleHits * weight * 4 + bodyHits * weight + urlHits * Math.max(1, Math.floor(weight / 2));
    score += contribution; evidence.push({term,titleHits,bodyHits,urlHits,contribution});
  }
  if (item.seedTopics?.has(topic)) { score += 18; evidence.push({term:"legacy-topic-seed",titleHits:0,bodyHits:0,urlHits:0,contribution:18}); }
  return { score, evidence:evidence.sort((a,b)=>b.contribution-a.contribution).slice(0,8) };
}
function allTopicScores(item) {
  return Object.fromEntries(TOPICS.map((topic) => [topic, topicScoreParts(item, topic)]));
}
function linkHint(text, url, topic) {
  const probe = normalizeText(`${text} ${url}`); let score = 0;
  for (const [term, weight] of TOPIC_RULES[topic]) if (probe.includes(normalizeText(term))) score += weight;
  return score;
}
function beautyStrongEvidence(part, seed) {
  if (seed) return true;
  return (part?.evidence || []).some((row) => row.term !== "legacy-topic-seed" && (row.titleHits > 0 || row.urlHits > 0));
}
function linksFrom(html, baseUrl, topic, allowedFamilies, depth) {
  const out = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(decode(match[1]), baseUrl); url.hash = "";
      if (url.protocol !== "https:" || excluded.test(url.href)) continue;
      const family = familyForUrl(url.href, allowedFamilies); if (!family) continue;
      const anchor = clean(match[2]);
      const hint = linkHint(anchor, url.href, topic);
      if (depth >= 1 && hint <= 0 && !url.pathname.startsWith(new URL(baseUrl).pathname.replace(/[^/]*$/, ""))) continue;
      out.push({url:normalizeUrl(url.href),hint,anchor});
    } catch {}
  }
  const unique = new Map();
  for (const row of out) if (row.url && (!unique.has(row.url) || row.hint > unique.get(row.url).hint)) unique.set(row.url,row);
  return [...unique.values()].sort((a,b)=>b.hint-a.hint || a.url.localeCompare(b.url)).slice(0, depth === 0 ? 140 : 55);
}
function review(body) {
  const restrictions = rightsRestriction.test(body) ? ["item-rights-restriction"] : [];
  const excludedMedia = mediaCredit.test(body) ? ["third-party-media-credit"] : [];
  return {status:restrictions.length?"needs-review":excludedMedia.length?"checked-third-party-assets-excluded":"checked-no-item-level-signal",signals:restrictions,excludedMedia,assetsBundled:false};
}

const fetchCache = new Map();
async function fetchPage(url, allowedFamilies) {
  const key = normalizeUrl(url); if (!key) return {ok:false,url,error:"invalid-url"};
  if (fetchCache.has(key)) return fetchCache.get(key);
  const task = (async () => {
    const family = familyForUrl(key, allowedFamilies); if (!family) return {ok:false,url:key,error:"unapproved-family-or-path"};
    const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(),16000);
    try {
      const response = await fetch(key,{redirect:"follow",signal:controller.signal,headers:{"user-agent":"SakuraReadingGardenTopicSourceAudit/1.1","accept":"text/html,application/xhtml+xml"}});
      if (!response.ok) return {ok:false,url:key,error:`http-${response.status}`};
      const finalUrl = normalizeUrl(response.url); const finalFamily = familyForUrl(finalUrl,allowedFamilies);
      if (!finalFamily) return {ok:false,url:key,error:"redirect-outside-approved-family"};
      const type = response.headers.get("content-type") || ""; const egovXml = finalFamily.sourceFamilyId === "gov-egov-law" && /xml/i.test(type); if (!/text\/html|application\/xhtml\+xml/i.test(type) && !egovXml) return {ok:false,url:finalUrl,error:"non-html"};
      const length = Number(response.headers.get("content-length") || 0); if (length > MAX_BYTES) return {ok:false,url:finalUrl,error:"too-large"};
      const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.length > MAX_BYTES) return {ok:false,url:finalUrl,error:"too-large"};
      const html = decodeHtml(bytes,response.headers); const body = egovXml ? clean(html.replace(/<[^>]+>/g," ")) : extractBody(html); const title = egovXml ? clean((html.match(/<LawTitle[^>]*>([\s\S]*?)<\/LawTitle>/i)||[])[1] || "美容師法") : titleFromHtml(html,new URL(finalUrl).pathname.split("/").filter(Boolean).at(-1)||finalFamily.name);
      return {ok:true,url:finalUrl,family:finalFamily,title,body,html,publishedDate:dateFromHtml(html)};
    } catch (error) {
      return {ok:false,url:key,error:error instanceof DOMException && error.name==="AbortError"?"timeout":"fetch-failed"};
    } finally { clearTimeout(timer); }
  })();
  fetchCache.set(key,task); return task;
}

const articleRows = [];
for (const level of LEVELS) for (const file of manifest.levelFiles?.[level] || []) {
  for (const row of JSON.parse(fs.readFileSync(path.join(articleRoot,file),"utf8"))) articleRows.push(row);
}
const seedTopicsByUrl = new Map();
for (const row of articleRows) {
  const url = normalizeUrl(row.sourceUrl); if (!url) continue;
  if (!seedTopicsByUrl.has(url)) seedTopicsByUrl.set(url,new Set()); seedTopicsByUrl.get(url).add(row.topic);
}

const candidateByUrl = new Map(); const candidateFingerprintToUrl = new Map(); const rejected = [];
function considerCandidate(page, discoveredForTopic, sourceKind) {
  if (!page.ok) return false;
  const title = page.title; const body = page.body; const chars = jpCount(body);
  if (!body || chars < MIN_JP) { rejected.push({url:page.url,topic:discoveredForTopic,reason:`thin-${chars}`}); return false; }
  if (genericTitle.test(title)) { rejected.push({url:page.url,topic:discoveredForTopic,reason:"generic-title"}); return false; }
  const thirdPartyContentReview = review(body); if (thirdPartyContentReview.status === "needs-review") { rejected.push({url:page.url,topic:discoveredForTopic,reason:"rights-signal"}); return false; }
  const fingerprint = sha256(normalizeBody(body));
  if (reservedCrossShelfUrls.has(page.url)) { rejected.push({url:page.url,topic:discoveredForTopic,reason:"cross-shelf-duplicate-url"}); return false; }
  if (reservedCrossShelfBodies.has(fingerprint)) { rejected.push({url:page.url,topic:discoveredForTopic,reason:"cross-shelf-duplicate-body"}); return false; }
  const existingFingerprintUrl = candidateFingerprintToUrl.get(fingerprint);
  if (existingFingerprintUrl && existingFingerprintUrl !== page.url) { rejected.push({url:page.url,topic:discoveredForTopic,reason:"duplicate-body",duplicateOf:existingFingerprintUrl}); return false; }
  let candidate = candidateByUrl.get(page.url);
  if (!candidate) {
    candidate = {url:page.url,title,body,sourceTextCharacterCount:chars,publishedDate:page.publishedDate,family:page.family,thirdPartyContentReview,sourceBodyFingerprint:fingerprint,seedTopics:seedTopicsByUrl.get(page.url)||new Set(),discoveredFor:new Set(),sourceKinds:new Set()};
    candidateByUrl.set(page.url,candidate); candidateFingerprintToUrl.set(fingerprint,page.url);
  }
  candidate.discoveredFor.add(discoveredForTopic); candidate.sourceKinds.add(sourceKind); candidate.scores = allTopicScores(candidate);
  return true;
}

for (const row of existingBodyReady.records || []) {
  const family = familyById.get(row.sourceFamilyId); if (!family) continue;
  const item = {url:normalizeUrl(row.sourceUrl),title:row.sourceTitle,body:row.sourceJapaneseSubstance,sourceTextCharacterCount:Number(row.sourceTextCharacterCount)||jpCount(row.sourceJapaneseSubstance),publishedDate:row.sourcePublishedDate||null,family,thirdPartyContentReview:row.thirdPartyContentReview||review(row.sourceJapaneseSubstance),sourceBodyFingerprint:row.sourceBodyFingerprint||sha256(normalizeBody(row.sourceJapaneseSubstance)),seedTopics:seedTopicsByUrl.get(normalizeUrl(row.sourceUrl))||new Set(),discoveredFor:new Set(),sourceKinds:new Set(["existing-body-ready"])};
  if (!item.url || item.sourceTextCharacterCount < MIN_JP || item.thirdPartyContentReview.status === "needs-review") continue;
  if (candidateFingerprintToUrl.has(item.sourceBodyFingerprint) && candidateFingerprintToUrl.get(item.sourceBodyFingerprint)!==item.url) continue;
  item.scores=allTopicScores(item); candidateByUrl.set(item.url,item); candidateFingerprintToUrl.set(item.sourceBodyFingerprint,item.url);
}

async function crawlTopic(topic) {
  const config = TOPIC_CONFIG[topic]; const queue=[]; const queued=new Set(); const visited=new Set(); let acceptedForTopic=0; let fetches=0;
  function enqueue(url,depth=0,kind="root",hint=0) { const normalized=normalizeUrl(url); if(!normalized||queued.has(normalized)||visited.has(normalized))return; if(!familyForUrl(normalized,config.families))return; queued.add(normalized); queue.push({url:normalized,depth,kind,hint}); }
  for (const rootUrl of config.roots) enqueue(rootUrl,0,"topic-root",20);
  for (const [url,topics] of seedTopicsByUrl) if (topics.has(topic)) enqueue(url,0,"legacy-seed",30);
  queue.sort((a,b)=>b.hint-a.hint||a.url.localeCompare(b.url));
  while (queue.length && fetches < MAX_FETCHES_PER_TOPIC && acceptedForTopic < MAX_CANDIDATES_PER_TOPIC) {
    const batch=[];
    while(queue.length && batch.length<CONCURRENCY){const next=queue.shift();if(visited.has(next.url))continue;visited.add(next.url);batch.push(next)}
    const pages=await Promise.all(batch.map((entry)=>fetchPage(entry.url,config.families).then((page)=>({entry,page})))); fetches+=pages.length;
    for(const {entry,page} of pages){
      if(!page.ok){rejected.push({url:entry.url,topic,reason:page.error});continue}
      const isCandidate=considerCandidate(page,topic,entry.kind);
      if(isCandidate){const candidate=candidateByUrl.get(page.url);const part=candidate.scores[topic];const strong=topic!=="beauty"||beautyStrongEvidence(part,candidate.seedTopics.has(topic));if((part?.score||0)>=MIN_TOPIC_SCORE&&strong)acceptedForTopic+=1}
      if(entry.depth>=2)continue;
      for(const link of linksFrom(page.html,page.url,topic,config.families,entry.depth)){
        if(visited.has(link.url)||queued.has(link.url))continue;
        const family=familyForUrl(link.url,config.families);if(!family)continue;
        const parentPath=new URL(page.url).pathname.replace(/[^/]*$/,""); const sameSection=new URL(link.url).pathname.startsWith(parentPath);
        if(entry.depth>=1&&link.hint<=0&&!sameSection)continue;
        enqueue(link.url,entry.depth+1,"crawl",link.hint+(sameSection?2:0));
      }
    }
    queue.sort((a,b)=>b.hint-a.hint||a.depth-b.depth||a.url.localeCompare(b.url));
  }
  return {fetches,visited:visited.size,acceptedForTopic,remainingQueue:queue.length};
}

const crawl = {};
for (const topic of TOPICS) {
  console.log(`Crawling Article sources for ${topic}…`);
  crawl[topic] = await crawlTopic(topic);
  console.log(`${topic}: ${crawl[topic].acceptedForTopic} semantically eligible pages after ${crawl[topic].fetches} fetches`);
}

const candidates=[...candidateByUrl.values()].map((candidate)=>{
  candidate.scores=allTopicScores(candidate);
  const ranking=TOPICS.map((topic)=>({topic,score:candidate.scores[topic].score})).sort((a,b)=>b.score-a.score||a.topic.localeCompare(b.topic));
  return {...candidate,bestTopic:ranking[0]?.topic||null,bestScore:ranking[0]?.score||0,secondScore:ranking[1]?.score||0};
});

const LONGFORM_SOURCE_FLOORS = Object.freeze({N5:350,N4:450,N3:600,N2:800,N1:1000});
const slotNeedsByTopic = Object.fromEntries(TOPICS.map((topic)=>[topic,articleRows
  .filter((row)=>row.topic===topic)
  .map((row)=>({level:row.jlpt,floor:LONGFORM_SOURCE_FLOORS[row.jlpt]||MIN_JP}))
  .sort((a,b)=>b.floor-a.floor||LEVELS.indexOf(b.level)-LEVELS.indexOf(a.level))]));
const selectedByTopic=Object.fromEntries(TOPICS.map((topic)=>[topic,[]]));
const selectedUrls=new Set(); const selectedBodies=new Set();
const eligiblePairsByTopic=Object.fromEntries(TOPICS.map((topic)=>[topic,[]]));
for(const candidate of candidates){
  if(candidate.sourceTextCharacterCount<MIN_JP)continue;
  for(const topic of TOPICS){
    if(!TOPIC_CONFIG[topic].families.includes(candidate.family.sourceFamilyId))continue;
    const part=candidate.scores[topic]; if(!part||part.score<MIN_TOPIC_SCORE)continue;
    const seed=candidate.seedTopics.has(topic); const strong=topic!=="beauty"||beautyStrongEvidence(part,seed); if(!strong)continue;
    const bestGap=Math.max(0,candidate.bestScore-part.score); if(bestGap>MAX_BEST_TOPIC_GAP&&!seed&&!(topic==="beauty"&&strong))continue;
    eligiblePairsByTopic[topic].push({candidate,topic,score:part.score,bestGap,evidence:part.evidence,seed,strong});
  }
}
const topicOrder=[...TOPICS].sort((a,b)=>eligiblePairsByTopic[a].length-eligiblePairsByTopic[b].length||a.localeCompare(b));
const longformSelectionErrors=[];
for(const topic of topicOrder){
  const needs=slotNeedsByTopic[topic];
  for(const need of needs){
    const pool=eligiblePairsByTopic[topic].filter((pair)=>
      !selectedUrls.has(pair.candidate.url)
      && !selectedBodies.has(pair.candidate.sourceBodyFingerprint)
      && pair.candidate.sourceTextCharacterCount>=need.floor
    ).sort((a,b)=>
      Number(b.candidate.bestTopic===topic)-Number(a.candidate.bestTopic===topic)
      || Number(b.seed)-Number(a.seed)
      || b.score-a.score
      || b.candidate.sourceTextCharacterCount-a.candidate.sourceTextCharacterCount
      || a.bestGap-b.bestGap
      || a.candidate.url.localeCompare(b.candidate.url)
    );
    const pair=pool[0];
    if(!pair){
      longformSelectionErrors.push(`${topic}: no unused source >= ${need.floor} Japanese characters for ${need.level} slot`);
      continue;
    }
    selectedByTopic[topic].push({...pair,recommendedLevel:need.level,requiredFloor:need.floor});
    selectedUrls.add(pair.candidate.url); selectedBodies.add(pair.candidate.sourceBodyFingerprint);
  }
}

const selected=[];let inventoryPosition=1;
for(const topic of TOPICS){
  selectedByTopic[topic].sort((a,b)=>b.score-a.score||a.candidate.url.localeCompare(b.candidate.url));
  for(const pair of selectedByTopic[topic]){
    const item=pair.candidate;const family=item.family;
    selected.push({
      candidateId:`article-topic-${sha256(item.url).slice(0,16)}`,
      targetShelf:"articles",articleTopic:topic,recommendedArticleLevel:pair.recommendedLevel,longformSourceFloor:pair.requiredFloor,topicScore:pair.score,topicEvidence:pair.evidence,sourceBestTopic:item.bestTopic,sourceBestTopicScore:item.bestScore,
      sourceFamilyId:family.sourceFamilyId,sourceTitle:item.title,sourcePublisher:family.publisher,sourceUrl:item.url,sourcePublishedDate:item.publishedDate,sourceRetrievedDate:TODAY,
      rightsStatus:"adaptation-permitted",
      rightsBasis:{termsUrl:family.termsUrl,licenseName:family.licenseName,licenseUrl:family.licenseUrl,itemLevelCheck:"No contrary text-rights notice detected in the fetched page; excluded media remains excluded.",verifiedDate:TODAY},
      thirdPartyContentReview:item.thirdPartyContentReview,sourceBodyExtractionStatus:"body-ready",sourceJapaneseSubstance:item.body,sourceTextCharacterCount:item.sourceTextCharacterCount,
      reuseMode:"verbatim-or-adaptation-permitted",sourceBodyFingerprint:item.sourceBodyFingerprint,
      sourceAttribution:`出典：${family.publisher}ウェブサイト（${item.url}）`,
      sourceProcessing:"Item-level source body extracted for one-source Sakura Article adaptation. No learner-facing text has been generated.",inventoryPosition:inventoryPosition++,discoveryKinds:[...item.sourceKinds],
    });
  }
}

const gaps=Object.fromEntries(TOPICS.map((topic)=>[topic,Math.max(0,TARGET_PER_TOPIC-selectedByTopic[topic].length)]));
const eligibleCounts=Object.fromEntries(TOPICS.map((topic)=>[topic,candidates.filter((candidate)=>{
  if(!TOPIC_CONFIG[topic].families.includes(candidate.family.sourceFamilyId))return false;
  const part=candidate.scores[topic];if(!part||part.score<MIN_TOPIC_SCORE)return false;
  const seed=candidate.seedTopics.has(topic);const strong=topic!=="beauty"||beautyStrongEvidence(part,seed);if(!strong)return false;
  const bestGap=Math.max(0,candidate.bestScore-part.score);return bestGap<=MAX_BEST_TOPIC_GAP||seed||(topic==="beauty"&&strong);
}).length]));
const pass=selected.length===300&&selectedUrls.size===300&&selectedBodies.size===300&&Object.values(gaps).every((gap)=>gap===0)&&longformSelectionErrors.length===0;
const report={
  version:3,generatedDate:TODAY,pass,
  policy:"Exactly 30 unique, semantically fitting official sources per Article topic, selected against the real N5–N1 Article slot mix. Sources must meet the long-form source floor for the specific level they are reserved to support. Thin pages, contrary-rights signals, third-party media assets, duplicate URLs/bodies, weak topic matches, forced cross-topic assignments, and source inflation are rejected. Beauty additionally requires title/URL-level beauty evidence or a trusted Beauty seed so shared navigation cannot create false positives.",
  thresholds:{minimumJapaneseCharacters:MIN_JP,longformSourceFloors:LONGFORM_SOURCE_FLOORS,minimumTopicScore:MIN_TOPIC_SCORE,maximumBestTopicGap:MAX_BEST_TOPIC_GAP,maxFetchesPerTopic:MAX_FETCHES_PER_TOPIC},
  startingSeeds:{uniqueLegacyTopicUrls:seedTopicsByUrl.size,existingBodyReadyRecords:(existingBodyReady.records||[]).length},
  crawl,discoveredUniqueCandidatePages:candidates.length,eligibleCounts,selectedCount:selected.length,uniqueSelectedUrls:selectedUrls.size,uniqueSelectedBodies:selectedBodies.size,gaps,longformSelectionErrors,longformReservedLevels:Object.fromEntries(LEVELS.map((level)=>[level,selected.filter((row)=>row.recommendedArticleLevel===level).length])),
  selectedByTopic:Object.fromEntries(TOPICS.map((topic)=>[topic,selected.filter((row)=>row.articleTopic===topic).map(({sourceJapaneseSubstance,...row})=>row)])),
  rejectionSummary:Object.fromEntries(Object.entries(rejected.reduce((acc,row)=>{acc[row.reason]=(acc[row.reason]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))),
  rejectedSample:rejected.slice(0,250),
};
fs.mkdirSync(qaRoot,{recursive:true});
fs.writeFileSync(path.join(qaRoot,"article-topic-source-discovery.json"),`${JSON.stringify(report,null,2)}\n`);
const candidatePath=path.join(qaRoot,"article-topic-source-candidates.json");
if(pass){
  fs.writeFileSync(candidatePath,`${JSON.stringify({version:1,shelf:"articles",targetCount:300,bodyReadyCount:300,topicCounts:Object.fromEntries(TOPICS.map((topic)=>[topic,30])),records:selected},null,2)}\n`);
}else if(fs.existsSync(candidatePath)) fs.rmSync(candidatePath);
console.log(JSON.stringify({pass,startingSeeds:report.startingSeeds,crawl,discoveredUniqueCandidatePages:candidates.length,eligibleCounts,selectedCount:selected.length,gaps,longformSelectionErrors,longformReservedLevels:report.longformReservedLevels,rejectionSummary:report.rejectionSummary},null,2));
