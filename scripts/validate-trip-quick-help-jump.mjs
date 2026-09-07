import fs from 'node:fs';
import assert from 'node:assert/strict';

const jump=fs.readFileSync('features/sakura-trip-quick-help-jump.js','utf8');
const loader=fs.readFileSync('features/sakura-trip-companion.js','utf8');

assert.ok(jump.includes('SakuraTripQuickHelpJump=Object.freeze({version:1'),'Quick Help jump runtime must expose v1');
assert.ok(jump.includes("main.insertBefore(button,main.firstElementChild)"),'Quick Help shortcut must render at the top of the day content');
assert.ok(jump.includes("button.innerHTML='<span aria-hidden=\"true\">⚡</span><span>Quick Help</span><span aria-hidden=\"true\">↓</span>'"),'shortcut must be visibly labeled Quick Help');
assert.ok(jump.includes("quick.scrollIntoView({behavior:'smooth',block:'start'})"),'shortcut must jump smoothly to the Quick Help card');
assert.ok(jump.includes("if(!root?.classList.contains('open')||!main||!days||days.hidden)"),'shortcut must only appear on the Trip Companion day view');
assert.ok(jump.includes("scroll-margin-top:calc(76px + env(safe-area-inset-top))"),'Quick Help destination must clear the sticky header');
assert.ok(loader.includes('sakura-trip-quick-help-jump.js?v=1'),'Trip Companion loader must load the Quick Help jump module');
assert.ok(loader.includes("SakuraTripQuickHelpJump?.version>=1"),'loader must verify the Quick Help jump runtime');
assert.ok(loader.includes('SakuraTripQuickHelpJump?.decorate?.()'),'loader must decorate the current day immediately after loading');

console.log('Trip Quick Help jump QA: shortcut is top-of-day, day-only, and scrolls to Quick Help.');
