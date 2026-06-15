import { createHash } from "node:crypto";
import {
  AgentTargetSchema,
  ProjectSchema,
  RegressionArtifactSchema,
  SandboxReplayPlanSchema,
  ScenarioPackSchema,
  ScenarioRunSchema,
  type AgentTarget,
  type Project,
  type RegressionArtifact,
  type SandboxReplayBlockedCapability,
  type SandboxReplayNotImplementedCapability,
  type SandboxReplayPlan,
  type ScenarioPack,
  type ScenarioRun
} from "@failsafe/schemas";

export const SANDBOX_REPLAY_PLAN_VERSION = "sandbox-replay-plan-v1";

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

const notImplementedCapabilities: SandboxReplayNotImplementedCapability[] = [
  "real_sandbox_execution",
  "patched_agent_before_after_validation",
  "live_copilot_invocation",
  "live_llm_call",
  "live_mcp_execution",
  "runtime_isolation_proof",
  "background_worker"
];

type SandboxReplayPlanInput = {
  regression: RegressionArtifact;
  baselineRun: ScenarioRun;
  scenarioPack: ScenarioPack;
  project: Project;
  agentTarget: AgentTarget;
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

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function assertContext(input: SandboxReplayPlanInput) {
  if (input.regression.runId !== input.baselineRun.id) {
    throw new Error(
      `Regression ${input.regression.id} points at baseline run ${input.regression.runId}, but ${input.baselineRun.id} was provided.`
    );
  }

  if (input.regression.projectId !== input.project.id) {
    throw new Error(
      `Regression ${input.regression.id} does not belong to project ${input.project.id}.`
    );
  }

  if (input.regression.scenarioPackId !== input.scenarioPack.id) {
    throw new Error(
      `Regression ${input.regression.id} does not belong to scenario pack ${input.scenarioPack.id}.`
    );
  }

  if (input.regression.agentTargetId !== input.agentTarget.id) {
    throw new Error(
      `Regression ${input.regression.id} does not belong to agent target ${input.agentTarget.id}.`
    );
  }
}

export function createReviewedSandboxReplayPlan(
  input: SandboxReplayPlanInput
): SandboxReplayPlan {
  const regression = RegressionArtifactSchema.parse(input.regression);
  const baselineRun = ScenarioRunSchema.parse(input.baselineRun);
  const scenarioPack = ScenarioPackSchema.parse(input.scenarioPack);
  const project = ProjectSchema.parse(input.project);
  const agentTarget = AgentTargetSchema.parse(input.agentTarget);

  assertContext({
    regression,
    baselineRun,
    scenarioPack,
    project,
    agentTarget
  });

  const planHash = stableHash(
    SANDBOX_REPLAY_PLAN_VERSION,
    regression.id,
    baselineRun.id,
    scenarioPack.id,
    agentTarget.id,
    regression.seed
  );
  const scenarioSlug = slugify(scenarioPack.id);
  const regressionSlug = slugify(regression.id);
  const allowedFixtureIds = [
    `fixture-${scenarioSlug}-synthetic-replay`,
    `fixture-${regressionSlug}-trace-shape`
  ];
  const expectedTraceEventTypes = unique([
    ...regression.expectedTraceEventTypes,
    ...baselineRun.trace.map((event) => event.type)
  ]);
  const expectedFindingCategories = unique([
    ...regression.expectedFindingCategories,
    ...baselineRun.findings.map((finding) => finding.category)
  ]);

  return SandboxReplayPlanSchema.parse({
    id: `sandbox-plan-${regressionSlug}-${planHash}`,
    projectId: project.id,
    scenarioPackId: scenarioPack.id,
    agentTargetId: agentTarget.id,
    baselineRunId: baselineRun.id,
    regressionId: regression.id,
    mode: "plan_only",
    reviewStatus: "human_review_required",
    createdAt: regression.createdAt,
    mockOnly: true,
    fixtureOnly: true,
    allowedFixtureIds,
    blockedCapabilities,
    steps: [
      {
        id: "step-01-validate-regression-context",
        sequence: 1,
        kind: "validate_regression_context",
        title: "Validate persisted regression context",
        description:
          "Confirm the saved regression, baseline run, project, scenario pack, and agent target all match before fixture replay is considered.",
        mode: "plan_only",
        willExecute: false,
        expectedEvidence: [
          regression.id,
          baselineRun.id,
          scenarioPack.id,
          agentTarget.id
        ]
      },
      {
        id: "step-02-review-fixture-allowlist",
        sequence: 2,
        kind: "review_fixture_allowlist",
        title: "Review synthetic fixture allowlist",
        description:
          "Limit fixture replay to reviewed synthetic fixture identifiers derived from the saved regression context.",
        mode: "plan_only",
        fixtureId: allowedFixtureIds[0],
        willExecute: false,
        expectedEvidence: allowedFixtureIds
      },
      {
        id: "step-03-verify-safety-boundaries",
        sequence: 3,
        kind: "verify_safety_boundaries",
        title: "Verify blocked capabilities",
        description:
          "Keep shell, network, MCP, model, email, database, arbitrary file, destructive, secret, and background operations blocked.",
        mode: "plan_only",
        willExecute: false,
        expectedEvidence: blockedCapabilities
      },
      {
        id: "step-04-prepare-trace-expectations",
        sequence: 4,
        kind: "prepare_trace_expectations",
        title: "Prepare expected synthetic evidence",
        description:
          "Record the expected trace event types and finding categories for reviewed fixture-only replay comparison.",
        mode: "plan_only",
        willExecute: false,
        expectedEvidence: [
          ...expectedTraceEventTypes,
          ...expectedFindingCategories
        ]
      },
      {
        id: "step-05-stop-before-execution",
        sequence: 5,
        kind: "stop_before_execution",
        title: "Stop before arbitrary execution",
        description:
          "Require the reviewed fixture allowlist before any fixture replay endpoint can return a synthetic replay result.",
        mode: "plan_only",
        willExecute: false,
        expectedEvidence: [
          "reviewStatus=human_review_required",
          "arbitraryExecution=false"
        ]
      }
    ],
    safetyBoundaries: [
      {
        id: "boundary-no-arbitrary-execution",
        label: "No arbitrary execution",
        description:
          "The plan records review steps only and does not spawn shell processes, tools, workers, or target code.",
        blockedCapabilities: [
          "shell_command",
          "destructive_operation",
          "background_worker"
        ],
        enforcedBy: "not_implemented"
      },
      {
        id: "boundary-no-filesystem-access",
        label: "No arbitrary filesystem access",
        description:
          "The planner does not accept paths, read project files, write files, delete files, or inspect local workspaces.",
        blockedCapabilities: ["arbitrary_file_read", "arbitrary_file_write"],
        enforcedBy: "api_route"
      },
      {
        id: "boundary-no-live-connectors",
        label: "No live connectors",
        description:
          "Network requests, live targets, MCP calls, model calls, email sends, and database queries remain unavailable.",
        blockedCapabilities: [
          "network_request",
          "live_target_access",
          "mcp_tool_call",
          "model_call",
          "email_send",
          "database_query"
        ],
        enforcedBy: "not_implemented"
      },
      {
        id: "boundary-fixture-allowlist-only",
        label: "Fixture allowlist only",
        description:
          "Future replay work may only use reviewed synthetic fixture IDs, not client-provided paths, URLs, commands, or tool names.",
        blockedCapabilities: ["secret_access", "live_target_access"],
        enforcedBy: "fixture_allowlist"
      },
      {
        id: "boundary-human-review",
        label: "Human review required",
        description:
          "The generated plan is not approved for execution and must be reviewed before fixture-only replay is promoted.",
        blockedCapabilities: ["destructive_operation"],
        enforcedBy: "human_review_gate"
      }
    ],
    expectedTraceEventTypes,
    expectedFindingCategories,
    notImplementedCapabilities,
    requiresHumanReview: true,
    limitations: [
      "This is a reviewed sandbox plan, not arbitrary execution.",
      "The API stores local review data only in the app-owned local FailSafe store.",
      "Fixture replay can use only reviewed synthetic fixture IDs.",
      "Allowed fixture IDs are not client-provided paths, URLs, commands, or tools.",
      "The plan does not prove that a real code mitigation worked.",
      "Real sandbox execution, runtime isolation, live Copilot, live LLM, MCP, network, email, database, and background worker paths remain future work."
    ],
    safetyStatement:
      "Plan only: no tools, shell commands, file actions, network calls, MCP servers, model calls, email, databases, live targets, or external systems are executed."
  });
}
