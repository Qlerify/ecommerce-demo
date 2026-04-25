import type { Knex } from 'knex';
import { DomainError, requireField } from '../domain/errors.ts';
import { ID } from '../domain/ids.ts';
import { jsonStringify, loadCartOrThrow, touchCart } from '../domain/repo.ts';
import { getCart } from '../queries/getCart.ts';

function lineItemInputToRow(cartId: string, input: any): Record<string, unknown> {
  return {
    cart_id: cartId,
    title: input.title,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    subtitle: input.subtitle ?? null,
    thumbnail: input.thumbnail ?? null,
    variant_id: input.variantId ?? null,
    product_id: input.productId ?? null,
    product_title: input.productTitle ?? null,
    product_description: input.productDescription ?? null,
    product_subtitle: input.productSubtitle ?? null,
    product_type: input.productType ?? null,
    product_type_id: input.productTypeId ?? null,
    product_collection: input.productCollection ?? null,
    product_handle: input.productHandle ?? null,
    variant_sku: input.variantSku ?? null,
    variant_barcode: input.variantBarcode ?? null,
    variant_title: input.variantTitle ?? null,
    variant_option_values: jsonStringify(input.variantOptionValues),
    requires_shipping: input.requiresShipping ?? null,
    is_discountable: input.isDiscountable ?? null,
    is_giftcard: input.isGiftcard ?? null,
    is_tax_inclusive: input.isTaxInclusive ?? null,
    is_custom_price: input.isCustomPrice ?? null,
    compare_at_unit_price: input.compareAtUnitPrice ?? null,
    metadata: jsonStringify(input.metadata),
  };
}

export async function addLineItemsInTrx(trx: Knex, cartId: string, items: any[]) {
  for (const item of items) {
    requireField(item.title, 'title');
    requireField(item.quantity, 'quantity');
    requireField(item.unitPrice, 'unit_price');
    if (Number(item.quantity) <= 0) {
      throw new DomainError('check-constraint', 'quantity must be greater than zero', 'quantity');
    }
    await trx('line_item').insert({
      id: ID.lineItem(),
      ...lineItemInputToRow(cartId, item),
    });
  }
}

