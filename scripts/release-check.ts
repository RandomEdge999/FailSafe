import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "README.md",
  "docs/architecture.md",
  "docs/design.md",
  "docs/demo-script.md",
  "docs/safety-policy.md",
  "docs/build-plan.md",
  "docs/PRD.md",
  "docs/final-ready-lock-list.md",
  "docs/submission-checklist.md",
  ".env.example",
  "docs/assets/brand/failsafe-logo.png",
  "docs/assets/brand/crash-lab-hero.png",
  "apps/studio-web/public/brand/failsafe-logo.png",
  "apps/studio-web/public/brand/crash-lab-hero.png",
  "docs/assets/screenshots/dashboard.png",
  "docs/assets/screenshots/timeline-finding-detail.png",
  "docs/assets/screenshots/patch-coach.png",
  "docs/assets/screenshots/fixture-replay-comparison.png",
  "docs/assets/screenshots/safety-card.png",
  "docs/assets/screenshots/foundry-operations.png",
  "docs/assets/screenshots/agent-trust-map.png",
  "docs/assets/screenshots/evidence-readiness.png",
  "docs/assets/screenshots/crash-test-result.png"
];

const textExtensions = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".json",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".yml",
  ".yaml",
  ".example"
]);

const skipDirs = new Set([
  ".git",
  ".next",
  ".turbo",
  ".failsafe-data",
  "node_modules",
  "dist",
  "build",
  "coverage"
]);

const allowedCopyPatterns = [
  /\/runs\/mock/,
  /\/regressions\/mock/,
  /\/regressions\/:id\/replay-mock/,
  /replay-mock/,
  /mockReplayable/,
  /mockOnly/,
  /MOCK_SCENARIO_VERSION/,
  /mock-scenario-engine/,
  /Compatibility replay endpoint/,
  /Sample Lab/,
  /synthetic/i,
  /deterministic/i,
  /compatibility/i,
  /local/i,
  /reviewed fixture/i,
  /recorded evidence/i
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function read(filePath: string) {
  return readFileSync(join(root, filePath), "utf8");
}

function walk(dir: string): string[] {
  const entries: string[] = [];

  for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
    const relative = dir ? join(dir, item.name) : item.name;

    if (item.isDirectory()) {
      if (!skipDirs.has(item.name)) {
        entries.push(...walk(relative));
      }
      continue;
    }

    entries.push(relative);
  }

  return entries;
}

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `Required release artifact missing: ${file}`);
}

assert(
  !existsSync(join(root, ".env")),
  "A real .env file exists at the repo root. It must not be committed or required."
);

const envExample = read(".env.example");
for (const forbidden of [
  /^OPENAI_API_KEY=/m,
  /^GITHUB_TOKEN=/m,
  /^DATABASE_URL=/m,
  /^REDIS_URL=/m,
  /sk-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9_]{20,}/
]) {
  assert(!forbidden.test(envExample), `.env.example contains forbidden active secret pattern: ${forbidden}`);
}

const docs = walk("docs").filter((file) => extname(file).toLowerCase() === ".md");
const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
for (const doc of docs) {
  const content = read(doc);
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1]?.split("#")[0] ?? "";

    if (
      !target ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:")
    ) {
      continue;
    }

    const resolved = normalize(join(root, doc, "..", decodeURIComponent(target)));
    assert(existsSync(resolved), `${doc} links to missing local target: ${target}`);
  }
}

const markdownAndReadme = ["README.md", ...docs];
const referencedAssets = new Set<string>();
const imagePattern = /!\[[^\]]*]\(([^)]+)\)/g;
for (const file of markdownAndReadme) {
  const content = read(file);
  for (const match of content.matchAll(imagePattern)) {
    const target = match[1]?.split("#")[0] ?? "";
    if (!target || target.startsWith("http://") || target.startsWith("https://")) {
      continue;
    }
    const asset = normalize(join(root, file, "..", decodeURIComponent(target)));
    referencedAssets.add(asset);
    assert(existsSync(asset), `${file} references missing image: ${target}`);
    assert(statSync(asset).size > 1_000, `${file} references an unexpectedly tiny image: ${target}`);
  }
}

assert(
  referencedAssets.size >= 5,
  "Expected README/docs to reference at least five screenshot or brand assets."
);

const productFiles = [
  "README.md",
  "docs/architecture.md",
  "docs/design.md",
  "docs/demo-script.md",
  "docs/safety-policy.md",
  "docs/build-plan.md",
  "docs/PRD.md",
  "docs/final-ready-lock-list.md",
  "docs/submission-checklist.md",
  "apps/studio-web/components/AppShell.tsx",
  "apps/studio-web/components/AgentOpsPanel.tsx",
  "apps/studio-web/components/DashboardHeader.tsx",
  "apps/studio-web/components/CopilotPromptPanel.tsx",
  "apps/studio-web/components/CrashTimeline.tsx",
  "apps/studio-web/components/RegressionPanel.tsx",
  "apps/studio-web/components/ReportPanel.tsx"
];

for (const file of productFiles) {
  const lines = read(file).split(/\r?\n/);

  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    const hasGuardedTerm =
      /\b(fake|placeholder|coming soon|lorem|todo|fixme|hardcoded)\b/.test(lower) ||
      /\bmock\b/.test(lower);

    if (!hasGuardedTerm) {
      return;
    }

    if (allowedCopyPatterns.some((pattern) => pattern.test(line))) {
      return;
    }

    throw new Error(
      `${file}:${index + 1} contains product-facing unfinished/misleading copy: ${line.trim()}`
    );
  });
}

for (const file of walk("")) {
  const extension = extname(file).toLowerCase();

  if (!textExtensions.has(extension) && !file.endsWith(".env.example")) {
    continue;
  }

  const content = read(file);
  assert(!/-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/.test(content), `${file} contains private key material.`);
  assert(!/sk-[A-Za-z0-9_-]{20,}/.test(content), `${file} contains an OpenAI-style secret.`);
  assert(!/ghp_[A-Za-z0-9_]{20,}/.test(content), `${file} contains a GitHub token-style secret.`);
}

const readme = read("README.md");
for (const requiredText of [
  "Microsoft Agents League",
  "Creative Apps",
  "Azure AI Foundry",
  "recorded agent evidence",
  "AI assistance disclosure",
  "Known intentional limits",
  "pnpm smoke:api",
  "pnpm smoke:cli",
  "pnpm smoke:studio"
]) {
  assert(readme.includes(requiredText), `README is missing required launch text: ${requiredText}`);
}

console.log(
  `FailSafe release check passed: ${requiredFiles.length} required artifacts, ${docs.length} docs, ${referencedAssets.size} referenced assets, docs links ok, secret scan ok, product copy guardrails ok.`
);
