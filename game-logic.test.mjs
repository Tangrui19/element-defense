import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES, GAME, TOWER_TYPES, WAVES } from '../src/config.js';
import { Enemy, Tower } from '../src/entities.js';
import { selectTarget } from '../src/combat.js';
import { createPathModels } from '../src/path.js';
import { WaveManager } from '../src/wave-manager.js';

const paths = createPathModels(
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]].map(([column, row]) => [column + 4, row + 4]),
  GAME.tileSize,
);

test('all configured waves reference valid enemies', () => {
  assert.equal(WAVES.length, GAME.totalWaves);
  for (const wave of WAVES) {
    assert.ok(wave.groups.length > 0);
    for (const group of wave.groups) {
      assert.ok(ENEMY_TYPES[group.enemy], `unknown enemy ${group.enemy}`);
      assert.ok(group.count > 0);
      assert.ok(group.interval > 0);
    }
  }
});

test('armor mitigation and slow effects work', () => {
  const enemy = new Enemy(ENEMY_TYPES.armored, 1, paths, GAME.tileSize, GAME.hpPerWave, GAME.speedPerWave);
  const originalHp = enemy.hp;
  const applied = enemy.takeDamage(100);
  assert.ok(Math.abs(applied - 68) < 0.001);
  assert.ok(enemy.hp < originalHp);
  enemy.applySlow(0.5, 1);
  const startDistance = enemy.distance;
  enemy.update(1);
  assert.ok(enemy.distance - startDistance < enemy.baseSpeed * GAME.tileSize);
});

test('target selection filters flying units for ground-only towers', () => {
  const tower = new Tower(TOWER_TYPES.cannon, 0, 0, GAME.tileSize);
  const ground = new Enemy(ENEMY_TYPES.grunt, 1, paths, GAME.tileSize, GAME.hpPerWave, GAME.speedPerWave);
  const flying = new Enemy(ENEMY_TYPES.wraith, 1, paths, GAME.tileSize, GAME.hpPerWave, GAME.speedPerWave);
  tower.x = 100;
  tower.y = 100;
  tower.range = 500;
  ground.x = 120; ground.y = 100; ground.distance = 20;
  flying.x = 130; flying.y = 100; flying.distance = 30;
  assert.equal(selectTarget(tower, [ground, flying]), ground);
});

test('wave manager spawns every configured enemy once', () => {
  const manager = new WaveManager();
  manager.start(WAVES[0], 1);
  const spawned = [];
  for (let index = 0; index < 600; index += 1) {
    manager.update(0.05, type => spawned.push(type));
  }
  const expected = WAVES[0].groups.reduce((total, group) => total + group.count, 0);
  assert.equal(spawned.length, expected);
  assert.equal(manager.pendingEnemies, 0);
  assert.equal(manager.isDoneSpawning(), true);
});

test('wave groups spawn sequentially instead of overlapping', () => {
  const manager = new WaveManager();
  manager.start(WAVES[1], 2);
  const spawned = [];
  for (let index = 0; index < 800; index += 1) {
    manager.update(0.05, type => spawned.push(type));
  }
  const firstRunner = spawned.indexOf('runner');
  assert.ok(firstRunner > 0);
  assert.equal(spawned.slice(0, firstRunner).every(type => type === 'grunt'), true);
  assert.equal(spawned.slice(0, firstRunner).length, WAVES[1].groups[0].count);
});

test('enemy poison damage can eliminate a target over time', () => {
  const enemy = new Enemy(ENEMY_TYPES.swarm, 1, paths, GAME.tileSize, GAME.hpPerWave, GAME.speedPerWave);
  enemy.applyPoison(1000, 1);
  enemy.update(0.1);
  assert.equal(enemy.dead, true);
});

