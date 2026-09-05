import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const state=read('features/sakura-trip-return-state.js');
const pinned=read('features/sakura-trip-pinned-rail.js');
const loader=read('features/sakura-trip-companion.js');

for(const selector of [
  'data-help="place"','data-help="transit"','data-help="camera"','data-help="sakutalk"',
  'data-stz2-show','data-stz2-rail','data-stlv-home','data-all','data-trips'
]) assert.ok(state.includes(selector),`return state must capture ${selector}`);

for(const selector of [
  'data-stz2-back','data-scj2-back','data-ti-close','data-stpr-return'
]) assert.ok(state.includes(selector),`return state must restore from ${selector}`);

for(const selector of ['.stc-day','data-open-day','data-open-trip','data-import','data-save'])
  assert.ok(state.includes(selector),`intentional navigation must cancel stale state for ${selector}`);

assert.ok(state.includes('scrollTop:scroller.scrollTop'),'vertical Trip Companion position must be captured');
assert.ok(state.includes('daysScrollLeft'),'horizontal day-tab position must be captured and restored');
assert.ok(state.includes('hadTimeline')&&state.includes('waitingForTimeline'),'restore must wait for the rebuilt full-day timeline');
assert.ok(state.includes('Math.min(pending.scrollTop,max)'),'restored scroll must be clamped to the rebuilt page');
assert.ok(state.includes("setTimeout(()=>{if(pending&&!pending.returnRequested&&sameContext()&&!blockingToolOpen())clear()},450)"),'cancelled tools must not leave stale return state');
assert.ok(state.includes('__returnStateV1'),'Trip Companion open must be wrapped exactly once');
assert.ok(pinned.includes("SakuraTripReturnState?.capture?.('railway')"),'pinned Railway must explicitly capture Trip Companion position before its bridge closes the screen');
assert.ok(pinned.includes("SakuraTripReturnState?.requestRestore?.('railway-back')"),'pinned Railway Back must explicitly request exact saved-position restoration');
assert.ok(loader.includes('sakura-trip-return-state.js?v=1'),'Trip Companion loader must load the return-state layer');
assert.ok(loader.indexOf('sakura-trip-companion-stabilize-v2.js')<loader.indexOf('sakura-trip-return-state.js'),'return-state layer must load after the day timeline/stabilizer');

console.log('Trip return-state QA: navigation contracts passed.');
