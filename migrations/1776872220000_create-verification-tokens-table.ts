import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('verification_tokens', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE',
        },
        otp_hash: {
            type: 'varchar(255)',
            notNull: true,
        },
        purpose: {
            type: 'varchar(50)',
            notNull: true,
        },
        expires_at: {
            type: 'timestamptz',
            notNull: true,
        },
        is_used: {
            type: 'boolean',
            notNull: true,
            default: false,
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.sql('CREATE INDEX idx_verification_tokens_user_purpose ON verification_tokens (user_id, purpose)');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('verification_tokens', 'idx_verification_tokens_user_purpose');
    pgm.dropTable('verification_tokens');
}
