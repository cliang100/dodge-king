import "./style.css";
import { isMuted, toggleMute, unlockAudio } from "./audio/engine";
import {
	isMusicOn,
	setTempo,
	startMusic,
	stopMusic,
	toggleMusic,
} from "./audio/music";
import { playSound } from "./audio/sfx";
import { createGame, scoreOf, update } from "./game/game";
import { HEIGHT, WIDTH } from "./game/world";
import { bindInput, toWorld } from "./input/input";
import { clearPendingScore, offerScore, openLeaderboard } from "./leaderboard";
import { buttonAt } from "./render/buttons";
import { draw, type Screen } from "./render/draw";
import { createEffects, emit, stepEffects } from "./render/effects";
import { load, save } from "./storage";

const BEST_KEY = "dodge-king:best";
const MAX_DT = 0.05;
const DEATH_TIME = 0.9;
const DEATH_SLOWMO = 0.3;

function getCanvas() {
	const canvas = document.querySelector<HTMLCanvasElement>("#game");
	const ctx = canvas?.getContext("2d");
	if (!canvas || !ctx) throw new Error("Canvas 2D is not supported");
	return { canvas, ctx };
}

const { canvas, ctx } = getCanvas();
const readInput = bindInput();
const touch = matchMedia("(pointer: coarse)");
const controls = document.querySelector<HTMLElement>("#controls");
let game = createGame();
const fx = createEffects(
	matchMedia("(prefers-reduced-motion: reduce)").matches,
);
let screen: Screen = "title";
let best = Number(load(BEST_KEY)) || 0;
let newBest = false;
let deathTimer = 0;
let last = performance.now();

function resize() {
	const scale = (canvas.clientWidth / WIDTH) * devicePixelRatio;
	canvas.width = Math.round(WIDTH * scale);
	canvas.height = Math.round(HEIGHT * scale);
	ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function advance() {
	unlockAudio();
	if (screen === "playing" || screen === "dying") return;
	readInput();
	if (screen === "paused") {
		screen = "playing";
		startMusic(false);
	} else {
		game = createGame();
		newBest = false;
		clearPendingScore();
		screen = "playing";
		playSound("start");
		setTempo(1);
		startMusic(true);
	}
}

function pause() {
	screen = "paused";
	stopMusic();
}

function togglePause() {
	if (screen === "playing") pause();
	else if (screen === "paused") advance();
}

function gameOver() {
	screen = "dying";
	deathTimer = DEATH_TIME;
	stopMusic();
	const score = scoreOf(game);
	if (score > best) {
		best = score;
		newBest = true;
		save(BEST_KEY, String(best));
	}
}

function frame(now: number) {
	const dt = Math.min((now - last) / 1000, MAX_DT);
	last = now;
	if (screen === "playing") {
		for (const event of update(game, readInput(), dt)) {
			playSound(event.type, event.combo);
			emit(fx, event);
			if (event.type === "level") setTempo(game.level);
			if (event.type === "hit") gameOver();
		}
	}
	if (screen === "dying") {
		deathTimer -= dt;
		if (deathTimer <= 0) {
			screen = "over";
			offerScore(scoreOf(game), () => screen === "over");
		}
	}
	if (screen !== "paused") {
		stepEffects(fx, screen === "dying" ? dt * DEATH_SLOWMO : dt);
	}
	if (controls) controls.hidden = !touch.matches || screen !== "playing";
	draw(ctx, {
		screen,
		game,
		best,
		newBest,
		muted: isMuted(),
		music: isMusicOn(),
		touch: touch.matches,
		fx,
		clock: now / 1000,
	});
	requestAnimationFrame(frame);
}

window.addEventListener("keydown", (e) => {
	if (e.repeat) return;
	if (e.code === "Enter" || e.code === "Space") {
		e.preventDefault();
		advance();
	} else if (e.code === "Escape" || e.code === "KeyP") {
		togglePause();
	} else if (e.code === "KeyM") {
		toggleMute();
	} else if (e.code === "KeyN") {
		toggleMusic();
	} else if (e.code === "KeyL" && (screen === "title" || screen === "over")) {
		openLeaderboard();
	}
});

canvas.addEventListener("pointerdown", (e) => {
	const { x, y } = toWorld(canvas, e);
	const button = buttonAt(screen, x, y);
	if (button === "pause") togglePause();
	else if (button === "sound") toggleMute();
	else if (button === "music") toggleMusic();
	else if (button === "scores") openLeaderboard();
	else if (screen !== "playing") advance();
	unlockAudio();
});

document.addEventListener("visibilitychange", () => {
	if (document.hidden && screen === "playing") pause();
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
