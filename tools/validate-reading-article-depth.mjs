import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articleRoot = path.join(root, "data", "reading", "articles");
const qaPath = path.join(root, "data", "reading", "qa", "article-depth-report.json");
const manifest = JSON.parse(fs.readFileSync(path.join(articleRoot, "manifest.json"), "utf8"));
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const LONGFORM_MINIMUMS = Object.freeze({
  N5: { characters: 350, paragraphs: 5 },
  N4: { characters: 450, paragraphs: 5 },
  N3: { characters: 600, paragraphs: 6 },
  N2: { characters: 800, paragraphs: 6 },
  N1: { characters: 1000, paragraphs: 7 },
});
const errors = [];
const records = [];
const seenIds = new Set();
const seenBodies = new Map();

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, "").replace(/[「」『』（）()。、，．・：:;；!?！？]+/g, "");
}
function body(record) {
  return (record.paragraphs || []).map((paragraph) => String(paragraph?.japanese || "")).join("\n");
}
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function statistics(values) {
  if (!values.length) return { minimum: 0, median: 0, average: 0, maximum: 0 };
  return {
    minimum: Math.min(...values),
    median: Math.round(median(values) * 10) / 10,
    average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10,
    maximum: Math.max(...values),
  };
}
function answerText(question) {
  const index = Number(question?.answerIndex);
  return Number.isInteger(index) && question?.choices?.[index] ? String(question.choices[index].japanese || "") : "";
}
function grammarNeedle(pattern) {
  return normalize(String(pattern || "").replace(/[〜～]/g, ""));
}

for (const level of LEVELS) {
  const files = manifest.levelFiles?.[level] || [];
  const minimums = LONGFORM_MINIMUMS[level];
  for (const name of files) {
    const file = path.join(articleRoot, name);
    if (!fs.existsSync(file)) {
      errors.push(`${level}: missing Article shard ${name}`);
      continue;
    }
    const shard = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(shard) || shard.length !== 10) errors.push(`${level}/${name}: expected exactly 10 Article records`);
    for (const record of Array.isArray(shard) ? shard : []) {
      records.push(record);
      if (!record?.id) errors.push(`${level}/${name}: Article missing id`);
      else if (seenIds.has(record.id)) errors.push(`duplicate Article id: ${record.id}`);
      else seenIds.add(record.id);
      if (record?.jlpt !== level) errors.push(`${record?.id || name}: expected ${level}`);
      const paragraphs = Array.isArray(record?.paragraphs) ? record.paragraphs : [];
      const japanese = body(record);
      const compact = normalize(japanese);
      const hash = crypto.createHash("sha256").update(compact).digest("hex");
      if (compact && seenBodies.has(hash)) errors.push(`duplicate Article body: ${seenBodies.get(hash)} and ${record.id}`);
      else if (compact) seenBodies.set(hash, record.id);
      if (Number(record?.contentVersion || 0) < 4) errors.push(`${record?.id}: final depth rewrite has not been versioned`);
      if (record?.depthRevision !== "substantial-one-source") errors.push(`${record?.id}: depthRevision must be substantial-one-source`);
      if (paragraphs.length < minimums.paragraphs) errors.push(`${record?.id}: ${level} long-form Article needs at least ${minimums.paragraphs} meaningful learner paragraphs, got ${paragraphs.length}`);
      if (compact.length < minimums.characters) errors.push(`${record?.id}: ${level} long-form Article needs at least ${minimums.characters} Japanese characters, got ${compact.length}`);
      if (paragraphs.some((paragraph) => !paragraph?.japanese || !paragraph?.kana || !paragraph?.furigana || !paragraph?.english)) errors.push(`${record?.id}: paragraph support fields are incomplete`);
      if (!record?.sourceUrl || !/^https:\/\//.test(record.sourceUrl)) errors.push(`${record?.id}: verified HTTPS sourceUrl missing`);
      if (!record?.sourceFamilyId || !record?.rightsStatus || !record?.sourcePublisher || !record?.sourceTitle) errors.push(`${record?.id}: source/rights metadata incomplete`);
      if (Array.isArray(record?.sourceAdditionalUrls) && record.sourceAdditionalUrls.length) errors.push(`${record?.id}: final Article must not stitch additional source URLs`);
      if (/combines|multi-source|multi-section feature/i.test(String(record?.sourceProcessing || ""))) errors.push(`${record?.id}: retired multi-source processing language remains`);
      for (const vocab of record?.vocabularyFocus || []) {
        if (vocab?.word && !japanese.includes(vocab.word)) errors.push(`${record?.id}: vocabulary word does not appear in displayed text: ${vocab.word}`);
      }
      for (const grammar of record?.grammarFocus || []) {
        const needle = grammarNeedle(grammar);
        if (needle.length >= 2 && !normalize(japanese).includes(needle)) errors.push(`${record?.id}: grammar focus does not appear in displayed text: ${grammar}`);
      }
      for (const question of record?.comprehension || []) {
        const answer = normalize(answerText(question));
        if (!answer) errors.push(`${record?.id}: comprehension question has no valid answer choice`);
        else if (!normalize(japanese).includes(answer)) errors.push(`${record?.id}: comprehension answer is not supported verbatim by displayed text: ${answerText(question)}`);
      }
    }
  }
}

if (records.length !== 300) errors.push(`Article corpus must contain exactly 300 records, got ${records.length}`);
const byLevel = {};
for (const level of LEVELS) {
  const group = records.filter((record) => record.jlpt === level);
  const minimums = LONGFORM_MINIMUMS[level];
  byLevel[level] = {
    count: group.length,
    requiredMinimumJapaneseCharacters: minimums.characters,
    requiredMinimumParagraphs: minimums.paragraphs,
    characters: statistics(group.map((record) => normalize(body(record)).length)),
    paragraphs: statistics(group.map((record) => Array.isArray(record.paragraphs) ? record.paragraphs.length : 0)),
    belowLongformMinimum: group.filter((record) => normalize(body(record)).length < minimums.characters || (record.paragraphs || []).length < minimums.paragraphs).map((record) => record.id),
    sampleLikeOutliers: group.filter((record) => record.depthRevision !== "substantial-one-source").map((record) => record.id),
  };
}
const report = {
  version: 2,
  generatedDate: new Date().toISOString().slice(0, 10),
  pass: errors.length === 0,
  policy: "Final Article QA requires substantial one-source long-form learner adaptations with level-specific minimum Japanese depth. Minimums are floors, not padding targets; unsupported or repetitive filler remains invalid.",
  longformMinimums: LONGFORM_MINIMUMS,
  articleCount: records.length,
  byLevel,
  errors,
};
fs.mkdirSync(path.dirname(qaPath), { recursive: true });
fs.writeFileSync(qaPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
