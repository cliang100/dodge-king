import type { GameState, Pickup, Player, Warning } from "../game/game";
import { scoreOf } from "../game/game";
import type { Hazard } from "../game/hazards";
import { type Circle, HEIGHT, WIDTH } from "../game/world";
import { drawButtons } from "./buttons";
import { BANNER_TIME, type Effects } from "./effects";
import * as sprites from "./sprites";
import { drawSprite } from "./sprites";

export type Screen = "title" | "playing" | "paused" | "over";

export interface View {
	screen: Screen;
	game: GameState;
	best: number;
	newBest: boolean;
	muted: boolean;
	music: boolean;
	fx: Effects;
	clock: number;
}

const COLORS = {
	robe: "#e07a5f",
	crown: "#ffb627",
	coin: "#ffd23f",
	shield: "#4cc9f0",
	text: "#f5f5f5",
	dim: "#9a96b0",
	overlay: "rgba(10, 9, 18, 0.6)",
	warning: "#ff4d6d",
	outline: "rgba(10, 9, 18, 0.75)",
};

const FONT = "ui-monospace, Menlo, Consolas, monospace";

function circle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
}

const THEMES: [string, string][] = [
	["#2a1a5e", "#5b3a9e"],
	["#0d3b4f", "#1f8a8a"],
	["#4a1538", "#b0406a"],
	["#123d24", "#3c9a52"],
	["#4a2410", "#c4682a"],
	["#0f1f4f", "#3a62c4"],
];
const TILE = 40;

const frame = <T>(frames: T[], t: number) =>
	frames[Math.floor(t) % frames.length] as T;

function drawBackground(ctx: CanvasRenderingContext2D, level: number) {
	const [top, bottom] = frame(THEMES, level - 1);
	const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
	sky.addColorStop(0, top);
	sky.addColorStop(1, bottom);
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);

	ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
	for (let y = 0; y < HEIGHT; y += TILE) {
		for (let x = ((y / TILE) % 2) * TILE; x < WIDTH; x += TILE * 2) {
			ctx.fillRect(x, y, TILE, TILE);
		}
	}

	const vignette = ctx.createRadialGradient(
		WIDTH / 2,
		HEIGHT / 2,
		HEIGHT / 3,
		WIDTH / 2,
		HEIGHT / 2,
		WIDTH * 0.7,
	);
	vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
	vignette.addColorStop(1, "rgba(0, 0, 0, 0.45)");
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawShadow(ctx: CanvasRenderingContext2D, c: Circle) {
	ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
	ctx.beginPath();
	ctx.ellipse(c.x, c.y + c.r + 4, c.r, c.r / 3, 0, 0, Math.PI * 2);
	ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, time: number) {
	if (p.invulnerable > 0 && Math.floor(time * 20) % 2 === 0) return;
	const sprite = p.moving
		? frame(sprites.kingWalk, time * 8)
		: sprites.kingIdle;
	const bob = p.moving ? Math.abs(Math.sin(time * 16)) * 2 : Math.sin(time * 3);
	drawSprite(ctx, sprite, p.x, p.y - 4 - bob, 2.25);
	if (p.shield) {
		ctx.strokeStyle = COLORS.shield;
		ctx.lineWidth = 2;
		ctx.globalAlpha = 0.6 + Math.sin(time * 6) * 0.3;
		circle(ctx, p.x, p.y, p.r + 10);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
}

function drawHazard(ctx: CanvasRenderingContext2D, h: Hazard) {
	switch (h.kind) {
		case "arrow":
			drawSprite(ctx, sprites.arrow, h.x, h.y, 2, Math.atan2(h.vy, h.vx));
			break;
		case "boulder":
			// Spin from position so rotation stays continuous through wall bounces.
			drawSprite(ctx, sprites.boulder, h.x, h.y, 2.25, (h.x + h.y) / h.r);
			break;
		case "bat":
			drawSprite(ctx, frame(sprites.bat, h.ttl * 10), h.x, h.y, 2);
			break;
	}
}

function drawWarning(ctx: CanvasRenderingContext2D, w: Warning) {
	if (Math.floor(w.delay * 10) % 2 === 0) return;
	const m = 18;
	const x = Math.min(WIDTH - m, Math.max(m, w.hazard.x));
	const y = Math.min(HEIGHT - m, Math.max(m, w.hazard.y));
	ctx.fillStyle = COLORS.warning;
	ctx.beginPath();
	ctx.moveTo(x, y - 13);
	ctx.lineTo(x + 13, y + 10);
	ctx.lineTo(x - 13, y + 10);
	ctx.closePath();
	ctx.fill();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = COLORS.outline;
	ctx.font = `bold 16px ${FONT}`;
	ctx.fillText("!", x, y + 2);
}

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
	if (p.ttl < 1.5 && Math.floor(time * 8) % 2 === 0) return;
	const bob = Math.sin(time * 4 + p.x) * 2;
	const sprite =
		p.kind === "coin" ? frame(sprites.coin, p.ttl * 8) : sprites.shield;
	drawSprite(ctx, sprite, p.x, p.y + bob, 2.5);
}

