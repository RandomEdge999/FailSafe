import {
  FixtureReplayResultSchema,
  RegressionArtifactSchema,
  SafetyReportSchema,
  SandboxReplayPlanSchema,
  ScenarioRunSchema,
  type FixtureReplayResult,
  type RegressionArtifact,
  type SafetyReport,
  type SandboxReplayPlan,
  type ScenarioRun
} from "@failsafe/schemas";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const storeVersion = 1;
const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
const storeDir = resolve(repoRoot, ".failsafe-data");
const reportsDir = resolve(storeDir, "reports");
const storePath = resolve(storeDir, "store.json");

export type StoredRunRecord = {
  createdAtMs: number;
  lifecycle: "mock" | "fixture_replay";
  run: ScenarioRun;
  seed: string;
  scenarioVersion: string;
  replayedFromRegressionId?: string;
};

export type PersistedStore = {
  version: typeof storeVersion;
  runs: StoredRunRecord[];
  regressions: RegressionArtifact[];
  sandboxPlans: SandboxReplayPlan[];
  fixtureReplayResults: FixtureReplayResult[];
  reports: SafetyReport[];
};

export const failsafeStorePaths = {
  repoRoot,
  storeDir,
  reportsDir,
  storePath,
  displayStorePath: ".failsafe-data/store.json",
  displayReportsDir: ".failsafe-data/reports"
};

function emptyStore(): PersistedStore {
  return {
    version: storeVersion,
    runs: [],
    regressions: [],
    sandboxPlans: [],
    fixtureReplayResults: [],
    reports: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRunRecord(value: unknown): StoredRunRecord {
  if (!isRecord(value)) {
    throw new Error("Persisted run record was not an object.");
  }

  const lifecycle = value.lifecycle;

  if (lifecycle !== "mock" && lifecycle !== "fixture_replay") {
    throw new Error(`Unsupported persisted run lifecycle: ${String(lifecycle)}.`);
  }

  if (typeof value.createdAtMs !== "number") {
    throw new Error("Persisted run record is missing createdAtMs.");
  }

  if (typeof value.seed !== "string" || value.seed.length === 0) {
    throw new Error("Persisted run record is missing seed.");
  }

  if (
    typeof value.scenarioVersion !== "string" ||
    value.scenarioVersion.length === 0
  ) {
    throw new Error("Persisted run record is missing scenarioVersion.");
  }

  return {
    createdAtMs: value.createdAtMs,
    lifecycle,
    run: ScenarioRunSchema.parse(value.run),
    seed: value.seed,
    scenarioVersion: value.scenarioVersion,
    replayedFromRegressionId:
      typeof value.replayedFromRegressionId === "string"
        ? value.replayedFromRegressionId
        : undefined
  };
}

function parseStore(value: unknown): PersistedStore {
  if (!isRecord(value)) {
    throw new Error("FailSafe store was not a JSON object.");
  }

  return {
    version: storeVersion,
    runs: Array.isArray(value.runs) ? value.runs.map(parseRunRecord) : [],
    regressions: Array.isArray(value.regressions)
      ? RegressionArtifactSchema.array().parse(value.regressions)
      : [],
    sandboxPlans: Array.isArray(value.sandboxPlans)
      ? SandboxReplayPlanSchema.array().parse(value.sandboxPlans)
      : [],
    fixtureReplayResults: Array.isArray(value.fixtureReplayResults)
      ? FixtureReplayResultSchema.array().parse(value.fixtureReplayResults)
      : [],
    reports: Array.isArray(value.reports)
      ? SafetyReportSchema.array().parse(value.reports)
      : []
  };
}

function ensureStoreDir() {
  mkdirSync(storeDir, { recursive: true });
  mkdirSync(reportsDir, { recursive: true });
}

export function loadPersistedStore(): PersistedStore {
  if (!existsSync(storePath)) {
    return emptyStore();
  }

  const raw = readFileSync(storePath, "utf8");

  return parseStore(JSON.parse(raw) as unknown);
}

export function savePersistedStore(store: PersistedStore) {
  ensureStoreDir();

  const nextStore = parseStore({ ...store, version: storeVersion });
  const temporaryPath = `${storePath}.tmp`;

  writeFileSync(temporaryPath, `${JSON.stringify(nextStore, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, storePath);
}

export function updatePersistedStore(
  update: (store: PersistedStore) => PersistedStore
) {
  const current = loadPersistedStore();
  const next = update(current);

  savePersistedStore(next);
  return next;
}

export function persistRunRecords(records: StoredRunRecord[]) {
  updatePersistedStore((store) => ({ ...store, runs: records }));
}

export function persistRegressionArtifacts(regressions: RegressionArtifact[]) {
  updatePersistedStore((store) => ({ ...store, regressions }));
}

export function persistSandboxPlans(plans: SandboxReplayPlan[]) {
  updatePersistedStore((store) => ({ ...store, sandboxPlans: plans }));
}

export function persistFixtureReplayResults(results: FixtureReplayResult[]) {
  updatePersistedStore((store) => ({ ...store, fixtureReplayResults: results }));
}

export function persistReports(reports: SafetyReport[]) {
  updatePersistedStore((store) => ({ ...store, reports }));
}

export function resetPersistedStore() {
  savePersistedStore(emptyStore());
}
