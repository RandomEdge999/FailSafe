"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AgentEvidenceCapture,
  Finding,
  FoundryAgentImport,
  FoundryReadinessResult,
  AgentTrustBoundaryMap,
  FixtureReplayResult,
  PatchCoachPlan,
  Project,
  RegressionArtifact,
  SafetyReport,
  SandboxReplayPlan,
  ScenarioPack,
  ScenarioRun,
  TraceEvent
} from "@failsafe/schemas";
import type { ReplayComparison } from "@failsafe/schemas";
import {
  AlertTriangle,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  WandSparkles
} from "lucide-react";
import { AgentOpsPanel } from "./AgentOpsPanel";
import { CopilotPromptPanel } from "./CopilotPromptPanel";
import { CrashTimeline } from "./CrashTimeline";
import { DashboardHeader } from "./DashboardHeader";
import { EmptyState } from "./EmptyState";
import { FindingCard } from "./FindingCard";
import { FindingDetailPanel } from "./FindingDetailPanel";
import { RegressionPanel } from "./RegressionPanel";
import { ReplayComparisonPanel } from "./ReplayComparisonPanel";
import { ReportPanel } from "./ReportPanel";
import { RiskInspector } from "./RiskInspector";
import { RunnerReadinessPanel } from "./RunnerReadinessPanel";
import { SafetyScoreCard } from "./SafetyScoreCard";
import { SandboxPlanPanel } from "./SandboxPlanPanel";
import { ScenarioLibrary } from "./ScenarioLibrary";
import {
  createPatchCoachPlan,
  createSandboxPlan,
  createSafetyReport,
  createMockRun,
  getAgentTrustMap,
  getFoundryReadiness,
  getHealth,
  getRun,
  getRunComparison,
  importFoundryManifest,
  importSampleEvidence,
  listAgents,
  listEvidenceCaptures,
  listProjects,
  listRegressions,
  listRuns,
  listScenarios,
  runAgentCrashTest,
  runAgentFixtureReplay,
  runEvidenceCrashTest,
  replayFixtureRegression,
  replayMockRegression,
  resetDemoData,
  saveRegression
} from "../lib/api-client";

type StudioView = "foundry" | "crash" | "patch" | "safety";

const studioViews: Array<{
  id: StudioView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "foundry", label: "Foundry evidence", icon: LayoutDashboard },
  { id: "crash", label: "Crash test", icon: FlaskConical },
  { id: "patch", label: "Patch and regression", icon: WandSparkles },
  { id: "safety", label: "Safety card", icon: FileText }
];

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "FailSafe local API hit an unexpected error.";
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

