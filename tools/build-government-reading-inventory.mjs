import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const registry = JSON.parse(fs.readFileSync(path.join(readingRoot, "source-registry.json"), "utf8"));
const families = registry.sourceFamilies.filter((family) => family.sourceType === "open-government");
const familyByDomain = new Map(families.map((family) => [family.domain, family]));
const articleDir = path.join(readingRoot, "articles");
const articleFiles = fs.readdirSync(articleDir).filter((name) => name.endsWith(".json") && name !== "manifest.json" && !name.endsWith("-index.json"));
const articles = articleFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(articleDir, name), "utf8")));

const roots = [
  "https://www.mlit.go.jp/kankocho/news.html",
  "https://www.mlit.go.jp/kankocho/",
  "https://www.mlit.go.jp/kankocho/kankokankeisha/index.html",
  "https://www.mlit.go.jp/kankocho/kankochi_info.html",
  "https://www.mlit.go.jp/kankocho/seisaku_seido/index.html",
  "https://www.maff.go.jp/j/pr/aff/recipe.html",
  "https://www.maff.go.jp/j/pr/aff/category_recipe/",
  "https://www.maff.go.jp/j/pr/aff/",
  "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/",
  "https://www.maff.go.jp/j/keikaku/syokubunka/culture/wagohan_project.html",
  "https://www.maff.go.jp/j/syokuiku/",
  "https://www.mhlw.go.jp/stf/faq.html",
  "https://www.mhlw.go.jp/stf/kaiken/index.html",
  "https://www.mext.go.jp/b_menu/houdou/index.htm",
  "https://www.mext.go.jp/a_menu/shotou/index.htm",
  "https://www.meti.go.jp/press/index.html",
  "https://www.caa.go.jp/notice/statement/",
  "https://www.cfa.go.jp/policies/",
  "https://www.env.go.jp/guide/"
];
const seeds = [...new Set([...articles.map((record) => record.sourceUrl), ...roots])];
const stripTags = (text) => text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
const excludedExtension = /\.(?:jpg|jpeg|png|gif|webp|svg|mp4|mov|avi|zip|xlsx?|docx?|pptx?)(?:$|[?#])/i;
const discovered = new Map();

async function inspect(url) {
  try {
    const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "SakuraReadingRightsInventory/1.0" } });
    if (!response.ok || !String(response.headers.get("content-type") || "").includes("text/html")) return;
    const html = await response.text();
    for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      let resolved;
      try { resolved = new URL(match[1], response.url); } catch { continue; }
      resolved.hash = "";
      if (resolved.protocol !== "https:" || excludedExtension.test(resolved.href)) continue;
      const family = familyByDomain.get(resolved.hostname);
      if (!family || !family.approvedPathPatterns.some((pattern) => new RegExp(pattern).test(resolved.pathname))) continue;
      const title = stripTags(match[2]);
      if (title.length < 3 || /^(ホーム|トップ|戻る|次へ|前へ|English|サイトマップ)$/.test(title)) continue;
      const key = resolved.href.replace(/\/$/, "");
      if (!discovered.has(key)) discovered.set(key, { url: key, title, family });
    }
  } catch (error) {
    console.warn(`WARN fetch failed ${url}: ${error.message}`);
  }
}

for (let i = 0; i < seeds.length; i += 10) {
  await Promise.all(seeds.slice(i, i + 10).map(inspect));
}

const expansionSeeds = [...discovered.values()]
  .filter((item) => /kankocho|\/j\/pr\/aff\/|syokubunka|recipe|レシピ|会見|質問|Q.?A|インタビュー/i.test(`${item.url} ${item.title}`))
  .slice(0, 400)
  .map((item) => item.url);
for (let i = 0; i < expansionSeeds.length; i += 10) {
  await Promise.all(expansionSeeds.slice(i, i + 10).map(inspect));
}

