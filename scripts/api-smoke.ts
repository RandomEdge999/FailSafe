import { buildServer } from "../apps/orchestrator-api/src/index";
import { sampleAgentEvidence } from "../apps/orchestrator-api/src/data/sample-agent-evidence";
import {
  AgentEvidenceCaptureSchema,
  AgentTrustBoundaryMapSchema,
  EvidenceCrashTestResponseSchema,
  FixtureReplayResultSchema,
  FoundryAgentImportSchema,
  FoundryConnectedProbeSchema,
  FoundryConnectedRunSchema,
  FoundryConnectedValidationSchema,
  FoundryReadinessResultSchema,
  PatchCoachPlanSchema,
  ProjectSchema,
  RegressionArtifactSchema,
  ReplayComparisonSchema,
  RunnerDryRunResultSchema,
  SafetyReportSchema,
  SandboxReplayPlanSchema,
  ScenarioPackSchema,
  ScenarioRunSchema
} from "@failsafe/schemas";

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "fatal";
process.env.FAILSAFE_ENABLE_SAMPLE_DATA =
  process.env.FAILSAFE_ENABLE_SAMPLE_DATA ?? "1";
process.env.FAILSAFE_ENABLE_LIVE_FOUNDRY = "0";

type HttpMethod = "GET" | "POST";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let app: Awaited<ReturnType<typeof buildServer>>;

async function request(
  method: HttpMethod,
  path: string,
  payload?: unknown,
  expectedStatus = method === "POST" ? 201 : 200
) {
  const response = await app.inject({
    method,
    url: path,
    payload,
    headers: payload ? { "content-type": "application/json" } : undefined
  });

  if (response.statusCode !== expectedStatus) {
    throw new Error(
      `${method} ${path} expected HTTP ${expectedStatus}, got ${response.statusCode}: ${response.body}`
    );
  }

  return response.json() as unknown;
}

async function waitForRun(runId: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const run = ScenarioRunSchema.parse(await request("GET", `/runs/${runId}`));

    if (run.status !== "queued" && run.status !== "running") {
      return run;
    }

    await delay(300);
  }

  throw new Error(`Timed out waiting for run ${runId}.`);
}

