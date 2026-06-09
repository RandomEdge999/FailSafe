"use client";

import Image from "next/image";
import { Play, Save, ShieldCheck, WandSparkles } from "lucide-react";

type DashboardHeaderProps = {
  canFix: boolean;
  canRun: boolean;
  canSave: boolean;
  isRunning: boolean;
  isSavingRegression: boolean;
  onFixWithCopilot: () => void;
  onRun: () => void;
  onSaveRegression: () => void;
  runStatus?: string;
};

export function DashboardHeader({
  canFix,
  canRun,
  canSave,
  isRunning,
  isSavingRegression,
  onFixWithCopilot,
  onRun,
  onSaveRegression,
  runStatus
}: DashboardHeaderProps) {
  const buttonDisabledClass =
    "disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500";

  return (
    <header className="relative overflow-hidden border-b border-cyan-300/15 bg-[#090f14]/92 px-5 py-5 backdrop-blur md:px-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="absolute right-8 top-0 hidden h-28 w-[34rem] bg-[url('/brand/crash-lab-hero.png')] bg-cover bg-center opacity-20 mix-blend-screen lg:block" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-cyan-300/30 bg-cyan-300/10 shadow-lab">
          <Image
            src="/brand/failsafe-logo.png"
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Crash-lab console
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">FailSafe</h1>
          <p className="mt-1 text-sm text-slate-300">
            Crash-test AI agents before production does. Foundry-ready,
            local-first, reviewed, and defensive.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canRun || isRunning}
          onClick={onRun}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-semibold text-ink transition hover:bg-cyan-300 ${buttonDisabledClass}`}
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {isRunning
            ? runStatus === "queued"
              ? "Queued..."
              : "Running..."
            : "Run Crash Test"}
        </button>
        <button
          type="button"
          disabled={!canFix}
          onClick={onFixWithCopilot}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 ${buttonDisabledClass}`}
        >
          <WandSparkles className="h-4 w-4" aria-hidden="true" />
          Fix with Copilot
        </button>
        <button
          type="button"
          disabled={!canSave || isSavingRegression}
          onClick={onSaveRegression}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 ${buttonDisabledClass}`}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSavingRegression ? "Saving..." : "Save Regression"}
        </button>
      </div>
      </div>
    </header>
  );
}
