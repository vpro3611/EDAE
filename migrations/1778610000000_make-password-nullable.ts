import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('users', 'password_hashed', { allowNull: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('users', 'password_hashed', { allowNull: false });
}
