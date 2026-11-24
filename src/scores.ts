export interface Score {
	name: string;
	score: number;
}

export const MAX_SCORES = 10;
export const MAX_NAME = 12;
const MAX_SCORE = 1_000_000;

export function parseScore(value: unknown): Score | null {
	if (typeof value !== "object" || value === null) return null;
	const { name, score } = value as Record<string, unknown>;
	if (typeof name !== "string" || typeof score !== "number") return null;
	const trimmed = name.trim().replace(/\s+/g, " ");
	if (trimmed.length > MAX_NAME || !/^[\p{L}\p{N} _.-]+$/u.test(trimmed))
		return null;
	if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE) return null;
	return { name: trimmed, score };
}

export const qualifies = (scores: Score[], score: number) =>
	score > 0 &&
	(scores.length < MAX_SCORES || scores.some((s) => score > s.score));

/** Keeps one entry per name, the best one. */
export function addScore(scores: Score[], entry: Score): Score[] {
	const same = (s: Score) => s.name.toLowerCase() === entry.name.toLowerCase();
	if (scores.some((s) => same(s) && s.score >= entry.score)) return scores;
	return [...scores.filter((s) => !same(s)), entry]
		.sort((a, b) => b.score - a.score)
		.slice(0, MAX_SCORES);
}
