import {
  FoundryAgentImportInputSchema,
  FoundryAgentImportSchema,
  FoundryConnectedProbeSchema,
  FoundryConnectedRunSchema,
  FoundryConnectedValidationSchema,
  FoundryReadinessResultSchema,
  AgentTrustBoundaryMapSchema,
  ScenarioRunSchema,
  type AgentTrustBoundary,
  type AgentTrustBoundaryMap,
  type FoundryAgentImport,
  type FoundryAgentImportInput,
  type FoundryAgentManifest,
  type FoundryConnectedProbe,
  type FoundryConnectedRun,
  type FoundryConnectedValidation,
  type FoundryReadinessResult,
  type Project,
  type ScenarioPack,
  type ScenarioRun,
  type Tool
} from "@failsafe/schemas";
import { calculateCrashScore } from "@failsafe/scoring-engine";
import { randomUUID } from "node:crypto";
import { sampleFoundryManifest } from "../data/sample-foundry-manifest";
import { getScenarioById, listScenarios } from "./scenario-service";
import {
  loadPersistedStore,
  persistFoundryImports,
  type StoredRunRecord
} from "./store-service";
import { storeCompletedRunRecord } from "./run-service";

const foundryEnvNames = [
  "AZURE_FOUNDRY_PROJECT_ENDPOINT",
  "AZURE_FOUNDRY_AGENT_ID",
  "AZURE_TENANT_ID",
  "AZURE_FOUNDRY_MODEL_DEPLOYMENT"
];

const blockedOperations = [
  "live_tool_execution",
  "live_mcp_execution",
  "code_interpreter_execution",
  "arbitrary_file_reads",
  "arbitrary_file_writes",
  "shell_commands",
  "external_target_testing",
  "credential_storage",
  "email_sending",
  "database_side_effects"
];

const imports = new Map<string, FoundryAgentImport>(
  loadPersistedStore().foundryImports.map((item) => [item.id, item])
);

function requestError(message: string, code: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { code, statusCode });
  return error;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 56);
}

function persistCurrentImports() {
  persistFoundryImports(Array.from(imports.values()));
}

function configuredEnv() {
  return foundryEnvNames.filter((name) => Boolean(process.env[name]));
}

function missingEnv() {
  return foundryEnvNames.filter((name) => !process.env[name]);
}

function liveFoundryEnabled() {
  return process.env.FAILSAFE_ENABLE_LIVE_FOUNDRY === "1";
}

export function getFoundryReadiness(): FoundryReadinessResult {
  const configured = configuredEnv();
  const missing = missingEnv();

  return FoundryReadinessResultSchema.parse({
    configured: missing.length === 0,
    mode: missing.length === 0 ? "connected_opt_in_ready" : "manifest_only",
    checkedAt: new Date().toISOString(),
    configuredEnv: configured,
    missingEnv: missing,
    allowedOperations: [
      "reviewed_manifest_import",
      "trust_boundary_mapping",
      "modeled_crash_test",
      "fixture_replay",
      ...(missing.length === 0 ? ["connected_readiness_validation"] : [])
    ],
    blockedOperations,
    safetyStatement:
      "FailSafe models Microsoft Foundry agents through reviewed manifests by default. Connected validation is opt-in and never executes live tools, MCP servers, shell commands, arbitrary files, email, databases, or external targets."
  });
}

export function validateConnectedFoundry(): FoundryConnectedValidation {
  const readiness = getFoundryReadiness();

  return FoundryConnectedValidationSchema.parse({
    ok: readiness.configured,
    mode: "connected_opt_in",
    readiness,
    validationStatement: readiness.configured
      ? "Foundry environment variables are present for opt-in connected validation. This endpoint performed configuration validation only and did not call Foundry or execute tools."
      : "Connected Foundry validation is not ready. Add environment variables locally, then explicitly retry. No network call was made."
  });
}

export function probeConnectedFoundry(): FoundryConnectedProbe {
  const readiness = getFoundryReadiness();
  const enabled = liveFoundryEnabled();
  const status = !enabled
    ? "disabled"
    : readiness.configured
      ? "ready_for_manual_probe"
      : "missing_configuration";

  return FoundryConnectedProbeSchema.parse({
    enabled,
    status,
    checkedAt: new Date().toISOString(),
    readiness,
    requiredEnv: foundryEnvNames,
    configuredEnv: readiness.configuredEnv,
    missingEnv: readiness.missingEnv,
    attemptedLiveCall: false,
    safetyStatement: enabled
      ? "Live Foundry probing is opt-in, but this endpoint only verifies local readiness metadata. It did not call Foundry or execute tools."
      : "Live Foundry probing is disabled. Set FAILSAFE_ENABLE_LIVE_FOUNDRY=1 with local Azure credentials to move beyond manifest-only readiness."
  });
}

