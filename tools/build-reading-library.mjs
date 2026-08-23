import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libraryRoot = path.join(root, "data", "reading", "library");
const curatedRoot = path.join(libraryRoot, "curated");
const manifestPath = path.join(libraryRoot, "manifest.json");
const SHARD_SIZE = 20;
const GENERIC_SHELVES = [
  "news",
  "travel",
  "folklore",
  "essays",
  "school-work",
  "recipes",
  "interviews",
  "documents",
  "novels",
  "micro",
];
const LEVELS = new Set(["N5", "N4", "N3", "N2", "N1"]);

function die(message) {
  throw new Error(`Reading Garden library build: ${message}`);
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function bodyText(record) {
  if (Array.isArray(record.paragraphs)) {
    return record.paragraphs.map((paragraph) => String(paragraph?.japanese || "")).join("\n");
  }
  return String(record.originalText || record.japanese || "");
}
function validateParagraph(paragraph, shelf, index, paragraphIndex) {
  if (!paragraph || typeof paragraph !== "object") die(`${shelf}[${index}] paragraph ${paragraphIndex} is invalid`);
  if (!nonEmpty(paragraph.japanese)) die(`${shelf}[${index}] paragraph ${paragraphIndex} is missing Japanese text`);
  if (!nonEmpty(paragraph.kana)) die(`${shelf}[${index}] paragraph ${paragraphIndex} is missing kana`);
  if (!nonEmpty(paragraph.english)) die(`${shelf}[${index}] paragraph ${paragraphIndex} is missing English meaning`);
  if (!nonEmpty(paragraph.furigana)) die(`${shelf}[${index}] paragraph ${paragraphIndex} is missing furigana markup`);
}
function validateRecord(record, shelf, index) {
  if (!record || typeof record !== "object") die(`${shelf}[${index}] is not an object`);
  const required = ["id", "title", "titleKana", "titleEnglish", "studyDifficulty", "sourceTitle", "sourcePublisher", "sourceUrl", "sourceFamilyId", "rightsStatus"];
  for (const field of required) if (!nonEmpty(record[field])) die(`${shelf}[${index}] is missing ${field}`);
  if (record.shelf !== shelf) die(`${record.id}: shelf must be ${shelf}`);
  if (!LEVELS.has(record.studyDifficulty)) die(`${record.id}: invalid studyDifficulty ${record.studyDifficulty}`);
  if (!/^https:\/\//.test(record.sourceUrl)) die(`${record.id}: sourceUrl must be HTTPS`);
  if (!Array.isArray(record.paragraphs) || !record.paragraphs.length) die(`${record.id}: paragraphs are required`);
  record.paragraphs.forEach((paragraph, paragraphIndex) => validateParagraph(paragraph, shelf, index, paragraphIndex));
  const japanese = bodyText(record).replace(/\s/g, "");
  if (!japanese) die(`${record.id}: learner-facing Japanese body is empty`);
  if (shelf !== "micro" && japanese.length < 40) die(`${record.id}: learner-facing body is too thin (${japanese.length} characters)`);
  if (!Array.isArray(record.vocabularyFocus)) record.vocabularyFocus = [];
  if (!Array.isArray(record.grammarFocus)) record.grammarFocus = [];
  if (!Array.isArray(record.comprehension)) record.comprehension = [];
  if (!Number.isFinite(Number(record.estimatedMinutes))) record.estimatedMinutes = Math.max(1, Math.ceil(japanese.length / 180));
  record.characterCount = japanese.length;
  return record;
}
function compactIndex(record, pack) {
  return {
    id: record.id,
    type: record.type || "reading",
    shelf: record.shelf,
    studyDifficulty: record.studyDifficulty,
    title: record.title,
    titleKana: record.titleKana,
    titleEnglish: record.titleEnglish,
    summary: String(record.summary || ""),
    estimatedMinutes: Number(record.estimatedMinutes) || 1,
    characterCount: Number(record.characterCount) || bodyText(record).replace(/\s/g, "").length,
    sourcePublisher: record.sourcePublisher,
    sourceYear: record.sourceYear || null,
    sourceFamilyId: record.sourceFamilyId,
    rightsStatus: record.rightsStatus,
    pack,
    ...(record.seriesId ? { seriesId: record.seriesId } : {}),
    ...(record.chapterNumber != null ? { chapterNumber: record.chapterNumber } : {}),
    ...(record.chapterTitle ? { chapterTitle: record.chapterTitle } : {}),
  };
}
function clearGeneratedShelf(shelf) {
  const dir = path.join(libraryRoot, shelf);
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === "index.json" || /^part-\d{3}\.json$/.test(name)) fs.rmSync(path.join(dir, name));
  }
}

if (!fs.existsSync(manifestPath)) die("manifest.json is missing");
const manifest = readJson(manifestPath);
const allIds = new Set();
let generatedGeneric = 0;

for (const shelf of GENERIC_SHELVES) {
  const config = manifest.shelves?.[shelf];
  if (!config) die(`manifest is missing shelf ${shelf}`);
  const curatedPath = path.join(curatedRoot, `${shelf}.json`);
  if (!fs.existsSync(curatedPath)) {
    if ((config.learnerReadyCount || 0) !== 0 || (config.shards || []).length) {
      die(`${shelf}: manifest claims generated learner content but curated source file is missing`);
    }
    continue;
  }
  const parsed = readJson(curatedPath);
  const records = Array.isArray(parsed) ? parsed : parsed?.records;
  if (!Array.isArray(records)) die(`${shelf}: curated file must be an array or {records:[...]}`);
  if (records.length > config.target) die(`${shelf}: ${records.length} records exceeds target ${config.target}`);
  const validated = records.map((record, index) => validateRecord({ ...record }, shelf, index));
  for (const record of validated) {
    if (allIds.has(record.id)) die(`duplicate learner ID ${record.id}`);
    allIds.add(record.id);
  }
  clearGeneratedShelf(shelf);
  const shardNames = [];
  const indexRows = [];
  for (let offset = 0; offset < validated.length; offset += SHARD_SIZE) {
    const shardNumber = Math.floor(offset / SHARD_SIZE) + 1;
    const name = `part-${String(shardNumber).padStart(3, "0")}.json`;
    const chunk = validated.slice(offset, offset + SHARD_SIZE);
    writeJson(path.join(libraryRoot, shelf, name), chunk);
    shardNames.push(`${shelf}/${name}`);
    chunk.forEach((record) => indexRows.push(compactIndex(record, name)));
  }
  writeJson(path.join(libraryRoot, shelf, "index.json"), indexRows);
  config.learnerReadyCount = validated.length;
  config.shards = shardNames;
  config.readyForFinal = validated.length === config.target;
  config.index = `${shelf}/index.json`;
  generatedGeneric += validated.length;
}

manifest.generatedDate = new Date().toISOString().slice(0, 10);
manifest.learnerReadyCount = Object.values(manifest.shelves).reduce((sum, shelf) => sum + Number(shelf.learnerReadyCount || 0), 0);
manifest.strictComplete = manifest.learnerReadyCount === manifest.totalTarget && Object.values(manifest.shelves).every((shelf) => shelf.readyForFinal === true);
writeJson(manifestPath, manifest);

console.log(JSON.stringify({
  pass: true,
  generatedGeneric,
  learnerReadyCount: manifest.learnerReadyCount,
  totalTarget: manifest.totalTarget,
  strictComplete: manifest.strictComplete,
}, null, 2));
