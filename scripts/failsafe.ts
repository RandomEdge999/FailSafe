import {
  FixtureReplayResultSchema,
  FoundryAgentImportSchema,
  FoundryReadinessResultSchema,
  EvidenceCrashTestResponseSchema,
  AgentEvidenceCaptureSchema,
  AgentTrustBoundaryMapSchema,
  PatchCoachPlanSchema,
  RegressionArtifactSchema,
  RunnerDryRunResultSchema,
  SafetyReportSchema,
  SandboxReplayPlanSchema,
  ScenarioRunSchema,
  type FixtureReplayResult,
  type FoundryAgentImport,
  type FoundryReadinessResult,
  type EvidenceCrashTestResponse,
  type AgentEvidenceCapture,
  type AgentTrustBoundaryMap,
  type PatchCoachPlan,
  type RegressionArtifact,
  type RunnerDryRunResult,
  type SafetyReport,
  type SandboxReplayPlan,
  type ScenarioRun
} from "@failsafe/schemas";
import { sampleAgentEvidence } from "../apps/orchestrator-api/src/data/sample-agent-evidence";

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
  console.log(`FailSafe local CLI

Usage:
  pnpm failsafe --help
  pnpm failsafe runs
  pnpm failsafe regressions
  pnpm failsafe replay --help
  pnpm failsafe replay <regression-id>
  pnpm failsafe patch-coach <run-id> [finding-id]
  pnpm failsafe report <run-id>
  pnpm failsafe reports
  pnpm failsafe foundry --help
  pnpm failsafe foundry readiness
  pnpm failsafe foundry import-sample
  pnpm failsafe evidence --help
  pnpm failsafe evidence import-sample
  pnpm failsafe evidence list
  pnpm failsafe evidence crash-test <evidence-id> [scenario-pack-id]
  pnpm failsafe agents
  pnpm failsafe agent --help
  pnpm failsafe agent trust-map <agent-id>
  pnpm failsafe agent crash-test <agent-id> [scenario-pack-id]
  pnpm failsafe agent fixture-replay <agent-id> [scenario-pack-id]
  pnpm failsafe runner --help
  pnpm failsafe runner preview
  pnpm failsafe sandbox --help
  pnpm failsafe sandbox plan <regression-id>
  pnpm failsafe sandbox fixture-replay <regression-id>
  pnpm failsafe reset-demo-data

Environment:
  FAILSAFE_API_BASE_URL  Override the local API base URL. Default: http://localhost:4000

Safety:
  This CLI only calls the running FailSafe local API. It does not execute tools,
  shell commands, file actions, live LLM calls, MCP servers, Copilot, email,
  databases, or external systems.

Limitations:
  Runs, regressions, reviewed fixture replay results, and Safety Cards are
  stored in the local app-owned .failsafe-data folder. Start the API with
  \`pnpm dev:api\` before running commands that call endpoints.`);
}

function printEvidenceHelp() {
  console.log(`FailSafe recorded agent evidence

Usage:
  pnpm failsafe evidence import-sample
  pnpm failsafe evidence list
  pnpm failsafe evidence crash-test <evidence-id> [scenario-pack-id]

Behavior:
  Imports reviewed JSON-body evidence, lists local captures, or runs a local
  crash test over recorded evidence. No client paths, URLs, shell commands,
  credentials, live Foundry calls, live tools, MCP servers, model calls, email,
  databases, or external systems are accepted or executed.`);
}

function printFoundryHelp() {
  console.log(`FailSafe Microsoft Foundry adapter

Usage:
  pnpm failsafe foundry readiness
  pnpm failsafe foundry import-sample

Behavior:
  Checks opt-in Foundry environment readiness or imports the app-owned reviewed
  Foundry-style agent manifest. No credentials are accepted in command args and
  no live tools, MCP servers, shell commands, arbitrary files, email, databases,
  or external targets are executed.`);
}

