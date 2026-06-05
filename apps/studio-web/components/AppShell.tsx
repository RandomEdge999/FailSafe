"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Finding,
  Project,
  RegressionArtifact,
  ScenarioPack,
  ScenarioRun,
  TraceEvent
} from "@failsafe/schemas";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { CopilotPromptPanel } from "./CopilotPromptPanel";
import { CrashTimeline } from "./CrashTimeline";
import { DashboardHeader } from "./DashboardHeader";
import { EmptyState } from "./EmptyState";
import { FindingCard } from "./FindingCard";
import { FindingDetailPanel } from "./FindingDetailPanel";
import { RegressionPanel } from "./RegressionPanel";
import { RiskInspector } from "./RiskInspector";
import { SafetyScoreCard } from "./SafetyScoreCard";
import { ScenarioLibrary } from "./ScenarioLibrary";
import {
  createMockRun,
  getHealth,
  getRun,
  listProjects,
  listRegressions,
  listRuns,
  listScenarios,
  replayMockRegression,
  saveRegression
} from "../lib/api-client";

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "FailSafe mock API hit an unexpected error.";
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
      : "FailSafe mock trace regression";
  }

  return `${selectedPack?.name ?? "Synthetic scenario"}: ${finding.category.replaceAll("_", " ")} guardrail`;
}

export function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);
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

  const project = projects[0] ?? null;
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

  const loadStudioData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setActionError(null);

    try {
      await getHealth();
      const [loadedProjects, loadedScenarios, loadedRuns, loadedRegressions] =
        await Promise.all([
          listProjects(),
          listScenarios(),
          listRuns(),
          listRegressions()
        ]);

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
    } catch (error) {
      setLoadError(formatError(error));
    } finally {
      setIsLoading(false);
    }
  }, [applyRun]);

  useEffect(() => {
    void loadStudioData();
  }, [loadStudioData]);

  async function handleRun() {
    if (!project || !selectedPack) {
      return;
    }

    setActionError(null);
    setShowCopilotPanel(false);
    setIsRunning(true);

    try {
      const createdRun = await createMockRun({
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

  function handleFixWithCopilot() {
    if (!selectedFinding) {
      return;
    }

    setShowCopilotPanel(true);
  }

  async function handleSaveRegression() {
    if (!currentRun || !terminalRunReady(currentRun)) {
      return;
    }

    setActionError(null);
    setIsSavingRegression(true);

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

  const header = (
    <DashboardHeader
      canFix={Boolean(selectedFinding)}
      canRun={Boolean(project && selectedPack)}
      canSave={terminalRunReady(currentRun)}
      isRunning={isRunning}
      isSavingRegression={isSavingRegression}
      onFixWithCopilot={handleFixWithCopilot}
      onRun={handleRun}
      onSaveRegression={handleSaveRegression}
      runStatus={currentRun?.status}
    />
  );

  if (isLoading) {
    return (
      <main className="min-h-screen">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <section className="rounded-lg border border-white/10 bg-panel p-8 shadow-lab">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-signal" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Loading FailSafe Studio
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Fetching projects, scenarios, runs, findings, and saved mock
                  regressions from the orchestrator API.
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
      <main className="min-h-screen">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <section className="rounded-lg border border-danger/30 bg-panel p-8 shadow-lab">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-danger" />
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase text-danger">
                  Mock API unavailable
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  The API-backed demo flow could not load.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  {loadError} Run <code className="text-signal">pnpm dev</code>{" "}
                  from the project root to start both the Fastify API and the
                  Next.js studio.
                </p>
                <button
                  type="button"
                  onClick={() => void loadStudioData()}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
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
      <main className="min-h-screen">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <EmptyState
            title="No mock studio data loaded"
            body="The API responded, but the expected demo project or starter scenario packs were missing."
          />
        </div>
      </main>
    );
  }

  const activePack = selectedPack ?? scenarioPacks[0];

  if (!activePack) {
    return (
      <main className="min-h-screen">
        {header}
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5 md:px-8">
          <EmptyState
            title="No selected scenario"
            body="The API returned starter packs, but FailSafe could not select an active mock scenario."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {header}
      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-5 py-5 md:px-8 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
        <ScenarioLibrary
          packs={scenarioPacks}
          selectedPackId={activePack.id}
          onSelect={(packId) => {
            setSelectedPackId(packId);
            setShowCopilotPanel(false);
          }}
        />
        <div className="space-y-5">
          {actionError ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm leading-6 text-slate-200">
              {actionError}
            </div>
          ) : null}
          <CrashTimeline
            run={currentRun}
            selectedEventId={selectedEventId}
            onSelectEvent={(event: TraceEvent) => setSelectedEventId(event.id)}
          />
          {currentRun ? (
            <SafetyScoreCard score={currentRun.score} />
          ) : (
            <EmptyState
              title="No score loaded"
              body="Run a starter pack to load the mock scorecard from the API."
            />
          )}
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-signal">
                Findings
              </p>
              <h2 className="text-lg font-semibold text-white">
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
                    ? "The mock lifecycle is still running. Findings appear when the API completes the synthetic scenario."
                    : "A clean run will still save trace evidence for future regression checks."
                }
              />
            )}
          </section>
          <FindingDetailPanel
            finding={selectedFinding}
            scenarioPack={activePack}
            trace={currentRun?.trace ?? []}
          />
          <CopilotPromptPanel
            finding={selectedFinding}
            isOpen={showCopilotPanel}
            scenarioPack={activePack}
            trace={currentRun?.trace ?? []}
          />
        </div>
        <div className="space-y-5">
          <RiskInspector
            project={project}
            selectedPack={activePack}
            run={currentRun}
          />
          <RegressionPanel
            regressions={regressions}
            lastSavedRegressionId={lastSavedRegressionId}
            lastReplayedRegressionId={lastReplayedRegressionId}
            onReplayMock={(regression) => void handleReplayRegression(regression)}
            replayingRegressionId={replayingRegressionId}
          />
        </div>
      </div>
    </main>
  );
}
