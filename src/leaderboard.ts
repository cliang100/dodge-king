import { parseScore, qualifies, type Score } from "./scores";
import { load, save } from "./storage";

const NAME_KEY = "dodge-king:name";

function find<T extends Element>(selector: string): T {
	const el = document.querySelector<T>(selector);
	if (!el) throw new Error(`${selector} is missing from the page`);
	return el;
}

const dialog = find<HTMLDialogElement>("#leaderboard");
const list = find<HTMLOListElement>("#scores");
const form = find<HTMLFormElement>("#submit-score");
const nameInput = find<HTMLInputElement>("#name");
const saveButton = find<HTMLButtonElement>("#save");
const status = find<HTMLElement>("#status");

let pending = 0;

async function request(entry?: Score): Promise<Score[]> {
	const res = await fetch(
		"/api/scores",
		entry && { method: "POST", body: JSON.stringify(entry) },
	);
	if (!res.ok) throw new Error(`Leaderboard responded ${res.status}`);
	return res.json();
}

function render(scores: Score[]) {
	list.replaceChildren(
		...scores.map(({ name, score }) => {
			const row = document.createElement("li");
			const points = document.createElement("b");
			points.textContent = String(score);
			row.append(name, points);
			return row;
		}),
	);
	status.textContent = scores.length ? "" : "No scores yet";
	form.hidden = !qualifies(scores, pending);
	if (!form.hidden) status.textContent = `You made the top 10 with ${pending}!`;
}

function show() {
	nameInput.value ||= load(NAME_KEY) ?? "";
	if (!dialog.open) dialog.showModal();
}

export async function openLeaderboard() {
	form.hidden = true;
	list.replaceChildren();
	status.textContent = "Loading...";
	show();
	try {
		render(await request());
	} catch {
		status.textContent = "Leaderboard is unavailable right now";
	}
}

export function clearPendingScore() {
	pending = 0;
}

/** Asks for a name if the score makes the board and the player is still on the game over screen. */
export async function offerScore(score: number, stillOver: () => boolean) {
	pending = score;
	try {
		const scores = await request();
		if (!qualifies(scores, score) || !stillOver() || dialog.open) return;
		render(scores);
		show();
		nameInput.focus();
	} catch {
		// the game stays playable offline
	}
}

form.addEventListener("submit", async (e) => {
	e.preventDefault();
	const entry = parseScore({ name: nameInput.value, score: pending });
	if (!entry) {
		status.textContent = "Use letters, numbers, spaces, or _ . -";
		return;
	}
	saveButton.disabled = true;
	try {
		const scores = await request(entry);
		save(NAME_KEY, entry.name);
		pending = 0;
		render(scores);
		find<HTMLButtonElement>("#close").focus();
	} catch {
		status.textContent = "Couldn't save your score, try again";
	} finally {
		saveButton.disabled = false;
	}
});

find("#close").addEventListener("click", () => dialog.close());

// Capture, so typing a name never reaches the game's own key handlers.
window.addEventListener(
	"keydown",
	(e) => {
		if (!dialog.open) return;
		e.stopImmediatePropagation();
		// A movement key still held from the game would otherwise fill in the name.
		if (e.repeat && e.code !== "Backspace") e.preventDefault();
	},
	true,
);
