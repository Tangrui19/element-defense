import { distance } from './utils.js';

export function selectTarget(tower, enemies) {
  const candidates = enemies.filter(enemy => tower.canTarget(enemy));
  if (candidates.length === 0) return null;

  switch (tower.targetMode) {
    case 'last':
      return candidates.reduce((best, enemy) => (
        !best || enemy.progress < best.progress ? enemy : best
      ), null);
    case 'strongest':
      return candidates.reduce((best, enemy) => (
        !best || enemy.hp > best.hp ? enemy : best
      ), null);
    case 'closest':
      return candidates.reduce((best, enemy) => (
        !best || distance(tower, enemy) < distance(tower, best) ? enemy : best
      ), null);
    case 'first':
    default:
      return candidates.reduce((best, enemy) => (
        !best || enemy.progress > best.progress ? enemy : best
      ), null);
  }
}

export function findChainTargets(primary, enemies, count, range, excluded = new Set()) {
  const targets = [primary];
  const selectedIds = new Set([primary.id, ...excluded]);

  while (targets.length < count) {
    const current = targets[targets.length - 1];
    let nearest = null;
    let nearestDistance = range;

    for (const enemy of enemies) {
      if (!enemy.alive || selectedIds.has(enemy.id)) continue;
      const candidateDistance = distance(current, enemy);
      if (candidateDistance <= nearestDistance) {
        nearest = enemy;
        nearestDistance = candidateDistance;
      }
    }

    if (!nearest) break;
    targets.push(nearest);
    selectedIds.add(nearest.id);
  }

  return targets;
}
