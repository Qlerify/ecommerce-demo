export type Metadata = Record<string, unknown>

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
  metadata?: Metadata | null
}

export type LineItemAdjustment = {
  id?: string
  amount: number
  code?: string | null
  description?: string | null
  promotionId?: string | null
  providerId?: string | null
  isTaxInclusive?: boolean
  metadata?: Metadata | null
}

export type LineItemTaxLine = {
  id?: string
  code: string
  rate: number
  description?: string | null
  taxRateId?: string | null
  providerId?: string | null
  metadata?: Metadata | null
}

export type ShippingMethodAdjustment = {
  id?: string
  amount: number
  code?: string | null
  description?: string | null
  promotionId?: string | null
  providerId?: string | null
  metadata?: Metadata | null
}

export type ShippingMethodTaxLine = {
  id?: string
  code: string
  rate: number
  description?: string | null
  taxRateId?: string | null
  providerId?: string | null
  metadata?: Metadata | null
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
  variantId?: string | null
  productId?: string | null
  productTitle?: string | null
  productDescription?: string | null
  productSubtitle?: string | null
  productType?: string | null
  productTypeId?: string | null
  productCollection?: string | null
  productHandle?: string | null
  variantSku?: string | null
  variantBarcode?: string | null
  variantTitle?: string | null
  variantOptionValues?: Metadata | null
  requiresShipping: boolean
  isDiscountable: boolean
  isGiftcard: boolean
  isTaxInclusive: boolean
  isCustomPrice: boolean
  metadata?: Metadata | null
  adjustments: LineItemAdjustment[]
  taxLines: LineItemTaxLine[]
}

export type ShippingMethod = {
  id: string
  cartId: string
  name: string
  description?: Metadata | null
  amount: number
  isTaxInclusive: boolean
  shippingOptionId?: string | null
  data?: Metadata | null
  metadata?: Metadata | null
  adjustments: ShippingMethodAdjustment[]
  taxLines: ShippingMethodTaxLine[]
}

export type CreditLine = {
  id: string
  cartId: string
  amount: number
  rawAmount: Metadata
  reference?: string | null
  referenceId?: string | null
  metadata?: Metadata | null
}

export type Cart = {
  id: string
  customerId?: string | null
  regionId?: string | null
  salesChannelId?: string | null
  email?: string | null
  currencyCode: string
  locale?: string | null
  metadata?: Metadata | null
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

export type CartWithTotals = Cart & {
  totals: CartTotals
  items: (LineItem & {
    itemSubtotal: number
    itemDiscountTotal: number
    itemTaxTotal: number
    itemTotal: number
  })[]
  shippingMethods: (ShippingMethod & {
    subtotal: number
    discountTotal: number
    taxTotal: number
    total: number
  })[]
}

export type CreateCartInput = {
  customerId?: string | null
  regionId?: string | null
  salesChannelId?: string | null
  email?: string | null
  currencyCode: string
  locale?: string | null
  metadata?: Metadata | null
  shippingAddress?: Address | null
  billingAddress?: Address | null
  items?: Array<{
    title: string
    quantity: number
    unitPrice: number
    subtitle?: string | null
    thumbnail?: string | null
    compareAtUnitPrice?: number | null
    variantId?: string | null
    productId?: string | null
    productTitle?: string | null
    productHandle?: string | null
    variantSku?: string | null
    variantTitle?: string | null
    requiresShipping?: boolean
    isDiscountable?: boolean
    isGiftcard?: boolean
    isTaxInclusive?: boolean
    isCustomPrice?: boolean
    metadata?: Metadata | null
  }>
}

export type AddLineItemsInput = {
  id: string
  items: Array<{
    title: string
    quantity: number
    unitPrice: number
    subtitle?: string | null
    thumbnail?: string | null
    compareAtUnitPrice?: number | null
    variantId?: string | null
    productId?: string | null
    productTitle?: string | null
    productHandle?: string | null
    variantSku?: string | null
    variantTitle?: string | null
    requiresShipping?: boolean
    isDiscountable?: boolean
    isGiftcard?: boolean
    isTaxInclusive?: boolean
    isCustomPrice?: boolean
    metadata?: Metadata | null
  }>
}

export type UpdateLineItemsInput = {
  id: string
  items: Array<{
    id: string
    title?: string
    subtitle?: string | null
    thumbnail?: string | null
    quantity?: number
    unitPrice?: number
    compareAtUnitPrice?: number | null
    isDiscountable?: boolean
    isTaxInclusive?: boolean
    isCustomPrice?: boolean
    metadata?: Metadata | null
  }>
}

export type RemoveLineItemsInput = {
  id: string
  items: Array<{ id: string }>
}

export type UpdateCartInput = {
  id: string
  customerId?: string | null
  regionId?: string | null
  salesChannelId?: string | null
  email?: string | null
  currencyCode?: string
  locale?: string | null
  completedAt?: string | null
  metadata?: Metadata | null
  shippingAddress?: Address | null
  billingAddress?: Address | null
}

export type AddShippingMethodInput = {
  id: string
  shippingMethods: Array<{
    name: string
    amount: number
    description?: Metadata | null
    isTaxInclusive?: boolean
    shippingOptionId?: string | null
    data?: Metadata | null
    metadata?: Metadata | null
  }>
}

export type UpdateShippingMethodInput = {
  id: string
  shippingMethods: Array<{
    id: string
    name?: string
    amount?: number
    description?: Metadata | null
    isTaxInclusive?: boolean
    data?: Metadata | null
    metadata?: Metadata | null
  }>
}

export type RemoveShippingMethodInput = {
  id: string
  shippingMethods: Array<{ id: string }>
}

export type SetLineItemAdjustmentsInput = {
  id: string
  items: Array<{
    id: string
    adjustments: Array<{
      id?: string
      amount: number
      code?: string | null
      description?: string | null
      promotionId?: string | null
      providerId?: string | null
      isTaxInclusive?: boolean
      metadata?: Metadata | null
    }>
  }>
}

export type SetShippingMethodAdjustmentsInput = {
  id: string
  shippingMethods: Array<{
    id: string
    adjustments: Array<{
      id?: string
      amount: number
      code?: string | null
      description?: string | null
      promotionId?: string | null
      providerId?: string | null
      metadata?: Metadata | null
    }>
  }>
}

export type SetLineItemTaxLinesInput = {
  id: string
  items: Array<{
    id: string
    taxLines: Array<{
      id?: string
      code: string
      rate: number
      description?: string | null
      taxRateId?: string | null
      providerId?: string | null
      metadata?: Metadata | null
    }>
  }>
}

export type SetShippingMethodTaxLinesInput = {
  id: string
  shippingMethods: Array<{
    id: string
    taxLines: Array<{
      id?: string
      code: string
      rate: number
      description?: string | null
      taxRateId?: string | null
      providerId?: string | null
      metadata?: Metadata | null
    }>
  }>
}

export type ManageCreditLinesInput = {
  id: string
  creditLines: Array<{
    id?: string
    amount: number
    rawAmount: Metadata
    reference?: string | null
    referenceId?: string | null
    metadata?: Metadata | null
    _delete?: boolean
  }>
}

export type DeleteCartInput = {
  id: string
}
