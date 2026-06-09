"use client";

import Image from "next/image";
import { Play, Save, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";

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
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm md:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-100 bg-brand-50 shadow-sm">
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
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-brand-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Agent safety operations
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">FailSafe</h1>
          <p className="mt-1 text-sm text-slate-600">
            Crash-test AI agents before production does. Foundry-ready,
            local-first, evidence-driven, and defensive.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="hidden min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 md:inline-flex">
          <Sparkles className="h-4 w-4 text-brand-700" aria-hidden="true" />
          Local evidence only
        </div>
        <button
          type="button"
          disabled={!canRun || isRunning}
          onClick={onRun}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 ${buttonDisabledClass}`}
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
          className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 ${buttonDisabledClass}`}
        >
          <WandSparkles className="h-4 w-4" aria-hidden="true" />
          Fix with Copilot
        </button>
        <button
          type="button"
          disabled={!canSave || isSavingRegression}
          onClick={onSaveRegression}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 ${buttonDisabledClass}`}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSavingRegression ? "Saving..." : "Save Regression"}
        </button>
      </div>
      </div>
    </header>
  );
}
