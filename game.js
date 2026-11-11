import { ENEMY_TYPES, GAME, MAP, TARGET_MODES, TOWER_TYPES, WAVES } from './config.js';
import { createEnemy, Projectile, Tower } from './entities.js';
import { createPathModels } from './path.js';
import { findChainTargets, selectTarget } from './combat.js';
import { WaveManager } from './wave-manager.js';
import { distance } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.paths = createPathModels(MAP.path, GAME.tileSize);
    this.pathCells = new Set(MAP.path.map(([column, row]) => `${column},${row}`));
    this.waveManager = new WaveManager();
    this.lastFrameTime = 0;
    this.accumulator = 0;

    this.bindCanvasEvents();
    this.newGame();
  }

  get selectedTower() {
    return this.towers.find(tower => tower.id === this.selectedTowerId) || null;
  }

  get currentWaveData() {
    return WAVES[this.nextWaveIndex] || null;
  }

  get previewWaveData() {
    if (this.phase === 'running' && this.currentWaveData) return this.currentWaveData;
    return WAVES[this.nextWaveIndex] || null;
  }

  get remainingEnemies() {
    return this.waveManager.pendingEnemies + this.enemies.length;
  }

  get earlyWaveBonus() {
    if (this.phase !== 'preparing') return 0;
    return Math.max(0, Math.ceil(this.prepRemaining));
  }

  newGame() {
    this.money = GAME.startingMoney;
    this.lives = GAME.startingLives;
    this.waveNumber = 0;
    this.nextWaveIndex = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.particles = [];
    this.phase = 'preparing';
    this.phaseBeforePause = 'preparing';
    this.prepDuration = GAME.firstPrepTime;
    this.prepRemaining = GAME.firstPrepTime;
    this.sessionTime = 0;
    this.kills = 0;
    this.selectedBuildType = 'archer';
    this.selectedTowerId = null;
    this.hoverCell = null;
    this.message = '先选择炮塔并布置防线。可以提前开波，获得额外资金。';
    this.lastWaveReward = 0;
    this.runtimeError = null;
    this.waveManager.reset();
  }

  bindCanvasEvents() {
    this.canvas.addEventListener('pointermove', event => {
      this.hoverCell = this.eventToCell(event);
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoverCell = null;
    });

    this.canvas.addEventListener('click', event => {
      this.handleCanvasClick(this.eventToCell(event));
    });

    this.canvas.addEventListener('contextmenu', event => {
      event.preventDefault();
      this.clearSelection();
    });
  }

  eventToCell(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const column = Math.floor(((event.clientX - rect.left) / rect.width) * GAME.gridSize);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * GAME.gridSize);
    return this.inBounds(column, row) ? { column, row } : null;
  }

  inBounds(column, row) {
    return column >= 0 && column < GAME.gridSize && row >= 0 && row < GAME.gridSize;
  }

  isPath(column, row) {
    return this.pathCells.has(`${column},${row}`);
  }

  towerAt(column, row) {
    return this.towers.find(tower => tower.column === column && tower.row === row) || null;
  }

  isBuildable(column, row) {
    return this.inBounds(column, row) && !this.isPath(column, row) && !this.towerAt(column, row);
  }

  handleCanvasClick(cell) {
    if (!cell || this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'victory') return;

    const existingTower = this.towerAt(cell.column, cell.row);
    if (existingTower) {
      this.selectedTowerId = existingTower.id;
      this.selectedBuildType = null;
      this.message = `${existingTower.type.name}：射程 ${existingTower.type.range.toFixed(1)} 格，可切换目标优先级。`;
      return;
    }

    if (this.isPath(cell.column, cell.row)) {
      this.message = '这里位于敌军路径上，不能建造炮塔。';
      return;
    }

    if (!this.selectedBuildType) {
      this.message = '请先从炮塔列表中选择一种炮塔。';
      return;
    }

    this.buildTower(cell.column, cell.row, this.selectedBuildType);
  }

  buildTower(column, row, typeId) {
    if (this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'victory') return false;
    const type = TOWER_TYPES[typeId];
    if (!type || !this.isBuildable(column, row)) return false;
    if (this.money < type.cost) {
      this.message = `资金不足：${type.name}需要 ${type.cost}。`;
      return false;
    }

    const tower = new Tower(type, column, row, GAME.tileSize);
    this.towers.push(tower);
    this.money -= type.cost;
    this.selectedTowerId = null;
    this.message = `${type.name}部署完成。剩余资金 ${this.money}。`;
    this.addImpact('ring', tower.x, tower.y, type.color, GAME.tileSize * 0.55);
    return true;
  }

  setBuildType(typeId) {
    if (this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'victory') return;
    if (!TOWER_TYPES[typeId]) return;
    if (this.selectedBuildType === typeId) {
      this.selectedBuildType = null;
      this.selectedTowerId = null;
      this.message = '已取消建造选择。点击炮塔可以查看详情。';
      return;
    }
    this.selectedBuildType = typeId;
    this.selectedTowerId = null;
    this.message = `已选择${TOWER_TYPES[typeId].name}，点击空白格建造。`;
  }

  setTargetMode(mode) {
    const tower = this.selectedTower;
    if (!tower || !TARGET_MODES.some(targetMode => targetMode.id === mode)) return;
    tower.targetMode = mode;
    this.message = `${tower.type.name}的目标优先级已切换。`;
  }

  clearSelection() {
    this.selectedBuildType = null;
    this.selectedTowerId = null;
  }

  togglePause() {
    if (this.phase === 'gameover' || this.phase === 'victory') return;

    if (this.phase === 'paused') {
      this.phase = this.phaseBeforePause;
      this.message = '游戏继续。';
    } else {
      this.phaseBeforePause = this.phase;
      this.phase = 'paused';
      this.message = '游戏已暂停。';
    }
  }

  startWave(early = false) {
    if (this.phase !== 'preparing') return false;

    const waveData = WAVES[this.nextWaveIndex];
    if (!waveData) return false;

    const bonus = early ? this.earlyWaveBonus : 0;
    this.money += bonus;
    this.waveNumber = this.nextWaveIndex + 1;
    this.waveManager.start(waveData, this.waveNumber);
    this.phase = 'running';
    this.prepRemaining = 0;
    this.message = bonus > 0
      ? `提前开波，获得 ${bonus} 资金！第 ${this.waveNumber} 波：${waveData.name}。`
      : `第 ${this.waveNumber} 波开始：${waveData.name}！`;
    return true;
  }

  spawnEnemy(typeId) {
    const type = ENEMY_TYPES[typeId];
    if (!type) return;
    const enemy = createEnemy(type, this.waveNumber, this.paths);
    this.enemies.push(enemy);
    this.addImpact('ring', enemy.x, enemy.y, type.color, type.radius * 2.4);
    if (type.boss) this.message = `警告：${type.name}进入战场！`;
  }

  update(dt) {
    if (this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'victory') return;

    this.sessionTime += dt;

    if (this.phase === 'preparing') {
      this.prepRemaining = Math.max(0, this.prepRemaining - dt);
      this.updateVisuals(dt);
      if (this.prepRemaining <= 0) this.startWave(false);
      return;
    }

    if (this.phase !== 'running') return;

    this.waveManager.update(dt, typeId => this.spawnEnemy(typeId));

    for (const enemy of this.enemies) {
      enemy.update(dt);
      if (enemy.dead) this.handleEnemyDeath(enemy);
      if (enemy.leaked) this.handleEnemyLeak(enemy);
    }

    this.enemies = this.enemies.filter(enemy => !enemy.dead && !enemy.leaked);

    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = 'gameover';
      this.selectedTowerId = null;
      this.message = '基地已被攻破。调整炮塔组合后再试一次！';
      this.updateVisuals(dt);
      return;
    }

    for (const tower of this.towers) {
      tower.update(dt);
      if (!tower.ready) continue;
      const target = selectTarget(tower, this.enemies);
      if (target) this.fireTower(tower, target);
    }

    for (const projectile of this.projectiles) {
      const hitTarget = projectile.update(dt);
      if (hitTarget) {
        this.resolveProjectileHit(projectile, hitTarget);
        projectile.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter(projectile => !projectile.dead);

    this.updateVisuals(dt);

    if (this.waveManager.isDoneSpawning() && this.enemies.length === 0) {
      this.completeWave();
    }
  }

  fireTower(tower, target) {
    tower.aimAt(target);
    tower.resetCooldown();
    this.effects.push({
      kind: 'muzzle',
      x: tower.x + Math.cos(tower.angle) * 18,
      y: tower.y + Math.sin(tower.angle) * 18,
      color: tower.type.color,
      size: 14,
      life: 0.14,
      maxLife: 0.14,
    });

    if (tower.type.id === 'tesla') {
      const chainTargets = findChainTargets(
        target,
        this.enemies,
        tower.type.chainCount,
        tower.type.chainRange * GAME.tileSize,
      );
      const points = [{ x: tower.x, y: tower.y }];
      let damage = tower.type.damage;

      for (const chainTarget of chainTargets) {
        points.push({ x: chainTarget.x, y: chainTarget.y });
        this.damageEnemy(chainTarget, damage);
        damage *= tower.type.chainFalloff;
      }

      this.effects.push({
        kind: 'lightning', points, color: tower.type.color,
        life: 0.16, maxLife: 0.16,
      });
      return;
    }

    this.projectiles.push(new Projectile(tower, target));
  }

  resolveProjectileHit(projectile, hitTarget) {
    const type = projectile.type;
    this.addImpact('impact', hitTarget.x, hitTarget.y, type.color, projectile.size * 2.4);

    if (type.splashRadius) {
      const radius = type.splashRadius * GAME.tileSize;
      for (const enemy of this.enemies) {
        if (enemy.alive && distance(enemy, hitTarget) <= radius) {
          this.damageEnemy(enemy, type.damage);
        }
      }
      this.addImpact('blast', hitTarget.x, hitTarget.y, type.color, radius);
      return;
    }

    this.damageEnemy(hitTarget, type.damage);

    if (hitTarget.alive && type.slowFactor) {
      hitTarget.applySlow(type.slowFactor, type.slowDuration);
      this.addImpact('frost', hitTarget.x, hitTarget.y, type.color, hitTarget.radius * 2.6);
    }

    if (hitTarget.alive && type.poisonDps) {
      hitTarget.applyPoison(type.poisonDps, type.poisonDuration);
      this.addImpact('poison', hitTarget.x, hitTarget.y, type.color, hitTarget.radius * 2.2);
    }
  }

  damageEnemy(enemy, amount, ignoreArmor = false) {
    if (!enemy || !enemy.alive) return 0;
    const applied = enemy.takeDamage(amount, ignoreArmor);
    if (enemy.dead) this.handleEnemyDeath(enemy);
    return applied;
  }

  handleEnemyDeath(enemy) {
    if (!enemy || !enemy.dead || enemy.rewarded) return;
    enemy.rewarded = true;
    const reward = Math.round(enemy.type.reward);
    this.money += reward;
    this.kills += 1;
    this.addParticleBurst(enemy.x, enemy.y, enemy.type.color, enemy.type.boss ? 28 : 10);
    this.addImpact('ring', enemy.x, enemy.y, enemy.type.accent, enemy.radius * (enemy.type.boss ? 4 : 2.4));
    if (enemy.type.boss) this.message = `${enemy.type.name}已被击破，获得 ${reward} 资金！`;
  }

  handleEnemyLeak(enemy) {
    if (!enemy || !enemy.leaked) return;
    this.lives = Math.max(0, this.lives - 1);
    this.addParticleBurst(enemy.x, enemy.y, '#ff5b78', enemy.type.boss ? 26 : 8);
    this.message = enemy.type.boss
      ? `${enemy.type.name}突破了防线！`
      : `${enemy.type.name}突破防线，生命 -1。`;
  }

  completeWave() {
    if (this.phase !== 'running') return;

    const reward = this.currentWaveData.reward;
    this.money += reward;
    this.lastWaveReward = reward;
    this.waveManager.reset();
    this.projectiles = [];

    if (this.nextWaveIndex >= WAVES.length - 1) {
      this.phase = 'victory';
      this.selectedTowerId = null;
      this.message = `全部 ${WAVES.length} 波敌军已被击退！`;
      return;
    }

    this.nextWaveIndex += 1;
    this.phase = 'preparing';
    this.prepDuration = GAME.prepTime;
    this.prepRemaining = GAME.prepTime;
    this.message = `第 ${this.waveNumber} 波清除，获得 ${reward} 资金。下一波即将到来。`;
  }

  updateVisuals(dt) {
    for (const effect of this.effects) effect.life -= dt;
    this.effects = this.effects.filter(effect => effect.life > 0);

    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy = particle.vy * 0.98 + particle.gravity * dt;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
  }

  addImpact(kind, x, y, color, size) {
    const life = kind === 'blast' ? 0.42 : 0.28;
    this.effects.push({ kind, x, y, color, size, life, maxLife: life });
  }

  addParticleBurst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 105;
      const life = 0.28 + Math.random() * 0.42;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 18,
        color,
        size: 1.5 + Math.random() * 2.5,
        life,
        maxLife: life,
      });
    }
  }

  start(renderer) {
    this.renderer = renderer;

    const frame = timestamp => {
      requestAnimationFrame(frame);

      try {
        if (this.lastFrameTime === 0) this.lastFrameTime = timestamp;
        const frameDelta = Math.min((timestamp - this.lastFrameTime) / 1000, GAME.maxFrameDelta);
        this.lastFrameTime = timestamp;

        if (this.phase !== 'paused' && this.phase !== 'gameover' && this.phase !== 'victory') {
          this.accumulator += frameDelta;
          let steps = 0;
          while (this.accumulator >= GAME.fixedStep && steps < 12) {
            this.update(GAME.fixedStep);
            this.accumulator -= GAME.fixedStep;
            steps += 1;
          }
        }
      } catch (error) {
        this.reportRuntimeError('update', error);
      }

      try {
        renderer.render(this, timestamp / 1000);
      } catch (error) {
        this.reportRuntimeError('render', error);
      }
    };

    requestAnimationFrame(frame);
  }

  reportRuntimeError(stage, error) {
    if (this.runtimeError) return;
    this.runtimeError = `${stage}: ${error?.message || error}`;
    this.message = `运行异常已拦截：${this.runtimeError}。游戏循环仍在继续。`;
    console.error('[Element Defense]', stage, error);
  }
}






