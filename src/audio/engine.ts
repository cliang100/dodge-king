import { load, save } from "../storage";

const MUTE_KEY = "dodge-king:muted";

export interface AudioEngine {
	ctx: AudioContext;
	master: GainNode;
	sfx: GainNode;
	music: GainNode;
}

let engine: AudioEngine | null = null;
let muted = load(MUTE_KEY) === "1";

function applyVolume() {
	if (engine) engine.master.gain.value = muted ? 0 : 1;
}

// Browsers only allow audio after a user gesture, so this is called from input handlers.
export function unlockAudio() {
	if (!engine) {
		const ctx = new AudioContext();
		const master = ctx.createGain();
		const sfx = ctx.createGain();
		const music = ctx.createGain();
		master.connect(ctx.destination);
		sfx.connect(master);
		music.connect(master);
		engine = { ctx, master, sfx, music };
		applyVolume();
	}
	if (engine.ctx.state === "suspended") void engine.ctx.resume();
}

export const getEngine = () => engine;
export const isMuted = () => muted;

export function toggleMute() {
	muted = !muted;
	save(MUTE_KEY, muted ? "1" : "0");
	applyVolume();
}
