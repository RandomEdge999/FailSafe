import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "failsafe-orchestrator-api",
    mode: "local_evidence",
    timestamp: new Date().toISOString()
  }));
}
