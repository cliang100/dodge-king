const PALETTE: Record<string, string> = {
	y: "#ffd23f",
	Y: "#e89a1c",
	s: "#ffcc99",
	k: "#1b1325",
	r: "#e0405a",
	R: "#a02545",
	w: "#ffffff",
	b: "#6b3e26",
	p: "#9b5de5",
	P: "#5a2a8a",
	g: "#4a4458",
	G: "#8d86a0",
	h: "#b9b2cc",
	d: "#5f5872",
	f: "#ff5d73",
	n: "#c08552",
	m: "#e8e8f0",
	c: "#1d6fa5",
	C: "#4cc9f0",
};

export type Sprite = HTMLCanvasElement;

function build(rows: string[]): Sprite {
	const canvas = document.createElement("canvas");
	canvas.width = rows[0]?.length ?? 0;
	canvas.height = rows.length;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	for (const [y, row] of rows.entries()) {
		for (const [x, ch] of [...row].entries()) {
			const color = PALETTE[ch];
			if (!color) continue;
			ctx.fillStyle = color;
			ctx.fillRect(x, y, 1, 1);
		}
	}
	return canvas;
}

export const king = build([
	"....y..yy..y....",
	"....yy.yy.yy....",
	"....yyyyyyyy....",
	"....YrYYYYrY....",
	"....ssssssss....",
	"....skssssks....",
	"....ssssssss....",
	".....ssssss.....",
	"...wwwwwwwwww...",
	"..rrrrrwwrrrrr..",
	"..rrrrrwwrrrrr..",
	"..ssrrrwwrrrss..",
	"...rrrrwwrrrr...",
	"...RRRRRRRRRR...",
	"....bb....bb....",
	"....bb....bb....",
]);

export const bat = build([
	"P..........P",
	"PP..p..p..PP",
	"PpP.pppp.PpP",
	"PpppwppwpppP",
	".PPppppppPP.",
	"...PppppP...",
	"....P..P....",
	"............",
]);

export const boulder = build([
	".....gggggg.....",
	"...ggGGGGGGgg...",
	"..gGGGGGGGGGGg..",
	".gGGGhGGGGGGGGg.",
	".gGGhhGGGGGdGGg.",
	"gGGGGGGGGGddGGGg",
	"gGGGGGGGGGGGGGGg",
	"gGGdGGGGGGGGGGGg",
	"gGddGGGGGGGhGGGg",
	"gGGGGGGGGGhhGGGg",
	"gGGGGGGGGGGGGGGg",
	".gGGGGGdGGGGGGg.",
	".gGGGGddGGGGGGg.",
	"..gGGGGGGGGGGg..",
	"...ggGGGGGGgg...",
	".....gggggg.....",
]);

export const arrow = build([
	"ff........m...",
	".ff.......mm..",
	"..fnnnnnnnmmmm",
	".ff.......mm..",
	"ff........m...",
]);

export const coin = build([
	"..YYYY..",
	".YyyyyY.",
	"YyywyyyY",
	"YyyyyyyY",
	"YyyyyyyY",
	"YyyyyyyY",
	".YyyyyY.",
	"..YYYY..",
]);

export const shield = build([
	"..cccccc..",
	".cCCCCCCc.",
	"cCCwCCCCCc",
	"cCwCCCCCCc",
	"cCCCCCCCCc",
	"cCCCCCCCCc",
	".cCCCCCCc.",
	".cCCCCCCc.",
	"..cCCCCc..",
	"....cc....",
]);

export function drawSprite(
	ctx: CanvasRenderingContext2D,
	sprite: Sprite,
	x: number,
	y: number,
	scale: number,
	angle = 0,
) {
	const w = sprite.width * scale;
	const h = sprite.height * scale;
	ctx.save();
	ctx.translate(x, y);
	if (angle) ctx.rotate(angle);
	ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
	ctx.restore();
}
