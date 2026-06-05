import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "failsafe-orchestrator-api",
    mode: "mock",
    timestamp: new Date().toISOString()
  }));
}
