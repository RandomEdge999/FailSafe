import type { Finding } from "@failsafe/schemas";
import { AlertOctagon } from "lucide-react";

type FindingCardProps = {
  finding: Finding;
};

const severityClass: Record<Finding["severity"], string> = {
  info: "text-signal",
  low: "text-safe",
  medium: "text-warning",
  high: "text-danger",
  critical: "text-white bg-danger"
};

export function FindingCard({ finding }: FindingCardProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-danger/15 text-danger">
          <AlertOctagon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              {finding.title}
            </h3>
            <span
              className={`rounded px-2 py-1 text-xs font-semibold ${severityClass[finding.severity]}`}
            >
              {finding.severity}
            </span>
            <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200">
              {finding.confidence} confidence
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {finding.description}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Root cause
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {finding.rootCause}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Mitigations
              </p>
              <ul className="mt-1 space-y-1 text-sm leading-6 text-slate-300">
                {finding.recommendedMitigations.map((mitigation) => (
                  <li key={mitigation}>{mitigation}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
