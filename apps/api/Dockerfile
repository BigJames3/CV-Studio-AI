# syntax=docker/dockerfile:1.7
# NestJS API — build from repo root:
#   docker build -f apps/api/Dockerfile .

FROM node:26-alpine AS base
RUN apk add --no-cache libc6-compat openssl dumb-init curl chromium \
  && if [ -x /usr/bin/chromium-browser ]; then ln -sf /usr/bin/chromium-browser /usr/local/bin/cv-chrome; \
     elif [ -x /usr/bin/chromium ]; then ln -sf /usr/bin/chromium /usr/local/bin/cv-chrome; \
     fi
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/cv-chrome
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV HUSKY=0
ENV CI=true

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
# Workspace glob still sees apps/mobile/package.json; do not install Expo/native deps.
RUN pnpm install --frozen-lockfile --filter @cvstudio/api...

# prisma generate reads these; it does not connect to Postgres
ENV DATABASE_URL="postgresql://cvstudio:cvstudio@localhost:5432/cvstudio?schema=public"
ENV DIRECT_DATABASE_URL="postgresql://cvstudio:cvstudio@localhost:5432/cvstudio?schema=public"

ENV TURBO_TELEMETRY_DISABLED=1
RUN pnpm --filter @cvstudio/api exec prisma generate
RUN pnpm run build:api

# Workspace packages export TypeScript sources; Node needs compiled JS at runtime.
RUN node -e "\
const fs=require('fs'); const path=require('path');\
for (const dir of ['packages/shared-types','packages/shared-utils','packages/ai-service']) {\
  const p=path.join(dir,'package.json');\
  if (!fs.existsSync(p)) continue;\
  const j=JSON.parse(fs.readFileSync(p,'utf8'));\
  j.main='./dist/index.js'; j.types='./dist/index.d.ts';\
  j.exports={'.':{types:'./dist/index.d.ts',require:'./dist/index.js',default:'./dist/index.js'}};\
  fs.writeFileSync(p, JSON.stringify(j,null,2)+'\\n');\
}"

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 10001 -S app \
  && adduser -u 10001 -S -G app -h /home/app app \
  && printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    'export DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"' \
    'if [ -x /app/apps/api/node_modules/.bin/prisma ]; then' \
    '  PRISMA=/app/apps/api/node_modules/.bin/prisma' \
    'elif [ -x /app/node_modules/.bin/prisma ]; then' \
    '  PRISMA=/app/node_modules/.bin/prisma' \
    'else' \
    '  PRISMA="npx prisma"' \
    'fi' \
    'echo "Running prisma migrate deploy..."' \
    '$PRISMA migrate deploy --schema=/app/apps/api/prisma/schema.prisma' \
    'exec "$@"' \
    > /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

COPY --from=builder --chown=app:app /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/apps/api ./apps/api
COPY --from=builder --chown=app:app /app/packages ./packages

WORKDIR /app/apps/api
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3001/api/v1/health/ready || exit 1
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
