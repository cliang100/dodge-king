import type { Input } from "../game/game";
import { HEIGHT, WIDTH } from "../game/world";

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];
const UP = ["ArrowUp", "KeyW"];
const DOWN = ["ArrowDown", "KeyS"];
const MOVE_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN]);
const DASH_KEYS = new Set(["ShiftLeft", "ShiftRight", "Space"]);
const DOUBLE_TAP_MS = 300;

export function toWorld(canvas: HTMLCanvasElement, e: PointerEvent) {
	const rect = canvas.getBoundingClientRect();
	return {
		x: ((e.clientX - rect.left) / rect.width) * WIDTH,
		y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
	};
}

export function bindInput(
	canvas: HTMLCanvasElement,
	ignore: (x: number, y: number) => boolean,
): () => Input {
	const keys = new Set<string>();
	let pointer: { x: number; y: number } | null = null;
	let drag = { x: 0, y: 0 };
	let dash = false;
	let lastTap = 0;

	const held = (codes: string[]) => (codes.some((c) => keys.has(c)) ? 1 : 0);

	window.addEventListener("keydown", (e) => {
		if (MOVE_KEYS.has(e.code)) e.preventDefault();
		if (DASH_KEYS.has(e.code) && !e.repeat) dash = true;
		keys.add(e.code);
	});
	window.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => keys.clear());

	canvas.addEventListener("pointerdown", (e) => {
		const p = toWorld(canvas, e);
		if (ignore(p.x, p.y)) return;
		canvas.setPointerCapture(e.pointerId);
		pointer = p;
		if (e.timeStamp - lastTap < DOUBLE_TAP_MS) dash = true;
		lastTap = e.timeStamp;
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!pointer) return;
		const next = toWorld(canvas, e);
		drag.x += next.x - pointer.x;
		drag.y += next.y - pointer.y;
		pointer = next;
	});
	const release = () => {
		pointer = null;
	};
	canvas.addEventListener("pointerup", release);
	canvas.addEventListener("pointercancel", release);

	return () => {
		const input = {
			dx: held(RIGHT) - held(LEFT),
			dy: held(DOWN) - held(UP),
			drag,
			dash,
		};
		drag = { x: 0, y: 0 };
		dash = false;
		return input;
	};
}
