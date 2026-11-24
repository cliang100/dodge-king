import type { Input } from "../game/game";
import { HEIGHT, WIDTH } from "../game/world";
import { bindJoystick } from "./joystick";

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];
const UP = ["ArrowUp", "KeyW"];
const DOWN = ["ArrowDown", "KeyS"];
const MOVE_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN]);
const DASH_KEYS = new Set(["ShiftLeft", "ShiftRight", "Space"]);

export function toWorld(canvas: HTMLCanvasElement, e: PointerEvent) {
	const rect = canvas.getBoundingClientRect();
	return {
		x: ((e.clientX - rect.left) / rect.width) * WIDTH,
		y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
	};
}

export function bindInput(): () => Input {
	const keys = new Set<string>();
	const readStick = bindJoystick();
	let dash = false;

	const held = (codes: string[]) => (codes.some((c) => keys.has(c)) ? 1 : 0);

	window.addEventListener("keydown", (e) => {
		if (MOVE_KEYS.has(e.code)) e.preventDefault();
		if (DASH_KEYS.has(e.code) && !e.repeat) dash = true;
		keys.add(e.code);
	});
	window.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => keys.clear());

	return () => {
		const stick = readStick();
		const input = {
			dx: held(RIGHT) - held(LEFT) + stick.x,
			dy: held(DOWN) - held(UP) + stick.y,
			dash,
		};
		dash = false;
		return input;
	};
}
