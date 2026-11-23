import type { GameState, Pickup, Player } from "../game/game";
import { scoreOf } from "../game/game";
import type { Hazard } from "../game/hazards";
import { HEIGHT, WIDTH } from "../game/world";
import * as sprites from "./sprites";
import { drawSprite } from "./sprites";

export type Screen = "title" | "playing" | "paused" | "over";

export interface View {
	screen: Screen;
	game: GameState;
	best: number;
	newBest: boolean;
	muted: boolean;
}

const COLORS = {
	bg: "#14121f",
	grid: "#1c1a2b",
	robe: "#e07a5f",
	crown: "#ffb627",
	coin: "#ffd23f",
	shield: "#4cc9f0",
	text: "#f5f5f5",
	dim: "#9a96b0",
	overlay: "rgba(10, 9, 18, 0.72)",
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

function drawBackground(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = COLORS.bg;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	ctx.strokeStyle = COLORS.grid;
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let x = 40; x < WIDTH; x += 40) {
		ctx.moveTo(x, 0);
		ctx.lineTo(x, HEIGHT);
	}
	for (let y = 40; y < HEIGHT; y += 40) {
		ctx.moveTo(0, y);
		ctx.lineTo(WIDTH, y);
	}
	ctx.stroke();
}

const frame = <T>(frames: T[], t: number) =>
	frames[Math.floor(t) % frames.length] as T;

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

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
	if (p.ttl < 1.5 && Math.floor(time * 8) % 2 === 0) return;
	const bob = Math.sin(time * 4 + p.x) * 2;
	const sprite =
		p.kind === "coin" ? frame(sprites.coin, p.ttl * 8) : sprites.shield;
	drawSprite(ctx, sprite, p.x, p.y + bob, 2.5);
}

function text(
	ctx: CanvasRenderingContext2D,
	value: string,
	x: number,
	y: number,
	size: number,
	color = COLORS.text,
) {
	ctx.fillStyle = color;
	ctx.font = `bold ${size}px ${FONT}`;
	ctx.fillText(value, x, y);
}

function drawHud(ctx: CanvasRenderingContext2D, v: View) {
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	text(ctx, `Score ${scoreOf(v.game)}`, 16, 14, 20);
	ctx.textAlign = "center";
	text(ctx, `Level ${v.game.level}`, WIDTH / 2, 14, 20);
	ctx.textAlign = "right";
	text(ctx, `Best ${v.best}`, WIDTH - 16, 14, 20);
	ctx.textBaseline = "bottom";
	ctx.textAlign = "left";
	text(
		ctx,
		v.muted ? "M: sound off" : "M: sound on",
		16,
		HEIGHT - 12,
		14,
		COLORS.dim,
	);
}

function drawOverlay(
	ctx: CanvasRenderingContext2D,
	lines: [string, number, string?][],
) {
	ctx.fillStyle = COLORS.overlay;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	let y = HEIGHT / 2 - (lines.length - 1) * 24;
	for (const [value, size, color] of lines) {
		text(ctx, value, WIDTH / 2, y, size, color);
		y += 48;
	}
}

export function draw(ctx: CanvasRenderingContext2D, v: View) {
	const { game } = v;
	ctx.imageSmoothingEnabled = false;
	drawBackground(ctx);
	for (const p of game.pickups) drawPickup(ctx, p, game.time);
	for (const h of game.hazards) drawHazard(ctx, h);
	drawPlayer(ctx, game.player, game.time);
	drawHud(ctx, v);

	switch (v.screen) {
		case "title":
			drawOverlay(ctx, [
				["DODGE KING", 56, COLORS.crown],
				["Move: WASD, arrow keys, or drag", 18, COLORS.dim],
				["Esc: pause   M: mute", 18, COLORS.dim],
				["Press Enter or tap to start", 22],
			]);
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
}
