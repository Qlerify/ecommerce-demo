import { DomainError } from "./errors.js"
import type {
  AddLineItemsInput,
  AddShippingMethodInput,
  CreateCartInput,
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

const required = (value: unknown, label: string): void => {
  if (value === undefined || value === null || value === "") {
    throw new DomainError("INVALID_DATA", `Value for ${label} is required`)
  }
}

const nonNegative = (value: number | undefined, label: string): void => {
  if (value === undefined) return
  if (Number.isNaN(value)) {
    throw new DomainError("INVALID_DATA", `Value for ${label} must be a number`)
  }
  if (value < 0) {
    throw new DomainError("INVALID_DATA", `Value for ${label} must be >= 0`)
  }
}

const positiveInt = (value: number | undefined, label: string): void => {
  if (value === undefined) return
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError("INVALID_DATA", `Value for ${label} must be a positive integer`)
  }
}

export const guardCreateCart = (input: CreateCartInput): CreateCartInput => {
  required(input.currencyCode, "Cart.currency_code")
  const normalized: CreateCartInput = {
    ...input,
    currencyCode: input.currencyCode.toLowerCase(),
  }
  for (const [i, item] of (normalized.items ?? []).entries()) {
    required(item.title, `LineItem.title`)
    required(item.quantity, `LineItem.quantity`)
    required(item.unitPrice, `LineItem.unit_price`)
    positiveInt(item.quantity, `items[${i}].quantity`)
    nonNegative(item.unitPrice, `items[${i}].unit_price`)
  }
  return normalized
}

export const guardUpdateCart = (input: UpdateCartInput): UpdateCartInput => {
  required(input.id, "Cart.id")
  if (input.currencyCode !== undefined) {
    return { ...input, currencyCode: input.currencyCode.toLowerCase() }
  }
  return input
}

export const guardAddLineItems = (input: AddLineItemsInput): AddLineItemsInput => {
  required(input.id, "Cart.id")
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new DomainError("INVALID_DATA", "Value for items is required")
  }
  for (const [i, item] of input.items.entries()) {
    required(item.title, `LineItem.title`)
    required(item.quantity, `LineItem.quantity`)
    required(item.unitPrice, `LineItem.unit_price`)
    positiveInt(item.quantity, `items[${i}].quantity`)
    nonNegative(item.unitPrice, `items[${i}].unit_price`)
  }
  return input
}

export const guardUpdateLineItems = (input: UpdateLineItemsInput): UpdateLineItemsInput => {
  required(input.id, "Cart.id")
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new DomainError("INVALID_DATA", "Value for items is required")
  }
  for (const [i, item] of input.items.entries()) {
    required(item.id, `items[${i}].id`)
    if (item.quantity !== undefined) positiveInt(item.quantity, `items[${i}].quantity`)
    if (item.unitPrice !== undefined) nonNegative(item.unitPrice, `items[${i}].unit_price`)
  }
  return input
}

export const guardRemoveLineItems = (input: RemoveLineItemsInput): RemoveLineItemsInput => {
  required(input.id, "Cart.id")
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new DomainError("INVALID_DATA", "Value for items is required")
  }
  for (const [i, item] of input.items.entries()) {
    required(item.id, `items[${i}].id`)
  }
  return input
}

export const guardAddShippingMethod = (
  input: AddShippingMethodInput
): AddShippingMethodInput => {
  required(input.id, "Cart.id")
  if (!Array.isArray(input.shippingMethods) || input.shippingMethods.length === 0) {
    throw new DomainError("INVALID_DATA", "Value for shippingMethods is required")
  }
  for (const [i, m] of input.shippingMethods.entries()) {
    required(m.name, `ShippingMethod.name`)
    required(m.amount, `ShippingMethod.amount`)
    nonNegative(m.amount, `shippingMethods[${i}].amount`)
  }
  return input
}

