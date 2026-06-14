import {
  FIXTURE_REPLAY_VERSION,
  MOCK_SCENARIO_VERSION,
  compareMockReplayRuns,
  deriveMockScenarioSeed,
  executeMockScenario,
  executeReviewedFixtureReplay
} from "@failsafe/scenario-engine";
import {
  ScenarioRunSchema,
  type CreateMockRunInput,
  type FixtureReplayResult,
  type Project,
  type RegressionArtifact,
  type ReplayComparison,
  type SandboxReplayPlan,
  type ScenarioRun
} from "@failsafe/schemas";
import { randomUUID } from "node:crypto";
import { mockProjects } from "../data/mock-projects";
import { mockRuns } from "../data/mock-runs";
import { getScenarioById } from "./scenario-service";
import {
  loadPersistedStore,
  persistRunRecords,
  type StoredRunRecord
} from "./store-service";

type SeedRunRecord = {
  createdAtMs: number;
  lifecycle: "seed";
  run: ScenarioRun;
  seed: string;
  scenarioVersion: string;
};

type RuntimeRunRecord = SeedRunRecord | StoredRunRecord;

export type RunReplayContext = {
  seed: string;
  scenarioVersion: string;
  sourceRunStatus: ScenarioRun["status"];
};

const queuedMs = 500;
const runningMs = 2_000;

const seedRunRecords = mockRuns.map((run) => [
  run.id,
  {
    createdAtMs: Date.parse(run.startedAt),
    lifecycle: "seed" as const,
    run,
    seed: deriveMockScenarioSeed({
      projectId: run.projectId,
      agentTargetId: run.agentTargetId,
      scenarioPackId: run.scenarioPackId,
      runId: run.id
    }),
    scenarioVersion: MOCK_SCENARIO_VERSION
  }
]) satisfies Array<[string, SeedRunRecord]>;

const storedRuns = new Map<string, RuntimeRunRecord>([
  ...(process.env.FAILSAFE_ENABLE_SAMPLE_DATA === "1" ? seedRunRecords : []),
  ...loadPersistedStore().runs.map((record) => [record.run.id, record] as const)
]);

function persistCurrentRuns() {
  persistRunRecords(
    Array.from(storedRuns.values()).filter(
      (record): record is StoredRunRecord => record.lifecycle !== "seed"
    )
  );
}

export function storeCompletedRunRecord(record: StoredRunRecord) {
  storedRuns.set(record.run.id, record);
  persistCurrentRuns();
}

export function resetRunState() {
  storedRuns.clear();

  if (process.env.FAILSAFE_ENABLE_SAMPLE_DATA === "1") {
    for (const [runId, record] of seedRunRecords) {
      storedRuns.set(runId, record);
    }
  }
}

function requestError(message: string, code: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { code, statusCode });
  return error;
}

function runSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function resolveRunContext(input: CreateMockRunInput) {
  const project = mockProjects.find((item) => item.id === input.projectId);

  if (!project) {
    throw requestError(
      `Project ${input.projectId} was not found.`,
      "project_not_found",
      404
    );
  }

  const scenarioPack = getScenarioById(input.scenarioPackId);

  if (!scenarioPack) {
    throw requestError(
      `Scenario pack ${input.scenarioPackId} was not found.`,
      "scenario_not_found",
      404
    );
  }

  const agentTarget = input.agentTargetId
    ? project.agentTargets.find((target) => target.id === input.agentTargetId)
    : project.agentTargets[0];

  if (!agentTarget) {
    throw requestError(
      `Agent target ${input.agentTargetId ?? "default"} was not found.`,
      "agent_target_not_found",
      404
    );
  }

  return { project, scenarioPack, agentTarget };
}

function materializeRun(record: RuntimeRunRecord): ScenarioRun {
  if (record.lifecycle === "seed") {
    return record.run;
  }

  if (record.lifecycle === "fixture_replay") {
    return record.run;
  }

  if (record.lifecycle === "recorded_evidence") {
    return record.run;
  }

  const elapsedMs = Date.now() - record.createdAtMs;

  if (elapsedMs < queuedMs) {
    return ScenarioRunSchema.parse({
      ...record.run,
      status: "queued",
      completedAt: undefined,
      findings: [],
      trace: record.run.trace.slice(0, 1)
    });
  }

  if (elapsedMs < runningMs) {
    return ScenarioRunSchema.parse({
      ...record.run,
      status: "running",
      completedAt: undefined,
      findings: [],
      trace: record.run.trace.slice(0, 4)
    });
  }

  return record.run;
}

export function listRuns() {
  return Array.from(storedRuns.values()).map(materializeRun);
}

export function getRunById(id: string) {
  const record = storedRuns.get(id);

  return record ? materializeRun(record) : undefined;
}

export function getRunComparison(id: string): ReplayComparison {
  const replayRun = getRunById(id);

  if (!replayRun) {
    throw requestError(`Run ${id} was not found.`, "run_not_found", 404);
  }

  if (!replayRun.baselineRunId) {
    throw requestError(
      `Run ${id} is not a replay run with a baselineRunId.`,
      "run_comparison_unavailable",
      409
    );
  }

  const baselineRun = getRunById(replayRun.baselineRunId);

  if (!baselineRun) {
    throw requestError(
      `Baseline run ${replayRun.baselineRunId} was not found in this API process.`,
      "baseline_run_not_found",
      404
    );
  }

  return compareMockReplayRuns({ baselineRun, replayRun });
}

