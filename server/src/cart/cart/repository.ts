import { and, eq, inArray, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import type { Db } from "../../db/connection.js"
import {
  cartCreditLines,
  cartLineItems,
  cartShippingMethods,
  carts,
  lineItemAdjustments,
  lineItemTaxLines,
  shippingMethodAdjustments,
  shippingMethodTaxLines,
} from "../../db/schema.js"
import { DomainError } from "./errors.js"
import type {
  Address,
  Cart,
  CreditLine,
  LineItem,
  LineItemAdjustment,
  LineItemTaxLine,
  Metadata,
  ShippingMethod,
  ShippingMethodAdjustment,
  ShippingMethodTaxLine,
} from "./types.js"

const newId = (prefix: string) => `${prefix}_${createId()}`
export const newCartId = () => newId("cart")
export const newLineItemId = () => newId("cali")
export const newShippingMethodId = () => newId("casm")
export const newCreditLineId = () => newId("cacl")
export const newAdjustmentId = () => newId("adj")
export const newTaxLineId = () => newId("txln")

const toIso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null)

type CartRow = typeof carts.$inferSelect

const extractShippingAddress = (row: CartRow): Address | null => {
  if (!row.shippingAddressPresent) return null
  return {
    customerId: row.shippingCustomerId,
    company: row.shippingCompany,
    firstName: row.shippingFirstName,
    lastName: row.shippingLastName,
    address1: row.shippingAddress1,
    address2: row.shippingAddress2,
    city: row.shippingCity,
    countryCode: row.shippingCountryCode,
    province: row.shippingProvince,
    postalCode: row.shippingPostalCode,
    phone: row.shippingPhone,
    metadata: row.shippingMetadata,
  }
}

const extractBillingAddress = (row: CartRow): Address | null => {
  if (!row.billingAddressPresent) return null
  return {
    customerId: row.billingCustomerId,
    company: row.billingCompany,
    firstName: row.billingFirstName,
    lastName: row.billingLastName,
    address1: row.billingAddress1,
    address2: row.billingAddress2,
    city: row.billingCity,
    countryCode: row.billingCountryCode,
    province: row.billingProvince,
    postalCode: row.billingPostalCode,
    phone: row.billingPhone,
    metadata: row.billingMetadata,
  }
}

const shippingAddressFields = (a: Address | null | undefined) => {
  if (a === null) {
    return {
      shippingCustomerId: null,
      shippingCompany: null,
      shippingFirstName: null,
      shippingLastName: null,
      shippingAddress1: null,
      shippingAddress2: null,
      shippingCity: null,
      shippingCountryCode: null,
      shippingProvince: null,
      shippingPostalCode: null,
      shippingPhone: null,
      shippingMetadata: null,
      shippingAddressPresent: false,
    }
  }
  if (a === undefined) return {}
  return {
    shippingCustomerId: a.customerId ?? null,
    shippingCompany: a.company ?? null,
    shippingFirstName: a.firstName ?? null,
    shippingLastName: a.lastName ?? null,
    shippingAddress1: a.address1 ?? null,
    shippingAddress2: a.address2 ?? null,
    shippingCity: a.city ?? null,
    shippingCountryCode: a.countryCode ?? null,
    shippingProvince: a.province ?? null,
    shippingPostalCode: a.postalCode ?? null,
    shippingPhone: a.phone ?? null,
    shippingMetadata: a.metadata ?? null,
    shippingAddressPresent: true,
  }
}

const billingAddressFields = (a: Address | null | undefined) => {
  if (a === null) {
    return {
      billingCustomerId: null,
      billingCompany: null,
      billingFirstName: null,
      billingLastName: null,
      billingAddress1: null,
      billingAddress2: null,
      billingCity: null,
      billingCountryCode: null,
      billingProvince: null,
      billingPostalCode: null,
      billingPhone: null,
      billingMetadata: null,
      billingAddressPresent: false,
    }
  }
  if (a === undefined) return {}
  return {
    billingCustomerId: a.customerId ?? null,
    billingCompany: a.company ?? null,
    billingFirstName: a.firstName ?? null,
    billingLastName: a.lastName ?? null,
    billingAddress1: a.address1 ?? null,
    billingAddress2: a.address2 ?? null,
    billingCity: a.city ?? null,
    billingCountryCode: a.countryCode ?? null,
    billingProvince: a.province ?? null,
    billingPostalCode: a.postalCode ?? null,
    billingPhone: a.phone ?? null,
    billingMetadata: a.metadata ?? null,
    billingAddressPresent: true,
  }
}