function printAgentHelp() {
  console.log(`FailSafe agent crash testing

Usage:
  pnpm failsafe agents
  pnpm failsafe agent trust-map <agent-id>
  pnpm failsafe agent crash-test <agent-id> [scenario-pack-id]
  pnpm failsafe agent fixture-replay <agent-id> [scenario-pack-id]

Behavior:
  Uses imported reviewed Foundry manifests and app-owned fixture replay only.
  Start the API with \`pnpm dev:api\` and run
  \`pnpm failsafe foundry import-sample\` first if no agents are listed.`);
}

function printReplayHelp() {
  console.log(`FailSafe Sample Lab replay

Usage:
  pnpm failsafe replay <regression-id>

Behavior:
  Calls POST /regressions/:id/replay-mock on the running local API, then polls
  GET /runs/:id until the replay leaves queued/running.

Notes:
  Start the local API with \`pnpm dev:api\`.
  This CLI only calls the local API; it does not execute tools, shell commands,
  file actions, network calls, MCP servers, model calls, email, databases, or
  external systems.
  Regression artifacts are stored in the local app-owned .failsafe-data store.`);
}

function printRunnerHelp() {
  console.log(`FailSafe dry-run runner preview

Usage:
  pnpm failsafe runner preview

Behavior:
  Calls POST /runner/dry-run on the running local API with a synthetic action
  list, then prints deny-by-default policy decisions.

Notes:
  Start the local API with \`pnpm dev:api\`.
  This is a policy preview only. It does not execute tools, shell commands,
  file actions, network calls, MCP servers, model calls, email, databases, or
  external systems.`);
}

function printSandboxHelp() {
  console.log(`FailSafe reviewed sandbox plan

Usage:
  pnpm failsafe sandbox plan <regression-id>
  pnpm failsafe sandbox fixture-replay <regression-id>

Behavior:
  Calls sandbox planning or reviewed fixture-only replay endpoints on the
  running local API.

Notes:
  Start the local API with \`pnpm dev:api\`.
  Fixture replay uses reviewed synthetic fixtures only. It does not accept
  client paths, URLs, shell commands, tool names, network calls, MCP servers,
  model calls, email, databases, or live targets.`);
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
      `FailSafe local API is unavailable at ${apiBaseUrl}. Start the local API with \`pnpm dev:api\`.\nThis CLI only calls the local API; it does not execute tools, shell commands, file actions, network calls, MCP servers, model calls, email, databases, or external systems.`
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
        : `Local API request failed with HTTP ${response.status}.`;

    throw new CliError(
      `${message}\nStart the local API with \`pnpm dev:api\`.\nThis CLI only calls the FailSafe API; it does not execute tools, shell commands, file actions, network calls, MCP servers, model calls, email, databases, or external systems.`
    );
  }

  return parse(payload);
}

