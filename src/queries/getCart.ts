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

  const round = (n: number) => Math.round(n * 100) / 100;

  const computeTaxedTotals = (gross: number, rateSum: number, isInclusive: boolean, discountSubtotal: number) => {
    let subtotal: number;
    let taxTotal: number;
    if (isInclusive && rateSum > 0) {
      taxTotal = gross * (rateSum / (1 + rateSum));
      subtotal = gross - taxTotal;
    } else {
      subtotal = gross;
      taxTotal = subtotal * rateSum;
    }
    const discountTaxTotal = discountSubtotal * rateSum;
    const discountTotal = discountSubtotal + discountTaxTotal;
    const total = subtotal + taxTotal - discountTotal;
    return {
      subtotal: round(subtotal),
      taxTotal: round(taxTotal),
      discountSubtotal: round(discountSubtotal),
      discountTaxTotal: round(discountTaxTotal),
      discountTotal: round(discountTotal),
      total: round(total),
    };
  };

  const lineItemDtos = lineItems.map((li) => {
    const quantity = Number(li.quantity);
    const unitPrice = Number(li.unit_price);
    const isTaxInclusive = li.is_tax_inclusive == null ? null : !!li.is_tax_inclusive;
    const liTaxLines = taxLines
      .filter((t) => t.line_item_id === li.id)
      .map((t) => ({
        id: t.id,
        code: t.code,
        rate: Number(t.rate),
        description: t.description,
        providerId: t.provider_id,
        taxRateId: t.tax_rate_id,
        metadata: jsonParse(t.metadata),
      }));
    const liAdjustments = adjustments
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
      }));
    const rateSum = liTaxLines.reduce((s, t) => s + t.rate, 0) / 100;
    const discountSubtotal = liAdjustments.reduce((s, a) => s + a.amount, 0);
    const totals = computeTaxedTotals(quantity * unitPrice, rateSum, !!isTaxInclusive, discountSubtotal);
    return {
      id: li.id,
      title: li.title,
      quantity,
      unitPrice,
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
      isTaxInclusive,
      isCustomPrice: li.is_custom_price == null ? null : !!li.is_custom_price,
      compareAtUnitPrice: li.compare_at_unit_price == null ? null : Number(li.compare_at_unit_price),
      metadata: jsonParse(li.metadata),
      taxLines: liTaxLines,
      adjustments: liAdjustments,
      ...totals,
    };
  });

  const shippingMethodDtos = shippingMethods.map((sm) => {
    const amount = Number(sm.amount);
    const isTaxInclusive = sm.is_tax_inclusive == null ? null : !!sm.is_tax_inclusive;
    const smTax = smTaxLines
      .filter((t) => t.shipping_method_id === sm.id)
      .map((t) => ({
        id: t.id,
        code: t.code,
        rate: Number(t.rate),
        description: t.description,
        providerId: t.provider_id,
        taxRateId: t.tax_rate_id,
        metadata: jsonParse(t.metadata),
      }));
    const smAdj = smAdjustments
      .filter((a) => a.shipping_method_id === sm.id)
      .map((a) => ({
        id: a.id,
        amount: Number(a.amount),
        code: a.code,
        description: a.description,
        promotionId: a.promotion_id,
        providerId: a.provider_id,
        metadata: jsonParse(a.metadata),
      }));
    const rateSum = smTax.reduce((s, t) => s + t.rate, 0) / 100;
    const discountSubtotal = smAdj.reduce((s, a) => s + a.amount, 0);
    const totals = computeTaxedTotals(amount, rateSum, !!isTaxInclusive, discountSubtotal);
    return {
      id: sm.id,
      name: sm.name,
      amount,
      description: jsonParse(sm.description),
      shippingOptionId: sm.shipping_option_id,
      data: jsonParse(sm.data),
      isTaxInclusive,
      metadata: jsonParse(sm.metadata),
      taxLines: smTax,
      adjustments: smAdj,
      ...totals,
    };
  });

  const creditLineDtos = creditLines.map((c) => ({
    id: c.id,
    amount: Number(c.amount),
    reference: c.reference,
    referenceId: c.reference_id,
    metadata: jsonParse(c.metadata),
  }));

  const itemSubtotal = lineItemDtos.reduce((s, li) => s + li.subtotal, 0);
  const itemTaxTotal = lineItemDtos.reduce((s, li) => s + li.taxTotal, 0);
  const itemDiscountSubtotal = lineItemDtos.reduce((s, li) => s + li.discountSubtotal, 0);
  const itemDiscountTaxTotal = lineItemDtos.reduce((s, li) => s + li.discountTaxTotal, 0);
  const itemDiscountTotal = lineItemDtos.reduce((s, li) => s + li.discountTotal, 0);
  const itemTotal = lineItemDtos.reduce((s, li) => s + li.total, 0);

  const shippingSubtotal = shippingMethodDtos.reduce((s, sm) => s + sm.subtotal, 0);
  const shippingTaxTotal = shippingMethodDtos.reduce((s, sm) => s + sm.taxTotal, 0);
  const shippingDiscountSubtotal = shippingMethodDtos.reduce((s, sm) => s + sm.discountSubtotal, 0);
  const shippingDiscountTaxTotal = shippingMethodDtos.reduce((s, sm) => s + sm.discountTaxTotal, 0);
  const shippingDiscountTotal = shippingMethodDtos.reduce((s, sm) => s + sm.discountTotal, 0);
  const shippingTotal = shippingMethodDtos.reduce((s, sm) => s + sm.total, 0);

  const creditLineSubtotal = creditLineDtos.reduce((s, c) => s + c.amount, 0);
  const creditLineTaxTotal = 0;
  const creditLineTotal = creditLineSubtotal + creditLineTaxTotal;

  const subtotal = itemSubtotal + shippingSubtotal;
  const taxTotal = itemTaxTotal + shippingTaxTotal;
  const discountSubtotal = itemDiscountSubtotal + shippingDiscountSubtotal;
  const discountTaxTotal = itemDiscountTaxTotal + shippingDiscountTaxTotal;
  const discountTotal = itemDiscountTotal + shippingDiscountTotal;
  const total = subtotal + taxTotal - discountTotal - creditLineTotal;
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
    itemCount,
    subtotal: round(subtotal),
    taxTotal: round(taxTotal),
    discountSubtotal: round(discountSubtotal),
    discountTaxTotal: round(discountTaxTotal),
    discountTotal: round(discountTotal),
    itemSubtotal: round(itemSubtotal),
    itemTaxTotal: round(itemTaxTotal),
    itemDiscountTotal: round(itemDiscountTotal),
    itemTotal: round(itemTotal),
    shippingSubtotal: round(shippingSubtotal),
    shippingTaxTotal: round(shippingTaxTotal),
    shippingDiscountTotal: round(shippingDiscountTotal),
    shippingTotal: round(shippingTotal),
    creditLineSubtotal: round(creditLineSubtotal),
    creditLineTaxTotal: round(creditLineTaxTotal),
    creditLineTotal: round(creditLineTotal),
    total: round(total),
  };
}
