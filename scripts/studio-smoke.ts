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

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    bodyHeight: document.body.scrollHeight,
    bodyWidth: document.body.scrollWidth,
    clientHeight: document.documentElement.clientHeight,
    clientWidth: document.documentElement.clientWidth,
    htmlHeight: document.documentElement.scrollHeight,
    htmlWidth: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth
  }));

  assert(
    metrics.htmlWidth - metrics.clientWidth <= 2 &&
      metrics.bodyWidth - metrics.clientWidth <= 2,
    `${label} has horizontal overflow: ${JSON.stringify(metrics)}.`
  );
}

async function assertNoUnexpectedHiddenClipping(page: Page, label: string) {
  const offenders = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("body *"))
      .map((node) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const className =
          typeof element.className === "string" ? element.className : "";
        const deltaX = element.scrollWidth - element.clientWidth;
        const deltaY = element.scrollHeight - element.clientHeight;
        const hiddenX = style.overflowX === "hidden" && deltaX > 10;
        const hiddenY = style.overflowY === "hidden" && deltaY > 10;

        if (!hiddenX && !hiddenY) {
          return null;
        }
        if (rect.width < 8 || rect.height < 8) {
          return null;
        }
        if (element.closest("[data-allow-overflow], [data-scroll-pane]")) {
          return null;
        }
        if (element.getAttribute("aria-hidden") === "true") {
          return null;
        }
        if (["IMG", "SVG", "PATH"].includes(element.tagName)) {
          return null;
        }
        if (
          className.includes("truncate") ||
          className.includes("line-clamp") ||
          className.includes("rounded-full bg-[#e6edf5]")
        ) {
          return null;
        }

        return {
          className: className.slice(0, 140),
          deltaX,
          deltaY,
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 120) ?? ""
        };
      })
      .filter(Boolean)
      .slice(0, 8);
  });

  assert(
    offenders.length === 0,
    `${label} has clipped hidden content: ${JSON.stringify(offenders, null, 2)}.`
  );
}

async function assertTimelineGeometry(page: Page, label: string) {
  const overlaps = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-testid='timeline-item']"))
      .map((item) => {
        const timeElement = item.querySelector("[data-testid='timeline-time']");
        const dotElement = item.querySelector("[data-testid='timeline-dot']");
        const cardElement = item.querySelector("[data-testid='timeline-card']");
        if (!timeElement || !dotElement || !cardElement) {
          return { reason: "missing timeline geometry node" };
        }

        const timeRect = timeElement.getBoundingClientRect();
        const dotRect = dotElement.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();
        const time = {
          bottom: timeRect.bottom,
          left: timeRect.left,
          right: timeRect.right,
          top: timeRect.top
        };
        const dot = {
          bottom: dotRect.bottom,
          left: dotRect.left,
          right: dotRect.right,
          top: dotRect.top
        };
        const card = {
          bottom: cardRect.bottom,
          left: cardRect.left,
          right: cardRect.right,
          top: cardRect.top
        };

        const timeHitsDot =
          time.right > dot.left - 2 &&
          time.left < dot.right + 2 &&
          time.bottom > dot.top - 2 &&
          time.top < dot.bottom + 2;
        const cardHitsDot =
          card.left < dot.right + 8 &&
          card.bottom > dot.top &&
          card.top < dot.bottom;

        return timeHitsDot || cardHitsDot
          ? { card, cardHitsDot, dot, time, timeHitsDot }
          : null;
      })
      .filter(Boolean)
      .slice(0, 5);
  });

  assert(
    overlaps.length === 0,
    `${label} has timeline timestamp/dot/card overlap: ${JSON.stringify(overlaps)}.`
  );
}

async function assertInspectorReachable(page: Page, label: string) {
  const metrics = await page
    .locator("[data-testid='risk-inspector-scroll']")
    .evaluate((node) => {
      const element = node as HTMLElement;
      const style = window.getComputedStyle(element);
      const before = element.scrollTop;
      element.scrollTop = element.scrollHeight;
      const after = element.scrollTop;
      element.scrollTop = before;

      return {
        after,
        clientHeight: element.clientHeight,
        overflowY: style.overflowY,
        scrollHeight: element.scrollHeight
      };
    });

  if (metrics.scrollHeight <= metrics.clientHeight + 2) {
    return;
  }

  assert(
    (metrics.overflowY === "auto" || metrics.overflowY === "scroll") &&
      metrics.after > 0,
    `${label} inspector content is clipped instead of scrollable: ${JSON.stringify(metrics)}.`
  );
}

