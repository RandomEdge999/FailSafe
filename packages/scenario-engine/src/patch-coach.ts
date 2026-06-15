import {
  FindingSchema,
  PatchCoachPlanSchema,
  ScenarioPackSchema,
  ScenarioRunSchema,
  type Finding,
  type PatchCoachPlan,
  type ScenarioPack,
  type ScenarioRun
} from "@failsafe/schemas";

export const PATCH_COACH_VERSION = "patch-coach-v1";

type PatchCoachInput = {
  run: ScenarioRun;
  scenarioPack: ScenarioPack;
  finding: Finding;
  createdAt: string;
};

const categoryPatterns: Record<
  Finding["category"],
  {
    summary: string;
    primary: string;
    steps: string[];
  }
> = {
  prompt_injection: {
    summary:
      "Separate retrieved content from instructions, then add a task-drift check before any risky action is planned.",
    primary: "Quoted untrusted-data lane plus task-drift guard",
    steps: [
      "Wrap external or retrieved content in explicit quoted-data delimiters.",
      "Keep the user's objective outside any document-derived text.",
      "Add a policy check that rejects task changes introduced by retrieved content."
    ]
  },
  tool_poisoning: {
    summary:
      "Treat MCP/tool metadata as untrusted data, pin reviewed metadata snapshots, and require approval before cross-scope tools.",
    primary: "Pinned metadata and instruction/data separation",
    steps: [
      "Render tool descriptions as quoted metadata instead of instructions.",
      "Pin reviewed tool metadata and flag drift before enabling tools.",
      "Require an approval event before a high-risk or cross-scope tool can be planned."
    ]
  },
  approval_bypass: {
    summary:
      "Reject implied approval claims and require an explicit approval event before irreversible or cross-scope actions.",
    primary: "Explicit approval gate",
    steps: [
      "Model approval as a recorded event, never as text inside the request.",
      "Block pressured or implied approval language from satisfying policy.",
      "Add regression checks for missing approval events."
    ]
  },
  data_exfiltration: {
    summary:
      "Minimize scopes and block sensitive data movement unless a reviewed allowlist and approval gate are present.",
    primary: "Data egress guard",
    steps: [
      "Classify sensitive outputs before they can leave the agent boundary.",
      "Block unreviewed egress paths by default.",
      "Require explicit approval and audit evidence for allowed egress."
    ]
  },
  scope_breach: {
    summary:
      "Constrain tools to the task scope and require policy evidence before crossing repository, account, or data boundaries.",
    primary: "Least-privilege tool scope",
    steps: [
      "Bind each tool call to an allowed task scope.",
      "Reject tool calls outside the current objective.",
      "Record a scope-check event before any high-risk action."
    ]
  },
  unsafe_execution: {
    summary:
      "Keep execution disabled until an isolated reviewed runner, deny-by-default policy, and approval path exist.",
    primary: "No arbitrary execution guard",
    steps: [
      "Keep shell and file-write capabilities unavailable in local review mode.",
      "Model risky actions through dry-run policy decisions only.",
      "Add tests proving blocked actions report wouldExecute=false."
    ]
  },
  task_drift: {
    summary:
      "Compare planned actions with the original task and stop if untrusted content changes the objective.",
    primary: "Task consistency check",
    steps: [
      "Persist the original task goal as a trusted input.",
      "Check each plan step against that goal before tool selection.",
      "Create a finding when external content redirects the objective."
    ]
  },
  policy_gap: {
    summary:
      "Turn the missing policy into a typed guardrail with trace evidence and regression coverage.",
    primary: "Typed policy checkpoint",
    steps: [
      "Name the missing policy decision explicitly.",
      "Add a deny-by-default branch for unknown or high-risk actions.",
      "Save a regression that proves the policy emits trace evidence."
    ]
  }
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function promptPayload(input: PatchCoachInput) {
  const evidence = input.run.trace
    .filter((event) => input.finding.evidenceEventIds.includes(event.id))
    .map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      trustBoundary: event.trustBoundary,
      inputSource: event.inputSource,
      summary: event.summary
    }));

  return {
    product: "FailSafe",
    patchCoachVersion: PATCH_COACH_VERSION,
    runId: input.run.id,
    scenarioPackId: input.scenarioPack.id,
    finding: {
      id: input.finding.id,
      category: input.finding.category,
      severity: input.finding.severity,
      confidence: input.finding.confidence,
      title: input.finding.title,
      rootCause: input.finding.rootCause,
      recommendedMitigations: input.finding.recommendedMitigations
    },
    traceEvidence: evidence,
    hardConstraints: [
      "Keep the change defensive.",
      "Do not add live external targets.",
      "Do not add shell execution, arbitrary file writes, network calls, MCP execution, model calls, email, or database access.",
      "Add or update deterministic regression coverage for this synthetic finding."
    ]
  };
}

