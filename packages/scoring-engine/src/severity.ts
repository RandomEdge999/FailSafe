import type { FindingSeverity } from "@failsafe/schemas";

export function severityToNumeric(severity: FindingSeverity): number {
  const values: Record<FindingSeverity, number> = {
    info: 0,
    low: 0.2,
    medium: 0.45,
    high: 0.75,
    critical: 1
  };

  return values[severity];
}
