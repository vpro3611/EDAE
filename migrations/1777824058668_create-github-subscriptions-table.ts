import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('github_subscriptions', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        github_source_id: {
            type: 'uuid',
            notNull: true,
            references: 'github_sources(id)',
            onDelete: 'CASCADE',
        },
        event_type: {
            type: 'varchar(50)',
            notNull: true,
        },
        connection_id: {
            type: 'uuid',
            notNull: true,
            references: 'connections(id)',
            onDelete: 'CASCADE',
        },
        message_template: {
            type: 'text',
            notNull: true,
        },
        config: {
            type: 'jsonb',
            notNull: true,
            default: '{}',
        },
        last_seen: {
            type: 'jsonb',
            notNull: true,
            default: '{}',
        },
        is_active: {
            type: 'boolean',
            notNull: true,
            default: true,
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.sql('CREATE INDEX idx_github_subscriptions_source_id ON github_subscriptions (github_source_id);');
    pgm.sql('CREATE INDEX idx_github_subscriptions_connection_id ON github_subscriptions (connection_id);');
    pgm.sql('CREATE INDEX idx_github_subscriptions_active ON github_subscriptions (is_active) WHERE is_active = true;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('github_subscriptions', 'idx_github_subscriptions_source_id');
    pgm.dropIndex('github_subscriptions', 'idx_github_subscriptions_connection_id');
    pgm.dropIndex('github_subscriptions', 'idx_github_subscriptions_active');
    pgm.dropTable('github_subscriptions');
}
