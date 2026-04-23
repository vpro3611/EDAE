import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('refresh_tokens', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: "CASCADE"
        },
        token_hash: {
            type: "text",
            notNull: true,
        },
        expires_at: {
            type: "timestamptz",
            notNull: true,
        },
        revoked_at: {
            type: "timestamptz",
            notNull: false,
            default: null,
        },
        created_at: {
            type: "timestamptz",
            notNull: true,
            default: pgm.func("now()"),
        }
    })
    pgm.sql(`CREATE INDEX idx_refresh_user_id ON refresh_tokens (user_id)`);
    pgm.sql(`CREATE INDEX idx_refresh_token_hash ON refresh_tokens (token_hash)`)
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('refresh_tokens', 'idx_refresh_user_id');
    pgm.dropIndex('refresh_tokens', 'idx_refresh_token_hash');
    pgm.dropTable('refresh_tokens');
}
