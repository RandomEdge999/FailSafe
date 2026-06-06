import {
  RunnerCapabilityManifestSchema,
  RunnerDryRunInputSchema,
  RunnerDryRunResultSchema,
  type RunnerAction,
  type RunnerActionKind,
  type RunnerCapabilityManifest,
  type RunnerDryRunInput,
  type RunnerDryRunResult,
  type RunnerPolicyDecision,
  type RunnerPolicyDecisionRecord,
  type RunnerPolicyViolation
} from "@failsafe/schemas";

export const DRY_RUN_RUNNER_POLICY_VERSION = "dry-run-runner-policy-v1";

export const dryRunRunnerCapabilityManifest: RunnerCapabilityManifest =
  RunnerCapabilityManifestSchema.parse({
    runnerName: "FailSafe reviewed dry-run runner contract",
    policyVersion: DRY_RUN_RUNNER_POLICY_VERSION,
    modes: ["mock", "dry_run"],
    currentMode: "dry_run",
    dryRunOnly: true,
    executionSupported: false,
    previewableActionKinds: [
      "file_read",
      "file_write",
      "shell_command",
      "network_request",
      "mcp_tool_call",
      "email_send",
      "database_query",
      "model_call"
    ],
    blockedActionKinds: [
      "file_write",
      "shell_command",
      "network_request",
      "email_send",
      "database_query"
    ],
    notImplementedActionKinds: ["mcp_tool_call", "model_call"],
    requiresApprovalActionKinds: ["file_read"],
    safetyNotes: [
      "Phase 3A is a dry-run policy preview only.",
      "FailSafe does not execute untrusted code, shell commands, file writes, network calls, MCP tools, model calls, email, or database actions in this phase.",
      "Dry-run decisions are not proof of runtime isolation."
    ]
  });

type ActionDecision = {
  decision: RunnerPolicyDecision;
  risk: RunnerPolicyDecisionRecord["risk"];
  reason: string;
  safetyNote: string;
};

function assertNever(value: never): never {
  throw new Error(`Unhandled runner action kind: ${value}`);
}

function actionKindLabel(kind: RunnerActionKind) {
  return kind.replaceAll("_", " ");
}

function stableEvidenceId(action: RunnerAction, index: number) {
  return `runner-evidence-${String(index + 1).padStart(2, "0")}-${action.id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)}`;
}

function decideAction(action: RunnerAction): ActionDecision {
  if (action.risk === "blocked") {
    return {
      decision: "blocked",
      risk: "blocked",
      reason: "The action was declared blocked and cannot be previewed as executable.",
      safetyNote: "Blocked actions remain non-executable in dry-run mode."
    };
  }

  if (
    action.risk === "high" &&
    action.kind !== "mcp_tool_call" &&
    action.kind !== "model_call"
  ) {
    return {
      decision: "blocked",
      risk: "blocked",
      reason: "High-risk actions are blocked until a reviewed sandbox runner exists.",
      safetyNote: "High-risk runner actions require a future reviewed sandbox and approval path."
    };
  }

  switch (action.kind) {
    case "file_read":
      if (
        action.synthetic &&
        action.risk === "low" &&
        action.target?.startsWith("synthetic:")
      ) {
        return {
          decision: "allowed",
          risk: "low",
          reason:
            "Synthetic low-risk file-read intent can be modeled without reading local files.",
          safetyNote: "Allowed here means policy-preview allowed; no file is read."
        };
      }

      return {
        decision: "requires_approval",
        risk: action.risk === "low" ? "medium" : action.risk,
        reason:
          "Non-synthetic or broader file-read intent needs an explicit reviewed approval gate.",
        safetyNote:
          "Dry-run mode records the approval requirement and does not inspect local files."
      };
    case "file_write":
      return {
        decision: "blocked",
        risk: "blocked",
        reason: "File writes are blocked in Phase 3A dry-run policy preview.",
        safetyNote: "No file is created, modified, deleted, or overwritten."
      };
    case "shell_command":
      return {
        decision: "blocked",
        risk: "blocked",
        reason:
          "Shell command execution is blocked until a reviewed sandbox runner exists.",
        safetyNote: "No shell process is spawned by the runner preview."
      };
    case "network_request":
      return {
        decision: "blocked",
        risk: "blocked",
        reason:
          "Network requests are blocked to avoid arbitrary live target contact.",
        safetyNote: "No HTTP, DNS, socket, or external network request is made."
      };
    case "mcp_tool_call":
      return {
        decision: "not_implemented",
        risk: "high",
        reason:
          "MCP tool execution is not implemented in Phase 3A and requires future reviewed scoping.",
        safetyNote: "No MCP server is contacted and no MCP tool is invoked."
      };
    case "email_send":
      return {
        decision: "blocked",
        risk: "blocked",
        reason: "Email sending is blocked in demo and dry-run modes.",
        safetyNote: "No email is composed, queued, or sent."
      };
    case "database_query":
      return {
        decision: "blocked",
        risk: "blocked",
        reason: "Database queries are blocked in Phase 3A dry-run policy preview.",
        safetyNote: "No database connection or query is attempted."
      };
    case "model_call":
      return {
        decision: "not_implemented",
        risk: "high",
        reason:
          "Live model calls are not implemented in Phase 3A dry-run policy preview.",
        safetyNote: "No LLM, embedding model, or hosted model endpoint is called."
      };
    default:
      return assertNever(action.kind);
  }
}

