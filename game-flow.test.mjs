import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../src/config.js';
import { Game } from '../src/game.js';

function createFakeCanvas() {
  return {
    addEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: GAME.canvasSize, height: GAME.canvasSize };
    },
  };
}

test('game prevents overlapping waves and advances through preparation', () => {
  const game = new Game(createFakeCanvas());
  const startingMoney = game.money;
  assert.equal(game.startWave(true), true);
  assert.equal(game.waveNumber, 1);
  assert.ok(game.money > startingMoney);
  assert.equal(game.startWave(true), false);
  assert.equal(game.waveNumber, 1);

  for (let index = 0; index < 120; index += 1) game.update(GAME.fixedStep);
  assert.ok(game.enemies.length > 0);
  assert.equal(game.phase, 'running');
});

test('pause prevents simulation until resumed', () => {
  const game = new Game(createFakeCanvas());
  const before = game.prepRemaining;
  game.togglePause();
  game.update(1);
  assert.equal(game.prepRemaining, before);
  game.togglePause();
  game.update(1);
  assert.ok(game.prepRemaining < before);
});

test('tower placement spends money and blocks occupied or path cells', () => {
  const game = new Game(createFakeCanvas());
  const before = game.money;
  assert.equal(game.buildTower(0, 0, 'archer'), true);
  assert.equal(game.money, before - 30);
  assert.equal(game.buildTower(0, 0, 'archer'), false);
  assert.equal(game.buildTower(0, 1, 'archer'), false);
});
