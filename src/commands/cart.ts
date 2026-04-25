import type { Knex } from 'knex';
import { DomainError, requireField } from '../domain/errors.ts';
import { ID } from '../domain/ids.ts';
import {
  jsonStringify,
  loadCartOrThrow,
  replaceAddress,
  touchCart,
} from '../domain/repo.ts';
import { addLineItemsInTrx } from './lineItems.ts';
import { getCart } from '../queries/getCart.ts';

export interface CreateCartInput {
  currencyCode?: string;
  regionId?: string;
  customerId?: string;
  salesChannelId?: string;
  email?: string;
  locale?: string;
  metadata?: unknown;
  billingAddress?: any;
  shippingAddress?: any;
  lineItems?: any[];
}

export async function createCart(db: Knex, input: CreateCartInput) {
  requireField(input.currencyCode, 'currency_code');
  const id = ID.cart();
  const now = new Date().toISOString();

  await db.transaction(async (trx) => {
    await trx('cart').insert({
      id,
      currency_code: String(input.currencyCode).toLowerCase(),
      region_id: input.regionId ?? null,
      customer_id: input.customerId ?? null,
      sales_channel_id: input.salesChannelId ?? null,
      email: input.email ?? null,
      locale: input.locale ?? null,
      metadata: jsonStringify(input.metadata),
      created_at: now,
      updated_at: now,
    });
    if (input.billingAddress) {
      await replaceAddress(trx, id, 'billing', input.billingAddress, ID.address);
    }
    if (input.shippingAddress) {
      await replaceAddress(trx, id, 'shipping', input.shippingAddress, ID.address);
    }
    if (input.lineItems && input.lineItems.length > 0) {
      await addLineItemsInTrx(trx, id, input.lineItems);
    }
  });

  return getCart(db, id);
}

export interface UpdateCartInput {
  id?: string;
  regionId?: string;
  customerId?: string;
  salesChannelId?: string;
  email?: string;
  locale?: string;
  metadata?: unknown;
}

export async function updateCart(db: Knex, input: UpdateCartInput) {
  requireField(input.id, 'id');
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.regionId !== undefined) patch.region_id = input.regionId;
    if (input.customerId !== undefined) patch.customer_id = input.customerId;
    if (input.salesChannelId !== undefined) patch.sales_channel_id = input.salesChannelId;
    if (input.email !== undefined) patch.email = input.email;
    if (input.locale !== undefined) patch.locale = input.locale;
    if (input.metadata !== undefined) patch.metadata = jsonStringify(input.metadata);
    await trx('cart').where({ id: input.id }).update(patch);
  });
  return getCart(db, input.id!);
}

export async function setShippingAddress(
  db: Knex,
  input: { id?: string; shippingAddress?: any },
) {
  requireField(input.id, 'id');
  requireField(input.shippingAddress, 'shipping_address');
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    await replaceAddress(trx, input.id!, 'shipping', input.shippingAddress, ID.address);
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function setBillingAddress(
  db: Knex,
  input: { id?: string; billingAddress?: any },
) {
  requireField(input.id, 'id');
  requireField(input.billingAddress, 'billing_address');
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    await replaceAddress(trx, input.id!, 'billing', input.billingAddress, ID.address);
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function deleteCart(db: Knex, input: { id?: string }) {
  requireField(input.id, 'id');
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    const ts = new Date().toISOString();
    await trx('cart').where({ id: input.id }).update({ deleted_at: ts });
    // Cascade soft-delete only to currently-active children (so prior soft-deletes stay distinct)
    for (const table of ['line_item', 'shipping_method', 'credit_line', 'cart_address']) {
      if (table === 'cart_address') {
        await trx('cart_address').where({ cart_id: input.id }).whereNull('deleted_at').update({ deleted_at: ts });
      } else {
        await trx(table).where({ cart_id: input.id }).whereNull('deleted_at').update({ deleted_at: ts });
      }
    }
  });
  return { id: input.id, deleted: true };
}

export async function restoreCart(db: Knex, input: { id?: string }) {
  requireField(input.id, 'id');
  await db.transaction(async (trx) => {
    const cart = await trx('cart').where({ id: input.id }).first();
    if (!cart) throw new DomainError('not-found', `cart ${input.id} not found`);
    if (!cart.deleted_at) {
      // already active — no-op but also not an error
      return;
    }
    const cartDeletedAt = cart.deleted_at;
    await trx('cart').where({ id: input.id }).update({ deleted_at: null });
    // Restore only children that were soft-deleted at the same instant as the cart
    for (const table of ['line_item', 'shipping_method', 'credit_line', 'cart_address']) {
      await trx(table)
        .where({ cart_id: input.id, deleted_at: cartDeletedAt })
        .update({ deleted_at: null });
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}
