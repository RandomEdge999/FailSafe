import { z } from "zod";
import { FoundryToolKindSchema } from "./foundry";
import { FindingCategorySchema } from "./finding";
import { ScenarioRunSchema } from "./run";
import { ToolRiskLevelSchema } from "./tool";
import { TrustBoundarySchema } from "./trace";

export const EvidenceReviewStatusSchema = z.enum([
  "reviewed",
  "needs_review",
  "rejected"
]);

export const AgentEvidenceMessageRoleSchema = z.enum([
  "system",
  "developer",
  "user",
  "assistant",
  "tool",
  "policy"
]);

export const AgentEvidenceMessageSchema = z.object({
  id: z.string().min(1),
  role: AgentEvidenceMessageRoleSchema,
  trustBoundary: TrustBoundarySchema,
  source: z.string().min(1),
  content: z.string().min(1).max(4000),
  reviewed: z.boolean().default(false),
  timestamp: z.string().datetime().optional()
});

export const AgentEvidenceToolIntentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: FoundryToolKindSchema,
  riskLevel: ToolRiskLevelSchema,
  requiresApproval: z.boolean(),
  requested: z.boolean().default(true),
  blocked: z.boolean().default(false),
  reason: z.string().min(1).optional()
});

export const AgentEvidenceReviewSchema = z.object({
  status: EvidenceReviewStatusSchema,
  reviewedBy: z.string().min(1),
  notes: z.array(z.string().min(1)).default([])
});

export const ImportAgentEvidenceInputSchema = z.object({
  agentName: z.string().min(1).max(120),
  manifestId: z.string().min(1).max(160).optional(),
  scenarioPackId: z.string().min(1).optional(),
  model: z.string().min(1).max(120).default("recorded-agent-output"),
  summary: z.string().min(1).max(600),
  messages: z.array(AgentEvidenceMessageSchema).min(1).max(20),
  toolIntents: z.array(AgentEvidenceToolIntentSchema).max(12).default([]),
  review: AgentEvidenceReviewSchema
});

export const AgentEvidenceCaptureSchema = z.object({
  id: z.string().min(1),
  importedAt: z.string().datetime(),
  source: z.literal("json_body"),
  agentName: z.string().min(1),
  manifestId: z.string().min(1).optional(),
  projectId: z.string().min(1),
  agentTargetId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  model: z.string().min(1),
  summary: z.string().min(1),
  messages: z.array(AgentEvidenceMessageSchema),
  toolIntents: z.array(AgentEvidenceToolIntentSchema),
  review: AgentEvidenceReviewSchema,
  redactionCount: z.number().int().nonnegative(),
  rejectedInputReasons: z.array(z.string().min(1)).default([]),
  safetyStatement: z.string().min(1)
});

export const EvidenceCrashTestResultSchema = z.object({
  evidenceId: z.string().min(1),
  mode: z.literal("recorded_agent_evidence"),
  scenarioPackId: z.string().min(1),
  findingCategories: z.array(FindingCategorySchema),
  runId: z.string().min(1),
  safetyStatement: z.string().min(1)
});

export const EvidenceCrashTestResponseSchema = z.object({
  run: ScenarioRunSchema,
  result: EvidenceCrashTestResultSchema
});

export type EvidenceReviewStatus = z.infer<
  typeof EvidenceReviewStatusSchema
>;
export type AgentEvidenceMessageRole = z.infer<
  typeof AgentEvidenceMessageRoleSchema
>;
export type AgentEvidenceMessage = z.infer<
  typeof AgentEvidenceMessageSchema
>;
export type AgentEvidenceToolIntent = z.infer<
  typeof AgentEvidenceToolIntentSchema
>;
export type AgentEvidenceReview = z.infer<typeof AgentEvidenceReviewSchema>;
export type ImportAgentEvidenceInput = z.infer<
  typeof ImportAgentEvidenceInputSchema
>;
export type AgentEvidenceCapture = z.infer<
  typeof AgentEvidenceCaptureSchema
>;
export type EvidenceCrashTestResult = z.infer<
  typeof EvidenceCrashTestResultSchema
>;
export type EvidenceCrashTestResponse = z.infer<
  typeof EvidenceCrashTestResponseSchema
>;
