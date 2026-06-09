import type { FastifyInstance } from "fastify";
import { resetDemoData } from "../services/demo-service";

export async function registerDemoRoutes(app: FastifyInstance) {
  app.post("/demo/reset", async () => resetDemoData());
}
