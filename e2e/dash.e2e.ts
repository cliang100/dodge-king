import { expect, test } from "@playwright/test";

const kingAtCenter = () => {
	const canvas = document.querySelector<HTMLCanvasElement>("#game");
	const ctx = canvas?.getContext("2d");
	if (!canvas || !ctx) throw new Error("no canvas");
	const size = 50;
	const { data } = ctx.getImageData(
		canvas.width / 2 - size / 2,
		canvas.height / 2 - size / 2,
		size,
		size,
	);
	// Looks for the king's skin color, #ffcc99.
	for (let i = 0; i < data.length; i += 4) {
		if (data[i] === 255 && data[i + 1] === 204 && data[i + 2] === 153)
			return true;
	}
	return false;
};

test("space dashes while playing", async ({ page }) => {
	await page.goto("/");
	await page.keyboard.press("Space");
	await expect.poll(() => page.evaluate(kingAtCenter)).toBe(true);
	await page.keyboard.press("Space");
	await expect
		.poll(() => page.evaluate(kingAtCenter), { timeout: 600 })
		.toBe(false);
});
