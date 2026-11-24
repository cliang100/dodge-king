import { describe, expect, it } from "vitest";
import { addScore, MAX_SCORES, parseScore, qualifies } from "./scores";

const full = Array.from({ length: MAX_SCORES }, (_, i) => ({
	name: `p${i}`,
	score: 1000 - i * 100,
}));

describe("scores", () => {
	it("rejects malformed entries and tidies names", () => {
		expect(parseScore({ name: "  Al   B ", score: 5 })).toEqual({
			name: "Al B",
			score: 5,
		});
		for (const bad of [
			null,
			"x",
			{ name: "", score: 5 },
			{ name: "   ", score: 5 },
			{ name: "<b>hi</b>", score: 5 },
			{ name: "a".repeat(13), score: 5 },
			{ name: "Al", score: "5" },
			{ name: "Al", score: -1 },
			{ name: "Al", score: 1.5 },
			{ name: "Al", score: Number.POSITIVE_INFINITY },
			{ name: "Al", score: 1_000_001 },
		])
			expect(parseScore(bad)).toBeNull();
	});

	it("only lets in scores that beat the board", () => {
		expect(qualifies([], 0)).toBe(false);
		expect(qualifies([], 1)).toBe(true);
		expect(qualifies(full, 100)).toBe(false);
		expect(qualifies(full, 101)).toBe(true);
	});

	it("sorts, trims, and keeps each player's best", () => {
		const added = addScore(full, { name: "new", score: 950 });
		expect(added).toHaveLength(MAX_SCORES);
		expect(added[1]).toEqual({ name: "new", score: 950 });
		expect(addScore(full, { name: "P5", score: 10 })).toBe(full);
		const improved = addScore(full, { name: "P5", score: 2000 });
		expect(improved[0]).toEqual({ name: "P5", score: 2000 });
		expect(improved).toHaveLength(MAX_SCORES);
	});
});