export const guardUpdateShippingMethod = (
  input: UpdateShippingMethodInput
): UpdateShippingMethodInput => {
  required(input.id, "Cart.id")
  if (!Array.isArray(input.shippingMethods) || input.shippingMethods.length === 0) {
    throw new DomainError("INVALID_DATA", "Value for shippingMethods is required")
  }
  for (const [i, m] of input.shippingMethods.entries()) {
    required(m.id, `shippingMethods[${i}].id`)
    if (m.amount !== undefined) nonNegative(m.amount, `shippingMethods[${i}].amount`)
  }
  return input
}

export const guardRemoveShippingMethod = (
  input: RemoveShippingMethodInput
): RemoveShippingMethodInput => {
  required(input.id, "Cart.id")
  if (!Array.isArray(input.shippingMethods) || input.shippingMethods.length === 0) {
    throw new DomainError("INVALID_DATA", "Value for shippingMethods is required")
  }
  for (const [i, m] of input.shippingMethods.entries()) {
    required(m.id, `shippingMethods[${i}].id`)
  }
  return input
}

export const guardSetLineItemAdjustments = (
  input: SetLineItemAdjustmentsInput
): SetLineItemAdjustmentsInput => {
  required(input.id, "Cart.id")
  for (const item of input.items ?? []) {
    required(item.id, "items[].id")
    for (const [i, adj] of (item.adjustments ?? []).entries()) {
      required(adj.amount, `LineItemAdjustment.amount`)
      nonNegative(adj.amount, `items.adjustments[${i}].amount`)
    }
  }
  return input
}

export const guardSetShippingMethodAdjustments = (
  input: SetShippingMethodAdjustmentsInput
): SetShippingMethodAdjustmentsInput => {
  required(input.id, "Cart.id")
  for (const m of input.shippingMethods ?? []) {
    required(m.id, "shippingMethods[].id")
    for (const [i, adj] of (m.adjustments ?? []).entries()) {
      required(adj.amount, `ShippingMethodAdjustment.amount`)
      nonNegative(adj.amount, `shippingMethods.adjustments[${i}].amount`)
    }
  }
  return input
}

export const guardSetLineItemTaxLines = (
  input: SetLineItemTaxLinesInput
): SetLineItemTaxLinesInput => {
  required(input.id, "Cart.id")
  for (const item of input.items ?? []) {
    required(item.id, "items[].id")
    for (const [i, tl] of (item.taxLines ?? []).entries()) {
      required(tl.code, `LineItemTaxLine.code`)
      required(tl.rate, `LineItemTaxLine.rate`)
      if (Number.isNaN(tl.rate)) {
        throw new DomainError(
          "INVALID_DATA",
          `Value for items.taxLines[${i}].rate must be a number`
        )
      }
    }
  }
  return input
}

export const guardSetShippingMethodTaxLines = (
  input: SetShippingMethodTaxLinesInput
): SetShippingMethodTaxLinesInput => {
  required(input.id, "Cart.id")
  for (const m of input.shippingMethods ?? []) {
    required(m.id, "shippingMethods[].id")
    for (const [i, tl] of (m.taxLines ?? []).entries()) {
      required(tl.code, `ShippingMethodTaxLine.code`)
      required(tl.rate, `ShippingMethodTaxLine.rate`)
      if (Number.isNaN(tl.rate)) {
        throw new DomainError(
          "INVALID_DATA",
          `Value for shippingMethods.taxLines[${i}].rate must be a number`
        )
      }
    }
  }
  return input
}

export const guardManageCreditLines = (
  input: ManageCreditLinesInput
): ManageCreditLinesInput => {
  required(input.id, "Cart.id")
  if (!Array.isArray(input.creditLines)) {
    throw new DomainError("INVALID_DATA", "Value for creditLines is required")
  }
  for (const [i, cl] of input.creditLines.entries()) {
    if (cl._delete) {
      required(cl.id, `creditLines[${i}].id`)
      continue
    }
    if (cl.id) continue
    required(cl.amount, `CreditLine.amount`)
    required(cl.rawAmount, `CreditLine.raw_amount`)
  }
  return input
}
