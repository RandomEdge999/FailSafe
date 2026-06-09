import { mockProjects } from "../data/mock-projects";
import {
  getEvidenceProject,
  listEvidenceCaptures,
  projectFromEvidenceCapture
} from "./evidence-service";
import {
  getFoundryAgentProject,
  listFoundryAgents
} from "./foundry-service";

export function listProjects() {
  return [
    ...listFoundryAgents().map((agent) => getFoundryAgentProject(agent.id)),
    ...listEvidenceCaptures().map(projectFromEvidenceCapture),
    ...mockProjects
  ].filter((project) => project !== undefined);
}

export function getProjectById(id: string) {
  return (
    listFoundryAgents()
      .map((agent) => getFoundryAgentProject(agent.id))
      .find((project) => project?.id === id) ??
    getEvidenceProject(id) ??
    mockProjects.find((project) => project.id === id)
  );
}
