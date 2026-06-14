import { resetPersistedStore } from "./store-service";
import { resetEvidenceState } from "./evidence-service";
import { resetFoundryImports } from "./foundry-service";
import { resetRegressionState } from "./regression-service";
import { resetReportState } from "./report-service";
import { resetRunState } from "./run-service";

export function resetDemoData() {
  resetPersistedStore();
  resetRunState();
  resetRegressionState();
  resetReportState();
  resetFoundryImports();
  resetEvidenceState();

  return {
    ok: true,
    mode: "local_evidence_reset",
    reset: [
      "runs",
      "regressions",
      "sandboxPlans",
      "fixtureReplayResults",
      "reports",
      "foundryImports",
      "evidenceCaptures"
    ],
    preserved: [
      "reviewed scenario definitions",
      ...(process.env.FAILSAFE_ENABLE_SAMPLE_DATA === "1"
        ? ["explicit Sample Lab fixtures"]
        : [])
    ],
    safety:
      "Only the app-owned .failsafe-data store was reset. No project files, user paths, shell commands, network calls, MCP servers, model calls, email, or databases were touched."
  };
}
