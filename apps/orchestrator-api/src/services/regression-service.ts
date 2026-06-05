import {
  RegressionArtifactSchema,
  type CreateMockRegressionInput,
  type RegressionArtifact
} from "@failsafe/schemas";
import { randomUUID } from "node:crypto";
import { getRunById } from "./run-service";
import { getScenarioById } from "./scenario-service";

const regressions = new Map<string, RegressionArtifact>();

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

export function listRegressions() {
  return Array.from(regressions.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function getRegressionById(id: string) {
  return regressions.get(id);
}

export function createMockRegression(input: CreateMockRegressionInput) {
  const run = getRunById(input.runId);

  if (!run) {
    const error = new Error(`Run ${input.runId} was not found.`);
    Object.assign(error, { code: "run_not_found", statusCode: 404 });
    throw error;
  }

  if (run.status === "queued" || run.status === "running") {
    const error = new Error(
      `Run ${input.runId} is still ${run.status}; wait for the mock lifecycle to finish.`
    );
    Object.assign(error, { code: "run_not_complete", statusCode: 409 });
    throw error;
  }

  const scenarioPack = getScenarioById(run.scenarioPackId);
  const findingIds =
    input.findingIds && input.findingIds.length > 0
      ? input.findingIds
      : run.findings.map((finding) => finding.id);
  const traceEventIds =
    input.traceEventIds && input.traceEventIds.length > 0
      ? input.traceEventIds
      : run.trace.map((event) => event.id);
  const firstFinding = run.findings.find((finding) =>
    findingIds.includes(finding.id)
  );
  const baseName =
    input.name ??
    `${scenarioPack?.name ?? run.scenarioPackId} regression - ${firstFinding?.category ?? "trace"}`;
  const slug = slugify(baseName) || "mock-regression";
  const id = `regression-${slug}-${randomUUID().slice(0, 6)}`;

  const regression = RegressionArtifactSchema.parse({
    id,
    runId: run.id,
    projectId: run.projectId,
    scenarioPackId: run.scenarioPackId,
    findingIds,
    name: baseName,
    description:
      input.description ??
      `Mock regression artifact saved from ${run.id}. It captures synthetic trace evidence and expected safe behavior for future replay wiring.`,
    createdAt: new Date().toISOString(),
    status: "mock_saved",
    replayCommand: `pnpm failsafe replay ${slug}`,
    expectedSafeBehavior: scenarioPack?.expectedSafeBehavior ?? [
      "Keep dangerous actions mocked until a reviewed sandbox runner exists."
    ],
    traceEventIds
  });

  regressions.set(regression.id, regression);

  return regression;
}
