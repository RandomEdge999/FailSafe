import type { ReplayComparison } from "@failsafe/schemas";
import {
  AlertTriangle,
  GitCompareArrows,
  Minus,
  ShieldCheck
} from "lucide-react";

type ReplayComparisonPanelProps = {
  comparison: ReplayComparison | null;
  error?: string | null;
  isLoading?: boolean;
};

function formatDelta(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function formatType(value: string) {
  return value.replaceAll("_", " ");
}

function DeltaCell({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  const tone =
    value === 0
      ? "text-slate-200"
      : value > 0
        ? "text-warning"
        : "text-signal";

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>
        {formatDelta(value)}
      </p>
    </div>
  );
}

function TypeList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-slate-400">
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        none
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200"
        >
          {formatType(item)}
        </span>
      ))}
    </div>
  );
}

export function ReplayComparisonPanel({
  comparison,
  error,
  isLoading = false
}: ReplayComparisonPanelProps) {
  if (!comparison && !isLoading && !error) {
    return null;
  }

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-signal">
            Mock deterministic replay
          </p>
          <h2 className="text-lg font-semibold text-white">
            Baseline vs replay
          </h2>
        </div>
        <GitCompareArrows className="h-5 w-5 text-signal" aria-hidden="true" />
      </div>

      {isLoading ? (
        <p className="text-sm leading-6 text-slate-300">
          Loading the in-memory replay comparison from the mock API.
        </p>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm leading-6 text-slate-200">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          <p>{error}</p>
        </div>
      ) : null}

      {comparison ? (
        <div className="space-y-4">
          <div className="grid gap-2 text-xs text-slate-300">
            <div className="flex justify-between gap-3">
              <dt>Baseline</dt>
              <dd className="break-all text-right font-semibold text-white">
                {comparison.baselineRunId}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Replay</dt>
              <dd className="break-all text-right font-semibold text-white">
                {comparison.replayRunId}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Scenario pack</dt>
              <dd className="break-all text-right font-semibold text-white">
                {comparison.scenarioPackId}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Status</dt>
              <dd className="text-right font-semibold text-white">
                {comparison.baselineStatus.replace("_", " ")} to{" "}
                {comparison.replayStatus.replace("_", " ")}
              </dd>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <DeltaCell label="Score delta" value={comparison.scoreDelta} />
            <DeltaCell
              label="Finding delta"
              value={comparison.findingCountDelta}
            />
            <DeltaCell
              label="Trace delta"
              value={comparison.traceEventCountDelta}
            />
          </div>

          <div className="grid gap-3 text-sm">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                Matching trace event types
              </p>
              <TypeList items={comparison.matchingTraceEventTypes} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                Missing expected trace event types
              </p>
              <TypeList items={comparison.missingExpectedTraceEventTypes} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                New replay trace event types
              </p>
              <TypeList items={comparison.newTraceEventTypes} />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-signal/25 bg-signal/10 p-3 text-sm leading-6 text-slate-200">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-signal"
              aria-hidden="true"
            />
            <p>
              This compares two synthetic mock runs. It does not prove a real
              mitigation worked. A future sandbox runner will compare
              patched-agent behavior.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
