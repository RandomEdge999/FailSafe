import type {
  FixtureReplayResult,
  SafetyReport,
  ScenarioRun
} from "@failsafe/schemas";
import {
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCcw,
  RotateCcw
} from "lucide-react";

type ReportPanelProps = {
  currentRun: ScenarioRun | null;
  error?: string | null;
  fixtureReplayResult: FixtureReplayResult | null;
  isCreating: boolean;
  isResetting: boolean;
  onCreateReport: () => void;
  onResetDemoData: () => void;
  report: SafetyReport | null;
  resetMessage?: string | null;
};

export function ReportPanel({
  currentRun,
  error,
  fixtureReplayResult,
  isCreating,
  isResetting,
  onCreateReport,
  onResetDemoData,
  report,
  resetMessage
}: ReportPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-signal">
            Reports and data
          </p>
          <h2 className="text-lg font-semibold text-white">Safety Card</h2>
        </div>
        <FileText className="h-5 w-5 text-signal" aria-hidden="true" />
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          disabled={!currentRun || isCreating}
          onClick={onCreateReport}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/8 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-4 w-4" aria-hidden="true" />
          )}
          {isCreating ? "Exporting..." : "Export Safety Card"}
        </button>
        <button
          type="button"
          disabled={isResetting}
          onClick={onResetDemoData}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/8 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          )}
          {isResetting ? "Resetting..." : "Reset Demo Data"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-slate-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p>{error}</p>
        </div>
      ) : null}

      {resetMessage ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-signal/25 bg-signal/10 p-3 text-sm leading-6 text-slate-200">
          <RefreshCcw className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
          <p>{resetMessage}</p>
        </div>
      ) : null}

      {fixtureReplayResult ? (
        <div className="mt-4 rounded-md border border-signal/25 bg-signal/10 p-3 text-sm leading-6 text-slate-200">
          Fixture replay produced run{" "}
          <code className="text-signal">
            {fixtureReplayResult.replayRun.id}
          </code>{" "}
          with score {fixtureReplayResult.replayRun.score.overall}. It used
          reviewed synthetic fixtures only.
        </div>
      ) : null}

      {report ? (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              App-owned export path
            </p>
            <code className="mt-1 block break-words text-xs text-signal">
              {report.appOwnedPath}
            </code>
          </div>
          <dl className="grid gap-2 text-xs text-slate-300">
            <div className="flex justify-between gap-3">
              <dt>Run</dt>
              <dd className="break-all text-right font-semibold text-white">
                {report.runId}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Fixture only</dt>
              <dd className="font-semibold text-white">
                {report.fixtureOnly ? "yes" : "no"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Format</dt>
              <dd className="font-semibold text-white">{report.format}</dd>
            </div>
          </dl>
          <pre className="max-h-72 overflow-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-slate-200">
            {report.content}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
