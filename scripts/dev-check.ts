import { starterAttackPacks } from "@failsafe/attack-packs";
import {
  MOCK_SCENARIO_VERSION,
  compareMockReplayRuns,
  createReviewedSandboxReplayPlan,
  deriveMockScenarioSeed,
  dryRunRunnerCapabilityManifest,
  executeMockScenario,
  findMockScenarioSafetyIssues,
  previewDryRunRunner
} from "@failsafe/scenario-engine";
import { calculateCrashScore } from "@failsafe/scoring-engine";
import {
  RegressionArtifactSchema,
  ReplayComparisonSchema,
  RunnerActionSchema,
  RunnerCapabilityManifestSchema,
  RunnerDryRunResultSchema,
  SandboxReplayPlanSchema,
  SandboxReplayResultSchema,
  ScenarioPackSchema,
  ScenarioRunSchema
} from "@failsafe/schemas";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mockProjects } from "../apps/orchestrator-api/src/data/mock-projects";
import { mockRuns } from "../apps/orchestrator-api/src/data/mock-runs";

const parsedPacks = ScenarioPackSchema.array().parse(starterAttackPacks);
const parsedRuns = ScenarioRunSchema.array().parse(mockRuns);
const [project] = mockProjects;
const agentTarget = project?.agentTargets[0];
const score = calculateCrashScore({
  attackSuccessRate: 0.5,
  taskUtility: 0.8,
  severity: 0.6,
  scopeBreach: 0.3,
  repeatabilityPenalty: 0.2,
  explanationConfidence: 0.9
});

if (parsedPacks.length !== 3) {
  throw new Error(`Expected 3 starter attack packs, found ${parsedPacks.length}.`);
}

if (!project || !agentTarget) {
  throw new Error("Expected a seeded mock project and agent target.");
}

if (score.overall < 0 || score.overall > 100) {
  throw new Error(`Crash score outside expected range: ${score.overall}.`);
}

const [demoRun] = parsedRuns;
const scenarioPack = parsedPacks.find(
  (pack) => pack.id === demoRun?.scenarioPackId
);

if (!demoRun || !scenarioPack) {
  throw new Error("Expected seeded mock run and matching starter pack.");
}

const engineRuns = parsedPacks.map((pack, index) => {
  const runId = `run-dev-check-${pack.id}`;
  const seed = deriveMockScenarioSeed({
    projectId: project.id,
    agentTargetId: agentTarget.id,
    scenarioPackId: pack.id,
    runId
  });
  const execution = executeMockScenario({
    project,
    agentTarget,
    scenarioPack: pack,
    runId,
    seed,
    startedAt: new Date(Date.UTC(2026, 5, 5, 7, index, 0)).toISOString()
  });
  const parsedRun = ScenarioRunSchema.parse(execution.run);
  const safetyIssues = findMockScenarioSafetyIssues(parsedRun);

  if (safetyIssues.length > 0) {
    throw new Error(
      `Scenario engine safety check failed for ${pack.id}: ${safetyIssues.join(
        ", "
      )}`
    );
  }

  return parsedRun;
});

const regression = RegressionArtifactSchema.parse({
  id: "regression-dev-check",
  runId: demoRun.id,
  projectId: demoRun.projectId,
  scenarioPackId: demoRun.scenarioPackId,
  agentTargetId: demoRun.agentTargetId,
  seed: deriveMockScenarioSeed({
    projectId: demoRun.projectId,
    agentTargetId: demoRun.agentTargetId,
    scenarioPackId: demoRun.scenarioPackId,
    runId: demoRun.id
  }),
  sourceRunStatus: demoRun.status,
  mockReplayable: true,
  scenarioVersion: MOCK_SCENARIO_VERSION,
  findingIds: demoRun.findings.map((finding) => finding.id),
  name: "Dev check mock regression",
  description:
    "Synthetic regression artifact used only to validate the shared schema.",
  createdAt: new Date().toISOString(),
  status: "mock_saved",
  replayCommand: "POST /regressions/regression-dev-check/replay-mock",
  expectedSafeBehavior: scenarioPack.expectedSafeBehavior,
  expectedFindingCategories: demoRun.findings.map((finding) => finding.category),
  expectedTraceEventTypes: demoRun.trace.map((event) => event.type),
  traceEventIds: demoRun.trace.map((event) => event.id)
});

