import { GAME } from './config.js';
import { distance } from './utils.js';

let enemySequence = 0;

export class Enemy {
  constructor(type, waveNumber, paths, tileSize, hpPerWave, speedPerWave) {
    enemySequence += 1;
    const healthScale = 1 + Math.max(0, waveNumber - 1) * hpPerWave;
    const speedScale = 1 + Math.max(0, waveNumber - 1) * speedPerWave;

    this.id = enemySequence;
    this.type = type;
    this.waveNumber = waveNumber;
    this.path = type.flying ? paths.air : paths.ground;
    this.tileSize = tileSize;
    this.maxHp = Math.round(type.hp * healthScale);
    this.hp = this.maxHp;
    this.baseSpeed = type.speed * speedScale;
    this.armor = type.armor;
    this.radius = type.radius;
    this.distance = 0;
    this.dead = false;
    this.leaked = false;
    this.rewarded = false;
    this.slowFactor = 1;
    this.slowTimer = 0;
    this.poisonDps = 0;
    this.poisonTimer = 0;
    this.hitFlash = 0;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.syncPosition();
  }

  get alive() {
    return !this.dead && !this.leaked;
  }

  get progress() {
    return this.path.length === 0 ? 0 : this.distance / this.path.length;
  }

  syncPosition() {
    const point = this.path.pointAt(this.distance);
    this.x = point.x;
    this.y = point.y;
    this.angle = point.angle;
  }

  update(dt) {
    if (!this.alive) return;

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.poisonTimer > 0) {
      const activeTime = Math.min(dt, this.poisonTimer);
      this.takeDamage(this.poisonDps * activeTime, true);
      this.poisonTimer = Math.max(0, this.poisonTimer - dt);
      if (!this.alive) return;
    }

    let speedMultiplier = 1;
    if (this.slowTimer > 0) {
      speedMultiplier = this.slowFactor;
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) this.slowFactor = 1;
    }

    this.distance += this.baseSpeed * this.tileSize * speedMultiplier * dt;

    if (this.distance >= this.path.length) {
      this.distance = this.path.length;
      this.leaked = true;
    }

    this.syncPosition();
  }

  takeDamage(amount, ignoreArmor = false) {
    if (!this.alive || amount <= 0) return 0;
    const mitigation = ignoreArmor ? 0 : this.armor;
    const appliedDamage = Math.max(0.1, amount * (1 - mitigation));
    this.hp = Math.max(0, this.hp - appliedDamage);
    this.hitFlash = 0.09;
    if (this.hp <= 0) this.dead = true;
    return appliedDamage;
  }

  applySlow(factor, duration) {
    if (!this.alive) return;
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  applyPoison(dps, duration) {
    if (!this.alive) return;
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonTimer = Math.max(this.poisonTimer, duration);
  }
}

export class Tower {
  constructor(type, column, row, tileSize) {
    this.id = `${type.id}-${column}-${row}`;
    this.type = type;
    this.column = column;
    this.row = row;
    this.x = column * tileSize + tileSize / 2;
    this.y = row * tileSize + tileSize / 2;
    this.range = type.range * tileSize;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
    this.targetMode = type.defaultTarget;
    this.shotsFired = 0;
  }

  get ready() {
    return this.cooldown <= 0;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  canTarget(enemy) {
    if (!enemy.alive) return false;
    if (enemy.type.flying && !this.type.canTargetFlying) return false;
    return distance(this, enemy) <= this.range;
  }

  resetCooldown() {
    this.cooldown = 1 / this.type.fireRate;
  }

  aimAt(enemy) {
    this.angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
    this.shotsFired += 1;
  }
}

export class Projectile {
  constructor(tower, target) {
    const type = tower.type;
    this.id = `${tower.id}-${tower.shotsFired}`;
    this.type = type;
    this.tower = tower;
    this.target = target;
    this.x = tower.x;
    this.y = tower.y;
    this.previousX = this.x;
    this.previousY = this.y;
    this.speed = type.projectileSpeed;
    this.damage = type.damage;
    this.size = type.projectileSize;
    this.dead = false;
    this.angle = tower.angle;
    this.trail = [];
  }

  update(dt) {
    if (this.dead) return null;
    if (!this.target || !this.target.alive) {
      this.dead = true;
      return null;
    }

    this.previousX = this.x;
    this.previousY = this.y;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const targetDistance = Math.hypot(dx, dy);
    const travelDistance = this.speed * dt;

    this.angle = Math.atan2(dy, dx);
    if (targetDistance <= travelDistance + this.target.radius * 0.35) {
      this.x = this.target.x;
      this.y = this.target.y;
      return this.target;
    }

    this.x += (dx / targetDistance) * travelDistance;
    this.y += (dy / targetDistance) * travelDistance;
    return null;
  }
}

export function createEnemy(type, waveNumber, paths) {
  return new Enemy(type, waveNumber, paths, GAME.tileSize, GAME.hpPerWave, GAME.speedPerWave);
}

