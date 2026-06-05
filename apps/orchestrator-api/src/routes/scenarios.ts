import type { FastifyInstance } from "fastify";
import { getScenarioById, listScenarios } from "../services/scenario-service";

export async function registerScenarioRoutes(app: FastifyInstance) {
  app.get("/scenarios", async () => listScenarios());

  app.get("/scenarios/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const scenario = getScenarioById(id);

    if (!scenario) {
      return reply.code(404).send({ error: "scenario_not_found", id });
    }

    return scenario;
  });
}
