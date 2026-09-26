import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync("data/slang.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "data/slang.js" });

const data = sandbox.window.SLANG_DATA;
assert.ok(Array.isArray(data), "window.SLANG_DATA must be an array");

const ids = data.map(entry => entry.id).filter(Boolean);
const expressions = data.map(entry => entry.expression).filter(Boolean);
assert.equal(new Set(ids).size, ids.length, "Slang IDs must be unique");
assert.equal(new Set(expressions).size, expressions.length, "Slang expressions must be unique");

const expected = new Map([
  ["アゲ", "Still common"],
  ["アゲー", "Still common"],
  ["神", "Still common"],
  ["ネ申", "Common in 2026"],
  ["ほまに", "Current gyaru slang"],
  ["レート高い", "Current gyaru slang"],
  ["しぬ／爆死", "Current gyaru slang"],
  ["ゆるされへん", "Current gyaru slang"],
  ["ま？", "Still common"],
  ["ギリハッピー", "Current gyaru slang"],
  ["ジバ", "Current gyaru slang"],
  ["しゃばい", "Current gyaru slang"],
  ["ガン萎え", "Becoming dated"],
  ["あげみざわ", "Becoming dated"],
  ["マジ卍", "Mostly ironic"]
]);

for (const [expression, status] of expected) {
  const matches = data.filter(entry => entry.expression === expression);
  assert.equal(matches.length, 1, `Expected exactly one slang entry for ${expression}`);
  const entry = matches[0];
  assert.ok(String(entry.id || "").startsWith("slang-gyaru-"), `${expression} must use a curated gyaru ID`);
  assert.ok(entry.categories?.includes("Gyaru"), `${expression} must remain in the Gyaru collection`);
  assert.equal(entry.currentStatus || entry.status, status, `${expression} status drifted`);
  assert.ok(entry.naturalMeaning || entry.meaning, `${expression} needs a natural meaning`);
  assert.ok(entry.exampleSentence, `${expression} needs an example sentence`);
  assert.ok(entry.exampleTranslation, `${expression} needs an example translation`);
  assert.ok(entry.nuanceNotes || entry.notes, `${expression} needs nuance notes`);
}

const index = fs.readFileSync("index.html", "utf8");
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const indexVersion = index.match(/data\/slang\.js\?v=(\d+)/)?.[1];
const workerVersion = serviceWorker.match(/data\/slang\.js\?v=(\d+)/)?.[1];
assert.ok(indexVersion, "index.html must version data/slang.js");
assert.equal(workerVersion, indexVersion, "PWA precache slang version must match index.html");
assert.match(serviceWorker, /sakura-shell-v\d+/, "PWA shell cache must be versioned");

console.log(`Slang validation passed: ${data.length} entries, ${expected.size} curated gyaru entries, slang asset v${indexVersion}.`);
