import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAME } from '../src/config.js';
import { Game } from '../src/game.js';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = { setProperty() {}, width: '' };
    this.classList = { toggle() {}, add() {}, remove() {} };
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.innerHTML = '';
  }
  addEventListener() {}
  appendChild(child) { this.children.push(child); return child; }
  querySelector(selector) { return selector === 'span' ? new FakeElement() : null; }
  setAttribute() {}
}

function installFakeDom() {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const elements = new Map(ids.map(id => [id, new FakeElement(id)]));
  globalThis.document = {
    hidden: false,
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) { return selector === '.phase-badge' ? new FakeElement() : null; },
    createElement() { return new FakeElement(); },
    addEventListener() {},
  };
  globalThis.window = { addEventListener() {} };
  globalThis.requestAnimationFrame = () => 0;
  return elements;
}

test('UI constructs and refreshes against the real document contract', async () => {
  const elements = installFakeDom();
  const canvas = {
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: GAME.canvasSize, height: GAME.canvasSize }; },
  };
  const game = new Game(canvas);
  const { UI } = await import('../src/ui.js');
  const ui = new UI(game);

  assert.doesNotThrow(() => ui.refresh());
  assert.equal(elements.get('build-menu').children.length, 6);
  assert.equal(elements.get('money').textContent, String(GAME.startingMoney));
  assert.equal(elements.get('wave-total').textContent, `/${GAME.totalWaves}`);

  assert.equal(game.buildTower(2, 2, 'archer'), true);
  ui.refresh();
  assert.equal(elements.get('tower-count').textContent, '1');
  assert.match(elements.get('tower-layer').innerHTML, /scene-tower/);

  game.startWave(true);
  for (let index = 0; index < 61; index += 1) game.update(GAME.fixedStep);
  ui.refresh();
  assert.match(`${elements.get('projectile-layer').innerHTML}${elements.get('effect-layer').innerHTML}`, /scene-(projectile|effect|lightning)/);
  assert.equal(elements.get('start').disabled, true);
  assert.match(elements.get('enemy-layer').innerHTML, /scene-enemy/);
});





