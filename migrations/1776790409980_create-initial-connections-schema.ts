import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('connections', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: "CASCADE",
        },
        provider: {
            type: 'varchar(50)',
            notNull: true,
        },
        name: {
            type: 'varchar(100)',
            notNull: true,
        },
        credentials: {
            type: 'JSONB',
            notNull: true,
        },
        created_at: {
            type: "timestamptz",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        updated_at: {
            type: "timestamptz",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        is_deleted: {
            type: "boolean",
            notNull: true,
            default: false,
        },
    });

    pgm.sql(
        "CREATE INDEX idx_connections_user_id ON connections (user_id);"
    );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('connections');
    pgm.dropIndex('users', 'idx_connections_user_id');
}
