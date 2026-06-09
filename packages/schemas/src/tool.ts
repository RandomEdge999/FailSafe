import { z } from "zod";

export const ToolRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical"
]);

export const ToolSourceSchema = z.enum([
  "local",
  "mcp-server",
  "repository",
  "browser",
  "foundry",
  "mock"
]);

export const JsonLikeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonLikeSchema),
    z.record(JsonLikeSchema)
  ])
);

export const ToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  source: ToolSourceSchema,
  riskLevel: ToolRiskLevelSchema,
  requiresApproval: z.boolean(),
  scopes: z.array(z.string()),
  inputSchema: z.record(JsonLikeSchema),
  outputSchema: z.record(JsonLikeSchema)
});

export type ToolRiskLevel = z.infer<typeof ToolRiskLevelSchema>;
export type ToolSource = z.infer<typeof ToolSourceSchema>;
export type Tool = z.infer<typeof ToolSchema>;
