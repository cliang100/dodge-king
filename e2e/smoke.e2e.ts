import { expect, test } from "@playwright/test";

const centerPixelAlpha = () => {
	const canvas = document.querySelector<HTMLCanvasElement>("#game");
	const ctx = canvas?.getContext("2d");
	if (!canvas || !ctx) return 0;
	return ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data[3];
};

test("game loads, renders, and starts without errors", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	page.on("console", (m) => {
		if (m.type() === "error") errors.push(m.text());
	});

	await page.goto("/");
	await expect(page.locator("#game")).toBeVisible();
	await expect.poll(() => page.evaluate(centerPixelAlpha)).toBeGreaterThan(0);

	await page.keyboard.press("Enter");
	await page.keyboard.down("ArrowLeft");
	await page.waitForTimeout(1000);
	await page.keyboard.up("ArrowLeft");

	expect(errors).toEqual([]);
});
