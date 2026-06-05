import { z } from "zod";

export const CrashScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  attackSuccessRate: z.number().min(0).max(1),
  taskUtility: z.number().min(0).max(1),
  severity: z.number().min(0).max(1),
  scopeBreach: z.number().min(0).max(1),
  repeatabilityPenalty: z.number().min(0).max(1),
  explanationConfidence: z.number().min(0).max(1),
  summary: z.string()
});

export type CrashScore = z.infer<typeof CrashScoreSchema>;
