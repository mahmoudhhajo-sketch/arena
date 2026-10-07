import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {localWeeklyTimeFromSweden} from '../src/lib/localTime';

const october = new Date('2026-10-07T00:00:00.000Z');
assert.match(localWeeklyTimeFromSweden(0, 6, 0, october, 'Asia/Dhaka'), /söndag 10\.00/);
assert.match(localWeeklyTimeFromSweden(1, 4, 0, october, 'Asia/Dhaka'), /måndag 08\.00/);
assert.match(localWeeklyTimeFromSweden(0, 6, 0, october, 'Europe/Stockholm'), /söndag 06\.00/);

const uiRoots = ['src/components', 'src/state'];
for (const root of uiRoots) {
  for (const file of walk(root)) {
    assert.doesNotMatch(
      fs.readFileSync(file, 'utf8'),
      /timeZone\s*:\s*['"]Europe\/Stockholm/,
      `${file} still forces Swedish time for a concrete timestamp`
    );
  }
}

const app = fs.readFileSync('src/App.tsx', 'utf8');
assert.match(app, /19\.00, svensk tid/);

console.log('PASS: concrete times follow the visitor, while the explicit Swedish match rule remains Swedish.');

function* walk(root: string): Generator<string> {
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const item = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walk(item);
    else if (/\.tsx?$/.test(entry.name)) yield item;
  }
}
