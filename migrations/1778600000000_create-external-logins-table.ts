import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('user_external_logins', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    provider: { type: 'varchar(50)', notNull: true },
    external_id: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('user_external_logins', 'unique_provider_external_id', {
    unique: ['provider', 'external_id']
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('user_external_logins');
}
