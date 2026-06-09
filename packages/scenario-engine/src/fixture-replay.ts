import { createHash } from "node:crypto";
import {
  AgentTargetSchema,
  FixtureReplayResultSchema,
  ProjectSchema,
  RegressionArtifactSchema,
  SandboxReplayPlanSchema,
  ScenarioPackSchema,
  ScenarioRunSchema,
  type AgentTarget,
  type FixtureReplayResult,
  type Project,
  type RegressionArtifact,
  type ReplayComparison,
  type SandboxReplayBlockedCapability,
  type SandboxReplayPlan,
  type ScenarioPack,
  type ScenarioRun,
  type TraceEvent
} from "@failsafe/schemas";
import { calculateCrashScore } from "@failsafe/scoring-engine";
import { compareMockReplayRuns } from "./replay-comparison";

export const FIXTURE_REPLAY_VERSION = "fixture-replay-v1";

const blockedCapabilities: SandboxReplayBlockedCapability[] = [
  "arbitrary_file_read",
  "arbitrary_file_write",
  "shell_command",
  "network_request",
  "mcp_tool_call",
  "model_call",
  "email_send",
  "database_query",
  "destructive_operation",
  "live_target_access",
  "secret_access",
  "background_worker"
];

type FixtureReplayInput = {
  regression: RegressionArtifact;
  baselineRun: ScenarioRun;
  scenarioPack: ScenarioPack;
  project: Project;
  agentTarget: AgentTarget;
  plan: SandboxReplayPlan;
  runId: string;
  startedAt: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 56);
}

function stableHash(...parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 10);
}

function timestamp(baseMs: number, offsetMs: number) {
  return new Date(baseMs + offsetMs).toISOString();
}

function scenarioFixtureId(scenarioPackId: string) {
  return `fixture-${slugify(scenarioPackId)}-synthetic-replay`;
}

function traceShapeFixturePrefix(regressionId: string) {
  return `fixture-${slugify(regressionId)}-trace-shape`;
}

function assertReviewedFixtureContext(input: FixtureReplayInput) {
  if (input.regression.runId !== input.baselineRun.id) {
    throw new Error(
      `Regression ${input.regression.id} does not point at baseline run ${input.baselineRun.id}.`
    );
  }

  if (input.plan.regressionId !== input.regression.id) {
    throw new Error(
      `Plan ${input.plan.id} does not belong to regression ${input.regression.id}.`
    );
  }

  if (input.plan.baselineRunId !== input.baselineRun.id) {
    throw new Error(
      `Plan ${input.plan.id} does not belong to baseline run ${input.baselineRun.id}.`
    );
  }

  const requiredScenarioFixture = scenarioFixtureId(input.scenarioPack.id);
  const requiredTraceShapeFixture = traceShapeFixturePrefix(input.regression.id);

  if (!input.plan.allowedFixtureIds.includes(requiredScenarioFixture)) {
    throw new Error(
      `Plan ${input.plan.id} is missing reviewed fixture ${requiredScenarioFixture}.`
    );
  }

  if (
    !input.plan.allowedFixtureIds.some((fixtureId) =>
      fixtureId.startsWith(requiredTraceShapeFixture)
    )
  ) {
    throw new Error(
      `Plan ${input.plan.id} is missing reviewed trace-shape fixture for ${input.regression.id}.`
    );
  }
}

function replayScore() {
  return calculateCrashScore({
    attackSuccessRate: 0.08,
    taskUtility: 0.86,
    severity: 0.18,
    scopeBreach: 0.05,
    repeatabilityPenalty: 0.04,
    explanationConfidence: 0.92
  });
}

