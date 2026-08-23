import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const libraryRoot = path.join(readingRoot, "library");
const manifestPath = path.join(libraryRoot, "manifest.json");
const qaPath = path.join(readingRoot, "qa", "reading-library-report.json");
const allowIncomplete = process.argv.includes("--allow-incomplete");
const EXPECTED = Object.freeze({
  articles: 300,
  "short-stories": 250,
  news: 300,
  travel: 200,
  folklore: 100,
  essays: 150,
  "school-work": 120,
  recipes: 100,
  interviews: 100,
  documents: 200,
  novels: 80,
  micro: 100,
});
const GENERIC = Object.keys(EXPECTED).filter((id) => !["articles", "short-stories"].includes(id));
const EXCLUDED = new Set(["manga", "conversations", "diaries", "texts", "letters", "reviews"]);
const errors = [];
const warnings = [];
const seenIds = new Set();
const seenBodies = new Map();
const seenUrls = new Map();
const shelfCounts = {};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function normalizeBody(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, "").replace(/[「」『』（）()。、，．・：:;；!?！？]+/g, "");
}
function fingerprint(value) {
  return crypto.createHash("sha256").update(normalizeBody(value)).digest("hex");
}
function recordBody(record) {
  return Array.isArray(record.paragraphs)
    ? record.paragraphs.map((paragraph) => paragraph?.japanese || "").join("\n")
    : String(record.originalText || record.japanese || "");
}
function pushError(message) {
  errors.push(message);
}
function validateGenericRecord(record, shelf, pack) {
  if (!record?.id) pushError(`${shelf}/${pack}: record missing id`);
  else if (seenIds.has(record.id)) pushError(`duplicate learner ID: ${record.id}`);
  else seenIds.add(record.id);
  if (record?.shelf !== shelf) pushError(`${record?.id || shelf}: shelf mismatch`);
  if (!record?.title || !record?.titleKana || !record?.titleEnglish) pushError(`${record?.id || shelf}: title fields incomplete`);
  if (!/^N[1-5]$/.test(record?.studyDifficulty || "")) pushError(`${record?.id || shelf}: invalid studyDifficulty`);
  if (!Array.isArray(record?.paragraphs) || !record.paragraphs.length) pushError(`${record?.id || shelf}: paragraphs missing`);
  for (const paragraph of record?.paragraphs || []) {
    if (!paragraph?.japanese || !paragraph?.kana || !paragraph?.furigana || !paragraph?.english) pushError(`${record?.id || shelf}: incomplete learner paragraph`);
  }
  if (!/^https:\/\//.test(record?.sourceUrl || "")) pushError(`${record?.id || shelf}: sourceUrl must be HTTPS`);
  if (!record?.sourceFamilyId || !record?.rightsStatus || !record?.sourcePublisher || !record?.sourceTitle) pushError(`${record?.id || shelf}: provenance metadata incomplete`);
  const body = recordBody(record);
  const normalized = normalizeBody(body);
  if (!normalized) pushError(`${record?.id || shelf}: empty Japanese body`);
  if (shelf !== "micro" && normalized.length < 40) pushError(`${record?.id || shelf}: body is too thin (${normalized.length})`);
  const bodyHash = fingerprint(body);
  if (normalized && seenBodies.has(bodyHash)) pushError(`duplicate learner body: ${seenBodies.get(bodyHash)} and ${record?.id || shelf}`);
  else if (normalized) seenBodies.set(bodyHash, record?.id || shelf);
  const url = String(record?.sourceUrl || "");
  if (url) {
    const previous = seenUrls.get(url);
    if (previous && shelf !== "novels") pushError(`duplicate source URL: ${previous} and ${record?.id || shelf}`);
    else if (!previous) seenUrls.set(url, record?.id || shelf);
  }
  if (shelf === "novels") {
    if (!record?.seriesId || !Number.isInteger(Number(record?.chapterNumber)) || !record?.chapterTitle) pushError(`${record?.id || shelf}: serialized chapter metadata incomplete`);
  }
}
function validateIndex(index, records, shelf, packNames) {
  if (!Array.isArray(index)) {
    pushError(`${shelf}: index is not an array`);
    return;
  }
  if (index.length !== records.length) pushError(`${shelf}: index/body count mismatch (${index.length} vs ${records.length})`);
  const byId = new Map(records.map((record) => [record.id, record]));
  for (const row of index) {
    const record = byId.get(row?.id);
    if (!record) {
      pushError(`${shelf}: index references missing body ${row?.id || "unknown"}`);
      continue;
    }
    if (!packNames.has(row.pack)) pushError(`${shelf}/${row.id}: index pack ${row.pack} is not declared`);
    if (row.shelf !== shelf || row.studyDifficulty !== record.studyDifficulty || row.title !== record.title) pushError(`${shelf}/${row.id}: compact index does not match body`);
  }
}
function validateNovelContinuity(records) {
  const series = new Map();
  for (const record of records) {
    if (!record.seriesId) continue;
    if (!series.has(record.seriesId)) series.set(record.seriesId, []);
    series.get(record.seriesId).push(Number(record.chapterNumber));
  }
  for (const [seriesId, numbers] of series) {
    const sorted = [...new Set(numbers)].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i] !== sorted[i - 1] + 1) pushError(`serialized chapter gap in ${seriesId}: ${sorted[i - 1]} → ${sorted[i]}`);
    }
  }
}

