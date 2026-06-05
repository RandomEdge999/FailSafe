import type { Finding, ScenarioPack, TraceEvent } from "@failsafe/schemas";
import { ClipboardList } from "lucide-react";

type FindingDetailPanelProps = {
  finding: Finding | null;
  scenarioPack: ScenarioPack | null;
  trace: TraceEvent[];
};

function suggestedRegressionName(finding: Finding, scenarioPack: ScenarioPack | null) {
  const packName = scenarioPack?.name ?? "Synthetic scenario";

  return `${packName}: ${finding.category.replaceAll("_", " ")} guardrail`;
}

function promptPreview(
  finding: Finding,
  scenarioPack: ScenarioPack | null,
  evidenceEvents: TraceEvent[]
) {
  return JSON.stringify(
    {
      promptFile: ".github/prompts/patch-guardrail.prompt.md",
      selectedFinding: {
        id: finding.id,
        category: finding.category,
        severity: finding.severity,
        confidence: finding.confidence,
        rootCause: finding.rootCause
      },
      evidence: evidenceEvents.map((event) => ({
        id: event.id,
        type: event.type,
        trustBoundary: event.trustBoundary,
        summary: event.summary
      })),
      allowedMitigationPatterns: scenarioPack?.mitigationPatterns ?? [
        "approval gates",
        "scope minimization",
        "metadata pinning",
        "provenance separation",
        "regression tests"
      ],
      phaseTwoConstraint:
        "No live code patch is executed from the UI in Phase 2."
    },
    null,
    2
  );
}

export function FindingDetailPanel({
  finding,
  scenarioPack,
  trace
}: FindingDetailPanelProps) {
  if (!finding) {
    return null;
  }

  const evidenceEvents = trace.filter((event) =>
    finding.evidenceEventIds.includes(event.id)
  );

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-signal/15 text-signal">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-signal">
            Finding detail
          </p>
          <h2 className="text-lg font-semibold text-white">{finding.title}</h2>
        </div>
      </div>
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-400">
            Finding ID
          </dt>
          <dd className="mt-1 text-white">{finding.id}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-400">
            Status
          </dt>
          <dd className="mt-1 text-white">{finding.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-400">
            Category
          </dt>
          <dd className="mt-1 text-white">{finding.category}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-400">
            Severity and confidence
          </dt>
          <dd className="mt-1 text-white">
            {finding.severity} / {finding.confidence}
          </dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            Description
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {finding.description}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            Root cause
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {finding.rootCause}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            Evidence event IDs
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {finding.evidenceEventIds.map((eventId) => (
              <span
                key={eventId}
                className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200"
              >
                {eventId}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            Recommended mitigations
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
            {finding.recommendedMitigations.map((mitigation) => (
              <li key={mitigation}>{mitigation}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-ink/70 p-4">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Suggested regression name
        </p>
        <p className="mt-1 text-sm font-semibold text-white">
          {suggestedRegressionName(finding, scenarioPack)}
        </p>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
          Generated Copilot prompt preview
        </p>
        <pre className="max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-slate-200">
          {promptPreview(finding, scenarioPack, evidenceEvents)}
        </pre>
      </div>
    </section>
  );
}
