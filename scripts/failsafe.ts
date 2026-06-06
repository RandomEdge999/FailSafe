import {
  RegressionArtifactSchema,
  ScenarioRunSchema,
  type RegressionArtifact,
  type ScenarioRun
} from "@failsafe/schemas";

const apiBaseUrl =
  process.env.FAILSAFE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";
const pollDelayMs = 500;
const pollAttempts = 16;

class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

function printRootHelp() {
  console.log(`FailSafe mock CLI

Usage:
  pnpm failsafe --help
  pnpm failsafe regressions
  pnpm failsafe replay --help
  pnpm failsafe replay <regression-id>

Environment:
  FAILSAFE_API_BASE_URL  Override the mock API base URL. Default: http://localhost:4000

Safety:
  This CLI only calls the running FailSafe mock API. It does not execute tools,
  shell commands, file actions, live LLM calls, MCP servers, Copilot, email,
  databases, or external systems.

Limitations:
  Regression artifacts are in-memory inside the API process. Start the mock API
  with \`pnpm dev:api\` and replay IDs created in that same process.`);
}

function printReplayHelp() {
  console.log(`FailSafe mock replay

Usage:
  pnpm failsafe replay <regression-id>

Behavior:
  Calls POST /regressions/:id/replay-mock on the running mock API, then polls
  GET /runs/:id until the replay leaves queued/running.

Notes:
  Start the mock API with \`pnpm dev:api\`.
  This CLI only calls the mock API; it does not execute tools or shell commands.
  In-memory regressions disappear when the API process restarts.`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRunInProgress(run: ScenarioRun) {
  return run.status === "queued" || run.status === "running";
}

async function requestJson<T>(
  path: string,
  parse: (value: unknown) => T,
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers
      }
    });
  } catch (error) {
    throw new CliError(
      `FailSafe mock API is unavailable at ${apiBaseUrl}. Start the mock API with \`pnpm dev:api\`.\nThis CLI only calls the mock API; it does not execute tools or shell commands.`
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : `Mock API request failed with HTTP ${response.status}.`;

    throw new CliError(
      `${message}\nStart the mock API with \`pnpm dev:api\`.\nThis CLI only calls the mock API; it does not execute tools or shell commands.`
    );
  }

  return parse(payload);
}

async function listRegressions() {
  const regressions = await requestJson("/regressions", (value) =>
    RegressionArtifactSchema.array().parse(value)
  );

  if (regressions.length === 0) {
    console.log(
      "No in-memory mock regressions found. Create one in the Studio or through `POST /regressions/mock`."
    );
    return;
  }

  console.log(`In-memory mock regressions from ${apiBaseUrl}:`);

  for (const regression of regressions) {
    printRegressionLine(regression);
  }
}

function printRegressionLine(regression: RegressionArtifact) {
  console.log(
    [
      `- ${regression.id}`,
      `name="${regression.name}"`,
      `scenario=${regression.scenarioPackId}`,
      `replayable=${regression.mockReplayable ? "yes" : "no"}`,
      `created=${regression.createdAt}`
    ].join(" | ")
  );
}

async function pollRun(runId: string) {
  let latestRun = await requestJson(`/runs/${runId}`, (value) =>
    ScenarioRunSchema.parse(value)
  );

  for (
    let attempt = 0;
    attempt < pollAttempts && isRunInProgress(latestRun);
    attempt += 1
  ) {
    await delay(pollDelayMs);
    latestRun = await requestJson(`/runs/${runId}`, (value) =>
      ScenarioRunSchema.parse(value)
    );
  }

  if (isRunInProgress(latestRun)) {
    throw new CliError(
      `Timed out waiting for replay run ${runId} to finish mock lifecycle polling.`
    );
  }

  return latestRun;
}

async function replayRegression(regressionId: string | undefined) {
  if (!regressionId) {
    throw new CliError(
      "Missing regression ID. Run `pnpm failsafe replay --help` for usage."
    );
  }

  const createdRun = await requestJson(
    `/regressions/${encodeURIComponent(regressionId)}/replay-mock`,
    (value) => ScenarioRunSchema.parse(value),
    {
      body: "{}",
      method: "POST"
    }
  );
  const replayRun = await pollRun(createdRun.id);

  console.log("FailSafe mock replay complete");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Replay run ID: ${replayRun.id}`);
  console.log(`Status: ${replayRun.status}`);
  console.log(`Baseline run ID: ${replayRun.baselineRunId ?? "none"}`);
  console.log(`Scenario pack ID: ${replayRun.scenarioPackId}`);
  console.log(`Score: ${replayRun.score.overall}`);
  console.log(`Finding count: ${replayRun.findings.length}`);
  console.log(`Trace event count: ${replayRun.trace.length}`);
  console.log(
    "Mock replay only: no tools, shell commands, files, live LLMs, MCP servers, Copilot, email, databases, or external systems were executed."
  );
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printRootHelp();
    return;
  }

  if (command === "replay") {
    const [regressionId] = args;

    if (regressionId === "--help" || regressionId === "-h") {
      printReplayHelp();
      return;
    }

    await replayRegression(regressionId);
    return;
  }

  if (command === "regressions") {
    await listRegressions();
    return;
  }

  throw new CliError(`Unknown command: ${command}. Run \`pnpm failsafe --help\`.`);
}

main().catch((error: unknown) => {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = error.exitCode;
  } else {
    console.error(error);
    process.exitCode = 1;
  }
});
