"use client";

import { useMemo, useState } from "react";
import { CrashTimeline } from "./CrashTimeline";
import { DashboardHeader } from "./DashboardHeader";
import { EmptyState } from "./EmptyState";
import { FindingCard } from "./FindingCard";
import { RiskInspector } from "./RiskInspector";
import { SafetyScoreCard } from "./SafetyScoreCard";
import { ScenarioLibrary } from "./ScenarioLibrary";
import {
  buildMockRun,
  defaultScenarioPack,
  demoProject,
  runMockCrashTest,
  scenarioPacks
} from "../lib/mock-api";

export function AppShell() {
  const [selectedPackId, setSelectedPackId] = useState(defaultScenarioPack.id);
  const [currentRun, setCurrentRun] = useState(() => buildMockRun());
  const [isRunning, setIsRunning] = useState(false);

  const selectedPack = useMemo(
    () =>
      scenarioPacks.find((pack) => pack.id === selectedPackId) ??
      defaultScenarioPack,
    [selectedPackId]
  );

  async function handleRun() {
    setIsRunning(true);
    const run = await runMockCrashTest(selectedPackId);
    setCurrentRun(run);
    setIsRunning(false);
  }

  return (
    <main className="min-h-screen">
      <DashboardHeader isRunning={isRunning} onRun={handleRun} />
      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-5 py-5 md:px-8 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
        <ScenarioLibrary
          packs={scenarioPacks}
          selectedPackId={selectedPackId}
          onSelect={setSelectedPackId}
        />
        <div className="space-y-5">
          <CrashTimeline run={currentRun} />
          <SafetyScoreCard score={currentRun.score} />
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-signal">
                Findings
              </p>
              <h2 className="text-lg font-semibold text-white">
                Root-cause cards
              </h2>
            </div>
            {currentRun.findings.length > 0 ? (
              currentRun.findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))
            ) : (
              <EmptyState
                title="No findings yet"
                body="A clean run will still save trace evidence for future regression checks."
              />
            )}
          </section>
        </div>
        <RiskInspector
          project={demoProject}
          selectedPack={selectedPack}
          run={currentRun}
        />
      </div>
    </main>
  );
}
