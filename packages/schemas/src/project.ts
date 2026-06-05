import { z } from "zod";
import { AgentTargetSchema } from "./agent-target";
import { ToolSchema, ToolRiskLevelSchema } from "./tool";

export const RiskProfileSchema = z.object({
  summary: z.string(),
  highestToolRisk: ToolRiskLevelSchema,
  trustBoundaryCount: z.number().int().nonnegative(),
  approvalCoverage: z.number().min(0).max(1)
});

export const McpServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  transport: z.enum(["stdio", "http", "sse", "mock"]),
  trustBoundary: z.enum(["repository", "mcp_metadata", "external_network", "sandbox_runtime"]),
  reviewed: z.boolean()
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  repoPath: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  riskProfile: RiskProfileSchema,
  agentTargets: z.array(AgentTargetSchema),
  mcpServers: z.array(McpServerSchema),
  tools: z.array(ToolSchema)
});

export type RiskProfile = z.infer<typeof RiskProfileSchema>;
export type McpServer = z.infer<typeof McpServerSchema>;
export type Project = z.infer<typeof ProjectSchema>;
