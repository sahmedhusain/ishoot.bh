import { expect, test as setup } from "@playwright/test";
import { login } from "../helpers";

// Signs in once and saves the session, so the admin tests do not trip the login rate limit.
setup("sign in as the e2e administrator", async ({ page }) => {
  await login(page);
  // A development server compiles the dashboard on the first sign-in, which can take a while.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 90_000 });
  await page
    .context()
    .storageState({ path: "tests/.results/admin-session.json" });
});
