import { mockScenarios } from "../data/mock-scenarios";

export function listScenarios() {
  return mockScenarios;
}

export function getScenarioById(id: string) {
  return mockScenarios.find((scenario) => scenario.id === id);
}
