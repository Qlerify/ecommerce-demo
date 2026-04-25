import knex, { Knex } from 'knex';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type DbDriver = 'sqlite' | 'pg';

export interface DbConfig {
  driver?: DbDriver;
  sqliteFile?: string;
  pgConnection?: string;
}

export function makeKnex(cfg: DbConfig = {}): Knex {
  const driver: DbDriver = cfg.driver ?? (process.env.DB_DRIVER as DbDriver) ?? 'sqlite';
  if (driver === 'pg') {
    return knex({
      client: 'pg',
      connection: cfg.pgConnection ?? process.env.DATABASE_URL,
      migrations: { directory: path.join(__dirname, 'migrations') },
      seeds: { directory: path.join(__dirname, 'seeds') },
    });
  }
  const filename = cfg.sqliteFile ?? process.env.SQLITE_FILE ?? path.join(process.cwd(), 'data', 'cart.sqlite');
  return knex({
    client: 'better-sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'migrations') },
    seeds: { directory: path.join(__dirname, 'seeds') },
    pool: {
      afterCreate: (conn: any, done: (err?: Error) => void) => {
        try {
          conn.pragma('journal_mode = WAL');
          conn.pragma('foreign_keys = ON');
          done();
        } catch (e) {
          done(e as Error);
        }
      },
    },
  });
}

export type { Knex };
