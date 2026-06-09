import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { buildServer } from "../apps/orchestrator-api/src/index";
import {
  RegressionArtifactSchema,
  ScenarioRunSchema
} from "@failsafe/schemas";

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "fatal";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const port = Number(process.env.FAILSAFE_CLI_SMOKE_PORT ?? 4401);
const apiBaseUrl = `http://127.0.0.1:${port}`;
let app: Awaited<ReturnType<typeof buildServer>>;
const requireFromSmoke = createRequire(import.meta.url);
const tsxCliPath = requireFromSmoke.resolve("tsx/cli");

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<unknown>;
}

async function waitForRun(runId: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const run = ScenarioRunSchema.parse(await api(`/runs/${runId}`));

    if (run.status !== "queued" && run.status !== "running") {
      return run;
    }

    await delay(300);
  }

  throw new Error(`Timed out waiting for run ${runId}.`);
}

async function runCli(...args: string[]) {
  return new Promise<string>((resolve, reject) => {
    execFile(process.execPath, [tsxCliPath, "scripts/failsafe.ts", ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        FAILSAFE_API_BASE_URL: apiBaseUrl
      },
      timeout: 30_000
    }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `CLI command failed: ${args.join(" ")}\nstdout:\n${stdout}\nstderr:\n${stderr}`
          )
        );
        return;
      }

      resolve(stdout);
    });
  });
}

function extract(pattern: RegExp, value: string, label: string) {
  const match = value.match(pattern);

  if (!match?.[1]) {
    throw new Error(`Could not extract ${label} from:\n${value}`);
  }

  return match[1];
}

async function main() {
  app = await buildServer();
  await app.listen({ port, host: "127.0.0.1" });

  try {
  await api("/demo/reset", { body: "{}", method: "POST" });

  assert((await runCli("--help")).includes("FailSafe local CLI"), "Root help failed.");
  assert(
    (await runCli("foundry", "readiness")).includes("FailSafe Foundry readiness"),
    "Foundry readiness command failed."
  );
  const importOutput = await runCli("foundry", "import-sample");
  assert(
    importOutput.includes("reviewed Foundry manifest imported"),
    "Foundry import command failed."
  );
  const agentsOutput = await runCli("agents");
  const agentId = extract(/- (agent-import-[^\s|]+)/, agentsOutput, "agent id");

  const trustMapOutput = await runCli("agent", "trust-map", agentId);
  assert(
    trustMapOutput.includes("trust-boundary map"),
    "Agent trust-map command failed."
  );

  const foundryCrashOutput = await runCli(
    "agent",
    "crash-test",
    agentId,
    "pack-tool-poisoning"
  );
  const foundryRunId = extract(/Run ID: (run-[^\s]+)/, foundryCrashOutput, "Foundry run id");
  assert(
    foundryCrashOutput.includes("Foundry adapter safety"),
    "Agent crash-test safety statement missing."
  );
  assert(
    (await runCli("agent", "fixture-replay", agentId, "pack-tool-poisoning")).includes(
      "Foundry fixture replay complete"
    ),
    "Agent fixture replay command failed."
  );

  const evidenceImportOutput = await runCli("evidence", "import-sample");
  const evidenceId = extract(/- (evidence-[^\s|]+)/, evidenceImportOutput, "evidence id");
  assert(
    (await runCli("evidence", "list")).includes(evidenceId),
    "Evidence list did not include imported capture."
  );
  const evidenceCrashOutput = await runCli(
    "evidence",
    "crash-test",
    evidenceId,
    "pack-tool-poisoning"
  );
  const evidenceRunId = extract(/Run ID: (run-[^\s]+)/, evidenceCrashOutput, "evidence run id");

  const sampleRun = await waitForRun(
    ScenarioRunSchema.parse(
      await api("/runs/mock", {
        body: JSON.stringify({
          projectId: "project-vulnerable-agent",
          scenarioPackId: "pack-tool-poisoning",
          agentTargetId: "agent-invoice-reviewer"
        }),
        method: "POST"
      })
    ).id
  );
  const regression = RegressionArtifactSchema.parse(
    await api("/regressions/mock", {
      body: JSON.stringify({
        runId: sampleRun.id,
        findingIds: sampleRun.findings.map((finding) => finding.id),
        traceEventIds: sampleRun.trace.map((event) => event.id),
        name: "CLI smoke Sample Lab regression"
      }),
      method: "POST"
    })
  );

  assert((await runCli("runs")).includes("FailSafe runs"), "Runs command failed.");
  assert(
    (await runCli("regressions")).includes(regression.id),
    "Regressions command did not include seeded regression."
  );
  assert(
    (await runCli("replay", regression.id)).includes("Sample Lab replay complete"),
    "Replay command failed."
  );
  assert(
    (await runCli("sandbox", "plan", regression.id)).includes("reviewed sandbox plan"),
    "Sandbox plan command failed."
  );
  assert(
    (await runCli("sandbox", "fixture-replay", regression.id)).includes(
      "reviewed fixture replay complete"
    ),
    "Sandbox fixture replay command failed."
  );
  assert(
    (await runCli("runner", "preview")).includes("dry-run runner preview complete"),
    "Runner preview command failed."
  );
  assert(
    (await runCli("patch-coach", foundryRunId)).includes("Patch Coach plan ready"),
    "Patch Coach command failed."
  );
  assert(
    (await runCli("report", evidenceRunId)).includes("Safety Card exported"),
    "Report command failed."
  );
  assert((await runCli("reports")).includes("FailSafe Safety Cards"), "Reports command failed.");
  assert(
    (await runCli("reset-demo-data")).includes("FailSafe local evidence reset"),
    "Reset command failed."
  );

  console.log(
    [
      "FailSafe CLI smoke passed:",
      `api=${apiBaseUrl}`,
      `agent=${agentId}`,
      `foundryRun=${foundryRunId}`,
      `evidence=${evidenceId}`,
      `evidenceRun=${evidenceRunId}`,
      `regression=${regression.id}`
    ].join(" ")
  );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