function printFoundryReadiness(readiness: FoundryReadinessResult) {
  console.log("FailSafe Foundry readiness");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Configured: ${readiness.configured}`);
  console.log(`Mode: ${readiness.mode}`);
  console.log(`Configured env: ${formatList(readiness.configuredEnv)}`);
  console.log(`Missing env: ${formatList(readiness.missingEnv)}`);
  console.log(`Allowed operations: ${formatList(readiness.allowedOperations)}`);
  console.log(`Blocked operations: ${formatList(readiness.blockedOperations)}`);
  console.log(`Safety: ${readiness.safetyStatement}`);
}

async function foundryReadinessCommand() {
  const readiness = await requestJson("/foundry/readiness", (value) =>
    FoundryReadinessResultSchema.parse(value)
  );

  printFoundryReadiness(readiness);
}

function printFoundryAgent(agent: FoundryAgentImport) {
  console.log(
    [
      `- ${agent.id}`,
      `name="${agent.manifest.name}"`,
      `mode=${agent.mode}`,
      `model=${agent.manifest.model.family}`,
      `tools=${agent.manifest.tools.length}`,
      `imported=${agent.importedAt}`
    ].join(" | ")
  );
}

function printEvidenceCapture(capture: AgentEvidenceCapture) {
  console.log(
    [
      `- ${capture.id}`,
      `agent="${capture.agentName}"`,
      `mode=recorded_agent_evidence`,
      `review=${capture.review.status}`,
      `messages=${capture.messages.length}`,
      `tools=${capture.toolIntents.length}`,
      `imported=${capture.importedAt}`
    ].join(" | ")
  );
}

async function importEvidenceSampleCommand() {
  const capture = await requestJson(
    "/foundry/evidence/import",
    (value) => AgentEvidenceCaptureSchema.parse(value),
    {
      body: JSON.stringify(sampleAgentEvidence),
      method: "POST"
    }
  );

  console.log("FailSafe reviewed recorded evidence imported");
  console.log(`API base URL: ${apiBaseUrl}`);
  printEvidenceCapture(capture);
  console.log(
    "Recorded evidence import only: no credentials, paths, URLs, network calls, live tools, MCP execution, shell commands, arbitrary files, email, or databases were used."
  );
}

async function listEvidenceCommand() {
  const captures = await requestJson("/foundry/evidence", (value) =>
    AgentEvidenceCaptureSchema.array().parse(value)
  );

  if (captures.length === 0) {
    console.log(
      "No recorded agent evidence imported. Run `pnpm failsafe evidence import-sample`."
    );
    return;
  }

  console.log(`FailSafe recorded evidence captures from ${apiBaseUrl}:`);

  for (const capture of captures) {
    printEvidenceCapture(capture);
  }
}

function printEvidenceCrashTest(response: EvidenceCrashTestResponse) {
  console.log("FailSafe recorded evidence crash test complete");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Evidence ID: ${response.result.evidenceId}`);
  console.log(`Run ID: ${response.run.id}`);
  console.log(`Mode: ${response.result.mode}`);
  console.log(`Status: ${response.run.status}`);
  console.log(`Scenario pack ID: ${response.run.scenarioPackId}`);
  console.log(`Score: ${response.run.score.overall}`);
  console.log(`Finding count: ${response.run.findings.length}`);
  console.log(`Trace event count: ${response.run.trace.length}`);
  console.log(`Safety: ${response.result.safetyStatement}`);
}

async function evidenceCrashTestCommand(
  evidenceId: string | undefined,
  scenarioPackId: string | undefined
) {
  if (!evidenceId) {
    throw new CliError(
      "Missing evidence ID. Run `pnpm failsafe evidence --help` for usage."
    );
  }

  const response = await requestJson(
    `/foundry/evidence/${encodeURIComponent(evidenceId)}/crash-test`,
    (value) => EvidenceCrashTestResponseSchema.parse(value),
    {
      body: JSON.stringify({ scenarioPackId }),
      method: "POST"
    }
  );

  printEvidenceCrashTest(response);
}

async function importFoundrySampleCommand() {
  const agent = await requestJson(
    "/foundry/manifest/import",
    (value) => FoundryAgentImportSchema.parse(value),
    {
      body: JSON.stringify({ source: "sample" }),
      method: "POST"
    }
  );

  console.log("FailSafe reviewed Foundry manifest imported");
  console.log(`API base URL: ${apiBaseUrl}`);
  printFoundryAgent(agent);
  console.log(
    "Manifest import only: no credentials, network calls, live tools, MCP execution, shell commands, arbitrary files, email, or databases were used."
  );
}

async function listAgentsCommand() {
  const agents = await requestJson("/agents", (value) =>
    FoundryAgentImportSchema.array().parse(value)
  );

  if (agents.length === 0) {
    console.log(
      "No reviewed Foundry agents imported. Run `pnpm failsafe foundry import-sample`."
    );
    return;
  }

  console.log(`FailSafe imported agents from ${apiBaseUrl}:`);

  for (const agent of agents) {
    printFoundryAgent(agent);
  }
}

