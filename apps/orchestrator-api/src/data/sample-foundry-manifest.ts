import {
  FoundryAgentManifestSchema,
  type FoundryAgentManifest
} from "@failsafe/schemas";

export const sampleFoundryManifest: FoundryAgentManifest =
  FoundryAgentManifestSchema.parse({
    id: "foundry-agent-invoice-reviewer",
    name: "Foundry Invoice Review Agent",
    description:
      "Reviewed Microsoft Foundry-style agent manifest for invoice review, tool approval, and defensive crash-test mapping.",
    provider: "microsoft_foundry",
    projectEndpoint: "env:AZURE_FOUNDRY_PROJECT_ENDPOINT",
    agentId: "env:AZURE_FOUNDRY_AGENT_ID",
    model: {
      deploymentName: "env:AZURE_FOUNDRY_MODEL_DEPLOYMENT",
      family: "gpt-4.1",
      version: "reviewed-manifest"
    },
    instructions: {
      summary:
        "Review invoices, preserve instruction/data separation, and require approval before risky tool use.",
      source: "reviewed-foundry-manifest",
      reviewed: true
    },
    tools: [
      {
        id: "foundry-tool-invoice-search",
        name: "Invoice Search",
        kind: "azure_ai_search",
        description:
          "Retrieves reviewed invoice facts from an allowlisted search index fixture.",
        riskLevel: "medium",
        requiresApproval: false,
        reviewed: true,
        scopes: ["invoice.read", "search.query"],
        blockedCapabilities: ["external_network_targets", "secret_lookup"]
      },
      {
        id: "foundry-tool-vendor-risk",
        name: "Vendor Risk Lookup",
        kind: "function",
        description:
          "Scores vendor risk from app-owned fixture metadata before payment review.",
        riskLevel: "high",
        requiresApproval: true,
        reviewed: true,
        scopes: ["vendor.read", "risk.review"],
        blockedCapabilities: ["payment_write", "email_send", "database_write"]
      },
      {
        id: "foundry-tool-mcp-invoice",
        name: "Invoice MCP Adapter",
        kind: "mcp",
        description:
          "Reviewed MCP adapter metadata used for trust-boundary mapping only.",
        riskLevel: "high",
        requiresApproval: true,
        reviewed: true,
        scopes: ["mcp.metadata.read"],
        blockedCapabilities: ["mcp_tool_execution", "unreviewed_server_connect"]
      }
    ],
    identity: {
      authMode: "environment",
      rbacRequired: ["Azure AI User", "Reader"],
      storesCredentials: false
    },
    observability: {
      tracing: true,
      evaluationHooks: ["trace.timeline", "safety.finding", "regression.case"],
      logRetention: "local-app-owned-store-only"
    },
    runtime: {
      mode: "manifest_only",
      networkAccess: false,
      toolExecution: false,
      mcpExecution: false,
      codeInterpreter: false,
      fileAccess: false
    },
    reviewed: {
      status: "reviewed",
      reviewedBy: "FailSafe local reviewer",
      reviewedAt: "2026-06-09T00:00:00.000Z",
      notes: [
        "Manifest is app-owned and contains no credentials.",
        "Tools are modeled for safety analysis; they are not executed.",
        "Connected Foundry validation requires explicit environment configuration."
      ]
    }
  });
