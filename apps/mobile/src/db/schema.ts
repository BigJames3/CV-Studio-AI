import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  // v2: drop custom sync_status column — conflicts with WatermelonDB Model.syncStatus
  version: 2,
  tables: [
    tableSchema({
      name: 'cvs',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'template_id', type: 'string', isOptional: true },
        { name: 'content_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'templates',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'preview_url', type: 'string', isOptional: true },
        { name: 'is_premium', type: 'boolean' },
        { name: 'design_json', type: 'string', isOptional: true },
        { name: 'cached_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity', type: 'string', isIndexed: true },
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'op', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'attempts', type: 'number' },
        { name: 'next_at', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'meta',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' },
      ],
    }),
  ],
});
