import { ENEMY_TYPES, GAME, TARGET_MODES, TOWER_ORDER, TOWER_TYPES, WAVES } from './config.js';
import { formatNumber } from './utils.js';

const PHASE_LABELS = {
  preparing: '布防阶段',
  running: '交战中',
  paused: '已暂停',
  gameover: '基地失守',
  victory: '战役完成',
};

export class UI {
  constructor(game) {
    this.game = game;
    this.buildCards = new Map();
    this.lastSelectionSignature = '';
    this.lastWaveSignature = '';
    this.lastTowerSignature = '';
    this.bindElements();
    this.createBuildMenu();
    this.bindEvents();
    requestAnimationFrame(() => this.refresh());
  }

  bindElements() {
    this.moneyEl = document.getElementById('money');
    this.livesEl = document.getElementById('lives');
    this.livesCard = document.getElementById('lives-card');
    this.waveEl = document.getElementById('wave');
    this.waveTotalEl = document.getElementById('wave-total');
    this.enemyCountEl = document.getElementById('enemy-count');
    this.phaseLabelEl = document.getElementById('phase-label');
    this.phaseBadgeEl = document.querySelector('.phase-badge');
    this.messageEl = document.getElementById('message');
    this.startButton = document.getElementById('start');
    this.startTextEl = this.startButton.querySelector('span');
    this.startBonusEl = document.getElementById('start-bonus');
    this.pauseButton = document.getElementById('pause');
    this.restartButton = document.getElementById('restart');
    this.buildMenuEl = document.getElementById('build-menu');
    this.selectionPanel = document.getElementById('selection-panel');
    this.enemyLayerEl = document.getElementById('enemy-layer');
    this.projectileLayerEl = document.getElementById('projectile-layer');
    this.effectLayerEl = document.getElementById('effect-layer');
    this.towerLayerEl = document.getElementById('tower-layer');
    this.placementHintEl = document.getElementById('placement-hint');
    this.towerCountEl = document.getElementById('tower-count');
    this.waveStateEl = document.getElementById('wave-state');
    this.waveTitleEl = document.getElementById('wave-title');
    this.waveCompositionEl = document.getElementById('wave-composition');
    this.waveTimerEl = document.getElementById('wave-timer');
    this.waveProgressLabelEl = document.getElementById('wave-progress-label');
    this.waveProgressEl = document.getElementById('wave-progress');
    this.overlayEl = document.getElementById('overlay');
    this.overlayKickerEl = document.getElementById('overlay-kicker');
    this.overlayTitleEl = document.getElementById('overlay-title');
    this.overlayTextEl = document.getElementById('overlay-text');
    this.overlayResumeEl = document.getElementById('overlay-resume');
    this.overlayRestartEl = document.getElementById('overlay-restart');
    this.waveTotalEl.textContent = `/${GAME.totalWaves}`;
  }

  createBuildMenu() {
    for (const [index, typeId] of TOWER_ORDER.entries()) {
      const type = TOWER_TYPES[typeId];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'build-card';
      button.dataset.towerId = typeId;
      button.style.setProperty('--tower-color', type.color);
      button.setAttribute('aria-label', `${type.name}，造价 ${type.cost}`);
      button.innerHTML = `
        <span class="build-card-top">
          <span class="build-icon" aria-hidden="true">${type.icon}</span>
          <span class="build-name">${type.name}</span>
        </span>
        <span class="build-cost">◇ ${type.cost}</span>
        <span class="build-role">${index + 1} · ${type.role}</span>
      `;
      button.addEventListener('click', () => this.game.setBuildType(typeId));
      this.buildMenuEl.appendChild(button);
      this.buildCards.set(typeId, button);
    }
  }

