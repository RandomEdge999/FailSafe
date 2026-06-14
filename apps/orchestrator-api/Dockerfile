FROM node:22-alpine

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/orchestrator-api/package.json apps/orchestrator-api/package.json
COPY packages/attack-packs/package.json packages/attack-packs/package.json
COPY packages/scenario-engine/package.json packages/scenario-engine/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/scoring-engine/package.json packages/scoring-engine/package.json
COPY packages/trace-model/package.json packages/trace-model/package.json

RUN pnpm install --frozen-lockfile

COPY apps/orchestrator-api apps/orchestrator-api
COPY packages packages

RUN pnpm --filter @failsafe/orchestrator-api typecheck

ENV NODE_ENV=production
ENV ORCHESTRATOR_API_PORT=4000

EXPOSE 4000

CMD ["pnpm", "--filter", "@failsafe/orchestrator-api", "start"]
