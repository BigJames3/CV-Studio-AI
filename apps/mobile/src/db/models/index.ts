import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class CvModel extends Model {
  static table = 'cvs';

  @text('server_id') serverId!: string;
  @text('title') title!: string;
  @text('template_id') templateId!: string | null;
  @text('content_json') contentJson!: string;
  @field('updated_at') updatedAt!: number;
  @field('deleted_at') deletedAt!: number | null;
  @field('dirty') dirty!: boolean;
  // NOTE: do NOT declare `syncStatus` here — WatermelonDB Model already
  // exposes it as a built-in accessor typed as SyncStatus ('synced' | 'created' | 'updated' | 'deleted').

  get content(): Record<string, unknown> {
    try {
      return JSON.parse(this.contentJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

export class TemplateModel extends Model {
  static table = 'templates';

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @text('category') category!: string;
  @text('preview_url') previewUrl!: string | null;
  @field('is_premium') isPremium!: boolean;
  @text('design_json') designJson!: string | null;
  @field('cached_at') cachedAt!: number;
}

export class SyncQueueModel extends Model {
  static table = 'sync_queue';

  @text('entity') entity!: string;
  @text('entity_id') entityId!: string;
  @text('op') op!: string;
  @text('payload') payload!: string;
  @field('attempts') attempts!: number;
  @field('next_at') nextAt!: number;
  @field('created_at') createdAt!: number;
}

export class MetaModel extends Model {
  static table = 'meta';

  @text('key') key!: string;
  @text('value') value!: string;
}
