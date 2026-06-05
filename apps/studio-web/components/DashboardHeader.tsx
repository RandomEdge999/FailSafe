"use client";

import { Bot, Play, Save, WandSparkles } from "lucide-react";

type DashboardHeaderProps = {
  isRunning: boolean;
  onRun: () => void;
};

export function DashboardHeader({ isRunning, onRun }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/10 bg-ink/80 px-5 py-5 backdrop-blur md:px-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-signal text-ink shadow-lab">
          <Bot className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-signal">
            Crash-test studio
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">FailSafe</h1>
          <p className="mt-1 text-sm text-slate-300">
            Crash-test AI agents before production does.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRun}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-semibold text-ink transition hover:bg-cyan-300"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {isRunning ? "Running..." : "Run Crash Test"}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <WandSparkles className="h-4 w-4" aria-hidden="true" />
          Fix with Copilot
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Regression
        </button>
      </div>
    </header>
  );
}
