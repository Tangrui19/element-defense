import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
const renderer = new Renderer(canvas);

new UI(game);
game.start(renderer);
