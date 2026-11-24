import { expect, test } from "@playwright/test";

test("a top score can be saved under a name", async ({ page }) => {
	test.setTimeout(90_000);
	const scores = [{ name: "Ana", score: 500_000 }];
	await page.route("/api/scores", (route) => {
		if (route.request().method() === "POST")
			scores.push(route.request().postDataJSON());
		return route.fulfill({ json: scores });
	});

	await page.goto("/");
	await page.keyboard.press("KeyL");
	await expect(page.locator("#scores")).toContainText("Ana");
	await expect(page.locator("#submit-score")).toBeHidden();
	await page.keyboard.press("Escape");

	// Standing still eventually gets the king hit.
	await page.keyboard.press("Enter");
	await expect(page.locator("#name")).toBeFocused({ timeout: 75_000 });
	await page.keyboard.type("wasd mn");
	await expect(page.locator("#name")).toHaveValue("wasd mn");
	await page.keyboard.press("Enter");
	await expect(page.locator("#scores")).toContainText("wasd mn");
	await expect(page.locator("#submit-score")).toBeHidden();
});
