# FailSafe Azure Deployment Plan

Status: Ready for Validation

## Goal
Prepare FailSafe for Azure Developer CLI deployment as a two-service Azure Container Apps application while preserving the local safety boundary.

## Architecture
- `web`: Next.js Studio Web container exposed publicly.
- `api`: Fastify Orchestrator API container exposed publicly for browser/API smoke tests.
- The web service uses same-origin `/api/failsafe/*` routes in Azure; Next.js rewrites those requests to the API Container App through `ORCHESTRATOR_API_BASE_URL`.
- Both services run inside one Azure Container Apps managed environment with Log Analytics.

## Runtime Boundaries
- No live Foundry execution, MCP execution, shell/file/network/database/email side effects, live LLM calls, or automatic Copilot patching are added.
- Optional Foundry identifiers remain non-secret environment values and are used only for readiness/display checks.
- GitHub Copilot remains a human-in-the-loop prompt handoff workflow.

## Required User Inputs Before Deployment
- Azure subscription and preferred region.
- Permission to create a resource group, or an existing resource group name.
- Optional non-secret Foundry identifiers:
  - `AZURE_FOUNDRY_PROJECT_ENDPOINT`
  - `AZURE_FOUNDRY_AGENT_ID`
  - `AZURE_TENANT_ID`
  - `AZURE_FOUNDRY_MODEL_DEPLOYMENT`

## Validation Commands
- `pnpm check`
- `pnpm build`
- `pnpm release:check`
- `pnpm smoke:api`
- `pnpm smoke:cli`
- `pnpm smoke:studio`
- `azd package` or `azd provision --preview` when Azure Developer CLI is available
