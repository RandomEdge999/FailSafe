import { z } from "zod";
import { JsonLikeSchema } from "./tool";

export const RunnerModeSchema = z.enum(["mock", "dry_run"]);

export const RunnerActionKindSchema = z.enum([
  "file_read",
  "file_write",
  "shell_command",
  "network_request",
  "mcp_tool_call",
  "email_send",
  "database_query",
  "model_call"
]);

export const RunnerActionRiskSchema = z.enum([
  "low",
  "medium",
  "high",
  "blocked"
]);

export const RunnerPolicyDecisionSchema = z.enum([
  "allowed",
  "blocked",
  "requires_approval",
  "not_implemented"
]);

export const RunnerActionSchema = z.object({
  id: z.string().min(1),
  kind: RunnerActionKindSchema,
  label: z.string().min(1),
  target: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  risk: RunnerActionRiskSchema.default("medium"),
  synthetic: z.boolean().default(false),
  metadata: z.record(JsonLikeSchema).default({})
});

export const RunnerPolicyDecisionRecordSchema = z.object({
  actionId: z.string().min(1),
  actionKind: RunnerActionKindSchema,
  actionLabel: z.string().min(1),
  decision: RunnerPolicyDecisionSchema,
  risk: RunnerActionRiskSchema,
  reason: z.string().min(1),
  wouldExecute: z.literal(false),
  safetyNote: z.string().min(1)
});

export const RunnerPolicyViolationSchema = z.object({
  actionId: z.string().min(1),
  actionKind: RunnerActionKindSchema,
  decision: RunnerPolicyDecisionSchema,
  risk: RunnerActionRiskSchema,
  reason: z.string().min(1)
});

export const RunnerTraceEvidenceSchema = z.object({
  id: z.string().min(1),
  actionId: z.string().min(1),
  timestamp: z.string().datetime(),
  summary: z.string().min(1),
  policyDecision: RunnerPolicyDecisionSchema,
  metadata: z.record(JsonLikeSchema).default({})
});

export const RunnerDryRunInputSchema = z.object({
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  mode: z.literal("dry_run").default("dry_run"),
  actions: z.array(RunnerActionSchema).min(1).max(20)
});

export const RunnerDryRunResultSchema = z.object({
  mode: z.literal("dry_run"),
  policyVersion: z.string().min(1),
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  executed: z.literal(false),
  dryRunOnly: z.literal(true),
  actionCount: z.number().int().nonnegative(),
  decisions: z.array(RunnerPolicyDecisionRecordSchema),
  violations: z.array(RunnerPolicyViolationSchema),
  traceEvidence: z.array(RunnerTraceEvidenceSchema),
  blockedActionCount: z.number().int().nonnegative(),
  requiresApprovalCount: z.number().int().nonnegative(),
  notImplementedCount: z.number().int().nonnegative(),
  safetyNotes: z.array(z.string().min(1))
});

export const RunnerCapabilityManifestSchema = z.object({
  runnerName: z.string().min(1),
  policyVersion: z.string().min(1),
  modes: z.array(RunnerModeSchema),
  currentMode: z.literal("dry_run"),
  dryRunOnly: z.literal(true),
  executionSupported: z.literal(false),
  previewableActionKinds: z.array(RunnerActionKindSchema),
  blockedActionKinds: z.array(RunnerActionKindSchema),
  notImplementedActionKinds: z.array(RunnerActionKindSchema),
  requiresApprovalActionKinds: z.array(RunnerActionKindSchema),
  safetyNotes: z.array(z.string().min(1))
});

export type RunnerMode = z.infer<typeof RunnerModeSchema>;
export type RunnerActionKind = z.infer<typeof RunnerActionKindSchema>;
export type RunnerActionRisk = z.infer<typeof RunnerActionRiskSchema>;
export type RunnerPolicyDecision = z.infer<
  typeof RunnerPolicyDecisionSchema
>;
export type RunnerAction = z.infer<typeof RunnerActionSchema>;
export type RunnerPolicyDecisionRecord = z.infer<
  typeof RunnerPolicyDecisionRecordSchema
>;
export type RunnerPolicyViolation = z.infer<
  typeof RunnerPolicyViolationSchema
>;
export type RunnerTraceEvidence = z.infer<typeof RunnerTraceEvidenceSchema>;
export type RunnerDryRunInput = z.infer<typeof RunnerDryRunInputSchema>;
export type RunnerDryRunResult = z.infer<typeof RunnerDryRunResultSchema>;
export type RunnerCapabilityManifest = z.infer<
  typeof RunnerCapabilityManifestSchema
>;
