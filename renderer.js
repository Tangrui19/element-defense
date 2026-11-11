import { GAME } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ambient = Array.from({ length: 34 }, (_, index) => ({
      x: Math.random() * GAME.canvasSize,
      y: Math.random() * GAME.canvasSize,
      radius: 0.7 + Math.random() * 1.9,
      phase: Math.random() * Math.PI * 2,
      speed: 0.25 + Math.random() * 0.7,
      alpha: 0.08 + Math.random() * 0.22,
      hue: index % 3,
    }));
  }

  render(game, time) {
    const ctx = this.ctx;
    const size = GAME.canvasSize;
    ctx.clearRect(0, 0, size, size);

    this.drawBackground(ctx, time, size);
    this.drawGrid(ctx, game, time);
    this.drawPath(ctx, game, time);
    this.drawEndpoints(ctx, game, time);
    this.drawPlacementPreview(ctx, game, time);
    // Towers are rendered as a DOM overlay in UI.renderTowerLayer().
    // Enemies are rendered as a DOM overlay in UI.renderEnemyLayer().
    // Projectiles are rendered as a DOM overlay in UI.renderProjectileLayer().
    // Attack effects are rendered as a DOM overlay in UI.renderEffectLayer().
    this.drawParticles(ctx, game);
    this.drawVignette(ctx, size);
  }

  drawBackground(ctx, time, size) {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#101d34');
    gradient.addColorStop(0.52, '#0b172a');
    gradient.addColorStop(1, '#11112a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(
      size * 0.72 + Math.sin(time * 0.14) * 22,
      size * 0.2,
      0,
      size * 0.72,
      size * 0.2,
      size * 0.72,
    );
    glow.addColorStop(0, 'rgba(76, 201, 240, 0.11)');
    glow.addColorStop(0.46, 'rgba(71, 96, 190, 0.035)');
    glow.addColorStop(1, 'rgba(5, 9, 22, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    for (const particle of this.ambient) {
      const colors = ['76, 201, 240', '128, 237, 153', '199, 125, 255'];
      const driftY = particle.y + Math.sin(time * particle.speed + particle.phase) * 8;
      ctx.fillStyle = `rgba(${colors[particle.hue]}, ${particle.alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, driftY, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGrid(ctx, game, time) {
    const { tileSize, gridSize } = GAME;
    for (let row = 0; row < gridSize; row += 1) {
      for (let column = 0; column < gridSize; column += 1) {
        const x = column * tileSize;
        const y = row * tileSize;
        if (game.isPath(column, row)) continue;

        const alternating = (row + column) % 2 === 0;
        ctx.fillStyle = alternating ? 'rgba(116, 168, 218, 0.035)' : 'rgba(255, 255, 255, 0.018)';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        ctx.strokeStyle = 'rgba(137, 182, 220, 0.055)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, tileSize - 3, tileSize - 3);

        const shimmer = Math.max(0, Math.sin(time * 0.8 + column * 0.7 + row * 0.45));
        if (shimmer > 0.965) {
          ctx.fillStyle = `rgba(76, 201, 240, ${(shimmer - 0.965) * 1.4})`;
          ctx.fillRect(x + 2, y + 2, tileSize - 4, 1);
        }
      }
    }
  }

  drawPath(ctx, game, time) {
    const points = game.paths.ground.points;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.tracePath(ctx, points);
    ctx.strokeStyle = 'rgba(255, 183, 77, 0.11)';
    ctx.lineWidth = GAME.tileSize * 1.17;
    ctx.shadowColor = 'rgba(255, 165, 60, 0.24)';
    ctx.shadowBlur = 18;
    ctx.stroke();

    this.tracePath(ctx, points);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#25334a';
    ctx.lineWidth = GAME.tileSize * 0.82;
    ctx.stroke();

    this.tracePath(ctx, points);
    ctx.strokeStyle = '#3d3026';
    ctx.lineWidth = GAME.tileSize * 0.72;
    ctx.stroke();

    this.tracePath(ctx, points);
    ctx.strokeStyle = 'rgba(255, 187, 87, 0.16)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 18]);
    ctx.lineDashOffset = -time * 24;
    ctx.stroke();
    ctx.setLineDash([]);

    const arrowOffset = (time * 22) % 92;
    for (let travel = 40 + arrowOffset; travel < game.paths.ground.length - 20; travel += 92) {
      const point = game.paths.ground.pointAt(travel);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(point.angle);
      ctx.fillStyle = 'rgba(255, 203, 117, 0.16)';
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  tracePath(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y);
    }
  }

  drawEndpoints(ctx, game, time) {
    const start = game.paths.ground.points[0];
    const end = game.paths.ground.points[game.paths.ground.points.length - 1];

    ctx.save();
    const portalPulse = 0.5 + Math.sin(time * 3) * 0.12;
    ctx.shadowColor = '#c77dff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = `rgba(199, 125, 255, ${portalPulse})`;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(233, 208, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 17 + Math.sin(time * 2.4) * 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.translate(end.x, end.y);
    ctx.shadowColor = '#80ed99';
    ctx.shadowBlur = 22;
    ctx.fillStyle = 'rgba(128, 237, 153, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#80ed99';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      const x = Math.cos(angle) * 19;
      const y = Math.sin(angle) * 19;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#bfffd1';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPlacementPreview(ctx, game, time) {
    const selectedTower = game.selectedTower;
    if (selectedTower) {
      this.drawRange(ctx, selectedTower.x, selectedTower.y, selectedTower.range, selectedTower.type.color);
      this.drawCellOutline(ctx, selectedTower.column, selectedTower.row, selectedTower.type.color);
    }

    if (!game.selectedBuildType || !game.hoverCell) return;
    const towerType = game.selectedBuildType;
    const { column, row } = game.hoverCell;
    const buildable = game.isBuildable(column, row);
    const color = buildable ? (game.money >= towerType.cost ? '#80ed99' : '#ffb84d') : '#ff5b78';
    const centerX = column * GAME.tileSize + GAME.tileSize / 2;
    const centerY = row * GAME.tileSize + GAME.tileSize / 2;

    if (buildable) {
      this.drawRange(ctx, centerX, centerY, towerType.range * GAME.tileSize, towerType.color);
    }
    this.drawCellOutline(ctx, column, row, color);

    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(time * 4) * 0.05;
    ctx.fillStyle = towerType.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, GAME.tileSize * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#071221';
    ctx.font = '17px "Segoe UI Emoji", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(towerType.icon, centerX, centerY + 1);
    ctx.restore();
  }

  drawRange(ctx, x, y, radius, color) {
    ctx.save();
    ctx.fillStyle = this.hexToRgba(color, 0.06);
    ctx.strokeStyle = this.hexToRgba(color, 0.42);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawCellOutline(ctx, column, row, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 9;
    ctx.strokeRect(
      column * GAME.tileSize + 3,
      row * GAME.tileSize + 3,
      GAME.tileSize - 6,
      GAME.tileSize - 6,
    );
    ctx.restore();
  }

  drawTowers(ctx, game, time) {
    for (const tower of game.towers) {
      const selected = tower.id === game.selectedTowerId;
      const pulse = 0.5 + Math.sin(time * 2.2 + tower.column + tower.row) * 0.12;
      ctx.save();
      ctx.translate(tower.x, tower.y);

      if (selected) {
        ctx.strokeStyle = tower.type.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = tower.type.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowColor = tower.type.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = this.hexToRgba(tower.type.color, 0.28 + pulse * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#081426';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.hexToRgba(tower.type.color, 1);
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.rotate(tower.angle);
      ctx.strokeStyle = tower.type.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = tower.type.color;
      ctx.font = '15px "Segoe UI Emoji", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tower.type.icon, 0, 1);
      ctx.restore();
    }
  }

  drawEnemies(ctx, game, time) {
    for (const enemy of game.enemies) {
      const hoverOffset = enemy.type.flying ? Math.sin(time * 4 + enemy.id) * 2.5 : 0;
      const x = enemy.x;
      const y = enemy.y + hoverOffset;
      const color = enemy.hitFlash > 0 ? '#ffffff' : enemy.type.color;

      ctx.save();
      if (enemy.type.flying) {
        ctx.strokeStyle = this.hexToRgba(enemy.type.accent, 0.66);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 3);
        ctx.quadraticCurveTo(x - 22, y - 15, x - 16, y + 3);
        ctx.moveTo(x + 3, y - 3);
        ctx.quadraticCurveTo(x + 22, y - 15, x + 16, y + 3);
        ctx.stroke();
      }

      if (enemy.slowTimer > 0) {
        ctx.strokeStyle = 'rgba(120, 220, 232, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (enemy.poisonTimer > 0) {
        ctx.fillStyle = 'rgba(183, 239, 101, 0.75)';
        for (let index = 0; index < 3; index += 1) {
          const angle = time * 2 + index * Math.PI * 0.66;
          ctx.beginPath();
          ctx.arc(
            x + Math.cos(angle) * (enemy.radius + 5),
            y + Math.sin(angle) * (enemy.radius + 5),
            1.8,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }

      if (enemy.type.boss) {
        ctx.shadowColor = enemy.type.color;
        ctx.shadowBlur = 22;
        ctx.fillStyle = this.hexToRgba(enemy.type.color, 0.22);
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius + 8 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowColor = color;
      ctx.shadowBlur = enemy.type.boss ? 16 : 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = enemy.type.accent;
      ctx.beginPath();
      ctx.arc(x - enemy.radius * 0.27, y - enemy.radius * 0.25, enemy.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.type.armor > 0) {
        ctx.strokeStyle = enemy.type.accent;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius + 2, -0.8, 1.6);
        ctx.stroke();
      }

      const barWidth = Math.max(18, enemy.radius * 2.3);
      const barY = y - enemy.radius - 8;
      ctx.fillStyle = 'rgba(4, 9, 20, 0.88)';
      ctx.fillRect(x - barWidth / 2, barY, barWidth, 4);
      ctx.fillStyle = enemy.hp / enemy.maxHp > 0.35 ? '#80ed99' : '#ff6b8a';
      ctx.fillRect(x - barWidth / 2, barY, barWidth * (enemy.hp / enemy.maxHp), 4);
      ctx.restore();
    }
  }

  drawProjectiles(ctx, game) {
    for (const projectile of game.projectiles) {
      ctx.save();
      if (projectile.trail.length > 1) {
        ctx.strokeStyle = this.hexToRgba(projectile.type.color, 0.34);
        ctx.lineWidth = projectile.size * 1.1;
        ctx.beginPath();
        ctx.moveTo(projectile.trail[0].x, projectile.trail[0].y);
        for (let index = 1; index < projectile.trail.length; index += 1) {
          ctx.lineTo(projectile.trail[index].x, projectile.trail[index].y);
        }
        ctx.lineTo(projectile.x, projectile.y);
        ctx.stroke();
      }
      ctx.fillStyle = projectile.type.color;
      ctx.shadowColor = projectile.type.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawEffects(ctx, game) {
    for (const effect of game.effects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = Math.max(0, effect.life / effect.maxLife);
      ctx.save();

      if (effect.kind === 'lightning') {
        ctx.strokeStyle = effect.color;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = alpha;
        for (let index = 0; index < effect.points.length - 1; index += 1) {
          const start = effect.points[index];
          const end = effect.points[index + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const perpendicularX = -dy * 0.08;
          const perpendicularY = dx * 0.08;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(start.x + dx * 0.45 + perpendicularX, start.y + dy * 0.45 + perpendicularY);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      } else {
        const radius = effect.kind === 'blast' ? effect.size * progress : effect.size * (0.35 + progress * 0.65);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = effect.color;
        ctx.fillStyle = this.hexToRgba(effect.color, 0.1);
        ctx.lineWidth = 2;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawParticles(ctx, game) {
    for (const particle of game.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawVignette(ctx, size) {
    const vignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.26, size / 2, size / 2, size * 0.72);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(1, 4, 13, 0.46)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);
  }

  hexToRgba(hex, alpha) {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(normalized.length === 3
      ? normalized.split('').map(character => character + character).join('')
      : normalized, 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}