async function assertGeneratedAssetVisible(page: Page, fileName: string) {
  await page.waitForFunction(
    (name) => {
      const images = Array.from(document.querySelectorAll("img"));
      return images.some((img) => {
        const image = img as HTMLImageElement;
        const source = image.currentSrc || image.src || "";
        const box = image.getBoundingClientRect();
        return (
          source.includes(name) &&
          image.complete &&
          image.naturalWidth > 0 &&
          box.width > 20 &&
          box.height > 20
        );
      });
    },
    fileName,
    { timeout: 10_000 }
  );
}

async function assertNoPrimaryOverlap(page: Page, label: string) {
  const boxes = await page.evaluate(() => {
    const header = document.querySelector("header")?.getBoundingClientRect();
    const workspace = document.querySelector("section")?.getBoundingClientRect();
    return {
      header: header
        ? { bottom: header.bottom, left: header.left, right: header.right, top: header.top }
        : null,
      workspace: workspace
        ? { bottom: workspace.bottom, left: workspace.left, right: workspace.right, top: workspace.top }
        : null
    };
  });

  assert(boxes.header && boxes.workspace, `${label} missing primary layout boxes.`);
  assert(
    boxes.workspace.top >= boxes.header.bottom - 1,
    `${label} workspace overlaps header: ${JSON.stringify(boxes)}.`
  );
}

async function openStudioView(
  page: Page,
  label: string,
  viewportWidth: number
) {
  if (viewportWidth < 1280) {
    await page.getByLabel("Open navigation").click();
  }

  await page.getByRole("button", { name: label, exact: true }).click();

  if (viewportWidth < 1280) {
    await page.getByLabel("Close panel").waitFor({ state: "detached" });
  }
}

async function assertReferenceTab(
  page: Page,
  label: string,
  viewportWidth: number
) {
  await assertNoHorizontalOverflow(page, label);
  await assertNoUnexpectedHiddenClipping(page, label);
  await assertNoPrimaryOverlap(page, label);

  if (label.includes("crash")) {
    await assertTimelineGeometry(page, label);
  }

  if (viewportWidth >= 1280) {
    await assertInspectorReachable(page, label);
  }
}

