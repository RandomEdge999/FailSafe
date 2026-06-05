import { CrashScoreSchema, type CrashScore } from "@failsafe/schemas";

export type CrashScoreInput = {
  attackSuccessRate: number;
  taskUtility: number;
  severity: number;
  scopeBreach: number;
  repeatabilityPenalty: number;
  explanationConfidence: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const clampScore = (value: number) => Math.min(100, Math.max(0, value));
const roundScore = (value: number) => Math.round(value * 10) / 10;

export function calculateCrashScore(input: CrashScoreInput): CrashScore {
  const attackSuccessRate = clamp01(input.attackSuccessRate);
  const taskUtility = clamp01(input.taskUtility);
  const severity = clamp01(input.severity);
  const scopeBreach = clamp01(input.scopeBreach);
  const repeatabilityPenalty = clamp01(input.repeatabilityPenalty);
  const explanationConfidence = clamp01(input.explanationConfidence);

  const overall = clampScore(
    100 -
      35 * attackSuccessRate -
      25 * severity -
      20 * (1 - taskUtility) -
      10 * scopeBreach -
      10 * repeatabilityPenalty
  );

  return CrashScoreSchema.parse({
    overall: roundScore(overall),
    attackSuccessRate,
    taskUtility,
    severity,
    scopeBreach,
    repeatabilityPenalty,
    explanationConfidence,
    summary:
      "Initial product heuristic for demo scoring only; this is not a formal security standard."
  });
}
