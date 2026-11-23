import { type Circle, HEIGHT, type Rng, WIDTH } from "./world";

export type HazardKind = "arrow" | "boulder" | "bat";

export interface Hazard extends Circle {
	kind: HazardKind;
	vx: number;
	vy: number;
	ttl: number;
}

const SPAWN_MARGIN = 30;
const DESPAWN_MARGIN = 60;

const STATS: Record<
	HazardKind,
	{ r: number; speed: number; spread: number; ttl: number }
> = {
	arrow: { r: 5, speed: 230, spread: 0.3, ttl: 8 },
	boulder: { r: 18, speed: 150, spread: 0.8, ttl: 10 },
	bat: { r: 10, speed: 95, spread: 0, ttl: 7 },
};

export const speedScale = (level: number) => 1 + 0.12 * (level - 1);
export const hazardInterval = (level: number) =>
	Math.max(0.25, 1.1 * 0.85 ** (level - 1));

export function unlockedKinds(level: number): HazardKind[] {
	if (level >= 3) return ["arrow", "boulder", "bat"];
	if (level >= 2) return ["arrow", "boulder"];
	return ["arrow"];
}

function edgePoint(rng: Rng) {
	const t = rng();
	switch (Math.floor(rng() * 4)) {
		case 0:
			return { x: t * WIDTH, y: -SPAWN_MARGIN };
		case 1:
			return { x: WIDTH + SPAWN_MARGIN, y: t * HEIGHT };
		case 2:
			return { x: t * WIDTH, y: HEIGHT + SPAWN_MARGIN };
		default:
			return { x: -SPAWN_MARGIN, y: t * HEIGHT };
	}
}

export function spawnHazard(level: number, target: Circle, rng: Rng): Hazard {
	const kinds = unlockedKinds(level);
	const kind = kinds[Math.floor(rng() * kinds.length)] ?? "arrow";
	const { r, speed, spread, ttl } = STATS[kind];
	const { x, y } = edgePoint(rng);
	const angle = Math.atan2(target.y - y, target.x - x) + (rng() - 0.5) * spread;
	const v = speed * speedScale(level);
	return {
		kind,
		x,
		y,
		r,
		vx: Math.cos(angle) * v,
		vy: Math.sin(angle) * v,
		ttl,
	};
}

export function moveHazard(
	h: Hazard,
	target: Circle,
	level: number,
	dt: number,
) {
	h.ttl -= dt;
	if (h.kind === "bat") {
		const dx = target.x - h.x;
		const dy = target.y - h.y;
		const len = Math.hypot(dx, dy) || 1;
		const v = STATS.bat.speed * speedScale(level);
		h.vx = (dx / len) * v;
		h.vy = (dy / len) * v;
	}
	h.x += h.vx * dt;
	h.y += h.vy * dt;
	if (h.kind === "boulder") {
		if ((h.x < h.r && h.vx < 0) || (h.x > WIDTH - h.r && h.vx > 0))
			h.vx = -h.vx;
		if ((h.y < h.r && h.vy < 0) || (h.y > HEIGHT - h.r && h.vy > 0))
			h.vy = -h.vy;
	}
}

export const isAlive = (h: Hazard) =>
	h.ttl > 0 &&
	h.x > -DESPAWN_MARGIN &&
	h.x < WIDTH + DESPAWN_MARGIN &&
	h.y > -DESPAWN_MARGIN &&
	h.y < HEIGHT + DESPAWN_MARGIN;