export function runConnectedFoundry(): FoundryConnectedRun {
  const readiness = getFoundryReadiness();
  const enabled = liveFoundryEnabled();
  const status = !enabled
    ? "disabled"
    : readiness.configured
      ? "manual_only"
      : "missing_configuration";

  return FoundryConnectedRunSchema.parse({
    enabled,
    status,
    checkedAt: new Date().toISOString(),
    readiness,
    attemptedLiveCall: false,
    runCreated: false,
    requiredUserInputs: [
      "Installed and logged-in Azure CLI",
      "Azure subscription with Microsoft Foundry access",
      "AZURE_FOUNDRY_PROJECT_ENDPOINT",
      "AZURE_FOUNDRY_AGENT_ID",
      "AZURE_TENANT_ID",
      "AZURE_FOUNDRY_MODEL_DEPLOYMENT"
    ],
    blockedOperations,
    safetyStatement:
      status === "manual_only"
        ? "Connected Foundry inputs are present, but FailSafe does not create live runs from this demo route. Use the verified local evidence flow unless a reviewed SDK integration is promoted."
        : "Connected Foundry run is blocked. FailSafe did not call Foundry, execute tools, store credentials, or create an external run."
  });
}

export function listFoundryAgents() {
  return Array.from(imports.values()).sort((a, b) =>
    b.importedAt.localeCompare(a.importedAt)
  );
}

export function getFoundryAgentImport(id: string) {
  return imports.get(id);
}

export function importFoundryManifest(input: FoundryAgentImportInput) {
  const parsed = FoundryAgentImportInputSchema.parse(input);
  const manifest = parsed.source === "sample" ? sampleFoundryManifest : parsed.manifest;

  if (!manifest) {
    throw requestError(
      "A reviewed Foundry manifest is required.",
      "foundry_manifest_required",
      400
    );
  }

  const id = `agent-import-${slugify(manifest.id)}`;
  const importedAt = new Date().toISOString();
  const projectId = `project-${slugify(manifest.id)}`;
  const agentTargetId = `target-${slugify(manifest.id)}`;
  const record = FoundryAgentImportSchema.parse({
    id,
    importedAt,
    mode:
      manifest.runtime.mode === "connected_opt_in"
        ? "foundry_connected"
        : "foundry_manifest",
    projectId,
    agentTargetId,
    manifest
  });

  imports.set(record.id, record);
  persistCurrentImports();

  return record;
}

export function resetFoundryImports() {
  imports.clear();
  persistCurrentImports();
}

function toolFromManifestTool(
  manifest: FoundryAgentManifest,
  tool: FoundryAgentManifest["tools"][number]
): Tool {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    source: tool.kind === "mcp" ? "mcp-server" : "foundry",
    riskLevel: tool.riskLevel,
    requiresApproval: tool.requiresApproval,
    scopes: tool.scopes,
    inputSchema: {
      manifestId: manifest.id,
      mode: manifest.runtime.mode,
      reviewed: tool.reviewed
    },
    outputSchema: {
      modeledOnly: true,
      blockedCapabilities: tool.blockedCapabilities
    }
  };
}

export function projectFromFoundryImport(agent: FoundryAgentImport): Project {
  const tools = agent.manifest.tools.map((tool) =>
    toolFromManifestTool(agent.manifest, tool)
  );
  const highestRisk = tools.some((tool) => tool.riskLevel === "critical")
    ? "critical"
    : tools.some((tool) => tool.riskLevel === "high")
      ? "high"
      : tools.some((tool) => tool.riskLevel === "medium")
        ? "medium"
        : "low";
  const approvalCoverage =
    tools.length === 0
      ? 1
      : tools.filter((tool) => tool.requiresApproval).length / tools.length;

  return {
    id: agent.projectId,
    name: agent.manifest.name,
    description: agent.manifest.description,
    repoPath: `foundry://reviewed-manifest/${agent.manifest.id}`,
    createdAt: agent.importedAt,
    updatedAt: agent.importedAt,
    riskProfile: {
      summary:
        "Microsoft Foundry-style agent imported from a reviewed manifest. FailSafe maps tools, identity, observability, and approval boundaries without executing live tools.",
      highestToolRisk: highestRisk,
      trustBoundaryCount: tools.length + 4,
      approvalCoverage
    },
    agentTargets: [
      {
        id: agent.agentTargetId,
        projectId: agent.projectId,
        name: agent.manifest.name,
        type: "foundry-agent",
        entrypoint: agent.manifest.agentId,
        instructionFiles: [agent.manifest.instructions.source],
        environmentMode:
          agent.mode === "foundry_connected" ? "connected" : "local-readonly",
        approvalMode: "manual-required"
      }
    ],
    mcpServers: agent.manifest.tools
      .filter((tool) => tool.kind === "mcp")
      .map((tool) => ({
        id: `${tool.id}-server`,
        name: tool.name,
        transport: "mock",
        trustBoundary: "mcp_metadata",
        reviewed: tool.reviewed
      })),
    tools
  };
}

