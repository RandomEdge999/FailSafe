import type { RegressionArtifact } from "@failsafe/schemas";
import { FlaskConical, Loader2, RefreshCcw, Save } from "lucide-react";
import { EmptyState } from "./EmptyState";

type RegressionPanelProps = {
  fixtureReplayingRegressionId?: string;
  regressions: RegressionArtifact[];
  lastFixtureReplayedRegressionId?: string;
  lastSavedRegressionId?: string;
  lastReplayedRegressionId?: string;
  onFixtureReplay: (regression: RegressionArtifact) => void;
  onReplayMock: (regression: RegressionArtifact) => void;
  replayingRegressionId?: string;
};

export function RegressionPanel({
  fixtureReplayingRegressionId,
  regressions,
  lastFixtureReplayedRegressionId,
  lastSavedRegressionId,
  lastReplayedRegressionId,
  onFixtureReplay,
  onReplayMock,
  replayingRegressionId
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
          body="Save a completed crash-test run to create a persisted local regression artifact."
        />
      ) : (
        <div className="space-y-3">
          {regressions.map((regression) => {
            const isLastSaved = regression.id === lastSavedRegressionId;
            const isLastReplayed = regression.id === lastReplayedRegressionId;
            const isLastFixtureReplayed =
              regression.id === lastFixtureReplayedRegressionId;
            const isReplaying = regression.id === replayingRegressionId;
            const isFixtureReplaying =
              regression.id === fixtureReplayingRegressionId;

            return (
              <article
                key={regression.id}
                className={`rounded-md border p-4 ${
                  isLastSaved || isLastReplayed
                    ? "border-signal bg-signal/10"
                    : "border-white/10 bg-white/[0.035]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {regression.name}
                      </h3>
                      <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200">
                        {regression.status}
                      </span>
                      {isLastReplayed ? (
                        <span className="rounded bg-signal/20 px-2 py-1 text-xs font-semibold text-signal">
                          replayed
                        </span>
                      ) : null}
                      {isLastFixtureReplayed ? (
                        <span className="rounded bg-signal/20 px-2 py-1 text-xs font-semibold text-signal">
                          fixture replayed
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!regression.mockReplayable || isReplaying}
                      onClick={() => onReplayMock(regression)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                    >
                      {isReplaying ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <RefreshCcw
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      )}
                      {isReplaying ? "Replaying..." : "Replay Mock"}
                    </button>
                    <button
                      type="button"
                      disabled={isFixtureReplaying}
                      onClick={() => onFixtureReplay(regression)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-signal/25 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal transition hover:bg-signal/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                    >
                      {isFixtureReplaying ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <FlaskConical
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      )}
                      {isFixtureReplaying
                        ? "Running..."
                        : "Fixture Replay"}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {regression.description}
                </p>
                <div className="mt-3 rounded bg-black/30 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Mock replay endpoint
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
                  <div className="flex justify-between gap-3">
                    <dt>Engine</dt>
                    <dd className="break-all text-right font-semibold text-white">
                      {regression.scenarioVersion}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Replayable</dt>
                    <dd className="font-semibold text-white">
                      {regression.mockReplayable ? "yes" : "no"}
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
