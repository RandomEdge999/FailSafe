import type { FastifyInstance } from "fastify";
import {
  CreateAgentCrashTestInputSchema,
  EvidenceCrashTestResponseSchema,
  FoundryAgentManifestSchema,
  FoundryAgentImportInputSchema,
  ImportAgentEvidenceInputSchema
} from "@failsafe/schemas";
import {
  createEvidenceCrashTest,
  getEvidenceCapture,
  importAgentEvidence,
  listEvidenceCaptures
} from "../services/evidence-service";
import {
  createFoundryCrashTest,
  createFoundryFixtureReplay,
  getAgentTrustBoundaryMap,
  getFoundryReadiness,
  importFoundryManifest,
  listFoundryAgents,
  probeConnectedFoundry,
  runConnectedFoundry,
  validateConnectedFoundry
} from "../services/foundry-service";

export async function registerFoundryRoutes(app: FastifyInstance) {
  app.get("/foundry/readiness", async () => getFoundryReadiness());

  app.post("/foundry/connected/validate", async () =>
    validateConnectedFoundry()
  );

  app.get("/foundry/connected/probe", async () => probeConnectedFoundry());

  app.post("/foundry/connected/run", async (_request, reply) => {
    const result = runConnectedFoundry();

    return reply
      .code(result.status === "manual_only" ? 200 : 409)
      .send(result);
  });

  app.post("/foundry/manifest/import", async (request, reply) => {
    const parsed =
      FoundryAgentImportInputSchema.safeParse(request.body).success
        ? FoundryAgentImportInputSchema.safeParse(request.body)
        : FoundryAgentImportInputSchema.safeParse({
            manifest: FoundryAgentManifestSchema.safeParse(request.body).success
              ? request.body
              : undefined
          });

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_foundry_manifest_input",
        issues: parsed.error.issues
      });
    }

    return reply.code(201).send(importFoundryManifest(parsed.data));
  });

  app.post("/foundry/evidence/import", async (request, reply) => {
    const parsed = ImportAgentEvidenceInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_agent_evidence_input",
        issues: parsed.error.issues
      });
    }

    return reply.code(201).send(importAgentEvidence(parsed.data));
  });

  app.get("/foundry/evidence", async () => listEvidenceCaptures());

  app.get("/foundry/evidence/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const capture = getEvidenceCapture(id);

    if (!capture) {
      return reply.code(404).send({ error: "evidence_not_found", id });
    }

    return capture;
  });

  app.post("/foundry/evidence/:id/crash-test", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = CreateAgentCrashTestInputSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_evidence_crash_test_input",
        issues: parsed.error.issues
      });
    }

    return reply.code(201).send(
      EvidenceCrashTestResponseSchema.parse(
        createEvidenceCrashTest(id, parsed.data.scenarioPackId)
      )
    );
  });

  app.get("/agents", async () => listFoundryAgents());

  app.get("/agents/:id/trust-map", async (request) => {
    const { id } = request.params as { id: string };

    return getAgentTrustBoundaryMap(id);
  });

  app.post("/agents/:id/crash-test", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = CreateAgentCrashTestInputSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_agent_crash_test_input",
        issues: parsed.error.issues
      });
    }

    return reply
      .code(201)
      .send(createFoundryCrashTest(id, parsed.data.scenarioPackId));
  });

  app.post("/agents/:id/fixture-replay", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = CreateAgentCrashTestInputSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_agent_fixture_replay_input",
        issues: parsed.error.issues
      });
    }

    return reply
      .code(201)
      .send(createFoundryFixtureReplay(id, parsed.data.scenarioPackId));
  });
}