function printTrustMap(map: AgentTrustBoundaryMap) {
  console.log("FailSafe agent trust-boundary map");
  console.log(`Agent: ${map.agentName}`);
  console.log(`Mode: ${map.executionMode}`);
  console.log(`Boundaries: ${map.boundaries.length}`);

  for (const boundary of map.boundaries) {
    console.log(
      `- ${boundary.label} | ${boundary.category} | risk=${boundary.riskLevel} | reviewed=${boundary.reviewed}`
    );
  }

  console.log(`Safety: ${map.safetyStatement}`);
}

async function agentTrustMapCommand(agentId: string | undefined) {
  if (!agentId) {
    throw new CliError(
      "Missing agent ID. Run `pnpm failsafe agent --help` for usage."
    );
  }

  const map = await requestJson(
    `/agents/${encodeURIComponent(agentId)}/trust-map`,
    (value) => AgentTrustBoundaryMapSchema.parse(value)
  );

  printTrustMap(map);
}

async function agentCrashTestCommand(
  agentId: string | undefined,
  scenarioPackId: string | undefined,
  fixtureReplay: boolean
) {
  if (!agentId) {
    throw new CliError(
      "Missing agent ID. Run `pnpm failsafe agent --help` for usage."
    );
  }

  const run = await requestJson(
    `/agents/${encodeURIComponent(agentId)}/${fixtureReplay ? "fixture-replay" : "crash-test"}`,
    (value) => ScenarioRunSchema.parse(value),
    {
      body: JSON.stringify({ scenarioPackId }),
      method: "POST"
    }
  );

  console.log(
    fixtureReplay
      ? "FailSafe Foundry fixture replay complete"
      : "FailSafe Foundry crash test complete"
  );
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Run ID: ${run.id}`);
  console.log(`Status: ${run.status}`);
  console.log(`Scenario pack ID: ${run.scenarioPackId}`);
  console.log(`Score: ${run.score.overall}`);
  console.log(`Finding count: ${run.findings.length}`);
  console.log(`Trace event count: ${run.trace.length}`);
  console.log(
    "Foundry adapter safety: no live tools, MCP servers, shell commands, arbitrary files, email, databases, or external targets were executed."
  );
}

async function listRegressions() {
  const regressions = await requestJson("/regressions", (value) =>
    RegressionArtifactSchema.array().parse(value)
  );

  if (regressions.length === 0) {
    console.log(
      "No local Sample Lab regressions found. Create one in the Studio or through the compatibility `POST /regressions/mock` route."
    );
    return;
  }

  console.log(`Local persisted regressions from ${apiBaseUrl}:`);

  for (const regression of regressions) {
    printRegressionLine(regression);
  }
}

async function listRunsCommand() {
  const runs = await requestJson("/runs", (value) =>
    ScenarioRunSchema.array().parse(value)
  );

  console.log(`FailSafe runs from ${apiBaseUrl}:`);

  for (const run of runs) {
    console.log(
      [
        `- ${run.id}`,
        `status=${run.status}`,
        `scenario=${run.scenarioPackId}`,
        `score=${run.score.overall}`,
        `findings=${run.findings.length}`,
        `baseline=${run.baselineRunId ?? "none"}`
      ].join(" | ")
    );
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

function printFixtureReplayResult(result: FixtureReplayResult) {
  console.log("FailSafe reviewed fixture replay complete");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Result ID: ${result.id}`);
  console.log(`Replay run ID: ${result.replayRun.id}`);
  console.log(`Regression ID: ${result.regressionId}`);
  console.log(`Plan ID: ${result.planId}`);
  console.log(`Review status: ${result.reviewStatus}`);
  console.log(`Replay status: ${result.replayRun.status}`);
  console.log(`Replay score: ${result.replayRun.score.overall}`);
  console.log(`Finding count: ${result.replayRun.findings.length}`);
  console.log(`Score delta: ${result.comparison.scoreDelta}`);
  console.log(`Missing expected trace types: ${formatList(result.comparison.missingExpectedTraceEventTypes)}`);
  console.log(`Allowed fixture IDs: ${formatList(result.allowedFixtureIds)}`);
  console.log(`Safety statement: ${result.safetyStatement}`);
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
      `Timed out waiting for replay run ${runId} to finish local lifecycle polling.`
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

  console.log("FailSafe Sample Lab replay complete");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Replay run ID: ${replayRun.id}`);
  console.log(`Status: ${replayRun.status}`);
  console.log(`Baseline run ID: ${replayRun.baselineRunId ?? "none"}`);
  console.log(`Scenario pack ID: ${replayRun.scenarioPackId}`);
  console.log(`Score: ${replayRun.score.overall}`);
  console.log(`Finding count: ${replayRun.findings.length}`);
  console.log(`Trace event count: ${replayRun.trace.length}`);
  console.log(
    "Sample Lab replay only: no tools, shell commands, files, live LLMs, MCP servers, Copilot, email, databases, or external systems were executed."
  );
}

function runnerPreviewPayload() {
  return {
    projectId: "project-vulnerable-agent",
    scenarioPackId: "pack-tool-poisoning",
    actions: [
      {
        id: "cli-preview-read-synthetic-invoice",
        kind: "file_read",
        label: "Read synthetic invoice fixture",
        target: "synthetic:invoice-fixture",
        risk: "low",
        synthetic: true
      },
      {
        id: "cli-preview-write-report",
        kind: "file_write",
        label: "Write generated report",
        target: "workspace:report.md",
        risk: "high",
        synthetic: true
      },
      {
        id: "cli-preview-shell-command",
        kind: "shell_command",
        label: "Run package script",
        target: "shell:pnpm test",
        risk: "high"
      },
      {
        id: "cli-preview-network",
        kind: "network_request",
        label: "Call external endpoint",
        target: "https://example.invalid",
        risk: "high"
      },
      {
        id: "cli-preview-mcp",
        kind: "mcp_tool_call",
        label: "Call MCP invoice lookup",
        target: "mcp:invoice-tools.lookup",
        risk: "high"
      },
      {
        id: "cli-preview-model",
        kind: "model_call",
        label: "Call hosted model",
        target: "model:gpt-preview",
        risk: "high"
      }
    ]
  };
}

function printRunnerPreview(result: RunnerDryRunResult) {
  console.log("FailSafe dry-run runner preview complete");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Mode: ${result.mode}`);
  console.log(`Executed: ${result.executed}`);
  console.log(`Dry-run only: ${result.dryRunOnly}`);
  console.log(`Blocked actions: ${result.blockedActionCount}`);
  console.log(`Requires approval: ${result.requiresApprovalCount}`);
  console.log(`Not implemented: ${result.notImplementedCount}`);
  console.log("Decisions:");

  for (const decision of result.decisions) {
    console.log(
      `- ${decision.actionKind} | ${decision.decision} | ${decision.actionLabel} | ${decision.reason}`
    );
  }

  console.log(
    "Policy preview only: no tools, shell commands, files, network requests, MCP servers, model calls, email, databases, or external systems were executed."
  );
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none";
}