if (!fs.existsSync(manifestPath)) pushError("production library manifest is missing");
const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : { shelves: {} };
if (manifest.totalTarget !== 2000) pushError(`manifest totalTarget must be 2000, got ${manifest.totalTarget}`);
for (const [shelf, target] of Object.entries(EXPECTED)) {
  if (manifest.shelves?.[shelf]?.target !== target) pushError(`${shelf}: target must be ${target}`);
}
for (const shelf of Object.keys(manifest.shelves || {})) {
  if (!EXPECTED[shelf] && !EXCLUDED.has(shelf)) warnings.push(`unrecognized manifest shelf: ${shelf}`);
}
for (const shelf of EXCLUDED) {
  if (manifest.shelves?.[shelf]) pushError(`excluded shelf must not be counted in production manifest: ${shelf}`);
}

for (const shelf of GENERIC) {
  const config = manifest.shelves?.[shelf];
  const ready = Number(config?.learnerReadyCount || 0);
  shelfCounts[shelf] = ready;
  if (ready > EXPECTED[shelf]) pushError(`${shelf}: learnerReadyCount ${ready} exceeds target ${EXPECTED[shelf]}`);
  if (!ready) {
    if ((config?.shards || []).length) pushError(`${shelf}: zero-ready shelf declares body shards`);
    continue;
  }
  const indexPath = path.join(libraryRoot, String(config.index || ""));
  if (!fs.existsSync(indexPath)) {
    pushError(`${shelf}: index file is missing`);
    continue;
  }
  const records = [];
  const packNames = new Set();
  for (const shardPath of config.shards || []) {
    const full = path.join(libraryRoot, shardPath);
    const expectedPrefix = `${shelf}/`;
    if (!String(shardPath).startsWith(expectedPrefix)) pushError(`${shelf}: shard path escapes shelf: ${shardPath}`);
    if (!fs.existsSync(full)) {
      pushError(`${shelf}: missing shard ${shardPath}`);
      continue;
    }
    const shard = readJson(full);
    if (!Array.isArray(shard) || !shard.length || shard.length > 20) pushError(`${shelf}: invalid shard size in ${shardPath}`);
    packNames.add(path.basename(shardPath));
    for (const record of Array.isArray(shard) ? shard : []) {
      validateGenericRecord(record, shelf, path.basename(shardPath));
      records.push(record);
    }
  }
  if (records.length !== ready) pushError(`${shelf}: manifest says ${ready}, body shards contain ${records.length}`);
  validateIndex(readJson(indexPath), records, shelf, packNames);
  if (shelf === "novels") validateNovelContinuity(records);
}

const articleManifestPath = path.join(readingRoot, "articles", "manifest.json");
const storyManifestPath = path.join(readingRoot, "stories", "manifest.json");
if (!fs.existsSync(articleManifestPath)) pushError("Article manifest is missing");
if (!fs.existsSync(storyManifestPath)) pushError("Story manifest is missing");
const articleManifest = fs.existsSync(articleManifestPath) ? readJson(articleManifestPath) : {};
const storyManifest = fs.existsSync(storyManifestPath) ? readJson(storyManifestPath) : {};
shelfCounts.articles = Number(manifest.shelves?.articles?.learnerReadyCount || 0);
shelfCounts["short-stories"] = Number(manifest.shelves?.["short-stories"]?.learnerReadyCount || 0);
if (articleManifest.readyCount !== 300 || shelfCounts.articles !== 300) pushError("Articles must retain exactly 300 learner records");
if (storyManifest.readyCount !== 100 && shelfCounts["short-stories"] === 100) pushError("legacy Story manifest does not confirm the current 100 records");

const learnerReadyCount = Object.values(shelfCounts).reduce((sum, value) => sum + Number(value || 0), 0);
if (manifest.learnerReadyCount !== learnerReadyCount) pushError(`manifest learnerReadyCount ${manifest.learnerReadyCount} does not match shelf sum ${learnerReadyCount}`);
if (!allowIncomplete) {
  for (const [shelf, target] of Object.entries(EXPECTED)) {
    if (shelfCounts[shelf] !== target) pushError(`${shelf}: strict final count must be ${target}, got ${shelfCounts[shelf] || 0}`);
    if (manifest.shelves?.[shelf]?.readyForFinal !== true) pushError(`${shelf}: readyForFinal must be true in strict final validation`);
  }
  if (learnerReadyCount !== 2000 || manifest.strictComplete !== true) pushError(`strict final corpus must be exactly 2000 and strictComplete=true`);
  const articleDepthPath = path.join(readingRoot, "qa", "article-depth-report.json");
  if (!fs.existsSync(articleDepthPath) || readJson(articleDepthPath)?.pass !== true) pushError("strict final validation requires passing article-depth-report.json");
}

const report = {
  version: 1,
  generatedDate: new Date().toISOString().slice(0, 10),
  mode: allowIncomplete ? "architecture-and-partial" : "strict-final",
  pass: errors.length === 0,
  totalTarget: 2000,
  learnerReadyCount,
  shelfCounts,
  duplicateLearnerIds: errors.filter((x) => x.startsWith("duplicate learner ID")).length,
  duplicateLearnerBodies: errors.filter((x) => x.startsWith("duplicate learner body")).length,
  duplicateSourceUrls: errors.filter((x) => x.startsWith("duplicate source URL")).length,
  errors,
  warnings,
};
fs.mkdirSync(path.dirname(qaPath), { recursive: true });
fs.writeFileSync(qaPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
