import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('github_sources', {
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
        repo_owner: {
            type: 'varchar(255)',
            notNull: true,
        },
        repo_name: {
            type: 'varchar(255)',
            notNull: true,
        },
        access_token_encrypted: {
            type: 'text',
            notNull: false,
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

    pgm.sql('CREATE INDEX idx_github_sources_user_id ON github_sources (user_id);');
    pgm.createConstraint('github_sources', 'uq_github_sources_user_repo', {
        unique: ['user_id', 'repo_owner', 'repo_name'],
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('github_sources', 'idx_github_sources_user_id');
    pgm.dropTable('github_sources');
}
