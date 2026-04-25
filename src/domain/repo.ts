import type { Knex } from 'knex';
import { DomainError } from './errors.ts';

const ADDRESS_FIELDS = [
  'first_name',
  'last_name',
  'company',
  'address_1',
  'address_2',
  'city',
  'province',
  'postal_code',
  'country_code',
  'phone',
  'customer_id',
  'metadata',
] as const;

export function jsonStringify(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

export function jsonParse(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export async function loadCartOrThrow(
  trx: Knex,
  cartId: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<any> {
  const q = trx('cart').where({ id: cartId });
  if (!opts.includeDeleted) q.whereNull('deleted_at');
  const row = await q.first();
  if (!row) throw new DomainError('not-found', `cart ${cartId} not found`);
  return row;
}

export async function touchCart(trx: Knex, cartId: string): Promise<void> {
  await trx('cart').where({ id: cartId }).update({ updated_at: new Date().toISOString() });
}

export interface AddressRow {
  id: string;
  cart_id: string;
  kind: 'billing' | 'shipping';
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string | null;
  phone: string | null;
  customer_id: string | null;
  metadata: string | null;
  deleted_at: string | null;
}

export function addressInputToRow(input: any): Record<string, unknown> {
  return {
    first_name: input?.firstName ?? null,
    last_name: input?.lastName ?? null,
    company: input?.company ?? null,
    address_1: input?.address1 ?? null,
    address_2: input?.address2 ?? null,
    city: input?.city ?? null,
    province: input?.province ?? null,
    postal_code: input?.postalCode ?? null,
    country_code: input?.countryCode ?? null,
    phone: input?.phone ?? null,
    customer_id: input?.customerId ?? null,
    metadata: jsonStringify(input?.metadata),
  };
}

export function addressRowToDto(row: AddressRow | undefined | null): any | null {
  if (!row) return null;
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    company: row.company,
    address1: row.address_1,
    address2: row.address_2,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    phone: row.phone,
    customerId: row.customer_id,
    metadata: jsonParse(row.metadata),
  };
}

export async function replaceAddress(
  trx: Knex,
  cartId: string,
  kind: 'billing' | 'shipping',
  input: any,
  newId: () => string,
): Promise<void> {
  // Wholesale replace: delete existing (hard, not soft, since value object)
  await trx('cart_address').where({ cart_id: cartId, kind }).delete();
  if (input) {
    await trx('cart_address').insert({
      id: newId(),
      cart_id: cartId,
      kind,
      ...addressInputToRow(input),
    });
  }
}

export { ADDRESS_FIELDS };