function traceForFixtureReplay(input: FixtureReplayInput): TraceEvent[] {
  const baseMs = Date.parse(input.startedAt);
  const suffix = stableHash(
    FIXTURE_REPLAY_VERSION,
    input.regression.id,
    input.runId,
    input.plan.id
  );
  const scenarioFixture = scenarioFixtureId(input.scenarioPack.id);

  return [
    {
      id: `event-fixture-${suffix}-context`,
      runId: input.runId,
      timestamp: timestamp(baseMs, 0),
      type: "project_imported",
      actor: "orchestrator",
      trustBoundary: "repository",
      inputSource: input.project.repoPath,
      summary:
        "Loaded persisted regression context and app-owned fixture metadata.",
      raw: {
        regressionId: input.regression.id,
        planId: input.plan.id,
        appOwnedFixtureOnly: true
      },
      metadata: {
        fixtureReplayVersion: FIXTURE_REPLAY_VERSION,
        arbitraryPathAccepted: false
      }
    },
    {
      id: `event-fixture-${suffix}-allowlist`,
      runId: input.runId,
      timestamp: timestamp(baseMs, 350),
      type:
        input.scenarioPack.category === "tool_poisoning"
          ? "tool_discovered"
          : "untrusted_content_loaded",
      actor: "orchestrator",
      trustBoundary:
        input.scenarioPack.category === "tool_poisoning"
          ? "mcp_metadata"
          : input.scenarioPack.category === "prompt_injection"
            ? "retrieved_content"
            : "user",
      inputSource: scenarioFixture,
      summary:
        "Matched the regression to a reviewed synthetic fixture allowlist entry.",
      raw: {
        allowedFixtureIds: input.plan.allowedFixtureIds,
        clientProvidedPath: false,
        clientProvidedUrl: false,
        clientProvidedCommand: false
      },
      parentEventId: `event-fixture-${suffix}-context`,
      metadata: { reviewedFixture: true, synthetic: true }
    },
    {
      id: `event-fixture-${suffix}-prompt`,
      runId: input.runId,
      timestamp: timestamp(baseMs, 700),
      type: "prompt_assembled",
      actor: "agent",
      trustBoundary: "system",
      inputSource: input.agentTarget.entrypoint,
      summary:
        "Replayed the scenario with untrusted fixture content isolated from instructions.",
      raw: {
        promptSections: [
          "system",
          "developer_policy",
          "user_goal",
          "quoted_untrusted_fixture"
        ],
        guardrailApplied: true
      },
      parentEventId: `event-fixture-${suffix}-allowlist`,
      metadata: {
        dataInstructionSeparation: true,
        scenarioPackId: input.scenarioPack.id
      }
    },
    {
      id: `event-fixture-${suffix}-approval`,
      runId: input.runId,
      timestamp: timestamp(baseMs, 1_050),
      type: "approval_requested",
      actor: "policy",
      trustBoundary: "sandbox_runtime",
      inputSource: "fixture-policy-check",
      summary:
        "Recorded the approval gate that would be required before a high-risk action.",
      raw: {
        highRiskActionExecuted: false,
        approvalGatePresent: true,
        policyMode: "fixture_replay"
      },
      parentEventId: `event-fixture-${suffix}-prompt`,
      metadata: { wouldExecute: false, fixtureOnly: true }
    },
    {
      id: `event-fixture-${suffix}-result`,
      runId: input.runId,
      timestamp: timestamp(baseMs, 1_400),
      type: "tool_result",
      actor: "tool",
      trustBoundary: "sandbox_runtime",
      inputSource: "synthetic-fixture-result",
      summary:
        "Returned a synthetic blocked-action result without invoking tools or external systems.",
      raw: {
        blockedBeforeExecution: true,
        realToolInvoked: false,
        externalSideEffect: false
      },
      parentEventId: `event-fixture-${suffix}-approval`,
      metadata: { blockedActionVerified: true, synthetic: true }
    },
    {
      id: `event-fixture-${suffix}-mitigation`,
      runId: input.runId,
      timestamp: timestamp(baseMs, 1_700),
      type: "mitigation_suggested",
      actor: "copilot",
      trustBoundary: "developer",
      inputSource: ".github/prompts/patch-guardrail.prompt.md",
      summary:
        "Confirmed the Copilot patch handoff remains a human-reviewed prompt preview.",
      raw: {
        liveCopilotInvocation: false,
        regressionPromptReady: true
      },
      parentEventId: `event-fixture-${suffix}-result`,
      metadata: { fixtureReplayComplete: true }
    }
  ];
}

export function executeReviewedFixtureReplay(
  input: FixtureReplayInput
): FixtureReplayResult {
  const regression = RegressionArtifactSchema.parse(input.regression);
  const baselineRun = ScenarioRunSchema.parse(input.baselineRun);
  const scenarioPack = ScenarioPackSchema.parse(input.scenarioPack);
  const project = ProjectSchema.parse(input.project);
  const agentTarget = AgentTargetSchema.parse(input.agentTarget);
  const plan = SandboxReplayPlanSchema.parse(input.plan);
  const parsedInput = {
    ...input,
    regression,
    baselineRun,
    scenarioPack,
    project,
    agentTarget,
    plan
  };

  assertReviewedFixtureContext(parsedInput);

  const baseMs = Date.parse(input.startedAt);

  if (!Number.isFinite(baseMs)) {
    throw new Error(`Invalid fixture replay start time: ${input.startedAt}`);
  }

  const completedAt = timestamp(baseMs, 1_700);
  const replayRun = ScenarioRunSchema.parse({
    id: input.runId,
    projectId: project.id,
    scenarioPackId: scenarioPack.id,
    agentTargetId: agentTarget.id,
    status: "passed",
    startedAt: input.startedAt,
    completedAt,
    baselineRunId: baselineRun.id,
    score: replayScore(),
    findings: [],
    trace: traceForFixtureReplay(parsedInput)
  });
  const comparison: ReplayComparison = compareMockReplayRuns({
    baselineRun,
    replayRun,
    expectedFindingCategories: regression.expectedFindingCategories,
    expectedTraceEventTypes: regression.expectedTraceEventTypes
  });

  return FixtureReplayResultSchema.parse({
    id: `fixture-result-${slugify(regression.id)}-${stableHash(
      regression.id,
      input.runId,
      completedAt
    )}`,
    regressionId: regression.id,
    planId: plan.id,
    baselineRunId: baselineRun.id,
    replayRun,
    comparison,
    mode: "fixture_replay",
    reviewStatus: "fixture_review_approved",
    executed: true,
    mockOnly: true,
    fixtureOnly: true,
    allowedFixtureIds: plan.allowedFixtureIds,
    blockedCapabilities,
    completedAt,
    safetyNotes: [
      "Reviewed fixture replay used app-owned synthetic fixtures only.",
      "No client-provided paths, URLs, commands, tool names, MCP servers, model calls, email, database queries, secrets, or live targets were accepted.",
      "The replay run is deterministic synthetic evidence, not proof that arbitrary code was isolated."
    ],
    safetyStatement:
      "Fixture replay only: FailSafe generated a typed synthetic replay run from reviewed app-owned fixtures and did not execute external tools or side effects."
  });
}
