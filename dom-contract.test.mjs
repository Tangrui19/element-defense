import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const uiSource = readFileSync(resolve(root, 'src', 'ui.js'), 'utf8');

test('all DOM ids required by the UI exist in index.html', () => {
  const ids = [...uiSource.matchAll(/getElementById\('([^']+)'\)/g)].map(match => match[1]);
  assert.ok(ids.length > 10);
  for (const id of ids) {
    assert.match(html, new RegExp(`id="${id}"`), `missing DOM id: ${id}`);
  }
});

test('index uses the modular entry point and contains no external network assets', () => {
  assert.match(html, /<script type="module" src="src\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test('document has no duplicate element ids', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
