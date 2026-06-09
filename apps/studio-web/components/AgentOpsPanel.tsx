import type {
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
  Network,
  ShieldAlert
} from "lucide-react";

type AgentOpsPanelProps = {
  agents: FoundryAgentImport[];
  readiness: FoundryReadinessResult | null;
  selectedAgentId?: string;
  selectedPack: ScenarioPack | null;
  trustMap: AgentTrustBoundaryMap | null;
  isImporting: boolean;
  isRunning: boolean;
  isFixtureReplaying: boolean;
  error: string | null;
  onImportSample: () => void;
  onSelectAgent: (id: string) => void;
  onRunCrashTest: () => void;
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
  readiness,
  selectedAgentId,
  selectedPack,
  trustMap,
  isImporting,
  isRunning,
  isFixtureReplaying,
  error,
  onImportSample,
  onSelectAgent,
  onRunCrashTest,
  onRunFixtureReplay
}: AgentOpsPanelProps) {
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const boundaryCount = trustMap?.boundaries.length ?? 0;
  const highRiskCount =
    trustMap?.boundaries.filter(
      (boundary) =>
        boundary.riskLevel === "high" || boundary.riskLevel === "critical"
    ).length ?? 0;

  return (
    <section className="overflow-hidden rounded-lg border border-cyan-300/20 bg-[#10161d]/92 shadow-lab">
      <div className="relative border-b border-white/10 bg-[url('/brand/crash-lab-hero.png')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-r from-[#081017]/95 via-[#081017]/82 to-[#081017]/45" />
        <div className="relative p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan-200">
            <Cable className="h-4 w-4" aria-hidden="true" />
            Microsoft Foundry adapter
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Agent crash-lab console
          </h2>
          <p className="mt-2 max-w-[34rem] text-sm leading-6 text-slate-200">
            Import a reviewed Foundry-style manifest, map trust boundaries, run
            a defensive crash test, and replay a reviewed local fixture without
            executing live tools.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-slate-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-300">
              <Activity className="h-4 w-4 text-signal" aria-hidden="true" />
              Readiness
            </div>
            <p className="mt-2 text-lg font-semibold text-white">
              {readiness?.configured ? "Connected ready" : "Manifest mode"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Missing env: {formatList(readiness?.missingEnv ?? [])}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-300">
              <Network className="h-4 w-4 text-warning" aria-hidden="true" />
              Trust map
            </div>
            <p className="mt-2 text-lg font-semibold text-white">
              {boundaryCount} boundaries
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {highRiskCount} high-risk review points
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-300">
              <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
              Blocked
            </div>
            <p className="mt-2 text-lg font-semibold text-white">
              {readiness?.blockedOperations.length ?? 0}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              No shell, MCP, email, DB, or live tool execution
            </p>
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-signal">
                Reviewed manifests
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {selectedAgent
                  ? selectedAgent.manifest.name
                  : "No Foundry manifest imported yet."}
              </p>
            </div>
            <button
              type="button"
              onClick={onImportSample}
              disabled={isImporting}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Boxes className="h-4 w-4" aria-hidden="true" />
              {isImporting ? "Importing..." : "Import Foundry Manifest"}
            </button>
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
                      ? "border-cyan-300/45 bg-cyan-300/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">
                      {agent.manifest.name}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase text-slate-300">
                      {agent.mode.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {agent.manifest.model.family} | {agent.manifest.tools.length} tools |
                    {agent.manifest.identity.authMode}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {trustMap ? (
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-signal">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Trust-boundary map
            </div>
            <div className="mt-3 grid gap-2">
              {trustMap.boundaries.slice(0, 5).map((boundary) => (
                <div
                  key={boundary.id}
                  className="flex items-start justify-between gap-3 rounded-md bg-black/20 p-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {boundary.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {boundary.controls.slice(0, 2).join(" | ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase text-warning">
                    {boundary.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!selectedAgent || isRunning}
            onClick={onRunCrashTest}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-semibold text-ink transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            {isRunning ? "Running..." : "Crash-Test Foundry Agent"}
          </button>
          <button
            type="button"
            disabled={!selectedAgent || isFixtureReplaying}
            onClick={onRunFixtureReplay}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isFixtureReplaying ? "Replaying..." : "Run Foundry Fixture Replay"}
          </button>
        </div>
        <p className="text-xs leading-5 text-slate-400">
          Active pack: {selectedPack?.name ?? "none selected"}. Foundry flows use
          reviewed manifest evidence and app-owned fixture replay only.
        </p>
      </div>
    </section>
  );
}
