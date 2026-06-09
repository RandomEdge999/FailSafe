import { z } from "zod";
import { ReplayComparisonSchema } from "./comparison";
import { ScenarioRunSchema } from "./run";
import {
  SandboxReplayBlockedCapabilitySchema,
  SandboxReplayReviewStatusSchema
} from "./sandbox";

export const FixtureReplayResultSchema = z.object({
  id: z.string().min(1),
  regressionId: z.string().min(1),
  planId: z.string().min(1),
  baselineRunId: z.string().min(1),
  replayRun: ScenarioRunSchema,
  comparison: ReplayComparisonSchema,
  mode: z.literal("fixture_replay"),
  reviewStatus: z.literal("fixture_review_approved"),
  executed: z.literal(true),
  mockOnly: z.literal(true),
  fixtureOnly: z.literal(true),
  allowedFixtureIds: z.array(z.string().min(1)),
  blockedCapabilities: z.array(SandboxReplayBlockedCapabilitySchema),
  completedAt: z.string().datetime(),
  safetyNotes: z.array(z.string().min(1)),
  safetyStatement: z.string().min(1)
});

export const FixtureReplaySummarySchema = z.object({
  id: z.string().min(1),
  regressionId: z.string().min(1),
  planId: z.string().min(1),
  baselineRunId: z.string().min(1),
  replayRunId: z.string().min(1),
  mode: z.literal("fixture_replay"),
  reviewStatus: SandboxReplayReviewStatusSchema,
  completedAt: z.string().datetime(),
  fixtureOnly: z.literal(true),
  mockOnly: z.literal(true)
});

export type FixtureReplayResult = z.infer<typeof FixtureReplayResultSchema>;
export type FixtureReplaySummary = z.infer<typeof FixtureReplaySummarySchema>;