async function main() {
  app = await buildServer();
  await app.ready();

  try {
  await request("POST", "/demo/reset", {}, 200);

  const health = (await request("GET", "/health")) as {
    ok?: boolean;
    mode?: string;
  };
  assert(health.ok === true, "Health endpoint did not return ok=true.");
  assert(
    health.mode === "local_evidence",
    "Health endpoint did not report local_evidence mode."
  );

  const readiness = FoundryReadinessResultSchema.parse(
    await request("GET", "/foundry/readiness")
  );
  assert(
    readiness.blockedOperations.includes("live_tool_execution"),
    "Foundry readiness did not block live tool execution."
  );

  const connected = FoundryConnectedValidationSchema.parse(
    await request("POST", "/foundry/connected/validate", {}, 200)
  );
  assert(
    connected.validationStatement.includes("No network call") ||
      connected.validationStatement.includes("did not call Foundry"),
    "Connected validation did not state that no live Foundry call occurred."
  );

  const connectedProbe = FoundryConnectedProbeSchema.parse(
    await request("GET", "/foundry/connected/probe")
  );
  assert(
    connectedProbe.attemptedLiveCall === false,
    "Connected Foundry probe attempted a live call."
  );

  const connectedRun = FoundryConnectedRunSchema.parse(
    await request("POST", "/foundry/connected/run", {}, 409)
  );
  assert(
    connectedRun.runCreated === false && connectedRun.attemptedLiveCall === false,
    "Connected Foundry run should be blocked without creating a live run."
  );

  const foundryAgent = FoundryAgentImportSchema.parse(
    await request("POST", "/foundry/manifest/import", { source: "sample" })
  );
  const agents = FoundryAgentImportSchema.array().parse(
    await request("GET", "/agents")
  );
  assert(agents.length >= 1, "No agents returned after manifest import.");

  const trustMap = AgentTrustBoundaryMapSchema.parse(
    await request("GET", `/agents/${foundryAgent.id}/trust-map`)
  );
  assert(
    trustMap.boundaries.length >= 5,
    "Trust map did not include enough boundaries."
  );

  const foundryRun = ScenarioRunSchema.parse(
    await request("POST", `/agents/${foundryAgent.id}/crash-test`, {
      scenarioPackId: "pack-tool-poisoning"
    })
  );
  assert(
    foundryRun.status === "needs_review",
    "Foundry manifest crash test did not produce needs_review."
  );

  const foundryFixtureRun = ScenarioRunSchema.parse(
    await request("POST", `/agents/${foundryAgent.id}/fixture-replay`, {
      scenarioPackId: "pack-tool-poisoning"
    })
  );
  assert(
    foundryFixtureRun.status === "passed",
    "Foundry fixture replay did not produce passed status."
  );

  const evidenceCapture = AgentEvidenceCaptureSchema.parse(
    await request("POST", "/foundry/evidence/import", sampleAgentEvidence)
  );
  const evidenceList = AgentEvidenceCaptureSchema.array().parse(
    await request("GET", "/foundry/evidence")
  );
  assert(
    evidenceList.some((capture) => capture.id === evidenceCapture.id),
    "Evidence list did not include imported capture."
  );

  const fetchedEvidence = AgentEvidenceCaptureSchema.parse(
    await request("GET", `/foundry/evidence/${evidenceCapture.id}`)
  );
  assert(
    fetchedEvidence.safetyStatement.includes("did not read files"),
    "Evidence safety statement did not describe file boundary."
  );

  const evidenceCrash = EvidenceCrashTestResponseSchema.parse(
    await request("POST", `/foundry/evidence/${evidenceCapture.id}/crash-test`, {
      scenarioPackId: "pack-tool-poisoning"
    })
  );
  assert(
    evidenceCrash.result.mode === "recorded_agent_evidence",
    "Evidence crash test did not report recorded_agent_evidence mode."
  );

  const projects = ProjectSchema.array().parse(await request("GET", "/projects"));
  assert(
    projects.some((project) => project.id === evidenceCapture.projectId),
    "Projects did not include evidence-backed project."
  );

  const scenarios = ScenarioPackSchema.array().parse(
    await request("GET", "/scenarios")
  );
  assert(scenarios.length === 5, "Expected five starter scenario packs.");

  const sampleRun = await waitForRun(
    ScenarioRunSchema.parse(
      await request("POST", "/runs/sample-lab", {
        projectId: "project-vulnerable-agent",
        scenarioPackId: "pack-tool-poisoning",
        agentTargetId: "agent-invoice-reviewer"
      })
    ).id
  );
  assert(
    sampleRun.status === "needs_review",
    "Sample Lab run did not finish in needs_review."
  );

  const patchCoach = PatchCoachPlanSchema.parse(
    await request("POST", `/runs/${sampleRun.id}/patch-coach`, {
      findingId: sampleRun.findings[0]?.id
    }, 200)
  );
  assert(
    patchCoach.liveCopilotInvocation === false,
    "Patch Coach marked a live Copilot invocation."
  );

  const regression = RegressionArtifactSchema.parse(
    await request("POST", "/regressions/sample-lab", {
      runId: sampleRun.id,
      findingIds: sampleRun.findings.map((finding) => finding.id),
      traceEventIds: sampleRun.trace.map((event) => event.id),
      name: "API smoke Sample Lab regression"
    })
  );
  assert(regression.mockReplayable, "Regression was not Sample Lab replayable.");

  const replayRun = await waitForRun(
    ScenarioRunSchema.parse(
      await request("POST", `/regressions/${regression.id}/replay-sample-lab`, {})
    ).id
  );
  const comparison = ReplayComparisonSchema.parse(
    await request("GET", `/runs/${replayRun.id}/comparison`)
  );
  assert(comparison.mockOnly, "Replay comparison did not remain mockOnly.");

  const sandboxPlan = SandboxReplayPlanSchema.parse(
    await request("POST", `/regressions/${regression.id}/sandbox-plan`, {}, 200)
  );
  assert(
    sandboxPlan.mode === "plan_only" && sandboxPlan.requiresHumanReview,
    "Sandbox plan did not stay plan_only with human review required."
  );

  const fixtureReplay = FixtureReplayResultSchema.parse(
    await request("POST", `/regressions/${regression.id}/fixture-replay`, {})
  );
  assert(
    fixtureReplay.replayRun.status === "passed",
    "Fixture replay did not create passed replay evidence."
  );

  const runnerPreview = RunnerDryRunResultSchema.parse(
    await request("POST", "/runner/dry-run", {
      projectId: "project-vulnerable-agent",
      scenarioPackId: "pack-tool-poisoning",
      actions: [
        {
          id: "api-smoke-read",
          kind: "file_read",
          label: "Read reviewed fixture",
          target: "synthetic:invoice-fixture",
          risk: "low",
          synthetic: true
        },
        {
          id: "api-smoke-shell",
          kind: "shell_command",
          label: "Run command",
          target: "shell:pnpm test",
          risk: "high"
        },
        {
          id: "api-smoke-email",
          kind: "email_send",
          label: "Send email",
          target: "mail:finance",
          risk: "high"
        }
      ]
    }, 200)
  );
  assert(
    runnerPreview.blockedActionCount >= 2 && runnerPreview.executed === false,
    "Runner dry-run did not block high-risk actions."
  );

  const report = SafetyReportSchema.parse(
    await request("POST", `/runs/${fixtureReplay.replayRun.id}/report`, {
      regressionId: regression.id
    })
  );
  assert(
    report.content.includes("Human Review") &&
      report.content.includes("Mode: Reviewed fixture replay") &&
      report.evidenceMode === "reviewed_fixture_replay",
    "Safety Card did not include human review and evidence mode."
  );

  const reports = SafetyReportSchema.array().parse(
    await request("GET", "/reports")
  );
  assert(reports.length >= 1, "Reports endpoint did not return exported card.");

  await request("POST", "/demo/reset", {}, 200);

  console.log(
    [
      "FailSafe API smoke passed:",
      `readiness=${readiness.mode}`,
      `agents=${agents.length}`,
      `trustBoundaries=${trustMap.boundaries.length}`,
      `evidence=${evidenceCapture.id}`,
      `evidenceRun=${evidenceCrash.run.id}`,
      `sampleRun=${sampleRun.id}`,
      `regression=${regression.id}`,
      `fixtureRun=${fixtureReplay.replayRun.id}`,
      `report=${report.id}`
    ].join(" ")
  );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
