export const WIDTH = 800;
export const HEIGHT = 600;

export type Rng = () => number;

export interface Circle {
	x: number;
	y: number;
	r: number;
}

export const overlaps = (a: Circle, b: Circle) =>
	(a.x - b.x) ** 2 + (a.y - b.y) ** 2 < (a.r + b.r) ** 2;
