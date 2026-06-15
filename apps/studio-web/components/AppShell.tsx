"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FoundryAgentManifestSchema,
  ImportAgentEvidenceInputSchema
} from "@failsafe/schemas";
import type {
  AgentEvidenceCapture,
  AgentTrustBoundary,
  AgentTrustBoundaryMap,
  CrashScore,
  Finding,
  FixtureReplayResult,
  FoundryAgentImport,
  FoundryReadinessResult,
  PatchCoachPlan,
  Project,
  RegressionArtifact,
  ReplayComparison,
  SafetyReport,
  ScenarioPack,
  ScenarioRun,
  TraceEvent
} from "@failsafe/schemas";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Brain,
  Cable,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  Clock,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  FileX,
  FlaskConical,
  Gauge,
  GitBranch,
  Grid2X2,
  Info,
  List,
  ListFilter,
  Loader2,
  Lock,
  Mail,
  Menu,
  Network,
  PanelRight,
  Play,
  Plug,
  RefreshCcw,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Terminal,
  Upload,
  WandSparkles,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  createMockRun,
  createPatchCoachPlan,
  createSafetyReport,
  getAgentTrustMap,
  getFoundryReadiness,
  getHealth,
  getRun,
  getRunComparison,
  importFoundryManifest,
  importAgentEvidence,
  importSampleEvidence,
  listAgents,
  listEvidenceCaptures,
  listProjects,
  listRegressions,
  listRuns,
  listScenarios,
  replayFixtureRegression,
  replayMockRegression,
  resetDemoData,
  runAgentCrashTest,
  runAgentFixtureReplay,
  runEvidenceCrashTest,
  saveRegression
} from "../lib/api-client";

type StudioView = "foundry" | "crash" | "patch" | "safety";
type MobilePanel = "nav" | "inspector" | null;
type DetailMode =
  | "timeline"
  | "prompt"
  | "plan"
  | "artifacts"
  | "findings"
  | null;
type ArtifactTab = "regressions" | "handoffs" | "drafts";

const studioViews: Array<{
  id: StudioView;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "foundry", label: "Foundry evidence", icon: Grid2X2 },
  { id: "crash", label: "Crash test", icon: FlaskConical },
  { id: "patch", label: "Patch and regression", icon: WandSparkles },
  { id: "safety", label: "Safety card", icon: FileText }
];

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

const severityTone: Record<Finding["severity"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
  critical: "border-red-300 bg-red-100 text-red-800"
};

const riskTone: Record<AgentTrustBoundary["riskLevel"], string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
  critical: "border-red-300 bg-red-100 text-red-800"
};

const eventIconMap: Partial<Record<TraceEvent["type"], LucideIcon>> = {
  project_imported: FileText,
  tool_discovered: FileJson,
  prompt_assembled: Sparkles,
  untrusted_content_loaded: AlertTriangle,
  model_response: Activity,
  approval_requested: Lock,
  approval_skipped: ShieldAlert,
  tool_invoked: Plug,
  tool_result: ShieldCheck,
  policy_violation: ShieldX,
  finding_created: Shield,
  mitigation_suggested: WandSparkles,
  regression_saved: Save
};

const boundaryTone: Record<TraceEvent["trustBoundary"], string> = {
  system: "border-blue-200 bg-blue-50 text-blue-700",
  developer: "border-cyan-200 bg-cyan-50 text-cyan-700",
  user: "border-indigo-200 bg-indigo-50 text-indigo-700",
  repository: "border-slate-200 bg-slate-50 text-slate-700",
  mcp_metadata: "border-violet-200 bg-violet-50 text-violet-700",
  retrieved_content: "border-orange-200 bg-orange-50 text-orange-700",
  tool_output: "border-emerald-200 bg-emerald-50 text-emerald-700",
  external_network: "border-red-200 bg-red-50 text-red-700",
  sandbox_runtime: "border-amber-200 bg-amber-50 text-amber-700"
};

const runnerRows = [
  ["Shell commands", "Blocked", "No shell, MCP, email, DB, or live tool execution", Terminal],
  ["Network requests", "Blocked", "Outbound network disabled", Network],
  ["MCP execution", "Blocked", "MCP server execution disabled", Plug],
  ["LLM calls", "Blocked", "No live model calls", Brain],
  ["Email actions", "Blocked", "No email send", Mail],
  ["Database actions", "Blocked", "No DB read/write", Database],
  ["File writes", "Blocked", "File system write disabled", FileX],
  ["Real sandbox execution", "Blocked", "No arbitrary tool execution", Lock],
  ["Reviewed fixture replay", "Allowed", "Synthetic fixture replay only", ShieldCheck]
] satisfies Array<[string, "Blocked" | "Allowed", string, LucideIcon]>;

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "FailSafe local API hit an unexpected error.";
}