export async function addLineItem(db: Knex, input: { id?: string; lineItems?: any[] }) {
  requireField(input.id, 'id');
  if (!input.lineItems || input.lineItems.length === 0) {
    throw new DomainError('required-field', 'lineItems is required', 'lineItems');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    await addLineItemsInTrx(trx, input.id!, input.lineItems!);
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function updateLineItem(db: Knex, input: { id?: string; lineItems?: any[] }) {
  requireField(input.id, 'id');
  if (!input.lineItems || input.lineItems.length === 0) {
    throw new DomainError('required-field', 'lineItems is required', 'lineItems');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const item of input.lineItems!) {
      requireField(item.id, 'lineItems[].id');
      const owned = await trx('line_item')
        .where({ id: item.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!owned) {
        throw new DomainError('not-found', `line item ${item.id} not found on cart ${input.id}`);
      }
      const patch: Record<string, unknown> = {};
      if (item.title !== undefined) patch.title = item.title;
      if (item.quantity !== undefined) {
        if (Number(item.quantity) <= 0) {
          throw new DomainError('check-constraint', 'quantity must be greater than zero', 'quantity');
        }
        patch.quantity = item.quantity;
      }
      if (item.unitPrice !== undefined) patch.unit_price = item.unitPrice;
      if (item.subtitle !== undefined) patch.subtitle = item.subtitle;
      if (item.thumbnail !== undefined) patch.thumbnail = item.thumbnail;
      if (item.requiresShipping !== undefined) patch.requires_shipping = item.requiresShipping;
      if (item.isDiscountable !== undefined) patch.is_discountable = item.isDiscountable;
      if (item.isGiftcard !== undefined) patch.is_giftcard = item.isGiftcard;
      if (item.isTaxInclusive !== undefined) patch.is_tax_inclusive = item.isTaxInclusive;
      if (item.isCustomPrice !== undefined) patch.is_custom_price = item.isCustomPrice;
      if (item.compareAtUnitPrice !== undefined) patch.compare_at_unit_price = item.compareAtUnitPrice;
      if (item.metadata !== undefined) patch.metadata = jsonStringify(item.metadata);
      if (Object.keys(patch).length > 0) {
        await trx('line_item').where({ id: item.id }).update(patch);
      }
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function removeLineItem(db: Knex, input: { id?: string; lineItems?: any[] }) {
  requireField(input.id, 'id');
  if (!input.lineItems || input.lineItems.length === 0) {
    throw new DomainError('required-field', 'lineItems is required', 'lineItems');
  }
  const ts = new Date().toISOString();
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const item of input.lineItems!) {
      requireField(item.id, 'lineItems[].id');
      const found = await trx('line_item')
        .where({ id: item.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!found) {
        throw new DomainError('not-found', `line item ${item.id} not found on cart ${input.id}`);
      }
      await trx('line_item').where({ id: item.id }).update({ deleted_at: ts });
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

/**
 * Set-replace tax lines per line item:
 * - rows with id present in payload → upserted
 * - rows whose id is omitted → deleted
 * - new entries (no id) → inserted
 */
export async function setLineItemTaxLines(db: Knex, input: { id?: string; lineItems?: any[] }) {
  requireField(input.id, 'id');
  if (!input.lineItems) {
    throw new DomainError('required-field', 'lineItems is required', 'lineItems');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const item of input.lineItems!) {
      requireField(item.id, 'lineItems[].id');
      const owned = await trx('line_item')
        .where({ id: item.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!owned) {
        throw new DomainError('not-found', `line item ${item.id} not found on cart ${input.id}`);
      }
      const incoming = (item.taxLines ?? []) as any[];
      const keepIds = incoming.filter((t) => t.id).map((t) => t.id);
      await trx('line_item_tax_line')
        .where({ line_item_id: item.id })
        .modify((q) => {
          if (keepIds.length > 0) q.whereNotIn('id', keepIds);
        })
        .delete();
      for (const tl of incoming) {
        const row = {
          line_item_id: item.id,
          code: tl.code,
          rate: tl.rate,
          description: tl.description ?? null,
          provider_id: tl.providerId ?? null,
          tax_rate_id: tl.taxRateId ?? null,
          metadata: jsonStringify(tl.metadata),
        };
        if (tl.id) {
          await trx('line_item_tax_line').where({ id: tl.id }).update(row);
        } else {
          await trx('line_item_tax_line').insert({ id: ID.taxLine(), ...row });
        }
      }
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}

export async function setLineItemAdjustments(db: Knex, input: { id?: string; lineItems?: any[] }) {
  requireField(input.id, 'id');
  if (!input.lineItems) {
    throw new DomainError('required-field', 'lineItems is required', 'lineItems');
  }
  await db.transaction(async (trx) => {
    await loadCartOrThrow(trx, input.id!);
    for (const item of input.lineItems!) {
      requireField(item.id, 'lineItems[].id');
      const owned = await trx('line_item')
        .where({ id: item.id, cart_id: input.id })
        .whereNull('deleted_at')
        .first();
      if (!owned) {
        throw new DomainError('not-found', `line item ${item.id} not found on cart ${input.id}`);
      }
      const incoming = (item.adjustments ?? []) as any[];
      const keepIds = incoming.filter((a) => a.id).map((a) => a.id);
      await trx('line_item_adjustment')
        .where({ line_item_id: item.id })
        .modify((q) => {
          if (keepIds.length > 0) q.whereNotIn('id', keepIds);
        })
        .delete();
      for (const adj of incoming) {
        if (Number(adj.amount) < 0) {
          throw new DomainError('check-constraint', 'adjustment amount must be >= 0', 'amount');
        }
        const row = {
          line_item_id: item.id,
          amount: adj.amount,
          code: adj.code ?? null,
          description: adj.description ?? null,
          promotion_id: adj.promotionId ?? null,
          provider_id: adj.providerId ?? null,
          is_tax_inclusive: adj.isTaxInclusive ?? null,
          metadata: jsonStringify(adj.metadata),
        };
        if (adj.id) {
          await trx('line_item_adjustment').where({ id: adj.id }).update(row);
        } else {
          await trx('line_item_adjustment').insert({ id: ID.adjustment(), ...row });
        }
      }
    }
    await touchCart(trx, input.id!);
  });
  return getCart(db, input.id!);
}