function printSandboxPlan(plan: SandboxReplayPlan) {
  console.log("FailSafe reviewed sandbox plan created");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Plan ID: ${plan.id}`);
  console.log(`Review status: ${plan.reviewStatus}`);
  console.log(`Mode: ${plan.mode}`);
  console.log(`Regression ID: ${plan.regressionId}`);
  console.log(`Baseline run ID: ${plan.baselineRunId}`);
  console.log(`Allowed fixture IDs: ${formatList(plan.allowedFixtureIds)}`);
  console.log(`Blocked capabilities: ${formatList(plan.blockedCapabilities)}`);
  console.log(
    `Not-implemented capabilities: ${formatList(plan.notImplementedCapabilities)}`
  );
  console.log(`Safety statement: ${plan.safetyStatement}`);
  console.log(
    "This command creates a reviewed plan only. It does not execute tools, shell commands, file actions, network calls, MCP servers, model calls, email, databases, or external systems."
  );
}

async function createSandboxReplayPlan(regressionId: string | undefined) {
  if (!regressionId) {
    throw new CliError(
      "Missing regression ID. Run `pnpm failsafe sandbox --help` for usage."
    );
  }

  const plan = await requestJson(
    `/regressions/${encodeURIComponent(regressionId)}/sandbox-plan`,
    (value) => SandboxReplayPlanSchema.parse(value),
    {
      body: "{}",
      method: "POST"
    }
  );

  printSandboxPlan(plan);
}

async function replayFixtureRegression(regressionId: string | undefined) {
  if (!regressionId) {
    throw new CliError(
      "Missing regression ID. Run `pnpm failsafe sandbox --help` for usage."
    );
  }

  const result = await requestJson(
    `/regressions/${encodeURIComponent(regressionId)}/fixture-replay`,
    (value) => FixtureReplayResultSchema.parse(value),
    {
      body: "{}",
      method: "POST"
    }
  );

  printFixtureReplayResult(result);
}

function printPatchCoachPlan(plan: PatchCoachPlan) {
  console.log("FailSafe Patch Coach plan ready");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Plan ID: ${plan.id}`);
  console.log(`Run ID: ${plan.runId}`);
  console.log(`Finding ID: ${plan.findingId}`);
  console.log(`Mode: ${plan.mode}`);
  console.log(`Summary: ${plan.summary}`);
  console.log("Mitigation steps:");

  for (const step of plan.mitigationSteps) {
    console.log(`- ${step.title}: ${step.rationale}`);
  }

  console.log("Copilot prompt files:");

  for (const prompt of plan.copilotPrompts) {
    console.log(`- ${prompt.promptFile} | ${prompt.intent}`);
  }

  console.log(
    "Patch Coach only generates prompt payloads. It does not invoke Copilot or execute patches."
  );
}

