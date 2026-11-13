import { selectOption } from "./helpers/select-option";
import { expect, test, type Browser } from "@playwright/test";
import users from "../fixtures/users.json";
import { ports } from "../../playwright.config";
import { login, testDatabase, watchErrors } from "./helpers/helpers";
import { t } from "./helpers/locale";
import { setModule } from "./helpers/modules";

const copy = t.tasks;
const db = testDatabase();
const PROJECT = "E2E Launch";
const TASK = "E2E prepare the launch checklist";
let driverUserId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await setModule("tasks", true);
  driverUserId = (
    await db.user.findUniqueOrThrow({ where: { email: users.driver.email } })
  ).id;
  const projects = await db.project.findMany({
    where: { name: PROJECT },
    select: { id: true },
  });
  await db.task.deleteMany({
    where: {
      OR: [
        { projectId: { in: projects.map((p) => p.id) } },
        { title: { startsWith: "E2E " } },
      ],
    },
  });
  await db.project.deleteMany({ where: { name: PROJECT } });
  await db.notification.deleteMany({
    where: { userId: driverUserId, entityType: "task" },
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("a manager creates a project and gives a task to someone, who is told", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/tasks/projects");
  await page.getByTestId("project-new").first().click();
  await page.locator('input[name="projectName"]').fill(PROJECT);
  await page.locator('input[name="projectDue"]').fill("2030-01-31");
  await page.getByTestId("project-save").first().click();
  await expect(page).toHaveURL(/\/dashboard\/tasks\/projects\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });

  await page.getByTestId("task-new").first().click();
  const form = page.getByTestId("task-form").first();
  await form.locator('input[name="taskTitle"]').fill(TASK);
  await selectOption(form.locator('select[name="taskAssignee"]'), driverUserId);
  await form.locator('input[name="taskDue"]').fill("2030-01-15");
  await selectOption(form.locator('select[name="taskPriority"]'), "high");
  await page.getByTestId("task-save").first().click();
  await expect(page.getByTestId("column-todo").first()).toContainText(TASK);
  const task = await db.task.findFirstOrThrow({
    where: { title: TASK },
    include: { project: true },
  });
  expect(task).toMatchObject({
    assigneeId: driverUserId,
    priority: "high",
    status: "todo",
  });
  expect(task.project?.name).toBe(PROJECT);
  await expect
    .poll(() =>
      db.notification.count({
        where: { userId: driverUserId, entityType: "task", entityId: task.id },
      }),
    )
    .toBe(1);

  await selectOption(
    page.getByTestId(`task-${task.number}`).first().getByRole("combobox"),
    "in_progress",
  );
  await expect(page.getByTestId("column-in_progress").first()).toContainText(
    TASK,
  );
  errors.assertClean();
});

async function signIn(browser: Browser) {
  const context = await browser.newContext({
    baseURL: `http://localhost:${ports.admin}`,
  });
  const page = await context.newPage();
  await login(page, users.driver.email, users.driver.password);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  return page;
}

test("the assignee finds it in My tasks, comments and finishes it, and can only give tasks to themselves", async ({
  browser,
}) => {
  const page = await signIn(browser);
  const errors = watchErrors(page);
  const task = await db.task.findFirstOrThrow({ where: { title: TASK } });
  await page.goto("/dashboard/tasks");
  await expect(page.getByTestId(`task-${task.number}`).first()).toBeVisible();
  await page.getByRole("link", { name: TASK }).first().click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/tasks/${task.id}$`));
  await page
    .locator('textarea[name="taskComment"]')
    .fill("On it, done by Thursday.");
  await page.getByTestId("task-comment-send").click();
  await expect(page.getByTestId("task-comments")).toContainText(
    "On it, done by Thursday.",
  );
  await selectOption(page.locator('select[name="taskStatusQuick"]'), "done");
  await expect(page.getByTestId("task-status").first()).toHaveText(
    copy.statuses.done,
  );
  await expect
    .poll(async () =>
      db.notification.count({
        where: {
          entityType: "task",
          entityId: task.id,
          messageKey: "tasks.notifications.done",
        },
      }),
    )
    .toBe(1);

  await page.goto("/dashboard/tasks");
  await page.getByTestId("task-new").first().click();
  const options = await page
    .getByTestId("task-form")
    .first()
    .locator('select[name="taskAssignee"] option')
    .count();
  expect(options).toBe(2);
  errors.assertClean();
  await page.context().close();
});
