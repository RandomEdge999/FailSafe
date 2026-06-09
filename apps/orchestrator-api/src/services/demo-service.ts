import { resetPersistedStore } from "./store-service";
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

  return {
    ok: true,
    mode: "local_demo_reset",
    reset: [
      "runs",
      "regressions",
      "sandboxPlans",
      "fixtureReplayResults",
      "reports",
      "foundryImports"
    ],
    preserved: ["seed projects", "seed scenarios", "seed run"],
    safety:
      "Only the app-owned .failsafe-data store was reset. No project files, user paths, shell commands, network calls, MCP servers, model calls, email, or databases were touched."
  };
}
