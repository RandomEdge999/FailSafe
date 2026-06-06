import type { FastifyInstance } from "fastify";
import { RunnerDryRunInputSchema } from "@failsafe/schemas";
import { createRunnerDryRunPreview } from "../services/runner-service";

export async function registerRunnerRoutes(app: FastifyInstance) {
  app.post("/runner/dry-run", async (request, reply) => {
    const parsed = RunnerDryRunInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_runner_dry_run_input",
        issues: parsed.error.issues
      });
    }

    return createRunnerDryRunPreview(parsed.data);
  });
}
