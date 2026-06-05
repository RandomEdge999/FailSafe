import { z } from "zod";
import { FindingSchema } from "./finding";
import { CrashScoreSchema } from "./score";
import { TraceEventSchema } from "./trace";

export const ScenarioRunStatusSchema = z.enum([
  "queued",
  "running",
  "failed",
  "passed",
  "needs_review",
  "regression_saved"
]);

export const ScenarioRunSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  agentTargetId: z.string().min(1),
  status: ScenarioRunStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  baselineRunId: z.string().optional(),
  score: CrashScoreSchema,
  findings: z.array(FindingSchema),
  trace: z.array(TraceEventSchema)
});

export const CreateMockRunInputSchema = z.object({
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  agentTargetId: z.string().min(1).optional()
});

export type ScenarioRunStatus = z.infer<typeof ScenarioRunStatusSchema>;
export type ScenarioRun = z.infer<typeof ScenarioRunSchema>;
export type CreateMockRunInput = z.infer<typeof CreateMockRunInputSchema>;
