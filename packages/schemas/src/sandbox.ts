import { z } from "zod";
import { FindingCategorySchema } from "./finding";
import { TraceEventTypeSchema } from "./trace";

export const SandboxReplayModeSchema = z.enum([
  "plan_only",
  "fixture_replay"
]);

export const SandboxReplayReviewStatusSchema = z.enum([
  "human_review_required",
  "fixture_review_approved",
  "rejected",
  "not_reviewed"
]);

export const SandboxReplayBlockedCapabilitySchema = z.enum([
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
  "background_worker",
  "persistence_write"
]);

export const SandboxReplayNotImplementedCapabilitySchema = z.enum([
  "real_sandbox_execution",
  "fixture_replay_executor",
  "patched_agent_before_after_validation",
  "live_copilot_invocation",
  "live_llm_call",
  "live_mcp_execution",
  "runtime_isolation_proof",
  "persistent_regression_store",
  "background_worker"
]);

export const SandboxReplayStepKindSchema = z.enum([
  "validate_regression_context",
  "review_fixture_allowlist",
  "verify_safety_boundaries",
  "prepare_trace_expectations",
  "stop_before_execution"
]);

export const SandboxReplayBoundaryEnforcementSchema = z.enum([
  "schema_contract",
  "api_route",
  "human_review_gate",
  "fixture_allowlist",
  "not_implemented"
]);

export const SandboxReplayStepSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  kind: SandboxReplayStepKindSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  mode: SandboxReplayModeSchema,
  fixtureId: z.string().min(1).optional(),
  willExecute: z.literal(false),
  expectedEvidence: z.array(z.string().min(1))
});

export const SandboxReplaySafetyBoundarySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  blockedCapabilities: z.array(SandboxReplayBlockedCapabilitySchema),
  enforcedBy: SandboxReplayBoundaryEnforcementSchema
});

export const SandboxReplayPlanSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  agentTargetId: z.string().min(1),
  baselineRunId: z.string().min(1),
  regressionId: z.string().min(1),
  mode: SandboxReplayModeSchema,
  reviewStatus: SandboxReplayReviewStatusSchema,
  createdAt: z.string().datetime(),
  mockOnly: z.literal(true),
  fixtureOnly: z.literal(true),
  allowedFixtureIds: z.array(z.string().min(1)),
  blockedCapabilities: z.array(SandboxReplayBlockedCapabilitySchema),
  steps: z.array(SandboxReplayStepSchema),
  safetyBoundaries: z.array(SandboxReplaySafetyBoundarySchema),
  expectedTraceEventTypes: z.array(TraceEventTypeSchema),
  expectedFindingCategories: z.array(FindingCategorySchema),
  notImplementedCapabilities: z.array(
    SandboxReplayNotImplementedCapabilitySchema
  ),
  requiresHumanReview: z.literal(true),
  limitations: z.array(z.string().min(1)),
  safetyStatement: z.string().min(1)
});

export const SandboxReplayResultSchema = z.object({
  planId: z.string().min(1),
  regressionId: z.string().min(1),
  baselineRunId: z.string().min(1),
  mode: SandboxReplayModeSchema,
  reviewStatus: SandboxReplayReviewStatusSchema,
  executed: z.literal(false),
  mockOnly: z.literal(true),
  fixtureOnly: z.literal(true),
  completedAt: z.string().datetime(),
  safetyNotes: z.array(z.string().min(1))
});

export type SandboxReplayMode = z.infer<typeof SandboxReplayModeSchema>;
export type SandboxReplayReviewStatus = z.infer<
  typeof SandboxReplayReviewStatusSchema
>;
export type SandboxReplayBlockedCapability = z.infer<
  typeof SandboxReplayBlockedCapabilitySchema
>;
export type SandboxReplayNotImplementedCapability = z.infer<
  typeof SandboxReplayNotImplementedCapabilitySchema
>;
export type SandboxReplayStepKind = z.infer<
  typeof SandboxReplayStepKindSchema
>;
export type SandboxReplayBoundaryEnforcement = z.infer<
  typeof SandboxReplayBoundaryEnforcementSchema
>;
export type SandboxReplayStep = z.infer<typeof SandboxReplayStepSchema>;
export type SandboxReplaySafetyBoundary = z.infer<
  typeof SandboxReplaySafetyBoundarySchema
>;
export type SandboxReplayPlan = z.infer<typeof SandboxReplayPlanSchema>;
export type SandboxReplayResult = z.infer<typeof SandboxReplayResultSchema>;
