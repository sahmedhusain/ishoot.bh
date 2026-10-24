import { expect, test as setup } from "@playwright/test";
import { login } from "../helpers";

// Signs in once and saves the session, so the admin tests do not trip the login rate limit.
setup("sign in as the e2e administrator", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: "tests/.results/admin-session.json" });
});
