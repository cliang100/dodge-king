import { getStore } from "@netlify/blobs";
import { addScore, parseScore, type Score } from "../../src/scores";

const KEY = "top";
const MAX_TRIES = 5;

export const config = {
	path: "/api/scores",
	rateLimit: {
		windowLimit: 30,
		windowSize: 60,
		aggregateBy: ["ip", "domain"],
	},
};

export default async (
	req: Request,
	context: { deploy: { context: string } },
) => {
	// Blobs are shared by all deploys, so keep previews off the real board.
	const name = context.deploy.context === "production" ? "scores" : "preview";
	const store = getStore({ name, consistency: "strong" });
	const read = () => store.getWithMetadata(KEY, { type: "json" });

	if (req.method === "GET") {
		const current = await read();
		return Response.json(current?.data ?? []);
	}
	if (req.method !== "POST") {
		return Response.json({ error: "Method not allowed" }, { status: 405 });
	}

	const entry = parseScore(await req.json().catch(() => null));
	if (!entry) return Response.json({ error: "Invalid score" }, { status: 400 });

	// Conditional writes, so simultaneous submissions can't overwrite each other.
	for (let i = 0; i < MAX_TRIES; i++) {
		const current = await read();
		const scores: Score[] = current?.data ?? [];
		const next = addScore(scores, entry);
		if (next === scores) return Response.json(scores);
		const { modified } = await store.setJSON(
			KEY,
			next,
			current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true },
		);
		if (modified) return Response.json(next);
	}
	return Response.json({ error: "Busy, try again" }, { status: 503 });
};