const replayExecution = executeMockScenario({
  project,
  agentTarget,
  scenarioPack,
  runId: "run-dev-check-replay",
  seed: regression.seed,
  startedAt: "2026-06-05T07:10:00.000Z",
  baselineRunId: regression.runId
});
const replayRun = ScenarioRunSchema.parse(replayExecution.run);
const replaySafetyIssues = findMockScenarioSafetyIssues(replayRun);
const comparisonBaselineRun = engineRuns.find(
  (run) => run.scenarioPackId === scenarioPack.id
);

if (replayRun.baselineRunId !== regression.runId) {
  throw new Error("Mock replay run did not preserve the baseline run link.");
}

if (replaySafetyIssues.length > 0) {
  throw new Error(
    `Mock replay safety check failed: ${replaySafetyIssues.join(", ")}`
  );
}

if (!comparisonBaselineRun) {
  throw new Error("Expected deterministic engine baseline for comparison check.");
}

const comparisonReplayExecution = executeMockScenario({
  project,
  agentTarget,
  scenarioPack,
  runId: "run-dev-check-comparison-replay",
  seed: deriveMockScenarioSeed({
    projectId: comparisonBaselineRun.projectId,
    agentTargetId: comparisonBaselineRun.agentTargetId,
    scenarioPackId: comparisonBaselineRun.scenarioPackId,
    runId: comparisonBaselineRun.id
  }),
  startedAt: "2026-06-05T07:20:00.000Z",
  baselineRunId: comparisonBaselineRun.id
});
const comparisonReplayRun = ScenarioRunSchema.parse(
  comparisonReplayExecution.run
);
const replayComparison = ReplayComparisonSchema.parse(
  compareMockReplayRuns({
    baselineRun: comparisonBaselineRun,
    replayRun: comparisonReplayRun,
    expectedFindingCategories: regression.expectedFindingCategories,
    expectedTraceEventTypes: comparisonBaselineRun.trace.map((event) => event.type)
  })
);

if (!replayComparison.mockOnly) {
  throw new Error("Replay comparison did not preserve the mock-only flag.");
}

if (!replayComparison.expectedFindingCategoriesPreserved) {
  throw new Error("Replay comparison did not preserve expected findings.");
}

if (replayComparison.missingExpectedTraceEventTypes.length > 0) {
  throw new Error(
    `Replay comparison missed expected trace event types: ${replayComparison.missingExpectedTraceEventTypes.join(
      ", "
    )}`
  );
}

RunnerCapabilityManifestSchema.parse(dryRunRunnerCapabilityManifest);

const runnerActions = RunnerActionSchema.array().parse([
  {
    id: "action-read-synthetic-invoice",
    kind: "file_read",
    label: "Read synthetic invoice input",
    target: "synthetic:invoice-fixture",
    risk: "low",
    synthetic: true
  },
  {
    id: "action-write-output-file",
    kind: "file_write",
    label: "Write generated output file",
    target: "workspace:generated-report.md",
    risk: "high",
    synthetic: true
  },
  {
    id: "action-run-shell-command",
    kind: "shell_command",
    label: "Run package script",
    target: "shell:pnpm test",
    risk: "high"
  },
  {
    id: "action-contact-network",
    kind: "network_request",
    label: "Contact external endpoint",
    target: "https://example.invalid",
    risk: "high"
  },
  {
    id: "action-call-mcp-tool",
    kind: "mcp_tool_call",
    label: "Call MCP invoice tool",
    target: "mcp:invoice-tools.lookup",
    risk: "high"
  },
  {
    id: "action-send-email",
    kind: "email_send",
    label: "Send invoice approval email",
    target: "mail:finance-review",
    risk: "high"
  },
  {
    id: "action-query-database",
    kind: "database_query",
    label: "Query invoice database",
    target: "db:invoice-records",
    risk: "high"
  },
  {
    id: "action-call-model",
    kind: "model_call",
    label: "Call hosted model",
    target: "model:gpt-preview",
    risk: "high"
  }
]);
const runnerDryRun = RunnerDryRunResultSchema.parse(
  previewDryRunRunner({
    projectId: project.id,
    scenarioPackId: scenarioPack.id,
    actions: runnerActions
  })
);

function runnerDecisionFor(actionId: string) {
  const decision = runnerDryRun.decisions.find(
    (item) => item.actionId === actionId
  );

  if (!decision) {
    throw new Error(`Missing runner dry-run decision for ${actionId}.`);
  }

  return decision;
}

if (runnerDryRun.executed !== false) {
  throw new Error("Dry-run runner reported executed=true.");
}

if (runnerDryRun.dryRunOnly !== true) {
  throw new Error("Dry-run runner did not preserve dryRunOnly=true.");
}

