import type { GameEvent } from "../game/game";
import { load, save } from "../storage";

const MUTE_KEY = "dodge-king:muted";

let ctx: AudioContext | null = null;
let muted = load(MUTE_KEY) === "1";

// Browsers only allow audio after a user gesture, so this is called from input handlers.
export function unlockAudio() {
	ctx ??= new AudioContext();
	if (ctx.state === "suspended") void ctx.resume();
}

export const isMuted = () => muted;

export function toggleMute() {
	muted = !muted;
	save(MUTE_KEY, muted ? "1" : "0");
}

function tone(
	freq: number,
	duration: number,
	type: OscillatorType = "square",
	endFreq = freq,
	delay = 0,
) {
	if (!ctx || muted) return;
	const t = ctx.currentTime + delay;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, t);
	osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
	gain.gain.setValueAtTime(0.12, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
	osc.connect(gain).connect(ctx.destination);
	osc.start(t);
	osc.stop(t + duration);
}

const sounds: Record<GameEvent["type"] | "start", () => void> = {
	start: () => tone(440, 0.15, "square", 880),
	coin: () => {
		tone(988, 0.06);
		tone(1319, 0.12, "square", 1319, 0.06);
	},
	shield: () => tone(330, 0.3, "triangle", 990),
	block: () => tone(220, 0.25, "sawtooth", 110),
	hit: () => tone(300, 0.7, "sawtooth", 40),
	level: () => {
		for (const [i, f] of [523, 659, 784].entries())
			tone(f, 0.12, "square", f, i * 0.1);
	},
};

export const playSound = (name: GameEvent["type"] | "start") => sounds[name]();
