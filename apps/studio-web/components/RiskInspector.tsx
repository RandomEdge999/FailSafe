import type { Project, ScenarioPack, ScenarioRun } from "@failsafe/schemas";
import { FileWarning, GitBranch, ShieldCheck } from "lucide-react";

type RiskInspectorProps = {
  project: Project;
  selectedPack: ScenarioPack;
  run: ScenarioRun | null;
};

export function RiskInspector({
  project,
  selectedPack,
  run
}: RiskInspectorProps) {
  const findingCount = run?.findings.length ?? 0;

  return (
    <aside className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase text-signal">
          Risk inspector
        </p>
        <h2 className="text-lg font-semibold text-white">{project.name}</h2>
      </div>
      <div className="space-y-4">
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <GitBranch className="h-4 w-4 text-signal" aria-hidden="true" />
            Project surface
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Agent targets</dt>
              <dd className="font-semibold text-white">
                {project.agentTargets.length}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Tools</dt>
              <dd className="font-semibold text-white">{project.tools.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Highest tool risk</dt>
              <dd className="font-semibold text-warning">
                {project.riskProfile.highestToolRisk}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileWarning className="h-4 w-4 text-warning" aria-hidden="true" />
            Active pack
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {selectedPack.threatModel}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-safe" aria-hidden="true" />
            Current run
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Findings</dt>
              <dd className="font-semibold text-white">{findingCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Approval coverage</dt>
              <dd className="font-semibold text-white">
                {Math.round(project.riskProfile.approvalCoverage * 100)}%
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Mode</dt>
              <dd className="font-semibold text-white">mock</dd>
            </div>
          </dl>
        </div>
      </div>
    </aside>
  );
}
