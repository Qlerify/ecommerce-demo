import type { Knex } from 'knex';
import { DomainError } from '../domain/errors.ts';
import { addressRowToDto, jsonParse } from '../domain/repo.ts';

export async function getCart(db: Knex, cartId: string, opts: { includeDeleted?: boolean } = {}) {
  const cartQ = db('cart').where({ id: cartId });
  if (!opts.includeDeleted) cartQ.whereNull('deleted_at');
  const cart = await cartQ.first();
  if (!cart) throw new DomainError('not-found', `cart ${cartId} not found`);

  const addrs = await db('cart_address')
    .where({ cart_id: cartId })
    .whereNull('deleted_at');
  const billing = addrs.find((a) => a.kind === 'billing');
  const shipping = addrs.find((a) => a.kind === 'shipping');

  const lineItems = await db('line_item')
    .where({ cart_id: cartId })
    .whereNull('deleted_at')
    .orderBy('id');

  const liIds = lineItems.map((l) => l.id);
  const taxLines = liIds.length
    ? await db('line_item_tax_line').whereIn('line_item_id', liIds)
    : [];
  const adjustments = liIds.length
    ? await db('line_item_adjustment').whereIn('line_item_id', liIds)
    : [];

  const shippingMethods = await db('shipping_method')
    .where({ cart_id: cartId })
    .whereNull('deleted_at')
    .orderBy('id');
  const smIds = shippingMethods.map((s) => s.id);
  const smTaxLines = smIds.length
    ? await db('shipping_method_tax_line').whereIn('shipping_method_id', smIds)
    : [];
  const smAdjustments = smIds.length
    ? await db('shipping_method_adjustment').whereIn('shipping_method_id', smIds)
    : [];

  const creditLines = await db('credit_line')
    .where({ cart_id: cartId })
    .whereNull('deleted_at')
    .orderBy('id');

  const lineItemDtos = lineItems.map((li) => ({
    id: li.id,
    title: li.title,
    quantity: Number(li.quantity),
    unitPrice: Number(li.unit_price),
    subtitle: li.subtitle,
    thumbnail: li.thumbnail,
    variantId: li.variant_id,
    productId: li.product_id,
    productTitle: li.product_title,
    productDescription: li.product_description,
    productSubtitle: li.product_subtitle,
    productType: li.product_type,
    productTypeId: li.product_type_id,
    productCollection: li.product_collection,
    productHandle: li.product_handle,
    variantSku: li.variant_sku,
    variantBarcode: li.variant_barcode,
    variantTitle: li.variant_title,
    variantOptionValues: jsonParse(li.variant_option_values),
    requiresShipping: li.requires_shipping == null ? null : !!li.requires_shipping,
    isDiscountable: li.is_discountable == null ? null : !!li.is_discountable,
    isGiftcard: li.is_giftcard == null ? null : !!li.is_giftcard,
    isTaxInclusive: li.is_tax_inclusive == null ? null : !!li.is_tax_inclusive,
    isCustomPrice: li.is_custom_price == null ? null : !!li.is_custom_price,
    compareAtUnitPrice: li.compare_at_unit_price == null ? null : Number(li.compare_at_unit_price),
    metadata: jsonParse(li.metadata),
    taxLines: taxLines
      .filter((t) => t.line_item_id === li.id)
      .map((t) => ({
        id: t.id,
        code: t.code,
        rate: Number(t.rate),
        description: t.description,
        providerId: t.provider_id,
        taxRateId: t.tax_rate_id,
        metadata: jsonParse(t.metadata),
      })),
    adjustments: adjustments
      .filter((a) => a.line_item_id === li.id)
      .map((a) => ({
        id: a.id,
        amount: Number(a.amount),
        code: a.code,
        description: a.description,
        promotionId: a.promotion_id,
        providerId: a.provider_id,
        isTaxInclusive: a.is_tax_inclusive == null ? null : !!a.is_tax_inclusive,
        metadata: jsonParse(a.metadata),
      })),
  }));

  const shippingMethodDtos = shippingMethods.map((sm) => ({
    id: sm.id,
    name: sm.name,
    amount: Number(sm.amount),
    description: jsonParse(sm.description),
    shippingOptionId: sm.shipping_option_id,
    data: jsonParse(sm.data),
    isTaxInclusive: sm.is_tax_inclusive == null ? null : !!sm.is_tax_inclusive,
    metadata: jsonParse(sm.metadata),
    taxLines: smTaxLines
      .filter((t) => t.shipping_method_id === sm.id)
      .map((t) => ({
        id: t.id,
        code: t.code,
        rate: Number(t.rate),
        description: t.description,
        providerId: t.provider_id,
        taxRateId: t.tax_rate_id,
        metadata: jsonParse(t.metadata),
      })),
    adjustments: smAdjustments
      .filter((a) => a.shipping_method_id === sm.id)
      .map((a) => ({
        id: a.id,
        amount: Number(a.amount),
        code: a.code,
        description: a.description,
        promotionId: a.promotion_id,
        providerId: a.provider_id,
        metadata: jsonParse(a.metadata),
      })),
  }));

  const creditLineDtos = creditLines.map((c) => ({
    id: c.id,
    amount: Number(c.amount),
    reference: c.reference,
    referenceId: c.reference_id,
    metadata: jsonParse(c.metadata),
  }));

  const itemsTotal = lineItemDtos.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice - (li.adjustments.reduce((a, x) => a + x.amount, 0)),
    0,
  );
  const shippingTotal = shippingMethodDtos.reduce(
    (sum, sm) => sum + sm.amount - sm.adjustments.reduce((a, x) => a + x.amount, 0),
    0,
  );
  const creditLineTotal = creditLineDtos.reduce((sum, c) => sum + c.amount, 0);
  const total = itemsTotal + shippingTotal - creditLineTotal;
  const itemCount = lineItemDtos.reduce((sum, li) => sum + li.quantity, 0);

  return {
    id: cart.id,
    currencyCode: cart.currency_code,
    customerId: cart.customer_id,
    email: cart.email,
    locale: cart.locale,
    regionId: cart.region_id,
    salesChannelId: cart.sales_channel_id,
    metadata: jsonParse(cart.metadata),
    completedAt: cart.completed_at,
    createdAt: cart.created_at,
    updatedAt: cart.updated_at,
    deletedAt: cart.deleted_at,
    billingAddress: addressRowToDto(billing),
    shippingAddress: addressRowToDto(shipping),
    lineItems: lineItemDtos,
    shippingMethods: shippingMethodDtos,
    creditLines: creditLineDtos,
    creditLineTotal,
    total: Math.round(total * 100) / 100,
    itemCount,
  };
}
