import { HEIGHT, WIDTH } from "../game/world";
import type { Screen } from "./draw";

export type ButtonId = "scores" | "music" | "sound" | "pause";

export interface ButtonState {
	screen: Screen;
	muted: boolean;
	music: boolean;
}

// Large because the canvas shrinks to roughly half size on phones.
const SIZE = 56;
const GAP = 12;
const MARGIN = 14;
const IDS: ButtonId[] = ["scores", "music", "sound", "pause"];

const buttons = IDS.map((id, i) => ({
	id,
	x: WIDTH - MARGIN - SIZE - (IDS.length - 1 - i) * (SIZE + GAP),
	y: HEIGHT - MARGIN - SIZE,
}));

const visible = (screen: Screen) =>
	buttons.filter(({ id }) => {
		if (id === "pause") return screen === "playing" || screen === "paused";
		if (id === "scores") return screen === "title" || screen === "over";
		return true;
	});

export const buttonAt = (screen: Screen, x: number, y: number) =>
	visible(screen).find(
		(b) => x >= b.x && x <= b.x + SIZE && y >= b.y && y <= b.y + SIZE,
	)?.id ?? null;

function slash(ctx: CanvasRenderingContext2D) {
	ctx.beginPath();
	ctx.moveTo(-14, 14);
	ctx.lineTo(14, -14);
	ctx.stroke();
}

function drawIcon(ctx: CanvasRenderingContext2D, id: ButtonId, s: ButtonState) {
	switch (id) {
		case "scores":
			ctx.fillRect(-15, 0, 9, 13);
			ctx.fillRect(-4.5, -13, 9, 26);
			ctx.fillRect(6, 4, 9, 9);
			break;
		case "pause":
			if (s.screen === "paused") {
				ctx.beginPath();
				ctx.moveTo(-8, -12);
				ctx.lineTo(12, 0);
				ctx.lineTo(-8, 12);
				ctx.fill();
			} else {
				ctx.fillRect(-10, -12, 7, 24);
				ctx.fillRect(3, -12, 7, 24);
			}
			break;
		case "sound":
			ctx.beginPath();
			ctx.moveTo(-14, -5);
			ctx.lineTo(-7, -5);
			ctx.lineTo(2, -13);
			ctx.lineTo(2, 13);
			ctx.lineTo(-7, 5);
			ctx.lineTo(-14, 5);
			ctx.fill();
			if (s.muted) {
				slash(ctx);
			} else {
				ctx.beginPath();
				ctx.arc(4, 0, 9, -0.8, 0.8);
				ctx.stroke();
			}
			break;
		case "music":
			ctx.beginPath();
			ctx.ellipse(-5, 8, 6, 4.5, -0.4, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillRect(0, -13, 3, 21);
			ctx.fillRect(0, -13, 10, 4);
			if (!s.music) slash(ctx);
			break;
	}
}

export function drawButtons(ctx: CanvasRenderingContext2D, s: ButtonState) {
	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	for (const b of visible(s.screen)) {
		ctx.fillStyle = "rgba(10, 9, 18, 0.45)";
		ctx.beginPath();
		ctx.roundRect(b.x, b.y, SIZE, SIZE, 12);
		ctx.fill();
		ctx.save();
		ctx.translate(b.x + SIZE / 2, b.y + SIZE / 2);
		ctx.fillStyle = "#f5f5f5";
		ctx.strokeStyle = "#f5f5f5";
		drawIcon(ctx, b.id, s);
		ctx.restore();
	}
	ctx.lineCap = "butt";
}