export function getRunReplayContext(id: string): RunReplayContext | undefined {
  const record = storedRuns.get(id);

  if (!record) {
    return undefined;
  }

  return {
    seed: record.seed,
    scenarioVersion: record.scenarioVersion,
    sourceRunStatus: materializeRun(record).status
  };
}

export function createMockRun(input: CreateMockRunInput) {
  if (process.env.FAILSAFE_ENABLE_SAMPLE_DATA !== "1") {
    throw requestError(
      "Sample Lab runs are disabled. Import reviewed Foundry manifests or recorded evidence for launch-mode crash tests.",
      "sample_lab_disabled",
      409
    );
  }

  const { project, scenarioPack, agentTarget } = resolveRunContext(input);
  const createdAtMs = Date.now();
  const runId = `run-demo-${runSlug(scenarioPack.id.replace(/^pack-/, ""))}-${randomUUID().slice(0, 8)}`;
  const seed = deriveMockScenarioSeed({
    projectId: project.id,
    agentTargetId: agentTarget.id,
    scenarioPackId: scenarioPack.id,
    runId
  });
  const execution = executeMockScenario({
    project,
    agentTarget,
    scenarioPack,
    runId,
    seed,
    startedAt: new Date(createdAtMs).toISOString()
  });

  storedRuns.set(execution.run.id, {
    createdAtMs,
    lifecycle: "mock",
    run: execution.run,
    seed: execution.seed,
    scenarioVersion: execution.scenarioVersion
  });
  persistCurrentRuns();

  return getRunById(execution.run.id) ?? execution.run;
}

export function createMockReplayRun(regression: RegressionArtifact) {
  if (process.env.FAILSAFE_ENABLE_SAMPLE_DATA !== "1") {
    throw requestError(
      "Sample Lab replay is disabled in launch mode. Use reviewed fixture replay for imported evidence.",
      "sample_lab_disabled",
      409
    );
  }

  if (!regression.mockReplayable) {
    throw requestError(
      `Regression ${regression.id} is not marked as Sample Lab replayable.`,
      "regression_not_replayable",
      409
    );
  }

  const project = mockProjects.find((item) => item.id === regression.projectId);

  if (!project) {
    throw requestError(
      `Project ${regression.projectId} was not found.`,
      "project_not_found",
      404
    );
  }

  const scenarioPack = getScenarioById(regression.scenarioPackId);

  if (!scenarioPack) {
    throw requestError(
      `Scenario pack ${regression.scenarioPackId} was not found.`,
      "scenario_not_found",
      404
    );
  }

  const agentTarget = project.agentTargets.find(
    (target) => target.id === regression.agentTargetId
  );

  if (!agentTarget) {
    throw requestError(
      `Agent target ${regression.agentTargetId} was not found.`,
      "agent_target_not_found",
      404
    );
  }

  const createdAtMs = Date.now();
  const runId = `run-replay-${runSlug(scenarioPack.id.replace(/^pack-/, ""))}-${randomUUID().slice(0, 8)}`;
  const execution = executeMockScenario({
    project,
    agentTarget,
    scenarioPack,
    runId,
    seed: regression.seed,
    startedAt: new Date(createdAtMs).toISOString(),
    baselineRunId: regression.runId
  });

  storedRuns.set(execution.run.id, {
    createdAtMs,
    lifecycle: "mock",
    run: execution.run,
    seed: execution.seed,
    scenarioVersion: execution.scenarioVersion,
    replayedFromRegressionId: regression.id
  });
  persistCurrentRuns();

  return getRunById(execution.run.id) ?? execution.run;
}

export function createFixtureReplayRun(
  regression: RegressionArtifact,
  plan: SandboxReplayPlan,
  replayProject?: Project
): FixtureReplayResult {
  const baselineRun = getRunById(regression.runId);

  if (!baselineRun) {
    throw requestError(
      `Baseline run ${regression.runId} was not found.`,
      "baseline_run_not_found",
      404
    );
  }

  const project =
    replayProject ??
    (process.env.FAILSAFE_ENABLE_SAMPLE_DATA === "1"
      ? mockProjects.find((item) => item.id === regression.projectId)
      : undefined);

  if (!project) {
    throw requestError(
      `Project ${regression.projectId} was not found.`,
      "project_not_found",
      404
    );
  }

  const scenarioPack = getScenarioById(regression.scenarioPackId);

  if (!scenarioPack) {
    throw requestError(
      `Scenario pack ${regression.scenarioPackId} was not found.`,
      "scenario_not_found",
      404
    );
  }

  const agentTarget = project.agentTargets.find(
    (target) => target.id === regression.agentTargetId
  );

  if (!agentTarget) {
    throw requestError(
      `Agent target ${regression.agentTargetId} was not found.`,
      "agent_target_not_found",
      404
    );
  }

  const createdAtMs = Date.now();
  const runId = `run-fixture-${runSlug(scenarioPack.id.replace(/^pack-/, ""))}-${randomUUID().slice(0, 8)}`;
  const result = executeReviewedFixtureReplay({
    regression,
    baselineRun,
    scenarioPack,
    project,
    agentTarget,
    plan,
    runId,
    startedAt: new Date(createdAtMs).toISOString()
  });

  storedRuns.set(result.replayRun.id, {
    createdAtMs,
    lifecycle: "fixture_replay",
    run: result.replayRun,
    seed: regression.seed,
    scenarioVersion: FIXTURE_REPLAY_VERSION,
    replayedFromRegressionId: regression.id
  });
  persistCurrentRuns();

  return result;
}
