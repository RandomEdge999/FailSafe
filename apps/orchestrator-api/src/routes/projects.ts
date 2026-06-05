import type { FastifyInstance } from "fastify";
import { getProjectById, listProjects } from "../services/project-service";

export async function registerProjectRoutes(app: FastifyInstance) {
  app.get("/projects", async () => listProjects());

  app.get("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = getProjectById(id);

    if (!project) {
      return reply.code(404).send({ error: "project_not_found", id });
    }

    return project;
  });
}
