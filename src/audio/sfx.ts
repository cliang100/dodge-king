import type { GameEvent } from "../game/game";
import { getEngine } from "./engine";

function tone(
	freq: number,
	duration: number,
	type: OscillatorType = "square",
	endFreq = freq,
	delay = 0,
) {
	const engine = getEngine();
	if (!engine) return;
	const { ctx } = engine;
	const t = ctx.currentTime + delay;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, t);
	osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
	gain.gain.setValueAtTime(0.12, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
	osc.connect(gain).connect(engine.sfx);
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
	dash: () => tone(700, 0.12, "triangle", 200),
	magnet: () => tone(520, 0.25, "triangle", 260),
	slow: () => tone(880, 0.5, "sine", 220),
	bomb: () => tone(160, 0.6, "sawtooth", 30),
	split: () => tone(180, 0.2, "square", 60),
	block: () => tone(220, 0.25, "sawtooth", 110),
	hit: () => tone(300, 0.7, "sawtooth", 40),
	level: () => {
		for (const [i, f] of [523, 659, 784].entries())
			tone(f, 0.12, "square", f, i * 0.1);
	},
};

export const playSound = (name: GameEvent["type"] | "start") => sounds[name]();
