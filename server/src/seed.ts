import { createDb, migrate, resetDb } from "./db/connection.js"
import { makeCartRepository } from "./cart/cart/repository.js"
import { makeCommandService } from "./cart/cart/commands.js"
import { products, shippingOptions } from "./catalog.js"

const main = async () => {
  const db = createDb()
  await migrate(db)
  await resetDb(db)
  const repo = makeCartRepository(db)
  const commands = makeCommandService(repo)

  const cart1 = await commands.createCart({
    email: "alice@example.com",
    customerId: "cust_alice",
    currencyCode: "USD",
    locale: "en-US",
    salesChannelId: "sc_storefront",
    shippingAddress: {
      firstName: "Alice",
      lastName: "Brennan",
      address1: "1142 Cedar Lane",
      city: "Portland",
      countryCode: "US",
      province: "OR",
      postalCode: "97214",
      phone: "+1 503 555 0142",
    },
    billingAddress: {
      firstName: "Alice",
      lastName: "Brennan",
      address1: "1142 Cedar Lane",
      city: "Portland",
      countryCode: "US",
      province: "OR",
      postalCode: "97214",
    },
    items: [
      {
        title: products[0].title,
        subtitle: products[0].subtitle,
        thumbnail: products[0].thumbnail,
        quantity: 1,
        unitPrice: products[0].variants[1].price,
        compareAtUnitPrice: products[0].variants[1].compareAtPrice ?? null,
        productId: products[0].id,
        variantId: products[0].variants[1].id,
        productTitle: products[0].title,
        productHandle: products[0].handle,
        variantSku: products[0].variants[1].sku,
        variantTitle: products[0].variants[1].title,
      },
      {
        title: products[4].title,
        subtitle: products[4].subtitle,
        thumbnail: products[4].thumbnail,
        quantity: 2,
        unitPrice: products[4].variants[0].price,
        productId: products[4].id,
        variantId: products[4].variants[0].id,
        productTitle: products[4].title,
        productHandle: products[4].handle,
        variantSku: products[4].variants[0].sku,
        variantTitle: products[4].variants[0].title,
      },
    ],
  })

  await commands.addShippingMethod({
    id: cart1.id,
    shippingMethods: [
      {
        name: shippingOptions[0].name,
        amount: shippingOptions[0].amount,
        shippingOptionId: shippingOptions[0].id,
      },
    ],
  })

  const cart2 = await commands.createCart({
    email: "marcus@example.com",
    customerId: "cust_marcus",
    currencyCode: "EUR",
    locale: "de-DE",
    salesChannelId: "sc_storefront",
    shippingAddress: {
      firstName: "Marcus",
      lastName: "Weber",
      address1: "Kastanienallee 23",
      city: "Berlin",
      countryCode: "DE",
      postalCode: "10435",
    },
    items: [
      {
        title: products[1].title,
        subtitle: products[1].subtitle,
        thumbnail: products[1].thumbnail,
        quantity: 1,
        unitPrice: 149,
        compareAtUnitPrice: 179,
        productId: products[1].id,
        variantId: products[1].variants[0].id,
        productTitle: products[1].title,
        productHandle: products[1].handle,
        variantSku: products[1].variants[0].sku,
        variantTitle: products[1].variants[0].title,
      },
    ],
  })

  await commands.addShippingMethod({
    id: cart2.id,
    shippingMethods: [
      {
        name: shippingOptions[1].name,
        amount: 22,
        shippingOptionId: shippingOptions[1].id,
      },
    ],
  })

  await commands.createCart({
    email: "linnea@example.com",
    customerId: "cust_linnea",
    currencyCode: "SEK",
    locale: "sv-SE",
    salesChannelId: "sc_storefront",
    items: [],
  })

  console.log("seeded carts:")
  console.log("  ", cart1.id, "(Alice / Portland)")
  console.log("  ", cart2.id, "(Marcus / Berlin)")
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  }
)
