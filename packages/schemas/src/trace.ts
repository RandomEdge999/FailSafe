import { z } from "zod";
import { JsonLikeSchema } from "./tool";

export const TraceEventTypeSchema = z.enum([
  "project_imported",
  "tool_discovered",
  "prompt_assembled",
  "untrusted_content_loaded",
  "model_response",
  "approval_requested",
  "approval_skipped",
  "tool_invoked",
  "tool_result",
  "policy_violation",
  "finding_created",
  "mitigation_suggested",
  "regression_saved"
]);

export const TrustBoundarySchema = z.enum([
  "system",
  "developer",
  "user",
  "repository",
  "mcp_metadata",
  "retrieved_content",
  "tool_output",
  "external_network",
  "sandbox_runtime"
]);

export const TraceActorSchema = z.enum([
  "user",
  "agent",
  "model",
  "tool",
  "orchestrator",
  "policy",
  "copilot"
]);

export const TraceEventSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  timestamp: z.string().datetime(),
  type: TraceEventTypeSchema,
  actor: TraceActorSchema,
  trustBoundary: TrustBoundarySchema,
  inputSource: z.string(),
  summary: z.string(),
  raw: JsonLikeSchema.optional(),
  parentEventId: z.string().optional(),
  metadata: z.record(JsonLikeSchema).default({})
});

export type TraceEventType = z.infer<typeof TraceEventTypeSchema>;
export type TrustBoundary = z.infer<typeof TrustBoundarySchema>;
export type TraceActor = z.infer<typeof TraceActorSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
