export const GAME = Object.freeze({
  gridSize: 13,
  tileSize: 40,
  canvasSize: 520,
  startingMoney: 130,
  startingLives: 20,
  totalWaves: 12,
  firstPrepTime: 20,
  prepTime: 14,
  fixedStep: 1 / 60,
  maxFrameDelta: 0.2,
  hpPerWave: 0.11,
  speedPerWave: 0.012,
});

export const MAP = Object.freeze({
  id: 'crossroads',
  name: '边境十字路',
  path: Object.freeze([
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3],
    [5, 4], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [1, 6], [1, 7],
    [1, 8], [1, 9], [1, 10], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11],
    [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11],
  ]),
});

export const TARGET_MODES = Object.freeze([
  { id: 'first', name: '最前方', description: '优先攻击沿路径推进最远的敌人' },
  { id: 'strongest', name: '最强', description: '优先攻击当前生命值最高的敌人' },
  { id: 'closest', name: '最近', description: '优先攻击距离炮塔最近的敌人' },
  { id: 'last', name: '最后方', description: '优先攻击刚进入射程的敌人' },
]);

export const TOWER_ORDER = Object.freeze(['archer', 'cannon', 'frost', 'tesla', 'sniper', 'poison']);

export const TOWER_TYPES = Object.freeze({
  archer: {
    id: 'archer', name: '疾风箭塔', icon: '🏹', mark: '➤', role: '单体速射',
    description: '射速快、造价低，可攻击飞行单位，适合稳定补伤害。',
    cost: 30, color: '#4cc9f0', range: 3, fireRate: 1.15, damage: 12,
    projectileSpeed: 520, projectileSize: 2.6, canTargetFlying: true, defaultTarget: 'first',
  },
  cannon: {
    id: 'cannon', name: '震荡炮台', icon: '💥', mark: '●', role: '范围爆破',
    description: '炮弹命中后造成范围伤害，适合清理密集地面敌人。',
    cost: 55, color: '#ff9f43', range: 2.6, fireRate: 0.42, damage: 42,
    projectileSpeed: 285, projectileSize: 4.2, splashRadius: 1.25,
    canTargetFlying: false, defaultTarget: 'first',
  },
  frost: {
    id: 'frost', name: '霜冻棱镜', icon: '❄️', mark: '✦', role: '减速控制',
    description: '低伤害，但能显著降低地面敌人的移动速度。',
    cost: 45, color: '#78dce8', range: 2.8, fireRate: 0.72, damage: 6,
    projectileSpeed: 390, projectileSize: 3, slowFactor: 0.45, slowDuration: 2.2,
    canTargetFlying: false, defaultTarget: 'first',
  },
  tesla: {
    id: 'tesla', name: '雷暴线圈', icon: '⚡', mark: 'ϟ', role: '连锁闪电',
    description: '瞬间电击多个目标，连锁伤害逐次衰减，可攻击飞行单位。',
    cost: 70, color: '#c77dff', range: 3.25, fireRate: 0.52, damage: 16,
    chainCount: 3, chainRange: 1.55, chainFalloff: 0.72,
    canTargetFlying: true, defaultTarget: 'closest',
  },
  sniper: {
    id: 'sniper', name: '苍穹狙击塔', icon: '🎯', mark: '◎', role: '远程重击',
    description: '超远射程和高额单体伤害，默认优先攻击高血量目标。',
    cost: 65, color: '#80ed99', range: 5.5, fireRate: 0.34, damage: 62,
    projectileSpeed: 900, projectileSize: 2.2, canTargetFlying: true, defaultTarget: 'strongest',
  },
  poison: {
    id: 'poison', name: '腐蚀毒巢', icon: '☠️', mark: '☣', role: '持续伤害',
    description: '毒液会持续伤害目标，并忽略部分护甲，适合消耗高血量单位。',
    cost: 50, color: '#b7ef65', range: 2.9, fireRate: 0.58, damage: 7,
    projectileSpeed: 360, projectileSize: 3.2, poisonDps: 7, poisonDuration: 4,
    canTargetFlying: false, defaultTarget: 'strongest',
  },
});

