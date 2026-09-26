import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = JSON.parse(fs.readFileSync('data/rail/tokyo.json', 'utf8'));
const extension = JSON.parse(fs.readFileSync('data/rail/tokyo-west-extension.json', 'utf8'));
assert.equal(extension.id, 'tokyo-west-extension-v1');
assert.ok(Array.isArray(base.lines));
assert.ok(Array.isArray(extension.lines));

const lines = [...base.lines, ...extension.lines];
const byId = new Map(lines.map(line => [line.id, line]));
const codes = (start, end, prefix) => {
  const step = start <= end ? 1 : -1;
  const out = [];
  for (let value = start; value !== end + step; value += step) {
    out.push(`${prefix}${String(value).padStart(2, '0')}`);
  }
  return out;
};

const keio = byId.get('keio-main');
const odakyu = byId.get('odakyu-odawara-core');
const inokashira = byId.get('keio-inokashira');
const seibu = byId.get('seibu-shinjuku-itinerary');
const enoshima = byId.get('odakyu-enoshima');
const romancecar = byId.get('odakyu-romancecar-enoshima-itinerary');
const chuo = byId.get('chuo-rapid-core');
const keihin = byId.get('keihin-tohoku-core');
const nex = byId.get('jr-narita-express-shinjuku-itinerary');

assert.ok(keio, 'Keio main line is missing');
assert.ok(odakyu, 'Odakyu Odawara corridor is missing');
assert.ok(inokashira, 'Keio Inokashira Line is missing');
assert.ok(seibu, 'Seibu Shinjuku itinerary corridor is missing');
assert.ok(enoshima, 'Odakyu Enoshima Line is missing');
assert.ok(romancecar, 'Romancecar Enoshima itinerary service is missing');
assert.ok(chuo, 'JR Chuo itinerary corridor is missing');
assert.ok(keihin, 'JR Keihin-Tohoku/Negishi itinerary corridor is missing');
assert.ok(nex, 'Narita Express itinerary service is missing');

assert.equal(keio.operator, 'Keio Corporation');
assert.equal(keio.stations.length, 34, 'Keio Line should contain KO01–KO34');
assert.deepEqual(keio.stations.map(station => station.code), codes(1, 34, 'KO'));
const takahata = keio.stations.find(station => station.code === 'KO29');
assert.equal(takahata?.name, 'Takahatafudo');
assert.equal(takahata?.jp, '高幡不動');
assert.ok(takahata?.aliases?.includes('Takahata-fudo'));

assert.equal(odakyu.operator, 'Odakyu Electric Railway');
assert.equal(odakyu.stations.length, 28, 'Odakyu corridor should contain OH01–OH28');
assert.deepEqual(odakyu.stations.map(station => station.code), codes(1, 28, 'OH'));
const mukogaoka = odakyu.stations.find(station => station.code === 'OH19');
assert.equal(mukogaoka?.name, 'Mukogaoka-yuen');
assert.equal(mukogaoka?.jp, '向ヶ丘遊園');
assert.ok(mukogaoka?.nearby?.includes('Japan Open-Air Folk House Museum'));
assert.equal(odakyu.stations.find(station => station.code === 'OH28')?.name, 'Sagami-Ono');
assert.ok(odakyu.stations.find(station => station.code === 'OH07')?.aliases?.includes('Shimokitazawa'));

assert.equal(inokashira.stations.length, 17, 'Inokashira Line should contain IN01–IN17');
assert.deepEqual(inokashira.stations.map(station => station.code), codes(1, 17, 'IN'));
assert.equal(inokashira.stations.find(station => station.code === 'IN05')?.name, 'Shimo-kitazawa');
assert.equal(inokashira.stations.find(station => station.code === 'IN17')?.name, 'Kichijoji');

assert.equal(seibu.stations.length, 25, 'Seibu itinerary corridor should contain SS02–SS26');
assert.deepEqual(seibu.stations.map(station => station.code), codes(2, 26, 'SS'));
assert.equal(seibu.stations.find(station => station.code === 'SS02')?.name, 'Takadanobaba');
assert.equal(seibu.stations.find(station => station.code === 'SS18')?.name, 'Hana-Koganei');
assert.equal(seibu.stations.find(station => station.code === 'SS26')?.name, 'Sayamashi');

