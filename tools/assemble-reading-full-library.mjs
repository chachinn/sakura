import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.resolve(process.env.READING_GENERATED_ROOT || path.join(root, ".reading-generated"));
const readingRoot = path.join(root, "data", "reading");
const libraryRoot = path.join(readingRoot, "library");
const curatedRoot = path.join(libraryRoot, "curated");
const storyRoot = path.join(readingRoot, "stories");

const EXPECTED = Object.freeze({
  "short-stories": 150,
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
const GENERIC = Object.keys(EXPECTED).filter((x) => x !== "short-stories");
const STORY_FILES = Object.freeze({
  classics: "classics.json",
  "modern-literature": "modern-literature.json",
  "mystery-suspense": "mystery-suspense.json",
  "children-stories": "children-stories.json",
  "human-bonds": "human-bonds.json",
  "strange-horror": "strange-horror.json",
});

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".json")) out.push(full);
  }
  return out;
}
function read(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const grouped = Object.fromEntries(Object.keys(EXPECTED).map((shelf) => [shelf, []]));
for (const file of walk(generatedRoot)) {
  const payload = read(file);
  if (payload?.ok !== true || !EXPECTED[payload?.shelf]) continue;
  for (const record of payload.records || []) grouped[payload.shelf].push(record);
}
const errors = [];
for (const [shelf, target] of Object.entries(EXPECTED)) {
  grouped[shelf].sort((a, b) => Number(a.inventoryIndex ?? 999999) - Number(b.inventoryIndex ?? 999999) || String(a.id).localeCompare(String(b.id)));
  if (grouped[shelf].length !== target) errors.push(`${shelf}: ${grouped[shelf].length}/${target}`);
  const ids = new Set(grouped[shelf].map((x) => x.id));
  if (ids.size !== grouped[shelf].length) errors.push(`${shelf}: duplicate generated IDs`);
}
if (errors.length) throw new Error(`Generated corpus is incomplete: ${errors.join("; ")}`);

fs.mkdirSync(curatedRoot, { recursive: true });
for (const shelf of GENERIC) write(path.join(curatedRoot, `${shelf}.json`), grouped[shelf]);

const existingStoryIds = new Set();
const categoryData = {};
for (const [category, file] of Object.entries(STORY_FILES)) {
  const rows = read(path.join(storyRoot, file)).filter((row) => !String(row.id || "").startsWith("rg-story-"));
  categoryData[category] = rows;
  for (const row of rows) existingStoryIds.add(row.id);
}
for (const record of grouped["short-stories"]) {
  if (existingStoryIds.has(record.id)) throw new Error(`Story ID collides with existing record: ${record.id}`);
  if (!categoryData[record.category]) throw new Error(`Unknown generated Story category: ${record.category}`);
  categoryData[record.category].push(record);
}
for (const [category, file] of Object.entries(STORY_FILES)) write(path.join(storyRoot, file), categoryData[category]);

const storyManifestPath = path.join(storyRoot, "manifest.json");
const storyManifest = read(storyManifestPath);
storyManifest.version = Math.max(10, Number(storyManifest.version || 0) + 1);
storyManifest.targetCount = 250;
storyManifest.readyCount = 250;
storyManifest.visibleQualityShelfTarget = 250;
storyManifest.visibleQualityShelfReady = 250;
storyManifest.qualityShelfPolicy = "All 250 verified public-domain Story records are learner-facing. Existing IDs are preserved; new works are genuine Aozora originals with static study support.";
storyManifest.extendedPassageTarget = 250;
storyManifest.sourceArchiveRetained = true;
storyManifest.categories = (storyManifest.categories || []).map((row) => ({
  ...row,
  readyCount: categoryData[row.id]?.length || 0,
  qualityShelfQuota: categoryData[row.id]?.length || 0,
}));
if (storyManifest.categories.reduce((sum, x) => sum + Number(x.readyCount || 0), 0) !== 250) throw new Error("Story category totals do not equal 250");
write(storyManifestPath, storyManifest);

execFileSync(process.execPath, [path.join(root, "tools", "build-reading-library.mjs")], { stdio: "inherit", cwd: root });

const libraryManifestPath = path.join(libraryRoot, "manifest.json");
const manifest = read(libraryManifestPath);
manifest.shelves["short-stories"] = {
  ...manifest.shelves["short-stories"],
  learnerReadyCount: 250,
  qualityStatus: "complete-public-domain-originals",
  readyForFinal: true,
  note: "250 learner-facing public-domain Aozora Story records; original Japanese is not AI-rewritten.",
};
manifest.learnerReadyCount = Object.values(manifest.shelves).reduce((sum, shelf) => sum + Number(shelf?.learnerReadyCount || 0), 0);
manifest.strictComplete = false;
write(libraryManifestPath, manifest);

const summary = Object.fromEntries(Object.entries(EXPECTED).map(([shelf]) => [shelf, grouped[shelf].length]));
console.log(JSON.stringify({ pass: true, generatedAdditions: summary, resultingStoryCount: 250, manifestLearnerReadyCount: manifest.learnerReadyCount }, null, 2));
