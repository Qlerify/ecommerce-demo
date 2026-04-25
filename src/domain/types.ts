export interface AddressInput {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
  phone?: string;
  customerId?: string;
  metadata?: unknown;
}

export interface LineItemInput {
  id?: string;
  title?: string;
  quantity?: number;
  unitPrice?: number;
  subtitle?: string;
  thumbnail?: string;
  variantId?: string;
  productId?: string;
  productTitle?: string;
  productDescription?: string;
  productSubtitle?: string;
  productType?: string;
  productTypeId?: string;
  productCollection?: string;
  productHandle?: string;
  variantSku?: string;
  variantBarcode?: string;
  variantTitle?: string;
  variantOptionValues?: unknown;
  requiresShipping?: boolean;
  isDiscountable?: boolean;
  isGiftcard?: boolean;
  isTaxInclusive?: boolean;
  isCustomPrice?: boolean;
  compareAtUnitPrice?: number;
  metadata?: unknown;
}

export interface TaxLineInput {
  id?: string;
  code: string;
  rate: number;
  description?: string;
  providerId?: string;
  taxRateId?: string;
  metadata?: unknown;
}

export interface AdjustmentInput {
  id?: string;
  amount: number;
  code?: string;
  description?: string;
  promotionId?: string;
  providerId?: string;
  isTaxInclusive?: boolean;
  metadata?: unknown;
}

export interface ShippingMethodInput {
  id?: string;
  name?: string;
  amount?: number;
  description?: unknown;
  shippingOptionId?: string;
  data?: unknown;
  isTaxInclusive?: boolean;
  metadata?: unknown;
}

export interface CreditLineInput {
  id?: string;
  amount?: number;
  reference?: string;
  referenceId?: string;
  metadata?: unknown;
}
