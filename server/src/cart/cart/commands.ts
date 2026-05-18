import { eventBus } from "../../events/bus.js"
import {
  guardAddLineItems,
  guardAddShippingMethod,
  guardCreateCart,
  guardManageCreditLines,
  guardRemoveLineItems,
  guardRemoveShippingMethod,
  guardSetLineItemAdjustments,
  guardSetLineItemTaxLines,
  guardSetShippingMethodAdjustments,
  guardSetShippingMethodTaxLines,
  guardUpdateCart,
  guardUpdateLineItems,
  guardUpdateShippingMethod,
} from "./invariants.js"
import { type CartRepository, newCartId } from "./repository.js"
import type {
  AddLineItemsInput,
  AddShippingMethodInput,
  Cart,
  CreateCartInput,
  DeleteCartInput,
  ManageCreditLinesInput,
  RemoveLineItemsInput,
  RemoveShippingMethodInput,
  SetLineItemAdjustmentsInput,
  SetLineItemTaxLinesInput,
  SetShippingMethodAdjustmentsInput,
  SetShippingMethodTaxLinesInput,
  UpdateCartInput,
  UpdateLineItemsInput,
  UpdateShippingMethodInput,
} from "./types.js"

export type CommandService = ReturnType<typeof makeCommandService>

export const makeCommandService = (repo: CartRepository) => {
  const createCart = async (raw: CreateCartInput): Promise<Cart> => {
    const input = guardCreateCart(raw)
    const id = newCartId()
    await repo.insertCart({
      id,
      customerId: input.customerId,
      regionId: input.regionId,
      salesChannelId: input.salesChannelId,
      email: input.email,
      currencyCode: input.currencyCode,
      locale: input.locale,
      metadata: input.metadata,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
    })
    if (input.items && input.items.length) {
      await repo.insertLineItems(
        id,
        input.items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtitle: i.subtitle,
          thumbnail: i.thumbnail,
          compareAtUnitPrice: i.compareAtUnitPrice,
          variantId: i.variantId,
          productId: i.productId,
          productTitle: i.productTitle,
          productHandle: i.productHandle,
          variantSku: i.variantSku,
          variantTitle: i.variantTitle,
          requiresShipping: i.requiresShipping ?? true,
          isDiscountable: i.isDiscountable ?? true,
          isGiftcard: i.isGiftcard ?? false,
          isTaxInclusive: i.isTaxInclusive ?? false,
          isCustomPrice: i.isCustomPrice ?? false,
          metadata: i.metadata,
          productDescription: null,
          productSubtitle: null,
          productType: null,
          productTypeId: null,
          productCollection: null,
          variantBarcode: null,
          variantOptionValues: null,
        }))
      )
    }
    const cart = await repo.loadFullCart(id)
    await eventBus.emit("CartCreated", id, { cart })
    return cart
  }

  const updateCart = async (raw: UpdateCartInput): Promise<Cart> => {
    const input = guardUpdateCart(raw)
    const row = await repo.fetchCartRow(input.id)
    await repo.updateCartScalars(input.id, row.version, {
      customerId: input.customerId,
      regionId: input.regionId,
      salesChannelId: input.salesChannelId,
      email: input.email,
      currencyCode: input.currencyCode,
      locale: input.locale,
      metadata: input.metadata,
      completedAt:
        input.completedAt === undefined
          ? undefined
          : input.completedAt === null
            ? null
            : new Date(input.completedAt),
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
    })
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("CartUpdated", input.id, { cart })
    return cart
  }

  const addLineItems = async (raw: AddLineItemsInput): Promise<Cart> => {
    const input = guardAddLineItems(raw)
    const row = await repo.fetchCartRow(input.id)
    const inserted = await repo.insertLineItems(
      input.id,
      input.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtitle: i.subtitle,
        thumbnail: i.thumbnail,
        compareAtUnitPrice: i.compareAtUnitPrice,
        variantId: i.variantId,
        productId: i.productId,
        productTitle: i.productTitle,
        productHandle: i.productHandle,
        variantSku: i.variantSku,
        variantTitle: i.variantTitle,
        requiresShipping: i.requiresShipping ?? true,
        isDiscountable: i.isDiscountable ?? true,
        isGiftcard: i.isGiftcard ?? false,
        isTaxInclusive: i.isTaxInclusive ?? false,
        isCustomPrice: i.isCustomPrice ?? false,
        metadata: i.metadata,
        productDescription: null,
        productSubtitle: null,
        productType: null,
        productTypeId: null,
        productCollection: null,
        variantBarcode: null,
        variantOptionValues: null,
      }))
    )
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("LineItemsAdded", input.id, {
      cart,
      addedItemIds: inserted.map((i) => i.id),
    })
    return cart
  }

  const updateLineItems = async (raw: UpdateLineItemsInput): Promise<Cart> => {
    const input = guardUpdateLineItems(raw)
    const row = await repo.fetchCartRow(input.id)
    for (const item of input.items) {
      await repo.updateLineItem(input.id, item.id, item)
    }
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("LineItemsUpdated", input.id, {
      cart,
      updatedItemIds: input.items.map((i) => i.id),
    })
    return cart
  }

  const removeLineItems = async (raw: RemoveLineItemsInput): Promise<Cart> => {
    const input = guardRemoveLineItems(raw)
    const row = await repo.fetchCartRow(input.id)
    await repo.removeLineItems(
      input.id,
      input.items.map((i) => i.id)
    )
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("LineItemsRemoved", input.id, {
      cart,
      removedItemIds: input.items.map((i) => i.id),
    })
    return cart
  }

  const addShippingMethod = async (raw: AddShippingMethodInput): Promise<Cart> => {
    const input = guardAddShippingMethod(raw)
    const row = await repo.fetchCartRow(input.id)
    const inserted = await repo.insertShippingMethods(input.id, input.shippingMethods)
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("ShippingMethodAdded", input.id, {
      cart,
      addedShippingMethodIds: inserted.map((s) => s.id),
    })
    return cart
  }

  const updateShippingMethod = async (raw: UpdateShippingMethodInput): Promise<Cart> => {
    const input = guardUpdateShippingMethod(raw)
    const row = await repo.fetchCartRow(input.id)
    for (const m of input.shippingMethods) {
      await repo.updateShippingMethod(input.id, m.id, m)
    }
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("ShippingMethodUpdated", input.id, {
      cart,
      updatedShippingMethodIds: input.shippingMethods.map((m) => m.id),
    })
    return cart
  }

  const removeShippingMethod = async (raw: RemoveShippingMethodInput): Promise<Cart> => {
    const input = guardRemoveShippingMethod(raw)
    const row = await repo.fetchCartRow(input.id)
    await repo.removeShippingMethods(
      input.id,
      input.shippingMethods.map((s) => s.id)
    )
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("ShippingMethodRemoved", input.id, {
      cart,
      removedShippingMethodIds: input.shippingMethods.map((s) => s.id),
    })
    return cart
  }

  const setLineItemAdjustments = async (
    raw: SetLineItemAdjustmentsInput
  ): Promise<Cart> => {
    const input = guardSetLineItemAdjustments(raw)
    const row = await repo.fetchCartRow(input.id)
    const itemIds = input.items.map((i) => i.id)
    await repo.verifyItemsBelongToCart(input.id, itemIds)
    for (const item of input.items) {
      await repo.replaceLineItemAdjustments(item.id, item.adjustments)
    }
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("LineItemAdjustmentsSet", input.id, { cart })
    return cart
  }

  const setShippingMethodAdjustments = async (
    raw: SetShippingMethodAdjustmentsInput
  ): Promise<Cart> => {
    const input = guardSetShippingMethodAdjustments(raw)
    const row = await repo.fetchCartRow(input.id)
    const smIds = input.shippingMethods.map((m) => m.id)
    await repo.verifyShippingMethodsBelongToCart(input.id, smIds)
    for (const m of input.shippingMethods) {
      await repo.replaceShippingMethodAdjustments(m.id, m.adjustments)
    }
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("ShippingMethodAdjustmentsSet", input.id, { cart })
    return cart
  }

  const setLineItemTaxLines = async (raw: SetLineItemTaxLinesInput): Promise<Cart> => {
    const input = guardSetLineItemTaxLines(raw)
    const row = await repo.fetchCartRow(input.id)
    const itemIds = input.items.map((i) => i.id)
    await repo.verifyItemsBelongToCart(input.id, itemIds)
    for (const item of input.items) {
      await repo.replaceLineItemTaxLines(item.id, item.taxLines)
    }
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("LineItemTaxLinesSet", input.id, { cart })
    return cart
  }

  const setShippingMethodTaxLines = async (
    raw: SetShippingMethodTaxLinesInput
  ): Promise<Cart> => {
    const input = guardSetShippingMethodTaxLines(raw)
    const row = await repo.fetchCartRow(input.id)
    const smIds = input.shippingMethods.map((m) => m.id)
    await repo.verifyShippingMethodsBelongToCart(input.id, smIds)
    for (const m of input.shippingMethods) {
      await repo.replaceShippingMethodTaxLines(m.id, m.taxLines)
    }
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("ShippingMethodTaxLinesSet", input.id, { cart })
    return cart
  }

  const manageCreditLines = async (raw: ManageCreditLinesInput): Promise<Cart> => {
    const input = guardManageCreditLines(raw)
    const row = await repo.fetchCartRow(input.id)
    for (const cl of input.creditLines) {
      if (cl._delete && cl.id) {
        await repo.removeCreditLine(input.id, cl.id)
        continue
      }
      await repo.upsertCreditLine(input.id, {
        id: cl.id,
        amount: cl.amount,
        rawAmount: cl.rawAmount,
        reference: cl.reference,
        referenceId: cl.referenceId,
        metadata: cl.metadata,
      })
    }
    await repo.bumpVersion(input.id, row.version)
    const cart = await repo.loadFullCart(input.id)
    await eventBus.emit("CreditLinesUpdated", input.id, { cart })
    return cart
  }

  const deleteCart = async (raw: DeleteCartInput): Promise<{ id: string }> => {
    await repo.fetchCartRow(raw.id)
    await repo.deleteCart(raw.id)
    await eventBus.emit("CartDeleted", raw.id, { id: raw.id })
    return { id: raw.id }
  }

  return {
    createCart,
    updateCart,
    addLineItems,
    updateLineItems,
    removeLineItems,
    addShippingMethod,
    updateShippingMethod,
    removeShippingMethod,
    setLineItemAdjustments,
    setShippingMethodAdjustments,
    setLineItemTaxLines,
    setShippingMethodTaxLines,
    manageCreditLines,
    deleteCart,
  }
}
