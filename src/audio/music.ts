import { load, save } from "../storage";
import { type AudioEngine, getEngine } from "./engine";

const MUSIC_KEY = "dodge-king:music";
const VOLUME = 0.5;
const BASE_BPM = 132;
const MAX_BPM = 180;
const LOOKAHEAD = 0.12;
const TICK_MS = 25;

// MIDI notes per 16th step (lead) and per 8th step (bass); 0 is a rest. One bar per line.
// biome-ignore format: keep the bar layout
const LEAD = [
	69, 0, 72, 0, 76, 0, 74, 72, 69, 0, 72, 0, 76, 79, 76, 74,
	72, 0, 74, 0, 76, 0, 72, 0, 67, 0, 69, 0, 71, 0, 72, 74,
	69, 0, 72, 0, 76, 0, 81, 79, 77, 0, 76, 0, 74, 0, 72, 0,
	71, 0, 72, 74, 76, 0, 74, 72, 71, 0, 67, 0, 69, 0, 0, 0,
];
// biome-ignore format: keep the bar layout
const BASS = [
	45, 57, 45, 57, 45, 57, 45, 57,
	41, 53, 41, 53, 43, 55, 43, 55,
	45, 57, 45, 57, 41, 53, 41, 53,
	40, 52, 40, 52, 40, 52, 40, 52,
];

let enabled = load(MUSIC_KEY) !== "0";
let timer: ReturnType<typeof setInterval> | undefined;
let step = 0;
let nextTime = 0;
let bpm = BASE_BPM;
let noise: AudioBuffer | null = null;

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const stepLength = () => 60 / bpm / 4;

function voice(
	{ ctx, music }: AudioEngine,
	type: OscillatorType,
	f: number,
	t: number,
	duration: number,
	volume: number,
	endFreq = f,
) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(f, t);
	osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
	gain.gain.setValueAtTime(volume, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
	osc.connect(gain).connect(music);
	osc.start(t);
	osc.stop(t + duration);
}

function drum(
	{ ctx, music }: AudioEngine,
	t: number,
	duration: number,
	volume: number,
	cutoff: number,
) {
	if (!noise) {
		noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	}
	const src = ctx.createBufferSource();
	const filter = ctx.createBiquadFilter();
	const gain = ctx.createGain();
	src.buffer = noise;
	filter.type = "highpass";
	filter.frequency.value = cutoff;
	gain.gain.setValueAtTime(volume, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
	src.connect(filter).connect(gain).connect(music);
	src.start(t);
	src.stop(t + duration);
}

function playStep(engine: AudioEngine, s: number, t: number) {
	const len = stepLength();
	const lead = LEAD[s % LEAD.length];
	if (lead) voice(engine, "square", freq(lead), t, len * 0.9, 0.06);
	const bass = s % 2 === 0 ? BASS[(s / 2) % BASS.length] : 0;
	if (bass) voice(engine, "triangle", freq(bass), t, len * 1.8, 0.2);
	if (s % 8 === 0) voice(engine, "sine", 150, t, 0.15, 0.35, 40);
	if (s % 8 === 4) drum(engine, t, 0.12, 0.12, 1500);
	if (s % 2 === 1) drum(engine, t, 0.03, 0.04, 7000);
}

function schedule() {
	const engine = getEngine();
	if (!engine) return;
	while (nextTime < engine.ctx.currentTime + LOOKAHEAD) {
		playStep(engine, step, nextTime);
		nextTime += stepLength();
		step++;
	}
}

function applyVolume() {
	const engine = getEngine();
	if (engine) engine.music.gain.value = enabled ? VOLUME : 0;
}

export function startMusic(fromTop: boolean) {
	const engine = getEngine();
	if (!engine) return;
	if (fromTop) step = 0;
	applyVolume();
	if (timer) return;
	nextTime = engine.ctx.currentTime + 0.05;
	timer = setInterval(schedule, TICK_MS);
}

export function stopMusic() {
	clearInterval(timer);
	timer = undefined;
}

export const setTempo = (level: number) => {
	bpm = Math.min(MAX_BPM, BASE_BPM + (level - 1) * 6);
};

export const isMusicOn = () => enabled;

export function toggleMusic() {
	enabled = !enabled;
	save(MUSIC_KEY, enabled ? "1" : "0");
	applyVolume();
}
