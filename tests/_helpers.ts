import knex, { type Knex } from 'knex';
import { up } from '../src/db/migrations/001_init.ts';
import { seed } from '../src/db/seeds/001_fixtures.ts';
import spec from '../cart-domain-model.json' with { type: 'json' };

export async function freshDb(): Promise<Knex> {
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
      afterCreate: (conn: any, done: (err?: Error) => void) => {
        try {
          conn.pragma('foreign_keys = ON');
          done();
        } catch (e) {
          done(e as Error);
        }
      },
    },
  });
  await up(db);
  await seed(db);
  return db;
}

type AnySpec = typeof spec & {
  domainEvents: Record<string, { acceptanceCriteria: string[] }>;
};

export function criteriaFor(eventName: string): string[] {
  const ev = (spec as AnySpec).domainEvents[eventName];
  if (!ev) throw new Error(`unknown event ${eventName}`);
  return ev.acceptanceCriteria;
}

export const sampleAddress = {
  firstName: 'Alice',
  lastName: 'Smith',
  address1: '123 Maple Ave',
  city: 'New York',
  province: 'NY',
  postalCode: '10001',
  countryCode: 'US',
  phone: '+1-212-555-0100',
};

export const altAddress = {
  firstName: 'Bob',
  lastName: 'Jones',
  address1: '456 Oak St',
  city: 'Chicago',
  province: 'IL',
  postalCode: '60601',
  countryCode: 'US',
  phone: '+1-312-555-0111',
};

export const sampleLineItem = {
  title: 'Wireless Mouse',
  quantity: 1,
  unitPrice: 100,
  variantSku: 'SKU-001',
};
