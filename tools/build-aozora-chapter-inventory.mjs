import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "data", "reading", "candidates", "serialized-novels.json");
const inventory = JSON.parse(fs.readFileSync(file, "utf8"));
const chapters = [];
const clean = (value) => value.replace(/<rt>[\s\S]*?<\/rt>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();

for (const work of inventory.candidates) {
  if (chapters.length >= 80) break;
  try {
    const response = await fetch(work.sourceUrl, { headers: { "user-agent": "SakuraReadingRightsInventory/1.0" } });
    if (!response.ok) continue;
    const html = await response.text();
    const headings = [...html.matchAll(/<(?:h[1-5]|div|p)\b[^>]*class=["'][^"']*(?:midashi|title|chapter)[^"']*["'][^>]*>([\s\S]*?)<\/(?:h[1-5]|div|p)>/gi)]
      .map((match) => clean(match[1]))
      .filter((heading) => heading.length > 0 && heading.length <= 120 && !/^(目次|本文|底本|入力|校正)$/.test(heading));
    const unique = [...new Set(headings)];
    for (let index = 0; index < unique.length && chapters.length < 80; index += 1) {
      chapters.push({ ...work, candidateId: `${work.candidateId}-chapter-${String(index + 1).padStart(3, "0")}`, sourceSectionTitle: unique[index], sourceSectionIndex: index + 1, inventoryNote: "A real named source division extracted from the approved Aozora HTML; no text body is bundled." });
    }
  } catch (error) {
    console.warn(`WARN chapter inspection failed ${work.sourceUrl}: ${error.message}`);
  }
}
fs.writeFileSync(file, `${JSON.stringify({ version: 1, shelf: "serialized-novels", targetCount: 80, candidateCount: chapters.length, candidates: chapters }, null, 2)}\n`);
console.log(JSON.stringify({ chapterCandidates: chapters.length, target: 80 }, null, 2));
