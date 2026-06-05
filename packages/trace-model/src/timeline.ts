import type { TraceEvent } from "@failsafe/schemas";
import { compareTraceEventsByTime } from "./trace-event";

export type TimelineSegment = {
  id: string;
  event: TraceEvent;
  children: TraceEvent[];
};

export function buildTimeline(events: TraceEvent[]): TimelineSegment[] {
  const eventsByParent = new Map<string, TraceEvent[]>();

  for (const event of events) {
    if (!event.parentEventId) {
      continue;
    }

    const children = eventsByParent.get(event.parentEventId) ?? [];
    children.push(event);
    eventsByParent.set(event.parentEventId, children);
  }

  return events
    .filter((event) => !event.parentEventId)
    .sort(compareTraceEventsByTime)
    .map((event) => ({
      id: event.id,
      event,
      children: (eventsByParent.get(event.id) ?? []).sort(compareTraceEventsByTime)
    }));
}