export function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<FoundryAgentImport[]>([]);
  const [evidenceCaptures, setEvidenceCaptures] = useState<
    AgentEvidenceCapture[]
  >([]);
  const [foundryReadiness, setFoundryReadiness] =
    useState<FoundryReadinessResult | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<
    string | undefined
  >();
  const [activeView, setActiveView] = useState<StudioView>("foundry");
  const [trustMap, setTrustMap] = useState<AgentTrustBoundaryMap | null>(null);
  const [scenarioPacks, setScenarioPacks] = useState<ScenarioPack[]>([]);
  const [currentRun, setCurrentRun] = useState<ScenarioRun | null>(null);
  const [regressions, setRegressions] = useState<RegressionArtifact[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [selectedFindingId, setSelectedFindingId] = useState<
    string | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [replayingRegressionId, setReplayingRegressionId] = useState<
    string | undefined
  >();
  const [isSavingRegression, setIsSavingRegression] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCopilotPanel, setShowCopilotPanel] = useState(false);
  const [lastSavedRegressionId, setLastSavedRegressionId] = useState<
    string | undefined
  >();
  const [lastReplayedRegressionId, setLastReplayedRegressionId] = useState<
    string | undefined
  >();
  const [lastFixtureReplayedRegressionId, setLastFixtureReplayedRegressionId] =
    useState<string | undefined>();
  const [fixtureReplayingRegressionId, setFixtureReplayingRegressionId] =
    useState<string | undefined>();
  const [fixtureReplayResult, setFixtureReplayResult] =
    useState<FixtureReplayResult | null>(null);
  const [replayComparison, setReplayComparison] =
    useState<ReplayComparison | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [sandboxPlan, setSandboxPlan] = useState<SandboxReplayPlan | null>(
    null
  );
  const [planningRegressionId, setPlanningRegressionId] = useState<
    string | undefined
  >();
  const [sandboxPlanError, setSandboxPlanError] = useState<string | null>(null);
  const [patchCoachPlan, setPatchCoachPlan] =
    useState<PatchCoachPlan | null>(null);
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

  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const selectedEvidence =
    evidenceCaptures.find((capture) => capture.id === selectedEvidenceId) ??
    evidenceCaptures[0] ??
    null;
  const project =
    projects.find((item) => item.id === currentRun?.projectId) ??
    projects.find((item) => item.id === selectedAgent?.projectId) ??
    projects.find((item) => item.id === selectedEvidence?.projectId) ??
    projects[0] ??
    null;
  const selectedPack = useMemo(
    () =>
      scenarioPacks.find((pack) => pack.id === selectedPackId) ??
      scenarioPacks[0] ??
      null,
    [scenarioPacks, selectedPackId]
  );
  const selectedFinding =
    currentRun?.findings.find((finding) => finding.id === selectedFindingId) ??
    currentRun?.findings[0] ??
    null;

  const applyRun = useCallback((run: ScenarioRun) => {
    setCurrentRun(run);
    setSelectedPackId(run.scenarioPackId);

    if (run.trace.length > 0) {
      setSelectedEventId(run.trace[run.trace.length - 1]?.id);
    }

    if (run.findings.length > 0) {
      setSelectedFindingId(run.findings[0]?.id);
    }
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
    replayComparison?.replayRunId
  ]);

  const loadStudioData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setActionError(null);

    try {
      await getHealth();
      const [
        loadedReadiness,
        loadedAgents,
        loadedEvidence,
        loadedProjects,
        loadedScenarios,
        loadedRuns,
        loadedRegressions
      ] =
        await Promise.all([
          getFoundryReadiness(),
          listAgents(),
          listEvidenceCaptures(),
          listProjects(),
          listScenarios(),
          listRuns(),
          listRegressions()
        ]);

      setFoundryReadiness(loadedReadiness);
      setAgents(loadedAgents);
      const nextAgentId = selectedAgentId ?? loadedAgents[0]?.id;
      setSelectedAgentId(nextAgentId);
      setEvidenceCaptures(loadedEvidence);
      setSelectedEvidenceId(selectedEvidenceId ?? loadedEvidence[0]?.id);
      setProjects(loadedProjects);
      setScenarioPacks(loadedScenarios);
      setRegressions(loadedRegressions);
      setSelectedPackId(
        loadedRuns[0]?.scenarioPackId ?? loadedScenarios[0]?.id ?? ""
      );

      if (loadedRuns[0]) {
        applyRun(loadedRuns[0]);
      } else {
        setCurrentRun(null);
        setSelectedEventId(undefined);
        setSelectedFindingId(undefined);
      }

      if (nextAgentId) {
        setTrustMap(await getAgentTrustMap(nextAgentId));
      } else {
        setTrustMap(null);
      }
    } catch (error) {
      setLoadError(formatError(error));
    } finally {
      setIsLoading(false);
    }
  }, [applyRun, selectedAgentId, selectedEvidenceId]);

  useEffect(() => {
    void loadStudioData();
  }, [loadStudioData]);

  async function handleRun() {
    if (!project || !selectedPack) {
      return;
    }

    setActionError(null);
    setShowCopilotPanel(false);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setResetMessage(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setSandboxPlan(null);
    setSandboxPlanError(null);
    setIsRunning(true);
    setActiveView("crash");

    try {
      const createdRun = selectedAgent
        ? await runAgentCrashTest(selectedAgent.id, selectedPack.id)
        : await createMockRun({
            projectId: project.id,
            scenarioPackId: selectedPack.id,
            agentTargetId: project.agentTargets[0]?.id
          });

      applyRun(createdRun);

      let latestRun = createdRun;
      for (let attempt = 0; attempt < 8 && isRunInProgress(latestRun); attempt += 1) {
        await delay(650);
        latestRun = await getRun(createdRun.id);
        applyRun(latestRun);
      }
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setIsRunning(false);
    }
  }

  async function handleImportFoundrySample() {
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
    setShowCopilotPanel(false);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setSandboxPlan(null);
    setSandboxPlanError(null);
    setIsRunningAgent(true);
    setActiveView("crash");

    try {
      applyRun(await runAgentCrashTest(selectedAgent.id, selectedPack.id));
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
    setShowCopilotPanel(false);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setSandboxPlan(null);
    setSandboxPlanError(null);
    setIsRunningAgentFixture(true);
    setActiveView("crash");

    try {
      applyRun(await runAgentFixtureReplay(selectedAgent.id, selectedPack.id));
      setProjects(await listProjects());
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsRunningAgentFixture(false);
    }
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
      setActiveView("foundry");
    } catch (error) {
      setAgentError(formatError(error));
    } finally {
      setIsImportingEvidence(false);
    }
  }

  async function handleSelectEvidence(id: string) {
    setAgentError(null);
    setSelectedEvidenceId(id);
  }

  async function handleRunEvidenceCrashTest() {
    if (!selectedEvidence || !selectedPack) {
      return;
    }

    setAgentError(null);
    setShowCopilotPanel(false);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setFixtureReplayResult(null);
    setReplayComparison(null);
    setComparisonError(null);
    setSandboxPlan(null);
    setSandboxPlanError(null);
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

    setShowCopilotPanel(true);
    setActiveView("patch");
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

    try {
      const evidenceEventIds =
        selectedFinding?.evidenceEventIds ?? currentRun.trace.map((event) => event.id);
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

  async function handleReplayRegression(regression: RegressionArtifact) {
    setActionError(null);
    setShowCopilotPanel(false);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setReplayComparison(null);
    setComparisonError(null);
    setFixtureReplayResult(null);
    setSandboxPlan(null);
    setSandboxPlanError(null);
    setReplayingRegressionId(regression.id);

    try {
      const createdRun = await replayMockRegression(regression.id);

      applyRun(createdRun);
      setLastReplayedRegressionId(regression.id);

      let latestRun = createdRun;
      for (let attempt = 0; attempt < 8 && isRunInProgress(latestRun); attempt += 1) {
        await delay(650);
        latestRun = await getRun(createdRun.id);
        applyRun(latestRun);
      }
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setReplayingRegressionId(undefined);
    }
  }

  async function handleFixtureReplayRegression(regression: RegressionArtifact) {
    setActionError(null);
    setShowCopilotPanel(false);
    setPatchCoachPlan(null);
    setPatchCoachError(null);
    setSafetyReport(null);
    setReportError(null);
    setReplayComparison(null);
    setComparisonError(null);
    setFixtureReplayResult(null);
    setSandboxPlan(null);
    setSandboxPlanError(null);
    setFixtureReplayingRegressionId(regression.id);

    try {
      const result = await replayFixtureRegression(regression.id);

      setFixtureReplayResult(result);
      setReplayComparison(result.comparison);
      applyRun(result.replayRun);
      setLastFixtureReplayedRegressionId(regression.id);
      setActiveView("patch");
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setFixtureReplayingRegressionId(undefined);
    }
  }

  async function handleCreateSandboxPlan(regression: RegressionArtifact) {
    setSandboxPlanError(null);
    setPlanningRegressionId(regression.id);

    try {
      setSandboxPlan(await createSandboxPlan(regression.id));
      setActiveView("safety");
    } catch (error) {
      setSandboxPlan(null);
      setSandboxPlanError(formatError(error));
    } finally {
      setPlanningRegressionId(undefined);
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
      setSandboxPlan(null);
      setSandboxPlanError(null);
      setLastSavedRegressionId(undefined);
      setLastReplayedRegressionId(undefined);
      setLastFixtureReplayedRegressionId(undefined);
      setResetMessage(reset.safety);
      await loadStudioData();
    } catch (error) {
      setReportError(formatError(error));
    } finally {
      setIsResettingDemoData(false);
    }
  }

  const header = (
    <DashboardHeader
      canFix={Boolean(selectedFinding)}
      canRun={Boolean((project || selectedAgent) && selectedPack)}
      canSave={terminalRunReady(currentRun)}
      isRunning={isRunning}
      isSavingRegression={isSavingRegression}
      onFixWithCopilot={handleFixWithCopilot}
      onRun={handleRun}
      onSaveRegression={handleSaveRegression}
      runStatus={currentRun?.status}
    />
  );

  const modeSwitcher = (
    <nav
      aria-label="Studio views"
      className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="grid gap-1">
        {studioViews.map((view) => {
          const Icon = view.icon;
          const selected = activeView === view.id;

          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                selected
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              aria-current={selected ? "page" : undefined}
            >
              <Icon
                className={`h-4 w-4 ${selected ? "text-brand-700" : "text-slate-500"}`}
                aria-hidden="true"
              />
              {view.label}
            </button>
          );
        })}
      </div>
    </nav>
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-app">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-signal" />
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Loading FailSafe Studio
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Fetching Foundry readiness, projects, scenarios, runs,
                  findings, and saved regressions from the orchestrator API.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-app">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <section className="rounded-lg border border-danger/30 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-danger" />
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase text-danger">
                  Local API unavailable
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  The API-backed crash-lab flow could not load.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  {loadError} Run <code className="text-signal">pnpm dev</code>{" "}
                  from the project root to start both the Fastify API and the
                  Next.js studio.
                </p>
                <button
                  type="button"
                  onClick={() => void loadStudioData()}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                  Retry API Load
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!project || scenarioPacks.length === 0) {
    return (
      <main className="min-h-screen bg-app">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <EmptyState
            title="No crash-lab data loaded"
            body="The API responded, but the expected projects or starter scenario packs were missing."
          />
        </div>
      </main>
    );
  }

  const activePack = selectedPack ?? scenarioPacks[0];

  if (!activePack) {
    return (
      <main className="min-h-screen bg-app">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <EmptyState
            title="No selected scenario"
            body="The API returned starter packs, but FailSafe could not select an active scenario."
          />
        </div>
      </main>
    );
  }

  const findingsPanel = (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase text-brand-700">
          Findings
        </p>
        <h2 className="text-lg font-semibold text-slate-950">
          Root-cause cards
        </h2>
      </div>
      {currentRun && currentRun.findings.length > 0 ? (
        currentRun.findings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            isSelected={selectedFinding?.id === finding.id}
            onSelect={(item) => {
              setSelectedFindingId(item.id);
              setShowCopilotPanel(false);
            }}
          />
        ))
      ) : (
        <EmptyState
          title="No findings yet"
          body={
            isRunInProgress(currentRun)
              ? "The local lifecycle is still running. Findings appear when the API completes the scenario."
              : "A clean run can still preserve typed evidence for future regression checks."
          }
        />
      )}
    </section>
  );

  const comparisonPanel =
    currentRun?.baselineRunId ||
    replayComparison ||
    isLoadingComparison ||
    comparisonError ? (
      <ReplayComparisonPanel
        comparison={replayComparison}
        error={comparisonError}
        isLoading={isLoadingComparison}
      />
    ) : null;

  return (
    <main className="min-h-screen bg-app">
      {header}
      <div className="mx-auto grid w-full max-w-[1680px] gap-5 px-5 py-5 md:px-8 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="space-y-5">
          {modeSwitcher}
          <ScenarioLibrary
            packs={scenarioPacks}
            selectedPackId={activePack.id}
            onSelect={(packId) => {
              setSelectedPackId(packId);
              setShowCopilotPanel(false);
            }}
          />
        </aside>
        <div className="space-y-5">
          {actionError ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm leading-6 text-slate-800">
              {actionError}
            </div>
          ) : null}

          {activeView === "foundry" ? (
            <AgentOpsPanel
              agents={agents}
              evidenceCaptures={evidenceCaptures}
              readiness={foundryReadiness}
              selectedAgentId={selectedAgent?.id}
              selectedEvidenceId={selectedEvidence?.id}
              selectedPack={activePack}
              trustMap={trustMap}
              isImporting={isImportingAgent}
              isImportingEvidence={isImportingEvidence}
              isRunning={isRunningAgent}
              isRunningEvidence={isRunningEvidence}
              isFixtureReplaying={isRunningAgentFixture}
              error={agentError}
              onImportSample={() => void handleImportFoundrySample()}
              onImportEvidence={() => void handleImportSampleEvidence()}
              onSelectAgent={(id) => void handleSelectAgent(id)}
              onSelectEvidence={(id) => void handleSelectEvidence(id)}
              onRunCrashTest={() => void handleRunFoundryCrashTest()}
              onRunEvidenceCrashTest={() => void handleRunEvidenceCrashTest()}
              onRunFixtureReplay={() => void handleRunFoundryFixtureReplay()}
            />
          ) : null}

          {activeView === "crash" ? (
            <>
              <CrashTimeline
                run={currentRun}
                selectedEventId={selectedEventId}
                onSelectEvent={(event: TraceEvent) =>
                  setSelectedEventId(event.id)
                }
              />
              {currentRun ? (
                <SafetyScoreCard score={currentRun.score} />
              ) : (
                <EmptyState
                  title="No score loaded"
                  body="Run a Foundry manifest, recorded evidence, or Sample Lab crash test to load the scorecard from the API."
                />
              )}
              {findingsPanel}
              <FindingDetailPanel
                finding={selectedFinding}
                scenarioPack={activePack}
                trace={currentRun?.trace ?? []}
              />
            </>
          ) : null}

          {activeView === "patch" ? (
            <>
              {findingsPanel}
              <FindingDetailPanel
                finding={selectedFinding}
                scenarioPack={activePack}
                trace={currentRun?.trace ?? []}
              />
              <CopilotPromptPanel
                error={patchCoachError}
                finding={selectedFinding}
                isOpen={showCopilotPanel}
                isLoading={isLoadingPatchCoach}
                plan={patchCoachPlan}
                scenarioPack={activePack}
                trace={currentRun?.trace ?? []}
              />
              <RegressionPanel
                fixtureReplayingRegressionId={fixtureReplayingRegressionId}
                regressions={regressions}
                lastFixtureReplayedRegressionId={lastFixtureReplayedRegressionId}
                lastSavedRegressionId={lastSavedRegressionId}
                lastReplayedRegressionId={lastReplayedRegressionId}
                onFixtureReplay={(regression) =>
                  void handleFixtureReplayRegression(regression)
                }
                onReplayMock={(regression) =>
                  void handleReplayRegression(regression)
                }
                replayingRegressionId={replayingRegressionId}
              />
              {comparisonPanel}
            </>
          ) : null}

          {activeView === "safety" ? (
            <>
              <RunnerReadinessPanel />
              <ReportPanel
                currentRun={currentRun}
                error={reportError}
                fixtureReplayResult={fixtureReplayResult}
                isCreating={isCreatingReport}
                isResetting={isResettingDemoData}
                onCreateReport={() => void handleCreateSafetyReport()}
                onResetDemoData={() => void handleResetDemoData()}
                report={safetyReport}
                resetMessage={resetMessage}
              />
              <SandboxPlanPanel
                regressions={regressions}
                plan={sandboxPlan}
                error={sandboxPlanError}
                planningRegressionId={planningRegressionId}
                onCreatePlan={(regression) =>
                  void handleCreateSandboxPlan(regression)
                }
              />
              {comparisonPanel}
            </>
          ) : null}
        </div>
        <aside className="space-y-5">
          <RiskInspector
            project={project}
            selectedPack={activePack}
            run={currentRun}
          />
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Safety boundary
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The primary workflow uses reviewed manifests, recorded evidence,
              and app-owned fixtures. Live Foundry execution, MCP calls, shell
              commands, arbitrary files, email, databases, and external targets
              remain disabled.
            </p>
          </div>
          {activeView !== "safety" ? (
            <ReportPanel
              currentRun={currentRun}
              error={reportError}
              fixtureReplayResult={fixtureReplayResult}
              isCreating={isCreatingReport}
              isResetting={isResettingDemoData}
              onCreateReport={() => void handleCreateSafetyReport()}
              onResetDemoData={() => void handleResetDemoData()}
              report={safetyReport}
              resetMessage={resetMessage}
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}