export function getFoundryAgentProject(agentId: string) {
  const agent = getFoundryAgentImport(agentId);

  return agent ? projectFromFoundryImport(agent) : undefined;
}

function trustBoundaryForTool(
  tool: FoundryAgentManifest["tools"][number]
): AgentTrustBoundary {
  return {
    id: `boundary-${tool.id}`,
    label: tool.name,
    category: tool.kind === "mcp" ? "tool_call" : "tool_output",
    riskLevel: tool.riskLevel,
    reviewed: tool.reviewed,
    controls: [
      tool.requiresApproval ? "manual approval required" : "read-only fixture scope",
      "modeled-only execution",
      ...tool.blockedCapabilities.map((capability) => `blocked: ${capability}`)
    ],
    failureModes:
      tool.kind === "mcp"
        ? ["tool_poisoning", "scope_breach"]
        : tool.riskLevel === "high"
          ? ["approval_bypass", "data_exfiltration"]
          : ["prompt_injection"]
  };
}

export function getAgentTrustBoundaryMap(id: string): AgentTrustBoundaryMap {
  const agent = getFoundryAgentImport(id);

  if (!agent) {
    throw requestError(`Foundry agent ${id} was not found.`, "agent_not_found", 404);
  }

  return AgentTrustBoundaryMapSchema.parse({
    agentImportId: agent.id,
    agentName: agent.manifest.name,
    generatedAt: new Date().toISOString(),
    executionMode: agent.mode,
    boundaries: [
      {
        id: "boundary-user-input",
        label: "User request and retrieved content",
        category: "user_input",
        riskLevel: "medium",
        reviewed: true,
        controls: [
          "instruction/data separation",
          "untrusted data labels",
          "task-drift check before tool planning"
        ],
        failureModes: ["prompt_injection", "task_drift"]
      },
      {
        id: "boundary-system-instructions",
        label: "Reviewed agent instructions",
        category: "instructions",
        riskLevel: "medium",
        reviewed: agent.manifest.instructions.reviewed,
        controls: ["reviewed manifest source", "human-owned policy text"],
        failureModes: ["policy_gap", "task_drift"]
      },
      ...agent.manifest.tools.map(trustBoundaryForTool),
      {
        id: "boundary-identity",
        label: "Foundry identity and RBAC",
        category: "identity",
        riskLevel: "high",
        reviewed: agent.manifest.identity.storesCredentials === false,
        controls: [
          `auth mode: ${agent.manifest.identity.authMode}`,
          "no credentials stored by FailSafe",
          ...agent.manifest.identity.rbacRequired.map((role) => `rbac: ${role}`)
        ],
        failureModes: ["scope_breach", "data_exfiltration"]
      },
      {
        id: "boundary-approval",
        label: "Human approval gate",
        category: "human_approval",
        riskLevel: "high",
        reviewed: true,
        controls: [
          "manual-required approval mode",
          "deny dangerous actions by default",
          "no live tool execution from Studio"
        ],
        failureModes: ["approval_bypass", "unsafe_execution"]
      }
    ],
    safetyStatement:
      "This trust map is generated from a reviewed Foundry manifest. It does not read arbitrary files, execute tools, call MCP servers, or contact external targets."
  });
}

function scenarioForInput(scenarioPackId: string | undefined): ScenarioPack {
  const selected = scenarioPackId ? getScenarioById(scenarioPackId) : listScenarios()[0];

  if (!selected) {
    throw requestError(
      `Scenario pack ${scenarioPackId ?? "default"} was not found.`,
      "scenario_not_found",
      404
    );
  }

  return selected;
}

