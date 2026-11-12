import { expect, test } from "@playwright/test";

test("home page exposes the product introduction and catalogue status", async ({
  page,
}) => {
  await page.goto("/");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveAttribute(
    "aria-label",
    "L’inspiration pour ce que l’on cuisine.",
  );
  await expect(page.locator(".catalogue-note")).toContainText(
    "Le catalogue est en préparation.",
  );
  await expect(
    page.getByRole("navigation", { name: "Navigation principale" }),
  ).toBeVisible();
});
