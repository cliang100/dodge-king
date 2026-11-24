import { describe, expect, it } from "vitest";
import {
	createGame,
	DASH_COOLDOWN,
	type GameEvent,
	type Input,
	levelAt,
	scoreOf,
	update,
	WARNING_TIME,
} from "./game";
import {
	hazardInterval,
	hits,
	isAlive,
	moveHazard,
	spawnHazard,
	unlockedKinds,
} from "./hazards";
import { HEIGHT, overlaps, WIDTH } from "./world";

const idle: Input = { dx: 0, dy: 0, dash: false };
const rng = () => 0.5;
const types = (events: GameEvent[]) => events.map((e) => e.type);

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
		expect(types(update(s, idle, 0.02, rng))).toContain("level");
		expect(s.level).toBe(2);
	});

	it("keeps the player inside the arena", () => {
		const s = createGame();
		for (let i = 0; i < 200; i++)
			update(s, { ...idle, dx: 1, dy: -1 }, 0.05, rng);
		expect(s.player.x).toBe(WIDTH - s.player.r);
		expect(s.player.y).toBe(s.player.r);
	});

	it("moves at a set speed however far the stick is pushed", () => {
		for (const dx of [0.3, 1]) {
			const s = createGame();
			const x = s.player.x;
			update(s, { ...idle, dx }, 0.1, rng);
			expect(s.player.x).toBeCloseTo(x + 26);
		}
	});

	it("warns before a hazard enters the arena", () => {
		const s = createGame();
		update(s, idle, 1, rng);
		expect(s.warnings).toHaveLength(1);
		expect(s.hazards).toHaveLength(0);
		update(s, idle, WARNING_TIME, rng);
		expect(s.warnings).toHaveLength(0);
		expect(s.hazards).toHaveLength(1);
	});

	it("dashes in the facing direction, then cools down", () => {
		const s = createGame();
		const y = s.player.y;
		expect(types(update(s, { ...idle, dash: true }, 0.05, rng))).toContain(
			"dash",
		);
		expect(s.player.y).toBeCloseTo(y - 40);
		update(s, idle, 0.1, rng);
		expect(types(update(s, { ...idle, dash: true }, 0.05, rng))).not.toContain(
			"dash",
		);
		update(s, idle, DASH_COOLDOWN, rng);
		expect(types(update(s, { ...idle, dash: true }, 0.05, rng))).toContain(
			"dash",
		);
	});

	it("cannot be hit mid-dash", () => {
		const s = createGame();
		s.player.dashTime = 0.1;
		s.hazards.push({
			kind: "boulder",
			x: s.player.x,
			y: s.player.y,
			r: 18,
			vx: 0,
			vy: 0,
			ttl: 5,
		});
		expect(types(update(s, idle, 0.01, rng))).not.toContain("hit");
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
		expect(types(update(s, idle, 0.01, rng))).toContain("coin");
		expect(s.pickups).toHaveLength(0);
		expect(scoreOf(s)).toBe(50);
	});

	it("multiplies coin points for quick pickups, then resets", () => {
		const s = createGame();
		const coin = () =>
			s.pickups.push({
				kind: "coin",
				x: s.player.x,
				y: s.player.y,
				r: 10,
				ttl: 5,
			});
		coin();
		update(s, idle, 0.01, rng);
		coin();
		update(s, idle, 0.01, rng);
		expect(s.combo).toBe(2);
		expect(s.bonus).toBe(150);
		update(s, idle, 3, () => 0);
		coin();
		update(s, idle, 0.01, rng);
		expect(s.combo).toBe(1);
	});

	it("magnet pulls nearby coins toward the player", () => {
		const s = createGame();
		const { x, y } = s.player;
		s.pickups.push(
			{ kind: "magnet", x, y, r: 10, ttl: 5 },
			{ kind: "coin", x: x + 150, y, r: 10, ttl: 5 },
			{ kind: "coin", x: x + 300, y, r: 10, ttl: 5 },
		);
		update(s, idle, 0.1, rng);
		expect(s.magnet).toBeGreaterThan(0);
		update(s, idle, 0.1, rng);
		expect(s.pickups.map((p) => p.x)).toEqual([x + 118, x + 300]);
	});

	it("slow-time halves hazard speed", () => {
		const s = createGame();
		s.slow = 5;
		s.hazards.push({
			kind: "arrow",
			x: 100,
			y: 100,
			r: 5,
			vx: 200,
			vy: 0,
			ttl: 5,
		});
		update(s, idle, 0.1, rng);
		expect(s.hazards[0]?.x).toBeCloseTo(110);
	});

	it("bomb clears every hazard and pending warning", () => {
		const s = createGame();
		const { x, y } = s.player;
		s.pickups.push({ kind: "bomb", x, y, r: 10, ttl: 5 });
		s.hazards.push({ kind: "arrow", x: 50, y: 50, r: 5, vx: 0, vy: 0, ttl: 5 });
		s.warnings.push({ hazard: spawnHazard(1, s.player, rng), delay: 0.5 });
		expect(types(update(s, idle, 0.01, rng))).toContain("bomb");
		expect(s.hazards).toHaveLength(0);
		expect(s.warnings).toHaveLength(0);
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
		const events = types(update(s, idle, 0.01, rng));
		expect(events).toContain("block");
		expect(events).not.toContain("hit");
		expect(s.player.shield).toBe(false);
		expect(s.player.invulnerable).toBeGreaterThan(0);
	});

	it("awards a close-call bonus once per hazard", () => {
		const s = createGame();
		s.hazards.push({
			kind: "arrow",
			x: s.player.x + 28,
			y: s.player.y,
			r: 5,
			vx: 0,
			vy: 0,
			ttl: 5,
		});
		expect(types(update(s, idle, 0.01, rng))).toEqual(["close"]);
		expect(types(update(s, idle, 0.01, rng))).toEqual([]);
		expect(s.bonus).toBe(25);
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
		expect(types(update(s, idle, 0.01, rng))).toContain("hit");
	});
});

describe("hazards", () => {
	it("unlocks new kinds as the level rises", () => {
		expect(unlockedKinds(1)).toEqual(["arrow"]);
		expect(unlockedKinds(3)).toContain("bat");
		expect(unlockedKinds(4)).toContain("laser");
		expect(unlockedKinds(5)).toContain("splitter");
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

	it("lasers hit anywhere along their line", () => {
		const target = { x: 300, y: 200, r: 14 };
		const laser = spawnHazard(4, target, () => 0.99);
		expect(laser.kind).toBe("laser");
		expect(hits({ x: 300, y: 550, r: 14 }, laser)).toBe(laser.vertical);
		expect(hits({ x: 700, y: 200, r: 14 }, laser)).toBe(!laser.vertical);
		expect(hits({ x: 700, y: 550, r: 14 }, laser)).toBe(false);
	});

	it("splits lava boulders into two boulders when the fuse runs out", () => {
		const s = createGame();
		s.hazards.push({
			kind: "splitter",
			x: 100,
			y: 100,
			r: 26,
			vx: 100,
			vy: 0,
			ttl: 0.01,
		});
		expect(types(update(s, idle, 0.02, rng))).toContain("split");
		const boulders = s.hazards.filter((h) => h.kind === "boulder");
		expect(boulders).toHaveLength(2);
		expect(boulders.map((b) => Math.sign(b.vy))).toEqual([1, -1]);
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
