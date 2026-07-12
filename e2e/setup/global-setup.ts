import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { E2E_TEST_USER } from "./testUser.mjs";

export const STORAGE_STATE_PATH = path.join(process.cwd(), "e2e", ".auth", "user.json");

export default async function globalSetup(config: FullConfig): Promise<void> {
  const [project] = config.projects;
  const baseURL = typeof project?.use.baseURL === "string" ? project.use.baseURL : undefined;

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(E2E_TEST_USER.email);
  await page.getByLabel("Contraseña").fill(E2E_TEST_USER.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("/");

  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
