import fs from 'node:fs';
import assert from 'node:assert/strict';

const tokyo = JSON.parse(fs.readFileSync('data/rail/tokyo.json', 'utf8'));
const extension = JSON.parse(fs.readFileSync('data/rail/tokyo-west-extension.json', 'utf8'));

assert.equal(extension.id, 'tokyo-west-extension-v2');
assert.ok(Array.isArray(extension.lines));

const baseById = new Map(tokyo.lines.map(line => [line.id, line]));
const byId = new Map(extension.lines.map(line => [line.id, line]));

const chuo = baseById.get('chuo-rapid-core');
const negishi = baseById.get('keihin-tohoku-core');
assert.equal(chuo?.stations.at(-1)?.code, 'JC16', 'Chuo itinerary corridor must reach Kokubunji');
assert.equal(chuo?.stations.at(-1)?.name, 'Kokubunji');
assert.ok(chuo?.stations.some(station => station.code === 'JC15' && station.name === 'Musashi-Koganei'));
assert.equal(negishi?.stations.at(-1)?.code, 'JK09', 'Keihin-Tohoku/Negishi itinerary corridor must reach Ishikawacho');
assert.equal(negishi?.stations.at(-1)?.name, 'Ishikawacho');
assert.ok(negishi?.stations.some(station => station.code === 'JK11' && station.name === 'Sakuragicho'));

const keio = byId.get('keio-main');
const inokashira = byId.get('keio-inokashira');
const odakyu = byId.get('odakyu-odawara-core');
const enoshima = byId.get('odakyu-enoshima');
const seibu = byId.get('seibu-shinjuku');
const nex = byId.get('jr-narita-express-shinjuku');

assert.ok(keio, 'Keio main line is missing');
assert.ok(inokashira, 'Keio Inokashira Line is missing');
assert.ok(odakyu, 'Odakyu Odawara corridor is missing');
assert.ok(enoshima, 'Odakyu Enoshima Line is missing');
assert.ok(seibu, 'Seibu Shinjuku Line is missing');
assert.ok(nex, 'Narita Express Shinjuku corridor is missing');

assert.equal(keio.operator, 'Keio Corporation');
assert.equal(keio.stations.length, 34, 'Keio Line should contain KO01–KO34');
assert.deepEqual(keio.stations.map(station => station.code), Array.from({ length: 34 }, (_, index) => `KO${String(index + 1).padStart(2, '0')}`));
assert.equal(keio.stations.find(station => station.code === 'KO29')?.name, 'Takahatafudo');

assert.equal(inokashira.operator, 'Keio Corporation');
assert.equal(inokashira.stations.length, 17, 'Inokashira Line should contain IN01–IN17');
assert.equal(inokashira.stations[0].name, 'Shibuya');
assert.equal(inokashira.stations.at(-1)?.name, 'Kichijoji');
assert.equal(inokashira.stations.find(station => station.code === 'IN05')?.name, 'Shimo-kitazawa');

assert.equal(odakyu.operator, 'Odakyu Electric Railway');
assert.equal(odakyu.stations.length, 28, 'Odakyu itinerary corridor should contain OH01–OH28');
assert.equal(odakyu.stations.find(station => station.code === 'OH10')?.name, 'Gotokuji');
assert.equal(odakyu.stations.find(station => station.code === 'OH19')?.name, 'Mukogaoka-yuen');
assert.equal(odakyu.stations.at(-1)?.name, 'Sagami-Ono');

assert.equal(enoshima.operator, 'Odakyu Electric Railway');
assert.equal(enoshima.stations[0].name, 'Sagami-Ono');
assert.equal(enoshima.stations.at(-1)?.code, 'OE16');
assert.equal(enoshima.stations.at(-1)?.name, 'Katase-Enoshima');

assert.equal(seibu.operator, 'Seibu Railway');
assert.equal(seibu.stations.length, 29, 'Seibu Shinjuku Line should contain SS01–SS29');
assert.equal(seibu.stations.find(station => station.code === 'SS02')?.name, 'Takadanobaba');
assert.equal(seibu.stations.find(station => station.code === 'SS18')?.name, 'Hana-Koganei');
assert.equal(seibu.stations.find(station => station.code === 'SS26')?.name, 'Sayamashi');

assert.equal(nex.operator, 'JR East');
assert.ok(nex.networkCostPerEdge > 1, 'NEX service corridor must not become a shortcut for central Tokyo trips');
assert.ok(nex.minutesPerStop >= 15, 'NEX service corridor needs a long-distance timing estimate');
assert.ok(nex.stations.some(station => station.code === 'JO36' && station.name === 'Narita Airport Terminal 2・3'));
assert.equal(nex.stations.at(-1)?.name, 'Shinjuku');

const mergedLines = [...tokyo.lines, ...extension.lines];
const itineraryStations = [
  'Takadanobaba','Shinjuku','Shinagawa','Kamakura','Hase','Gokurakuji','Inamuragasaki','Koshigoe',
  'Katase-Enoshima','Omote-sando','Shibuya','Kokubunji','Yurakucho','Ginza','Nihombashi',
  'Ishikawacho','Sakuragicho','Yokohama','Gotokuji','Mukogaoka-yuen','Ikebukuro',
  'Sayamashi','Hana-Koganei','Musashi-Koganei','Kichijoji','Shimo-kitazawa','Takahatafudo',
  'Narita Airport Terminal 2・3'
];
const stationNames = new Set(mergedLines.flatMap(line => line.stations || []).map(station => station.name));
for (const station of itineraryStations) assert.ok(stationNames.has(station), `Missing October itinerary rail station: ${station}`);

assert.ok(extension.operators.includes('Keio Corporation'));
assert.ok(extension.operators.includes('Odakyu Electric Railway'));
assert.ok(extension.operators.includes('Seibu Railway'));
assert.ok(extension.operators.includes('JR East'));

console.log('Tokyo October itinerary rail coverage validation passed.');
