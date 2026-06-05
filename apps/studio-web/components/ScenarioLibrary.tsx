import type { ScenarioPack } from "@failsafe/schemas";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

type ScenarioLibraryProps = {
  packs: ScenarioPack[];
  selectedPackId: string;
  onSelect: (packId: string) => void;
};

const categoryLabel: Record<ScenarioPack["category"], string> = {
  prompt_injection: "Prompt injection",
  tool_poisoning: "Tool poisoning",
  approval_bypass: "Approval bypass",
  data_exfiltration: "Data exfiltration",
  scope_breach: "Scope breach",
  unsafe_execution: "Unsafe execution",
  task_drift: "Task drift",
  policy_gap: "Policy gap"
};

export function ScenarioLibrary({
  packs,
  selectedPackId,
  onSelect
}: ScenarioLibraryProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-signal">
            Scenario library
          </p>
          <h2 className="text-lg font-semibold text-white">Starter packs</h2>
        </div>
        <ShieldAlert className="h-5 w-5 text-warning" aria-hidden="true" />
      </div>
      <div className="space-y-3">
        {packs.map((pack) => {
          const selected = pack.id === selectedPackId;

          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => onSelect(pack.id)}
              className={`w-full rounded-md border p-4 text-left transition ${
                selected
                  ? "border-signal bg-signal/12"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{pack.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {categoryLabel[pack.category]} / {pack.difficulty}
                  </p>
                </div>
                {selected ? (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-signal"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="h-5 w-5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {pack.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
