import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const articleRoot = path.join(readingRoot, "articles");
const qaRoot = path.join(readingRoot, "qa");
const registry = JSON.parse(fs.readFileSync(path.join(readingRoot, "source-registry.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(articleRoot, "manifest.json"), "utf8"));
const LEVELS = ["N5","N4","N3","N2","N1"];
const TOPICS = ["beauty","food","travel","digital","consumer","health","environment","culture","work","society"];
const families = registry.sourceFamilies.filter((family) => family.sourceType === "open-government");
const familyByDomain = new Map(families.map((family) => [family.domain, family]));

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    return url.toString();
  } catch {
    return String(value || "").trim();
  }
}
function registryMatch(value) {
  try {
    const url = new URL(value);
    const family = familyByDomain.get(url.hostname);
    if (!family) return { ok:false, reason:"unregistered-domain", domain:url.hostname };
    const approved = (family.approvedPathPatterns || []).some((pattern) => new RegExp(pattern).test(url.pathname));
    return approved ? { ok:true, family } : { ok:false, reason:"unapproved-path", family, domain:url.hostname };
  } catch {
    return { ok:false, reason:"invalid-url", domain:"" };
  }
}
function counts(rows, getter) {
  const out = {};
  for (const row of rows) {
    const key = String(getter(row) || "unknown");
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])));
}

const articles = [];
for (const level of LEVELS) {
  for (const file of manifest.levelFiles?.[level] || []) {
    const rows = JSON.parse(fs.readFileSync(path.join(articleRoot, file), "utf8"));
    for (const row of rows) articles.push({ ...row, _pack:file });
  }
}
if (articles.length !== 300) throw new Error(`Expected 300 Article slots, got ${articles.length}`);

const topics = {};
const allUniqueUrls = new Set();
const allApprovedUrls = new Set();
const allInvalid = [];
for (const topic of TOPICS) {
  const rows = articles.filter((article) => article.topic === topic);
  const byUrl = new Map();
  for (const row of rows) {
    const sourceUrl = normalizeUrl(row.sourceUrl);
    if (!byUrl.has(sourceUrl)) byUrl.set(sourceUrl, []);
    byUrl.get(sourceUrl).push(row);
    allUniqueUrls.add(sourceUrl);
  }
  const unique = [...byUrl.entries()].map(([sourceUrl, usedBy]) => {
    const match = registryMatch(sourceUrl);
    if (match.ok) allApprovedUrls.add(sourceUrl);
    else allInvalid.push({ topic, sourceUrl, reason:match.reason, domain:match.domain });
    return {
      sourceUrl,
      sourceTitle: usedBy[0]?.sourceTitle || null,
      sourcePublisher: usedBy[0]?.sourcePublisher || null,
      sourceFamilyId: match.ok ? match.family.sourceFamilyId : usedBy[0]?.sourceFamilyId || null,
      registeredAndApproved: match.ok,
      registryFailure: match.ok ? null : match.reason,
      usedByArticleCount: usedBy.length,
      articleIds: usedBy.map((row) => row.id),
      levels: [...new Set(usedBy.map((row) => row.jlpt))],
    };
  }).sort((a,b)=>Number(b.registeredAndApproved)-Number(a.registeredAndApproved) || b.usedByArticleCount-a.usedByArticleCount || a.sourceUrl.localeCompare(b.sourceUrl));
  const approved = unique.filter((row) => row.registeredAndApproved);
  topics[topic] = {
    articleSlots: rows.length,
    uniqueLegacySourceUrls: unique.length,
    approvedLegacySourceUrls: approved.length,
    targetUniqueSources: 30,
    currentUniqueApprovedGap: Math.max(0, 30 - approved.length),
    byLegacySourceFamily: counts(approved, (row) => row.sourceFamilyId),
    maximumReuseCount: Math.max(0, ...unique.map((row) => row.usedByArticleCount)),
    sourceUrls: unique,
  };
}

const report = {
  version:1,
  generatedDate:new Date().toISOString().slice(0,10),
  pass: articles.length === 300,
  purpose:"Measure how many semantically intended Article source URLs already exist per topic before online body-ready expansion. This is a seed audit, not a source-quality approval.",
  articleCount:articles.length,
  uniqueLegacySourceUrls:allUniqueUrls.size,
  uniqueRegistryApprovedLegacyUrls:allApprovedUrls.size,
  totalTargetUniqueSources:300,
  registryApprovedSeedGap:Math.max(0,300-allApprovedUrls.size),
  topics,
  invalidLegacySources:allInvalid,
  registryFamiliesUsed:counts([...allApprovedUrls].map((url)=>registryMatch(url).family), (family)=>family.sourceFamilyId),
};
fs.mkdirSync(qaRoot,{recursive:true});
fs.writeFileSync(path.join(qaRoot,"article-topic-seed-report.json"), `${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({
  pass:report.pass,
  articleCount:report.articleCount,
  uniqueLegacySourceUrls:report.uniqueLegacySourceUrls,
  uniqueRegistryApprovedLegacyUrls:report.uniqueRegistryApprovedLegacyUrls,
  registryApprovedSeedGap:report.registryApprovedSeedGap,
  topics:Object.fromEntries(TOPICS.map((topic)=>[topic,{
    articleSlots:topics[topic].articleSlots,
    uniqueLegacySourceUrls:topics[topic].uniqueLegacySourceUrls,
    approvedLegacySourceUrls:topics[topic].approvedLegacySourceUrls,
    currentUniqueApprovedGap:topics[topic].currentUniqueApprovedGap,
    byLegacySourceFamily:topics[topic].byLegacySourceFamily,
    maximumReuseCount:topics[topic].maximumReuseCount,
  }])),
  invalidLegacySourceCount:allInvalid.length,
},null,2));
