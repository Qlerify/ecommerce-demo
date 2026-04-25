import type { Knex } from 'knex';
import { DomainError, requireField } from '../domain/errors.ts';
import { ID } from '../domain/ids.ts';
import { jsonStringify, loadCartOrThrow, touchCart } from '../domain/repo.ts';
import { getCart } from '../queries/getCart.ts';

export async function addShippingMethod(
  db: Knex,
  input: { id?: string; shippingMethods?: any[] },
) {
  requireField(input.id, 'id');
  if (!input.shippingMethods || input.shippingMethods.length === 0) {
    throw new DomainError('required-field', 'shippingMethods is required', 'shippingMethods');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const m of input.shippingMethods!) {
      requireField(m.name, 'name');
      if (m.amount === undefined || m.amount === null) {
        throw new DomainError('required-field', 'amount is required', 'amount');
      }
      if (Number(m.amount) < 0) {
        throw new DomainError('check-constraint', 'shipping amount must be >= 0', 'amount');
      }
      await trx('shipping_method').insert({
        id: ID.shippingMethod(),
        cart_id: input.id,
        name: m.name,
        amount: m.amount,
        description: jsonStringify(m.description),
        shipping_option_id: m.shippingOptionId ?? null,
        data: jsonStringify(m.data),
        is_tax_inclusive: m.isTaxInclusive ?? null,
        metadata: jsonStringify(m.metadata),
      });
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function removeShippingMethod(
  db: Knex,
  input: { id?: string; shippingMethods?: any[] },
) {
  requireField(input.id, 'id');
  if (!input.shippingMethods || input.shippingMethods.length === 0) {
    throw new DomainError('required-field', 'shippingMethods is required', 'shippingMethods');
  }
  const ts = new Date().toISOString();
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const m of input.shippingMethods!) {
      requireField(m.id, 'shippingMethods[].id');
      const found = await trx('shipping_method')
        .where({ id: m.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!found) {
        throw new DomainError('not-found', `shipping method ${m.id} not found on cart ${input.id}`);
      }
      await trx('shipping_method').where({ id: m.id }).update({ deleted_at: ts });
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function setShippingMethodTaxLines(
  db: Knex,
  input: { id?: string; shippingMethods?: any[] },
) {
  requireField(input.id, 'id');
  if (!input.shippingMethods) {
    throw new DomainError('required-field', 'shippingMethods is required', 'shippingMethods');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const m of input.shippingMethods!) {
      requireField(m.id, 'shippingMethods[].id');
      const owned = await trx('shipping_method')
        .where({ id: m.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!owned) {
        throw new DomainError(
          'ownership',
          `shipping method ${m.id} does not belong to cart ${input.id}`,
        );
      }
      const incoming = (m.taxLines ?? []) as any[];
      const keepIds = incoming.filter((t) => t.id).map((t) => t.id);
      await trx('shipping_method_tax_line')
        .where({ shipping_method_id: m.id })
        .modify((q) => {
          if (keepIds.length > 0) q.whereNotIn('id', keepIds);
        })
        .delete();
      for (const tl of incoming) {
        const row = {
          shipping_method_id: m.id,
          code: tl.code,
          rate: tl.rate,
          description: tl.description ?? null,
          provider_id: tl.providerId ?? null,
          tax_rate_id: tl.taxRateId ?? null,
          metadata: jsonStringify(tl.metadata),
        };
        if (tl.id) {
          await trx('shipping_method_tax_line').where({ id: tl.id }).update(row);
        } else {
          await trx('shipping_method_tax_line').insert({ id: ID.taxLine(), ...row });
        }
      }
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function setShippingMethodAdjustments(
  db: Knex,
  input: { id?: string; shippingMethods?: any[] },
) {
  requireField(input.id, 'id');
  if (!input.shippingMethods) {
    throw new DomainError('required-field', 'shippingMethods is required', 'shippingMethods');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const m of input.shippingMethods!) {
      requireField(m.id, 'shippingMethods[].id');
      const owned = await trx('shipping_method')
        .where({ id: m.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!owned) {
        throw new DomainError(
          'ownership',
          `shipping method ${m.id} does not belong to cart ${input.id}`,
        );
      }
      const incoming = (m.adjustments ?? []) as any[];
      const keepIds = incoming.filter((a) => a.id).map((a) => a.id);
      await trx('shipping_method_adjustment')
        .where({ shipping_method_id: m.id })
        .modify((q) => {
          if (keepIds.length > 0) q.whereNotIn('id', keepIds);
        })
        .delete();
      for (const adj of incoming) {
        if (Number(adj.amount) < 0) {
          throw new DomainError('check-constraint', 'adjustment amount must be >= 0', 'amount');
        }
        const row = {
          shipping_method_id: m.id,
          amount: adj.amount,
          code: adj.code ?? null,
          description: adj.description ?? null,
          promotion_id: adj.promotionId ?? null,
          provider_id: adj.providerId ?? null,
          metadata: jsonStringify(adj.metadata),
        };
        if (adj.id) {
          await trx('shipping_method_adjustment').where({ id: adj.id }).update(row);
        } else {
          await trx('shipping_method_adjustment').insert({ id: ID.adjustment(), ...row });
        }
      }
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}
