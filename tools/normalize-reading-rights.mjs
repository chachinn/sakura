import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readingRoot = path.join(root, "data", "reading");
const registry = JSON.parse(fs.readFileSync(path.join(readingRoot, "source-registry.json"), "utf8"));
const familyByDomain = new Map(registry.sourceFamilies.map((family) => [family.domain, family]));
const articleRoot = path.join(readingRoot, "articles");
const storyRoot = path.join(readingRoot, "stories");
const bodyFiles = (dir) => fs.readdirSync(dir)
  .filter((name) => name.endsWith(".json") && name !== "manifest.json" && !name.endsWith("-index.json"))
  .map((name) => path.join(dir, name));

let changed = 0;
for (const file of bodyFiles(articleRoot)) {
  const records = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const record of records) {
    const family = familyByDomain.get(new URL(record.sourceUrl).hostname);
    if (!family || family.sourceFamilyId === "aozora-bunko") {
      throw new Error(`No government source family for ${record.id}: ${record.sourceUrl}`);
    }
    record.sourceFamilyId = family.sourceFamilyId;
    record.rightsStatus = "adaptation-permitted";
    record.sourceLicense = family.licenseName;
    record.sourceLicenseUrl = family.licenseUrl;
    record.sourceTermsUrl = family.termsUrl;
    changed += 1;
  }
  const prettyArticleFiles = new Set(["n1-c.json", "n1-d.json", "n2-c.json", "n2-d.json", "n3-b.json", "n3-c.json", "n3-d.json", "n4-b.json", "n4-c.json", "n4-d.json", "n5-c.json", "n5-d.json"]);
  const spacing = prettyArticleFiles.has(path.basename(file)) ? 2 : undefined;
  fs.writeFileSync(file, `${JSON.stringify(records, null, spacing)}\n`);
}

for (const file of bodyFiles(storyRoot)) {
  const records = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const record of records) {
    record.sourceFamilyId = "aozora-bunko";
    record.sourceAuthor = record.author;
    record.rightsStatus = "public-domain";
    record.sourceLicense = "Aozora Bunko file handling standard (copyright-expired work)";
    record.sourceLicenseUrl = "https://www.aozora.gr.jp/guide/kijyunn.html";
    changed += 1;
  }
  const spacing = path.basename(file) === "children-stories.json" ? undefined : 2;
  fs.writeFileSync(file, `${JSON.stringify(records, null, spacing)}\n`);
}

console.log(JSON.stringify({ normalizedRecords: changed, articles: 300, stories: 100 }, null, 2));
