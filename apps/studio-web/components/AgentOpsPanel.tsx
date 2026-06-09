import type {
  AgentEvidenceCapture,
  AgentTrustBoundaryMap,
  FoundryAgentImport,
  FoundryReadinessResult,
  ScenarioPack
} from "@failsafe/schemas";
import {
  Activity,
  Boxes,
  Cable,
  CheckCircle2,
  FlaskConical,
  FileJson,
  Network,
  PlayCircle,
  ShieldAlert
} from "lucide-react";

type AgentOpsPanelProps = {
  agents: FoundryAgentImport[];
  evidenceCaptures: AgentEvidenceCapture[];
  readiness: FoundryReadinessResult | null;
  selectedAgentId?: string;
  selectedEvidenceId?: string;
  selectedPack: ScenarioPack | null;
  trustMap: AgentTrustBoundaryMap | null;
  isImporting: boolean;
  isImportingEvidence: boolean;
  isRunning: boolean;
  isRunningEvidence: boolean;
  isFixtureReplaying: boolean;
  error: string | null;
  onImportSample: () => void;
  onImportEvidence: () => void;
  onSelectAgent: (id: string) => void;
  onSelectEvidence: (id: string) => void;
  onRunCrashTest: () => void;
  onRunEvidenceCrashTest: () => void;
  onRunFixtureReplay: () => void;
};

function formatList(values: string[], max = 3) {
  if (values.length === 0) {
    return "none";
  }

  const shown = values.slice(0, max).join(", ");
  return values.length > max ? `${shown} +${values.length - max}` : shown;
}

export function AgentOpsPanel({
  agents,
  evidenceCaptures,
  readiness,
  selectedAgentId,
  selectedEvidenceId,
  selectedPack,
  trustMap,
  isImporting,
  isImportingEvidence,
  isRunning,
  isRunningEvidence,
  isFixtureReplaying,
  error,
  onImportSample,
  onImportEvidence,
  onSelectAgent,
  onSelectEvidence,
  onRunCrashTest,
  onRunEvidenceCrashTest,
  onRunFixtureReplay
}: AgentOpsPanelProps) {
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const selectedEvidence =
    evidenceCaptures.find((capture) => capture.id === selectedEvidenceId) ??
    evidenceCaptures[0] ??
    null;
  const boundaryCount = trustMap?.boundaries.length ?? 0;
  const highRiskCount =
    trustMap?.boundaries.filter(
      (boundary) =>
        boundary.riskLevel === "high" || boundary.riskLevel === "critical"
    ).length ?? 0;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-white via-brand-50 to-white p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-brand-700">
          <Cable className="h-4 w-4" aria-hidden="true" />
          Microsoft Foundry operations
        </div>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Evidence-first crash testing
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Import a reviewed manifest or recorded agent evidence, map trust
              boundaries, and run a local defensive crash test without live
              tools, MCP execution, credentials, files, or external targets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onImportSample}
              disabled={isImporting}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Boxes className="h-4 w-4" aria-hidden="true" />
              {isImporting ? "Importing..." : "Import manifest"}
            </button>
            <button
              type="button"
              onClick={onImportEvidence}
              disabled={isImportingEvidence}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileJson className="h-4 w-4" aria-hidden="true" />
              {isImportingEvidence ? "Loading..." : "Load recorded evidence"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-slate-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Activity className="h-4 w-4 text-signal" aria-hidden="true" />
              Readiness
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {readiness?.configured ? "Connected ready" : "Manifest mode"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Missing env: {formatList(readiness?.missingEnv ?? [])}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Network className="h-4 w-4 text-warning" aria-hidden="true" />
              Trust map
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {boundaryCount} boundaries
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {highRiskCount} high-risk review points
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
              Blocked
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {readiness?.blockedOperations.length ?? 0}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              No shell, MCP, email, DB, or live tool execution
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-brand-700">
                Reviewed manifests
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {selectedAgent
                  ? selectedAgent.manifest.name
                  : "No Foundry manifest imported yet."}
              </p>
            </div>
          </div>

          {agents.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectAgent(agent.id)}
                  className={`rounded-md border p-3 text-left transition ${
                    agent.id === selectedAgent?.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-950">
                      {agent.manifest.name}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] uppercase text-slate-600">
                      {agent.mode.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {agent.manifest.model.family} | {agent.manifest.tools.length} tools |
                    {agent.manifest.identity.authMode}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Import the reviewed sample manifest to model Foundry tools,
              identity, observability, and approval boundaries.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">
              Recorded agent evidence
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedEvidence
                ? selectedEvidence.summary
                : "No recorded evidence imported yet."}
            </p>
          </div>
          {evidenceCaptures.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {evidenceCaptures.map((capture) => (
                <button
                  key={capture.id}
                  type="button"
                  onClick={() => onSelectEvidence(capture.id)}
                  className={`rounded-md border p-3 text-left transition ${
                    capture.id === selectedEvidence?.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-950">
                      {capture.agentName}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] uppercase text-slate-600">
                      {capture.review.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {capture.messages.length} messages | {capture.toolIntents.length} tool intents | {capture.model}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Load the reviewed JSON evidence fixture to evaluate recorded
              agent behavior without calling Foundry or tools.
            </p>
          )}
        </div>
        </div>

        {trustMap ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-brand-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Trust-boundary map
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {trustMap.boundaries.map((boundary, index) => (
                <div
                  key={boundary.id}
                  className="relative rounded-md border border-slate-200 bg-white p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase text-brand-800">
                      Step {index + 1}
                    </span>
                    <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] uppercase text-warning">
                      {boundary.riskLevel}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">
                      {boundary.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {boundary.controls.slice(0, 2).join(" | ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3">
          <button
            type="button"
            disabled={!selectedAgent || isRunning}
            onClick={onRunCrashTest}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            {isRunning ? "Running..." : "Crash-test manifest"}
          </button>
          <button
            type="button"
            disabled={!selectedEvidence || isRunningEvidence}
            onClick={onRunEvidenceCrashTest}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            {isRunningEvidence ? "Running..." : "Crash-test evidence"}
          </button>
          <button
            type="button"
            disabled={!selectedAgent || isFixtureReplaying}
            onClick={onRunFixtureReplay}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isFixtureReplaying ? "Replaying..." : "Run fixture replay"}
          </button>
        </div>
        <p className="text-xs leading-5 text-slate-600">
          Active pack: {selectedPack?.name ?? "none selected"}. Foundry and
          recorded-evidence flows use reviewed local evidence and app-owned
          fixture replay only.
        </p>
      </div>
    </section>
  );
}
