import type { RegressionArtifact } from "@failsafe/schemas";
import { Save } from "lucide-react";
import { EmptyState } from "./EmptyState";

type RegressionPanelProps = {
  regressions: RegressionArtifact[];
  lastSavedRegressionId?: string;
};

export function RegressionPanel({
  regressions,
  lastSavedRegressionId
}: RegressionPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-signal">
            Regression cases
          </p>
          <h2 className="text-lg font-semibold text-white">Saved artifacts</h2>
        </div>
        <Save className="h-5 w-5 text-signal" aria-hidden="true" />
      </div>
      {regressions.length === 0 ? (
        <EmptyState
          title="No regressions saved"
          body="Save a completed mock run to create an in-memory regression artifact."
        />
      ) : (
        <div className="space-y-3">
          {regressions.map((regression) => {
            const isLastSaved = regression.id === lastSavedRegressionId;

            return (
              <article
                key={regression.id}
                className={`rounded-md border p-4 ${
                  isLastSaved
                    ? "border-signal bg-signal/10"
                    : "border-white/10 bg-white/[0.035]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {regression.name}
                  </h3>
                  <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200">
                    {regression.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {regression.description}
                </p>
                <div className="mt-3 rounded bg-black/30 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Mock replay command - future CLI
                  </p>
                  <code className="mt-1 block break-words text-xs text-signal">
                    {regression.replayCommand}
                  </code>
                </div>
                <dl className="mt-3 grid gap-2 text-xs text-slate-300">
                  <div className="flex justify-between gap-3">
                    <dt>Findings</dt>
                    <dd className="font-semibold text-white">
                      {regression.findingIds.length}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Trace events</dt>
                    <dd className="font-semibold text-white">
                      {regression.traceEventIds.length}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
