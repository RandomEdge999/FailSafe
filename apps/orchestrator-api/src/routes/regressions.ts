import type { FastifyInstance } from "fastify";
import { CreateMockRegressionInputSchema } from "@failsafe/schemas";
import {
  createMockRegression,
  getRegressionById,
  listRegressions
} from "../services/regression-service";

export async function registerRegressionRoutes(app: FastifyInstance) {
  app.get("/regressions", async () => listRegressions());

  app.get("/regressions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const regression = getRegressionById(id);

    if (!regression) {
      return reply.code(404).send({ error: "regression_not_found", id });
    }

    return regression;
  });

  app.post("/regressions/mock", async (request, reply) => {
    const parsed = CreateMockRegressionInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_mock_regression_input",
        issues: parsed.error.issues
      });
    }

    return reply.code(201).send(createMockRegression(parsed.data));
  });
}
