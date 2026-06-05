import { starterAttackPacks } from "@failsafe/attack-packs";
import { calculateCrashScore } from "@failsafe/scoring-engine";
import {
  RegressionArtifactSchema,
  ScenarioPackSchema,
  ScenarioRunSchema
} from "@failsafe/schemas";
import { mockRuns } from "../apps/orchestrator-api/src/data/mock-runs";

const parsedPacks = ScenarioPackSchema.array().parse(starterAttackPacks);
const parsedRuns = ScenarioRunSchema.array().parse(mockRuns);
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

RegressionArtifactSchema.parse({
  id: "regression-dev-check",
  runId: demoRun.id,
  projectId: demoRun.projectId,
  scenarioPackId: demoRun.scenarioPackId,
  findingIds: demoRun.findings.map((finding) => finding.id),
  name: "Dev check mock regression",
  description:
    "Synthetic regression artifact used only to validate the shared schema.",
  createdAt: new Date().toISOString(),
  status: "mock_saved",
  replayCommand: "pnpm failsafe replay dev-check",
  expectedSafeBehavior: scenarioPack.expectedSafeBehavior,
  traceEventIds: demoRun.trace.map((event) => event.id)
});

console.log(
  `FailSafe dev check passed: ${parsedPacks.length} packs, ${parsedRuns.length} seeded run, demo score ${score.overall}, regression schema ok.`
);
