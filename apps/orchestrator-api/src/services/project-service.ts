import { mockProjects } from "../data/mock-projects";
import {
  getFoundryAgentProject,
  listFoundryAgents
} from "./foundry-service";

export function listProjects() {
  return [
    ...listFoundryAgents().map((agent) => getFoundryAgentProject(agent.id)),
    ...mockProjects
  ].filter((project) => project !== undefined);
}

export function getProjectById(id: string) {
  return (
    listFoundryAgents()
      .map((agent) => getFoundryAgentProject(agent.id))
      .find((project) => project?.id === id) ??
    mockProjects.find((project) => project.id === id)
  );
}