export type CartRepository = ReturnType<typeof makeCartRepository>

export const makeCartRepository = (db: Db) => {
  const fetchCartRow = async (id: string): Promise<CartRow> => {
    const rows = await db.select().from(carts).where(eq(carts.id, id)).limit(1)
    if (!rows[0]) {
      throw new DomainError("NOT_FOUND", `Cart with id "${id}" was not found`)
    }
    return rows[0]
  }

  const loadFullCart = async (id: string): Promise<Cart> => {
    const cartRow = await fetchCartRow(id)
    const itemRows = await db.select().from(cartLineItems).where(eq(cartLineItems.cartId, id))
    const itemIds = itemRows.map((i) => i.id)

    let adjustmentRows: (typeof lineItemAdjustments.$inferSelect)[] = []
    let taxRows: (typeof lineItemTaxLines.$inferSelect)[] = []
    if (itemIds.length) {
      adjustmentRows = await db
        .select()
        .from(lineItemAdjustments)
        .where(inArray(lineItemAdjustments.lineItemId, itemIds))
      taxRows = await db
        .select()
        .from(lineItemTaxLines)
        .where(inArray(lineItemTaxLines.lineItemId, itemIds))
    }

    const shippingRows = await db
      .select()
      .from(cartShippingMethods)
      .where(eq(cartShippingMethods.cartId, id))
    const shippingIds = shippingRows.map((s) => s.id)

    let shippingAdjRows: (typeof shippingMethodAdjustments.$inferSelect)[] = []
    let shippingTaxRows: (typeof shippingMethodTaxLines.$inferSelect)[] = []
    if (shippingIds.length) {
      shippingAdjRows = await db
        .select()
        .from(shippingMethodAdjustments)
        .where(inArray(shippingMethodAdjustments.shippingMethodId, shippingIds))
      shippingTaxRows = await db
        .select()
        .from(shippingMethodTaxLines)
        .where(inArray(shippingMethodTaxLines.shippingMethodId, shippingIds))
    }

    const creditLineRows = await db
      .select()
      .from(cartCreditLines)
      .where(eq(cartCreditLines.cartId, id))

    const items: LineItem[] = itemRows.map((r) => ({
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
      adjustments: adjustmentRows
        .filter((a) => a.lineItemId === r.id)
        .map((a) => ({
          id: a.id,
          amount: a.amount,
          code: a.code,
          description: a.description,
          promotionId: a.promotionId,
          providerId: a.providerId,
          isTaxInclusive: a.isTaxInclusive,
          metadata: a.metadata,
        })),
      taxLines: taxRows
        .filter((t) => t.lineItemId === r.id)
        .map((t) => ({
          id: t.id,
          code: t.code,
          rate: t.rate,
          description: t.description,
          taxRateId: t.taxRateId,
          providerId: t.providerId,
          metadata: t.metadata,
        })),
    }))

    const shippingMethods: ShippingMethod[] = shippingRows.map((r) => ({
      id: r.id,
      cartId: r.cartId,
      name: r.name,
      description: r.description,
      amount: r.amount,
      isTaxInclusive: r.isTaxInclusive,
      shippingOptionId: r.shippingOptionId,
      data: r.data,
      metadata: r.metadata,
      adjustments: shippingAdjRows
        .filter((a) => a.shippingMethodId === r.id)
        .map((a) => ({
          id: a.id,
          amount: a.amount,
          code: a.code,
          description: a.description,
          promotionId: a.promotionId,
          providerId: a.providerId,
          metadata: a.metadata,
        })),
      taxLines: shippingTaxRows
        .filter((t) => t.shippingMethodId === r.id)
        .map((t) => ({
          id: t.id,
          code: t.code,
          rate: t.rate,
          description: t.description,
          taxRateId: t.taxRateId,
          providerId: t.providerId,
          metadata: t.metadata,
        })),
    }))

    const creditLines: CreditLine[] = creditLineRows.map((r) => ({
      id: r.id,
      cartId: r.cartId,
      amount: r.amount,
      rawAmount: r.rawAmount,
      reference: r.reference,
      referenceId: r.referenceId,
      metadata: r.metadata,
    }))

    return {
      id: cartRow.id,
      customerId: cartRow.customerId,
      regionId: cartRow.regionId,
      salesChannelId: cartRow.salesChannelId,
      email: cartRow.email,
      currencyCode: cartRow.currencyCode,
      locale: cartRow.locale,
      metadata: cartRow.metadata,
      completedAt: toIso(cartRow.completedAt),
      shippingAddress: extractShippingAddress(cartRow),
      billingAddress: extractBillingAddress(cartRow),
      items,
      shippingMethods,
      creditLines,
      version: cartRow.version,
      createdAt: cartRow.createdAt.toISOString(),
      updatedAt: cartRow.updatedAt.toISOString(),
    }
  }

  const bumpVersion = async (id: string, expectedVersion: number): Promise<number> => {
    const result = await db
      .update(carts)
      .set({ version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(eq(carts.id, id), eq(carts.version, expectedVersion)))
      .returning({ version: carts.version })
    if (!result[0]) {
      throw new DomainError(
        "CONFLICT",
        `Cart with id "${id}" was modified by a concurrent operation. Retry.`
      )
    }
    return result[0].version
  }

  const insertCart = async (input: {
    id: string
    customerId?: string | null
    regionId?: string | null
    salesChannelId?: string | null
    email?: string | null
    currencyCode: string
    locale?: string | null
    metadata?: Metadata | null
    completedAt?: Date | null
    shippingAddress?: Address | null
    billingAddress?: Address | null
  }) => {
    await db.insert(carts).values({
      id: input.id,
      customerId: input.customerId ?? null,
      regionId: input.regionId ?? null,
      salesChannelId: input.salesChannelId ?? null,
      email: input.email ?? null,
      currencyCode: input.currencyCode,
      locale: input.locale ?? null,
      metadata: input.metadata ?? null,
      completedAt: input.completedAt ?? null,
      ...shippingAddressFields(input.shippingAddress ?? undefined),
      ...billingAddressFields(input.billingAddress ?? undefined),
    })
  }

  const updateCartScalars = async (
    id: string,
    expectedVersion: number,
    patch: {
      customerId?: string | null
      regionId?: string | null
      salesChannelId?: string | null
      email?: string | null
      currencyCode?: string
      locale?: string | null
      metadata?: Metadata | null
      completedAt?: Date | null
      shippingAddress?: Address | null
      billingAddress?: Address | null
    }
  ) => {
    const setObj: Record<string, unknown> = {}
    if (patch.customerId !== undefined) setObj.customerId = patch.customerId
    if (patch.regionId !== undefined) setObj.regionId = patch.regionId
    if (patch.salesChannelId !== undefined) setObj.salesChannelId = patch.salesChannelId
    if (patch.email !== undefined) setObj.email = patch.email
    if (patch.currencyCode !== undefined) setObj.currencyCode = patch.currencyCode
    if (patch.locale !== undefined) setObj.locale = patch.locale
    if (patch.metadata !== undefined) setObj.metadata = patch.metadata
    if (patch.completedAt !== undefined) setObj.completedAt = patch.completedAt
    Object.assign(setObj, shippingAddressFields(patch.shippingAddress))
    Object.assign(setObj, billingAddressFields(patch.billingAddress))
    setObj.version = expectedVersion + 1
    setObj.updatedAt = new Date()

    const result = await db
      .update(carts)
      .set(setObj)
      .where(and(eq(carts.id, id), eq(carts.version, expectedVersion)))
      .returning({ version: carts.version })
    if (!result[0]) {
      throw new DomainError(
        "CONFLICT",
        `Cart with id "${id}" was modified by a concurrent operation. Retry.`
      )
    }
    return result[0].version
  }

  const deleteCart = async (id: string) => {
    const result = await db.delete(carts).where(eq(carts.id, id)).returning({ id: carts.id })
    if (!result[0]) {
      throw new DomainError("NOT_FOUND", `Cart with id "${id}" was not found`)
    }
  }

  const insertLineItems = async (
    cartId: string,
    items: Array<Omit<LineItem, "id" | "cartId" | "adjustments" | "taxLines"> & { id?: string }>
  ): Promise<LineItem[]> => {
    if (!items.length) return []
    const toInsert = items.map((i) => ({
      id: i.id ?? newLineItemId(),
      cartId,
      title: i.title,
      subtitle: i.subtitle ?? null,
      thumbnail: i.thumbnail ?? null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      compareAtUnitPrice: i.compareAtUnitPrice ?? null,
      variantId: i.variantId ?? null,
      productId: i.productId ?? null,
      productTitle: i.productTitle ?? null,
      productDescription: i.productDescription ?? null,
      productSubtitle: i.productSubtitle ?? null,
      productType: i.productType ?? null,
      productTypeId: i.productTypeId ?? null,
      productCollection: i.productCollection ?? null,
      productHandle: i.productHandle ?? null,
      variantSku: i.variantSku ?? null,
      variantBarcode: i.variantBarcode ?? null,
      variantTitle: i.variantTitle ?? null,
      variantOptionValues: i.variantOptionValues ?? null,
      requiresShipping: i.requiresShipping ?? true,
      isDiscountable: i.isDiscountable ?? true,
      isGiftcard: i.isGiftcard ?? false,
      isTaxInclusive: i.isTaxInclusive ?? false,
      isCustomPrice: i.isCustomPrice ?? false,
      metadata: i.metadata ?? null,
    }))
    const result = await db.insert(cartLineItems).values(toInsert).returning()
    return result.map((r) => ({
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

  const updateLineItem = async (
    cartId: string,
    itemId: string,
    patch: Record<string, unknown>
  ): Promise<void> => {
    const existing = await db
      .select()
      .from(cartLineItems)
      .where(and(eq(cartLineItems.id, itemId), eq(cartLineItems.cartId, cartId)))
      .limit(1)
    if (!existing[0]) {
      throw new DomainError(
        "NOT_FOUND",
        `Line item with id "${itemId}" does not exist on cart "${cartId}"`
      )
    }
    const setObj: Record<string, unknown> = { updatedAt: new Date() }
    const passthrough = [
      "title",
      "subtitle",
      "thumbnail",
      "quantity",
      "unitPrice",
      "compareAtUnitPrice",
      "isDiscountable",
      "isTaxInclusive",
      "isCustomPrice",
      "metadata",
    ]
    for (const key of passthrough) {
      if (key in patch) setObj[key] = (patch as Record<string, unknown>)[key]
    }
    if (Object.keys(setObj).length === 1) return
    await db.update(cartLineItems).set(setObj).where(eq(cartLineItems.id, itemId))
  }

  const removeLineItems = async (cartId: string, itemIds: string[]): Promise<void> => {
    if (!itemIds.length) return
    await db
      .delete(cartLineItems)
      .where(and(eq(cartLineItems.cartId, cartId), inArray(cartLineItems.id, itemIds)))
  }

  const insertShippingMethods = async (
    cartId: string,
    methods: Array<{
      id?: string
      name: string
      amount: number
      description?: Metadata | null
      isTaxInclusive?: boolean
      shippingOptionId?: string | null
      data?: Metadata | null
      metadata?: Metadata | null
    }>
  ): Promise<ShippingMethod[]> => {
    if (!methods.length) return []
    const toInsert = methods.map((m) => ({
      id: m.id ?? newShippingMethodId(),
      cartId,
      name: m.name,
      description: m.description ?? null,
      amount: m.amount,
      isTaxInclusive: m.isTaxInclusive ?? false,
      shippingOptionId: m.shippingOptionId ?? null,
      data: m.data ?? null,
      metadata: m.metadata ?? null,
    }))
    const result = await db.insert(cartShippingMethods).values(toInsert).returning()
    return result.map((r) => ({
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

  const updateShippingMethod = async (
    cartId: string,
    smId: string,
    patch: Record<string, unknown>
  ) => {
    const existing = await db
      .select()
      .from(cartShippingMethods)
      .where(and(eq(cartShippingMethods.id, smId), eq(cartShippingMethods.cartId, cartId)))
      .limit(1)
    if (!existing[0]) {
      throw new DomainError(
        "NOT_FOUND",
        `Shipping method with id "${smId}" does not exist on cart "${cartId}"`
      )
    }
    const setObj: Record<string, unknown> = { updatedAt: new Date() }
    const passthrough = [
      "name",
      "amount",
      "description",
      "isTaxInclusive",
      "data",
      "metadata",
    ]
    for (const key of passthrough) {
      if (key in patch) setObj[key] = (patch as Record<string, unknown>)[key]
    }
    if (Object.keys(setObj).length === 1) return
    await db.update(cartShippingMethods).set(setObj).where(eq(cartShippingMethods.id, smId))
  }

  const removeShippingMethods = async (cartId: string, ids: string[]) => {
    if (!ids.length) return
    await db
      .delete(cartShippingMethods)
      .where(
        and(eq(cartShippingMethods.cartId, cartId), inArray(cartShippingMethods.id, ids))
      )
  }

  const verifyItemsBelongToCart = async (cartId: string, itemIds: string[]) => {
    if (!itemIds.length) return
    const rows = await db
      .select({ id: cartLineItems.id })
      .from(cartLineItems)
      .where(and(eq(cartLineItems.cartId, cartId), inArray(cartLineItems.id, itemIds)))
    const present = new Set(rows.map((r) => r.id))
    for (const id of itemIds) {
      if (!present.has(id)) {
        throw new DomainError(
          "INVALID_DATA",
          `Line item with id "${id}" does not exist on cart "${cartId}"`
        )
      }
    }
  }

  const verifyShippingMethodsBelongToCart = async (cartId: string, ids: string[]) => {
    if (!ids.length) return
    const rows = await db
      .select({ id: cartShippingMethods.id })
      .from(cartShippingMethods)
      .where(
        and(eq(cartShippingMethods.cartId, cartId), inArray(cartShippingMethods.id, ids))
      )
    const present = new Set(rows.map((r) => r.id))
    for (const id of ids) {
      if (!present.has(id)) {
        throw new DomainError(
          "INVALID_DATA",
          `Shipping method with id "${id}" does not exist on cart "${cartId}"`
        )
      }
    }
  }

  const replaceLineItemAdjustments = async (
    itemId: string,
    adjustments: LineItemAdjustment[]
  ) => {
    const existing = await db
      .select({ id: lineItemAdjustments.id })
      .from(lineItemAdjustments)
      .where(eq(lineItemAdjustments.lineItemId, itemId))
    const existingIds = new Set(existing.map((e) => e.id))
    const incomingIds = new Set(adjustments.filter((a) => a.id).map((a) => a.id as string))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length) {
      await db.delete(lineItemAdjustments).where(inArray(lineItemAdjustments.id, toDelete))
    }
    for (const adj of adjustments) {
      if (adj.id && existingIds.has(adj.id)) {
        await db
          .update(lineItemAdjustments)
          .set({
            amount: adj.amount,
            code: adj.code ?? null,
            description: adj.description ?? null,
            promotionId: adj.promotionId ?? null,
            providerId: adj.providerId ?? null,
            isTaxInclusive: adj.isTaxInclusive ?? false,
            metadata: adj.metadata ?? null,
          })
          .where(eq(lineItemAdjustments.id, adj.id))
      } else {
        await db.insert(lineItemAdjustments).values({
          id: adj.id ?? newAdjustmentId(),
          lineItemId: itemId,
          amount: adj.amount,
          code: adj.code ?? null,
          description: adj.description ?? null,
          promotionId: adj.promotionId ?? null,
          providerId: adj.providerId ?? null,
          isTaxInclusive: adj.isTaxInclusive ?? false,
          metadata: adj.metadata ?? null,
        })
      }
    }
  }

  const replaceShippingMethodAdjustments = async (
    smId: string,
    adjustments: ShippingMethodAdjustment[]
  ) => {
    const existing = await db
      .select({ id: shippingMethodAdjustments.id })
      .from(shippingMethodAdjustments)
      .where(eq(shippingMethodAdjustments.shippingMethodId, smId))
    const existingIds = new Set(existing.map((e) => e.id))
    const incomingIds = new Set(
      adjustments.filter((a) => a.id).map((a) => a.id as string)
    )

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length) {
      await db
        .delete(shippingMethodAdjustments)
        .where(inArray(shippingMethodAdjustments.id, toDelete))
    }
    for (const adj of adjustments) {
      if (adj.id && existingIds.has(adj.id)) {
        await db
          .update(shippingMethodAdjustments)
          .set({
            amount: adj.amount,
            code: adj.code ?? null,
            description: adj.description ?? null,
            promotionId: adj.promotionId ?? null,
            providerId: adj.providerId ?? null,
            metadata: adj.metadata ?? null,
          })
          .where(eq(shippingMethodAdjustments.id, adj.id))
      } else {
        await db.insert(shippingMethodAdjustments).values({
          id: adj.id ?? newAdjustmentId(),
          shippingMethodId: smId,
          amount: adj.amount,
          code: adj.code ?? null,
          description: adj.description ?? null,
          promotionId: adj.promotionId ?? null,
          providerId: adj.providerId ?? null,
          metadata: adj.metadata ?? null,
        })
      }
    }
  }

  const replaceLineItemTaxLines = async (itemId: string, taxLines: LineItemTaxLine[]) => {
    const existing = await db
      .select({ id: lineItemTaxLines.id })
      .from(lineItemTaxLines)
      .where(eq(lineItemTaxLines.lineItemId, itemId))
    const existingIds = new Set(existing.map((e) => e.id))
    const incomingIds = new Set(taxLines.filter((t) => t.id).map((t) => t.id as string))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length) {
      await db.delete(lineItemTaxLines).where(inArray(lineItemTaxLines.id, toDelete))
    }
    for (const tl of taxLines) {
      if (tl.id && existingIds.has(tl.id)) {
        await db
          .update(lineItemTaxLines)
          .set({
            code: tl.code,
            rate: tl.rate,
            description: tl.description ?? null,
            taxRateId: tl.taxRateId ?? null,
            providerId: tl.providerId ?? null,
            metadata: tl.metadata ?? null,
          })
          .where(eq(lineItemTaxLines.id, tl.id))
      } else {
        await db.insert(lineItemTaxLines).values({
          id: tl.id ?? newTaxLineId(),
          lineItemId: itemId,
          code: tl.code,
          rate: tl.rate,
          description: tl.description ?? null,
          taxRateId: tl.taxRateId ?? null,
          providerId: tl.providerId ?? null,
          metadata: tl.metadata ?? null,
        })
      }
    }
  }

  const replaceShippingMethodTaxLines = async (
    smId: string,
    taxLines: ShippingMethodTaxLine[]
  ) => {
    const existing = await db
      .select({ id: shippingMethodTaxLines.id })
      .from(shippingMethodTaxLines)
      .where(eq(shippingMethodTaxLines.shippingMethodId, smId))
    const existingIds = new Set(existing.map((e) => e.id))
    const incomingIds = new Set(taxLines.filter((t) => t.id).map((t) => t.id as string))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length) {
      await db
        .delete(shippingMethodTaxLines)
        .where(inArray(shippingMethodTaxLines.id, toDelete))
    }
    for (const tl of taxLines) {
      if (tl.id && existingIds.has(tl.id)) {
        await db
          .update(shippingMethodTaxLines)
          .set({
            code: tl.code,
            rate: tl.rate,
            description: tl.description ?? null,
            taxRateId: tl.taxRateId ?? null,
            providerId: tl.providerId ?? null,
            metadata: tl.metadata ?? null,
          })
          .where(eq(shippingMethodTaxLines.id, tl.id))
      } else {
        await db.insert(shippingMethodTaxLines).values({
          id: tl.id ?? newTaxLineId(),
          shippingMethodId: smId,
          code: tl.code,
          rate: tl.rate,
          description: tl.description ?? null,
          taxRateId: tl.taxRateId ?? null,
          providerId: tl.providerId ?? null,
          metadata: tl.metadata ?? null,
        })
      }
    }
  }

  const upsertCreditLine = async (cartId: string, cl: {
    id?: string
    amount: number
    rawAmount: Metadata
    reference?: string | null
    referenceId?: string | null
    metadata?: Metadata | null
  }) => {
    if (cl.id) {
      const existing = await db
        .select()
        .from(cartCreditLines)
        .where(and(eq(cartCreditLines.id, cl.id), eq(cartCreditLines.cartId, cartId)))
        .limit(1)
      if (existing[0]) {
        await db
          .update(cartCreditLines)
          .set({
            amount: cl.amount,
            rawAmount: cl.rawAmount,
            reference: cl.reference ?? null,
            referenceId: cl.referenceId ?? null,
            metadata: cl.metadata ?? null,
            updatedAt: new Date(),
          })
          .where(eq(cartCreditLines.id, cl.id))
        return cl.id
      }
    }
    const id = cl.id ?? newCreditLineId()
    await db.insert(cartCreditLines).values({
      id,
      cartId,
      amount: cl.amount,
      rawAmount: cl.rawAmount,
      reference: cl.reference ?? null,
      referenceId: cl.referenceId ?? null,
      metadata: cl.metadata ?? null,
    })
    return id
  }

  const removeCreditLine = async (cartId: string, id: string) => {
    const result = await db
      .delete(cartCreditLines)
      .where(and(eq(cartCreditLines.id, id), eq(cartCreditLines.cartId, cartId)))
      .returning({ id: cartCreditLines.id })
    if (!result[0]) {
      throw new DomainError(
        "NOT_FOUND",
        `Credit line with id "${id}" does not exist on cart "${cartId}"`
      )
    }
  }

  const listCarts = async (filter: {
    customerId?: string
    regionId?: string
    salesChannelId?: string
    completed?: boolean
    limit?: number
    offset?: number
  }): Promise<Cart[]> => {
    const conditions = []
    if (filter.customerId) conditions.push(eq(carts.customerId, filter.customerId))
    if (filter.regionId) conditions.push(eq(carts.regionId, filter.regionId))
    if (filter.salesChannelId) conditions.push(eq(carts.salesChannelId, filter.salesChannelId))
    if (filter.completed === true) conditions.push(sql`${carts.completedAt} IS NOT NULL`)
    if (filter.completed === false) conditions.push(sql`${carts.completedAt} IS NULL`)

    const query = db.select({ id: carts.id }).from(carts)
    const rows = conditions.length
      ? await query.where(and(...conditions)).limit(filter.limit ?? 50).offset(filter.offset ?? 0)
      : await query.limit(filter.limit ?? 50).offset(filter.offset ?? 0)

    const out: Cart[] = []
    for (const r of rows) {
      out.push(await loadFullCart(r.id))
    }
    return out
  }

  return {
    fetchCartRow,
    loadFullCart,
    bumpVersion,
    insertCart,
    updateCartScalars,
    deleteCart,
    insertLineItems,
    updateLineItem,
    removeLineItems,
    insertShippingMethods,
    updateShippingMethod,
    removeShippingMethods,
    verifyItemsBelongToCart,
    verifyShippingMethodsBelongToCart,
    replaceLineItemAdjustments,
    replaceShippingMethodAdjustments,
    replaceLineItemTaxLines,
    replaceShippingMethodTaxLines,
    upsertCreditLine,
    removeCreditLine,
    listCarts,
  }
}
