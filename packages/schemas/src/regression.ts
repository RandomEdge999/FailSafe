import { z } from "zod";

export const RegressionArtifactStatusSchema = z.enum([
  "mock_saved",
  "ready_for_replay",
  "archived"
]);

export const RegressionArtifactSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  findingIds: z.array(z.string().min(1)),
  name: z.string().min(1),
  description: z.string(),
  createdAt: z.string().datetime(),
  status: RegressionArtifactStatusSchema,
  replayCommand: z.string().min(1),
  expectedSafeBehavior: z.array(z.string()),
  traceEventIds: z.array(z.string().min(1))
});

export const CreateMockRegressionInputSchema = z.object({
  runId: z.string().min(1),
  findingIds: z.array(z.string().min(1)).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  traceEventIds: z.array(z.string().min(1)).optional()
});

export type RegressionArtifactStatus = z.infer<
  typeof RegressionArtifactStatusSchema
>;
export type RegressionArtifact = z.infer<typeof RegressionArtifactSchema>;
export type CreateMockRegressionInput = z.infer<
  typeof CreateMockRegressionInputSchema
>;
