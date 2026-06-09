import type {
  RegressionArtifact,
  SandboxReplayPlan
} from "@failsafe/schemas";
import {
  ClipboardCheck,
  Loader2,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { EmptyState } from "./EmptyState";

type SandboxPlanPanelProps = {
  regressions: RegressionArtifact[];
  plan: SandboxReplayPlan | null;
  error: string | null;
  planningRegressionId?: string;
  onCreatePlan: (regression: RegressionArtifact) => void;
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function renderList(values: string[], tone = "text-slate-300") {
  return values.length > 0 ? (
    <ul className={`mt-2 space-y-1 text-xs leading-5 ${tone}`}>
      {values.map((value) => (
        <li key={value} className="rounded bg-black/25 px-2 py-1">
          {formatLabel(value)}
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-2 text-xs text-slate-500">None listed.</p>
  );
}

export function SandboxPlanPanel({
  regressions,
  plan,
  error,
  planningRegressionId,
  onCreatePlan
}: SandboxPlanPanelProps) {
  const recentRegressions = regressions.slice(0, 3);

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-signal">
            Sandbox planning
          </p>
          <h2 className="text-lg font-semibold text-white">
            Reviewed fixture path
          </h2>
        </div>
        <ClipboardCheck className="h-5 w-5 text-signal" aria-hidden="true" />
      </div>

      <div className="grid gap-2 text-xs text-slate-300">
        <div className="flex items-center justify-between gap-3 rounded bg-white/[0.035] px-3 py-2">
          <span>Current mode</span>
          <span className="font-semibold text-white">plan + fixture replay</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded bg-white/[0.035] px-3 py-2">
          <span>Human review</span>
          <span className="font-semibold text-warning">required</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded bg-white/[0.035] px-3 py-2">
          <span>Arbitrary execution</span>
          <span className="font-semibold text-danger">blocked</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">
        Plans can be promoted only to reviewed synthetic fixture replay. No
        shell, network, MCP, model, email, database, arbitrary file, or live
        target actions run.
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-slate-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Generate from saved regression
        </p>
        {recentRegressions.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No regression available"
              body="Save a completed mock run before creating a reviewed sandbox plan."
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {recentRegressions.map((regression) => {
              const isPlanning = planningRegressionId === regression.id;

              return (
                <button
                  key={regression.id}
                  type="button"
                  onClick={() => onCreatePlan(regression)}
                  disabled={Boolean(planningRegressionId)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-white">
                      {regression.name}
                    </span>
                    <span className="mt-1 block truncate text-slate-500">
                      {regression.id}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded border border-white/10 bg-black/20 px-2 py-1 font-semibold text-signal">
                    {isPlanning ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <ShieldCheck
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    )}
                    {isPlanning ? "Planning" : "Plan"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {plan ? (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Plan ID
            </p>
            <code className="mt-1 block break-words text-xs text-signal">
              {plan.id}
            </code>
          </div>

          <dl className="grid gap-2 text-xs text-slate-300">
            <div className="flex justify-between gap-3">
              <dt>Review status</dt>
              <dd className="text-right font-semibold text-warning">
                {formatLabel(plan.reviewStatus)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Mode</dt>
              <dd className="text-right font-semibold text-white">
                {formatLabel(plan.mode)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Regression</dt>
              <dd className="break-all text-right font-semibold text-white">
                {plan.regressionId}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Baseline</dt>
              <dd className="break-all text-right font-semibold text-white">
                {plan.baselineRunId}
              </dd>
            </div>
          </dl>

          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-danger">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Blocked capabilities
            </p>
            {renderList(plan.blockedCapabilities, "text-slate-200")}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Allowed fixture IDs
            </p>
            {renderList(plan.allowedFixtureIds, "text-signal")}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Safety boundaries
            </p>
            <div className="mt-2 space-y-2">
              {plan.safetyBoundaries.map((boundary) => (
                <div key={boundary.id} className="rounded bg-black/25 p-2">
                  <p className="text-xs font-semibold text-white">
                    {boundary.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {boundary.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Not implemented
            </p>
            {renderList(plan.notImplementedCapabilities)}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Limitations
            </p>
            {renderList(plan.limitations)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
