import fs from "node:fs";

const registryPath = "data/reading/source-registry.json";
const discoveryPath = "tools/discover-reading-article-topic-sources.mjs";

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const pmda = registry.sourceFamilies.find((family) => family.sourceFamilyId === "gov-pmda");
if (!pmda) throw new Error("gov-pmda source family not found");
const pmdaPattern = "^/pnavi-07\\.html$";
if (!pmda.approvedPathPatterns.includes(pmdaPattern)) pmda.approvedPathPatterns.push(pmdaPattern);
pmda.notes = "PMDA site policy applies PDL 1.0 unless otherwise indicated. Reading Garden approval is restricted to PMDA-authored HTML cosmetics/quasi-drug guidance, consultation, safety and explanatory pages in the listed paths, including the quasi-drug navigation overview. PDF review reports, manufacturer-authored application materials, separately governed databases/services, and any item with contrary rights text are excluded.";

let egov = registry.sourceFamilies.find((family) => family.sourceFamilyId === "gov-egov-law");
if (!egov) {
  egov = {
    sourceFamilyId: "gov-egov-law",
    name: "e-Gov Law Search",
    domain: "laws.e-gov.go.jp",
    publisher: "e-Gov法令検索・デジタル庁",
    sourceType: "open-government",
    termsUrl: "https://www.e-gov.go.jp/en/term-of-use.html",
    licenseName: "Government of Japan Standard Terms of Use (Version 2.0), CC BY 4.0 compatible",
    licenseUrl: "https://www.e-gov.go.jp/en/term-of-use.html",
    allowedUse: ["copy", "public-transmission", "translation", "adaptation", "commercial-use"],
    fullTextAllowed: true,
    adaptationAllowed: true,
    attributionRequired: true,
    modificationDisclosureRequired: true,
    thirdPartyAssetWarning: true,
    approvedPathPatterns: ["^/law/", "^/api/1/lawdata/"],
    excludedContent: ["logos", "symbols", "characters", "third-party assets", "content with separate terms"],
    notes: "Restricted to official e-Gov Law Search statutory pages and Law API data. e-Gov terms permit reuse, translation and modification with attribution; statutory text is used without bundled third-party assets.",
    verifiedDate: "2026-08-22"
  };
  registry.sourceFamilies.push(egov);
} else {
  for (const pattern of ["^/law/", "^/api/1/lawdata/"]) if (!egov.approvedPathPatterns.includes(pattern)) egov.approvedPathPatterns.push(pattern);
}
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

let discovery = fs.readFileSync(discoveryPath, "utf8");
if (!discovery.includes('"gov-egov-law": { beauty:16 }')) {
  const priorAnchor = '  "gov-pmda": { beauty:14, health:4 },';
  if (!discovery.includes(priorAnchor)) throw new Error("e-Gov family prior anchor not found");
  discovery = discovery.replace(priorAnchor, `${priorAnchor}\n  "gov-egov-law": { beauty:16 },`);
}
if (!discovery.includes('families:["gov-mhlw","gov-caa","gov-pmda","gov-egov-law"]')) {
  const familyAnchor = 'families:["gov-mhlw","gov-caa","gov-pmda"]';
  if (!discovery.includes(familyAnchor)) throw new Error("Beauty family anchor not found");
  discovery = discovery.replace(familyAnchor, 'families:["gov-mhlw","gov-caa","gov-pmda","gov-egov-law"]');
}

const typeAnchor = 'const type = response.headers.get("content-type") || ""; if (!/text\\/html|application\\/xhtml\\+xml/i.test(type)) return {ok:false,url:finalUrl,error:"non-html"};';
if (discovery.includes(typeAnchor)) {
  discovery = discovery.replace(typeAnchor, 'const type = response.headers.get("content-type") || ""; const egovXml = finalFamily.sourceFamilyId === "gov-egov-law" && /xml/i.test(type); if (!/text\\/html|application\\/xhtml\\+xml/i.test(type) && !egovXml) return {ok:false,url:finalUrl,error:"non-html"};');
}
const parseAnchor = 'const html = decodeHtml(bytes,response.headers); const body = extractBody(html); const title = titleFromHtml(html,new URL(finalUrl).pathname.split("/").filter(Boolean).at(-1)||finalFamily.name);';
if (discovery.includes(parseAnchor)) {
  discovery = discovery.replace(parseAnchor, 'const html = decodeHtml(bytes,response.headers); const body = egovXml ? clean(html.replace(/<[^>]+>/g," ")) : extractBody(html); const title = egovXml ? clean((html.match(/<LawTitle[^>]*>([\\s\\S]*?)<\\/LawTitle>/i)||[])[1] || "美容師法") : titleFromHtml(html,new URL(finalUrl).pathname.split("/").filter(Boolean).at(-1)||finalFamily.name);');
}

const anchor = '      "https://www.caa.go.jp/policies/policy/representation/household_goods/"';
if (!discovery.includes(anchor)) throw new Error("Beauty root anchor not found");
const roots = [
  '      "https://www.caa.go.jp/policies/policy/consumer_safety/child/project_001/mail/20240328/"',
  '      "https://www.caa.go.jp/policies/policy/consumer_policy/information/information_002"',
  '      "https://www.pmda.go.jp/pnavi-07.html"',
  '      "https://www.mhlw.go.jp/stf/newpage_04978.html"',
  '      "https://www.mhlw.go.jp/stf/newpage_68162.html"',
  '      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000124874.html"',
  '      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9325&dataType=1&pageNo=1"',
  '      "https://www.mhlw.go.jp/web/t_doc?dataId=79081000"',
  '      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc1147&dataType=1&pageNo=1"',
  '      "https://www.mhlw.go.jp/web/t_doc?dataId=00td0052&dataType=1&pageNo=1"',
  '      "https://www.mhlw.go.jp/web/t_doc?dataId=00tb8904&dataType=1&pageNo=1"',
  '      "https://laws.e-gov.go.jp/api/1/lawdata/332AC1000000163"',
];
for (const root of roots) {
  const exact = root.trim().replace(/,$/, "");
  if (discovery.includes(exact)) continue;
  discovery = discovery.replace(anchor, `${anchor},\n${root}`);
}
fs.writeFileSync(discoveryPath, discovery);

console.log(JSON.stringify({
  pass: true,
  addedBeautyRoots: roots.map((line) => line.trim().replace(/[\",]$/g, "").replace(/^"/, "")),
  addedPmdaPathPattern: pmdaPattern,
  addedSourceFamily: "gov-egov-law",
  eGovMachineReadableLawData: true
}, null, 2));
