import type {
  Finding,
  PatchCoachPlan,
  ScenarioPack,
  TraceEvent
} from "@failsafe/schemas";
import { AlertTriangle, Loader2, ShieldCheck, WandSparkles } from "lucide-react";

type CopilotPromptPanelProps = {
  finding: Finding | null;
  error?: string | null;
  isOpen: boolean;
  isLoading?: boolean;
  plan?: PatchCoachPlan | null;
  scenarioPack: ScenarioPack | null;
  trace: TraceEvent[];
};

const safeMitigationPatterns = [
  "approval gates",
  "scope minimization",
  "metadata pinning",
  "provenance separation",
  "regression tests"
];

function buildPromptPayload(
  finding: Finding,
  scenarioPack: ScenarioPack | null,
  trace: TraceEvent[]
) {
  const evidence = trace
    .filter((event) => finding.evidenceEventIds.includes(event.id))
    .map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      trustBoundary: event.trustBoundary,
      inputSource: event.inputSource,
      summary: event.summary
    }));

  return JSON.stringify(
    {
      recommendedPromptFile: ".github/prompts/patch-guardrail.prompt.md",
      productMode: "local evidence crash-test studio",
      selectedScenarioPack: scenarioPack?.id,
      selectedFinding: {
        id: finding.id,
        title: finding.title,
        category: finding.category,
        severity: finding.severity,
        confidence: finding.confidence,
        description: finding.description,
        rootCause: finding.rootCause,
        recommendedMitigations: finding.recommendedMitigations
      },
      traceEvidenceSummary: evidence,
      allowedMitigationPatterns: safeMitigationPatterns,
      hardConstraints: [
        "Keep dangerous actions blocked or represented as reviewed local evidence.",
        "Do not add live external targets.",
        "Do not execute file, shell, network, email, or database actions from the UI.",
        "Add or update regression coverage for this local evidence failure."
      ]
    },
    null,
    2
  );
}

export function CopilotPromptPanel({
  error,
  finding,
  isOpen,
  isLoading = false,
  plan,
  scenarioPack,
  trace
}: CopilotPromptPanelProps) {
  if (!isOpen || !finding) {
    return null;
  }

  return (
    <section className="rounded-lg border border-signal/40 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-signal/15 text-signal">
          <WandSparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-signal">
            Fix with Copilot
          </p>
          <h2 className="text-lg font-semibold text-white">
            Prompt handoff preview
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            This panel shows what FailSafe would send to Copilot Agent Mode for
            a bounded defensive patch workflow.
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {isLoading ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-signal" />
              Building Patch Coach plan from the typed API contract.
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-slate-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p>{error}</p>
            </div>
          ) : null}
          <div className="rounded-md border border-white/10 bg-ink/70 p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Selected finding
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {finding.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {finding.rootCause}
            </p>
          </div>
          {plan ? (
            <div className="mt-4 rounded-md border border-signal/25 bg-signal/10 p-4">
              <p className="text-xs font-semibold uppercase text-signal">
                Patch Coach plan
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {plan.summary}
              </p>
              <div className="mt-4 grid gap-3">
                {plan.mitigationSteps.map((step) => (
                  <div key={step.id} className="rounded bg-black/25 p-3">
                    <p className="text-sm font-semibold text-white">
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      {step.rationale}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                      {step.implementationNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
              Prompt payload preview
            </p>
            <pre className="max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-slate-200">
              {plan
                ? JSON.stringify(plan.copilotPrompts, null, 2)
                : buildPromptPayload(finding, scenarioPack, trace)}
            </pre>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Prompt file recommendation
            </p>
            <p className="mt-2 break-words text-sm font-semibold text-white">
              {plan?.copilotPrompts[0]?.promptFile ??
                ".github/prompts/patch-guardrail.prompt.md"}
            </p>
          </div>
          {plan ? (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Regression checklist
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {plan.regressionChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-safe" aria-hidden="true" />
              Safe mitigation patterns
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {safeMitigationPatterns.map((pattern) => (
                <li key={pattern}>{pattern}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm font-semibold text-warning">
              No live code patch is executed from the UI.
            </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
              The workflow is a visible prompt handoff only. A developer still
              reviews and applies any future patch, and submitters disclose any
              real Copilot usage in their final entry.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
