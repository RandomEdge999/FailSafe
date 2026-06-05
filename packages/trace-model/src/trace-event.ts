import { TraceEventSchema, type TraceEvent } from "@failsafe/schemas";

export function parseTraceEvent(event: unknown): TraceEvent {
  return TraceEventSchema.parse(event);
}

export function compareTraceEventsByTime(a: TraceEvent, b: TraceEvent): number {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}
