import type { ScenarioRun, TraceEvent } from "@failsafe/schemas";
import { Activity, LockKeyhole, RadioTower, ShieldX } from "lucide-react";
import { EmptyState } from "./EmptyState";

type CrashTimelineProps = {
  run: ScenarioRun | null;
};

const boundaryTone: Record<TraceEvent["trustBoundary"], string> = {
  system: "bg-signal text-ink",
  developer: "bg-cyan-300 text-ink",
  user: "bg-blue-300 text-ink",
  repository: "bg-violet-300 text-ink",
  mcp_metadata: "bg-warning text-ink",
  retrieved_content: "bg-orange-300 text-ink",
  tool_output: "bg-lime-300 text-ink",
  external_network: "bg-danger text-white",
  sandbox_runtime: "bg-white text-ink"
};

function iconForEvent(type: TraceEvent["type"]) {
  if (type === "policy_violation") {
    return ShieldX;
  }

  if (type === "approval_requested" || type === "approval_skipped") {
    return LockKeyhole;
  }

  if (type === "tool_discovered" || type === "tool_invoked") {
    return RadioTower;
  }

  return Activity;
}

export function CrashTimeline({ run }: CrashTimelineProps) {
  if (!run) {
    return (
      <EmptyState
        title="No crash trace loaded"
        body="Run a starter pack to load the predefined mock timeline."
      />
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-signal">
            Crash timeline
          </p>
          <h2 className="text-lg font-semibold text-white">
            Run {run.id.replace("run-demo-", "")}
          </h2>
        </div>
        <p className="text-sm text-slate-400">{run.status.replace("_", " ")}</p>
      </div>
      <ol className="relative space-y-4">
        {run.trace.map((event, index) => {
          const Icon = iconForEvent(event.type);

          return (
            <li key={event.id} className="grid grid-cols-[2rem_1fr] gap-3">
              <div className="flex flex-col items-center">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-rail text-signal">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                {index < run.trace.length - 1 ? (
                  <div className="mt-2 h-full min-h-10 w-px bg-white/10" />
                ) : null}
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {event.summary}
                  </span>
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${boundaryTone[event.trustBoundary]}`}
                  >
                    {event.trustBoundary}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>{event.type}</span>
                  <span>{event.actor}</span>
                  <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