async function captureReferenceSet(
  page: Page,
  viewport: { width: number; height: number }
) {
  const suffix = `${viewport.width}x${viewport.height}`;
  await page.setViewportSize(viewport);
  await page.goto(webBaseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "FailSafe" }).waitFor();

  await openStudioView(page, "Foundry evidence", viewport.width);
  await page.getByRole("heading", { name: "Evidence-first crash testing" }).waitFor();
  await assertReferenceTab(page, `foundry ${suffix}`, viewport.width);
  if (viewport.width >= 768) {
    await assertGeneratedAssetVisible(page, "evidence-shield-platform.png");
  }
  await screenshot(page, `reference-foundry-evidence-${suffix}.png`);
  if (viewport.width === 1448 && viewport.height === 1086) {
    await screenshot(page, "reference-foundry-evidence.png");
  }

  await openStudioView(page, "Crash test", viewport.width);
  await page.getByText("Crash timeline").waitFor();
  await assertReferenceTab(page, `crash ${suffix}`, viewport.width);
  await screenshot(page, `reference-crash-test-${suffix}.png`);
  if (viewport.width === 1448 && viewport.height === 1086) {
    await screenshot(page, "reference-crash-test.png");
  }

  await openStudioView(page, "Patch and regression", viewport.width);
  await page.getByRole("heading", { name: "Root-cause cards" }).waitFor();
  await assertReferenceTab(page, `patch ${suffix}`, viewport.width);
  await screenshot(page, `reference-patch-regression-${suffix}.png`);
  if (viewport.width === 1448 && viewport.height === 1086) {
    await screenshot(page, "reference-patch-regression.png");
  }

  await openStudioView(page, "Safety card", viewport.width);
  await page.getByRole("heading", { name: "Runner readiness" }).waitFor();
  await assertReferenceTab(page, `safety ${suffix}`, viewport.width);
  if (viewport.width >= 768) {
    await assertGeneratedAssetVisible(page, "runner-readiness-platform.png");
  }
  await screenshot(page, `reference-safety-card-${suffix}.png`);
  if (viewport.width === 1448 && viewport.height === 1086) {
    await screenshot(page, "reference-safety-card.png");
  }
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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    await page.goto(webBaseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "FailSafe" }).waitFor();
    await page.getByRole("heading", { name: "Evidence-first crash testing" }).waitFor();
    await assertNoHorizontalOverflow(page, "foundry initial");
    await assertNoUnexpectedHiddenClipping(page, "foundry initial");
    await assertNoPrimaryOverlap(page, "foundry initial");
    await assertGeneratedAssetVisible(page, "evidence-shield-platform.png");

    await page.keyboard.press("Tab");
    const focusTag = await page.evaluate(() => document.activeElement?.tagName);
    assert(
      focusTag === "BUTTON" || focusTag === "A",
      "Keyboard focus did not land on an interactive control."
    );

    await click(page, "Expand library");
    await page.getByText("reviewed defensive packs").waitFor();
    await page.getByLabel("Close scenario library").click();

    await click(page, "Use example manifest");
    await page.getByText("Foundry Invoice Review Agent").first().waitFor();
    await click(page, "Use example evidence");
    await page.getByText(/handling untrusted MCP metadata/).waitFor();
    await click(page, "Crash-test manifest");
    await page.getByText("Crash timeline").waitFor();

    await fetch(`${apiBaseUrl}/demo/reset`, {
      body: "{}",
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    await page.goto(webBaseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Evidence-first crash testing" }).waitFor();

    await page
      .getByLabel("Import reviewed Foundry manifest JSON")
      .setInputFiles(join(process.cwd(), "examples", "foundry-manifests", "invoice-review-agent.json"));
    await page.getByText("Foundry Invoice Review Agent").first().waitFor();
    await page
      .getByLabel("Import reviewed recorded evidence JSON")
      .setInputFiles(join(process.cwd(), "examples", "foundry-evidence", "invoice-review-recording.json"));
    await page.getByText(/handling untrusted MCP metadata/).waitFor();

    await openStudioView(page, "Crash test", 1920);
    await page.getByRole("heading", { name: "No crash trace loaded" }).waitFor();
    await click(page, "Run Crash Test");
    await page.getByText("Crash timeline").waitFor();
    await page.getByText("Recorded agent evidence needs runtime guardrail review").first().waitFor();
    await assertNoHorizontalOverflow(page, "crash timeline");
    await assertNoUnexpectedHiddenClipping(page, "crash timeline");
    await assertTimelineGeometry(page, "crash timeline");
    await assertInspectorReachable(page, "crash timeline");
    const download = page.waitForEvent("download");
    await click(page, "Export timeline");
    await download;

    await click(page, "Fix with Copilot");
    await page.getByRole("heading", { name: "Root-cause cards" }).waitFor();
    await page.getByText("Prompt file recommendation").waitFor();
    await assertNoHorizontalOverflow(page, "patch and regression");
    await assertNoUnexpectedHiddenClipping(page, "patch and regression");
    await click(page, /Prompt handoffs/);
    await page.getByText(/Recommended prompt file:/).waitFor();
    await click(page, /Fix drafts/);
    await page.getByText("Patch Coach draft plan").waitFor();
    await click(page, /Regression cases/);

    await click(page, "Save Regression");
    await page.getByText("Saved artifacts").waitFor();
    await click(page, "Fixture Replay");
    await page.getByText("Baseline vs replay").waitFor();
    await page.getByRole("heading", { name: "Runner readiness" }).waitFor();
    await assertGeneratedAssetVisible(page, "runner-readiness-platform.png");

    await page.getByRole("button", { name: "Export Safety Card" }).first().click();
    await page.getByText("Preview (Markdown)").waitFor();
    await assertNoHorizontalOverflow(page, "safety card");
    await assertNoUnexpectedHiddenClipping(page, "safety card");

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1448, height: 1086 },
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
      { width: 430, height: 932 }
    ]) {
      await captureReferenceSet(page, viewport);
    }
  } finally {
    await browser.close();
  }

  console.log(
    [
      "FailSafe Studio smoke passed:",
      `web=${webBaseUrl}`,
      `api=${apiBaseUrl}`,
      "screenshots=reference-* at 1920x1080,1448x1086,1366x768,390x844,430x932",
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
