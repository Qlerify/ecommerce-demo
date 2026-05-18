import { and, eq } from "drizzle-orm"
import type { Db } from "../../db/connection.js"
import {
  cartCreditLines,
  cartLineItems,
  cartShippingMethods,
} from "../../db/schema.js"
import type { CartRepository } from "./repository.js"
import type {
  Cart,
  CartTotals,
  CartWithTotals,
  CreditLine,
  LineItem,
  ShippingMethod,
} from "./types.js"

const round = (n: number): number => Math.round(n * 100) / 100

const sum = (vals: number[]): number => vals.reduce((a, b) => a + b, 0)

const computeLineItemTotals = (item: LineItem) => {
  const subtotal = item.unitPrice * item.quantity
  const discountTotal = sum(item.adjustments.map((a) => a.amount))
  const taxableBase = Math.max(0, subtotal - discountTotal)
  const taxTotal = sum(item.taxLines.map((t) => taxableBase * (t.rate / 100)))
  return {
    itemSubtotal: round(subtotal),
    itemDiscountTotal: round(discountTotal),
    itemTaxTotal: round(taxTotal),
    itemTotal: round(taxableBase + taxTotal),
  }
}

const computeShippingTotals = (sm: ShippingMethod) => {
  const subtotal = sm.amount
  const discountTotal = sum(sm.adjustments.map((a) => a.amount))
  const taxableBase = Math.max(0, subtotal - discountTotal)
  const taxTotal = sum(sm.taxLines.map((t) => taxableBase * (t.rate / 100)))
  return {
    subtotal: round(subtotal),
    discountTotal: round(discountTotal),
    taxTotal: round(taxTotal),
    total: round(taxableBase + taxTotal),
  }
}

const computeCartTotals = (cart: Cart): CartTotals => {
  const items = cart.items.map(computeLineItemTotals)
  const shipping = cart.shippingMethods.map(computeShippingTotals)

  const itemSubtotal = sum(items.map((i) => i.itemSubtotal))
  const itemDiscountTotal = sum(items.map((i) => i.itemDiscountTotal))
  const itemTaxTotal = sum(items.map((i) => i.itemTaxTotal))
  const itemTotal = sum(items.map((i) => i.itemTotal))

  const shippingSubtotal = sum(shipping.map((s) => s.subtotal))
  const shippingDiscountTotal = sum(shipping.map((s) => s.discountTotal))
  const shippingTaxTotal = sum(shipping.map((s) => s.taxTotal))
  const shippingTotal = sum(shipping.map((s) => s.total))

  const giftCardTotal = sum(
    cart.creditLines
      .filter((c) => c.reference === "gift_card")
      .map((c) => c.amount)
  )
  const creditLineTotal = sum(cart.creditLines.map((c) => c.amount))

  const subtotal = itemSubtotal + shippingSubtotal
  const discountTotal = itemDiscountTotal + shippingDiscountTotal
  const taxTotal = itemTaxTotal + shippingTaxTotal
  const total = Math.max(0, itemTotal + shippingTotal - creditLineTotal)

  return {
    itemSubtotal: round(itemSubtotal),
    itemDiscountTotal: round(itemDiscountTotal),
    itemTaxTotal: round(itemTaxTotal),
    itemTotal: round(itemTotal),
    shippingSubtotal: round(shippingSubtotal),
    shippingDiscountTotal: round(shippingDiscountTotal),
    shippingTaxTotal: round(shippingTaxTotal),
    shippingTotal: round(shippingTotal),
    creditLineTotal: round(creditLineTotal),
    giftCardTotal: round(giftCardTotal),
    subtotal: round(subtotal),
    discountTotal: round(discountTotal),
    taxTotal: round(taxTotal),
    total: round(total),
  }
}

const decorateCartWithTotals = (cart: Cart): CartWithTotals => {
  const items = cart.items.map((i) => ({ ...i, ...computeLineItemTotals(i) }))
  const shippingMethods = cart.shippingMethods.map((s) => ({
    ...s,
    ...computeShippingTotals(s),
  }))
  return {
    ...cart,
    items,
    shippingMethods,
    totals: computeCartTotals(cart),
  }
}

