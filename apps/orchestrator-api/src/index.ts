import cors from "@fastify/cors";
import Fastify from "fastify";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerDemoRoutes } from "./routes/demo";
import { registerFindingRoutes } from "./routes/findings";
import { registerHealthRoutes } from "./routes/health";
import { registerProjectRoutes } from "./routes/projects";
import { registerRegressionRoutes } from "./routes/regressions";
import { registerReportRoutes } from "./routes/reports";
import { registerRunnerRoutes } from "./routes/runner";
import { registerRunRoutes } from "./routes/runs";
import { registerScenarioRoutes } from "./routes/scenarios";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

  await app.register(cors, {
    origin: true
  });

  await registerHealthRoutes(app);
  await registerProjectRoutes(app);
  await registerScenarioRoutes(app);
  await registerRunRoutes(app);
  await registerRunnerRoutes(app);
  await registerFindingRoutes(app);
  await registerRegressionRoutes(app);
  await registerReportRoutes(app);
  await registerDemoRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    const errorRecord =
      typeof error === "object" && error !== null
        ? (error as { code?: string; message?: string; statusCode?: number })
        : {};
    const statusCode = errorRecord.statusCode ?? 500;
    const message = errorRecord.message ?? "Unknown request error.";

    app.log.error(error);
    reply.code(statusCode).send({
      error:
        statusCode >= 500 ? "internal_error" : (errorRecord.code ?? "request_error"),
      message:
        statusCode >= 500
          ? "FailSafe mock API hit an unexpected error."
          : message
    });
  });

  return app;
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const app = await buildServer();
  const port = Number(process.env.ORCHESTRATOR_API_PORT ?? 4000);

  await app.listen({ port, host: "0.0.0.0" });
}
