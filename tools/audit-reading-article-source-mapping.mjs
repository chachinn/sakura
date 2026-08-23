import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const articleRoot = path.join(readingRoot, "articles");
const bodyReadyPath = path.join(readingRoot, "body-ready", "articles.json");
const qaPath = path.join(readingRoot, "qa", "article-source-mapping-report.json");
const manifest = JSON.parse(fs.readFileSync(path.join(articleRoot, "manifest.json"), "utf8"));
const bodyReady = JSON.parse(fs.readFileSync(bodyReadyPath, "utf8"));
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const hardErrors = [];
const legacyWarnings = [];
const articles = [];
const sourceRows = Array.isArray(bodyReady?.records) ? bodyReady.records : [];

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.replace(/\/+$/, "");
    const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    url.search = "";
    for (const [key, val] of params) url.searchParams.append(key, val);
    return url.toString();
  } catch {
    return String(value || "").trim();
  }
}
function jpCount(value) {
  return (String(value || "").match(/[ぁ-んァ-ヶ一-龯々〆〤]/g) || []).length;
}
function bodyFingerprint(value) {
  return crypto.createHash("sha256")
    .update(String(value || "").normalize("NFKC").replace(/\s+/g, "").replace(/[「」『』（）()。、，．・：:;；!?！？]+/g, ""))
    .digest("hex");
}
function stats(values) {
  if (!values.length) return { minimum: 0, median: 0, average: 0, maximum: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    minimum: Math.min(...values),
    median: Math.round(median * 10) / 10,
    average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10,
    maximum: Math.max(...values),
  };
}
function counts(rows, getter) {
  const result = {};
  for (const row of rows) {
    const key = String(getter(row) || "unknown");
    result[key] = (result[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

for (const level of LEVELS) {
  for (const name of manifest.levelFiles?.[level] || []) {
    const rows = JSON.parse(fs.readFileSync(path.join(articleRoot, name), "utf8"));
    for (const row of rows) articles.push({ ...row, _pack: name });
  }
}
if (articles.length !== 300) hardErrors.push(`Expected 300 current Article slots, got ${articles.length}`);
if (sourceRows.length !== 300) hardErrors.push(`Expected exactly 300 body-ready Article sources, got ${sourceRows.length}`);

// The body-ready inventory is the authority for the final rebuild. Validate it independently
// from the legacy Article source URLs, which were created before this source inventory existed.
const inventoryUrls = new Map();
const inventoryBodies = new Map();
const inventoryCandidateIds = new Set();
const inventoryRows = [];
for (let index = 0; index < sourceRows.length; index += 1) {
  const row = sourceRows[index];
  const label = row?.candidateId || `inventory-${index + 1}`;
  const sourceUrl = String(row?.sourceUrl || "");
  const normalizedUrl = normalizeUrl(sourceUrl);
  const body = String(row?.sourceJapaneseSubstance || "").trim();
  const sourceChars = jpCount(body);
  const calculatedFingerprint = bodyFingerprint(body);
  const storedFingerprint = String(row?.sourceBodyFingerprint || "");
  if (!row?.candidateId) hardErrors.push(`${label}: candidateId missing`);
  else if (inventoryCandidateIds.has(row.candidateId)) hardErrors.push(`Duplicate body-ready candidateId: ${row.candidateId}`);
  else inventoryCandidateIds.add(row.candidateId);
  if (!/^https:\/\//.test(sourceUrl)) hardErrors.push(`${label}: valid HTTPS sourceUrl missing`);
  if (inventoryUrls.has(normalizedUrl)) hardErrors.push(`${label}: duplicate body-ready source URL with ${inventoryUrls.get(normalizedUrl)}`);
  else inventoryUrls.set(normalizedUrl, label);
  if (!body || sourceChars < 320) hardErrors.push(`${label}: source body is too thin (${sourceChars} Japanese chars)`);
  if (inventoryBodies.has(calculatedFingerprint)) hardErrors.push(`${label}: duplicate body-ready source body with ${inventoryBodies.get(calculatedFingerprint)}`);
  else inventoryBodies.set(calculatedFingerprint, label);
  if (storedFingerprint && storedFingerprint !== calculatedFingerprint) hardErrors.push(`${label}: stored sourceBodyFingerprint does not match sourceJapaneseSubstance`);
  if (row?.sourceBodyExtractionStatus !== "body-ready") hardErrors.push(`${label}: sourceBodyExtractionStatus must be body-ready`);
  if (row?.targetShelf && row.targetShelf !== "articles") hardErrors.push(`${label}: expected targetShelf articles, got ${row.targetShelf}`);
  if (!row?.sourceFamilyId || !row?.sourcePublisher || !row?.sourceTitle || !row?.rightsStatus) hardErrors.push(`${label}: source/rights metadata incomplete`);
  inventoryRows.push({
    inventoryPosition: Number(row?.inventoryPosition || index + 1),
    candidateId: row?.candidateId || null,
    targetShelf: row?.targetShelf || null,
    sourceFamilyId: row?.sourceFamilyId || null,
    sourcePublisher: row?.sourcePublisher || null,
    sourceTitle: row?.sourceTitle || null,
    sourceUrl,
    rightsStatus: row?.rightsStatus || null,
    sourceTextCharacterCount: sourceChars,
    sourceBodyFingerprint: storedFingerprint || calculatedFingerprint,
  });
}

// Audit the old mapping only to prove why a full reassignment is required. It is no longer
// a final-build gate: the final build will assign the 300 validated inventory rows 1:1 to
// the 300 stable Article slots, then the depth validator will gate the resulting corpus.
const byExact = new Map();
const byNormalized = new Map();
for (const row of sourceRows) {
  const exact = String(row?.sourceUrl || "");
  if (!byExact.has(exact)) byExact.set(exact, []);
  byExact.get(exact).push(row);
  const normalized = normalizeUrl(exact);
  if (!byNormalized.has(normalized)) byNormalized.set(normalized, []);
  byNormalized.get(normalized).push(row);
}
const legacyMappings = [];
const legacyUniqueSources = new Set();
for (const article of articles) {
  const sourceUrl = String(article?.sourceUrl || "");
  let candidates = byExact.get(sourceUrl) || [];
  let matchMode = "exact";
  if (!candidates.length) {
    candidates = byNormalized.get(normalizeUrl(sourceUrl)) || [];
    matchMode = "normalized";
  }
  if (candidates.length !== 1) {
    legacyMappings.push({ articleId: article.id, pack: article._pack, jlpt: article.jlpt, topic: article.topic, sourceUrl, status: candidates.length ? "ambiguous" : "missing", matchCount: candidates.length });
    continue;
  }
  const source = candidates[0];
  const sourceKey = source.candidateId || source.sourceBodyFingerprint || bodyFingerprint(source.sourceJapaneseSubstance);
  legacyUniqueSources.add(sourceKey);
  legacyMappings.push({
    articleId: article.id,
    pack: article._pack,
    jlpt: article.jlpt,
    topic: article.topic,
    sourceUrl,
    status: "matched",
    matchMode,
    sourceCandidateId: source.candidateId || null,
  });
}
const legacyMatched = legacyMappings.filter((row) => row.status === "matched");
const rebuildRequired = legacyMatched.length !== 300 || legacyUniqueSources.size !== 300;
if (rebuildRequired) legacyWarnings.push(`Legacy Article/source mapping is not 1:1 (${legacyMatched.length}/300 Articles matched to ${legacyUniqueSources.size} unique body-ready sources); final rebuild must reassign from the authoritative inventory.`);

const allInventoryFields = [...new Set(sourceRows.flatMap((row) => Object.keys(row || {})))].sort();
const hintFields = allInventoryFields.filter((field) => /topic|category|tag|subject|level|difficulty|type|kind|class/i.test(field));
const sourceBodyCharacters = stats(inventoryRows.map((row) => row.sourceTextCharacterCount));
const migrationReady = hardErrors.length === 0 && inventoryRows.length === 300 && inventoryUrls.size === 300 && inventoryBodies.size === 300;
const report = {
  version: 2,
  generatedDate: new Date().toISOString().slice(0, 10),
  pass: migrationReady,
  policy: "Final Articles use a 1:1 reassignment from the authoritative 300-record body-ready inventory. Each Article remains one-source only; no source stitching is permitted. Stable learner IDs/level/topic slots are preserved independently from legacy source URLs.",
  migrationReady,
  migrationStrategy: "reassign-all-300-from-body-ready-inventory-preserve-stable-article-slots",
  articleSlots: {
    count: articles.length,
    byLevel: counts(articles, (row) => row.jlpt),
    byTopic: counts(articles, (row) => row.topic),
  },
  authoritativeInventory: {
    count: inventoryRows.length,
    uniqueCandidateIds: inventoryCandidateIds.size,
    uniqueSourceUrls: inventoryUrls.size,
    uniqueSourceBodies: inventoryBodies.size,
    sourceBodyCharacters,
    bySourceFamily: counts(inventoryRows, (row) => row.sourceFamilyId),
    byRightsStatus: counts(inventoryRows, (row) => row.rightsStatus),
    fields: allInventoryFields,
    classificationHintFields: hintFields,
  },
  legacyMapping: {
    finalAuthority: false,
    rebuildRequired,
    matchedArticles: legacyMatched.length,
    unmatchedArticles: articles.length - legacyMatched.length,
    uniqueMatchedSourceRows: legacyUniqueSources.size,
    exactMatches: legacyMatched.filter((row) => row.matchMode === "exact").length,
    normalizedMatches: legacyMatched.filter((row) => row.matchMode === "normalized").length,
    note: "These metrics describe the pre-inventory Article corpus only. Missing legacy matches do not weaken final source standards; they require reassignment to unused validated inventory rows.",
  },
  hardErrors,
  warnings: legacyWarnings,
  inventory: inventoryRows,
  legacyMappings,
};
fs.mkdirSync(path.dirname(qaPath), { recursive: true });
fs.writeFileSync(qaPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  pass: report.pass,
  migrationReady: report.migrationReady,
  migrationStrategy: report.migrationStrategy,
  articleSlots: report.articleSlots,
  authoritativeInventory: report.authoritativeInventory,
  legacyMapping: report.legacyMapping,
  hardErrors: report.hardErrors,
  warnings: report.warnings,
}, null, 2));
if (!report.pass) process.exitCode = 1;