function findingForMode(
  runId: string,
  pack: ScenarioPack,
  agent: FoundryAgentImport,
  eventIds: string[]
) {
  return {
    id: `finding-foundry-${slugify(pack.category)}-${randomUUID().slice(0, 8)}`,
    runId,
    title:
      pack.category === "approval_bypass"
        ? "Foundry agent requires stronger approval evidence"
        : pack.category === "tool_poisoning"
          ? "Foundry tool metadata needs explicit trust labeling"
          : "Foundry agent needs stronger untrusted-content isolation",
    category: pack.category,
    severity: "high",
    confidence: "high",
    description: `FailSafe mapped ${agent.manifest.name} to a Foundry-style defensive crash test and found that ${pack.name.toLowerCase()} requires explicit runtime guardrails before connected execution.`,
    evidenceEventIds: eventIds,
    rootCause:
      "The reviewed manifest exposes a high-risk boundary where agent instructions, tool metadata, or approval state can influence planning unless controls are enforced before live tool use.",
    recommendedMitigations: [
      "Keep Foundry tool execution disabled until the reviewed approval gate is enforced.",
      "Label retrieved content and MCP metadata as untrusted data in the agent instructions.",
      "Attach OpenTelemetry traces or Foundry evaluation hooks to every crash-test run.",
      "Save this failure as a regression before enabling connected validation."
    ],
    status: "open"
  };
}

