import type { GameState, Pickup, Player } from "../game/game";
import { scoreOf } from "../game/game";
import type { Hazard } from "../game/hazards";
import { HEIGHT, WIDTH } from "../game/world";

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
	arrow: "#e8e8e8",
	boulder: "#8d8d99",
	boulderEdge: "#5c5c66",
	bat: "#a46cf2",
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

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, time: number) {
	if (p.invulnerable > 0 && Math.floor(time * 20) % 2 === 0) return;
	const { x, y, r } = p;
	ctx.fillStyle = COLORS.robe;
	circle(ctx, x, y, r);
	ctx.fill();

	ctx.fillStyle = COLORS.crown;
	ctx.beginPath();
	ctx.moveTo(x - 10, y - 8);
	ctx.lineTo(x - 10, y - 20);
	ctx.lineTo(x - 5, y - 13);
	ctx.lineTo(x, y - 22);
	ctx.lineTo(x + 5, y - 13);
	ctx.lineTo(x + 10, y - 20);
	ctx.lineTo(x + 10, y - 8);
	ctx.closePath();
	ctx.fill();

	if (p.shield) {
		ctx.strokeStyle = COLORS.shield;
		ctx.lineWidth = 2;
		circle(ctx, x, y, r + 8);
		ctx.stroke();
	}
}

function drawHazard(ctx: CanvasRenderingContext2D, h: Hazard, time: number) {
	switch (h.kind) {
		case "arrow": {
			ctx.save();
			ctx.translate(h.x, h.y);
			ctx.rotate(Math.atan2(h.vy, h.vx));
			ctx.strokeStyle = COLORS.arrow;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(-14, 0);
			ctx.lineTo(4, 0);
			ctx.stroke();
			ctx.fillStyle = COLORS.arrow;
			ctx.beginPath();
			ctx.moveTo(10, 0);
			ctx.lineTo(2, -5);
			ctx.lineTo(2, 5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
			break;
		}
		case "boulder":
			ctx.fillStyle = COLORS.boulder;
			ctx.strokeStyle = COLORS.boulderEdge;
			ctx.lineWidth = 3;
			circle(ctx, h.x, h.y, h.r);
			ctx.fill();
			ctx.stroke();
			break;
		case "bat": {
			const flap = Math.sin(time * 20) * 5;
			ctx.fillStyle = COLORS.bat;
			ctx.beginPath();
			ctx.moveTo(h.x - 4, h.y);
			ctx.lineTo(h.x - 20, h.y - 6 + flap);
			ctx.lineTo(h.x - 12, h.y + 4);
			ctx.moveTo(h.x + 4, h.y);
			ctx.lineTo(h.x + 20, h.y - 6 + flap);
			ctx.lineTo(h.x + 12, h.y + 4);
			ctx.fill();
			circle(ctx, h.x, h.y, h.r - 2);
			ctx.fill();
			break;
		}
	}
}

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
	if (p.ttl < 1.5 && Math.floor(time * 8) % 2 === 0) return;
	const color = p.kind === "coin" ? COLORS.coin : COLORS.shield;
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 2;
	circle(ctx, p.x, p.y, p.r);
	if (p.kind === "coin") ctx.fill();
	else ctx.stroke();
	circle(ctx, p.x, p.y, p.r / 2);
	if (p.kind === "coin") {
		ctx.strokeStyle = COLORS.bg;
		ctx.stroke();
	} else {
		ctx.fill();
	}
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
	drawBackground(ctx);
	for (const p of game.pickups) drawPickup(ctx, p, game.time);
	for (const h of game.hazards) drawHazard(ctx, h, game.time);
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
