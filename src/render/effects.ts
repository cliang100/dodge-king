import { COIN_POINTS, type GameEvent } from "../game/game";
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
		text: `+${COIN_POINTS}`,
	},
	shield: {
		count: 14,
		speed: 140,
		colors: ["#4cc9f0", "#ffffff"],
		shake: 0,
		text: "SHIELD",
	},
	block: { count: 18, speed: 200, colors: ["#4cc9f0", "#ffffff"], shake: 6 },
	hit: {
		count: 36,
		speed: 260,
		colors: ["#e0405a", "#ffb627", "#ffd23f"],
		shake: 14,
	},
	level: { count: 0, speed: 0, colors: [], shake: 0 },
};

const GRAVITY = 300;
const SHAKE_DECAY = 30;

export const createEffects = (reduceMotion: boolean): Effects => ({
	particles: [],
	texts: [],
	shake: 0,
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
	if (burst.text) {
		fx.texts.push({
			x: event.x,
			y: event.y - 20,
			text: burst.text,
			life: 0.8,
			color: burst.colors[0] ?? "#fff",
		});
	}
	if (!fx.reduceMotion) fx.shake = Math.max(fx.shake, burst.shake);
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
}
