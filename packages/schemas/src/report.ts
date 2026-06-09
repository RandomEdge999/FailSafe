import { z } from "zod";

export const SafetyReportFormatSchema = z.enum(["markdown"]);
export const SafetyReportEvidenceModeSchema = z.enum([
  "sample_lab_fallback",
  "reviewed_fixture_replay",
  "foundry_manifest",
  "recorded_agent_evidence"
]);

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
  evidenceMode: SafetyReportEvidenceModeSchema.default("sample_lab_fallback"),
  manifestId: z.string().min(1).optional(),
  evidenceCaptureId: z.string().min(1).optional(),
  localEvidenceOnly: z.literal(true).default(true),
  mockOnly: z.literal(true),
  fixtureOnly: z.boolean(),
  safetyBoundaries: z.array(z.string().min(1)),
  limitations: z.array(z.string().min(1))
});

export type SafetyReportFormat = z.infer<typeof SafetyReportFormatSchema>;
export type SafetyReportEvidenceMode = z.infer<
  typeof SafetyReportEvidenceModeSchema
>;
export type SafetyReport = z.infer<typeof SafetyReportSchema>;
