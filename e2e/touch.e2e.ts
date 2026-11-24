import { devices, expect, test } from "@playwright/test";

test.describe("phone", () => {
	const { viewport, userAgent, hasTouch, isMobile } = devices["Pixel 7"];
	test.use({ viewport, userAgent, hasTouch, isMobile });

	test("shows touch controls while playing", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("#joystick")).toBeHidden();
		await page.locator("#game").tap();
		await expect(page.locator("#joystick")).toBeVisible();

		const box = await page.locator("#joystick").boundingBox();
		if (!box) throw new Error("no joystick");
		await page.mouse.move(box.x + 65, box.y + 65);
		await page.mouse.down();
		await page.mouse.move(box.x + 125, box.y + 65);
		await expect(page.locator("#knob")).not.toHaveCSS("translate", "0% 0%");
		await page.mouse.up();
		await expect(page.locator("#knob")).toHaveCSS("translate", "0% 0%");
	});
});

test("hides touch controls on desktop", async ({ page }) => {
	await page.goto("/");
	await page.keyboard.press("Enter");
	await page.waitForTimeout(100);
	await expect(page.locator("#controls")).toBeHidden();
});