export function previewDryRunRunner(
  input: RunnerDryRunInput
): RunnerDryRunResult {
  const parsed = RunnerDryRunInputSchema.parse(input);
  const timestamp = new Date().toISOString();
  const decisions = parsed.actions.map((action) => {
    const decision = decideAction(action);

    return {
      actionId: action.id,
      actionKind: action.kind,
      actionLabel: action.label,
      decision: decision.decision,
      risk: decision.risk,
      reason: decision.reason,
      wouldExecute: false,
      safetyNote: decision.safetyNote
    } satisfies RunnerPolicyDecisionRecord;
  });
  const violations: RunnerPolicyViolation[] = decisions
    .filter((decision) => decision.decision !== "allowed")
    .map((decision) => ({
      actionId: decision.actionId,
      actionKind: decision.actionKind,
      decision: decision.decision,
      risk: decision.risk,
      reason: decision.reason
    }));
  const traceEvidence = parsed.actions.map((action, index) => {
    const decision = decisions[index];

    if (!decision) {
      throw new Error(`Missing dry-run decision for ${action.id}.`);
    }

    return {
      id: stableEvidenceId(action, index),
      actionId: action.id,
      timestamp,
      summary: `${actionKindLabel(action.kind)} policy preview: ${decision.decision}.`,
      policyDecision: decision.decision,
      metadata: {
        dryRunOnly: true,
        executed: false,
        target: action.target ?? "none",
        synthetic: action.synthetic,
        declaredRisk: action.risk,
        reason: decision.reason
      }
    };
  });
  const blockedActionCount = decisions.filter(
    (decision) => decision.decision === "blocked"
  ).length;
  const requiresApprovalCount = decisions.filter(
    (decision) => decision.decision === "requires_approval"
  ).length;
  const notImplementedCount = decisions.filter(
    (decision) => decision.decision === "not_implemented"
  ).length;

  return RunnerDryRunResultSchema.parse({
    mode: "dry_run",
    policyVersion: DRY_RUN_RUNNER_POLICY_VERSION,
    projectId: parsed.projectId,
    scenarioPackId: parsed.scenarioPackId,
    executed: false,
    dryRunOnly: true,
    actionCount: parsed.actions.length,
    decisions,
    violations,
    traceEvidence,
    blockedActionCount,
    requiresApprovalCount,
    notImplementedCount,
    safetyNotes: [
      ...dryRunRunnerCapabilityManifest.safetyNotes,
      "Every action in this result has wouldExecute=false."
    ]
  });
}