  bindEvents() {
    this.startButton.addEventListener('click', () => this.game.startWave(true));
    this.pauseButton.addEventListener('click', () => this.game.togglePause());
    this.restartButton.addEventListener('click', () => this.game.newGame());
    this.overlayResumeEl.addEventListener('click', () => this.game.togglePause());
    this.overlayRestartEl.addEventListener('click', () => this.game.newGame());

    this.selectionPanel.addEventListener('click', event => {
      const button = event.target.closest('[data-target-mode]');
      if (!button) return;
      this.game.setTargetMode(button.dataset.targetMode);
    });

    window.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (/^[1-6]$/.test(event.key)) {
        const typeId = TOWER_ORDER[Number(event.key) - 1];
        if (typeId) this.game.setBuildType(typeId);
      } else if (event.key.toLowerCase() === 'p') {
        this.game.togglePause();
      } else if (event.key === 'Escape') {
        this.game.clearSelection();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (this.game.phase === 'running' || this.game.phase === 'preparing')) {
        this.game.togglePause();
      }
    });
  }

  refresh() {
    this.renderHud();
    this.renderWavePanel();
    this.renderBuildMenu();
    this.renderEnemyLayer();
    this.renderProjectileLayer();
    this.renderTowerLayer();
    this.renderEffectLayer();
    this.renderSelectionPanel();
    this.renderPlacementHint();
    this.renderControls();
    this.renderOverlay();
    requestAnimationFrame(() => this.refresh());
  }

  renderHud() {
    this.moneyEl.textContent = formatNumber(this.game.money);
    this.livesEl.textContent = formatNumber(this.game.lives);
    this.waveEl.textContent = String(this.game.waveNumber);
    this.enemyCountEl.textContent = formatNumber(this.game.remainingEnemies);
    this.messageEl.textContent = this.game.message;
    this.livesCard.classList.toggle('danger', this.game.lives <= 5);
    this.towerCountEl.textContent = String(this.game.towers.length);
    this.phaseLabelEl.textContent = PHASE_LABELS[this.game.phase] || '准备中';
    this.phaseBadgeEl.dataset.phase = this.game.phase;
  }

  renderWavePanel() {
    const wave = this.game.previewWaveData;
    const waveNumber = this.game.phase === 'running'
      ? this.game.waveNumber
      : Math.min(this.game.nextWaveIndex + 1, GAME.totalWaves);
    const stateLabel = {
      preparing: '布防中', running: '交战中', paused: '已暂停',
      gameover: '已失守', victory: '已完成',
    }[this.game.phase];
    this.waveStateEl.textContent = stateLabel;

    if (this.game.phase === 'victory' || !wave) {
      this.waveTitleEl.textContent = '全部敌军已清除';
      this.waveCompositionEl.innerHTML = '';
      this.waveTimerEl.textContent = '战役完成';
      this.waveProgressLabelEl.textContent = `${GAME.totalWaves} / ${GAME.totalWaves} 波`;
      this.waveProgressEl.style.width = '100%';
      return;
    }

    const signature = `${wave.name}-${waveNumber}-${this.game.phase}`;
    if (signature !== this.lastWaveSignature) {
      this.lastWaveSignature = signature;
      this.waveTitleEl.textContent = `第 ${waveNumber} 波 · ${wave.name}`;
      this.waveCompositionEl.innerHTML = this.compositionMarkup(wave);
    }

    if (this.game.phase === 'preparing') {
      this.waveTimerEl.textContent = `自动开波：${this.game.prepRemaining.toFixed(1)} 秒`;
      this.waveProgressLabelEl.textContent = `提前奖励 +${this.game.earlyWaveBonus}`;
      const prepProgress = 1 - this.game.prepRemaining / this.game.prepDuration;
      this.waveProgressEl.style.width = `${Math.max(0, Math.min(100, prepProgress * 100))}%`;
    } else if (this.game.phase === 'running' || this.game.phase === 'paused') {
      const total = this.game.waveManager.totalEnemies;
      const spawned = this.game.waveManager.spawnedEnemies;
      this.waveTimerEl.textContent = `场上 ${this.game.enemies.length} · 待出场 ${this.game.waveManager.pendingEnemies}`;
      this.waveProgressLabelEl.textContent = `${spawned} / ${total} 已出现`;
      const waveProgress = total === 0 ? 0 : spawned / total;
      this.waveProgressEl.style.width = `${waveProgress * 100}%`;
    } else if (this.game.phase === 'gameover') {
      this.waveTimerEl.textContent = '防线已被突破';
      this.waveProgressLabelEl.textContent = `坚持到第 ${this.game.waveNumber} 波`;
      this.waveProgressEl.style.width = '100%';
    }
  }

  compositionMarkup(wave) {
    const counts = new Map();
    for (const group of wave.groups) {
      counts.set(group.enemy, (counts.get(group.enemy) || 0) + group.count);
    }

    return [...counts.entries()].map(([enemyId, count]) => {
      const enemy = ENEMY_TYPES[enemyId];
      return `
        <span class="enemy-chip ${enemy.boss ? 'boss' : ''}" style="--chip-color:${enemy.color}">
          <i aria-hidden="true"></i>${enemy.name} ×${count}
        </span>
      `;
    }).join('');
  }

  renderBuildMenu() {
    const interactionLocked = this.game.phase === 'paused'
      || this.game.phase === 'gameover'
      || this.game.phase === 'victory';

    for (const [typeId, button] of this.buildCards) {
      const type = TOWER_TYPES[typeId];
      button.classList.toggle('active', this.game.selectedBuildType === typeId);
      button.classList.toggle('unaffordable', this.game.money < type.cost);
      button.disabled = interactionLocked;
      button.setAttribute('aria-pressed', String(this.game.selectedBuildType === typeId));
    }
  }

  renderEnemyLayer() {
    const marks = {
      grunt: '◆', runner: '▲', armored: '■', swarm: '•', wraith: '✦', boss: '☠',
    };
    this.enemyLayerEl.innerHTML = this.game.enemies.map(enemy => {
      const left = (enemy.x / GAME.canvasSize) * 100;
      const top = (enemy.y / GAME.canvasSize) * 100;
      const health = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
      const classes = [
        'scene-enemy',
        enemy.type.id,
        enemy.type.flying ? 'flying' : '',
        enemy.slowTimer > 0 ? 'slow' : '',
        enemy.poisonTimer > 0 ? 'poison' : '',
      ].filter(Boolean).join(' ');
      return `
        <div class="${classes}" style="left:${left}%;top:${top}%;--enemy-color:${enemy.type.color}" title="${enemy.type.name}">
          <span class="scene-enemy-body">${marks[enemy.type.id] || '●'}</span>
          <span class="scene-enemy-health"><i style="width:${health}%"></i></span>
        </div>
      `;
    }).join('');
  }

  renderProjectileLayer() {
    this.projectileLayerEl.innerHTML = this.game.projectiles.map(projectile => {
      const left = (projectile.x / GAME.canvasSize) * 100;
      const top = (projectile.y / GAME.canvasSize) * 100;
      const size = Math.max(0.8, (projectile.size * 2.2 / GAME.canvasSize) * 100);
      const angle = projectile.angle + Math.PI;
      return `
        <span class="scene-projectile" style="left:${left}%;top:${top}%;width:${size}%;--projectile-color:${projectile.type.color};--projectile-angle:${angle}rad"></span>
      `;
    }).join('');
  }

  renderEffectLayer() {
    const markup = [];
    for (const effect of this.game.effects) {
      const alpha = Math.max(0, effect.life / effect.maxLife);
      if (effect.kind === 'lightning') {
        for (let index = 0; index < effect.points.length - 1; index += 1) {
          const start = effect.points[index];
          const end = effect.points[index + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy) / GAME.canvasSize * 100;
          const angle = Math.atan2(dy, dx);
          markup.push(`
            <span class="scene-lightning-segment"
              style="left:${start.x / GAME.canvasSize * 100}%;top:${start.y / GAME.canvasSize * 100}%;width:${length}%;transform:translateY(-50%) rotate(${angle}rad);opacity:${alpha};--effect-color:${effect.color}"></span>
          `);
        }
        continue;
      }

      const left = (effect.x / GAME.canvasSize) * 100;
      const top = (effect.y / GAME.canvasSize) * 100;
      const size = Math.max(1.1, ((effect.size || 12) * 2 / GAME.canvasSize) * 100);
      const progress = 1 - alpha;
      const scale = effect.kind === 'muzzle' ? 0.45 + progress * 1.1 : 0.6 + progress * 0.75;
      markup.push(`
        <span class="scene-effect ${effect.kind}"
          style="left:${left}%;top:${top}%;width:${size}%;height:${size}%;opacity:${alpha};transform:translate(-50%,-50%) scale(${scale});--effect-color:${effect.color}"></span>
      `);
    }
    this.effectLayerEl.innerHTML = markup.join('');
  }

  renderTowerLayer() {
    const signature = this.game.towers
      .map(tower => `${tower.id}:${tower.id === this.game.selectedTowerId ? 1 : 0}`)
      .join('|');
    if (signature === this.lastTowerSignature) return;
    this.lastTowerSignature = signature;

    this.towerLayerEl.innerHTML = this.game.towers.map(tower => {
      const left = ((tower.column + 0.5) / GAME.gridSize) * 100;
      const top = ((tower.row + 0.5) / GAME.gridSize) * 100;
      const selected = tower.id === this.game.selectedTowerId ? ' selected' : '';
      return `
        <div class="scene-tower${selected}"
          style="left:${left}%;top:${top}%;--tower-color:${tower.type.color}"
          title="${tower.type.name}">
          <span class="scene-tower-glyph">${tower.type.icon}</span>
        </div>
      `;
    }).join('');
  }

  renderPlacementHint() {
    const type = this.game.selectedBuildType ? TOWER_TYPES[this.game.selectedBuildType] : null;
    const locked = this.game.phase === 'paused'
      || this.game.phase === 'gameover'
      || this.game.phase === 'victory';

    if (!type || locked) {
      this.placementHintEl.hidden = true;
      return;
    }

    const hover = this.game.hoverCell;
    let mode = 'ready';
    let text = `建造模式：${type.name}。点击地图上的深蓝色空地放置。`;

    if (hover) {
      const tower = this.game.towerAt(hover.column, hover.row);
      if (this.game.isPath(hover.column, hover.row)) {
        mode = 'invalid';
        text = '这里是对手的行进道路，不能建造炮塔。';
      } else if (tower) {
        mode = 'occupied';
        text = `这里已有${tower.type.name}，点击可查看并设置目标优先级。`;
      } else if (this.game.money < type.cost) {
        mode = 'insufficient';
        text = `资金不足：建造${type.name}需要 ${type.cost}，当前只有 ${this.game.money}。`;
      } else {
        text = `点击这里放置${type.name}，消耗 ${type.cost} 资金。`;
      }
    }

    this.placementHintEl.hidden = false;
    this.placementHintEl.className = `placement-hint ${mode}`;
    this.placementHintEl.textContent = text;
  }

  renderSelectionPanel() {
    const tower = this.game.selectedTower;
    const buildType = this.game.selectedBuildType ? TOWER_TYPES[this.game.selectedBuildType] : null;
    const signature = tower
      ? `tower:${tower.id}:${tower.targetMode}`
      : `build:${buildType ? buildType.id : 'none'}`;
    if (signature === this.lastSelectionSignature) return;
    this.lastSelectionSignature = signature;

    if (tower) {
      this.selectionPanel.innerHTML = `
        <p class="eyebrow">TACTICAL DETAIL</p>
        <div class="selected-header">
          <span class="selected-mark" style="--tower-color:${tower.type.color}">${tower.type.mark}</span>
          <div>
            <h2 class="selected-name">${tower.type.name}</h2>
            <p class="selected-role" style="--tower-color:${tower.type.color}">${tower.type.role}</p>
          </div>
        </div>
        <div class="selected-stats">
          <div class="selected-stat"><span>伤害</span><strong>${tower.type.damage}</strong></div>
          <div class="selected-stat"><span>射程</span><strong>${tower.type.range.toFixed(1)} 格</strong></div>
          <div class="selected-stat"><span>冷却</span><strong>${(1 / tower.type.fireRate).toFixed(2)} 秒</strong></div>
        </div>
        <p class="target-title">目标优先级</p>
        <div class="target-options">
          ${TARGET_MODES.map(mode => `
            <button type="button" class="target-option ${tower.targetMode === mode.id ? 'active' : ''}"
              data-target-mode="${mode.id}" title="${mode.description}"
              style="--tower-color:${tower.type.color}">${mode.name}</button>
          `).join('')}
        </div>
      `;
      return;
    }

    if (buildType) {
      this.selectionPanel.innerHTML = `
        <p class="eyebrow">DEPLOYMENT BRIEF</p>
        <div class="selected-header">
          <span class="selected-mark" style="--tower-color:${buildType.color}">${buildType.mark}</span>
          <div>
            <h2 class="selected-name">${buildType.name}</h2>
            <p class="selected-role" style="--tower-color:${buildType.color}">${buildType.role}</p>
          </div>
        </div>
        <p class="selection-empty">${buildType.description}</p>
        <div class="tip-row"><span>造价</span><strong>◇ ${buildType.cost}</strong></div>
        <div class="tip-row"><span>攻击范围</span><strong>${buildType.range.toFixed(1)} 格</strong></div>
        <div class="tip-row"><span>对空能力</span><strong>${buildType.canTargetFlying ? '可以攻击飞行单位' : '无法攻击飞行单位'}</strong></div>
      `;
      return;
    }

    this.selectionPanel.innerHTML = `
      <p class="eyebrow">TACTICAL DETAIL</p>
      <h2>战术提示</h2>
      <p class="selection-empty">选择建造卡后点击空地部署；点击已经建成的炮塔，可切换目标优先级。</p>
      <div class="tip-row"><span>飞行单位</span><strong>仅箭塔、雷暴、狙击可攻击</strong></div>
      <div class="tip-row"><span>重甲单位</span><strong>优先使用毒巢或高单发伤害</strong></div>
      <div class="tip-row"><span>密集敌群</span><strong>震荡炮台与连锁闪电效率最高</strong></div>
    `;
  }

  renderControls() {
    const canStart = this.game.phase === 'preparing';
    const basePhase = this.game.phase === 'paused' ? this.game.phaseBeforePause : this.game.phase;
    this.startButton.disabled = !canStart;
    this.startTextEl.textContent = basePhase === 'preparing'
      ? '提前开波'
      : (basePhase === 'running' ? '本波进行中' : '战役结束');
    this.startBonusEl.hidden = basePhase !== 'preparing';
    const bonus = basePhase === 'preparing' ? Math.max(0, Math.ceil(this.game.prepRemaining)) : 0;
    this.startBonusEl.textContent = `+${bonus}`;

    const terminal = this.game.phase === 'gameover' || this.game.phase === 'victory';
    this.pauseButton.disabled = terminal;
    this.pauseButton.textContent = this.game.phase === 'paused' ? '继续' : '暂停';
  }

  renderOverlay() {
    const overlayState = {
      paused: {
        kicker: 'SYSTEM PAUSED',
        title: '游戏暂停',
        text: '战场已冻结。调整思路后，继续守住防线。',
        resume: true,
      },
      gameover: {
        kicker: 'DEFENSE COLLAPSED',
        title: '基地失守',
        text: `你坚持到了第 ${this.game.waveNumber} 波，共消灭 ${this.game.kills} 个敌人。`,
        resume: false,
      },
      victory: {
        kicker: 'ALL WAVES CLEARED',
        title: '防线守住了',
        text: `十二波敌军全部击退，共消灭 ${this.game.kills} 个敌人。试试用更少的损失再次通关。`,
        resume: false,
      },
    }[this.game.phase];

    if (!overlayState) {
      this.overlayEl.hidden = true;
      return;
    }

    this.overlayEl.hidden = false;
    this.overlayKickerEl.textContent = overlayState.kicker;
    this.overlayTitleEl.textContent = overlayState.title;
    this.overlayTextEl.textContent = overlayState.text;
    this.overlayResumeEl.hidden = !overlayState.resume;
    this.overlayRestartEl.textContent = overlayState.resume ? '重新开始' : '再战一局';
  }
}











