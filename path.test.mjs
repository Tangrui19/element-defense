import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME, MAP } from '../src/config.js';
import { createPathModels, PathModel } from '../src/path.js';

test('map path is contiguous and orthogonal', () => {
  for (let index = 1; index < MAP.path.length; index += 1) {
    const previous = MAP.path[index - 1];
    const current = MAP.path[index];
    const manhattanDistance = Math.abs(current[0] - previous[0]) + Math.abs(current[1] - previous[1]);
    assert.equal(manhattanDistance, 1, `path breaks between ${previous} and ${current}`);
  }
});

test('path model clamps and reaches both endpoints', () => {
  const path = new PathModel([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  assert.deepEqual(path.pointAt(-10), { x: 0, y: 0, angle: 0, segmentIndex: 0 });
  assert.equal(path.length, 200);
  const end = path.pointAt(999);
  assert.equal(end.x, 100);
  assert.equal(end.y, 100);
});

test('flying path is a direct route between entry and base', () => {
  const paths = createPathModels(MAP.path, GAME.tileSize);
  assert.equal(paths.air.points.length, 2);
  assert.ok(paths.air.length < paths.ground.length);
});
