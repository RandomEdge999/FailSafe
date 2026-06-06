import {
  Brain,
  Database,
  FileX,
  Lock,
  Mail,
  Network,
  Plug,
  ShieldCheck,
  Terminal
} from "lucide-react";

const runnerRows = [
  {
    label: "Real sandbox execution",
    value: "not implemented",
    tone: "text-warning",
    icon: Lock
  },
  {
    label: "File writes",
    value: "blocked",
    tone: "text-danger",
    icon: FileX
  },
  {
    label: "Shell commands",
    value: "blocked",
    tone: "text-danger",
    icon: Terminal
  },
  {
    label: "Network requests",
    value: "blocked",
    tone: "text-danger",
    icon: Network
  },
  {
    label: "MCP execution",
    value: "not implemented",
    tone: "text-warning",
    icon: Plug
  },
  {
    label: "LLM calls",
    value: "not implemented",
    tone: "text-warning",
    icon: Brain
  },
  {
    label: "Email actions",
    value: "blocked",
    tone: "text-danger",
    icon: Mail
  },
  {
    label: "Database actions",
    value: "blocked",
    tone: "text-danger",
    icon: Database
  }
];

export function RunnerReadinessPanel() {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-lab">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-signal">
            Runner readiness
          </p>
          <h2 className="text-lg font-semibold text-white">
            Dry-run contract only
          </h2>
        </div>
        <ShieldCheck className="h-5 w-5 text-signal" aria-hidden="true" />
      </div>

      <dl className="space-y-0 text-sm">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <dt className="text-slate-400">Allowed current mode</dt>
          <dd className="text-right font-semibold text-white">
            mock + dry_run policy preview
          </dd>
        </div>
        {runnerRows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-b-0 last:pb-0"
            >
              <dt className="flex min-w-0 items-center gap-2 text-slate-400">
                <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span>{row.label}</span>
              </dt>
              <dd className={`text-right font-semibold ${row.tone}`}>
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
        FailSafe can model runner policy decisions, but it does not execute
        untrusted code in Phase 3A.
      </p>
    </section>
  );
}
