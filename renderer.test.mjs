import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../src/config.js';
import { Game } from '../src/game.js';
import { Renderer } from '../src/renderer.js';

function createContextStub() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') return () => gradient;
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function createCanvasStub() {
  const context = createContextStub();
  return {
    addEventListener() {},
    getContext() { return context; },
    getBoundingClientRect() { return { left: 0, top: 0, width: GAME.canvasSize, height: GAME.canvasSize }; },
  };
}

test('renderer completes a frame in preparation and combat states', () => {
  const canvas = createCanvasStub();
  const game = new Game(canvas);
  const renderer = new Renderer(canvas);

  assert.doesNotThrow(() => renderer.render(game, 0));
  game.startWave(true);
  for (let index = 0; index < 180; index += 1) game.update(GAME.fixedStep);
  assert.doesNotThrow(() => renderer.render(game, 3));
});

test('critical renderer helpers convert colors and draw dynamically', () => {
  const canvas = createCanvasStub();
  const renderer = new Renderer(canvas);
  assert.equal(renderer.hexToRgba('#4cc9f0', 0.5), 'rgba(76, 201, 240, 0.5)');
  assert.equal(renderer.hexToRgba('#fff', 1), 'rgba(255, 255, 255, 1)');
});