function drawEffects(ctx: CanvasRenderingContext2D, fx: Effects) {
	for (const p of fx.particles) {
		ctx.globalAlpha = p.life / p.maxLife;
		ctx.fillStyle = p.color;
		ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	for (const t of fx.texts) {
		ctx.globalAlpha = Math.min(1, t.life * 2);
		text(ctx, t.text, t.x, t.y, 18, t.color);
	}
	ctx.globalAlpha = 1;
}

function text(
	ctx: CanvasRenderingContext2D,
	value: string,
	x: number,
	y: number,
	size: number,
	color = COLORS.text,
) {
	ctx.font = `bold ${size}px ${FONT}`;
	ctx.lineWidth = Math.max(3, size / 6);
	ctx.lineJoin = "round";
	ctx.strokeStyle = COLORS.outline;
	ctx.strokeText(value, x, y);
	ctx.fillStyle = color;
	ctx.fillText(value, x, y);
}

function drawBanner(ctx: CanvasRenderingContext2D, level: number, t: number) {
	const elapsed = BANNER_TIME - t;
	const pop = Math.min(1, elapsed * 6);
	ctx.globalAlpha = Math.min(1, t * 2);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	text(
		ctx,
		`LEVEL ${level}`,
		WIDTH / 2,
		HEIGHT / 3,
		40 + 24 * pop,
		COLORS.crown,
	);
	ctx.globalAlpha = 1;
}

function drawHud(ctx: CanvasRenderingContext2D, v: View) {
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	text(ctx, `Score ${scoreOf(v.game)}`, 16, 14, 20);
	ctx.textAlign = "center";
	text(ctx, `Level ${v.game.level}`, WIDTH / 2, 14, 20);
	ctx.textAlign = "right";
	text(ctx, `Best ${v.best}`, WIDTH - 16, 14, 20);
}

function drawOverlay(
	ctx: CanvasRenderingContext2D,
	lines: [string, number, string?][],
	offset = 0,
) {
	ctx.fillStyle = COLORS.overlay;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	let y = HEIGHT / 2 - (lines.length - 1) * 24 + offset;
	for (const [value, size, color] of lines) {
		text(ctx, value, WIDTH / 2, y, size, color);
		y += 48;
	}
}

export function draw(ctx: CanvasRenderingContext2D, v: View) {
	const { game } = v;
	const alive = v.screen !== "over";
	const shake = v.fx.shake;
	ctx.imageSmoothingEnabled = false;
	ctx.save();
	ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
	drawBackground(ctx, game.level);
	for (const c of [...game.pickups, ...game.hazards]) drawShadow(ctx, c);
	if (alive) drawShadow(ctx, game.player);
	for (const p of game.pickups) drawPickup(ctx, p, game.time);
	for (const h of game.hazards) drawHazard(ctx, h);
	if (alive) drawPlayer(ctx, game.player, game.time);
	for (const w of game.warnings) drawWarning(ctx, w);
	drawEffects(ctx, v.fx);
	ctx.restore();
	drawHud(ctx, v);
	if (v.fx.banner > 0) drawBanner(ctx, game.level, v.fx.banner);

	switch (v.screen) {
		case "title":
			drawOverlay(
				ctx,
				[
					["DODGE KING", 64, COLORS.crown],
					["Move: WASD, arrow keys, or drag", 18, COLORS.dim],
					["Esc: pause   M: sound   N: music", 18, COLORS.dim],
					["Press Enter or tap to start", 22],
				],
				40,
			);
			drawSprite(
				ctx,
				sprites.kingIdle,
				WIDTH / 2,
				160 + Math.sin(v.clock * 3) * 6,
				5,
			);
			break;
		case "paused":
			drawOverlay(ctx, [
				["Paused", 48],
				["Press Enter or tap to resume", 22],
			]);
			break;
		case "over":
			drawOverlay(ctx, [
				["Game Over", 52, COLORS.robe],
				[`Score ${scoreOf(game)}`, 26],
				[
					v.newBest ? "New best!" : `Best ${v.best}`,
					22,
					v.newBest ? COLORS.coin : COLORS.dim,
				],
				["Press Enter or tap to play again", 22],
			]);
			break;
	}
	drawButtons(ctx, v);
}
