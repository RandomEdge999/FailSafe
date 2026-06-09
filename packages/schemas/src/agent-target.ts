import { z } from "zod";

export const AgentTargetTypeSchema = z.enum([
  "local-agent",
  "mcp-client",
  "coding-agent",
  "browser-agent",
  "foundry-agent",
  "mock-agent"
]);

export const EnvironmentModeSchema = z.enum([
  "demo",
  "local-readonly",
  "sandboxed",
  "connected"
]);

export const ApprovalModeSchema = z.enum([
  "manual-required",
  "auto-deny-dangerous",
  "demo-auto-approve-safe",
  "not-configured"
]);

export const AgentTargetSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  type: AgentTargetTypeSchema,
  entrypoint: z.string().min(1),
  instructionFiles: z.array(z.string()),
  environmentMode: EnvironmentModeSchema,
  approvalMode: ApprovalModeSchema
});

export type AgentTargetType = z.infer<typeof AgentTargetTypeSchema>;
export type EnvironmentMode = z.infer<typeof EnvironmentModeSchema>;
export type ApprovalMode = z.infer<typeof ApprovalModeSchema>;
export type AgentTarget = z.infer<typeof AgentTargetSchema>;