assert.equal(enoshima.stations[0]?.code, 'OH28');
assert.equal(enoshima.stations[0]?.name, 'Sagami-Ono');
assert.deepEqual(enoshima.stations.slice(1).map(station => station.code), codes(1, 16, 'OE'));
assert.equal(enoshima.stations.find(station => station.code === 'OE16')?.name, 'Katase-Enoshima');
assert.equal(romancecar.stations.length, 2);
assert.deepEqual(romancecar.stations.map(station => station.name), ['Shinjuku', 'Katase-Enoshima']);

assert.equal(chuo.stations.length, 16, 'Chuo itinerary corridor should reach JC16 Kokubunji');
assert.deepEqual(chuo.stations.map(station => station.code), codes(1, 16, 'JC'));
assert.equal(chuo.stations.find(station => station.code === 'JC15')?.name, 'Musashi-Koganei');
assert.equal(chuo.stations.find(station => station.code === 'JC16')?.name, 'Kokubunji');

assert.equal(keihin.stations.length, 22, 'Keihin-Tohoku/Negishi itinerary corridor should reach JK09 Ishikawacho');
assert.deepEqual(keihin.stations.map(station => station.code), codes(30, 9, 'JK'));
assert.equal(keihin.stations.find(station => station.code === 'JK11')?.name, 'Sakuragicho');
assert.equal(keihin.stations.find(station => station.code === 'JK09')?.name, 'Ishikawacho');

assert.equal(nex.stations.length, 2, 'NEX itinerary service should keep only the required direct endpoints');
assert.deepEqual(nex.stations.map(station => station.name), ['Shinjuku', 'Narita Airport T2・3']);
assert.equal(nex.stations[1]?.code, 'JO36');
assert.ok(nex.stations[1]?.aliases?.includes('Narita Airport Terminal 2,3'));

const omotesando = base.lines
  .flatMap(line => line.stations || [])
  .filter(station => station.name === 'Omote-sando');
assert.ok(omotesando.length >= 3);
assert.ok(omotesando.every(station => station.aliases?.includes('Omotesando')));

function hubKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[・·]/g, ' ')
    .replace(/[-‐‑‒–—―]/g, ' ')
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const adjacency = new Map();
const occurrences = new Map();
const nodeId = (line, station) => `${line.id}::${station.code}`;
const addEdge = (a, b) => {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  adjacency.get(a).add(b);
};
for (const line of lines) {
  const stations = line.stations || [];
  for (const station of stations) {
    const id = nodeId(line, station);
    if (!adjacency.has(id)) adjacency.set(id, new Set());
    const key = hubKey(station.name || station.jp || station.code);
    if (!occurrences.has(key)) occurrences.set(key, []);
    occurrences.get(key).push(id);
  }
  for (let index = 0; index < stations.length - 1; index += 1) {
    const a = nodeId(line, stations[index]);
    const b = nodeId(line, stations[index + 1]);
    addEdge(a, b); addEdge(b, a);
  }
}
for (const ids of occurrences.values()) {
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      addEdge(ids[i], ids[j]); addEdge(ids[j], ids[i]);
    }
  }
}

function hasRoute(from, to) {
  const starts = occurrences.get(hubKey(from)) || [];
  const targets = new Set(occurrences.get(hubKey(to)) || []);
  assert.ok(starts.length, `Missing route start: ${from}`);
  assert.ok(targets.size, `Missing route destination: ${to}`);
  const queue = [...starts];
  const seen = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    if (targets.has(current)) return true;
    for (const next of adjacency.get(current) || []) {
      if (seen.has(next)) continue;
      seen.add(next); queue.push(next);
    }
  }
  return false;
}

for (const [from, to] of [
  ['Shinjuku', 'Narita Airport T2・3'],
  ['Shinjuku', 'Kokubunji'],
  ['Shinagawa', 'Ishikawacho'],
  ['Sakuragicho', 'Yokohama'],
  ['Katase-Enoshima', 'Shinjuku'],
  ['Takadanobaba', 'Sayamashi'],
  ['Sayamashi', 'Hana-Koganei'],
  ['Musashi-Koganei', 'Kichijoji'],
  ['Kichijoji', 'Shimo-kitazawa'],
  ['Shimo-kitazawa', 'Takadanobaba'],
  ['Gotokuji', 'Mukogaoka-yuen'],
  ['Takadanobaba', 'Takahatafudo']
]) {
  assert.ok(hasRoute(from, to), `Expected connected offline route: ${from} → ${to}`);
}

assert.ok(extension.operators.includes('Keio Corporation'));
assert.ok(extension.operators.includes('Odakyu Electric Railway'));
assert.ok(extension.operators.includes('Seibu Railway'));

console.log('October itinerary rail coverage validation passed.');
