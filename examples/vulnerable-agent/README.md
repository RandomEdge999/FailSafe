# Vulnerable Invoice Agent Example

This is a synthetic demo target for FailSafe. It is intentionally small and intentionally imperfect so the studio can show a crash-test timeline without touching real files, services, accounts, or external systems.

The example represents an invoice-review agent with:

- One mock MCP server.
- One normal invoice summarization tool.
- One high-risk file-reading tool that must require approval.
- Sample untrusted inputs used by the starter scenario packs.

Do not add real credentials or real customer data to this example. Future sandbox work should keep this target in dry-run mode unless a reviewed isolated runner is available.
