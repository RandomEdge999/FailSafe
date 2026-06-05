import type { FindingConfidence } from "@failsafe/schemas";

export function confidenceToNumeric(confidence: FindingConfidence): number {
  const values: Record<FindingConfidence, number> = {
    low: 0.35,
    medium: 0.65,
    high: 0.9
  };

  return values[confidence];
}
