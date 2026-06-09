import { z } from "zod";
import { FindingCategorySchema } from "./finding";
import { JsonLikeSchema } from "./tool";

export const PatchCoachModeSchema = z.enum(["copilot_prompt_preview"]);

export const PatchCoachMitigationStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rationale: z.string().min(1),
  implementationNotes: z.array(z.string().min(1)),
  verification: z.array(z.string().min(1))
});

export const PatchCoachPromptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  promptFile: z.string().min(1),
  intent: z.string().min(1),
  payload: z.record(JsonLikeSchema),
  guardrails: z.array(z.string().min(1))
});

export const PatchCoachPlanSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  findingId: z.string().min(1),
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  category: FindingCategorySchema,
  createdAt: z.string().datetime(),
  mode: PatchCoachModeSchema,
  summary: z.string().min(1),
  rootCause: z.string().min(1),
  mitigationSteps: z.array(PatchCoachMitigationStepSchema).min(1),
  copilotPrompts: z.array(PatchCoachPromptSchema).min(1),
  regressionChecklist: z.array(z.string().min(1)),
  safetyBoundaries: z.array(z.string().min(1)),
  liveCopilotInvocation: z.literal(false)
});

export type PatchCoachMode = z.infer<typeof PatchCoachModeSchema>;
export type PatchCoachMitigationStep = z.infer<
  typeof PatchCoachMitigationStepSchema
>;
export type PatchCoachPrompt = z.infer<typeof PatchCoachPromptSchema>;
export type PatchCoachPlan = z.infer<typeof PatchCoachPlanSchema>;
