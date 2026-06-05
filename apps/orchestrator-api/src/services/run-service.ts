import {
  MOCK_SCENARIO_VERSION,
  deriveMockScenarioSeed,
  executeMockScenario
} from "@failsafe/scenario-engine";
import {
  ScenarioRunSchema,
  type CreateMockRunInput,
  type RegressionArtifact,
  type ScenarioRun
} from "@failsafe/schemas";
import { randomUUID } from "node:crypto";
import { mockRuns } from "../data/mock-runs";
import { getProjectById } from "./project-service";
import { getScenarioById } from "./scenario-service";

type StoredRun = {
  createdAtMs: number;
  lifecycle: "seed" | "mock";
  run: ScenarioRun;
  seed: string;
  scenarioVersion: string;
  replayedFromRegressionId?: string;
};

export type RunReplayContext = {
  seed: string;
  scenarioVersion: string;
  sourceRunStatus: ScenarioRun["status"];
};

const queuedMs = 500;
const runningMs = 2_000;

const storedRuns = new Map<string, StoredRun>(
  mockRuns.map((run) => [
    run.id,
    {
      createdAtMs: Date.parse(run.startedAt),
      lifecycle: "seed",
      run,
      seed: deriveMockScenarioSeed({
        projectId: run.projectId,
        agentTargetId: run.agentTargetId,
        scenarioPackId: run.scenarioPackId,
        runId: run.id
      }),
      scenarioVersion: MOCK_SCENARIO_VERSION
    }
  ])
);

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
  const project = getProjectById(input.projectId);

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

function materializeRun(record: StoredRun): ScenarioRun {
  if (record.lifecycle === "seed") {
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

  return getRunById(execution.run.id) ?? execution.run;
}

export function createMockReplayRun(regression: RegressionArtifact) {
  if (!regression.mockReplayable) {
    throw requestError(
      `Regression ${regression.id} is not marked as mock replayable.`,
      "regression_not_replayable",
      409
    );
  }

  const project = getProjectById(regression.projectId);

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

  return getRunById(execution.run.id) ?? execution.run;
}
