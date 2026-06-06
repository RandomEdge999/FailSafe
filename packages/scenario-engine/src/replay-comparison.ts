import {
  ReplayComparisonSchema,
  ScenarioRunSchema,
  type FindingCategory,
  type ReplayComparison,
  type ScenarioRun,
  type TraceEventType
} from "@failsafe/schemas";

export type MockReplayComparisonInput = {
  baselineRun: ScenarioRun;
  replayRun: ScenarioRun;
  expectedFindingCategories?: FindingCategory[];
  expectedTraceEventTypes?: TraceEventType[];
};

function uniqueInOrder<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function compareMockReplayRuns(
  input: MockReplayComparisonInput
): ReplayComparison {
  const baselineRun = ScenarioRunSchema.parse(input.baselineRun);
  const replayRun = ScenarioRunSchema.parse(input.replayRun);
  const baselineTraceEventTypes = uniqueInOrder(
    baselineRun.trace.map((event) => event.type)
  );
  const replayTraceEventTypes = uniqueInOrder(
    replayRun.trace.map((event) => event.type)
  );
  const expectedTraceEventTypes = uniqueInOrder(
    input.expectedTraceEventTypes ?? baselineTraceEventTypes
  );
  const expectedFindingCategories = uniqueInOrder(
    input.expectedFindingCategories ??
      baselineRun.findings.map((finding) => finding.category)
  );
  const replayFindingCategories = new Set(
    replayRun.findings.map((finding) => finding.category)
  );
  const replayTraceEventTypeSet = new Set(replayTraceEventTypes);
  const baselineTraceEventTypeSet = new Set(baselineTraceEventTypes);

  return ReplayComparisonSchema.parse({
    baselineRunId: baselineRun.id,
    replayRunId: replayRun.id,
    scenarioPackId: replayRun.scenarioPackId,
    sameScenarioPack: baselineRun.scenarioPackId === replayRun.scenarioPackId,
    baselineStatus: baselineRun.status,
    replayStatus: replayRun.status,
    baselineScore: baselineRun.score.overall,
    replayScore: replayRun.score.overall,
    scoreDelta: replayRun.score.overall - baselineRun.score.overall,
    baselineFindingCount: baselineRun.findings.length,
    replayFindingCount: replayRun.findings.length,
    findingCountDelta: replayRun.findings.length - baselineRun.findings.length,
    baselineTraceEventCount: baselineRun.trace.length,
    replayTraceEventCount: replayRun.trace.length,
    traceEventCountDelta: replayRun.trace.length - baselineRun.trace.length,
    matchingTraceEventTypes: expectedTraceEventTypes.filter((type) =>
      replayTraceEventTypeSet.has(type)
    ),
    missingExpectedTraceEventTypes: expectedTraceEventTypes.filter(
      (type) => !replayTraceEventTypeSet.has(type)
    ),
    newTraceEventTypes: replayTraceEventTypes.filter(
      (type) => !baselineTraceEventTypeSet.has(type)
    ),
    expectedFindingCategories,
    expectedFindingCategoriesPreserved: expectedFindingCategories.every(
      (category) => replayFindingCategories.has(category)
    ),
    mockOnly: true
  });
}