const all = [...discovered.values()];
const uniquePick = (count, predicate, used = new Set()) => {
  const result = [];
  for (const item of all) {
    if (result.length >= count) break;
    if (used.has(item.url) || !predicate(item)) continue;
    used.add(item.url);
    result.push(item);
  }
  return result;
};
const text = (item) => `${item.title} ${new URL(item.url).pathname}`;
const news = articles.slice(0, 300).map((record) => ({ url: record.sourceUrl, title: record.sourceTitle, family: familyByDomain.get(new URL(record.sourceUrl).hostname), publishedDate: record.sourcePublishedDate }));
const usedGovernmentUrls = new Set(news.map((item) => item.url));
const travel = uniquePick(200, (item) => item.family.sourceFamilyId === "gov-jta" && /観光|旅行|宿泊|交通|訪日|ツーリズム|地域|案内|旅|kanko|tour|travel|hotel/i.test(text(item)), usedGovernmentUrls);
const schoolWork = uniquePick(120, (item) => /学校|教育|学習|生徒|学生|教員|仕事|労働|雇用|職場|就職|人材|働|school|education|work|labou?r|employment/i.test(text(item)), usedGovernmentUrls);
const recipes = uniquePick(100, (item) => item.family.sourceFamilyId === "gov-maff" && /レシピ|料理|調理|作り方|食育|食材|献立|recipe|cook/i.test(text(item)), usedGovernmentUrls);
const interviews = uniquePick(100, (item) => /Q.?A|ＦＡＱ|FAQ|よくある|質問|回答|会見|対談|インタビュー|一問一答|interview|question/i.test(text(item)), usedGovernmentUrls);
const documents = uniquePick(200, (item) => /様式|申請|届出|手続|ガイド|手引|マニュアル|チェック|記入|書類|制度|form|guide|manual|procedure|document/i.test(text(item)), usedGovernmentUrls);

const outputDir = path.join(readingRoot, "candidates");
fs.mkdirSync(outputDir, { recursive: true });
const targets = { news: 300, "travel-reading": 200, "school-work": 120, "recipes-how-to": 100, "interviews-qa": 100, "real-life-documents": 200 };
const selections = { news, "travel-reading": travel, "school-work": schoolWork, "recipes-how-to": recipes, "interviews-qa": interviews, "real-life-documents": documents };
const candidate = (shelf, item, position) => ({
  candidateId: `government-${shelf}-${String(position + 1).padStart(4, "0")}`,
  targetShelf: shelf,
  sourceFamilyId: item.family.sourceFamilyId,
  sourceTitle: item.title,
  sourcePublisher: item.family.publisher,
  sourceUrl: item.url,
  sourcePublishedDate: item.publishedDate || null,
  sourceRetrievedDate: "2026-08-22",
  sourceLicense: item.family.licenseName,
  sourceLicenseUrl: item.family.licenseUrl,
  sourceTermsUrl: item.family.termsUrl,
  sourceAttribution: `出典：${item.family.publisher}ウェブサイト（${item.url}）`,
  sourceProcessing: "Candidate metadata only; no government text or assets are bundled by this inventory.",
  rightsStatus: "adaptation-permitted",
  rightsEvidence: {
    basis: "Verified source-family terms apply unless the item carries a contrary notice.",
    itemBodyBundled: false,
    thirdPartyAssetsBundled: false,
    populationRequirement: "Re-check the item for a contrary notice and third-party credits before importing text."
  }
});
for (const [shelf, items] of Object.entries(selections)) {
  fs.writeFileSync(path.join(outputDir, `${shelf}.json`), `${JSON.stringify({ version: 1, shelf, targetCount: targets[shelf], candidateCount: items.length, candidates: items.map((item, index) => candidate(shelf, item, index)) }, null, 2)}\n`);
}
console.log(JSON.stringify({ seedsInspected: seeds.length + expansionSeeds.length, discoveredApprovedFamilyLinks: all.length, candidateCounts: Object.fromEntries(Object.entries(selections).map(([shelf, items]) => [shelf, items.length])) }, null, 2));
