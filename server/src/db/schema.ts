import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const carts = pgTable("carts", {
  id: text("id").primaryKey(),
  customerId: text("customer_id"),
  regionId: text("region_id"),
  salesChannelId: text("sales_channel_id"),
  email: text("email"),
  currencyCode: text("currency_code").notNull(),
  locale: text("locale"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),

  shippingCustomerId: text("shipping_customer_id"),
  shippingCompany: text("shipping_company"),
  shippingFirstName: text("shipping_first_name"),
  shippingLastName: text("shipping_last_name"),
  shippingAddress1: text("shipping_address1"),
  shippingAddress2: text("shipping_address2"),
  shippingCity: text("shipping_city"),
  shippingCountryCode: text("shipping_country_code"),
  shippingProvince: text("shipping_province"),
  shippingPostalCode: text("shipping_postal_code"),
  shippingPhone: text("shipping_phone"),
  shippingMetadata: jsonb("shipping_metadata").$type<Record<string, unknown>>(),
  shippingAddressPresent: boolean("shipping_address_present").notNull().default(false),

  billingCustomerId: text("billing_customer_id"),
  billingCompany: text("billing_company"),
  billingFirstName: text("billing_first_name"),
  billingLastName: text("billing_last_name"),
  billingAddress1: text("billing_address1"),
  billingAddress2: text("billing_address2"),
  billingCity: text("billing_city"),
  billingCountryCode: text("billing_country_code"),
  billingProvince: text("billing_province"),
  billingPostalCode: text("billing_postal_code"),
  billingPhone: text("billing_phone"),
  billingMetadata: jsonb("billing_metadata").$type<Record<string, unknown>>(),
  billingAddressPresent: boolean("billing_address_present").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const cartLineItems = pgTable(
  "cart_line_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    thumbnail: text("thumbnail"),
    quantity: integer("quantity").notNull(),
    unitPrice: doublePrecision("unit_price").notNull(),
    compareAtUnitPrice: doublePrecision("compare_at_unit_price"),
    variantId: text("variant_id"),
    productId: text("product_id"),
    productTitle: text("product_title"),
    productDescription: text("product_description"),
    productSubtitle: text("product_subtitle"),
    productType: text("product_type"),
    productTypeId: text("product_type_id"),
    productCollection: text("product_collection"),
    productHandle: text("product_handle"),
    variantSku: text("variant_sku"),
    variantBarcode: text("variant_barcode"),
    variantTitle: text("variant_title"),
    variantOptionValues: jsonb("variant_option_values").$type<Record<string, unknown>>(),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    isDiscountable: boolean("is_discountable").notNull().default(true),
    isGiftcard: boolean("is_giftcard").notNull().default(false),
    isTaxInclusive: boolean("is_tax_inclusive").notNull().default(false),
    isCustomPrice: boolean("is_custom_price").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quantityCheck: check("line_item_quantity_positive", sql`${table.quantity} > 0`),
    unitPriceCheck: check("line_item_unit_price_nonneg", sql`${table.unitPrice} >= 0`),
  })
)

export const cartShippingMethods = pgTable(
  "cart_shipping_methods",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: jsonb("description").$type<Record<string, unknown>>(),
    amount: doublePrecision("amount").notNull(),
    isTaxInclusive: boolean("is_tax_inclusive").notNull().default(false),
    shippingOptionId: text("shipping_option_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    amountCheck: check("shipping_method_amount_nonneg", sql`${table.amount} >= 0`),
  })
)

export const cartCreditLines = pgTable("cart_credit_lines", {
  id: text("id").primaryKey(),
  cartId: text("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  rawAmount: jsonb("raw_amount").$type<Record<string, unknown>>().notNull(),
  reference: text("reference"),
  referenceId: text("reference_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const lineItemAdjustments = pgTable(
  "line_item_adjustments",
  {
    id: text("id").primaryKey(),
    lineItemId: text("line_item_id")
      .notNull()
      .references(() => cartLineItems.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount").notNull(),
    code: text("code"),
    description: text("description"),
    promotionId: text("promotion_id"),
    providerId: text("provider_id"),
    isTaxInclusive: boolean("is_tax_inclusive").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => ({
    amountCheck: check("line_item_adj_amount_nonneg", sql`${table.amount} >= 0`),
  })
)

export const lineItemTaxLines = pgTable("line_item_tax_lines", {
  id: text("id").primaryKey(),
  lineItemId: text("line_item_id")
    .notNull()
    .references(() => cartLineItems.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  rate: doublePrecision("rate").notNull(),
  description: text("description"),
  taxRateId: text("tax_rate_id"),
  providerId: text("provider_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
})

export const shippingMethodAdjustments = pgTable(
  "shipping_method_adjustments",
  {
    id: text("id").primaryKey(),
    shippingMethodId: text("shipping_method_id")
      .notNull()
      .references(() => cartShippingMethods.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount").notNull(),
    code: text("code"),
    description: text("description"),
    promotionId: text("promotion_id"),
    providerId: text("provider_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => ({
    amountCheck: check("shipping_method_adj_amount_nonneg", sql`${table.amount} >= 0`),
  })
)

export const shippingMethodTaxLines = pgTable("shipping_method_tax_lines", {
  id: text("id").primaryKey(),
  shippingMethodId: text("shipping_method_id")
    .notNull()
    .references(() => cartShippingMethods.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  rate: doublePrecision("rate").notNull(),
  description: text("description"),
  taxRateId: text("tax_rate_id"),
  providerId: text("provider_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
})
