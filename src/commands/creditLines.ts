import type { Knex } from 'knex';
import { DomainError, requireField } from '../domain/errors.ts';
import { ID } from '../domain/ids.ts';
import { jsonStringify, loadCartOrThrow, touchCart } from '../domain/repo.ts';
import { getCart } from '../queries/getCart.ts';

export async function addCreditLine(db: Knex, input: { id?: string; creditLines?: any[] }) {
  requireField(input.id, 'id');
  if (!input.creditLines || input.creditLines.length === 0) {
    throw new DomainError('required-field', 'creditLines is required', 'creditLines');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const c of input.creditLines!) {
      if (c.amount === undefined || c.amount === null) {
        throw new DomainError('required-field', 'amount is required', 'amount');
      }
      await trx('credit_line').insert({
        id: ID.creditLine(),
        cart_id: input.id,
        amount: c.amount,
        reference: c.reference ?? null,
        reference_id: c.referenceId ?? null,
        metadata: jsonStringify(c.metadata),
      });
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function removeCreditLine(db: Knex, input: { id?: string; creditLines?: any[] }) {
  requireField(input.id, 'id');
  if (!input.creditLines || input.creditLines.length === 0) {
    throw new DomainError('required-field', 'creditLines is required', 'creditLines');
  }
  const ts = new Date().toISOString();
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const c of input.creditLines!) {
      requireField(c.id, 'creditLines[].id');
      const found = await trx('credit_line')
        .where({ id: c.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!found) {
        throw new DomainError('not-found', `credit line ${c.id} not found on cart ${input.id}`);
      }
      await trx('credit_line').where({ id: c.id }).update({ deleted_at: ts });
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}
