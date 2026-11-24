import { COIN_POINTS, type GameEvent, NEAR_MISS_POINTS } from "../game/game";
import type { Rng } from "../game/world";

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	color: string;
}

export interface FloatingText {
	x: number;
	y: number;
	text: string;
	life: number;
	color: string;
}

export interface Effects {
	particles: Particle[];
	texts: FloatingText[];
	shake: number;
	banner: number;
	flash: number;
	reduceMotion: boolean;
}

interface Burst {
	count: number;
	speed: number;
	colors: string[];
	shake: number;
	text?: string;
}

const BURSTS: Record<GameEvent["type"], Burst> = {
	coin: {
		count: 10,
		speed: 120,
		colors: ["#ffd23f", "#fff3b0"],
		shake: 0,
	},
	shield: {
		count: 14,
		speed: 140,
		colors: ["#4cc9f0", "#ffffff"],
		shake: 0,
		text: "SHIELD",
	},
	magnet: {
		count: 14,
		speed: 140,
		colors: ["#ff6b6b", "#e8e8f0"],
		shake: 0,
		text: "MAGNET",
	},
	slow: {
		count: 14,
		speed: 140,
		colors: ["#4cc9f0", "#ffd23f"],
		shake: 0,
		text: "SLOW",
	},
	bomb: {
		count: 40,
		speed: 320,
		colors: ["#ffffff", "#ffd23f", "#ff7b25"],
		shake: 10,
		text: "BOOM",
	},
	block: { count: 18, speed: 200, colors: ["#4cc9f0", "#ffffff"], shake: 6 },
	hit: {
		count: 36,
		speed: 260,
		colors: ["#e0405a", "#ffb627", "#ffd23f"],
		shake: 14,
	},
	level: { count: 0, speed: 0, colors: [], shake: 0 },
	split: { count: 20, speed: 180, colors: ["#ff7b25", "#ffd23f"], shake: 5 },
	close: {
		count: 6,
		speed: 80,
		colors: ["#ffffff", "#ffd23f"],
		shake: 0,
		text: `CLOSE! +${NEAR_MISS_POINTS}`,
	},
	dash: { count: 8, speed: 90, colors: ["#ffffff", "#c8c3ff"], shake: 0 },
};

const GRAVITY = 300;
const SHAKE_DECAY = 30;
export const BANNER_TIME = 1.6;
export const FLASH_TIME = 0.25;

export const createEffects = (reduceMotion: boolean): Effects => ({
	particles: [],
	texts: [],
	shake: 0,
	banner: 0,
	flash: 0,
	reduceMotion,
});

export function emit(fx: Effects, event: GameEvent, rng: Rng = Math.random) {
	const burst = BURSTS[event.type];
	for (let i = 0; i < burst.count; i++) {
		const angle = rng() * Math.PI * 2;
		const speed = burst.speed * (0.4 + rng() * 0.6);
		const life = 0.4 + rng() * 0.4;
		fx.particles.push({
			x: event.x,
			y: event.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life,
			maxLife: life,
			size: 2 + rng() * 3,
			color: burst.colors[i % burst.colors.length] ?? "#fff",
		});
	}
	const combo = event.combo ?? 1;
	const text =
		event.type === "coin"
			? `+${COIN_POINTS * combo}${combo > 1 ? ` x${combo}` : ""}`
			: burst.text;
	if (text) {
		fx.texts.push({
			x: event.x,
			y: event.y - 20,
			text,
			life: 0.8,
			color: burst.colors[0] ?? "#fff",
		});
	}
	if (event.type === "level") fx.banner = BANNER_TIME;
	if (fx.reduceMotion) return;
	if (event.type === "bomb") fx.flash = FLASH_TIME;
	fx.shake = Math.max(fx.shake, burst.shake);
}

export function stepEffects(fx: Effects, dt: number) {
	for (const p of fx.particles) {
		p.vy += GRAVITY * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.life -= dt;
	}
	for (const t of fx.texts) {
		t.y -= 40 * dt;
		t.life -= dt;
	}
	fx.particles = fx.particles.filter((p) => p.life > 0);
	fx.texts = fx.texts.filter((t) => t.life > 0);
	fx.shake = Math.max(0, fx.shake - SHAKE_DECAY * dt);
	fx.banner = Math.max(0, fx.banner - dt);
	fx.flash = Math.max(0, fx.flash - dt);
}
