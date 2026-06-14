FROM node:22-alpine

ARG NEXT_PUBLIC_API_BASE_URL=/api/failsafe

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/studio-web/package.json apps/studio-web/package.json
COPY packages/attack-packs/package.json packages/attack-packs/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/scoring-engine/package.json packages/scoring-engine/package.json

RUN pnpm install --frozen-lockfile

COPY apps/studio-web apps/studio-web
COPY packages/attack-packs packages/attack-packs
COPY packages/schemas packages/schemas
COPY packages/scoring-engine packages/scoring-engine

RUN pnpm --filter @failsafe/studio-web build

ENV NODE_ENV=production
ENV STUDIO_WEB_PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "@failsafe/studio-web", "exec", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
