import fs from "node:fs";

const registryPath = "data/reading/source-registry.json";
const discoveryPath = "tools/discover-reading-article-topic-sources.mjs";

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const pmda = registry.sourceFamilies.find((family) => family.sourceFamilyId === "gov-pmda");
if (!pmda) throw new Error("gov-pmda source family not found");
const pmdaPattern = "^/pnavi-07\\.html$";
if (!pmda.approvedPathPatterns.includes(pmdaPattern)) pmda.approvedPathPatterns.push(pmdaPattern);
pmda.notes = "PMDA site policy applies PDL 1.0 unless otherwise indicated. Reading Garden approval is restricted to PMDA-authored HTML cosmetics/quasi-drug guidance, consultation, safety and explanatory pages in the listed paths, including the quasi-drug navigation overview. PDF review reports, manufacturer-authored application materials, separately governed databases/services, and any item with contrary rights text are excluded.";
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

let discovery = fs.readFileSync(discoveryPath, "utf8");
const anchor = '      "https://www.caa.go.jp/policies/policy/representation/household_goods/"';
if (!discovery.includes(anchor)) throw new Error("Beauty root anchor not found");
const roots = [
  '      "https://www.caa.go.jp/policies/policy/consumer_safety/child/project_001/mail/20240328/"',
  '      "https://www.caa.go.jp/policies/policy/consumer_policy/information/information_002"',
  '      "https://www.pmda.go.jp/pnavi-07.html"',
  '      "https://www.mhlw.go.jp/stf/newpage_04978.html"',
];
for (const root of roots) {
  if (discovery.includes(root.trim().replace(/,$/, ""))) continue;
  discovery = discovery.replace(anchor, `${anchor},\n${root}`);
}
fs.writeFileSync(discoveryPath, discovery);

console.log(JSON.stringify({
  pass: true,
  addedBeautyRoots: roots.map((line) => line.trim().replace(/[\",]$/g, "").replace(/^"/, "")),
  addedPmdaPathPattern: pmdaPattern,
}, null, 2));