function buildFoundryRun(
  agent: FoundryAgentImport,
  scenarioPack: ScenarioPack,
  status: "needs_review" | "passed",
  baselineRunId?: string
): ScenarioRun {
  const runId = `${status === "passed" ? "run-foundry-fixture" : "run-foundry"}-${slugify(scenarioPack.id.replace(/^pack-/, ""))}-${randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const startedMs = Date.parse(startedAt);
  const project = projectFromFoundryImport(agent);
  const selectedTool = agent.manifest.tools.find((tool) =>
    scenarioPack.category === "tool_poisoning" ? tool.kind === "mcp" : tool.riskLevel === "high"
  ) ?? agent.manifest.tools[0];
  const boundaryMap = getAgentTrustBoundaryMap(agent.id);
  const traceIds = {
    imported: `event-${runId}-manifest-imported`,
    mapped: `event-${runId}-trust-map`,
    planned: `event-${runId}-crash-plan`,
    policy: `event-${runId}-policy`,
    finding: `event-${runId}-finding`,
    mitigation: `event-${runId}-mitigation`
  };
  const score = calculateCrashScore(
    status === "passed"
      ? {
          attackSuccessRate: 0.04,
          taskUtility: 0.9,
          severity: 0.1,
          scopeBreach: 0.02,
          repeatabilityPenalty: 0.02,
          explanationConfidence: 0.95
        }
      : {
          attackSuccessRate: selectedTool?.requiresApproval ? 0.52 : 0.42,
          taskUtility: 0.78,
          severity: selectedTool?.riskLevel === "critical" ? 0.85 : 0.7,
          scopeBreach: selectedTool?.kind === "mcp" ? 0.48 : 0.34,
          repeatabilityPenalty: 0.18,
          explanationConfidence: 0.92
        }
  );
  const finding =
    status === "passed"
      ? []
      : [
          findingForMode(runId, scenarioPack, agent, [
            traceIds.mapped,
            traceIds.policy,
            traceIds.finding
          ])
        ];

  return ScenarioRunSchema.parse({
    id: runId,
    projectId: project.id,
    scenarioPackId: scenarioPack.id,
    agentTargetId: agent.agentTargetId,
    status,
    startedAt,
    completedAt: new Date(startedMs + 2_200).toISOString(),
    baselineRunId,
    score,
    findings: finding,
    trace: [
      {
        id: traceIds.imported,
        runId,
        timestamp: startedAt,
        type: "project_imported",
        actor: "orchestrator",
        trustBoundary: "repository",
        inputSource: agent.manifest.instructions.source,
        summary: `Imported reviewed Microsoft Foundry manifest for ${agent.manifest.name}.`,
        raw: {
          provider: agent.manifest.provider,
          model: agent.manifest.model,
          runtime: agent.manifest.runtime,
          credentialStorage: false
        },
        metadata: { executionMode: agent.mode, foundryManifest: true }
      },
      {
        id: traceIds.mapped,
        runId,
        timestamp: new Date(startedMs + 400).toISOString(),
        type: "tool_discovered",
        actor: "orchestrator",
        trustBoundary: selectedTool?.kind === "mcp" ? "mcp_metadata" : "tool_output",
        inputSource: selectedTool?.id ?? agent.manifest.id,
        summary: `Mapped ${boundaryMap.boundaries.length} trust boundaries from the Foundry manifest.`,
        raw: {
          selectedTool,
          boundaryCount: boundaryMap.boundaries.length,
          approvalMode: project.agentTargets[0]?.approvalMode
        },
        parentEventId: traceIds.imported,
        metadata: { reviewed: true }
      },
      {
        id: traceIds.planned,
        runId,
        timestamp: new Date(startedMs + 850).toISOString(),
        type: "prompt_assembled",
        actor: "agent",
        trustBoundary: "system",
        inputSource: agent.manifest.agentId,
        summary:
          "Assembled a Foundry-style crash-test prompt from reviewed instructions, selected scenario, and trust-boundary controls.",
        raw: {
          instructionSource: agent.manifest.instructions.source,
          scenarioPack: scenarioPack.id,
          promptSections: ["system", "developer_policy", "user_goal", "untrusted_data", "tool_manifest"]
        },
        parentEventId: traceIds.mapped,
        metadata: { promptSections: 5, connected: agent.mode === "foundry_connected" }
      },
      {
        id: traceIds.policy,
        runId,
        timestamp: new Date(startedMs + 1_300).toISOString(),
        type: status === "passed" ? "tool_result" : "policy_violation",
        actor: "policy",
        trustBoundary: "sandbox_runtime",
        inputSource: "foundry-adapter-policy",
        summary:
          status === "passed"
            ? "Reviewed fixture replay confirmed that dangerous Foundry-side capabilities stayed blocked."
            : "Policy blocked connected execution and recorded the unsafe boundary for review.",
        raw: {
          blockedOperations,
          liveToolExecution: false,
          liveMcpExecution: false,
          fileAccess: false,
          networkAccess: false
        },
        parentEventId: traceIds.planned,
        metadata: { fixtureReplay: status === "passed" }
      },
      {
        id: traceIds.finding,
        runId,
        timestamp: new Date(startedMs + 1_750).toISOString(),
        type: status === "passed" ? "mitigation_suggested" : "finding_created",
        actor: "orchestrator",
        trustBoundary: "system",
        inputSource: "foundry-adapter",
        summary:
          status === "passed"
            ? "Recorded a clean reviewed fixture replay for this modeled Foundry agent."
            : "Created a root-cause finding from Foundry manifest evidence.",
        raw: {
          score: score.overall,
          findingCount: finding.length,
          manifestId: agent.manifest.id
        },
        parentEventId: traceIds.policy,
        metadata: { foundryManifest: true }
      },
      {
        id: traceIds.mitigation,
        runId,
        timestamp: new Date(startedMs + 2_200).toISOString(),
        type: "mitigation_suggested",
        actor: "copilot",
        trustBoundary: "developer",
        inputSource: ".github/prompts/patch-guardrail.prompt.md",
        summary:
          "Prepared Copilot-ready mitigation guidance for reviewed Foundry guardrails; no patch or live Copilot call was executed.",
        raw: {
          promptFiles: [
            ".github/prompts/explain-failure.prompt.md",
            ".github/prompts/patch-guardrail.prompt.md",
            ".github/prompts/generate-regression.prompt.md"
          ],
          liveCopilotInvocation: false
        },
        parentEventId: traceIds.finding,
        metadata: { humanReviewRequired: true }
      }
    ]
  });
}

export function createFoundryCrashTest(
  agentId: string,
  scenarioPackId: string | undefined
) {
  const agent = getFoundryAgentImport(agentId);

  if (!agent) {
    throw requestError(`Foundry agent ${agentId} was not found.`, "agent_not_found", 404);
  }

  const scenarioPack = scenarioForInput(scenarioPackId);
  const run = buildFoundryRun(agent, scenarioPack, "needs_review");
  const record: StoredRunRecord = {
    createdAtMs: Date.now(),
    lifecycle: agent.mode,
    run,
    seed: ["foundry", agent.id, scenarioPack.id, run.id].join(":"),
    scenarioVersion: "foundry-manifest-adapter-v1"
  };

  storeCompletedRunRecord(record);
  return run;
}

export function createFoundryFixtureReplay(
  agentId: string,
  scenarioPackId: string | undefined
) {
  const agent = getFoundryAgentImport(agentId);

  if (!agent) {
    throw requestError(`Foundry agent ${agentId} was not found.`, "agent_not_found", 404);
  }

  const scenarioPack = scenarioForInput(scenarioPackId);
  const run = buildFoundryRun(agent, scenarioPack, "passed");
  const record: StoredRunRecord = {
    createdAtMs: Date.now(),
    lifecycle: "fixture_replay",
    run,
    seed: ["foundry-fixture", agent.id, scenarioPack.id, run.id].join(":"),
    scenarioVersion: "foundry-fixture-replay-v1"
  };

  storeCompletedRunRecord(record);
  return run;
}
