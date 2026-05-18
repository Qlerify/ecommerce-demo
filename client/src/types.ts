export type Address = {
  customerId?: string | null
  company?: string | null
  firstName?: string | null
  lastName?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  countryCode?: string | null
  province?: string | null
  postalCode?: string | null
  phone?: string | null
  metadata?: Record<string, unknown> | null
}

export type LineItemAdjustment = {
  id: string
  amount: number
  code?: string | null
  description?: string | null
}

export type LineItemTaxLine = {
  id: string
  code: string
  rate: number
}

export type LineItem = {
  id: string
  cartId: string
  title: string
  subtitle?: string | null
  thumbnail?: string | null
  quantity: number
  unitPrice: number
  compareAtUnitPrice?: number | null
  productId?: string | null
  variantId?: string | null
  productTitle?: string | null
  productHandle?: string | null
  variantTitle?: string | null
  variantSku?: string | null
  adjustments: LineItemAdjustment[]
  taxLines: LineItemTaxLine[]
  itemSubtotal?: number
  itemDiscountTotal?: number
  itemTaxTotal?: number
  itemTotal?: number
}

export type ShippingMethod = {
  id: string
  cartId: string
  name: string
  amount: number
  shippingOptionId?: string | null
  adjustments: { id: string; amount: number; code?: string | null }[]
  taxLines: { id: string; code: string; rate: number }[]
  subtotal?: number
  discountTotal?: number
  taxTotal?: number
  total?: number
}

export type CreditLine = {
  id: string
  cartId: string
  amount: number
  reference?: string | null
  referenceId?: string | null
}

export type Cart = {
  id: string
  customerId?: string | null
  email?: string | null
  currencyCode: string
  locale?: string | null
  completedAt?: string | null
  shippingAddress?: Address | null
  billingAddress?: Address | null
  items: LineItem[]
  shippingMethods: ShippingMethod[]
  creditLines: CreditLine[]
  version: number
  createdAt: string
  updatedAt: string
}

export type CartTotals = {
  itemSubtotal: number
  itemDiscountTotal: number
  itemTaxTotal: number
  itemTotal: number
  shippingSubtotal: number
  shippingDiscountTotal: number
  shippingTaxTotal: number
  shippingTotal: number
  creditLineTotal: number
  giftCardTotal: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
}

export type CartWithTotals = Cart & { totals: CartTotals }

export type DomainEvent = {
  name: string
  cartId: string
  occurredAt: string
  payload: unknown
}
