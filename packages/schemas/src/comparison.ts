import { z } from "zod";
import { FindingCategorySchema } from "./finding";
import { ScenarioRunStatusSchema } from "./run";
import { TraceEventTypeSchema } from "./trace";

export const ReplayComparisonSchema = z.object({
  baselineRunId: z.string().min(1),
  replayRunId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  sameScenarioPack: z.boolean(),
  baselineStatus: ScenarioRunStatusSchema,
  replayStatus: ScenarioRunStatusSchema,
  baselineScore: z.number().min(0).max(100),
  replayScore: z.number().min(0).max(100),
  scoreDelta: z.number(),
  baselineFindingCount: z.number().int().nonnegative(),
  replayFindingCount: z.number().int().nonnegative(),
  findingCountDelta: z.number().int(),
  baselineTraceEventCount: z.number().int().nonnegative(),
  replayTraceEventCount: z.number().int().nonnegative(),
  traceEventCountDelta: z.number().int(),
  matchingTraceEventTypes: z.array(TraceEventTypeSchema),
  missingExpectedTraceEventTypes: z.array(TraceEventTypeSchema),
  newTraceEventTypes: z.array(TraceEventTypeSchema),
  expectedFindingCategories: z.array(FindingCategorySchema),
  expectedFindingCategoriesPreserved: z.boolean(),
  mockOnly: z.literal(true)
});

export type ReplayComparison = z.infer<typeof ReplayComparisonSchema>;
