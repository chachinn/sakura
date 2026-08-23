import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  throw new Error("Usage: node tools/build-aozora-reading-inventory.mjs <Aozora extended UTF-8 CSV>");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const headers = rows.shift();
headers[0] = headers[0].replace(/^\uFEFF/, "");
const index = Object.fromEntries(headers.map((name, position) => [name, position]));
const value = (row, name) => row[index[name]] ?? "";
const grouped = new Map();
for (const row of rows) {
  const workId = value(row, "作品ID");
  if (!workId) continue;
  const work = grouped.get(workId) || {
    workId,
    title: value(row, "作品名"),
    titleKana: value(row, "作品名読み"),
    classification: value(row, "分類番号"),
    orthography: value(row, "文字遣い種別"),
    workCopyrightFlag: value(row, "作品著作権フラグ"),
    cardUrl: value(row, "図書カードURL"),
    textUrl: value(row, "テキストファイルURL"),
    htmlUrl: value(row, "XHTML/HTMLファイルURL"),
    publication: value(row, "初出"),
    contributors: []
  };
  work.contributors.push({
    personId: value(row, "人物ID"),
    name: `${value(row, "姓")} ${value(row, "名")}`.trim(),
    role: value(row, "役割フラグ"),
    copyrightFlag: value(row, "人物著作権フラグ")
  });
  grouped.set(workId, work);
}

const approved = [...grouped.values()].filter((work) =>
  work.workCopyrightFlag === "なし" &&
  work.cardUrl && (work.htmlUrl || work.textUrl) &&
  work.contributors.length > 0 &&
  work.contributors.every((person) => person.copyrightFlag === "なし")
);
const approvedByCard = new Map(approved.map((work) => [work.cardUrl, work]));
const existingCards = new Set();
for (const name of fs.readdirSync(path.join(root, "data", "reading", "stories"))) {
  if (!name.endsWith(".json") || name === "manifest.json") continue;
  const file = path.join(root, "data", "reading", "stories", name);
  const records = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const record of records) {
    let work = approvedByCard.get(record.sourceCardUrl);
    if (!work) {
      const normalizedAuthor = String(record.author || "").replace(/\s+/g, "");
      const exactMatches = approved.filter((candidate) => candidate.title === record.title && candidate.contributors.some((person) => person.role === "著者" && person.name.replace(/\s+/g, "") === normalizedAuthor));
      if (exactMatches.length !== 1) {
        record.rightsStatus = "needs-review";
        record.rightsEvidence = {
          catalog: "Aozora extended UTF-8 catalog",
          verifiedDate: "2026-08-22",
          failure: "The stored Aozora card URL did not match an approved catalog work and exact title/author resolution was not unique."
        };
        continue;
      }
      [work] = exactMatches;
      record.sourceCardUrl = work.cardUrl;
      record.sourceUrl = work.htmlUrl || work.textUrl;
    }
    existingCards.add(record.sourceCardUrl);
    record.rightsStatus = "public-domain";
    record.rightsEvidence = {
      catalog: "Aozora extended UTF-8 catalog",
      catalogWorkId: work.workId,
      workCopyrightFlag: work.workCopyrightFlag,
      contributorCopyrightFlags: work.contributors.map((person) => ({ role: person.role, name: person.name, flag: person.copyrightFlag })),
      verifiedDate: "2026-08-22"
    };
  }
  const spacing = path.basename(file) === "children-stories.json" ? undefined : 2;
  fs.writeFileSync(file, `${JSON.stringify(records, null, spacing)}\n`);
}
const available = approved.filter((work) => !existingCards.has(work.cardUrl));
const used = new Set();
const pick = (count, predicate) => {
  const matches = available.filter((work) => !used.has(work.workId) && predicate(work)).slice(0, count);
  for (const work of matches) used.add(work.workId);
  return matches;
};
const ndc = (work, prefix) => work.classification.split(/\s+/).some((code) => code.replace(/^NDC/, "").trim().startsWith(prefix));
const has = (work, expression) => expression.test(`${work.title} ${work.titleKana} ${work.classification}`);

const selections = {
  "short-stories": pick(150, (work) => ndc(work, "913") && !has(work, /詩|歌集|随筆|評論/)),
  "folktales-legends": pick(100, (work) => ndc(work, "388") || has(work, /昔話|伝説|民話|童話|お伽|寓話|神話/) || work.contributors.some((person) => /楠山 正雄|鈴木 三重吉|小川 未明|新美 南吉|宮沢 賢治/.test(person.name))),
  "essays-opinions": pick(150, (work) => ndc(work, "914") || ndc(work, "304")),
  "poetry-micro-reads": pick(100, (work) => ndc(work, "911") || has(work, /詩集|歌集|俳句|短歌/)),
  "serialized-novels": pick(80, (work) => ndc(work, "913") && has(work, /物語|日記|記|譚|事件|冒険|長編/))
};

const outputDir = path.join(root, "data", "reading", "candidates");
fs.mkdirSync(outputDir, { recursive: true });
const toCandidate = (shelf, work) => ({
  candidateId: `aozora-${work.workId}`,
  targetShelf: shelf,
  sourceFamilyId: "aozora-bunko",
  sourceTitle: work.title,
  sourceAuthor: work.contributors.filter((person) => person.role === "著者").map((person) => person.name).join(" / "),
  sourceTranslator: work.contributors.filter((person) => /翻訳|訳者/.test(person.role)).map((person) => person.name).join(" / ") || null,
  workId: work.workId,
  sourceUrl: work.htmlUrl || work.textUrl,
  sourceCardUrl: work.cardUrl,
  sourcePublishedDate: work.publication || null,
  sourceLicense: "Aozora Bunko file handling standard (copyright-expired work)",
  sourceLicenseUrl: "https://www.aozora.gr.jp/guide/kijyunn.html",
  sourceTermsUrl: "https://www.aozora.gr.jp/guide/kijyunn.html",
  sourceAttribution: `出典：青空文庫「${work.title}」${work.contributors.map((person) => person.name).join("、")}`,
  sourceProcessing: "Candidate metadata only; no reading body is bundled by this inventory.",
  rightsStatus: "public-domain",
  rightsEvidence: {
    catalog: "Aozora extended UTF-8 catalog",
    workCopyrightFlag: work.workCopyrightFlag,
    contributorCopyrightFlags: work.contributors.map((person) => ({ role: person.role, name: person.name, flag: person.copyrightFlag })),
    checkedRule: "Work and every credited contributor must have copyright flag 'なし'."
  },
  classification: work.classification,
  orthography: work.orthography,
  inventoryNote: shelf === "serialized-novels" ? "Work-level candidate. Real chapter headings/divisions must be verified before chapter records are created; artificial slicing is prohibited." : "Work-level candidate approved for a later educational selection pass."
});

for (const [shelf, works] of Object.entries(selections)) {
  fs.writeFileSync(path.join(outputDir, `${shelf}.json`), `${JSON.stringify({ version: 1, shelf, targetCount: shelf === "serialized-novels" ? 80 : works.length, candidateCount: works.length, candidates: works.map((work) => toCandidate(shelf, work)) }, null, 2)}\n`);
}

console.log(JSON.stringify({ catalogWorks: grouped.size, approvedPublicDomainWorks: approved.length, existingStoryMatches: existingCards.size, candidateCounts: Object.fromEntries(Object.entries(selections).map(([key, works]) => [key, works.length])) }, null, 2));
