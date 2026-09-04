# syntax=docker/dockerfile:1.7
# Next.js web — build from repo root:
#   docker build -f apps/web/Dockerfile .

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init curl ca-certificates
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV HUSKY=0
ENV CI=true

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @cvstudio/web...

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1

# next/font/google fetches at compile time (needs outbound HTTPS)
RUN pnpm run build:web

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 10001 -S app && adduser -u 10001 -S -G app -h /home/app app

COPY --from=builder --chown=app:app /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "if [ -f apps/web/server.js ]; then exec node apps/web/server.js; else exec node server.js; fi"]