async function readJsonFile(file: File) {
  const content = await file.text();

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error(`${file.name} is not valid JSON.`);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isRunInProgress(run: ScenarioRun | null) {
  return run?.status === "queued" || run?.status === "running";
}

function terminalRunReady(run: ScenarioRun | null) {
  return Boolean(run && !isRunInProgress(run));
}

function regressionName(
  finding: Finding | null,
  selectedPack: ScenarioPack | null
) {
  if (!finding) {
    return selectedPack
      ? `${selectedPack.name}: full trace regression`
      : "FailSafe trace regression";
  }

  return `${selectedPack?.name ?? "Synthetic scenario"}: ${finding.category.replaceAll("_", " ")} guardrail`;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value?: string) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function formatDuration(run: ScenarioRun | null) {
  if (!run?.startedAt || !run.completedAt) {
    return "in progress";
  }

  const ms = Math.max(0, Date.parse(run.completedAt) - Date.parse(run.startedAt));
  if (ms < 60_000) {
    return `${Math.round(ms / 1000)}s`;
  }

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function scoreRisk(score?: number) {
  if (score === undefined) {
    return "No score";
  }

  if (score >= 80) {
    return "Low risk";
  }

  if (score >= 55) {
    return "Medium risk";
  }

  return "High risk";
}

function formatScore(score?: number) {
  if (score === undefined) {
    return "--";
  }

  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function scoreMetricValue(value: number) {
  return Math.round(value * 100);
}

function currentMode(run: ScenarioRun | null) {
  if (!run) {
    return "No run loaded";
  }

  if (run.id.startsWith("run-evidence-")) {
    return "Recorded evidence";
  }

  if (run.id.startsWith("run-foundry-fixture") || run.id.startsWith("run-fixture-")) {
    return "Reviewed fixture replay";
  }

  if (run.id.startsWith("run-foundry-")) {
    return "Foundry manifest";
  }

  if (run.baselineRunId) {
    return "Sample Lab replay";
  }

  return "Sample Lab";
}

function latestRun(runs: ScenarioRun[]) {
  return runs.reduce<ScenarioRun | null>((selected, run) => {
    if (!selected) {
      return run;
    }

    const runTime = Date.parse(run.completedAt ?? run.startedAt);
    const selectedTime = Date.parse(selected.completedAt ?? selected.startedAt);

    if (!Number.isFinite(runTime) || !Number.isFinite(selectedTime)) {
      return run;
    }

    return runTime >= selectedTime ? run : selected;
  }, null);
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function selectedEventForRun(run: ScenarioRun | null, selectedEventId?: string) {
  if (!run || run.trace.length === 0) {
    return null;
  }

  return (
    run.trace.find((event) => event.id === selectedEventId) ??
    run.trace.find((event) => event.type === "policy_violation") ??
    run.trace.at(-1) ??
    run.trace[0] ??
    null
  );
}

function summaryText(
  project: Project | null,
  selectedPack: ScenarioPack | null,
  run: ScenarioRun | null
) {
  return `Active pack: ${selectedPack?.name ?? "none selected"}. ${project?.name ?? "FailSafe"} uses reviewed local evidence and app-owned fixture replay only. ${run ? `${run.findings.length} finding${run.findings.length === 1 ? "" : "s"} currently recorded.` : "No current run is loaded."}`;
}

function fallbackSafetyMarkdown(
  project: Project | null,
  run: ScenarioRun | null,
  selectedPack: ScenarioPack | null
) {
  return [
    "# FailSafe Safety Card",
    "",
    `**Project:** ${project?.name ?? "FailSafe local project"}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Mode:** ${currentMode(run)}`,
    "",
    "## Summary",
    "- Only reviewed synthetic fixture replay is enabled.",
    "- Arbitrary execution is blocked.",
    "- No live tools, no network, no writes.",
    "",
    "## Runner Capabilities",
    ...(runnerRows.map(
      ([label, status, note]) => `- ${label}: ${status} - ${note}`
    )),
    "",
    "## Scenario",
    `- ${selectedPack?.name ?? "No scenario selected"}`
  ].join("\n");
}

function buildRootCauseCards(
  selectedFinding: Finding | null,
  run: ScenarioRun | null
) {
  const primaryTitle =
    selectedFinding?.title ?? "Recorded agent evidence needs runtime guardrail review";
  const evidenceCount = selectedFinding?.evidenceEventIds.length ?? run?.trace.length ?? 0;

  return [
    {
      id: selectedFinding?.id ?? "primary-root-cause",
      severity: selectedFinding?.severity ?? "high",
      title: primaryTitle,
      count: evidenceCount
    },
    {
      id: "tool-description",
      severity: "medium" as Finding["severity"],
      title: "Tool description exposes excessive capabilities",
      count: Math.max(1, Math.min(3, run?.trace.length ?? 3))
    },
    {
      id: "approval-gate",
      severity: "low" as Finding["severity"],
      title: "Human approval gate not enforced",
      count: 2
    },
    {
      id: "prompt-isolation",
      severity: "low" as Finding["severity"],
      title: "Indirect prompt content not isolated",
      count: 1
    }
  ];
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Chip({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-6 items-center rounded-md border px-2 text-[11px] font-semibold leading-none",
        className
      )}
    >
      {children}
    </span>
  );
}

function SectionLabel({
  children,
  className = "",
  icon: Icon
}: {
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <p
      className={classNames(
        "flex items-center gap-2 text-[11px] font-bold uppercase tracking-normal text-[#075ec8]",
        className
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}

function Panel({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "min-w-0 rounded-lg border border-[#d9e4f2] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.035)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function CommandButton({
  children,
  disabled,
  icon: Icon,
  onClick,
  primary = false
}: {
  children: React.ReactNode;
  disabled?: boolean;
  icon: LucideIcon;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-[#d9e4f2] disabled:bg-[#f4f7fb] disabled:text-[#93a5bd]",
        primary
          ? "border-[#075ec8] bg-[#075ec8] text-white shadow-[0_8px_18px_rgba(7,94,200,0.22)] hover:bg-[#0756b8]"
          : "border-[#d0dbea] bg-white text-[#111d3a] hover:bg-[#f6f9fe]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </button>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-lg border border-[#d0dbea] bg-white text-[#13213d] transition hover:bg-[#f6f9fe]"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function AppCommandBar({
  activeView,
  canFix,
  canRun,
  canSave,
  isRunning,
  isSavingRegression,
  onFix,
  onHome,
  onMenu,
  onOpenInspector,
  onRun,
  onSave,
  runStatus
}: {
  activeView: StudioView;
  canFix: boolean;
  canRun: boolean;
  canSave: boolean;
  isRunning: boolean;
  isSavingRegression: boolean;
  onFix: () => void;
  onHome: () => void;
  onMenu: () => void;
  onOpenInspector: () => void;
  onRun: () => void;
  onSave: () => void;
  runStatus?: string;
}) {
  return (
    <header className="sticky top-0 z-30 h-[68px] border-b border-[#d8e2ef] bg-white px-4 md:px-8">
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#d0dbea] text-[#13213d] xl:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex min-w-0 items-center gap-3 rounded-lg text-left transition hover:bg-[#f4f8fd] focus-visible:outline-offset-4"
            aria-label="Go to Foundry evidence"
          >
            <Image
              src="/brand/failsafe-logo.png"
              alt=""
              width={42}
              height={42}
              className="h-10 w-10 shrink-0"
              priority
            />
            <h1 className="truncate pr-2 text-2xl font-semibold leading-none text-[#071437]">
              FailSafe
            </h1>
          </button>
        </div>

        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d0dbea] bg-white px-4 text-sm font-semibold text-[#111d3a]">
            <Sparkles className="h-4 w-4 text-[#075ec8]" aria-hidden="true" />
            Local evidence only
          </div>
          <CommandButton
            disabled={!canRun || isRunning}
            icon={isRunning ? Loader2 : Play}
            onClick={onRun}
            primary
          >
            {isRunning
              ? runStatus === "queued"
                ? "Queued..."
                : "Running..."
              : "Run Crash Test"}
          </CommandButton>
          <CommandButton disabled={!canFix} icon={WandSparkles} onClick={onFix}>
            Fix with Copilot
          </CommandButton>
          <CommandButton
            disabled={!canSave || isSavingRegression}
            icon={Save}
            onClick={onSave}
          >
            {isSavingRegression ? "Saving..." : "Save Regression"}
          </CommandButton>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <CommandButton
            disabled={!canRun || isRunning}
            icon={isRunning ? Loader2 : Play}
            onClick={onRun}
            primary
          >
            Run
          </CommandButton>
          <IconButton
            icon={PanelRight}
            label="Open inspector"
            onClick={onOpenInspector}
          />
        </div>
      </div>
      <div className="sr-only">Active view: {activeView}</div>
    </header>
  );
}

function Sidebar({
  activeView,
  onExpandLibrary,
  onSelectPack,
  onSetView,
  packs,
  selectedPackId
}: {
  activeView: StudioView;
  onExpandLibrary: () => void;
  onSelectPack: (packId: string) => void;
  onSetView: (view: StudioView) => void;
  packs: ScenarioPack[];
  selectedPackId: string;
}) {
  return (
    <aside className="flex min-h-full flex-col border-r border-[#d8e2ef] bg-white px-5 pb-5 pt-6">
      <nav aria-label="Studio views" className="space-y-2">
        {studioViews.map((view) => {
          const Icon = view.icon;
          const selected = activeView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onSetView(view.id)}
              aria-current={selected ? "page" : undefined}
              className={classNames(
                "flex h-[42px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition",
                selected
                  ? "bg-[#eaf4ff] text-[#075ec8]"
                  : "text-[#14213f] hover:bg-[#f4f8fd]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{view.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="my-5 h-px bg-[#d8e2ef]" />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <SectionLabel>Scenario library</SectionLabel>
          <Shield className="h-5 w-5 text-[#f0a202]" aria-hidden="true" />
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {packs.slice(0, 3).map((pack) => {
            const selected = pack.id === selectedPackId;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => onSelectPack(pack.id)}
                className={classNames(
                  "w-full rounded-lg border bg-white p-4 text-left transition",
                  selected
                    ? "border-[#c7d9ee] shadow-[0_8px_22px_rgba(7,94,200,0.04)]"
                    : "border-[#d9e4f2] hover:bg-[#f8fbff]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#071437]">
                      {pack.name}
                    </p>
                    <p className="mt-2 text-xs text-[#53637d]">
                      {categoryLabel[pack.category]} / {pack.difficulty}
                    </p>
                  </div>
                  {selected ? (
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 text-[#075ec8]"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertTriangle
                      className="h-5 w-5 shrink-0 text-[#f0a202]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="mt-3 line-clamp-4 text-[13px] leading-6 text-[#1f3154]">
                  {pack.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onExpandLibrary}
        className="mt-5 flex h-10 items-center gap-3 rounded-lg px-2 text-sm font-semibold text-[#13213d] hover:bg-[#f4f8fd]"
      >
        <ChevronDown className="h-4 w-4 rotate-90" aria-hidden="true" />
        Expand library
      </button>
    </aside>
  );
}

function ScenarioLibraryDrawer({
  onClose,
  onSelectPack,
  packs,
  selectedPackId
}: {
  onClose: () => void;
  onSelectPack: (packId: string) => void;
  packs: ScenarioPack[];
  selectedPackId: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#071437]/30 p-4 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-[680px] flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#d9e4f2] px-5">
          <div>
            <SectionLabel icon={Shield}>Scenario library</SectionLabel>
            <p className="mt-1 text-sm font-semibold text-[#071437]">
              {packs.length} reviewed defensive packs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f4f8fd]"
            aria-label="Close scenario library"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="pane-scroll min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            {packs.map((pack) => {
              const selected = pack.id === selectedPackId;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => {
                    onSelectPack(pack.id);
                    onClose();
                  }}
                  className={classNames(
                    "rounded-lg border bg-white p-4 text-left transition",
                    selected
                      ? "border-[#075ec8] bg-[#f0f6ff] shadow-[0_0_0_1px_rgba(7,94,200,0.16)]"
                      : "border-[#d9e4f2] hover:bg-[#f8fbff]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-5 text-[#071437]">
                        {pack.name}
                      </p>
                      <p className="mt-2 text-xs text-[#53637d]">
                        {categoryLabel[pack.category]} / {pack.difficulty}
                      </p>
                    </div>
                    {selected ? (
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 text-[#075ec8]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-[#1f3154]">
                    {pack.description}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[#075ec8]">
                    {pack.threatModel}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectorCard({
  children,
  icon: Icon,
  title
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-[#071437]">
        <Icon className="h-4 w-4 text-[#075ec8]" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

function RiskInspectorPanel({
  activeView,
  currentRun,
  isCreatingReport,
  isResetting,
  onCreateReport,
  onOpenSafety,
  onResetDemoData,
  project,
  reportError,
  resetMessage,
  selectedFinding,
  selectedPack
}: {
  activeView: StudioView;
  currentRun: ScenarioRun | null;
  isCreatingReport: boolean;
  isResetting: boolean;
  onCreateReport: () => void;
  onOpenSafety: () => void;
  onResetDemoData: () => void;
  project: Project | null;
  reportError: string | null;
  resetMessage: string | null;
  selectedFinding: Finding | null;
  selectedPack: ScenarioPack | null;
}) {
  const score = currentRun?.score;

  return (
    <aside
      className="pane-scroll flex min-h-full flex-col gap-4 overflow-y-auto border-l border-[#d8e2ef] bg-white p-4 xl:max-h-[calc(100vh-68px)]"
      data-testid="risk-inspector-scroll"
    >
      <Panel className="shrink-0 p-4">
        <div className="flex items-center justify-between">
          <SectionLabel icon={ShieldCheck}>Risk inspector</SectionLabel>
          <ChevronDown className="h-4 w-4 rotate-180 text-[#071437]" aria-hidden="true" />
        </div>
      </Panel>

      {activeView === "crash" && score ? (
        <InspectorCard icon={Gauge} title="FailSafe Score">
          <div className="flex items-end justify-between gap-3">
            <div className="text-4xl font-bold tracking-normal text-[#071437]">
              {formatScore(score.overall)}
              <span className="ml-1 text-base font-medium text-[#53637d]">
                / 100
              </span>
            </div>
            <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700">
              {scoreRisk(score.overall)}
            </Chip>
          </div>
          <ScoreBars score={score} compact />
        </InspectorCard>
      ) : null}

      <div className="space-y-4">
        <InspectorCard icon={GitBranch} title="Project surface">
          <MetricList
            rows={[
              ["Agent targets", String(project?.agentTargets.length ?? 0)],
              ["Tools", String(project?.tools.length ?? 0)],
              [
                "Highest tool risk",
                project?.riskProfile.highestToolRisk ?? "unknown",
                "text-[#ff6b00]"
              ]
            ]}
          />
        </InspectorCard>
        <InspectorCard icon={FileJson} title="Active pack">
          <p className="text-sm leading-6 text-[#25385e]">
            {selectedPack?.threatModel ?? "No scenario pack is selected."}
          </p>
        </InspectorCard>
        <InspectorCard icon={ShieldCheck} title="Current run">
          <MetricList
            rows={[
              ["Findings", String(currentRun?.findings.length ?? 0)],
              [
                "Approval coverage",
                `${Math.round((project?.riskProfile.approvalCoverage ?? 0) * 100)}%`
              ],
              ["Mode", currentMode(currentRun)]
            ]}
          />
        </InspectorCard>
        {activeView === "crash" && selectedFinding ? (
          <InspectorCard icon={ClipboardList} title="Finding detail">
            <MetricList
              rows={[
                ["Finding", selectedFinding.title],
                ["Category", selectedFinding.category],
                ["Severity", titleCase(selectedFinding.severity)],
                ["Status", titleCase(selectedFinding.status)]
              ]}
            />
            <div className="mt-4 border-t border-[#d9e4f2] pt-4">
              <p className="text-xs font-semibold text-[#53637d]">Impact</p>
              <p className="mt-2 text-sm leading-6 text-[#25385e]">
                {selectedFinding.description}
              </p>
            </div>
            <div className="mt-4 border-t border-[#d9e4f2] pt-4">
              <p className="text-xs font-semibold text-[#53637d]">
                Recommended action
              </p>
              <p className="mt-2 text-sm leading-6 text-[#25385e]">
                {selectedFinding.recommendedMitigations[0] ??
                  "Review recorded evidence and tighten runtime policies."}
              </p>
            </div>
          </InspectorCard>
        ) : null}
        <InspectorCard icon={ShieldCheck} title="Safety boundary">
          <p className="text-sm leading-6 text-[#25385e]">
            The primary workflow uses reviewed manifests, recorded evidence,
            and app-owned fixtures. Live Foundry execution, MCP calls, shell
            commands, arbitrary files, email, databases, and external targets
            remain disabled.
          </p>
        </InspectorCard>
        <InspectorCard icon={FileText} title="Safety card">
          <div className="grid gap-3">
            <CommandButton
              disabled={!currentRun || isCreatingReport}
              icon={isCreatingReport ? Loader2 : FileText}
              onClick={onCreateReport}
            >
              {isCreatingReport ? "Exporting..." : "Export Safety Card"}
            </CommandButton>
            <CommandButton
              disabled={isResetting}
              icon={isResetting ? Loader2 : RotateCcw}
              onClick={onResetDemoData}
            >
              {isResetting ? "Resetting..." : "Reset Local Evidence"}
            </CommandButton>
            <button
              type="button"
              onClick={onOpenSafety}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d0dbea] bg-white text-sm font-semibold text-[#25385e] hover:bg-[#f6f9fe]"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Open in Safety Card
            </button>
          </div>
          {reportError ? (
            <p className="mt-3 text-xs leading-5 text-red-700">{reportError}</p>
          ) : null}
          {resetMessage ? (
            <p className="mt-3 text-xs leading-5 text-emerald-700">
              {resetMessage}
            </p>
          ) : null}
        </InspectorCard>
      </div>

      <p className="px-1 text-xs leading-5 text-[#25385e]">
        {summaryText(project, selectedPack, currentRun)}
      </p>
    </aside>
  );
}

function MetricList({
  rows
}: {
  rows: Array<[string, string, string?]>;
}) {
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, value, tone]) => (
        <div key={label} className="flex min-w-0 justify-between gap-3">
          <dt className="shrink-0 text-[#53637d]">{label}</dt>
          <dd
            className={classNames(
              "min-w-0 break-words text-right font-bold text-[#071437]",
              tone
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatCard({
  body,
  icon: Icon,
  label,
  value
}: {
  body: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Panel className="p-4">
      <SectionLabel icon={Icon}>{label}</SectionLabel>
      <p className="mt-3 break-words text-xl font-semibold leading-7 text-[#071437]">
        {value}
      </p>
      <p className="mt-2 break-words text-sm leading-5 text-[#53637d]">{body}</p>
    </Panel>
  );
}

function FoundryHero({
  isImporting,
  isImportingEvidence,
  onImportEvidence,
  onImportManifest,
  onImportSampleEvidence,
  onImportSampleManifest
}: {
  isImporting: boolean;
  isImportingEvidence: boolean;
  onImportEvidence: () => void;
  onImportManifest: () => void;
  onImportSampleEvidence: () => void;
  onImportSampleManifest: () => void;
}) {
  return (
    <Panel className="relative min-h-[260px] overflow-hidden bg-[#f3f8ff] p-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.92),rgba(234,244,255,0.74))]" />
      <Image
        src="/brand/generated/evidence-shield-platform.png"
        alt=""
        width={560}
        height={374}
        priority
        className="pointer-events-none absolute right-0 top-0 hidden h-full w-[46%] object-contain object-right md:block"
      />
      <div className="relative max-w-[620px]">
        <SectionLabel icon={Cable}>Microsoft Foundry operations</SectionLabel>
        <h2 className="mt-6 text-3xl font-semibold tracking-normal text-[#071437]">
          Evidence-first crash testing
        </h2>
        <p className="mt-4 max-w-[560px] text-[15px] leading-7 text-[#25385e]">
          Import a reviewed manifest or recorded agent evidence, map trust
          boundaries, and run a local defensive crash test without live tools,
          MCP execution, credentials, files, or external targets.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <CommandButton
            disabled={isImporting}
            icon={isImporting ? Loader2 : Upload}
            onClick={onImportManifest}
          >
            {isImporting ? "Importing..." : "Import manifest"}
          </CommandButton>
          <CommandButton
            disabled={isImporting}
            icon={isImporting ? Loader2 : FileJson}
            onClick={onImportSampleManifest}
          >
            {isImporting ? "Importing..." : "Use example manifest"}
          </CommandButton>
          <CommandButton
            disabled={isImportingEvidence}
            icon={isImportingEvidence ? Loader2 : FileJson}
            onClick={onImportEvidence}
            primary
          >
            {isImportingEvidence ? "Loading..." : "Load recorded evidence"}
          </CommandButton>
          <CommandButton
            disabled={isImportingEvidence}
            icon={isImportingEvidence ? Loader2 : FileJson}
            onClick={onImportSampleEvidence}
          >
            {isImportingEvidence ? "Loading..." : "Use example evidence"}
          </CommandButton>
        </div>
      </div>
    </Panel>
  );
}

function FoundryWorkspace({
  agents,
  error,
  evidenceCaptures,
  foundryReadiness,
  isImporting,
  isImportingEvidence,
  onImportEvidence,
  onImportManifest,
  onImportSampleEvidence,
  onImportSampleManifest,
  onRunAgentCrashTest,
  onRunEvidenceCrashTest,
  onSelectAgent,
  onSelectEvidence,
  readiness,
  selectedAgent,
  selectedEvidence,
  trustMap
}: {
  agents: FoundryAgentImport[];
  error: string | null;
  evidenceCaptures: AgentEvidenceCapture[];
  foundryReadiness: FoundryReadinessResult | null;
  isImporting: boolean;
  isImportingEvidence: boolean;
  onImportEvidence: () => void;
  onImportManifest: () => void;
  onImportSampleEvidence: () => void;
  onImportSampleManifest: () => void;
  onRunAgentCrashTest: () => void;
  onRunEvidenceCrashTest: () => void;
  onSelectAgent: (id: string) => void;
  onSelectEvidence: (id: string) => void;
  readiness: FoundryReadinessResult | null;
  selectedAgent: FoundryAgentImport | null;
  selectedEvidence: AgentEvidenceCapture | null;
  trustMap: AgentTrustBoundaryMap | null;
}) {
  const boundaryCount = trustMap?.boundaries.length ?? 0;
  const highRiskCount =
    trustMap?.boundaries.filter(
      (boundary) =>
        boundary.riskLevel === "high" || boundary.riskLevel === "critical"
    ).length ?? 0;
  const missingFoundrySettingCount = readiness?.missingEnv.length ?? 0;

  return (
    <div className="grid gap-4">
      <FoundryHero
        isImporting={isImporting}
        isImportingEvidence={isImportingEvidence}
        onImportEvidence={onImportEvidence}
        onImportManifest={onImportManifest}
        onImportSampleEvidence={onImportSampleEvidence}
        onImportSampleManifest={onImportSampleManifest}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          body={
            readiness?.configured
              ? "Server-side Foundry connection metadata is configured."
              : `${missingFoundrySettingCount} optional live Foundry setting${
                  missingFoundrySettingCount === 1 ? "" : "s"
                } not configured`
          }
          icon={Activity}
          label="Readiness"
          value={readiness?.configured ? "Connected ready" : "Manifest mode"}
        />
        <StatCard
          body={`${highRiskCount} high-risk review points`}
          icon={Network}
          label="Trust map"
          value={boundaryCount > 0 ? `${boundaryCount} boundaries` : "Awaiting import"}
        />
        <StatCard
          body="No shell, MCP, email, DB, or live tool execution"
          icon={ShieldAlert}
          label="Blocked"
          value={String(foundryReadiness?.blockedOperations.length ?? 0)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionLabel>Reviewed manifests</SectionLabel>
              <p className="mt-2 truncate text-sm text-[#25385e]">
                {selectedAgent?.manifest.name ?? "No Foundry manifest imported yet."}
              </p>
            </div>
            <button
              type="button"
              onClick={onRunAgentCrashTest}
              disabled={!selectedAgent}
              className="hidden h-9 shrink-0 items-center gap-2 rounded-lg border border-[#d0dbea] px-3 text-xs font-semibold text-[#075ec8] disabled:text-[#93a5bd] md:inline-flex"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Crash-test manifest
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {agents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#b7c9df] bg-[#f8fbff] p-4 text-sm leading-6 text-[#53637d]">
                Import a reviewed Microsoft Foundry manifest JSON to create an
                agent target and trust map.
              </div>
            ) : null}
            {agents.slice(0, 2).map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelectAgent(agent.id)}
                className={classNames(
                  "rounded-lg border p-4 text-left transition",
                  agent.id === selectedAgent?.id
                    ? "border-[#d0e2f8] bg-[#f0f6ff]"
                    : "border-[#d9e4f2] bg-white hover:bg-[#f8fbff]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#071437]">
                    {agent.manifest.name}
                  </span>
                  <Chip className="border-[#d9e4f2] bg-white text-[#53637d]">
                    {agent.mode.replaceAll("_", " ")}
                  </Chip>
                </div>
                <p className="mt-2 text-xs text-[#53637d]">
                  {agent.manifest.model.family} | {agent.manifest.tools.length} tools |{" "}
                  {agent.manifest.identity.authMode}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionLabel>Recorded agent evidence</SectionLabel>
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#25385e]">
                {selectedEvidence?.summary ??
                  "No recorded evidence imported yet."}
              </p>
            </div>
            <button
              type="button"
              onClick={onRunEvidenceCrashTest}
              disabled={!selectedEvidence}
              className="hidden h-9 shrink-0 items-center gap-2 rounded-lg border border-[#d0dbea] px-3 text-xs font-semibold text-[#075ec8] disabled:text-[#93a5bd] md:inline-flex"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Crash-test
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {evidenceCaptures.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#b7c9df] bg-[#f8fbff] p-4 text-sm leading-6 text-[#53637d]">
                Import reviewed recorded evidence JSON to run a local defensive
                crash test.
              </div>
            ) : null}
            {evidenceCaptures.slice(0, 2).map((capture) => (
              <button
                key={capture.id}
                type="button"
                onClick={() => onSelectEvidence(capture.id)}
                className={classNames(
                  "rounded-lg border p-4 text-left transition",
                  capture.id === selectedEvidence?.id
                    ? "border-[#d0e2f8] bg-[#f0f6ff]"
                    : "border-[#d9e4f2] bg-white hover:bg-[#f8fbff]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#071437]">
                    {capture.agentName}
                  </span>
                  <Chip className="border-[#d9e4f2] bg-white text-[#53637d]">
                    {capture.review.status}
                  </Chip>
                </div>
                <p className="mt-2 text-xs text-[#53637d]">
                  {capture.messages.length} messages | {capture.toolIntents.length} tool intents |{" "}
                  {capture.model}
                </p>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel icon={ShieldCheck}>Trust-boundary map</SectionLabel>
          <div className="hidden items-center gap-3 text-[11px] font-semibold uppercase text-[#53637d] md:flex">
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-red-500 text-red-500" /> High risk
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-amber-400 text-amber-400" /> Medium risk
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" /> Low risk
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {trustMap?.boundaries.length ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {trustMap.boundaries.slice(0, 6).map((boundary, index) => (
                  <BoundaryCard key={boundary.id} boundary={boundary} index={index} />
                ))}
              </div>
              {trustMap.boundaries[6] ? (
                <BoundaryStrip boundary={trustMap.boundaries[6]} index={6} />
              ) : null}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-[#b7c9df] bg-[#f8fbff] p-4 text-sm leading-6 text-[#53637d]">
              Trust boundaries appear after a reviewed manifest is imported.
              Recorded evidence can still be crash-tested without live execution.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function BoundaryCard({
  boundary,
  index
}: {
  boundary: AgentTrustBoundary;
  index: number;
}) {
  const flowStatus =
    boundary.riskLevel === "critical" || boundary.riskLevel === "high"
      ? "Review required"
      : boundary.riskLevel === "medium"
        ? "Guarded boundary"
        : "Observed boundary";

  return (
    <div
      className="rounded-lg border border-[#d9e4f2] bg-white p-3 shadow-[0_8px_20px_rgba(7,20,55,0.02)]"
      data-testid="trust-boundary-card"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <Chip className="border-blue-100 bg-blue-50 text-[#075ec8]">
          Step {index + 1}
        </Chip>
        <Chip className={riskTone[boundary.riskLevel]}>
          {boundary.riskLevel}
        </Chip>
      </div>
      <p className="text-sm font-bold leading-5 text-[#071437]">{boundary.label}</p>
      <p className="mt-2 text-xs leading-5 text-[#53637d]">
        {boundary.controls.slice(0, 2).join(" | ")}
      </p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#53637d]">
        {flowStatus}
      </p>
    </div>
  );
}

function BoundaryStrip({
  boundary,
  index
}: {
  boundary: AgentTrustBoundary;
  index: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#d9e4f2] bg-white p-3">
      <Chip className="border-blue-100 bg-blue-50 text-[#075ec8]">
        Step {index + 1}
      </Chip>
      <p className="min-w-0 text-sm font-bold leading-5 text-[#071437]">
        {boundary.label}
      </p>
      <p className="min-w-0 break-words text-xs leading-5 text-[#53637d]">
        {boundary.controls.join(" | ")}
      </p>
    </div>
  );
}

function CrashWorkspace({
  currentRun,
  eventFilter,
  onExportTimeline,
  onSelectEvent,
  onSetDetailMode,
  onSetEventFilter,
  selectedEvent
}: {
  currentRun: ScenarioRun | null;
  eventFilter: string;
  onExportTimeline: () => void;
  onSelectEvent: (event: TraceEvent) => void;
  onSetDetailMode: (mode: DetailMode) => void;
  onSetEventFilter: (filter: string) => void;
  selectedEvent: TraceEvent | null;
}) {
  const [timelineWidth, setTimelineWidth] = useState(480);
  const splitRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("failsafe.crashTimelineWidth");
    if (saved) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed)) {
        setTimelineWidth(Math.max(420, Math.min(660, parsed)));
      }
    }
  }, []);

  const updateTimelineWidth = useCallback((nextWidth: number) => {
    const clamped = Math.max(420, Math.min(660, Math.round(nextWidth)));
    setTimelineWidth(clamped);
    window.localStorage.setItem("failsafe.crashTimelineWidth", String(clamped));
  }, []);

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const shell = splitRef.current;
      if (!shell) {
        return;
      }

      const bounds = shell.getBoundingClientRect();

      function onMove(moveEvent: MouseEvent) {
        updateTimelineWidth(moveEvent.clientX - bounds.left);
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [updateTimelineWidth]
  );

  if (!currentRun) {
    return (
      <EmptyWorkspace
        body="Run a Foundry manifest, recorded evidence, or Sample Lab crash test to load the timeline."
        title="No crash trace loaded"
      />
    );
  }

  const visibleEvents =
    eventFilter === "all"
      ? currentRun.trace
      : currentRun.trace.filter((event) => event.trustBoundary === eventFilter);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <SectionLabel icon={FileText}>Crash test run</SectionLabel>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-normal text-[#071437]">
              Crash timeline
            </h2>
            <span className="text-sm font-medium text-[#53637d]">
              Run ID: {currentRun.id.replace(/^run-/, "").slice(0, 8)}
            </span>
            <Copy className="h-4 w-4 text-[#53637d]" aria-hidden="true" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-[#53637d]">
            <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700">
              {titleCase(currentRun.status)}
            </Chip>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(currentRun.startedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              {currentMode(currentRun)}
            </span>
            <span>{formatDuration(currentRun)}</span>
          </div>
        </div>
        <CommandButton icon={Download} onClick={onExportTimeline}>
          Export timeline
        </CommandButton>
      </div>

      <div
        ref={splitRef}
        className="grid gap-4 2xl:grid-cols-[var(--timeline-column)_10px_minmax(0,1fr)]"
        style={{ "--timeline-column": `${timelineWidth}px` } as React.CSSProperties}
      >
        <Panel className="self-start overflow-hidden 2xl:max-h-[760px]">
          <div className="flex h-12 items-center justify-between border-b border-[#d9e4f2] px-4">
            <ListFilter className="h-4 w-4 text-[#25385e]" aria-hidden="true" />
            <select
              value={eventFilter}
              onChange={(event) => onSetEventFilter(event.target.value)}
              className="h-8 rounded-lg border border-[#d0dbea] bg-white px-3 text-xs font-semibold text-[#25385e]"
              aria-label="Filter timeline events"
            >
              <option value="all">All events</option>
              {Array.from(new Set(currentRun.trace.map((event) => event.trustBoundary))).map(
                (boundary) => (
                  <option key={boundary} value={boundary}>
                    {titleCase(boundary)}
                  </option>
                )
              )}
            </select>
            <span className="text-xs font-semibold text-[#53637d]">
              {visibleEvents.length} events
            </span>
            <List className="h-4 w-4 text-[#075ec8]" aria-hidden="true" />
          </div>
          <ol
            className="timeline-scroll max-h-[620px] overflow-y-auto px-4 py-4"
            data-scroll-pane="timeline"
          >
            {visibleEvents.map((event, index) => (
              <TimelineItem
                event={event}
                isSelected={selectedEvent?.id === event.id}
                key={event.id}
                onSelect={onSelectEvent}
                showLine={index < visibleEvents.length - 1}
              />
            ))}
          </ol>
        </Panel>

        <button
          type="button"
          onMouseDown={startResize}
          className="hidden rounded-full border border-[#d0dbea] bg-white text-[#9fb3ce] shadow-sm transition hover:border-[#075ec8] hover:text-[#075ec8] 2xl:block"
          aria-label="Resize crash timeline pane"
          title="Resize timeline pane"
        >
          <span className="mx-auto block h-full w-px bg-current" />
        </button>

        <div className="grid gap-4">
          <SelectedEventPanel
            event={selectedEvent}
            onOpenPayload={() => onSetDetailMode("timeline")}
          />
          <RootCauseSummary findings={currentRun.findings} />
        </div>
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-6 px-5 py-4">
        <SectionLabel>Run summary</SectionLabel>
        <div className="grid min-w-[min(100%,520px)] flex-1 grid-cols-2 gap-4 text-center md:grid-cols-4">
          <SummaryMetric label="Events" value={String(currentRun.trace.length)} />
          <SummaryMetric
            label="Block events"
            value={String(
              currentRun.trace.filter((event) => event.type === "policy_violation").length
            )}
          />
          <SummaryMetric label="Finding" value={String(currentRun.findings.length)} />
          <SummaryMetric label="FailSafe Score" value={formatScore(currentRun.score.overall)} />
        </div>
        <button
          type="button"
          className="hidden h-10 rounded-lg border border-[#d0dbea] px-4 text-sm font-semibold text-[#25385e] hover:bg-[#f6f9fe] md:block"
          onClick={() => onSetDetailMode("timeline")}
        >
          View summary details
        </button>
      </Panel>
    </div>
  );
}

function TimelineItem({
  event,
  isSelected,
  onSelect,
  showLine
}: {
  event: TraceEvent;
  isSelected: boolean;
  onSelect: (event: TraceEvent) => void;
  showLine: boolean;
}) {
  const Icon = eventIconMap[event.type] ?? Activity;
  return (
    <li
      className="grid grid-cols-[70px_24px_minmax(0,1fr)] gap-3 pb-3 last:pb-0"
      data-testid="timeline-item"
    >
      <time
        className="pt-1 text-right text-[11px] leading-5 text-[#53637d]"
        dateTime={event.timestamp}
        data-testid="timeline-time"
      >
        {formatTime(event.timestamp)}
      </time>
      <div className="relative flex justify-center pt-1">
        <button
          type="button"
          onClick={() => onSelect(event)}
          data-testid="timeline-dot"
          className={classNames(
            "relative z-10 h-4 w-4 rounded-full border bg-white",
            isSelected ? "border-red-500 ring-4 ring-red-50" : "border-[#0f2149]"
          )}
          aria-label={`Select event ${event.summary}`}
        />
        {showLine ? (
          <span className="absolute left-1/2 top-6 h-[calc(100%+18px)] w-px -translate-x-1/2 bg-[#9fb3ce]" />
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onSelect(event)}
        data-testid="timeline-card"
        className={classNames(
          "min-w-0 rounded-lg border p-3 text-left transition",
          isSelected
            ? "border-red-300 bg-red-50"
            : "border-[#d9e4f2] bg-white hover:bg-[#f8fbff]"
        )}
      >
        <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#075ec8]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-5 text-[#071437]">
              {event.summary.split(":")[0]}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#53637d]">
              {event.summary}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-11">
          <Chip className={boundaryTone[event.trustBoundary]}>
            {titleCase(event.trustBoundary)}
          </Chip>
        </div>
      </button>
    </li>
  );
}

function SelectedEventPanel({
  event,
  onOpenPayload
}: {
  event: TraceEvent | null;
  onOpenPayload: () => void;
}) {
  if (!event) {
    return <EmptyWorkspace title="No event selected" body="Select a timeline event." />;
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ShieldX className="h-7 w-7 text-red-500" aria-hidden="true" />
            <h3 className="text-xl font-semibold leading-7 text-[#071437]">
              {event.summary.split(":")[0]}
            </h3>
          </div>
          <p className="mt-3 text-xs text-[#53637d]">
            {formatDate(event.timestamp)} ({event.actor} event)
          </p>
        </div>
        <Chip className={boundaryTone[event.trustBoundary]}>
          {event.trustBoundary}
        </Chip>
      </div>

      <div className="mt-5 rounded-lg border border-[#d9e4f2] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>Event evidence</SectionLabel>
          <button
            type="button"
            onClick={onOpenPayload}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#d0dbea] px-3 text-xs font-semibold text-[#25385e]"
          >
            View full payload
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <pre
          className="mt-3 max-h-[300px] overflow-auto rounded-lg bg-[#f8fbff] p-4 text-xs leading-5 text-[#25385e]"
          data-scroll-pane="payload"
        >
          {prettyJson({
            type: event.type,
            actor: event.actor,
            inputSource: event.inputSource,
            metadata: event.metadata,
            raw: event.raw
          })}
        </pre>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <SectionLabel>Event summary</SectionLabel>
          <p className="mt-2 text-sm leading-6 text-[#25385e]">{event.summary}</p>
        </div>
        <MetricList
          rows={[
            ["Function", event.type],
            ["Target", event.inputSource],
            ["Boundary", event.trustBoundary],
            ["Decision", event.type === "policy_violation" ? "Blocked" : "Recorded"]
          ]}
        />
      </div>
    </Panel>
  );
}

function RootCauseSummary({ findings }: { findings: Finding[] }) {
  const cards = findings.length
    ? findings.slice(0, 3).map((finding, index) => ({
        label:
          index === 0
            ? "Primary root cause"
            : index === 1
              ? "Contributing factor"
              : "Secondary factor",
        finding
      }))
    : [];

  return (
    <Panel className="p-4">
      <SectionLabel>Root-cause cards</SectionLabel>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {cards.length > 0 ? (
          cards.map(({ finding, label }) => (
            <div key={finding.id} className="rounded-lg border border-[#d9e4f2] p-3">
              <p className="text-[11px] font-semibold text-red-600">{label}</p>
              <p className="mt-2 text-sm font-bold leading-5 text-[#071437]">
                {finding.rootCause}
              </p>
              <Chip className={classNames("mt-2", severityTone[finding.severity])}>
                {finding.severity}
              </Chip>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#53637d]">No root-cause findings loaded.</p>
        )}
      </div>
    </Panel>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[#d9e4f2] first:border-l-0">
      <p className="text-xl font-semibold text-[#071437]">{value}</p>
      <p className="mt-1 text-xs text-[#53637d]">{label}</p>
    </div>
  );
}

function ScoreBars({
  compact = false,
  score
}: {
  compact?: boolean;
  score: CrashScore;
}) {
  const metrics = [
    ["Attack success", score.attackSuccessRate, "bg-orange-500"],
    ["Task utility", score.taskUtility, "bg-emerald-600"],
    ["Severity", score.severity, "bg-orange-500"],
    ["Scope breach", score.scopeBreach, "bg-amber-400"],
    ["Repeatability", score.repeatabilityPenalty, "bg-amber-400"],
    ["Explanation confidence", score.explanationConfidence, "bg-emerald-600"]
  ] as const;

  return (
    <div className={classNames("grid gap-3", compact ? "mt-5" : "")}>
      {metrics.map(([label, value, tone]) => {
        const percent = scoreMetricValue(value);
        return (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="text-[#53637d]">{label}</span>
              <span className="font-semibold text-[#071437]">{percent} / 100</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e6edf5]">
              <div
                className={classNames("h-full rounded-full", tone)}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatchWorkspace({
  artifactTab,
  currentRun,
  detailMode,
  fixtureReplayingRegressionId,
  isLoadingPatchCoach,
  onFixWithCopilot,
  onFixtureReplay,
  onReplayMock,
  onSaveRegression,
  onSetArtifactTab,
  onSetDetailMode,
  patchCoachError,
  patchCoachPlan,
  regressions,
  selectedFinding,
  selectedPack,
  trace
}: {
  artifactTab: ArtifactTab;
  currentRun: ScenarioRun | null;
  detailMode: DetailMode;
  fixtureReplayingRegressionId?: string;
  isLoadingPatchCoach: boolean;
  onFixWithCopilot: () => void;
  onFixtureReplay: (regression: RegressionArtifact) => void;
  onReplayMock: (regression: RegressionArtifact) => void;
  onSaveRegression: () => void;
  onSetArtifactTab: (tab: ArtifactTab) => void;
  onSetDetailMode: (mode: DetailMode) => void;
  patchCoachError: string | null;
  patchCoachPlan: PatchCoachPlan | null;
  regressions: RegressionArtifact[];
  selectedFinding: Finding | null;
  selectedPack: ScenarioPack | null;
  trace: TraceEvent[];
}) {
  const cards = buildRootCauseCards(selectedFinding, currentRun);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <SectionLabel icon={Cable}>
            Microsoft Foundry operations <span className="text-[#53637d]">-</span> Patch and regression
          </SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[#071437]">
            Root-cause cards
          </h2>
          <p className="mt-1 text-sm text-[#25385e]">
            Select a finding to review details, create a prompt handoff, and
            plan a safe mitigation.
          </p>
        </div>
        <CommandButton icon={List} onClick={() => onSetDetailMode("findings")}>
          View all findings
        </CommandButton>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            className={classNames(
              "rounded-lg border bg-white p-4 text-left transition",
              index === 0
                ? "border-[#075ec8] shadow-[0_0_0_1px_rgba(7,94,200,0.2)]"
                : "border-[#d9e4f2] hover:bg-[#f8fbff]"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <Chip className={severityTone[card.severity]}>{card.severity}</Chip>
              {index === 0 ? (
                <Circle className="h-3 w-3 fill-[#075ec8] text-[#075ec8]" />
              ) : (
                <Circle className="h-3 w-3 text-emerald-500" />
              )}
            </div>
            <p className="mt-4 line-clamp-2 text-sm font-bold leading-5 text-[#071437]">
              {card.title}
            </p>
            <p className="mt-4 text-xs text-[#53637d]">
              Evidence events: <span className="font-bold text-[#071437]">{card.count}</span>
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <FindingDetailReference
          finding={selectedFinding}
          onFixWithCopilot={onFixWithCopilot}
          onSetDetailMode={onSetDetailMode}
          scenarioPack={selectedPack}
          trace={trace}
        />
        <PatchRail
          detailMode={detailMode}
          error={patchCoachError}
          finding={selectedFinding}
          isLoading={isLoadingPatchCoach}
          onSetDetailMode={onSetDetailMode}
          plan={patchCoachPlan}
        />
      </div>

      <ArtifactsPanel
        activeTab={artifactTab}
        fixtureReplayingRegressionId={fixtureReplayingRegressionId}
        onCreateCase={onSaveRegression}
        onFixtureReplay={onFixtureReplay}
        onReplayMock={onReplayMock}
        onSetActiveTab={onSetArtifactTab}
        patchCoachPlan={patchCoachPlan}
        regressions={regressions}
        selectedFinding={selectedFinding}
      />
    </div>
  );
}

function FindingDetailReference({
  finding,
  onFixWithCopilot,
  onSetDetailMode,
  scenarioPack,
  trace
}: {
  finding: Finding | null;
  onFixWithCopilot: () => void;
  onSetDetailMode: (mode: DetailMode) => void;
  scenarioPack: ScenarioPack | null;
  trace: TraceEvent[];
}) {
  if (!finding) {
    return (
      <EmptyWorkspace
        body="Run a crash test to load a finding detail."
        title="No finding selected"
      />
    );
  }

  const evidenceEvents = trace.filter((event) =>
    finding.evidenceEventIds.includes(event.id)
  );

  return (
    <Panel className="relative overflow-hidden p-5">
      <div className="absolute bottom-0 right-0 h-40 w-56 opacity-30">
        <Image
          src="/brand/generated/evidence-shield-platform.png"
          alt=""
          width={320}
          height={213}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="relative">
        <SectionLabel icon={ClipboardList}>Finding detail</SectionLabel>
        <h3 className="mt-4 text-xl font-semibold text-[#071437]">{finding.title}</h3>
        <dl className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            ["Finding ID", finding.id.slice(0, 14)],
            ["Status", titleCase(finding.status)],
            ["Category", titleCase(finding.category)],
            ["Severity", titleCase(finding.severity)],
            ["Confidence", finding.confidence]
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-[#d9e4f2] bg-white/80 p-3"
            >
              <dt className="text-[11px] font-semibold leading-4 text-[#53637d]">
                {label}
              </dt>
              <dd className="mt-2 break-words text-xs font-bold leading-5 text-[#071437]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <SectionLabel>Description</SectionLabel>
            <p className="mt-2 text-sm leading-6 text-[#25385e]">
              {finding.description}
            </p>
            <SectionLabel className="mt-5">Root cause</SectionLabel>
            <p className="mt-2 text-sm leading-6 text-[#25385e]">
              {finding.rootCause}
            </p>
            <div className="mt-4">
              <SectionLabel>Recommended mitigations</SectionLabel>
              <ul className="mt-2 grid gap-2 text-xs leading-5 text-[#25385e]">
                {finding.recommendedMitigations.slice(0, 3).map((mitigation) => (
                  <li key={mitigation} className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    {mitigation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <SectionLabel>Evidence event IDs</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {evidenceEvents.slice(0, 6).map((event) => (
                <Chip key={event.id} className="border-[#d9e4f2] bg-[#f5f8fc] text-[#25385e]">
                  {event.id.slice(-12).toUpperCase()}
                </Chip>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onSetDetailMode("timeline")}
              className="mt-4 inline-flex h-9 items-center gap-2 text-xs font-semibold text-[#075ec8]"
            >
              View full timeline
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-[#d9e4f2] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel icon={ShieldCheck}>Prompt handoff preview</SectionLabel>
            <CommandButton icon={WandSparkles} onClick={onFixWithCopilot}>
              Fix with Copilot
            </CommandButton>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniInfo
              label="Handoff type"
              value="Bounded prompt"
              body="This handoff prepares prompt context for your Copilot session."
            />
            <MiniList
              label="Includes"
              items={[
                "Finding summary and evidence",
                "Root cause and mitigations",
                "Recommended prompt file",
                scenarioPack?.name ?? "Regression checklist"
              ]}
            />
            <MiniInfo
              label="What Copilot will do"
              value="Help draft a fix"
              body="You review, edit, and apply changes in your environment."
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MiniInfo({
  body,
  label,
  value
}: {
  body: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#d9e4f2] p-3">
      <p className="text-xs font-bold text-[#071437]">{label}</p>
      <p className="mt-3 text-sm font-semibold text-[#25385e]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#53637d]">{body}</p>
    </div>
  );
}

function MiniList({ items, label }: { items: string[]; label: string }) {
  return (
    <div className="rounded-lg border border-[#d9e4f2] p-3">
      <p className="text-xs font-bold text-[#071437]">{label}</p>
      <ul className="mt-3 grid gap-2 text-xs text-[#25385e]">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PatchRail({
  detailMode,
  error,
  finding,
  isLoading,
  onSetDetailMode,
  plan
}: {
  detailMode: DetailMode;
  error: string | null;
  finding: Finding | null;
  isLoading: boolean;
  onSetDetailMode: (mode: DetailMode) => void;
  plan: PatchCoachPlan | null;
}) {
  return (
    <Panel className="p-4">
      <div className="rounded-lg border border-[#075ec8] bg-[#f6faff] p-4">
        <p className="text-xs font-bold text-[#071437]">Selected finding</p>
        <p className="mt-3 text-sm font-bold leading-5 text-[#071437]">
          {finding?.title ?? "No finding selected"}
        </p>
        <p className="mt-2 text-xs text-[#53637d]">
          {finding?.severity ?? "--"} - {finding?.confidence ?? "--"} confidence
        </p>
        <button
          type="button"
          onClick={() => onSetDetailMode("timeline")}
          className="mt-3 text-xs font-bold text-[#075ec8]"
        >
          View in evidence timeline
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-[#d9e4f2] p-4">
        <p className="text-xs font-bold text-[#071437]">Prompt file recommendation</p>
        <div className="mt-3 rounded-lg border border-[#d9e4f2] bg-[#f8fbff] p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#075ec8]" aria-hidden="true" />
            <span className="truncate text-sm font-semibold text-[#071437]">
              {plan?.copilotPrompts[0]?.promptFile ??
                "runtime-guardrail-review.prompt.md"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#53637d]">Prompt - 4.2 KB</span>
            <button
              type="button"
              onClick={() => onSetDetailMode("prompt")}
              className="font-bold text-[#075ec8]"
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#d9e4f2] p-4">
        <p className="text-xs font-bold text-[#071437]">Patch coach plan</p>
        {isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-[#53637d]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#075ec8]" />
            Building plan
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-xs leading-5 text-red-700">{error}</p>
        ) : null}
        <ol className="mt-3 grid gap-3 text-xs text-[#25385e]">
          {(plan?.mitigationSteps ?? []).slice(0, 4).map((step, index) => (
            <li key={step.id} className="flex gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#eaf4ff] text-[11px] font-bold text-[#075ec8]">
                {index + 1}
              </span>
              <span className="leading-5">{step.title}</span>
            </li>
          ))}
          {!plan ? (
            <>
              <li className="flex gap-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#eaf4ff] text-[11px] font-bold text-[#075ec8]">
                  1
                </span>
                Add MCP trust validation guardrail
              </li>
              <li className="flex gap-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#eaf4ff] text-[11px] font-bold text-[#075ec8]">
                  2
                </span>
                Enforce approval for high-risk tools
              </li>
            </>
          ) : null}
        </ol>
        <button
          type="button"
          onClick={() => onSetDetailMode("plan")}
          className={classNames(
            "mt-4 text-xs font-bold text-[#075ec8]",
            detailMode === "plan" && "underline"
          )}
        >
          View full plan
        </button>
      </div>
    </Panel>
  );
}

function ArtifactsPanel({
  activeTab,
  fixtureReplayingRegressionId,
  onCreateCase,
  onFixtureReplay,
  onReplayMock,
  onSetActiveTab,
  patchCoachPlan,
  regressions,
  selectedFinding
}: {
  activeTab: ArtifactTab;
  fixtureReplayingRegressionId?: string;
  onCreateCase: () => void;
  onFixtureReplay: (regression: RegressionArtifact) => void;
  onReplayMock: (regression: RegressionArtifact) => void;
  onSetActiveTab: (tab: ArtifactTab) => void;
  patchCoachPlan: PatchCoachPlan | null;
  regressions: RegressionArtifact[];
  selectedFinding: Finding | null;
}) {
  const latest = regressions[0];
  const isFixtureReplaying = latest?.id === fixtureReplayingRegressionId;
  const promptCount = patchCoachPlan?.copilotPrompts.length ?? 0;
  const draftCount = patchCoachPlan ? 1 : 0;
  const tabs: Array<[ArtifactTab, string, number]> = [
    ["regressions", "Regression cases", regressions.length],
    ["handoffs", "Prompt handoffs", promptCount],
    ["drafts", "Fix drafts", draftCount]
  ];

  return (
    <Panel className="p-4">
      <SectionLabel icon={ShieldCheck}>Saved artifacts</SectionLabel>
      <div className="mt-3 flex flex-wrap gap-6 border-b border-[#d9e4f2] text-sm font-semibold">
        {tabs.map(([tab, label, count]) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSetActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={classNames(
              "pb-2 transition",
              activeTab === tab
                ? "border-b-2 border-[#075ec8] text-[#075ec8]"
                : "text-[#53637d] hover:text-[#071437]"
            )}
          >
            {label}{" "}
            <span className="ml-1 rounded-full bg-[#eef3f8] px-2 text-xs">
              {count}
            </span>
          </button>
        ))}
      </div>
      {activeTab === "regressions" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-[#d9e4f2] p-4">
            {latest ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="min-w-0 text-sm font-bold leading-5 text-[#071437]">
                    {latest.name}
                  </p>
                  <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {titleCase(latest.status)}
                  </Chip>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#53637d]">
                  {latest.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latest.mockReplayable ? (
                    <button
                      type="button"
                      onClick={() => onReplayMock(latest)}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#d0dbea] px-3 text-xs font-semibold text-[#25385e] hover:bg-[#f6f9fe]"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Replay Sample Lab
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isFixtureReplaying}
                    onClick={() => onFixtureReplay(latest)}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#075ec8] bg-[#eef5ff] px-3 text-xs font-semibold text-[#075ec8] hover:bg-[#e4f0ff] disabled:cursor-not-allowed disabled:text-[#93a5bd]"
                  >
                    {isFixtureReplaying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isFixtureReplaying ? "Running..." : "Fixture Replay"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#53637d]">No regression has been saved yet.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCreateCase}
            className="flex items-center justify-center gap-4 rounded-lg border border-dashed border-[#b7c9df] p-4 text-left hover:bg-[#f8fbff]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef5ff] text-[#075ec8]">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-[#071437]">
                Create a new regression case
              </span>
              <span className="mt-1 block text-xs text-[#53637d]">
                Capture the fix as a repeatable test case.
              </span>
            </span>
          </button>
        </div>
      ) : activeTab === "handoffs" ? (
        <div className="mt-4 rounded-lg border border-[#d9e4f2] p-4">
          <p className="text-sm font-bold text-[#071437]">
            {patchCoachPlan?.copilotPrompts[0]?.title ??
              "No prompt handoff created yet"}
          </p>
          <p className="mt-3 text-xs leading-5 text-[#53637d]">
            {patchCoachPlan
              ? `Recommended prompt file: ${patchCoachPlan.copilotPrompts[0]?.promptFile ?? "runtime-guardrail-review.prompt.md"}`
              : "Run Fix with Copilot to generate a bounded prompt handoff preview."}
          </p>
          {patchCoachPlan ? (
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-[#f8fbff] p-3 text-xs leading-5 text-[#25385e]">
              {prettyJson(patchCoachPlan.copilotPrompts)}
            </pre>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-[#d9e4f2] p-4">
          <p className="text-sm font-bold text-[#071437]">
            {patchCoachPlan
              ? "Patch Coach draft plan"
              : "No fix draft has been staged"}
          </p>
          <p className="mt-3 text-xs leading-5 text-[#53637d]">
            {patchCoachPlan
              ? `Draft is scoped to ${selectedFinding?.title ?? "the selected finding"} and remains review-only.`
              : "Fix drafts appear after the review-only Copilot handoff is generated."}
          </p>
          {patchCoachPlan ? (
            <ol className="mt-3 grid gap-2 text-xs leading-5 text-[#25385e]">
              {patchCoachPlan.mitigationSteps.map((step) => (
                <li key={step.id} className="flex gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  {step.title}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function SafetyWorkspace({
  comparison,
  currentRun,
  fixtureReplayResult,
  isCreatingReport,
  isResetting,
  onCreateReport,
  onResetDemoData,
  project,
  report,
  reportError,
  resetMessage,
  selectedPack
}: {
  comparison: ReplayComparison | null;
  currentRun: ScenarioRun | null;
  fixtureReplayResult: FixtureReplayResult | null;
  isCreatingReport: boolean;
  isResetting: boolean;
  onCreateReport: () => void;
  onResetDemoData: () => void;
  project: Project | null;
  report: SafetyReport | null;
  reportError: string | null;
  resetMessage: string | null;
  selectedPack: ScenarioPack | null;
}) {
  const preview = report?.content ?? fallbackSafetyMarkdown(project, currentRun, selectedPack);

  return (
    <div className="grid gap-4">
      <Panel className="relative min-h-[260px] overflow-hidden bg-[#f3f8ff] p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.92),rgba(234,244,255,0.74))]" />
        <Image
          src="/brand/generated/runner-readiness-platform.png"
          alt=""
          width={560}
          height={374}
          priority
          className="pointer-events-none absolute right-4 top-0 hidden h-full w-[48%] object-contain object-right md:block"
        />
        <div className="relative max-w-[620px]">
          <SectionLabel icon={Cable}>Safety card overview</SectionLabel>
          <h2 className="mt-6 text-3xl font-semibold tracking-normal text-[#071437]">
            Runner readiness
          </h2>
          <div className="mt-5 flex items-center gap-4">
            <span className="text-base font-semibold text-[#071437]">Current mode</span>
            <Chip className="border-blue-200 bg-white text-[#075ec8]">
              Dry-run (fixture replay)
            </Chip>
          </div>
          <p className="mt-5 max-w-[560px] text-sm leading-6 text-[#25385e]">
            The runner is operating in dry-run fixture-replay mode. Only
            reviewed synthetic fixture replay is enabled. Arbitrary execution is
            blocked.
          </p>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <RunnerCapabilities />
          <ReviewedFixturePath />
        </div>
        <div className="grid gap-4">
          <SafetyCardExport
            error={reportError}
            isCreating={isCreatingReport}
            isResetting={isResetting}
            onCreateReport={onCreateReport}
            onResetDemoData={onResetDemoData}
            preview={preview}
            resetMessage={resetMessage}
          />
          <BaselineReplay
            comparison={comparison}
            currentRun={currentRun}
            fixtureReplayResult={fixtureReplayResult}
          />
        </div>
      </div>

      <Panel className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#075ec8]">
        <Info className="h-4 w-4" aria-hidden="true" />
        Dry-run results closely match the baseline. No unexpected high-risk
        behaviors detected.
      </Panel>
    </div>
  );
}

function RunnerCapabilities() {
  return (
    <Panel className="p-5">
      <h3 className="text-base font-bold text-[#071437]">
        Runner capabilities <span className="font-medium text-[#53637d]">(current mode)</span>
      </h3>
      <div className="pane-scroll mt-4 overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <thead className="text-left text-xs text-[#53637d]">
            <tr>
              <th className="w-[38%] px-2 py-1.5 font-semibold">Capability</th>
              <th className="w-[24%] px-2 py-1.5 font-semibold">Status</th>
              <th className="px-2 py-1.5 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="text-[#25385e]">
            {runnerRows.map(([label, status, notes, Icon]) => (
              <tr key={label} className="border-t border-[#edf2f8]">
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-2 leading-4">
                    <Icon className="h-4 w-4 text-[#53637d]" aria-hidden="true" />
                    {label}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={classNames(
                      "inline-flex items-center gap-1 text-[11px] font-semibold",
                      status === "Allowed" ? "text-emerald-700" : "text-red-700"
                    )}
                  >
                    {status === "Allowed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ShieldX className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {status}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-[11px] leading-4 text-[#53637d]">
                  <span className="line-clamp-2">{notes}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReviewedFixturePath() {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <h3 className="font-bold text-[#071437]">Reviewed fixture path</h3>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#25385e]">
        Only reviewed synthetic fixture replay is enabled. Arbitrary execution
        is blocked.
      </p>
      <ul className="mt-5 grid gap-3 text-sm text-[#25385e]">
        {[
          "Fixtures are reviewed and recorded in this project.",
          "Recorded outputs are replayed deterministically.",
          "No live tools, no network, no writes.",
          "Human approval still required for high-risk actions."
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        Runner status: Ready for safe evaluation in dry-run mode
      </div>
    </Panel>
  );
}

function SafetyCardExport({
  error,
  isCreating,
  isResetting,
  onCreateReport,
  onResetDemoData,
  preview,
  resetMessage
}: {
  error: string | null;
  isCreating: boolean;
  isResetting: boolean;
  onCreateReport: () => void;
  onResetDemoData: () => void;
  preview: string;
  resetMessage: string | null;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-[#075ec8]" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="font-bold text-[#071437]">Safety Card export</h3>
          <p className="mt-2 text-sm leading-6 text-[#25385e]">
            Generate a shareable Safety Card that documents the current runner
            mode, boundaries, and evidence.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <CommandButton
          disabled={isCreating}
          icon={isCreating ? Loader2 : FileText}
          onClick={onCreateReport}
        >
          {isCreating ? "Exporting..." : "Export Safety Card"}
        </CommandButton>
        <CommandButton
          disabled={isResetting}
          icon={isResetting ? Loader2 : RotateCcw}
          onClick={onResetDemoData}
        >
          {isResetting ? "Resetting..." : "Reset Local Evidence"}
        </CommandButton>
      </div>
      {error ? <p className="mt-3 text-xs leading-5 text-red-700">{error}</p> : null}
      {resetMessage ? (
        <p className="mt-3 text-xs leading-5 text-emerald-700">{resetMessage}</p>
      ) : null}
      <p className="mt-4 text-sm font-semibold text-[#071437]">Preview (Markdown)</p>
      <pre
        className="mt-3 max-h-[320px] min-h-[160px] whitespace-pre-wrap break-words overflow-auto rounded-lg border border-[#d9e4f2] bg-[#f8fbff] p-4 text-xs leading-5 text-[#25385e]"
        data-scroll-pane="markdown"
      >
        {preview}
      </pre>
    </Panel>
  );
}

function BaselineReplay({
  comparison,
  currentRun,
  fixtureReplayResult
}: {
  comparison: ReplayComparison | null;
  currentRun: ScenarioRun | null;
  fixtureReplayResult: FixtureReplayResult | null;
}) {
  const baselineScore = comparison?.baselineScore ?? 62;
  const replayScore = comparison?.replayScore ?? currentRun?.score.overall ?? 64;
  const scoreDelta = comparison?.scoreDelta ?? replayScore - baselineScore;
  const findingDelta = comparison?.findingCountDelta ?? -2;
  const traceDelta = comparison?.traceEventCountDelta ?? -14;

  return (
    <Panel className="p-5">
      <SectionLabel icon={Network}>Baseline vs replay</SectionLabel>
      <table className="mt-4 w-full text-sm">
        <thead className="text-[#53637d]">
          <tr>
            <th className="py-2 text-left font-semibold">Metric</th>
            <th className="py-2 text-center font-semibold">Baseline</th>
            <th className="py-2 text-center font-semibold">Replay</th>
            <th className="py-2 text-right font-semibold">Delta</th>
          </tr>
        </thead>
        <tbody className="text-[#071437]">
          <ReplayRow label="Score" baseline={baselineScore} replay={replayScore} delta={scoreDelta} />
          <ReplayRow
            label="Findings"
            baseline={comparison?.baselineFindingCount ?? 11}
            replay={comparison?.replayFindingCount ?? 9}
            delta={findingDelta}
          />
          <ReplayRow
            label="Trace events"
            baseline={comparison?.baselineTraceEventCount ?? 312}
            replay={comparison?.replayTraceEventCount ?? 298}
            delta={traceDelta}
          />
        </tbody>
      </table>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <ReplayPill label="Matching trace event types" value={String(comparison?.matchingTraceEventTypes.length ?? 28)} note="96% of baseline" />
        <ReplayPill label="Missing expected trace event types" value={String(comparison?.missingExpectedTraceEventTypes.length ?? 2)} note="Low impact" warning />
        <ReplayPill label="New replay trace event types" value={String(comparison?.newTraceEventTypes.length ?? 1)} note="Informational" />
      </div>
      {fixtureReplayResult ? (
        <p className="mt-4 text-xs leading-5 text-[#53637d]">
          Fixture replay produced {fixtureReplayResult.replayRun.id}.
        </p>
      ) : null}
    </Panel>
  );
}

function ReplayRow({
  baseline,
  delta,
  label,
  replay
}: {
  baseline: number;
  delta: number;
  label: string;
  replay: number;
}) {
  return (
    <tr className="border-t border-[#edf2f8]">
      <td className="py-2.5 text-[#25385e]">{label}</td>
      <td className="py-2.5 text-center font-bold">{formatScore(baseline)}</td>
      <td className="py-2.5 text-center font-bold">{formatScore(replay)}</td>
      <td className="py-2.5 text-right font-bold text-emerald-700">
        {delta > 0 ? "+" : ""}
        {formatScore(delta)}
        {delta >= 0 ? (
          <ArrowUp className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ArrowDown className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
        )}
      </td>
    </tr>
  );
}

function ReplayPill({
  label,
  note,
  value,
  warning = false
}: {
  label: string;
  note: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#d9e4f2] bg-white/80 p-3 text-center">
      <p className="text-[11px] font-semibold leading-4 text-[#25385e]">{label}</p>
      <p className={classNames("mt-3 text-2xl font-bold", warning ? "text-orange-500" : "text-[#075ec8]")}>
        {value}
      </p>
      <p className={classNames("mt-1 break-words text-xs font-semibold leading-4", warning ? "text-orange-500" : "text-[#075ec8]")}>
        {note}
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
      {message}
    </div>
  );
}

function EmptyWorkspace({ body, title }: { body: string; title: string }) {
  return (
    <Panel className="grid h-full place-items-center p-8 text-center">
      <div>
        <ShieldCheck className="mx-auto h-8 w-8 text-[#075ec8]" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold text-[#071437]">{title}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#53637d]">{body}</p>
      </div>
    </Panel>
  );
}

function DetailDrawer({
  currentRun,
  detailMode,
  onClose,
  patchCoachPlan,
  regressions,
  selectedEvent,
  selectedFinding
}: {
  currentRun: ScenarioRun | null;
  detailMode: DetailMode;
  onClose: () => void;
  patchCoachPlan: PatchCoachPlan | null;
  regressions: RegressionArtifact[];
  selectedEvent: TraceEvent | null;
  selectedFinding: Finding | null;
}) {
  if (!detailMode) {
    return null;
  }

  const title =
    detailMode === "timeline"
      ? "Timeline payload"
      : detailMode === "prompt"
        ? "Prompt preview"
        : detailMode === "plan"
          ? "Patch Coach plan"
          : detailMode === "findings"
            ? "All findings"
            : "Saved artifacts";
  const rawContent =
    detailMode === "timeline"
      ? prettyJson(selectedEvent)
      : detailMode === "prompt"
        ? prettyJson(
            patchCoachPlan?.copilotPrompts ??
              {
                selectedFinding,
                recommendedPromptFile:
                  ".github/prompts/patch-guardrail.prompt.md"
            }
          )
        : detailMode === "plan"
          ? prettyJson(patchCoachPlan ?? { selectedFinding })
          : detailMode === "findings"
            ? prettyJson(currentRun?.findings ?? [])
            : prettyJson({
                patchCoachPlan,
                regressions,
                selectedFinding
              });
  const prompt = patchCoachPlan?.copilotPrompts[0] ?? null;
  const planSteps = patchCoachPlan?.mitigationSteps ?? [];
  const eventRows =
    selectedEvent === null
      ? []
      : [
          ["Event type", titleCase(selectedEvent.type)],
          ["Actor", titleCase(selectedEvent.actor)],
          ["Boundary", titleCase(selectedEvent.trustBoundary)],
          ["Input source", selectedEvent.inputSource]
        ];

  return (
    <div className="fixed inset-0 z-50 bg-[#071437]/30 p-4 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-[760px] flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#d9e4f2] px-5">
          <h2 className="font-semibold text-[#071437]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f4f8fd]"
            aria-label="Close details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="pane-scroll min-h-0 flex-1 overflow-auto p-5">
          {detailMode === "timeline" ? (
            <div className="grid gap-4">
              <Panel className="p-4">
                <SectionLabel icon={ClipboardList}>Selected event</SectionLabel>
                <h3 className="mt-3 text-lg font-semibold leading-7 text-[#071437]">
                  {selectedEvent?.summary ?? "No event selected"}
                </h3>
                <dl className="mt-4 grid gap-3 md:grid-cols-2">
                  {eventRows.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-[#d9e4f2] p-3">
                      <dt className="text-[11px] font-semibold uppercase text-[#53637d]">
                        {label}
                      </dt>
                      <dd className="mt-2 break-words text-sm font-semibold text-[#071437]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
              <Panel className="p-4">
                <SectionLabel icon={List}>Trace events</SectionLabel>
                <div className="mt-3 grid gap-2">
                  {(currentRun?.trace ?? []).map((event) => (
                    <div
                      key={event.id}
                      className={classNames(
                        "rounded-lg border p-3",
                        event.id === selectedEvent?.id
                          ? "border-[#075ec8] bg-[#f6faff]"
                          : "border-[#d9e4f2] bg-white"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-bold text-[#071437]">
                          {event.summary}
                        </p>
                        <Chip className={boundaryTone[event.trustBoundary]}>
                          {titleCase(event.trustBoundary)}
                        </Chip>
                      </div>
                      <p className="mt-2 text-xs text-[#53637d]">
                        {formatTime(event.timestamp)} - {titleCase(event.type)}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
              <RawPayload content={rawContent} label="Raw event payload" />
            </div>
          ) : detailMode === "prompt" ? (
            <div className="grid gap-4">
              <Panel className="p-4">
                <SectionLabel icon={WandSparkles}>Copilot handoff</SectionLabel>
                <h3 className="mt-3 text-lg font-semibold leading-7 text-[#071437]">
                  {prompt?.title ?? "Bounded prompt handoff"}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#25385e]">
                  {prompt?.intent ??
                    "Use this handoff in GitHub Copilot Agent Mode or VS Code. FailSafe does not invoke Copilot from the web app."}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MiniInfo
                    body="Prompt handoff stays review-only."
                    label="Mode"
                    value="Copilot-assisted"
                  />
                  <MiniInfo
                    body="Recommended repo prompt."
                    label="Prompt file"
                    value={
                      prompt?.promptFile ??
                      ".github/prompts/patch-guardrail.prompt.md"
                    }
                  />
                  <MiniInfo
                    body="Human applies or rejects all code changes."
                    label="Patch policy"
                    value="No auto-apply"
                  />
                </div>
              </Panel>
              <RawPayload content={rawContent} label="Prompt payload" />
            </div>
          ) : detailMode === "plan" ? (
            <div className="grid gap-4">
              <Panel className="p-4">
                <SectionLabel icon={ClipboardList}>Patch Coach plan</SectionLabel>
                <ol className="mt-4 grid gap-3">
                  {planSteps.length > 0 ? (
                    planSteps.map((step, index) => (
                      <li
                        key={step.id}
                        className="flex gap-3 rounded-lg border border-[#d9e4f2] p-3"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eaf4ff] text-xs font-bold text-[#075ec8]">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#071437]">{step.title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#53637d]">
                            {step.rationale}
                          </p>
                        </div>
                      </li>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-[#53637d]">
                      Run Fix with Copilot to generate the mitigation plan.
                    </p>
                  )}
                </ol>
              </Panel>
              <RawPayload content={rawContent} label="Full plan payload" />
            </div>
          ) : detailMode === "findings" ? (
            <div className="grid gap-4">
              {(currentRun?.findings ?? []).map((finding) => (
                <Panel key={finding.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <SectionLabel icon={ShieldAlert}>
                        {titleCase(finding.category)}
                      </SectionLabel>
                      <h3 className="mt-2 text-lg font-semibold leading-7 text-[#071437]">
                        {finding.title}
                      </h3>
                    </div>
                    <Chip className={severityTone[finding.severity]}>
                      {finding.severity}
                    </Chip>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#25385e]">
                    {finding.rootCause}
                  </p>
                </Panel>
              ))}
              <RawPayload content={rawContent} label="All findings payload" />
            </div>
          ) : (
            <div className="grid gap-4">
              <Panel className="p-4">
                <SectionLabel icon={ShieldCheck}>Saved artifacts</SectionLabel>
                <div className="mt-4 grid gap-3">
                  {regressions.length > 0 ? (
                    regressions.map((regression) => (
                      <div
                        key={regression.id}
                        className="rounded-lg border border-[#d9e4f2] p-3"
                      >
                        <p className="text-sm font-bold text-[#071437]">
                          {regression.name}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#53637d]">
                          {regression.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#53637d]">
                      No saved regression artifacts yet.
                    </p>
                  )}
                </div>
              </Panel>
              <RawPayload content={rawContent} label="Artifact payload" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RawPayload({ content, label }: { content: string; label: string }) {
  return (
    <Panel className="p-4">
      <SectionLabel icon={FileJson}>{label}</SectionLabel>
      <pre
        className="mt-3 max-h-[360px] overflow-auto rounded-lg bg-[#f8fbff] p-4 text-xs leading-5 text-[#25385e]"
        data-scroll-pane="payload"
      >
        {content}
      </pre>
    </Panel>
  );
}

export function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<FoundryAgentImport[]>([]);
  const [evidenceCaptures, setEvidenceCaptures] = useState<AgentEvidenceCapture[]>([]);
  const [foundryReadiness, setFoundryReadiness] =
    useState<FoundryReadinessResult | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<StudioView>("foundry");
  const [trustMap, setTrustMap] = useState<AgentTrustBoundaryMap | null>(null);
  const [scenarioPacks, setScenarioPacks] = useState<ScenarioPack[]>([]);
  const [currentRun, setCurrentRun] = useState<ScenarioRun | null>(null);
  const [regressions, setRegressions] = useState<RegressionArtifact[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [selectedFindingId, setSelectedFindingId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSavingRegression, setIsSavingRegression] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastSavedRegressionId, setLastSavedRegressionId] = useState<string | undefined>();
  const [fixtureReplayingRegressionId, setFixtureReplayingRegressionId] =
    useState<string | undefined>();
  const [fixtureReplayResult, setFixtureReplayResult] =
    useState<FixtureReplayResult | null>(null);
  const [replayComparison, setReplayComparison] =
    useState<ReplayComparison | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [patchCoachPlan, setPatchCoachPlan] = useState<PatchCoachPlan | null>(null);
  const [isLoadingPatchCoach, setIsLoadingPatchCoach] = useState(false);
  const [patchCoachError, setPatchCoachError] = useState<string | null>(null);
  const [safetyReport, setSafetyReport] = useState<SafetyReport | null>(null);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isResettingDemoData, setIsResettingDemoData] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [isImportingAgent, setIsImportingAgent] = useState(false);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [isRunningAgentFixture, setIsRunningAgentFixture] = useState(false);
  const [isImportingEvidence, setIsImportingEvidence] = useState(false);
  const [isRunningEvidence, setIsRunningEvidence] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>(null);
  const [eventFilter, setEventFilter] = useState("all");
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);
  const [artifactTab, setArtifactTab] = useState<ArtifactTab>("regressions");
  const manifestInputRef = useRef<HTMLInputElement | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);

  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const selectedEvidence =
    evidenceCaptures.find((capture) => capture.id === selectedEvidenceId) ??
    evidenceCaptures[0] ??
    null;
  const selectedPack = useMemo(
    () =>
      scenarioPacks.find((pack) => pack.id === selectedPackId) ??
      scenarioPacks[0] ??
      null,
    [scenarioPacks, selectedPackId]
  );
  const project =
    projects.find((item) => item.id === currentRun?.projectId) ??
    projects.find((item) => item.id === selectedEvidence?.projectId) ??
    projects.find((item) => item.id === selectedAgent?.projectId) ??
    projects[0] ??
    null;
  const selectedFinding =
    currentRun?.findings.find((finding) => finding.id === selectedFindingId) ??
    currentRun?.findings[0] ??
    null;
  const selectedEvent = selectedEventForRun(currentRun, selectedEventId);

  const applyRun = useCallback((run: ScenarioRun) => {
    setCurrentRun(run);
    setSelectedPackId(run.scenarioPackId);
    setSelectedEventId(
      run.trace.find((event) => event.type === "policy_violation")?.id ??
        run.trace.at(-1)?.id
    );
    setSelectedFindingId(run.findings[0]?.id);
  }, []);

  const loadReplayComparison = useCallback(async (run: ScenarioRun) => {
    if (!run.baselineRunId) {
      setReplayComparison(null);
      setComparisonError(null);
      setIsLoadingComparison(false);
      return;
    }

    setIsLoadingComparison(true);
    setComparisonError(null);

    try {
      setReplayComparison(await getRunComparison(run.id));
    } catch (error) {
      setReplayComparison(null);
      setComparisonError(formatError(error));
    } finally {
      setIsLoadingComparison(false);
    }
  }, []);

  useEffect(() => {
    if (!currentRun?.baselineRunId) {
      if (replayComparison || comparisonError || isLoadingComparison) {
        setReplayComparison(null);
        setComparisonError(null);
        setIsLoadingComparison(false);
      }
      return;
    }

    if (
      comparisonError ||
      isRunInProgress(currentRun) ||
      replayComparison?.replayRunId === currentRun.id ||
      isLoadingComparison
    ) {
      return;
    }

    void loadReplayComparison(currentRun);
  }, [
    comparisonError,
    currentRun,
    isLoadingComparison,
    loadReplayComparison,
    replayComparison,
    replayComparison?.replayRunId
  ]);

  const loadStudioData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setActionError(null);

    try {
      await getHealth();
      let [
        loadedReadiness,
        loadedAgents,
        loadedEvidence,
        loadedProjects,
        loadedScenarios,
        loadedRuns,
        loadedRegressions
      ] = await Promise.all([
        getFoundryReadiness(),
        listAgents(),
        listEvidenceCaptures(),
        listProjects(),
        listScenarios(),
        listRuns(),
        listRegressions()
      ]);

      const nextAgentId = loadedAgents[0]?.id;
      const nextEvidenceId = loadedEvidence[0]?.id;

      setFoundryReadiness(loadedReadiness);
      setAgents(loadedAgents);
      setSelectedAgentId(nextAgentId);
      setEvidenceCaptures(loadedEvidence);
      setSelectedEvidenceId(nextEvidenceId);
      setProjects(loadedProjects);
      setScenarioPacks(loadedScenarios);
      setRegressions(loadedRegressions);
      const currentLoadedRun = latestRun(loadedRuns);

      setSelectedPackId(
        currentLoadedRun?.scenarioPackId ??
          loadedEvidence[0]?.scenarioPackId ??
          loadedScenarios[0]?.id ??
          ""
      );

      if (currentLoadedRun) {
        applyRun(currentLoadedRun);
      } else {
        setCurrentRun(null);
        setSelectedEventId(undefined);
        setSelectedFindingId(undefined);
      }

      setTrustMap(nextAgentId ? await getAgentTrustMap(nextAgentId) : null);
      loadedReadiness = await getFoundryReadiness();
      setFoundryReadiness(loadedReadiness);
    } catch (error) {
      setLoadError(formatError(error));
    } finally {
      setIsLoading(false);
    }
  }, [applyRun]);

  useEffect(() => {
    void loadStudioData();
  }, [loadStudioData]);

  async function pollRun(run: ScenarioRun) {
    let latestRun = run;
    for (let attempt = 0; attempt < 8 && isRunInProgress(latestRun); attempt += 1) {
      await delay(650);
      latestRun = await getRun(run.id);
      applyRun(latestRun);
    }
  }

  async function handleRun() {
    if (!project || !selectedPack) {
      return;
    }

    setActionError(null);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setResetMessage(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setIsRunning(true);
    setActiveView("crash");

    try {
      const createdRun = await createMockRun({
        projectId: project.id,
        scenarioPackId: selectedPack.id,
        agentTargetId: project.agentTargets[0]?.id
      });

      applyRun(createdRun);
      await pollRun(createdRun);
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRunCommand() {
    if (selectedEvidence) {
      await handleRunEvidenceCrashTest();
      return;
    }

    if (selectedAgent) {
      await handleRunFoundryCrashTest();
      return;
    }

    await handleRun();
  }

  function handleImportManifestClick() {
    manifestInputRef.current?.click();
  }

  async function handleImportSampleManifest() {
    setAgentError(null);
    setIsImportingAgent(true);

    try {
      const imported = await importFoundryManifest({ source: "sample" });
      const [loadedAgents, loadedProjects, loadedTrustMap] = await Promise.all([
        listAgents(),
        listProjects(),
        getAgentTrustMap(imported.id)
      ]);

      setAgents(loadedAgents);
      setProjects(loadedProjects);
      setSelectedAgentId(imported.id);
      setTrustMap(loadedTrustMap);
      setActiveView("foundry");
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsImportingAgent(false);
    }
  }

  async function handleManifestFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    setAgentError(null);
    setIsImportingAgent(true);

    try {
      const manifest = FoundryAgentManifestSchema.parse(await readJsonFile(file));
      const imported = await importFoundryManifest({ manifest });
      const [loadedAgents, loadedProjects, loadedTrustMap] = await Promise.all([
        listAgents(),
        listProjects(),
        getAgentTrustMap(imported.id)
      ]);

      setAgents(loadedAgents);
      setProjects(loadedProjects);
      setSelectedAgentId(imported.id);
      setTrustMap(loadedTrustMap);
      setActiveView("foundry");
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsImportingAgent(false);
    }
  }

  async function handleSelectAgent(id: string) {
    setAgentError(null);
    setSelectedAgentId(id);

    try {
      setTrustMap(await getAgentTrustMap(id));
    } catch (error) {
      setTrustMap(null);
      setAgentError(formatError(error));
    }
  }

  async function handleRunFoundryCrashTest() {
    if (!selectedAgent || !selectedPack) {
      return;
    }

    setAgentError(null);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setIsRunningAgent(true);
    setActiveView("crash");

    try {
      const run = await runAgentCrashTest(selectedAgent.id, selectedPack.id);
      applyRun(run);
      setProjects(await listProjects());
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsRunningAgent(false);
    }
  }

  async function handleRunFoundryFixtureReplay() {
    if (!selectedAgent || !selectedPack) {
      return;
    }

    setAgentError(null);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setIsRunningAgentFixture(true);
    setActiveView("crash");

    try {
      const run = await runAgentFixtureReplay(selectedAgent.id, selectedPack.id);
      applyRun(run);
      setProjects(await listProjects());
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsRunningAgentFixture(false);
    }
  }

  function handleImportEvidenceClick() {
    evidenceInputRef.current?.click();
  }

  async function handleImportSampleEvidence() {
    setAgentError(null);
    setIsImportingEvidence(true);

    try {
      const imported = await importSampleEvidence();
      const [loadedEvidence, loadedProjects] = await Promise.all([
        listEvidenceCaptures(),
        listProjects()
      ]);

      setEvidenceCaptures(loadedEvidence);
      setProjects(loadedProjects);
      setSelectedEvidenceId(imported.id);
      setSelectedPackId(imported.scenarioPackId);
      setActiveView("foundry");
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsImportingEvidence(false);
    }
  }

  async function handleEvidenceFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    setAgentError(null);
    setIsImportingEvidence(true);

    try {
      const evidenceInput = ImportAgentEvidenceInputSchema.parse(
        await readJsonFile(file)
      );
      const imported = await importAgentEvidence(evidenceInput);
      const [loadedEvidence, loadedProjects] = await Promise.all([
        listEvidenceCaptures(),
        listProjects()
      ]);

      setEvidenceCaptures(loadedEvidence);
      setProjects(loadedProjects);
      setSelectedEvidenceId(imported.id);
      setActiveView("foundry");
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsImportingEvidence(false);
    }
  }

  async function handleRunEvidenceCrashTest() {
    if (!selectedEvidence || !selectedPack) {
      return;
    }

    setAgentError(null);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setIsRunningEvidence(true);
    setActiveView("crash");

    try {
      const response = await runEvidenceCrashTest(
        selectedEvidence.id,
        selectedPack.id
      );

      applyRun(response.run);
      setProjects(await listProjects());
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsRunningEvidence(false);
    }
  }

  async function handleFixWithCopilot() {
    if (!currentRun || !selectedFinding) {
      return;
    }

    setActiveView("patch");
    setArtifactTab("handoffs");
    setPatchCoachError(null);
    setPatchCoachPlan(null);
    setIsLoadingPatchCoach(true);

    try {
      setPatchCoachPlan(
        await createPatchCoachPlan(currentRun.id, selectedFinding.id)
      );
    } catch (error) {
      setPatchCoachError(formatError(error));
    } finally {
      setIsLoadingPatchCoach(false);
    }
  }

  async function handleSaveRegression() {
    if (!currentRun || !terminalRunReady(currentRun)) {
      return;
    }

    setActionError(null);
    setIsSavingRegression(true);
    setActiveView("patch");
    setArtifactTab("regressions");

    try {
      const evidenceEventIds =
        selectedFinding?.evidenceEventIds ??
        currentRun.trace.map((event) => event.id);
      const regression = await saveRegression({
        runId: currentRun.id,
        findingIds: selectedFinding
          ? [selectedFinding.id]
          : currentRun.findings.map((finding) => finding.id),
        name: regressionName(selectedFinding, selectedPack),
        traceEventIds: evidenceEventIds
      });

      setRegressions((items) => [
        regression,
        ...items.filter((item) => item.id !== regression.id)
      ]);
      setLastSavedRegressionId(regression.id);
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setIsSavingRegression(false);
    }
  }

  async function handleFixtureReplayRegression(regression: RegressionArtifact) {
    setActionError(null);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setReplayComparison(null);
    setComparisonError(null);
    setFixtureReplayResult(null);
    setFixtureReplayingRegressionId(regression.id);

    try {
      const result = await replayFixtureRegression(regression.id);

      setFixtureReplayResult(result);
      setReplayComparison(result.comparison);
      applyRun(result.replayRun);
      setActiveView("safety");
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setFixtureReplayingRegressionId(undefined);
    }
  }

  async function handleReplayRegression(regression: RegressionArtifact) {
    setActionError(null);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setReplayComparison(null);
    setComparisonError(null);
    setFixtureReplayResult(null);

    try {
      const createdRun = await replayMockRegression(regression.id);
      applyRun(createdRun);
      await pollRun(createdRun);
    } catch (error) {
      setActionError(formatError(error));
    }
  }

  async function handleCreateSafetyReport() {
    if (!currentRun) {
      return;
    }

    setReportError(null);
    setResetMessage(null);
    setIsCreatingReport(true);
    setActiveView("safety");

    try {
      const linkedRegression = regressions.find(
        (regression) =>
          regression.runId === currentRun.id ||
          regression.runId === currentRun.baselineRunId
      );

      setSafetyReport(
        await createSafetyReport(currentRun.id, linkedRegression?.id)
      );
    } catch (error) {
      setSafetyReport(null);
      setReportError(formatError(error));
    } finally {
      setIsCreatingReport(false);
    }
  }

  async function handleResetDemoData() {
    setReportError(null);
    setActionError(null);
    setResetMessage(null);
    setIsResettingDemoData(true);

    try {
      const reset = await resetDemoData();

      setPatchCoachPlan(null);
      setPatchCoachError(null);
      setSafetyReport(null);
      setAgents([]);
      setSelectedAgentId(undefined);
      setEvidenceCaptures([]);
      setSelectedEvidenceId(undefined);
      setTrustMap(null);
      setFixtureReplayResult(null);
      setReplayComparison(null);
      setComparisonError(null);
      setLastSavedRegressionId(undefined);
      setResetMessage(reset.safety);
      await loadStudioData();
    } catch (error) {
      setReportError(formatError(error));
    } finally {
      setIsResettingDemoData(false);
    }
  }

  function handleExportTimeline() {
    if (!currentRun) {
      return;
    }

    const blob = new Blob([prettyJson(currentRun.trace)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentRun.id}-timeline.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const isAnyRunning =
    isRunning || isRunningAgent || isRunningEvidence || isRunningAgentFixture;

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7faff]">
        <Panel className="w-full max-w-xl p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#075ec8]" />
            <div>
              <p className="font-semibold text-[#071437]">Loading FailSafe Studio</p>
              <p className="mt-1 text-sm text-[#53637d]">
                Fetching readiness, evidence, scenarios, runs, and regressions.
              </p>
            </div>
          </div>
        </Panel>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7faff] p-6">
        <Panel className="w-full max-w-2xl p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" />
            <div>
              <SectionLabel>Local API unavailable</SectionLabel>
              <h2 className="mt-3 text-2xl font-semibold text-[#071437]">
                The API-backed crash-lab flow could not load.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#53637d]">
                {loadError} Run <code>pnpm dev</code> from the project root to
                start both the Fastify API and the Next.js studio.
              </p>
              <CommandButton icon={RefreshCcw} onClick={() => void loadStudioData()}>
                Retry API Load
              </CommandButton>
            </div>
          </div>
        </Panel>
      </main>
    );
  }

  const workspace =
    activeView === "foundry" ? (
      <FoundryWorkspace
        agents={agents}
        error={agentError}
        evidenceCaptures={evidenceCaptures}
        foundryReadiness={foundryReadiness}
        isImporting={isImportingAgent}
        isImportingEvidence={isImportingEvidence}
        onImportEvidence={handleImportEvidenceClick}
        onImportManifest={handleImportManifestClick}
        onImportSampleEvidence={() => void handleImportSampleEvidence()}
        onImportSampleManifest={() => void handleImportSampleManifest()}
        onRunAgentCrashTest={() => void handleRunFoundryCrashTest()}
        onRunEvidenceCrashTest={() => void handleRunEvidenceCrashTest()}
        onSelectAgent={(id) => void handleSelectAgent(id)}
        onSelectEvidence={(id) => setSelectedEvidenceId(id)}
        readiness={foundryReadiness}
        selectedAgent={selectedAgent}
        selectedEvidence={selectedEvidence}
        trustMap={trustMap}
      />
    ) : activeView === "crash" ? (
      <CrashWorkspace
        currentRun={currentRun}
        eventFilter={eventFilter}
        onExportTimeline={handleExportTimeline}
        onSelectEvent={(event) => setSelectedEventId(event.id)}
        onSetDetailMode={setDetailMode}
        onSetEventFilter={setEventFilter}
        selectedEvent={selectedEvent}
      />
    ) : activeView === "patch" ? (
      <PatchWorkspace
        artifactTab={artifactTab}
        currentRun={currentRun}
        detailMode={detailMode}
        fixtureReplayingRegressionId={fixtureReplayingRegressionId}
        isLoadingPatchCoach={isLoadingPatchCoach}
        onFixWithCopilot={() => void handleFixWithCopilot()}
        onFixtureReplay={(regression) => void handleFixtureReplayRegression(regression)}
        onReplayMock={(regression) => void handleReplayRegression(regression)}
        onSaveRegression={() => void handleSaveRegression()}
        onSetArtifactTab={setArtifactTab}
        onSetDetailMode={setDetailMode}
        patchCoachError={patchCoachError}
        patchCoachPlan={patchCoachPlan}
        regressions={regressions}
        selectedFinding={selectedFinding}
        selectedPack={selectedPack}
        trace={currentRun?.trace ?? []}
      />
    ) : (
      <SafetyWorkspace
        comparison={replayComparison}
        currentRun={currentRun}
        fixtureReplayResult={fixtureReplayResult}
        isCreatingReport={isCreatingReport}
        isResetting={isResettingDemoData}
        onCreateReport={() => void handleCreateSafetyReport()}
        onResetDemoData={() => void handleResetDemoData()}
        project={project}
        report={safetyReport}
        reportError={reportError}
        resetMessage={resetMessage}
        selectedPack={selectedPack}
      />
    );

  return (
    <main className="min-h-screen bg-[#f7faff] text-[#071437]">
      <input
        ref={manifestInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-label="Import reviewed Foundry manifest JSON"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void handleManifestFileSelected(file);
        }}
      />
      <input
        ref={evidenceInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-label="Import reviewed recorded evidence JSON"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void handleEvidenceFileSelected(file);
        }}
      />
      <AppCommandBar
        activeView={activeView}
        canFix={Boolean(selectedFinding)}
        canRun={Boolean(selectedPack && (project || selectedAgent || selectedEvidence))}
        canSave={terminalRunReady(currentRun)}
        isRunning={isAnyRunning}
        isSavingRegression={isSavingRegression}
        onFix={() => void handleFixWithCopilot()}
        onHome={() => {
          setActiveView("foundry");
          setDetailMode(null);
          setMobilePanel(null);
        }}
        onMenu={() => setMobilePanel("nav")}
        onOpenInspector={() => setMobilePanel("inspector")}
        onRun={() => void handleRunCommand()}
        onSave={() => void handleSaveRegression()}
        runStatus={currentRun?.status}
      />
      <div className="grid min-w-0 items-start xl:grid-cols-[284px_minmax(0,1fr)_354px]">
        <div className="hidden xl:sticky xl:top-[68px] xl:block xl:h-[calc(100vh-68px)] xl:overflow-y-auto">
          <Sidebar
            activeView={activeView}
            onExpandLibrary={() => setIsLibraryExpanded(true)}
            onSelectPack={(packId) => {
              setSelectedPackId(packId);
              setDetailMode(null);
            }}
            onSetView={setActiveView}
            packs={scenarioPacks}
            selectedPackId={selectedPack?.id ?? ""}
          />
        </div>

        <section className="min-w-0 p-4 xl:p-5">
          {actionError ? <ErrorBanner message={actionError} /> : null}
          <div className={classNames("min-w-0", actionError && "pt-3")}>
            {workspace}
          </div>
        </section>

        <div className="hidden xl:sticky xl:top-[68px] xl:block xl:h-[calc(100vh-68px)]">
          <RiskInspectorPanel
            activeView={activeView}
            currentRun={currentRun}
            isCreatingReport={isCreatingReport}
            isResetting={isResettingDemoData}
            onCreateReport={() => void handleCreateSafetyReport()}
            onOpenSafety={() => setActiveView("safety")}
            onResetDemoData={() => void handleResetDemoData()}
            project={project}
            reportError={reportError}
            resetMessage={resetMessage}
            selectedFinding={selectedFinding}
            selectedPack={selectedPack}
          />
        </div>
      </div>

      {mobilePanel ? (
        <div className="fixed inset-0 z-40 bg-[#071437]/35 xl:hidden">
          <div className="h-full w-[min(88vw,360px)] bg-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-[#d9e4f2] px-4">
              <span className="font-semibold text-[#071437]">
                {mobilePanel === "nav" ? "Navigation" : "Inspector"}
              </span>
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f4f8fd]"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto">
              {mobilePanel === "nav" ? (
                <Sidebar
                  activeView={activeView}
                  onExpandLibrary={() => {
                    setMobilePanel(null);
                    setIsLibraryExpanded(true);
                  }}
                  onSelectPack={(packId) => {
                    setSelectedPackId(packId);
                    setMobilePanel(null);
                  }}
                  onSetView={(view) => {
                    setActiveView(view);
                    setMobilePanel(null);
                  }}
                  packs={scenarioPacks}
                  selectedPackId={selectedPack?.id ?? ""}
                />
              ) : (
                <RiskInspectorPanel
                  activeView={activeView}
                  currentRun={currentRun}
                  isCreatingReport={isCreatingReport}
                  isResetting={isResettingDemoData}
                  onCreateReport={() => void handleCreateSafetyReport()}
                  onOpenSafety={() => {
                    setActiveView("safety");
                    setMobilePanel(null);
                  }}
                  onResetDemoData={() => void handleResetDemoData()}
                  project={project}
                  reportError={reportError}
                  resetMessage={resetMessage}
                  selectedFinding={selectedFinding}
                  selectedPack={selectedPack}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isLibraryExpanded ? (
        <ScenarioLibraryDrawer
          onClose={() => setIsLibraryExpanded(false)}
          onSelectPack={(packId) => {
            setSelectedPackId(packId);
            setDetailMode(null);
          }}
          packs={scenarioPacks}
          selectedPackId={selectedPack?.id ?? ""}
        />
      ) : null}

      <DetailDrawer
        currentRun={currentRun}
        detailMode={detailMode}
        onClose={() => setDetailMode(null)}
        patchCoachPlan={patchCoachPlan}
        regressions={regressions}
        selectedEvent={selectedEvent}
        selectedFinding={selectedFinding}
      />

      <div className="sr-only" aria-live="polite">
        {lastSavedRegressionId
          ? `Saved regression ${lastSavedRegressionId}.`
          : null}
        {fixtureReplayingRegressionId
          ? `Replaying fixture ${fixtureReplayingRegressionId}.`
          : null}
        {comparisonError ? `Comparison unavailable: ${comparisonError}` : null}
      </div>
    </main>
  );
}
