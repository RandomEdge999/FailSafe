import { z } from "zod";

export const SafetyReportFormatSchema = z.enum(["markdown"]);

export const SafetyReportSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  regressionId: z.string().min(1).optional(),
  projectId: z.string().min(1),
  scenarioPackId: z.string().min(1),
  createdAt: z.string().datetime(),
  title: z.string().min(1),
  format: SafetyReportFormatSchema,
  appOwnedPath: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().min(1),
  mockOnly: z.literal(true),
  fixtureOnly: z.boolean(),
  safetyBoundaries: z.array(z.string().min(1)),
  limitations: z.array(z.string().min(1))
});

export type SafetyReportFormat = z.infer<typeof SafetyReportFormatSchema>;
export type SafetyReport = z.infer<typeof SafetyReportSchema>;
