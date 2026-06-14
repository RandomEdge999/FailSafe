import { ProjectSchema, type Project } from "@failsafe/schemas";

export const mockProjects: Project[] = ProjectSchema.array().parse([
  {
    id: "project-vulnerable-agent",
    name: "Vulnerable Invoice Agent",
    description:
      "Sample Lab local fixture that reviews invoices, summarizes vendor notes, and can request high-risk file tools.",
    repoPath: "examples/vulnerable-agent",
    createdAt: "2026-06-05T06:00:00.000Z",
    updatedAt: "2026-06-05T06:00:00.000Z",
    riskProfile: {
      summary:
        "High-risk demo surface: one unreviewed MCP server, one risky file-read tool, and partial approval coverage.",
      highestToolRisk: "high",
      trustBoundaryCount: 5,
      approvalCoverage: 0.55
    },
    agentTargets: [
      {
        id: "agent-invoice-reviewer",
        projectId: "project-vulnerable-agent",
        name: "Invoice Reviewer Sample Agent",
        type: "mock-agent",
        entrypoint: "examples/vulnerable-agent/agent-config.json",
        instructionFiles: ["README.md", "agent-config.json"],
        environmentMode: "demo",
        approvalMode: "manual-required"
      }
    ],
    mcpServers: [
      {
        id: "mcp-invoice-tools",
        name: "Invoice Tools MCP",
        transport: "mock",
        trustBoundary: "mcp_metadata",
        reviewed: false
      }
    ],
    tools: [
      {
        id: "tool-summarize-invoice",
        name: "summarize_invoice",
        description:
          "Summarizes synthetic invoice text. The demo metadata intentionally contains suspicious instruction-like language.",
        source: "mcp-server",
        riskLevel: "medium",
        requiresApproval: false,
        scopes: ["invoice:read"],
        inputSchema: {
          type: "object",
          properties: {
            invoiceText: { type: "string" }
          }
        },
        outputSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            suspiciousContentFound: { type: "boolean" }
          }
        }
      },
      {
        id: "tool-read-private-notes",
        name: "read_private_notes",
        description:
          "Synthetic high-risk file-reading capability used only to demonstrate approval and scope boundaries.",
        source: "mock",
        riskLevel: "high",
        requiresApproval: true,
        scopes: ["filesystem:read:restricted"],
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" }
          }
        },
        outputSchema: {
          type: "object",
          properties: {
            denied: { type: "boolean" },
            reason: { type: "string" }
          }
        }
      }
    ]
  }
]);
