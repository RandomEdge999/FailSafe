import {
  CreateMockRegressionInputSchema,
  CreateMockRunInputSchema,
  FindingSchema,
  FoundryAgentImportInputSchema,
  FoundryAgentImportSchema,
  FoundryReadinessResultSchema,
  AgentTrustBoundaryMapSchema,
  FixtureReplayResultSchema,
  PatchCoachPlanSchema,
  ProjectSchema,
  RegressionArtifactSchema,
  ReplayComparisonSchema,
  SafetyReportSchema,
  SandboxReplayPlanSchema,
  ScenarioPackSchema,
  ScenarioRunSchema,
  type CreateMockRegressionInput,
  type CreateMockRunInput,
  type Finding,
  type FoundryAgentImport,
  type FoundryAgentImportInput,
  type FoundryReadinessResult,
  type AgentTrustBoundaryMap,
  type FixtureReplayResult,
  type PatchCoachPlan,
  type Project,
  type RegressionArtifact,
  type ReplayComparison,
  type SafetyReport,
  type SandboxReplayPlan,
  type ScenarioPack,
  type ScenarioRun
} from "@failsafe/schemas";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export type ApiHealth = {
  ok: boolean;
  service: string;
  mode: "mock" | "local";
  timestamp: string;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

async function requestJson<T>(
  path: string,
  parse: (value: unknown) => T,
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers
      }
    });
  } catch (error) {
    throw new ApiClientError(
      "FailSafe local API is unavailable. Start both services with pnpm dev.",
      0,
      error
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : `Local API request failed with HTTP ${response.status}.`;

    throw new ApiClientError(message, response.status, payload);
  }

  return parse(payload);
}

function parseHealth(value: unknown): ApiHealth {
  if (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    "service" in value &&
    "mode" in value &&
    "timestamp" in value
  ) {
    return value as ApiHealth;
  }

  throw new ApiClientError("Local API health response was not valid.", 200, value);
}

export function getHealth() {
  return requestJson("/health", parseHealth);
}

export function listProjects(): Promise<Project[]> {
  return requestJson("/projects", (value) => ProjectSchema.array().parse(value));
}

export function getFoundryReadiness(): Promise<FoundryReadinessResult> {
  return requestJson("/foundry/readiness", (value) =>
    FoundryReadinessResultSchema.parse(value)
  );
}

export function importFoundryManifest(
  input: FoundryAgentImportInput
): Promise<FoundryAgentImport> {
  const body = FoundryAgentImportInputSchema.parse(input);

  return requestJson(
    "/foundry/manifest/import",
    (value) => FoundryAgentImportSchema.parse(value),
    {
      body: JSON.stringify(body),
      method: "POST"
    }
  );
}

export function listAgents(): Promise<FoundryAgentImport[]> {
  return requestJson("/agents", (value) =>
    FoundryAgentImportSchema.array().parse(value)
  );
}

export function getAgentTrustMap(
  id: string
): Promise<AgentTrustBoundaryMap> {
  return requestJson(`/agents/${id}/trust-map`, (value) =>
    AgentTrustBoundaryMapSchema.parse(value)
  );
}

export function runAgentCrashTest(
  id: string,
  scenarioPackId?: string
): Promise<ScenarioRun> {
  return requestJson(
    `/agents/${id}/crash-test`,
    (value) => ScenarioRunSchema.parse(value),
    {
      body: JSON.stringify({ scenarioPackId }),
      method: "POST"
    }
  );
}

export function runAgentFixtureReplay(
  id: string,
  scenarioPackId?: string
): Promise<ScenarioRun> {
  return requestJson(
    `/agents/${id}/fixture-replay`,
    (value) => ScenarioRunSchema.parse(value),
    {
      body: JSON.stringify({ scenarioPackId }),
      method: "POST"
    }
  );
}

export function getProject(id: string): Promise<Project> {
  return requestJson(`/projects/${id}`, (value) => ProjectSchema.parse(value));
}

export function listScenarios(): Promise<ScenarioPack[]> {
  return requestJson("/scenarios", (value) =>
    ScenarioPackSchema.array().parse(value)
  );
}

