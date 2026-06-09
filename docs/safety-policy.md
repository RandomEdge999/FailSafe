# Safety Policy

FailSafe is defensive-use-only software for local agent safety review.

## Allowed

- Import reviewed Foundry-style manifests.
- Import reviewed recorded agent evidence through JSON request bodies.
- Run local defensive scenario evaluation.
- Generate local findings, trust maps, Patch Coach prompt payloads, regression artifacts, fixture replay evidence, runner dry-run decisions, sandbox plans, and Safety Cards.
- Store local app-owned evidence in `.failsafe-data`.

## Blocked

- Arbitrary shell execution.
- Arbitrary user path reads or writes.
- Credential storage.
- Live Foundry agent invocation.
- Live model/provider calls.
- Live MCP tool execution.
- Live external target testing.
- Email sending.
- Database side effects.
- Uncontrolled tool execution.
- Live Copilot invocation from the app.

## Evidence import rules

Recorded evidence import accepts JSON request bodies only. It rejects live URLs, local/absolute paths, shell command intent, high-confidence tokens, and private-key material. It redacts secret-like values in message content before storage.

## Fixture replay rules

Fixture replay uses reviewed app-owned fixture IDs derived from saved regression context. It does not accept user-provided paths, URLs, commands, tool targets, MCP servers, model targets, email targets, database targets, or secrets.

## Reporting rules

Safety Cards must state evidence mode, local-only boundaries, limitations, and human review requirements. They are review artifacts, not security certifications.

## AI disclosure

FailSafe can generate Copilot-ready prompt payloads. The app does not call Copilot. Submitters must disclose actual GitHub Copilot usage truthfully in the hackathon submission.
