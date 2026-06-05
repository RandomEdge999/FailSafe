import type { FastifyInstance } from "fastify";
import { listRuns } from "../services/run-service";

function listFindings() {
  return listRuns().flatMap((run) => run.findings);
}

export async function registerFindingRoutes(app: FastifyInstance) {
  app.get("/findings", async () => listFindings());

  app.get("/findings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const finding = listFindings().find((item) => item.id === id);

    if (!finding) {
      return reply.code(404).send({ error: "finding_not_found", id });
    }

    return finding;
  });
}
