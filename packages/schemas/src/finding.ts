import { z } from "zod";

export const FindingCategorySchema = z.enum([
  "prompt_injection",
  "tool_poisoning",
  "approval_bypass",
  "data_exfiltration",
  "scope_breach",
  "unsafe_execution",
  "task_drift",
  "policy_gap"
]);

export const FindingSeveritySchema = z.enum([
  "info",
  "low",
  "medium",
  "high",
  "critical"
]);

export const FindingConfidenceSchema = z.enum([
  "low",
  "medium",
  "high"
]);

export const FindingStatusSchema = z.enum([
  "open",
  "mitigation_planned",
  "mitigated",
  "accepted_risk",
  "false_positive"
]);

export const FindingSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  title: z.string().min(1),
  category: FindingCategorySchema,
  severity: FindingSeveritySchema,
  confidence: FindingConfidenceSchema,
  description: z.string(),
  evidenceEventIds: z.array(z.string()),
  rootCause: z.string(),
  recommendedMitigations: z.array(z.string()),
  status: FindingStatusSchema
});

export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;
export type FindingConfidence = z.infer<typeof FindingConfidenceSchema>;
export type FindingStatus = z.infer<typeof FindingStatusSchema>;
export type Finding = z.infer<typeof FindingSchema>;
