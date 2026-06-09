import { chromium, type Page } from "@playwright/test";
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildServer } from "../apps/orchestrator-api/src/index";

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "fatal";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const apiPort = Number(process.env.FAILSAFE_STUDIO_API_PORT ?? 4300);
const webPort = Number(process.env.FAILSAFE_STUDIO_WEB_PORT ?? 4311);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const screenshotDir = join(process.cwd(), "docs", "assets", "screenshots");

mkdirSync(screenshotDir, { recursive: true });

let app: Awaited<ReturnType<typeof buildServer>>;

let web: ChildProcessWithoutNullStreams | undefined;

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function nextDevCommand() {
  const args = [
    "--filter",
    "@failsafe/studio-web",
    "exec",
    "next",
    "dev",
    "-p",
    String(webPort),
    "-H",
    "127.0.0.1"
  ];

  if (process.platform === "win32") {
    return {
      args: ["/d", "/s", "/c", ["pnpm", ...args].join(" ")],
      command: "cmd.exe"
    };
  }

  return { args, command: pnpmCommand() };
}

function stopChild(child: ChildProcessWithoutNullStreams | undefined) {
  if (!child?.pid) {
    return;
  }

  if (process.platform === "win32") {
    execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore"
    });
    return;
  }

  child.kill("SIGTERM");
}

async function waitForUrl(url: string, label: string) {
  let lastError = "";

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}: ${lastError}`);
}

async function click(page: Page, name: RegExp | string) {
  await page.getByRole("button", { name, exact: typeof name === "string" }).click();
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: join(screenshotDir, name)
  });
}

async function main() {
  app = await buildServer();
  await app.listen({ port: apiPort, host: "127.0.0.1" });

  try {
  await fetch(`${apiBaseUrl}/demo/reset`, {
    body: "{}",
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  const nextDev = nextDevCommand();

  web = spawn(nextDev.command, nextDev.args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_API_BASE_URL: apiBaseUrl
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

  let webLog = "";
  web.stdout.on("data", (chunk) => {
    webLog += chunk.toString();
  });
  web.stderr.on("data", (chunk) => {
    webLog += chunk.toString();
  });

  await waitForUrl(`${webBaseUrl}/`, "Studio web");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  try {
    await page.goto(webBaseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "FailSafe" }).waitFor();
    await page.getByRole("heading", { name: "Evidence-first crash testing" }).waitFor();

    await page.keyboard.press("Tab");
    const focusTag = await page.evaluate(() => document.activeElement?.tagName);
    assert(
      focusTag === "BUTTON" || focusTag === "A",
      "Keyboard focus did not land on an interactive control."
    );

    await click(page, "Import manifest");
    await page.getByText("Foundry Invoice Review Agent").first().waitFor();
    await click(page, "Load recorded evidence");
    await page.getByText(/handling untrusted MCP metadata/).waitFor();

    await screenshot(page, "dashboard.png");
    await screenshot(page, "foundry-operations.png");
    await screenshot(page, "evidence-readiness.png");
    await screenshot(page, "agent-trust-map.png");

    await click(page, "Crash-test evidence");
    await page.getByText("Crash timeline").waitFor();
    await page.getByText("Recorded agent evidence needs runtime guardrail review").first().waitFor();
    await screenshot(page, "crash-test-result.png");
    await screenshot(page, "timeline-finding-detail.png");

    await click(page, "Fix with Copilot");
    await page.getByRole("heading", { name: "Prompt handoff preview" }).waitFor();
    await screenshot(page, "patch-coach.png");

    await click(page, "Save Regression");
    await page.getByText("Saved artifacts").waitFor();
    await click(page, "Fixture Replay");
    await page.getByText("Baseline vs replay").waitFor();
    await screenshot(page, "fixture-replay-comparison.png");

    await click(page, "Safety card");
    await click(page, "Export Safety Card");
    await page.getByText("App-owned export path").waitFor();
    await screenshot(page, "safety-card.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(webBaseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "FailSafe" }).waitFor();
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert(mobileOverflow <= 2, `Mobile layout has horizontal overflow: ${mobileOverflow}px.`);
  } finally {
    await browser.close();
  }

  console.log(
    [
      "FailSafe Studio smoke passed:",
      `web=${webBaseUrl}`,
      `api=${apiBaseUrl}`,
      "screenshots=dashboard.png,timeline-finding-detail.png,patch-coach.png,fixture-replay-comparison.png,safety-card.png,foundry-operations.png,agent-trust-map.png,evidence-readiness.png,crash-test-result.png",
      `nextLogBytes=${webLog.length}`
    ].join(" ")
  );
  } finally {
    stopChild(web);
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