export const ENEMY_TYPES = Object.freeze({
  grunt: {
    id: 'grunt', name: '突击兵', hp: 42, speed: 0.95, armor: 0, reward: 3,
    radius: 10, color: '#ff6b8a', accent: '#ffb3c1',
  },
  runner: {
    id: 'runner', name: '疾行者', hp: 30, speed: 1.85, armor: 0, reward: 3,
    radius: 8, color: '#ffd166', accent: '#fff0b3',
  },
  armored: {
    id: 'armored', name: '重甲兵', hp: 105, speed: 0.7, armor: 0.32, reward: 6,
    radius: 12, color: '#90a4ae', accent: '#d7e1e5',
  },
  swarm: {
    id: 'swarm', name: '噬群虫', hp: 16, speed: 1.25, armor: 0, reward: 1,
    radius: 6, color: '#f77f00', accent: '#ffc078',
  },
  wraith: {
    id: 'wraith', name: '虚空飞灵', hp: 55, speed: 1.38, armor: 0.08, reward: 4,
    radius: 9, color: '#b388ff', accent: '#e5d4ff', flying: true,
  },
  boss: {
    id: 'boss', name: '深渊巨像', hp: 800, speed: 0.46, armor: 0.28, reward: 30,
    radius: 18, color: '#ff3d7f', accent: '#ffd6e2', boss: true,
  },
});

export const WAVES = Object.freeze([
  {
    name: '试探进攻', reward: 10, groups: [
      { enemy: 'grunt', count: 8, interval: 1.25, delay: 0 },
    ],
  },
  {
    name: '疾行混编', reward: 12, groups: [
      { enemy: 'grunt', count: 10, interval: 1.15, delay: 0 },
      { enemy: 'runner', count: 4, interval: 0.95, delay: 0 },
    ],
  },
  {
    name: '虫潮与铁壁', reward: 14, groups: [
      { enemy: 'swarm', count: 16, interval: 0.48, delay: 0 },
      { enemy: 'armored', count: 2, interval: 1.8, delay: 0 },
    ],
  },
  {
    name: '双向施压', reward: 16, groups: [
      { enemy: 'runner', count: 12, interval: 0.72, delay: 0 },
      { enemy: 'grunt', count: 8, interval: 1.05, delay: 0 },
    ],
  },
  {
    name: '空域入侵', reward: 18, groups: [
      { enemy: 'grunt', count: 10, interval: 0.95, delay: 0 },
      { enemy: 'wraith', count: 6, interval: 1.3, delay: 0 },
    ],
  },
  {
    name: '巨像降临', reward: 24, groups: [
      { enemy: 'boss', count: 1, interval: 1, delay: 0 },
      { enemy: 'armored', count: 4, interval: 1.6, delay: 0 },
    ],
  },
  {
    name: '蜂群突袭', reward: 20, groups: [
      { enemy: 'swarm', count: 20, interval: 0.42, delay: 0 },
      { enemy: 'runner', count: 10, interval: 0.7, delay: 0 },
      { enemy: 'armored', count: 3, interval: 1.7, delay: 0 },
    ],
  },
  {
    name: '铁壁空袭', reward: 22, groups: [
      { enemy: 'armored', count: 6, interval: 1.6, delay: 0 },
      { enemy: 'grunt', count: 12, interval: 1, delay: 0 },
      { enemy: 'wraith', count: 8, interval: 1.2, delay: 0 },
    ],
  },
  {
    name: '极限奔袭', reward: 24, groups: [
      { enemy: 'runner', count: 16, interval: 0.58, delay: 0 },
      { enemy: 'armored', count: 6, interval: 1.4, delay: 0 },
      { enemy: 'swarm', count: 18, interval: 0.4, delay: 0 },
    ],
  },
  {
    name: '双生巨像', reward: 28, groups: [
      { enemy: 'boss', count: 2, interval: 8, delay: 0 },
      { enemy: 'wraith', count: 8, interval: 1.15, delay: 0 },
      { enemy: 'grunt', count: 14, interval: 0.95, delay: 0 },
    ],
  },
  {
    name: '全面围城', reward: 32, groups: [
      { enemy: 'armored', count: 10, interval: 1.35, delay: 0 },
      { enemy: 'runner', count: 18, interval: 0.55, delay: 0 },
      { enemy: 'swarm', count: 22, interval: 0.38, delay: 0 },
    ],
  },
  {
    name: '终焉军团', reward: 50, groups: [
      { enemy: 'boss', count: 3, interval: 7.5, delay: 0 },
      { enemy: 'armored', count: 10, interval: 1.25, delay: 0 },
      { enemy: 'wraith', count: 12, interval: 1.05, delay: 0 },
      { enemy: 'swarm', count: 24, interval: 0.36, delay: 0 },
    ],
  },
]);




