import { z } from "zod";
import { AgentTargetSchema } from "./agent-target";
import { ProjectSchema } from "./project";
import { ScenarioRunSchema } from "./run";
import { ScenarioPackSchema } from "./scenario";

export const ScenarioExecutionModeSchema = z.enum(["mock"]);

export const MockScenarioExecutionInputSchema = z.object({
  project: ProjectSchema,
  agentTarget: AgentTargetSchema,
  scenarioPack: ScenarioPackSchema,
  runId: z.string().min(1),
  seed: z.string().min(1),
  startedAt: z.string().datetime(),
  baselineRunId: z.string().min(1).optional()
});

export const MockScenarioExecutionResultSchema = z.object({
  mode: z.literal("mock"),
  seed: z.string().min(1),
  scenarioVersion: z.string().min(1),
  run: ScenarioRunSchema,
  safetyNotes: z.array(z.string().min(1))
});

export const MockReplayResultSchema = z.object({
  regressionId: z.string().min(1),
  run: ScenarioRunSchema
});

export type ScenarioExecutionMode = z.infer<
  typeof ScenarioExecutionModeSchema
>;
export type MockScenarioExecutionInput = z.infer<
  typeof MockScenarioExecutionInputSchema
>;
export type MockScenarioExecutionResult = z.infer<
  typeof MockScenarioExecutionResultSchema
>;
export type MockReplayResult = z.infer<typeof MockReplayResultSchema>;
