import { z } from "zod";
import { FindingCategorySchema } from "./finding";
import { ToolRiskLevelSchema } from "./tool";

export const FoundryToolKindSchema = z.enum([
  "function",
  "openapi",
  "azure_ai_search",
  "mcp",
  "file_search",
  "browser_automation",
  "code_interpreter",
  "unknown"
]);

export const FoundryRuntimeModeSchema = z.enum([
  "manifest_only",
  "connected_opt_in"
]);

export const FoundryReviewStatusSchema = z.enum([
  "reviewed",
  "needs_review",
  "blocked"
]);

export const FoundryAgentManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  provider: z.literal("microsoft_foundry"),
  projectEndpoint: z.string().min(1).optional(),
  agentId: z.string().min(1),
  model: z.object({
    deploymentName: z.string().min(1),
    family: z.string().min(1),
    version: z.string().min(1).optional()
  }),
  instructions: z.object({
    summary: z.string().min(1),
    source: z.string().min(1),
    reviewed: z.boolean()
  }),
  tools: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      kind: FoundryToolKindSchema,
      description: z.string().min(1),
      riskLevel: ToolRiskLevelSchema,
      requiresApproval: z.boolean(),
      reviewed: z.boolean(),
      scopes: z.array(z.string().min(1)),
      blockedCapabilities: z.array(z.string().min(1)).default([])
    })
  ),
  identity: z.object({
    authMode: z.enum([
      "environment",
      "managed_identity",
      "user_delegated",
      "not_configured"
    ]),
    rbacRequired: z.array(z.string().min(1)),
    storesCredentials: z.literal(false)
  }),
  observability: z.object({
    tracing: z.boolean(),
    evaluationHooks: z.array(z.string().min(1)),
    logRetention: z.string().min(1)
  }),
  runtime: z.object({
    mode: FoundryRuntimeModeSchema,
    networkAccess: z.literal(false),
    toolExecution: z.literal(false),
    mcpExecution: z.literal(false),
    codeInterpreter: z.literal(false),
    fileAccess: z.literal(false)
  }),
  reviewed: z.object({
    status: FoundryReviewStatusSchema,
    reviewedBy: z.string().min(1),
    reviewedAt: z.string().datetime(),
    notes: z.array(z.string().min(1))
  })
});

export const FoundryAgentImportInputSchema = z
  .object({
    source: z.literal("sample").optional(),
    manifest: FoundryAgentManifestSchema.optional()
  })
  .refine((value) => value.source === "sample" || value.manifest, {
    message: "Provide source=sample or a reviewed Foundry manifest."
  });

export const FoundryAgentImportSchema = z.object({
  id: z.string().min(1),
  importedAt: z.string().datetime(),
  mode: z.enum(["foundry_manifest", "foundry_connected"]),
  projectId: z.string().min(1),
  agentTargetId: z.string().min(1),
  manifest: FoundryAgentManifestSchema
});

export const FoundryReadinessResultSchema = z.object({
  configured: z.boolean(),
  mode: z.enum(["manifest_only", "connected_opt_in_ready"]),
  checkedAt: z.string().datetime(),
  configuredEnv: z.array(z.string().min(1)),
  missingEnv: z.array(z.string().min(1)),
  allowedOperations: z.array(z.string().min(1)),
  blockedOperations: z.array(z.string().min(1)),
  safetyStatement: z.string().min(1)
});

export const FoundryConnectedValidationSchema = z.object({
  ok: z.boolean(),
  mode: z.literal("connected_opt_in"),
  readiness: FoundryReadinessResultSchema,
  validationStatement: z.string().min(1)
});

export const AgentTrustBoundarySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.enum([
    "user_input",
    "instructions",
    "model_reasoning",
    "tool_call",
    "tool_output",
    "data_store",
    "identity",
    "observability",
    "human_approval"
  ]),
  riskLevel: ToolRiskLevelSchema,
  reviewed: z.boolean(),
  controls: z.array(z.string().min(1)),
  failureModes: z.array(FindingCategorySchema)
});

export const AgentTrustBoundaryMapSchema = z.object({
  agentImportId: z.string().min(1),
  agentName: z.string().min(1),
  generatedAt: z.string().datetime(),
  executionMode: z.enum(["foundry_manifest", "foundry_connected"]),
  boundaries: z.array(AgentTrustBoundarySchema),
  safetyStatement: z.string().min(1)
});

export const CreateAgentCrashTestInputSchema = z.object({
  scenarioPackId: z.string().min(1).optional()
});

export type FoundryToolKind = z.infer<typeof FoundryToolKindSchema>;
export type FoundryRuntimeMode = z.infer<typeof FoundryRuntimeModeSchema>;
export type FoundryReviewStatus = z.infer<typeof FoundryReviewStatusSchema>;
export type FoundryAgentManifest = z.infer<typeof FoundryAgentManifestSchema>;
export type FoundryAgentImportInput = z.infer<
  typeof FoundryAgentImportInputSchema
>;
export type FoundryAgentImport = z.infer<typeof FoundryAgentImportSchema>;
export type FoundryReadinessResult = z.infer<
  typeof FoundryReadinessResultSchema
>;
export type FoundryConnectedValidation = z.infer<
  typeof FoundryConnectedValidationSchema
>;
export type AgentTrustBoundary = z.infer<typeof AgentTrustBoundarySchema>;
export type AgentTrustBoundaryMap = z.infer<
  typeof AgentTrustBoundaryMapSchema
>;
export type CreateAgentCrashTestInput = z.infer<
  typeof CreateAgentCrashTestInputSchema
>;
