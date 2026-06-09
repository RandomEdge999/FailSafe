import type { ScenarioRun, TraceEvent } from "@failsafe/schemas";
import { Activity, LockKeyhole, RadioTower, ShieldX } from "lucide-react";
import { EmptyState } from "./EmptyState";

type CrashTimelineProps = {
  run: ScenarioRun | null;
  selectedEventId?: string;
  onSelectEvent: (event: TraceEvent) => void;
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

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function CrashTimeline({
  run,
  selectedEventId,
  onSelectEvent
}: CrashTimelineProps) {
  if (!run) {
    return (
      <EmptyState
        title="No crash trace loaded"
        body="Run a starter pack to load the predefined mock timeline."
      />
    );
  }

  const selectedEvent =
    run.trace.find((event) => event.id === selectedEventId) ?? run.trace[0];

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
      {run.trace.length === 0 ? (
        <EmptyState
          title="Timeline is warming up"
          body="The local run has been queued and trace evidence will appear as the API lifecycle advances."
        />
      ) : null}
      <ol className="relative space-y-4">
        {run.trace.map((event, index) => {
          const Icon = iconForEvent(event.type);
          const selected = selectedEvent?.id === event.id;

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
              <button
                type="button"
                onClick={() => onSelectEvent(event)}
                className={`rounded-md border p-4 text-left transition ${
                  selected
                    ? "border-signal bg-signal/10"
                    : "border-white/10 bg-white/[0.035] hover:border-white/25"
                }`}
              >
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
                  <span>{event.inputSource}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      {selectedEvent ? (
        <div className="mt-5 rounded-md border border-white/10 bg-ink/70 p-4">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-signal">
                Event evidence
              </p>
              <h3 className="text-base font-semibold text-white">
                {selectedEvent.id}
              </h3>
            </div>
            <span
              className={`w-fit rounded px-2 py-1 text-xs font-semibold ${boundaryTone[selectedEvent.trustBoundary]}`}
            >
              {selectedEvent.trustBoundary}
            </span>
          </div>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">
                Type
              </dt>
              <dd className="mt-1 text-white">{selectedEvent.type}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">
                Actor
              </dt>
              <dd className="mt-1 text-white">{selectedEvent.actor}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">
                Input source
              </dt>
              <dd className="mt-1 text-white">{selectedEvent.inputSource}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">
                Timestamp
              </dt>
              <dd className="mt-1 text-white">
                {new Date(selectedEvent.timestamp).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">
                Parent event
              </dt>
              <dd className="mt-1 text-white">
                {selectedEvent.parentEventId ?? "none"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">
                Summary
              </dt>
              <dd className="mt-1 text-white">{selectedEvent.summary}</dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                Metadata
              </p>
              <pre className="max-h-72 overflow-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-slate-200">
                {prettyJson(selectedEvent.metadata)}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                Raw evidence
              </p>
              <pre className="max-h-72 overflow-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-slate-200">
                {prettyJson(selectedEvent.raw)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
