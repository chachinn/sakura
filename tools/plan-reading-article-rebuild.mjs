import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const articleRoot = path.join(readingRoot, "articles");
const qaRoot = path.join(readingRoot, "qa");
const manifest = JSON.parse(fs.readFileSync(path.join(articleRoot, "manifest.json"), "utf8"));
const sourcePack = JSON.parse(fs.readFileSync(path.join(readingRoot, "body-ready", "articles.json"), "utf8"));
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const TOPICS = ["beauty", "food", "travel", "digital", "consumer", "health", "environment", "culture", "work", "society"];
const LONGFORM_SOURCE_FLOORS = Object.freeze({ N5: 350, N4: 450, N3: 600, N2: 800, N1: 1000 });

function countBy(rows, key) {
  const out = {};
  for (const row of rows) {
    const value = typeof key === "function" ? key(row) : row?.[key];
    const name = String(value ?? "unknown");
    out[name] = (out[name] || 0) + 1;
  }
  return out;
}

const slots = [];
for (const level of LEVELS) {
  for (const file of manifest.levelFiles?.[level] || []) {
    const rows = JSON.parse(fs.readFileSync(path.join(articleRoot, file), "utf8"));
    if (!Array.isArray(rows) || rows.length !== 10) throw new Error(`${file}: expected 10 Article slots`);
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      slots.push({
        articleId: row.id,
        pack: file,
        packIndex: index,
        jlpt: row.jlpt,
        topic: row.topic,
        legacyTitle: row.title,
        legacySourceUrl: row.sourceUrl || null,
      });
    }
  }
}
const sources = Array.isArray(sourcePack?.records) ? sourcePack.records : [];
const errors = [];
if (slots.length !== 300) errors.push(`expected 300 stable Article slots, got ${slots.length}`);
if (sources.length !== 300) errors.push(`expected 300 balanced sources, got ${sources.length}`);
if (new Set(slots.map((x) => x.articleId)).size !== slots.length) errors.push("Article slot IDs are not unique");
if (new Set(sources.map((x) => x.candidateId)).size !== sources.length) errors.push("source candidate IDs are not unique");
if (new Set(sources.map((x) => x.sourceUrl)).size !== sources.length) errors.push("source URLs are not unique");
if (new Set(sources.map((x) => x.sourceBodyFingerprint)).size !== sources.length) errors.push("source bodies are not unique");
for (const topic of TOPICS) {
  const slotCount = slots.filter((x) => x.topic === topic).length;
  const sourceCount = sources.filter((x) => x.articleTopic === topic).length;
  if (slotCount !== 30) errors.push(`${topic}: expected 30 stable slots, got ${slotCount}`);
  if (sourceCount !== 30) errors.push(`${topic}: expected 30 verified sources, got ${sourceCount}`);
}
for (const level of LEVELS) {
  const count = slots.filter((x) => x.jlpt === level).length;
  if (count !== 60) errors.push(`${level}: expected 60 stable slots, got ${count}`);
}
if (errors.length) throw new Error(errors.join("\n"));

const hasLongformReservations = sources.every((source) => LEVELS.includes(source.recommendedArticleLevel));
const plan = [];
let preservedLegacySourcePairings = 0;
const planningErrors = [];