export function getScenario(id: string): Promise<ScenarioPack> {
  return requestJson(`/scenarios/${id}`, (value) =>
    ScenarioPackSchema.parse(value)
  );
}

export function listRuns(): Promise<ScenarioRun[]> {
  return requestJson("/runs", (value) => ScenarioRunSchema.array().parse(value));
}

export function getRun(id: string): Promise<ScenarioRun> {
  return requestJson(`/runs/${id}`, (value) => ScenarioRunSchema.parse(value));
}

export function getRunComparison(id: string): Promise<ReplayComparison> {
  return requestJson(`/runs/${id}/comparison`, (value) =>
    ReplayComparisonSchema.parse(value)
  );
}

export function createMockRun(input: CreateMockRunInput): Promise<ScenarioRun> {
  const body = CreateMockRunInputSchema.parse(input);

  return requestJson(
    "/runs/mock",
    (value) => ScenarioRunSchema.parse(value),
    {
      body: JSON.stringify(body),
      method: "POST"
    }
  );
}

export function listFindings(): Promise<Finding[]> {
  return requestJson("/findings", (value) => FindingSchema.array().parse(value));
}

export function getFinding(id: string): Promise<Finding> {
  return requestJson(`/findings/${id}`, (value) => FindingSchema.parse(value));
}

export function listRegressions(): Promise<RegressionArtifact[]> {
  return requestJson("/regressions", (value) =>
    RegressionArtifactSchema.array().parse(value)
  );
}

export function getRegression(id: string): Promise<RegressionArtifact> {
  return requestJson(`/regressions/${id}`, (value) =>
    RegressionArtifactSchema.parse(value)
  );
}

export function saveRegression(
  input: CreateMockRegressionInput
): Promise<RegressionArtifact> {
  const body = CreateMockRegressionInputSchema.parse(input);

  return requestJson(
    "/regressions/mock",
    (value) => RegressionArtifactSchema.parse(value),
    {
      body: JSON.stringify(body),
      method: "POST"
    }
  );
}

export function replayMockRegression(id: string): Promise<ScenarioRun> {
  return requestJson(
    `/regressions/${id}/replay-mock`,
    (value) => ScenarioRunSchema.parse(value),
    {
      body: "{}",
      method: "POST"
    }
  );
}

export function replayFixtureRegression(
  id: string
): Promise<FixtureReplayResult> {
  return requestJson(
    `/regressions/${id}/fixture-replay`,
    (value) => FixtureReplayResultSchema.parse(value),
    {
      body: "{}",
      method: "POST"
    }
  );
}

export function createSandboxPlan(id: string): Promise<SandboxReplayPlan> {
  return requestJson(
    `/regressions/${id}/sandbox-plan`,
    (value) => SandboxReplayPlanSchema.parse(value),
    {
      body: "{}",
      method: "POST"
    }
  );
}

export function createPatchCoachPlan(
  runId: string,
  findingId?: string
): Promise<PatchCoachPlan> {
  return requestJson(
    `/runs/${runId}/patch-coach`,
    (value) => PatchCoachPlanSchema.parse(value),
    {
      body: JSON.stringify({ findingId }),
      method: "POST"
    }
  );
}

export function createSafetyReport(
  runId: string,
  regressionId?: string
): Promise<SafetyReport> {
  return requestJson(
    `/runs/${runId}/report`,
    (value) => SafetyReportSchema.parse(value),
    {
      body: JSON.stringify({ regressionId }),
      method: "POST"
    }
  );
}

export function listReports(): Promise<SafetyReport[]> {
  return requestJson("/reports", (value) =>
    SafetyReportSchema.array().parse(value)
  );
}

export function resetDemoData(): Promise<{
  ok: boolean;
  mode: string;
  reset: string[];
  preserved: string[];
  safety: string;
}> {
  return requestJson("/demo/reset", (value) => {
    if (
      typeof value === "object" &&
      value !== null &&
      "ok" in value &&
      "mode" in value
    ) {
      return value as {
        ok: boolean;
        mode: string;
        reset: string[];
        preserved: string[];
        safety: string;
      };
    }

    throw new ApiClientError("Demo reset response was not valid.", 200, value);
  }, {
    body: "{}",
    method: "POST"
  });
}
