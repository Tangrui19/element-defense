export class WaveManager {
  constructor() {
    this.waveData = null;
    this.waveNumber = 0;
    this.groups = [];
    this.activeGroupIndex = 0;
    this.gapRemaining = 0;
  }

  start(waveData, waveNumber) {
    this.waveData = waveData;
    this.waveNumber = waveNumber;
    this.activeGroupIndex = 0;
    this.gapRemaining = 0;
    this.groups = waveData.groups.map((group, index) => ({
      ...group,
      spawnInterval: Math.max(0.12, group.interval),
      timer: index === 0 ? Math.max(0.5, waveData.initialDelay || 1) : 0,
      spawned: 0,
    }));
  }

  reset() {
    this.waveData = null;
    this.waveNumber = 0;
    this.groups = [];
    this.activeGroupIndex = 0;
    this.gapRemaining = 0;
  }

  update(dt, spawnEnemy) {
    if (this.isDoneSpawning()) return;

    if (this.gapRemaining > 0) {
      this.gapRemaining = Math.max(0, this.gapRemaining - dt);
      return;
    }

    const group = this.groups[this.activeGroupIndex];
    if (!group) return;

    group.timer -= dt;
    while (group.timer <= 0 && group.spawned < group.count) {
      spawnEnemy(group.enemy);
      group.spawned += 1;
      if (group.spawned < group.count) group.timer += group.spawnInterval;
    }

    if (group.spawned >= group.count) {
      this.activeGroupIndex += 1;
      if (this.activeGroupIndex < this.groups.length) {
        this.gapRemaining = this.waveData.groupGap ?? 2.2;
      }
    }
  }

  isDoneSpawning() {
    return this.activeGroupIndex >= this.groups.length;
  }

  get totalEnemies() {
    return this.groups.reduce((total, group) => total + group.count, 0);
  }

  get spawnedEnemies() {
    return this.groups.reduce((total, group) => total + group.spawned, 0);
  }

  get pendingEnemies() {
    return this.totalEnemies - this.spawnedEnemies;
  }

  get composition() {
    const counts = new Map();
    for (const group of this.groups) {
      counts.set(group.enemy, (counts.get(group.enemy) || 0) + group.count);
    }
    return [...counts.entries()].map(([enemy, count]) => ({ enemy, count }));
  }
}