export function createPatchCoachPlan(input: PatchCoachInput): PatchCoachPlan {
  const run = ScenarioRunSchema.parse(input.run);
  const scenarioPack = ScenarioPackSchema.parse(input.scenarioPack);
  const finding = FindingSchema.parse(input.finding);
  const pattern = categoryPatterns[finding.category];

  return PatchCoachPlanSchema.parse({
    id: `patch-coach-${slugify(finding.id)}-${PATCH_COACH_VERSION}`,
    runId: run.id,
    findingId: finding.id,
    projectId: run.projectId,
    scenarioPackId: scenarioPack.id,
    category: finding.category,
    createdAt: input.createdAt,
    mode: "copilot_prompt_preview",
    summary: pattern.summary,
    rootCause: finding.rootCause,
    mitigationSteps: [
      {
        id: "mitigation-01-primary-guardrail",
        title: pattern.primary,
        rationale: pattern.summary,
        implementationNotes: pattern.steps,
        verification: [
          "Run the deterministic Sample Lab replay for the saved regression.",
          "Run the reviewed fixture-only replay after the regression is saved.",
          "Confirm blocked high-risk actions remain blocked and trace evidence is still emitted."
        ]
      },
      {
        id: "mitigation-02-regression-coverage",
        title: "Regression coverage",
        rationale:
          "The fix is only useful if the same synthetic crash path remains replayable.",
        implementationNotes: [
          "Save the current run as a regression case.",
          "Keep the regression fixture synthetic and app-owned.",
          "Use the generated Copilot regression prompt for human-reviewed test edits."
        ],
        verification: [
          "pnpm failsafe regressions",
          "pnpm failsafe replay <regression-id>",
          "pnpm failsafe sandbox fixture-replay <regression-id>"
        ]
      }
    ],
    copilotPrompts: [
      {
        id: "prompt-explain-failure",
        title: "Explain failure",
        promptFile: ".github/prompts/explain-failure.prompt.md",
        intent:
          "Explain the root cause from trace evidence before proposing code changes.",
        payload: promptPayload({ run, scenarioPack, finding, createdAt: input.createdAt }),
        guardrails: [
          "Use only the provided synthetic trace evidence.",
          "Do not infer live exploitability.",
          "Keep the explanation defensive."
        ]
      },
      {
        id: "prompt-patch-guardrail",
        title: "Patch guardrail",
        promptFile: ".github/prompts/patch-guardrail.prompt.md",
        intent:
          "Generate a bounded guardrail patch plan for human review.",
        payload: promptPayload({ run, scenarioPack, finding, createdAt: input.createdAt }),
        guardrails: [
          "Do not add arbitrary execution.",
          "Do not add live provider calls.",
          "Preserve typed schemas and deterministic tests."
        ]
      },
      {
        id: "prompt-generate-regression",
        title: "Generate regression",
        promptFile: ".github/prompts/generate-regression.prompt.md",
        intent:
          "Create or update deterministic regression coverage for the crash path.",
        payload: promptPayload({ run, scenarioPack, finding, createdAt: input.createdAt }),
        guardrails: [
          "Use synthetic fixtures only.",
          "Keep expected behavior defensive.",
          "Do not include real secrets or live targets."
        ]
      }
    ],
    regressionChecklist: [
      "Regression artifact saved from a terminal run.",
      "Deterministic Sample Lab replay still links back to the baseline run.",
      "Fixture-only replay uses reviewed app-owned fixture IDs.",
      "Report export states evidence boundaries and local-evidence status."
    ],
    safetyBoundaries: [
      "Patch Coach creates Copilot-ready prompt payloads only.",
      "No live Copilot invocation is performed by FailSafe.",
      "No tools, shell commands, arbitrary file actions, network calls, MCP servers, model calls, email, databases, or external systems are executed."
    ],
    liveCopilotInvocation: false
  });
}
