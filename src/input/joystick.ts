const DEAD_ZONE = 0.2;

export function bindJoystick(): () => { x: number; y: number } {
	const base = document.querySelector<HTMLElement>("#joystick");
	const knob = document.querySelector<HTMLElement>("#knob");
	if (!base || !knob) throw new Error("Joystick is missing from the page");

	let pointerId: number | null = null;
	let stick = { x: 0, y: 0 };

	const set = (x: number, y: number) => {
		stick = Math.hypot(x, y) < DEAD_ZONE ? { x: 0, y: 0 } : { x, y };
		knob.style.translate = `${x * 60}% ${y * 60}%`;
	};
	const move = (e: PointerEvent) => {
		if (e.pointerId !== pointerId) return;
		const rect = base.getBoundingClientRect();
		const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
		const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
		const len = Math.max(1, Math.hypot(x, y));
		set(x / len, y / len);
	};
	const reset = () => {
		pointerId = null;
		set(0, 0);
	};
	const release = (e: PointerEvent) => {
		if (e.pointerId === pointerId) reset();
	};

	base.addEventListener("pointerdown", (e) => {
		if (pointerId !== null) return;
		pointerId = e.pointerId;
		move(e);
	});
	// On window so the stick still works, and lets go, if it gets hidden mid-drag.
	window.addEventListener("pointermove", move);
	window.addEventListener("pointerup", release);
	window.addEventListener("pointercancel", release);
	window.addEventListener("blur", reset);

	return () => stick;
}