if (
  runnerDecisionFor("action-write-output-file").decision !== "blocked" ||
  runnerDecisionFor("action-run-shell-command").decision !== "blocked" ||
  runnerDecisionFor("action-contact-network").decision !== "blocked" ||
  runnerDecisionFor("action-send-email").decision !== "blocked" ||
  runnerDecisionFor("action-query-database").decision !== "blocked"
) {
  throw new Error(
    "Dry-run runner failed to block file write, shell, network, email, or database actions."
  );
}

if (
  runnerDecisionFor("action-call-mcp-tool").decision !== "not_implemented" ||
  runnerDecisionFor("action-call-model").decision !== "not_implemented"
) {
  throw new Error(
    "Dry-run runner failed to mark MCP and model calls as not implemented."
  );
}

if (runnerDryRun.blockedActionCount < 5) {
  throw new Error("Dry-run runner under-reported blocked actions.");
}

const sandboxPlan = SandboxReplayPlanSchema.parse(
  createReviewedSandboxReplayPlan({
    regression,
    baselineRun: demoRun,
    scenarioPack,
    project,
    agentTarget
  })
);
const requiredSandboxBlocks = [
  "shell_command",
  "network_request",
  "mcp_tool_call",
  "model_call",
  "email_send",
  "database_query",
  "arbitrary_file_write",
  "destructive_operation"
] as const;

if (sandboxPlan.reviewStatus !== "human_review_required") {
  throw new Error("Sandbox plan was not marked human_review_required.");
}

if (!sandboxPlan.requiresHumanReview) {
  throw new Error("Sandbox plan did not preserve requiresHumanReview=true.");
}

if (sandboxPlan.mode !== "plan_only") {
  throw new Error("Sandbox plan did not remain plan_only.");
}

if (!sandboxPlan.mockOnly || !sandboxPlan.fixtureOnly) {
  throw new Error("Sandbox plan did not preserve mock/fixture-only flags.");
}

for (const capability of requiredSandboxBlocks) {
  if (!sandboxPlan.blockedCapabilities.includes(capability)) {
    throw new Error(`Sandbox plan did not block ${capability}.`);
  }
}

if (
  !sandboxPlan.notImplementedCapabilities.includes("real_sandbox_execution") ||
  !sandboxPlan.notImplementedCapabilities.includes("fixture_replay_executor")
) {
  throw new Error(
    "Sandbox plan did not mark real sandbox and fixture executor paths as not implemented."
  );
}

if (sandboxPlan.steps.some((step) => step.willExecute !== false)) {
  throw new Error("Sandbox plan contained an executable step.");
}

SandboxReplayResultSchema.parse({
  planId: sandboxPlan.id,
  regressionId: sandboxPlan.regressionId,
  baselineRunId: sandboxPlan.baselineRunId,
  mode: sandboxPlan.mode,
  reviewStatus: sandboxPlan.reviewStatus,
  executed: false,
  mockOnly: true,
  fixtureOnly: true,
  completedAt: sandboxPlan.createdAt,
  safetyNotes: [sandboxPlan.safetyStatement]
});

const requireFromDevCheck = createRequire(import.meta.url);
const tsxCliPath = requireFromDevCheck.resolve("tsx/cli");
const rootHelp = execFileSync(
  process.execPath,
  [tsxCliPath, "scripts/failsafe.ts", "--help"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }
);
const replayHelp = execFileSync(
  process.execPath,
  [tsxCliPath, "scripts/failsafe.ts", "replay", "--help"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }
);
const runnerHelp = execFileSync(
  process.execPath,
  [tsxCliPath, "scripts/failsafe.ts", "runner", "--help"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }
);
const sandboxHelp = execFileSync(
  process.execPath,
  [tsxCliPath, "scripts/failsafe.ts", "sandbox", "--help"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }
);

if (!rootHelp.includes("FailSafe mock CLI")) {
  throw new Error("FailSafe CLI root help did not render expected text.");
}

if (!replayHelp.includes("FailSafe mock replay")) {
  throw new Error("FailSafe CLI replay help did not render expected text.");
}

if (!runnerHelp.includes("FailSafe dry-run runner preview")) {
  throw new Error("FailSafe CLI runner help did not render expected text.");
}

if (!sandboxHelp.includes("FailSafe reviewed sandbox plan")) {
  throw new Error("FailSafe CLI sandbox help did not render expected text.");
}

console.log(
  `FailSafe dev check passed: ${parsedPacks.length} packs, ${parsedRuns.length} seeded run, ${engineRuns.length} deterministic engine runs, replay schema ok, comparison schema ok, runner dry-run policy ok, sandbox plan ok, CLI help ok, safety guardrails ok.`
);
