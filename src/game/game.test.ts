import { describe, expect, it } from "vitest";
import {
	createGame,
	type Input,
	levelAt,
	overlaps,
	scoreOf,
	update,
} from "./game";
import {
	hazardInterval,
	isAlive,
	moveHazard,
	spawnHazard,
	unlockedKinds,
} from "./hazards";
import { HEIGHT, WIDTH } from "./world";

const idle: Input = { dx: 0, dy: 0, target: null };
const rng = () => 0.5;

describe("game", () => {
	it("detects overlapping circles", () => {
		expect(overlaps({ x: 0, y: 0, r: 5 }, { x: 9, y: 0, r: 5 })).toBe(true);
		expect(overlaps({ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 })).toBe(false);
	});

	it("levels up every 15 seconds and emits an event", () => {
		expect(levelAt(14.9)).toBe(1);
		expect(levelAt(15)).toBe(2);
		const s = createGame();
		s.time = 14.99;
		expect(update(s, idle, 0.02, rng)).toContain("level");
		expect(s.level).toBe(2);
	});

	it("keeps the player inside the arena", () => {
		const s = createGame();
		for (let i = 0; i < 200; i++)
			update(s, { dx: 1, dy: -1, target: null }, 0.05, rng);
		expect(s.player.x).toBe(WIDTH - s.player.r);
		expect(s.player.y).toBe(s.player.r);
	});

	it("moves toward a pointer target without overshooting", () => {
		const s = createGame();
		const target = { x: s.player.x + 2, y: s.player.y };
		update(s, { dx: 0, dy: 0, target }, 0.1, rng);
		expect(s.player.x).toBeCloseTo(target.x);
	});

	it("collects coins for points", () => {
		const s = createGame();
		s.pickups.push({
			kind: "coin",
			x: s.player.x,
			y: s.player.y,
			r: 10,
			ttl: 5,
		});
		expect(update(s, idle, 0.01, rng)).toContain("coin");
		expect(s.coins).toBe(1);
		expect(s.pickups).toHaveLength(0);
		expect(scoreOf(s)).toBe(50);
	});

	it("uses the shield to absorb one hit", () => {
		const s = createGame();
		s.player.shield = true;
		s.hazards.push({
			kind: "boulder",
			x: s.player.x,
			y: s.player.y,
			r: 18,
			vx: 0,
			vy: 0,
			ttl: 5,
		});
		const events = update(s, idle, 0.01, rng);
		expect(events).toContain("block");
		expect(events).not.toContain("hit");
		expect(s.player.shield).toBe(false);
		expect(s.player.invulnerable).toBeGreaterThan(0);
	});

	it("ends the run on an unshielded hit", () => {
		const s = createGame();
		s.hazards.push({
			kind: "boulder",
			x: s.player.x,
			y: s.player.y,
			r: 18,
			vx: 0,
			vy: 0,
			ttl: 5,
		});
		expect(update(s, idle, 0.01, rng)).toContain("hit");
	});
});

describe("hazards", () => {
	it("unlocks new kinds as the level rises", () => {
		expect(unlockedKinds(1)).toEqual(["arrow"]);
		expect(unlockedKinds(3)).toContain("bat");
	});

	it("spawns faster at higher levels, with a floor", () => {
		expect(hazardInterval(5)).toBeLessThan(hazardInterval(1));
		expect(hazardInterval(100)).toBe(0.25);
	});

	it("spawns off-screen aimed at the target", () => {
		const target = { x: WIDTH / 2, y: HEIGHT / 2, r: 14 };
		const h = spawnHazard(1, target, rng);
		const inside = h.x >= 0 && h.x <= WIDTH && h.y >= 0 && h.y <= HEIGHT;
		expect(inside).toBe(false);
		const dot = (target.x - h.x) * h.vx + (target.y - h.y) * h.vy;
		expect(dot).toBeGreaterThan(0);
	});

	it("bounces boulders off walls", () => {
		const h = {
			kind: "boulder" as const,
			x: 10,
			y: 300,
			r: 18,
			vx: -100,
			vy: 0,
			ttl: 5,
		};
		moveHazard(h, { x: 400, y: 300, r: 14 }, 1, 0.01);
		expect(h.vx).toBe(100);
	});

	it("removes hazards that leave the arena or expire", () => {
		expect(
			isAlive({ kind: "arrow", x: -100, y: 0, r: 5, vx: 0, vy: 0, ttl: 5 }),
		).toBe(false);
		expect(
			isAlive({ kind: "arrow", x: 100, y: 100, r: 5, vx: 0, vy: 0, ttl: 0 }),
		).toBe(false);
	});
});
