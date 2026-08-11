import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import {
  cvsCollection,
  database,
  metaCollection,
  syncQueueCollection,
  templatesCollection,
} from '../index';
import { cvsApi, templatesApi, type CvDto } from '../../api';
import { useSyncStore } from '../../stores/sync-store';

const PULL_CURSOR_KEY = 'cvs_pull_cursor';

async function getMeta(key: string): Promise<string | null> {
  const rows = await metaCollection.query(Q.where('key', key)).fetch();
  return rows[0]?.value ?? null;
}

async function setMeta(key: string, value: string) {
  await database.write(async () => {
    const rows = await metaCollection.query(Q.where('key', key)).fetch();
    if (rows[0]) {
      await rows[0].update((m) => {
        m.value = value;
      });
    } else {
      await metaCollection.create((m) => {
        m.key = key;
        m.value = value;
      });
    }
  });
}

export async function enqueueCvPatch(localId: string, payload: Partial<CvDto>) {
  await database.write(async () => {
    await syncQueueCollection.create((q) => {
      q.entity = 'cv';
      q.entityId = localId;
      q.op = 'PATCH';
      q.payload = JSON.stringify(payload);
      q.attempts = 0;
      q.nextAt = Date.now();
      q.createdAt = Date.now();
    });
  });
  const pending = await syncQueueCollection.query().fetchCount();
  useSyncStore.getState().setPending(pending);
}

export async function upsertLocalCv(dto: CvDto) {
  await database.write(async () => {
    const existing = await cvsCollection.query(Q.where('server_id', dto.id)).fetch();
    const contentJson = JSON.stringify(dto.content ?? {});
    const updatedAt = new Date(dto.updatedAt).getTime();
    if (existing[0]) {
      await existing[0].update((c) => {
        c.title = dto.title;
        c.templateId = dto.templateId;
        c.contentJson = contentJson;
        c.updatedAt = updatedAt;
        c.dirty = false;
        c.deletedAt = dto.deletedAt ? new Date(dto.deletedAt).getTime() : null;
      });
    } else {
      await cvsCollection.create((c) => {
        c.serverId = dto.id;
        c.title = dto.title;
        c.templateId = dto.templateId;
        c.contentJson = contentJson;
        c.updatedAt = updatedAt;
        c.dirty = false;
        c.deletedAt = dto.deletedAt ? new Date(dto.deletedAt).getTime() : null;
      });
    }
  });
}

export async function pullCvs() {
  const cursor = await getMeta(PULL_CURSOR_KEY);
  const { items } = await cvsApi.list(cursor ?? undefined);
  let maxTs = cursor ?? '';
  for (const dto of items) {
    const local = await cvsCollection.query(Q.where('server_id', dto.id)).fetch();
    if (local[0]?.dirty) {
      // LWW: keep local dirty; server wins only if not dirty
      continue;
    }
    await upsertLocalCv(dto);
    if (dto.updatedAt > maxTs) maxTs = dto.updatedAt;
  }
  if (maxTs) await setMeta(PULL_CURSOR_KEY, maxTs);
}

export async function pullTemplates() {
  const { items } = await templatesApi.list();
  await database.write(async () => {
    for (const t of items) {
      const existing = await templatesCollection.query(Q.where('server_id', t.id)).fetch();
      if (existing[0]) {
        await existing[0].update((m) => {
          m.name = t.name;
          m.category = t.category;
          m.previewUrl = t.previewUrl ?? null;
          m.isPremium = t.isPremium;
          m.cachedAt = Date.now();
        });
      } else {
        await templatesCollection.create((m) => {
          m.serverId = t.id;
          m.name = t.name;
          m.category = t.category;
          m.previewUrl = t.previewUrl ?? null;
          m.isPremium = t.isPremium;
          m.cachedAt = Date.now();
        });
      }
    }
  });
}

export async function flushQueue() {
  const jobs = await syncQueueCollection
    .query(Q.where('next_at', Q.lte(Date.now())), Q.sortBy('created_at', Q.asc))
    .fetch();

  for (const job of jobs) {
    try {
      if (job.entity === 'cv' && job.op === 'PATCH') {
        const cv = await cvsCollection.find(job.entityId);
        const payload = JSON.parse(job.payload) as Partial<CvDto>;
        const updated = await cvsApi.patch(cv.serverId, payload, job.id);
        await upsertLocalCv(updated);
      }
      await database.write(async () => {
        await job.destroyPermanently();
      });
    } catch (e) {
      await database.write(async () => {
        await job.update((j) => {
          j.attempts += 1;
          j.nextAt = Date.now() + Math.min(60_000, 2 ** j.attempts * 1000);
        });
      });
      useSyncStore.getState().setError(e instanceof Error ? e.message : 'Sync failed');
    }
  }
  const pending = await syncQueueCollection.query().fetchCount();
  useSyncStore.getState().setPending(pending);
}

let flushing = false;

export async function runSyncCycle() {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    useSyncStore.getState().setStatus('offline');
    return;
  }
  if (flushing) return;
  flushing = true;
  useSyncStore.getState().setStatus('syncing');
  try {
    await flushQueue();
    await pullCvs();
    useSyncStore.getState().markSynced();
  } catch (e) {
    useSyncStore.getState().setError(e instanceof Error ? e.message : 'Sync failed');
  } finally {
    flushing = false;
  }
}
