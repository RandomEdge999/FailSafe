import {
  SafetyReportSchema,
  type SafetyReport
} from "@failsafe/schemas";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getProjectById } from "./project-service";
import { getRegressionById } from "./regression-service";
import { getRunById } from "./run-service";
import { getScenarioById } from "./scenario-service";
import {
  failsafeStorePaths,
  loadPersistedStore,
  persistReports
} from "./store-service";

const reports = new Map<string, SafetyReport>(
  loadPersistedStore().reports.map((report) => [report.id, report])
);

function requestError(message: string, code: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { code, statusCode });
  return error;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function persistCurrentReports() {
  persistReports(Array.from(reports.values()));
}

export function resetReportState() {
  reports.clear();
}

export function listReports() {
  return Array.from(reports.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function getReportById(id: string) {
  return reports.get(id);
}

function markdownList(values: string[]) {
  return values.map((value) => `- ${value}`).join("\n");
}

function findingRows(run: NonNullable<ReturnType<typeof getRunById>>) {
  if (run.findings.length === 0) {
    return "| None | none | none | No open finding in this replay. |";
  }

  return run.findings
    .map(
      (finding) =>
        `| ${finding.title} | ${finding.category} | ${finding.severity} | ${finding.rootCause.replaceAll("|", "\\|")} |`
    )
    .join("\n");
}

export function createSafetyReportForRun(
  runId: string,
  regressionId?: string
): SafetyReport {
  const run = getRunById(runId);

  if (!run) {
    throw requestError(`Run ${runId} was not found.`, "run_not_found", 404);
  }

  const project = getProjectById(run.projectId);

  if (!project) {
    throw requestError(
      `Project ${run.projectId} was not found.`,
      "project_not_found",
      404
    );
  }

  const scenarioPack = getScenarioById(run.scenarioPackId);

  if (!scenarioPack) {
    throw requestError(
      `Scenario pack ${run.scenarioPackId} was not found.`,
      "scenario_not_found",
      404
    );
  }

  const regression = regressionId ? getRegressionById(regressionId) : undefined;
  const createdAt = new Date().toISOString();
  const reportId = `report-${slugify(run.id)}-${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const relativePath = `${failsafeStorePaths.displayReportsDir}/${reportId}.md`;
  const absolutePath = resolve(failsafeStorePaths.reportsDir, `${reportId}.md`);
  const title = `FailSafe Safety Card - ${project.name}`;
  const fixtureOnly =
    run.id.startsWith("run-fixture-") || run.id.startsWith("run-foundry-fixture");
  const mode = run.id.startsWith("run-foundry-fixture")
    ? "Foundry fixture replay"
    : run.id.startsWith("run-foundry")
      ? "Foundry manifest crash test"
      : run.baselineRunId
        ? "Sample Lab replay"
        : "Sample Lab baseline";
  const safetyBoundaries = [
    "Local typed evidence only.",
    "No arbitrary shell, file write, network, MCP, model, email, database, secret, or live target operation was executed.",
    "Copilot output is a prompt handoff for human review, not an automatic patch.",
    "Fixture replay results, when present, use app-owned reviewed fixtures only."
  ];
  const limitations = [
    "This report is not a security certification.",
    "Scores are product heuristics for selected defensive crash packs.",
    "Sample Lab replay, Foundry manifest mode, and fixture replay do not prove arbitrary runtime isolation.",
    "Additional authorized testing is required before production deployment."
  ];
  const content = `# ${title}

Generated: ${createdAt}

## Summary

Project: ${project.name}
Scenario pack: ${scenarioPack.name}
Run: ${run.id}
Status: ${run.status}
Score: ${run.score.overall} / 100
Regression: ${regression?.id ?? "not attached"}
Mode: ${mode}

${run.findings.length === 0 ? "The selected replay has no open findings. It remains reviewed local fixture evidence, not proof of production safety." : `FailSafe found ${run.findings.length} open finding(s) in this defensive crash test.`}

## Findings

| Finding | Category | Severity | Root cause |
|---|---|---|---|
${findingRows(run)}

## Trace Evidence

${markdownList(
  run.trace.map(
    (event) =>
      `${event.type} / ${event.trustBoundary}: ${event.summary} (${event.id})`
  )
)}

## Recommended Mitigations

${markdownList(
  run.findings.flatMap((finding) => finding.recommendedMitigations)
)}

## Safety Boundaries

${markdownList(safetyBoundaries)}

## Limitations

${markdownList(limitations)}
`;
  const report = SafetyReportSchema.parse({
    id: reportId,
    runId: run.id,
    regressionId: regression?.id,
    projectId: project.id,
    scenarioPackId: scenarioPack.id,
    createdAt,
    title,
    format: "markdown",
    appOwnedPath: relativePath,
    content,
    summary:
      "Local Safety Card generated from typed FailSafe run evidence and written to the app-owned store.",
    mockOnly: true,
    fixtureOnly,
    safetyBoundaries,
    limitations
  });

  if (!existsSync(failsafeStorePaths.reportsDir)) {
    mkdirSync(failsafeStorePaths.reportsDir, { recursive: true });
  }

  writeFileSync(absolutePath, report.content, "utf8");
  reports.set(report.id, report);
  persistCurrentReports();

  return report;
}
