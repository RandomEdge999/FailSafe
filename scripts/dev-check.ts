import { starterAttackPacks } from "@failsafe/attack-packs";
import {
  MOCK_SCENARIO_VERSION,
  deriveMockScenarioSeed,
  executeMockScenario,
  findMockScenarioSafetyIssues
} from "@failsafe/scenario-engine";
import { calculateCrashScore } from "@failsafe/scoring-engine";
import {
  RegressionArtifactSchema,
  ScenarioPackSchema,
  ScenarioRunSchema
} from "@failsafe/schemas";
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

if (replayRun.baselineRunId !== regression.runId) {
  throw new Error("Mock replay run did not preserve the baseline run link.");
}

if (replaySafetyIssues.length > 0) {
  throw new Error(
    `Mock replay safety check failed: ${replaySafetyIssues.join(", ")}`
  );
}

console.log(
  `FailSafe dev check passed: ${parsedPacks.length} packs, ${parsedRuns.length} seeded run, ${engineRuns.length} deterministic engine runs, replay schema ok, safety guardrails ok.`
);
