import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('users', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        name: {
            type: 'varchar(255)',
            notNull: true
        },
        email: {
            type: 'varchar(255)',
            notNull: true,
            unique: true
        },
        password_hashed: {
            type: 'varchar(255)',
            notNull: true
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        updated_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        is_deleted: {
            type: 'boolean',
            notNull: true,
            default: false
        }
    });

}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('users');
}
