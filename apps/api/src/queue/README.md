# Queue (BullMQ)

PDF export, email, AI jobs. Redis-backed.

## PDF export

- **Sync (editor / local drafts):** `POST /api/v1/cvs/export/pdf` with `{ content, filename?, pageSize?, quality? }` → PDF bytes.

- **Async (saved CVs):** `GET /api/v1/cvs/:id/export/pdf` → `{ jobId, pollUrl }` then poll `GET /api/v1/cvs/exports/:jobId` and download. Job records live in Redis (`pdf:job:*`, 15 min), so any API pod can answer the poll.

- **Batch:** `POST /api/v1/cvs/export/pdf/batch`.

All three end in `PdfRenderQueue.htmlToPdf` (`modules/cvs/export/pdf-render-queue.service.ts`), the Chromium step.

### Where Chromium runs

| `PDF_RENDER_MODE` | Rendering                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| unset (default)   | Inline, in the API process (local dev, tests).                                                                       |
| `queue`           | The API adds a job to the `pdf-render` queue and waits for the PDF (60 s max); a PDF worker renders it. Used in k8s. |

In queue mode:

- if no worker is connected (checked every 10 s), the API renders inline instead of failing, so a worker outage or a rolling update never breaks exports;
- a job whose worker dies is picked up by another worker (BullMQ stalled-job recovery, 2 attempts);
- completed jobs are dropped from Redis after 60 s (they carry the HTML and the PDF), failed ones after 1 h.

### PDF worker

- **Start:** build the API (`pnpm --filter @cvstudio/api build`), then from `apps/api`: `WORKER_KIND=pdf node dist/worker.js`. Set `PDF_RENDER_MODE=queue` on the API to send it work.
- **Concurrency:** `PDF_WORKER_CONCURRENCY` (default 2 pages at once on one warm Chromium).
- **Image:** the API image (`apps/api/Dockerfile`), started with `node dist/worker.js`: same Chromium and fonts, so the PDF is identical whichever side renders it. See `infrastructure/k8s/base/workers.yaml`.

`apps/api/Dockerfile.worker` is not used by the manifests: it builds from `apps/api` alone, without the lockfile, the `@cvstudio/*` workspace packages or `prisma generate`.

Generated PDFs are cached in Redis for 5 minutes (`pdf:cache:*`, `pdf:wysiwyg:*`).
