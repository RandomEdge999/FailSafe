import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CreateMockRunInputSchema } from "@failsafe/schemas";
import {
  createMockRun,
  getRunById,
  getRunComparison,
  listRuns
} from "../services/run-service";
import { createPatchCoachForRun } from "../services/patch-coach-service";
import { createSafetyReportForRun } from "../services/report-service";

function optionalStringFromBody(body: unknown, key: string) {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

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

  app.get("/runs/:id/comparison", async (request) => {
    const { id } = request.params as { id: string };

    return getRunComparison(id);
  });

  app.post("/runs/:id/patch-coach", async (request) => {
    const { id } = request.params as { id: string };
    const findingId = optionalStringFromBody(request.body, "findingId");

    return createPatchCoachForRun(id, findingId);
  });

  app.post("/runs/:id/report", async (request, reply) => {
    const { id } = request.params as { id: string };
    const regressionId = optionalStringFromBody(request.body, "regressionId");

    return reply.code(201).send(createSafetyReportForRun(id, regressionId));
  });

  async function handleSampleLabRun(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const parsed = CreateMockRunInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_sample_lab_run_input",
        issues: parsed.error.issues
      });
    }

    return reply.code(201).send(createMockRun(parsed.data));
  }

  app.post("/runs/sample-lab", handleSampleLabRun);
  app.post("/runs/mock", handleSampleLabRun);
}
