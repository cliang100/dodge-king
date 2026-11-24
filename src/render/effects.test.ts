import { describe, expect, it } from "vitest";
import { createEffects, emit, stepEffects } from "./effects";

const rng = () => 0.5;

describe("effects", () => {
	it("bursts particles and score text on coin pickup, then clears", () => {
		const fx = createEffects(false);
		emit(fx, { type: "coin", x: 100, y: 100 }, rng);
		expect(fx.particles).toHaveLength(10);
		expect(fx.texts[0]?.text).toBe("+50");
		stepEffects(fx, 1);
		expect(fx.particles).toHaveLength(0);
		expect(fx.texts).toHaveLength(0);
	});

	it("shakes on hit and settles over time", () => {
		const fx = createEffects(false);
		emit(fx, { type: "hit", x: 0, y: 0 }, rng);
		expect(fx.shake).toBeGreaterThan(0);
		stepEffects(fx, 1);
		expect(fx.shake).toBe(0);
	});

	it("shows a banner on level up", () => {
		const fx = createEffects(false);
		emit(fx, { type: "level", x: 0, y: 0 }, rng);
		expect(fx.banner).toBeGreaterThan(0);
		stepEffects(fx, 2);
		expect(fx.banner).toBe(0);
	});

	it("skips shake when reduced motion is preferred", () => {
		const fx = createEffects(true);
		emit(fx, { type: "hit", x: 0, y: 0 }, rng);
		expect(fx.shake).toBe(0);
	});
});
