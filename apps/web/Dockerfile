# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/ai/package.json packages/ai/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY apps/widget/package.json apps/widget/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV REDIS_URL=redis://localhost:6379
ENV BETTER_AUTH_SECRET=build-build-build-build-build-build-1234
ENV BETTER_AUTH_URL=http://localhost:3000
ENV OPENAI_API_KEY=sk-build
ENV S3_ENDPOINT=http://localhost:9000
ENV S3_REGION=us-east-1
ENV S3_BUCKET=felops
ENV S3_ACCESS_KEY_ID=build
ENV S3_SECRET_ACCESS_KEY=build
ENV ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
ENV APP_URL=http://localhost:3000
RUN pnpm --filter @felops/widget build
RUN pnpm --filter @felops/web build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
