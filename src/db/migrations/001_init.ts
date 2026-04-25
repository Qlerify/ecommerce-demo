import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cart', (t) => {
    t.string('id').primary();
    t.string('currency_code').notNullable();
    t.string('region_id');
    t.string('customer_id');
    t.string('sales_channel_id');
    t.string('email');
    t.string('locale');
    t.text('metadata');
    t.string('completed_at');
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
    t.string('deleted_at');
  });

  await knex.schema.createTable('cart_address', (t) => {
    t.string('id').primary();
    t.string('cart_id').notNullable().references('id').inTable('cart');
    t.string('kind').notNullable();
    t.string('first_name');
    t.string('last_name');
    t.string('company');
    t.string('address_1');
    t.string('address_2');
    t.string('city');
    t.string('province');
    t.string('postal_code');
    t.string('country_code');
    t.string('phone');
    t.string('customer_id');
    t.text('metadata');
    t.string('deleted_at');
    t.unique(['cart_id', 'kind']);
  });

  await knex.schema.createTable('line_item', (t) => {
    t.string('id').primary();
    t.string('cart_id').notNullable().references('id').inTable('cart');
    t.string('title').notNullable();
    t.integer('quantity').notNullable();
    t.decimal('unit_price', 14, 4).notNullable();
    t.string('subtitle');
    t.string('thumbnail');
    t.string('variant_id');
    t.string('product_id');
    t.string('product_title');
    t.text('product_description');
    t.string('product_subtitle');
    t.string('product_type');
    t.string('product_type_id');
    t.string('product_collection');
    t.string('product_handle');
    t.string('variant_sku');
    t.string('variant_barcode');
    t.string('variant_title');
    t.text('variant_option_values');
    t.boolean('requires_shipping');
    t.boolean('is_discountable');
    t.boolean('is_giftcard');
    t.boolean('is_tax_inclusive');
    t.boolean('is_custom_price');
    t.decimal('compare_at_unit_price', 14, 4);
    t.text('metadata');
    t.string('deleted_at');
    t.check('quantity > 0');
  });

  await knex.schema.createTable('line_item_tax_line', (t) => {
    t.string('id').primary();
    t.string('line_item_id').notNullable().references('id').inTable('line_item');
    t.string('code').notNullable();
    t.decimal('rate', 10, 4).notNullable();
    t.string('description');
    t.string('provider_id');
    t.string('tax_rate_id');
    t.text('metadata');
  });

  await knex.schema.createTable('line_item_adjustment', (t) => {
    t.string('id').primary();
    t.string('line_item_id').notNullable().references('id').inTable('line_item');
    t.decimal('amount', 14, 4).notNullable();
    t.string('code');
    t.string('description');
    t.string('promotion_id');
    t.string('provider_id');
    t.boolean('is_tax_inclusive');
    t.text('metadata');
    t.check('amount >= 0');
  });

  await knex.schema.createTable('shipping_method', (t) => {
    t.string('id').primary();
    t.string('cart_id').notNullable().references('id').inTable('cart');
    t.string('name').notNullable();
    t.decimal('amount', 14, 4).notNullable();
    t.text('description');
    t.string('shipping_option_id');
    t.text('data');
    t.boolean('is_tax_inclusive');
    t.text('metadata');
    t.string('deleted_at');
    t.check('amount >= 0');
  });

  await knex.schema.createTable('shipping_method_tax_line', (t) => {
    t.string('id').primary();
    t.string('shipping_method_id').notNullable().references('id').inTable('shipping_method');
    t.string('code').notNullable();
    t.decimal('rate', 10, 4).notNullable();
    t.string('description');
    t.string('provider_id');
    t.string('tax_rate_id');
    t.text('metadata');
  });

  await knex.schema.createTable('shipping_method_adjustment', (t) => {
    t.string('id').primary();
    t.string('shipping_method_id').notNullable().references('id').inTable('shipping_method');
    t.decimal('amount', 14, 4).notNullable();
    t.string('code');
    t.string('description');
    t.string('promotion_id');
    t.string('provider_id');
    t.text('metadata');
    t.check('amount >= 0');
  });

  await knex.schema.createTable('credit_line', (t) => {
    t.string('id').primary();
    t.string('cart_id').notNullable().references('id').inTable('cart');
    t.decimal('amount', 14, 4).notNullable();
    t.string('reference');
    t.string('reference_id');
    t.text('metadata');
    t.string('deleted_at');
  });

  // External read-model fixtures (in real life these are other bounded contexts)
  await knex.schema.createTable('product_catalog', (t) => {
    t.string('id').primary();
    t.string('name');
    t.text('description');
    t.decimal('price', 14, 4);
    t.string('currency_code');
    t.string('thumbnail');
    t.boolean('in_stock');
    t.string('product_id');
    t.string('variant_id');
    t.string('product_title');
    t.string('variant_title');
    t.string('variant_sku');
    t.decimal('unit_price', 14, 4);
  });

  await knex.schema.createTable('shipping_option', (t) => {
    t.string('id').primary();
    t.string('name');
    t.decimal('amount', 14, 4);
    t.string('currency_code');
    t.string('provider_name');
    t.string('estimated_delivery');
    t.string('region_id');
  });

  await knex.schema.createTable('credit_source', (t) => {
    t.string('id').primary();
    t.string('reference');
    t.string('reference_id');
    t.decimal('amount', 14, 4);
    t.string('currency_code');
    t.string('customer_id');
    t.string('description');
  });
}

export async function down(knex: Knex): Promise<void> {
  for (const table of [
    'credit_source',
    'shipping_option',
    'product_catalog',
    'credit_line',
    'shipping_method_adjustment',
    'shipping_method_tax_line',
    'shipping_method',
    'line_item_adjustment',
    'line_item_tax_line',
    'line_item',
    'cart_address',
    'cart',
  ]) {
    await knex.schema.dropTableIfExists(table);
  }
}