async function createPatchCoachCommand(
  runId: string | undefined,
  findingId: string | undefined
) {
  if (!runId) {
    throw new CliError(
      "Missing run ID. Usage: pnpm failsafe patch-coach <run-id> [finding-id]"
    );
  }

  const plan = await requestJson(
    `/runs/${encodeURIComponent(runId)}/patch-coach`,
    (value) => PatchCoachPlanSchema.parse(value),
    {
      body: JSON.stringify({ findingId }),
      method: "POST"
    }
  );

  printPatchCoachPlan(plan);
}

function printSafetyReport(report: SafetyReport) {
  console.log("FailSafe Safety Card exported");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Report ID: ${report.id}`);
  console.log(`Run ID: ${report.runId}`);
  console.log(`Path: ${report.appOwnedPath}`);
  console.log(`Local evidence only: ${report.mockOnly}`);
  console.log(`Fixture only: ${report.fixtureOnly}`);
  console.log(`Summary: ${report.summary}`);
}

async function createReportCommand(runId: string | undefined) {
  if (!runId) {
    throw new CliError("Missing run ID. Usage: pnpm failsafe report <run-id>");
  }

  const report = await requestJson(
    `/runs/${encodeURIComponent(runId)}/report`,
    (value) => SafetyReportSchema.parse(value),
    {
      body: "{}",
      method: "POST"
    }
  );

  printSafetyReport(report);
}

async function listReportsCommand() {
  const reports = await requestJson("/reports", (value) =>
    SafetyReportSchema.array().parse(value)
  );

  if (reports.length === 0) {
    console.log("No local FailSafe Safety Cards found.");
    return;
  }

  console.log(`FailSafe Safety Cards from ${apiBaseUrl}:`);

  for (const report of reports) {
    console.log(
      [
        `- ${report.id}`,
        `run=${report.runId}`,
        `path=${report.appOwnedPath}`,
        `created=${report.createdAt}`
      ].join(" | ")
    );
  }
}

async function resetDemoDataCommand() {
  const reset = await requestJson(
    "/demo/reset",
    (value) => value as {
      ok: boolean;
      mode: string;
      reset: string[];
      preserved: string[];
      safety: string;
    },
    {
      body: "{}",
      method: "POST"
    }
  );

  console.log("FailSafe local evidence reset");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Mode: ${reset.mode}`);
  console.log(`Reset: ${formatList(reset.reset)}`);
  console.log(`Preserved: ${formatList(reset.preserved)}`);
  console.log(`Safety: ${reset.safety}`);
}

