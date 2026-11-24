import {
	type Hazard,
	hazardInterval,
	hits,
	isAlive,
	moveHazard,
	spawnHazard,
} from "./hazards";
import { type Circle, HEIGHT, overlaps, type Rng, WIDTH } from "./world";

const PLAYER_SPEED = 260;
const DRAG_SPEED = 900;
const DASH_SPEED = 800;
const DASH_TIME = 0.15;
export const DASH_COOLDOWN = 1.2;
const LEVEL_TIME = 15;
export const COIN_POINTS = 50;
const PICKUP_INTERVAL = 2.5;
const MAX_PICKUPS = 3;
const SHIELD_CHANCE = 0.12;
const INVULNERABLE_TIME = 1;
export const WARNING_TIME = 0.7;

export interface Player extends Circle {
	shield: boolean;
	invulnerable: number;
	moving: boolean;
	dir: { x: number; y: number };
	dashTime: number;
	dashCooldown: number;
}

export interface Pickup extends Circle {
	kind: "coin" | "shield";
	ttl: number;
}

export interface Input {
	dx: number;
	dy: number;
	drag: { x: number; y: number };
	dash: boolean;
}

export interface Warning {
	hazard: Hazard;
	delay: number;
}

export interface GameEvent {
	type: "coin" | "shield" | "block" | "hit" | "level" | "dash";
	x: number;
	y: number;
}

export interface GameState {
	time: number;
	level: number;
	coins: number;
	player: Player;
	hazards: Hazard[];
	warnings: Warning[];
	pickups: Pickup[];
	hazardTimer: number;
	pickupTimer: number;
}

export function createGame(): GameState {
	return {
		time: 0,
		level: 1,
		coins: 0,
		player: {
			x: WIDTH / 2,
			y: HEIGHT / 2,
			r: 14,
			shield: false,
			invulnerable: 0,
			moving: false,
			dir: { x: 0, y: -1 },
			dashTime: 0,
			dashCooldown: 0,
		},
		hazards: [],
		warnings: [],
		pickups: [],
		hazardTimer: 1,
		pickupTimer: PICKUP_INTERVAL,
	};
}

export const levelAt = (time: number) => 1 + Math.floor(time / LEVEL_TIME);
export const scoreOf = (s: GameState) =>
	Math.floor(s.time * 10) + s.coins * COIN_POINTS;

const clamp = (v: number, min: number, max: number) =>
	Math.min(max, Math.max(min, v));

function movePlayer(p: Player, input: Input, dt: number): boolean {
	p.invulnerable = Math.max(0, p.invulnerable - dt);
	p.dashCooldown = Math.max(0, p.dashCooldown - dt);
	const dashed = input.dash && p.dashCooldown === 0;
	if (dashed) {
		p.dashTime = DASH_TIME;
		p.dashCooldown = DASH_COOLDOWN;
	}

	const { drag } = input;
	const dragLen = Math.hypot(drag.x, drag.y);
	const keyLen = Math.hypot(input.dx, input.dy);
	if (p.dashTime > 0) {
		p.dashTime -= dt;
		p.x += p.dir.x * DASH_SPEED * dt;
		p.y += p.dir.y * DASH_SPEED * dt;
	} else if (dragLen > 0) {
		const k = Math.min(1, (DRAG_SPEED * dt) / dragLen);
		p.x += drag.x * k;
		p.y += drag.y * k;
	} else if (keyLen > 0) {
		const k = (PLAYER_SPEED * dt) / keyLen;
		p.x += input.dx * k;
		p.y += input.dy * k;
	}
	if (dragLen > 0.5) p.dir = { x: drag.x / dragLen, y: drag.y / dragLen };
	else if (keyLen > 0) p.dir = { x: input.dx / keyLen, y: input.dy / keyLen };
	p.moving = dragLen > 0.5 || keyLen > 0 || p.dashTime > 0;
	p.x = clamp(p.x, p.r, WIDTH - p.r);
	p.y = clamp(p.y, p.r, HEIGHT - p.r);
	return dashed;
}

function spawnPickup(s: GameState, rng: Rng): Pickup | null {
	if (s.pickups.length >= MAX_PICKUPS) return null;
	const canShield =
		!s.player.shield && !s.pickups.some((p) => p.kind === "shield");
	const kind = canShield && rng() < SHIELD_CHANCE ? "shield" : "coin";
	const m = 40;
	return {
		kind,
		x: m + rng() * (WIDTH - 2 * m),
		y: m + rng() * (HEIGHT - 2 * m),
		r: 10,
		ttl: 6,
	};
}

export function update(
	s: GameState,
	input: Input,
	dt: number,
	rng: Rng = Math.random,
): GameEvent[] {
	const events: GameEvent[] = [];
	const { player } = s;

	s.time += dt;
	const level = levelAt(s.time);
	if (level > s.level) {
		s.level = level;
		events.push({ type: "level", x: player.x, y: player.y });
	}

	if (movePlayer(player, input, dt)) {
		events.push({ type: "dash", x: player.x, y: player.y });
	}

	for (const w of s.warnings) w.delay -= dt;
	for (const w of s.warnings) if (w.delay <= 0) s.hazards.push(w.hazard);
	s.warnings = s.warnings.filter((w) => w.delay > 0);

	s.hazardTimer -= dt;
	if (s.hazardTimer <= 0) {
		const hazard = spawnHazard(s.level, player, rng);
		s.warnings.push({ hazard, delay: WARNING_TIME });
		s.hazardTimer += hazardInterval(s.level);
	}

	s.pickupTimer -= dt;
	if (s.pickupTimer <= 0) {
		const pickup = spawnPickup(s, rng);
		if (pickup) s.pickups.push(pickup);
		s.pickupTimer += PICKUP_INTERVAL;
	}

	for (const h of s.hazards) moveHazard(h, player, s.level, dt);
	s.hazards = s.hazards.filter(isAlive);

	s.pickups = s.pickups.filter((p) => {
		p.ttl -= dt;
		if (!overlaps(player, p)) return p.ttl > 0;
		if (p.kind === "coin") s.coins++;
		else player.shield = true;
		events.push({ type: p.kind, x: p.x, y: p.y });
		return false;
	});

	if (player.invulnerable > 0 || player.dashTime > 0) return events;
	const hit = s.hazards.find((h) => hits(player, h));
	if (!hit) return events;
	if (player.shield) {
		player.shield = false;
		player.invulnerable = INVULNERABLE_TIME;
		s.hazards = s.hazards.filter((h) => h !== hit);
		events.push({ type: "block", x: player.x, y: player.y });
	} else {
		events.push({ type: "hit", x: player.x, y: player.y });
	}
	return events;
}