if (hasLongformReservations) {
  // Final mode: the discovery pass already reserved each verified source for a level
  // whose learner Article it can support without source inflation. Preserve stable
  // learner IDs; preserve an old source pairing only inside the same topic+level pool.
  for (const topic of TOPICS) {
    for (const level of LEVELS) {
      const topicLevelSlots = slots
        .filter((slot) => slot.topic === topic && slot.jlpt === level)
        .sort((a, b) => a.pack.localeCompare(b.pack) || a.packIndex - b.packIndex || a.articleId.localeCompare(b.articleId));
      const topicLevelSources = sources
        .filter((source) => source.articleTopic === topic && source.recommendedArticleLevel === level)
        .sort((a, b) => Number(b.topicScore || 0) - Number(a.topicScore || 0)
          || Number(b.sourceTextCharacterCount || 0) - Number(a.sourceTextCharacterCount || 0)
          || String(a.sourceUrl).localeCompare(String(b.sourceUrl)));
      if (topicLevelSlots.length !== topicLevelSources.length) {
        planningErrors.push(`${topic}/${level}: slot/source reservation mismatch ${topicLevelSlots.length}/${topicLevelSources.length}`);
        continue;
      }
      const floor = LONGFORM_SOURCE_FLOORS[level];
      for (const source of topicLevelSources) {
        const chars = Number(source.sourceTextCharacterCount || 0);
        if (chars < floor) planningErrors.push(`${source.candidateId}: ${chars} source characters cannot support ${level} floor ${floor}`);
        if (Number(source.longformSourceFloor || 0) !== floor) planningErrors.push(`${source.candidateId}: stored longformSourceFloor does not match ${level}`);
      }

      const remainingSources = new Map(topicLevelSources.map((source) => [source.candidateId, source]));
      const sourceByUrl = new Map(topicLevelSources.map((source) => [source.sourceUrl, source]));
      const assignedSlots = new Set();
      for (const slot of topicLevelSlots) {
        const source = slot.legacySourceUrl ? sourceByUrl.get(slot.legacySourceUrl) : null;
        if (!source || !remainingSources.has(source.candidateId)) continue;
        plan.push({ slot, source, assignmentReason: "preserved-verified-longform-legacy-source" });
        remainingSources.delete(source.candidateId);
        assignedSlots.add(slot.articleId);
        preservedLegacySourcePairings += 1;
      }
      const freeSlots = topicLevelSlots.filter((slot) => !assignedSlots.has(slot.articleId));
      const freeSources = [...remainingSources.values()];
      if (freeSlots.length !== freeSources.length) planningErrors.push(`${topic}/${level}: free slot/source mismatch`);
      for (let index = 0; index < Math.min(freeSlots.length, freeSources.length); index += 1) {
        plan.push({ slot: freeSlots[index], source: freeSources[index], assignmentReason: "topic-level-longform-reservation" });
      }
    }
  }
} else {
  // Compatibility mode for the pre-long-form source pack. This keeps architecture CI
  // readable while source hardening is in flight; final release requires reservation mode.
  for (const topic of TOPICS) {
    const topicSlots = slots.filter((x) => x.topic === topic);
    const topicSources = sources.filter((x) => x.articleTopic === topic);
    const remainingSources = new Map(topicSources.map((source) => [source.candidateId, source]));
    const sourceByUrl = new Map(topicSources.map((source) => [source.sourceUrl, source]));
    const assignedSlots = new Set();
    for (const slot of topicSlots) {
      const source = slot.legacySourceUrl ? sourceByUrl.get(slot.legacySourceUrl) : null;
      if (!source || !remainingSources.has(source.candidateId)) continue;
      plan.push({ slot, source, assignmentReason: "legacy-compatibility-only" });
      remainingSources.delete(source.candidateId);
      assignedSlots.add(slot.articleId);
      preservedLegacySourcePairings += 1;
    }
    const freeSlots = topicSlots.filter((slot) => !assignedSlots.has(slot.articleId)).sort((a, b) => {
      return LEVELS.indexOf(a.jlpt) - LEVELS.indexOf(b.jlpt)
        || a.pack.localeCompare(b.pack)
        || a.packIndex - b.packIndex
        || a.articleId.localeCompare(b.articleId);
    });
    const freeSources = [...remainingSources.values()].sort((a, b) => {
      return Number(a.sourceTextCharacterCount || 0) - Number(b.sourceTextCharacterCount || 0)
        || Number(b.topicScore || 0) - Number(a.topicScore || 0)
        || String(a.sourceUrl).localeCompare(String(b.sourceUrl));
    });
    if (freeSlots.length !== freeSources.length) planningErrors.push(`${topic}: compatibility free slot/source mismatch`);
    for (let index = 0; index < Math.min(freeSlots.length, freeSources.length); index += 1) {
      plan.push({ slot: freeSlots[index], source: freeSources[index], assignmentReason: "legacy-topic-balanced-size-to-study-level" });
    }
  }
}

const mappings = plan.map(({ slot, source, assignmentReason }) => ({
  articleId: slot.articleId,
  pack: slot.pack,
  packIndex: slot.packIndex,
  jlpt: slot.jlpt,
  topic: slot.topic,
  legacyTitle: slot.legacyTitle,
  legacySourceUrl: slot.legacySourceUrl,
  assignmentReason,
  sourceCandidateId: source.candidateId,
  sourceFamilyId: source.sourceFamilyId,
  sourcePublisher: source.sourcePublisher,
  sourceTitle: source.sourceTitle,
  sourceUrl: source.sourceUrl,
  sourcePublishedDate: source.sourcePublishedDate ?? null,
  sourceRetrievedDate: source.sourceRetrievedDate ?? null,
  sourceTextCharacterCount: Number(source.sourceTextCharacterCount || 0),
  sourceBodyFingerprint: source.sourceBodyFingerprint,
  rightsStatus: source.rightsStatus,
  recommendedArticleLevel: source.recommendedArticleLevel ?? null,
  longformSourceFloor: source.longformSourceFloor ?? null,
})).sort((a, b) => LEVELS.indexOf(a.jlpt) - LEVELS.indexOf(b.jlpt)
  || a.pack.localeCompare(b.pack)
  || a.packIndex - b.packIndex);

