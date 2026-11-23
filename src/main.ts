import "./style.css";
import { isMuted, playSound, toggleMute, unlockAudio } from "./audio/sfx";
import { createGame, scoreOf, update } from "./game/game";
import { HEIGHT, WIDTH } from "./game/world";
import { bindInput } from "./input/input";
import { draw, type Screen } from "./render/draw";
import { createEffects, emit, stepEffects } from "./render/effects";
import { load, save } from "./storage";

const BEST_KEY = "dodge-king:best";
const MAX_DT = 0.05;

function getCanvas() {
	const canvas = document.querySelector<HTMLCanvasElement>("#game");
	const ctx = canvas?.getContext("2d");
	if (!canvas || !ctx) throw new Error("Canvas 2D is not supported");
	return { canvas, ctx };
}

const { canvas, ctx } = getCanvas();
const readInput = bindInput(canvas);
let game = createGame();
const fx = createEffects(
	matchMedia("(prefers-reduced-motion: reduce)").matches,
);
let screen: Screen = "title";
let best = Number(load(BEST_KEY)) || 0;
let newBest = false;
let last = performance.now();

function resize() {
	const scale = (canvas.clientWidth / WIDTH) * devicePixelRatio;
	canvas.width = Math.round(WIDTH * scale);
	canvas.height = Math.round(HEIGHT * scale);
	ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function advance() {
	unlockAudio();
	if (screen === "paused") {
		screen = "playing";
	} else if (screen !== "playing") {
		game = createGame();
		newBest = false;
		screen = "playing";
		playSound("start");
	}
}

function gameOver() {
	screen = "over";
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
			playSound(event.type);
			emit(fx, event);
			if (event.type === "hit") gameOver();
		}
	}
	if (screen !== "paused") stepEffects(fx, dt);
	draw(ctx, { screen, game, best, newBest, muted: isMuted(), fx });
	requestAnimationFrame(frame);
}

window.addEventListener("keydown", (e) => {
	if (e.repeat) return;
	if (e.code === "Enter" || e.code === "Space") {
		e.preventDefault();
		advance();
	} else if (e.code === "Escape" || e.code === "KeyP") {
		if (screen === "playing") screen = "paused";
		else if (screen === "paused") advance();
	} else if (e.code === "KeyM") {
		toggleMute();
	}
});

canvas.addEventListener("pointerdown", () => {
	if (screen !== "playing") advance();
});

document.addEventListener("visibilitychange", () => {
	if (document.hidden && screen === "playing") screen = "paused";
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
