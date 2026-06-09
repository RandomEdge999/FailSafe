import type { FastifyInstance } from "fastify";
import { getReportById, listReports } from "../services/report-service";

export async function registerReportRoutes(app: FastifyInstance) {
  app.get("/reports", async () => listReports());

  app.get("/reports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = getReportById(id);

    if (!report) {
      return reply.code(404).send({ error: "report_not_found", id });
    }

    return report;
  });
}
