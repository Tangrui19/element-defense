import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, '元素塔防-双击即玩.html'), 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);

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

function createContextStub() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') return () => gradient;
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) { target[property] = value; return true; },
  });
}

function createFakeCanvas() {
  return {
    addEventListener() {},
    getContext() { return createContextStub(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 520, height: 520 }; },
  };
}

test('standalone HTML is self-contained and executes without browser module loading', () => {
  assert.match(html, /<style>/);
  assert.match(html, /<script>/);
  assert.doesNotMatch(html, /href="style\.css"/);
  assert.doesNotMatch(html, /src="src\/main\.js"/);

  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script, 'inline game script is missing');

  const elements = new Map(ids.map(id => [id, id === 'game' ? createFakeCanvas() : new FakeElement(id)]));
  const context = vm.createContext({
    console,
    Math,
    Set,
    Map,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    Date,
    document: {
      hidden: false,
      getElementById(id) { return elements.get(id) || null; },
      querySelector(selector) { return selector === '.phase-badge' ? new FakeElement() : null; },
      createElement() { return new FakeElement(); },
      addEventListener() {},
    },
    window: { addEventListener() {} },
    requestAnimationFrame() { return 0; },
  });

  assert.doesNotThrow(() => vm.runInContext(script, context, { filename: 'standalone-game.js' }));
  assert.equal(elements.get('build-menu').children.length, 6);
});








