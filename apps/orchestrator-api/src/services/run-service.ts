import { mockRuns } from "../data/mock-runs";

export function listRuns() {
  return mockRuns;
}

export function getRunById(id: string) {
  return mockRuns.find((run) => run.id === id);
}

export function createMockRun() {
  const [mockRun] = mockRuns;

  return {
    ...mockRun,
    id: `run-demo-${Date.now()}`,
    startedAt: new Date().toISOString(),
    completedAt: new Date(Date.now() + 18_000).toISOString()
  };
}
