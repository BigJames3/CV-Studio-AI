import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { CvModel, TemplateModel, SyncQueueModel, MetaModel } from './models';

/**
 * WatermelonDB requires a native SQLite adapter (dev client / prebuild).
 * Expo Go alone is insufficient for production offline — use EAS development build.
 */
const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[WatermelonDB] setup failed', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [CvModel, TemplateModel, SyncQueueModel, MetaModel],
});

export const cvsCollection = database.get<CvModel>('cvs');
export const templatesCollection = database.get<TemplateModel>('templates');
export const syncQueueCollection = database.get<SyncQueueModel>('sync_queue');
export const metaCollection = database.get<MetaModel>('meta');
