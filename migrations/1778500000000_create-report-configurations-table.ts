import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('report_configurations', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
        connection_id: { type: 'uuid', notNull: true, references: 'connections(id)', onDelete: 'CASCADE' },
        frequency: { type: 'varchar(10)', notNull: true },
        schedule_day: { type: 'smallint', notNull: true, default: 0 },
        is_active: { type: 'boolean', notNull: true, default: true },
        last_sent_at: { type: 'timestamptz' },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    });
    pgm.sql('CREATE INDEX idx_report_configs_user_id ON report_configurations (user_id);');
    pgm.sql('CREATE INDEX idx_report_configs_active ON report_configurations (is_active) WHERE is_active = true;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('report_configurations', 'idx_report_configs_user_id');
    pgm.dropIndex('report_configurations', 'idx_report_configs_active');
    pgm.dropTable('report_configurations');
}
