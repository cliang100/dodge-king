import type { Input } from "../game/game";
import { HEIGHT, WIDTH } from "../game/world";

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];
const UP = ["ArrowUp", "KeyW"];
const DOWN = ["ArrowDown", "KeyS"];
const MOVE_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN]);

export function bindInput(canvas: HTMLCanvasElement): () => Input {
	const keys = new Set<string>();
	let pointer: { x: number; y: number } | null = null;
	let drag = { x: 0, y: 0 };

	const held = (codes: string[]) => (codes.some((c) => keys.has(c)) ? 1 : 0);

	const toWorld = (e: PointerEvent) => {
		const rect = canvas.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) / rect.width) * WIDTH,
			y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
		};
	};

	window.addEventListener("keydown", (e) => {
		if (MOVE_KEYS.has(e.code)) e.preventDefault();
		keys.add(e.code);
	});
	window.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => keys.clear());

	canvas.addEventListener("pointerdown", (e) => {
		canvas.setPointerCapture(e.pointerId);
		pointer = toWorld(e);
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!pointer) return;
		const next = toWorld(e);
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
		};
		drag = { x: 0, y: 0 };
		return input;
	};
}
