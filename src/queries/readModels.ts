import type { Knex } from 'knex';

export async function getProductCatalog(db: Knex) {
  const rows = await db('product_catalog').select();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price == null ? null : Number(r.price),
    currencyCode: r.currency_code,
    thumbnail: r.thumbnail,
    inStock: r.in_stock == null ? null : !!r.in_stock,
    productId: r.product_id,
    variantId: r.variant_id,
    productTitle: r.product_title,
    variantTitle: r.variant_title,
    variantSku: r.variant_sku,
    unitPrice: r.unit_price == null ? null : Number(r.unit_price),
  }));
}

export async function getAvailableShippingOptions(db: Knex, regionId?: string) {
  const q = db('shipping_option').select();
  if (regionId) q.where({ region_id: regionId });
  const rows = await q;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount == null ? null : Number(r.amount),
    currencyCode: r.currency_code,
    providerName: r.provider_name,
    estimatedDelivery: r.estimated_delivery,
    regionId: r.region_id,
  }));
}

export async function getExternalCreditSources(db: Knex, customerId?: string) {
  const q = db('credit_source').select();
  if (customerId) q.where({ customer_id: customerId });
  const rows = await q;
  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    referenceId: r.reference_id,
    amount: r.amount == null ? null : Number(r.amount),
    currencyCode: r.currency_code,
    customerId: r.customer_id,
    description: r.description,
  }));
}

export async function listCarts(db: Knex, opts: { deleted?: boolean } = {}) {
  const q = db('cart').select();
  if (opts.deleted === true) q.whereNotNull('deleted_at');
  if (opts.deleted === false) q.whereNull('deleted_at');
  const rows = await q.orderBy('created_at', 'desc');
  const result = [];
  for (const r of rows) {
    const items = await db('line_item').where({ cart_id: r.id }).whereNull('deleted_at');
    const itemCount = items.reduce((s, i) => s + Number(i.quantity), 0);
    const total =
      items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
    result.push({
      id: r.id,
      customerId: r.customer_id,
      email: r.email,
      currencyCode: r.currency_code,
      deletedAt: r.deleted_at,
      createdAt: r.created_at,
      itemCount,
      total: Math.round(total * 100) / 100,
    });
  }
  return result;
}

export async function listDeletedCarts(db: Knex) {
  return listCarts(db, { deleted: true });
}
