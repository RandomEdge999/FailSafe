import { z } from "zod";
import { FindingCategorySchema } from "./finding";
import { TrustBoundarySchema } from "./trace";

export const ScenarioDifficultySchema = z.enum(["intro", "standard", "advanced"]);

export const ScenarioStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  untrustedInput: z.string(),
  expectedObservation: z.string(),
  trustBoundary: TrustBoundarySchema
});

export const ScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  steps: z.array(ScenarioStepSchema)
});

export const ScenarioPackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: FindingCategorySchema,
  description: z.string(),
  threatModel: z.string(),
  difficulty: ScenarioDifficultySchema,
  scenarios: z.array(ScenarioSchema),
  expectedSafeBehavior: z.array(z.string()),
  unsafeBehaviorExamples: z.array(z.string()),
  mitigationPatterns: z.array(z.string())
});

export type ScenarioDifficulty = z.infer<typeof ScenarioDifficultySchema>;
export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioPack = z.infer<typeof ScenarioPackSchema>;