const sourceIds = new Set(mappings.map((x) => x.sourceCandidateId));
const sourceUrls = new Set(mappings.map((x) => x.sourceUrl));
const sourceBodies = new Set(mappings.map((x) => x.sourceBodyFingerprint));
const mappedIds = new Set(mappings.map((x) => x.articleId));
const finalErrors = [...planningErrors];
if (mappings.length !== 300) finalErrors.push(`expected 300 mappings, got ${mappings.length}`);
if (mappedIds.size !== 300) finalErrors.push(`expected 300 mapped stable IDs, got ${mappedIds.size}`);
if (sourceIds.size !== 300) finalErrors.push(`expected 300 unique source IDs, got ${sourceIds.size}`);
if (sourceUrls.size !== 300) finalErrors.push(`expected 300 unique source URLs, got ${sourceUrls.size}`);
if (sourceBodies.size !== 300) finalErrors.push(`expected 300 unique source bodies, got ${sourceBodies.size}`);
for (const topic of TOPICS) if (mappings.filter((x) => x.topic === topic).length !== 30) finalErrors.push(`${topic}: final mapping is not 30`);
for (const level of LEVELS) if (mappings.filter((x) => x.jlpt === level).length !== 60) finalErrors.push(`${level}: final mapping is not 60`);
if (hasLongformReservations) {
  for (const row of mappings) {
    const floor = LONGFORM_SOURCE_FLOORS[row.jlpt];
    if (row.recommendedArticleLevel !== row.jlpt) finalErrors.push(`${row.articleId}: source reserved for ${row.recommendedArticleLevel}, slot is ${row.jlpt}`);
    if (row.sourceTextCharacterCount < floor) finalErrors.push(`${row.articleId}: source ${row.sourceTextCharacterCount} < ${row.jlpt} source floor ${floor}`);
  }
}

const reportPath = path.join(qaRoot, "article-rebuild-plan.json");
let previousReport = null;
try {
  previousReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch {
  previousReport = null;
}
const mode = hasLongformReservations ? "longform-reservations" : "legacy-compatibility";
const mappingUnchanged = previousReport?.mode === mode
  && JSON.stringify(previousReport?.mappings || []) === JSON.stringify(mappings);
const generatedDate = mappingUnchanged && typeof previousReport?.generatedDate === "string"
  ? previousReport.generatedDate
  : new Date().toISOString().slice(0, 10);

const report = {
  version: 3,
  generatedDate,
  pass: finalErrors.length === 0,
  mode,
  policy: hasLongformReservations
    ? "Final learner rewrite mapping preserves the 300 stable Article IDs while mapping each slot to one verified source explicitly reserved for the same topic and study-support level. Source length must meet the level's long-form floor so generation cannot inflate a thin page into a long Article."
    : "Compatibility planning for the pre-long-form source pack only. This mode is not sufficient for final learner corpus release.",
  longformSourceFloors: LONGFORM_SOURCE_FLOORS,
  articleSlots: mappings.length,
  uniqueArticleIds: mappedIds.size,
  uniqueSourceCandidateIds: sourceIds.size,
  uniqueSourceUrls: sourceUrls.size,
  uniqueSourceBodies: sourceBodies.size,
  preservedLegacySourcePairings,
  byLevel: countBy(mappings, "jlpt"),
  byTopic: countBy(mappings, "topic"),
  byAssignmentReason: countBy(mappings, "assignmentReason"),
  errors: finalErrors,
  mappings,
};
fs.mkdirSync(qaRoot, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  pass: report.pass,
  mode: report.mode,
  articleSlots: report.articleSlots,
  uniqueSourceUrls: report.uniqueSourceUrls,
  uniqueSourceBodies: report.uniqueSourceBodies,
  preservedLegacySourcePairings,
  byLevel: report.byLevel,
  byTopic: report.byTopic,
  errors: report.errors,
}, null, 2));
if (!report.pass) process.exitCode = 1;
