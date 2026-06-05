import type { FastifyInstance } from "fastify";
import { createMockRun, getRunById, listRuns } from "../services/run-service";

export async function registerRunRoutes(app: FastifyInstance) {
  app.get("/runs", async () => listRuns());

  app.get("/runs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = getRunById(id);

    if (!run) {
      return reply.code(404).send({ error: "run_not_found", id });
    }

    return run;
  });

  app.post("/runs/mock", async (_request, reply) =>
    reply.code(201).send(createMockRun())
  );
}
