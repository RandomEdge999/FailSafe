import { mockProjects } from "../data/mock-projects";

export function listProjects() {
  return mockProjects;
}

export function getProjectById(id: string) {
  return mockProjects.find((project) => project.id === id);
}