export type QueryService = ReturnType<typeof makeQueryService>

export const makeQueryService = (db: Db, repo: CartRepository) => {
  const getCart = async (id: string): Promise<CartWithTotals> => {
    const cart = await repo.loadFullCart(id)
    return decorateCartWithTotals(cart)
  }

  const listCarts = async (filter: {
    customerId?: string
    regionId?: string
    salesChannelId?: string
    completed?: boolean
    limit?: number
    offset?: number
  }): Promise<CartWithTotals[]> => {
    const carts = await repo.listCarts(filter)
    return carts.map(decorateCartWithTotals)
  }

  const listLineItems = async (filter: {
    cartId?: string
    variantId?: string
    productId?: string
  }): Promise<LineItem[]> => {
    const conditions = []
    if (filter.cartId) conditions.push(eq(cartLineItems.cartId, filter.cartId))
    if (filter.variantId) conditions.push(eq(cartLineItems.variantId, filter.variantId))
    if (filter.productId) conditions.push(eq(cartLineItems.productId, filter.productId))

    const query = db.select().from(cartLineItems)
    const rows = conditions.length ? await query.where(and(...conditions)) : await query
    return rows.map((r) => ({
      id: r.id,
      cartId: r.cartId,
      title: r.title,
      subtitle: r.subtitle,
      thumbnail: r.thumbnail,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      compareAtUnitPrice: r.compareAtUnitPrice,
      variantId: r.variantId,
      productId: r.productId,
      productTitle: r.productTitle,
      productDescription: r.productDescription,
      productSubtitle: r.productSubtitle,
      productType: r.productType,
      productTypeId: r.productTypeId,
      productCollection: r.productCollection,
      productHandle: r.productHandle,
      variantSku: r.variantSku,
      variantBarcode: r.variantBarcode,
      variantTitle: r.variantTitle,
      variantOptionValues: r.variantOptionValues,
      requiresShipping: r.requiresShipping,
      isDiscountable: r.isDiscountable,
      isGiftcard: r.isGiftcard,
      isTaxInclusive: r.isTaxInclusive,
      isCustomPrice: r.isCustomPrice,
      metadata: r.metadata,
      adjustments: [],
      taxLines: [],
    }))
  }

  const listShippingMethods = async (filter: {
    cartId?: string
    shippingOptionId?: string
  }): Promise<ShippingMethod[]> => {
    const conditions = []
    if (filter.cartId) conditions.push(eq(cartShippingMethods.cartId, filter.cartId))
    if (filter.shippingOptionId)
      conditions.push(eq(cartShippingMethods.shippingOptionId, filter.shippingOptionId))

    const query = db.select().from(cartShippingMethods)
    const rows = conditions.length ? await query.where(and(...conditions)) : await query
    return rows.map((r) => ({
      id: r.id,
      cartId: r.cartId,
      name: r.name,
      description: r.description,
      amount: r.amount,
      isTaxInclusive: r.isTaxInclusive,
      shippingOptionId: r.shippingOptionId,
      data: r.data,
      metadata: r.metadata,
      adjustments: [],
      taxLines: [],
    }))
  }

  const listCreditLines = async (filter: {
    cartId?: string
    reference?: string
    referenceId?: string
  }): Promise<CreditLine[]> => {
    const conditions = []
    if (filter.cartId) conditions.push(eq(cartCreditLines.cartId, filter.cartId))
    if (filter.reference) conditions.push(eq(cartCreditLines.reference, filter.reference))
    if (filter.referenceId)
      conditions.push(eq(cartCreditLines.referenceId, filter.referenceId))

    const query = db.select().from(cartCreditLines)
    const rows = conditions.length ? await query.where(and(...conditions)) : await query
    return rows.map((r) => ({
      id: r.id,
      cartId: r.cartId,
      amount: r.amount,
      rawAmount: r.rawAmount,
      reference: r.reference,
      referenceId: r.referenceId,
      metadata: r.metadata,
    }))
  }

  return {
    getCart,
    listCarts,
    listLineItems,
    listShippingMethods,
    listCreditLines,
  }
}
