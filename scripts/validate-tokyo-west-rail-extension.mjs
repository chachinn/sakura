import fs from 'node:fs';
import assert from 'node:assert/strict';

const extension = JSON.parse(fs.readFileSync('data/rail/tokyo-west-extension.json', 'utf8'));
assert.equal(extension.id, 'tokyo-west-extension-v1');
assert.ok(Array.isArray(extension.lines));

const byId = new Map(extension.lines.map(line => [line.id, line]));
const keio = byId.get('keio-main');
const odakyu = byId.get('odakyu-odawara-core');
assert.ok(keio, 'Keio main line is missing');
assert.ok(odakyu, 'Odakyu core is missing');

assert.equal(keio.operator, 'Keio Corporation');
assert.equal(keio.stations.length, 34, 'Keio Line should contain KO01–KO34');
assert.deepEqual(keio.stations.map(station => station.code), Array.from({ length: 34 }, (_, index) => `KO${String(index + 1).padStart(2, '0')}`));
const takahata = keio.stations.find(station => station.code === 'KO29');
assert.equal(takahata?.name, 'Takahatafudo');
assert.equal(takahata?.jp, '高幡不動');
assert.ok(takahata?.aliases?.includes('Takahata-fudo'));

assert.equal(odakyu.operator, 'Odakyu Electric Railway');
assert.equal(odakyu.stations.length, 19, 'Odakyu core should contain OH01–OH19');
assert.deepEqual(odakyu.stations.map(station => station.code), Array.from({ length: 19 }, (_, index) => `OH${String(index + 1).padStart(2, '0')}`));
const mukogaoka = odakyu.stations.find(station => station.code === 'OH19');
assert.equal(mukogaoka?.name, 'Mukogaoka-yuen');
assert.equal(mukogaoka?.jp, '向ヶ丘遊園');
assert.ok(mukogaoka?.nearby?.includes('Japan Open-Air Folk House Museum'));

assert.equal(keio.stations[0].name, 'Shinjuku');
assert.equal(odakyu.stations[0].name, 'Shinjuku');
assert.ok(extension.operators.includes('Keio Corporation'));
assert.ok(extension.operators.includes('Odakyu Electric Railway'));

console.log('Tokyo west rail extension validation passed.');
