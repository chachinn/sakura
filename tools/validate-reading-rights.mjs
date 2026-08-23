import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const registry = JSON.parse(fs.readFileSync(path.join(readingRoot, "source-registry.json"), "utf8"));
const families = new Map(registry.sourceFamilies.map((family) => [family.sourceFamilyId, family]));
const allowedStatuses = new Set(registry.allowedRightsStatuses);
const errors = [];
const warnings = [];
const records = [];
const loadBodies = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json") || name === "manifest.json" || name.endsWith("-index.json")) continue;
    for (const record of JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"))) records.push({ record, file: path.relative(root, path.join(dir, name)) });
  }
};
loadBodies(path.join(readingRoot, "articles"));
loadBodies(path.join(readingRoot, "stories"));

const ids = new Map();
const statuses = {};
for (const { record, file } of records) {
  if (!record.id) errors.push(`${file}: missing id`);
  else if (ids.has(record.id)) errors.push(`${file}: duplicate id ${record.id} (also ${ids.get(record.id)})`);
  else ids.set(record.id, file);
  if (!allowedStatuses.has(record.rightsStatus)) errors.push(`${file}:${record.id}: invalid or missing rightsStatus`);
  statuses[record.rightsStatus] = (statuses[record.rightsStatus] || 0) + 1;
  const family = families.get(record.sourceFamilyId);
  if (!family) { errors.push(`${file}:${record.id}: unknown source family ${record.sourceFamilyId}`); continue; }
  let url;
  try { url = new URL(record.sourceUrl); } catch { errors.push(`${file}:${record.id}: invalid sourceUrl`); continue; }
  if (url.hostname !== family.domain) errors.push(`${file}:${record.id}: source domain ${url.hostname} does not match ${family.domain}`);
  if (!family.approvedPathPatterns.some((pattern) => new RegExp(pattern).test(url.pathname))) errors.push(`${file}:${record.id}: source path is outside approved family patterns`);
  if (!record.sourceAttribution) errors.push(`${file}:${record.id}: missing attribution`);
  if (!record.sourceTermsUrl || !record.sourceLicense || !record.sourceLicenseUrl) errors.push(`${file}:${record.id}: incomplete terms/license metadata`);
  if (record.sourceMode?.includes("adaptation") && family.adaptationAllowed !== true) errors.push(`${file}:${record.id}: adaptation is not permitted by family`);
  if ((record.fullTextBundled || record.sourceMode?.includes("verbatim")) && family.fullTextAllowed === false) errors.push(`${file}:${record.id}: text is included but family disallows full text`);
  if (record.rightsStatus === "public-domain") {
    if (record.rightsEvidence?.workCopyrightFlag !== "なし") errors.push(`${file}:${record.id}: public-domain claim lacks work catalog evidence`);
    if (!record.rightsEvidence?.contributorCopyrightFlags?.length || record.rightsEvidence.contributorCopyrightFlags.some((person) => person.flag !== "なし")) errors.push(`${file}:${record.id}: public-domain claim lacks cleared contributor evidence`);
  }
  if (record.copyright?.thirdPartyAssetsIncluded === true) errors.push(`${file}:${record.id}: third-party asset is bundled`);
}

const targets = { "short-stories": 150, news: 300, "travel-reading": 200, "folktales-legends": 100, "essays-opinions": 150, "school-work": 120, "recipes-how-to": 100, "interviews-qa": 100, "real-life-documents": 200, "serialized-novels": 80, "poetry-micro-reads": 100 };
const candidateCounts = {};
const candidateUrls = new Map();
for (const [shelf, target] of Object.entries(targets)) {
  const file = path.join(readingRoot, "candidates", `${shelf}.json`);
  if (!fs.existsSync(file)) { errors.push(`missing candidate inventory ${shelf}`); continue; }
  const inventory = JSON.parse(fs.readFileSync(file, "utf8"));
  candidateCounts[shelf] = inventory.candidates.length;
  if (inventory.candidates.length < target) errors.push(`${shelf}: ${inventory.candidates.length}/${target} candidates`);
  const localIds = new Set();
  for (const candidate of inventory.candidates) {
    if (localIds.has(candidate.candidateId)) errors.push(`${shelf}: duplicate candidate id ${candidate.candidateId}`);
    localIds.add(candidate.candidateId);
    if (!allowedStatuses.has(candidate.rightsStatus)) errors.push(`${shelf}:${candidate.candidateId}: invalid rightsStatus`);
    const family = families.get(candidate.sourceFamilyId);
    if (!family) { errors.push(`${shelf}:${candidate.candidateId}: unknown family`); continue; }
    let url;
    try { url = new URL(candidate.sourceUrl); } catch { errors.push(`${shelf}:${candidate.candidateId}: invalid URL`); continue; }
    if (url.hostname !== family.domain) errors.push(`${shelf}:${candidate.candidateId}: domain mismatch`);
    if (!candidate.sourceAttribution || !candidate.sourceTermsUrl || !candidate.sourceLicense) errors.push(`${shelf}:${candidate.candidateId}: incomplete rights metadata`);
    if (shelf === "serialized-novels" && !candidate.sourceSectionTitle) errors.push(`${shelf}:${candidate.candidateId}: missing verified source section title`);
    const seenShelves = candidateUrls.get(candidate.sourceUrl) || [];
    seenShelves.push(shelf);
    candidateUrls.set(candidate.sourceUrl, seenShelves);
  }
}

const report = {
  version: 1,
  generatedDate: "2026-08-22",
  pass: errors.length === 0,
  existingRecordsAudited: records.length,
  rightsStatusDistribution: statuses,
  approvedSourceFamilies: registry.sourceFamilies.length,
  rejectedSourceFamilies: 0,
  candidateCounts,
  remainingManualReviewCount: statuses["needs-review"] || 0,
  duplicateExistingIds: errors.filter((value) => value.includes("duplicate id")).length,
  duplicateCandidateSourceUrlsAcrossShelves: [...candidateUrls.values()].filter((shelves) => new Set(shelves).size > 1).length,
  errors,
  warnings
};
const reportDir = path.join(readingRoot, "qa");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "source-rights-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
