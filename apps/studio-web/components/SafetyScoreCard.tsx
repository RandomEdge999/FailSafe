import type { CrashScore } from "@failsafe/schemas";
import { Gauge } from "lucide-react";

type SafetyScoreCardProps = {
  score: CrashScore;
};

function scoreTone(score: number) {
  if (score >= 80) {
    return "text-safe";
  }

  if (score >= 55) {
    return "text-warning";
  }

  return "text-danger";
}

export function SafetyScoreCard({ score }: SafetyScoreCardProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-signal">
            FailSafe score
          </p>
          <div className="mt-2 flex items-end gap-3">
            <Gauge className="mb-2 h-8 w-8 text-signal" aria-hidden="true" />
            <span className={`text-5xl font-bold ${scoreTone(score.overall)}`}>
              {score.overall}
            </span>
            <span className="pb-2 text-sm text-slate-400">/ 100</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            {score.summary}
          </p>
        </div>
        <div className="grid min-w-64 gap-3 text-sm">
          {[
            ["Attack success", score.attackSuccessRate],
            ["Task utility", score.taskUtility],
            ["Severity", score.severity],
            ["Scope breach", score.scopeBreach],
            ["Repeatability", score.repeatabilityPenalty],
            ["Explanation confidence", score.explanationConfidence]
          ].map(([label, value]) => {
            const numericValue = Number(value);

            return (
              <div key={String(label)}>
                <div className="mb-1 flex justify-between gap-3">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-semibold text-white">
                    {Math.round(numericValue * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-white/10">
                  <div
                    className="h-full rounded bg-signal"
                    style={{ width: `${Math.round(numericValue * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
