# Queue (BullMQ)

PDF export, email, AI jobs. Redis-backed.

## PDF export (Phase 1)

- **Sync (editor / local drafts):** `POST /api/v1/cvs/export/pdf` with `{ content, filename?, pageSize?, quality? }` → PDF bytes.
- **Async (saved CVs):** `GET /api/v1/cvs/:id/export/pdf` → `{ jobId, pollUrl }` then poll `GET /api/v1/cvs/exports/:jobId` and download.
- **Worker image:** `apps/api/Dockerfile.worker` — sets `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
- **Start worker:** `WORKER_KIND=pdf pnpm --filter @cvstudio/api start:worker`

Inline processing runs in the API process when no separate worker is required (local/dev). Generated PDFs are cached in Redis for 5 minutes (`pdf:cache:*`).

Scaffold note: `@nestjs/bullmq` consumers can wrap `PdfExportService.processJob` when queue depth grows.