async function previewRunnerPolicy() {
  const result = await requestJson(
    "/runner/dry-run",
    (value) => RunnerDryRunResultSchema.parse(value),
    {
      body: JSON.stringify(runnerPreviewPayload()),
      method: "POST"
    }
  );

  printRunnerPreview(result);
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printRootHelp();
    return;
  }

  if (command === "runs") {
    await listRunsCommand();
    return;
  }

  if (command === "foundry") {
    const [subcommand] = args;

    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      printFoundryHelp();
      return;
    }

    if (subcommand === "readiness") {
      await foundryReadinessCommand();
      return;
    }

    if (subcommand === "import-sample") {
      await importFoundrySampleCommand();
      return;
    }

    throw new CliError(
      `Unknown foundry command: ${subcommand}. Run \`pnpm failsafe foundry --help\`.`
    );
  }

  if (command === "evidence") {
    const [subcommand, evidenceId, scenarioPackId] = args;

    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      printEvidenceHelp();
      return;
    }

    if (subcommand === "import-sample") {
      await importEvidenceSampleCommand();
      return;
    }

    if (subcommand === "list") {
      await listEvidenceCommand();
      return;
    }

    if (subcommand === "crash-test") {
      await evidenceCrashTestCommand(evidenceId, scenarioPackId);
      return;
    }

    throw new CliError(
      `Unknown evidence command: ${subcommand}. Run \`pnpm failsafe evidence --help\`.`
    );
  }

  if (command === "agents") {
    await listAgentsCommand();
    return;
  }

  if (command === "agent") {
    const [subcommand, agentId, scenarioPackId] = args;

    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      printAgentHelp();
      return;
    }

    if (subcommand === "trust-map") {
      await agentTrustMapCommand(agentId);
      return;
    }

    if (subcommand === "crash-test") {
      await agentCrashTestCommand(agentId, scenarioPackId, false);
      return;
    }

    if (subcommand === "fixture-replay") {
      await agentCrashTestCommand(agentId, scenarioPackId, true);
      return;
    }

    throw new CliError(
      `Unknown agent command: ${subcommand}. Run \`pnpm failsafe agent --help\`.`
    );
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

  if (command === "runner") {
    const [subcommand] = args;

    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      printRunnerHelp();
      return;
    }

    if (subcommand === "preview") {
      await previewRunnerPolicy();
      return;
    }

    throw new CliError(
      `Unknown runner command: ${subcommand}. Run \`pnpm failsafe runner --help\`.`
    );
  }

  if (command === "sandbox") {
    const [subcommand, regressionId] = args;

    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      printSandboxHelp();
      return;
    }

    if (subcommand === "plan") {
      await createSandboxReplayPlan(regressionId);
      return;
    }

    if (subcommand === "fixture-replay") {
      await replayFixtureRegression(regressionId);
      return;
    }

    throw new CliError(
      `Unknown sandbox command: ${subcommand}. Run \`pnpm failsafe sandbox --help\`.`
    );
  }

  if (command === "patch-coach") {
    const [runId, findingId] = args;

    await createPatchCoachCommand(runId, findingId);
    return;
  }

  if (command === "report") {
    const [runId] = args;

    await createReportCommand(runId);
    return;
  }

  if (command === "reports") {
    await listReportsCommand();
    return;
  }

  if (command === "reset-demo-data") {
    await resetDemoDataCommand();
    return;
  }

  if (command === "regressions") {
    await listRegressions();
    return;
  }

  throw new CliError(`Unknown command: ${command}. Run \`pnpm failsafe --help\`.`);
}

main()
  .then(() => {
    setImmediate(() => process.exit(0));
  })
  .catch((error: unknown) => {
    if (error instanceof CliError) {
      console.error(error.message);
      setImmediate(() => process.exit(error.exitCode));
    } else {
      console.error(error);
      setImmediate(() => process.exit(1));
    }
  });
