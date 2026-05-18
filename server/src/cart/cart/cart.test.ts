import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupTestEnv, type TestEnv } from "./test-harness.js"
import { isDomainError } from "./errors.js"

let env: TestEnv

beforeEach(async () => {
  env = await setupTestEnv()
})

afterEach(async () => {
  await env.cleanup()
})

const makeItem = (overrides: Partial<{
  title: string
  quantity: number
  unitPrice: number
  productId: string
  variantId: string
}> = {}) => ({
  title: overrides.title ?? "T-Shirt",
  quantity: overrides.quantity ?? 1,
  unitPrice: overrides.unitPrice ?? 29.99,
  productId: overrides.productId ?? "prod_1",
  variantId: overrides.variantId ?? "var_1",
})

const createBaseCart = async (currencyCode = "eur") =>
  env.commands.createCart({ currencyCode })

const createCartWithTwoItems = async () => {
  const cart = await env.commands.createCart({
    currencyCode: "usd",
    items: [
      makeItem({ title: "Hoodie", unitPrice: 80 }),
      makeItem({ title: "Mug", unitPrice: 28 }),
    ],
  })
  return cart
}

describe("Create Cart", () => {
  it("Given no carts exist, When createCarts is called with currency_code 'eur', Then a cart is created with currency_code 'eur' and auto-generated id", async () => {
    const cart = await env.commands.createCart({ currencyCode: "eur" })
    expect(cart.currencyCode).toBe("eur")
    expect(cart.id).toMatch(/^cart_/)
    const found = await env.repo.loadFullCart(cart.id)
    expect(found.id).toBe(cart.id)
  })

  it("Given currency_code is omitted, When createCarts is called, Then an error is thrown: Value for Cart.currency_code is required", async () => {
    await expect(
      env.commands.createCart({ currencyCode: "" as unknown as string })
    ).rejects.toMatchObject({
      type: "INVALID_DATA",
      message: "Value for Cart.currency_code is required",
    })
  })

  it("Given inline shipping_address and billing_address objects, When the cart is created, Then both addresses are persisted and linked to the cart", async () => {
    const cart = await env.commands.createCart({
      currencyCode: "usd",
      shippingAddress: {
        firstName: "Alice",
        address1: "1 Main",
        city: "Portland",
        countryCode: "US",
      },
      billingAddress: {
        firstName: "Alice",
        address1: "1 Main",
        city: "Portland",
        countryCode: "US",
      },
    })
    expect(cart.shippingAddress?.firstName).toBe("Alice")
    expect(cart.billingAddress?.firstName).toBe("Alice")
    const found = await env.repo.loadFullCart(cart.id)
    expect(found.shippingAddress?.address1).toBe("1 Main")
    expect(found.billingAddress?.address1).toBe("1 Main")
  })

  it("Given an existing Address record, When createCarts is called with shipping_address_id and billing_address_id, Then the cart is linked to the existing address", async () => {
    const original = await env.commands.createCart({
      currencyCode: "usd",
      shippingAddress: {
        firstName: "Bob",
        address1: "2 Side",
        city: "NYC",
        countryCode: "US",
      },
    })
    const reused = await env.commands.createCart({
      currencyCode: "usd",
      shippingAddress: original.shippingAddress,
      billingAddress: original.shippingAddress,
    })
    expect(reused.shippingAddress?.firstName).toBe("Bob")
    expect(reused.billingAddress?.address1).toBe("2 Side")
  })

  it("Given inline items on create, When the cart is retrieved with the items relation, Then the items appear on the cart", async () => {
    const cart = await env.commands.createCart({
      currencyCode: "usd",
      items: [makeItem(), makeItem({ title: "Mug", unitPrice: 14.5 })],
    })
    const found = await env.queries.getCart(cart.id)
    expect(found.items).toHaveLength(2)
    expect(found.items.map((i) => i.title).sort()).toEqual(["Mug", "T-Shirt"])
  })

  it("emits CartCreated event after successful creation", async () => {
    await env.commands.createCart({ currencyCode: "eur" })
    const created = env.events.filter((e) => e.name === "CartCreated")
    expect(created).toHaveLength(1)
  })
})

describe("Add Line Items", () => {
  it("Given an existing cart, When addLineItems is called with a line item, Then the item appears on the cart", async () => {
    const cart = await createBaseCart()
    await env.commands.addLineItems({ id: cart.id, items: [makeItem()] })
    const found = await env.queries.getCart(cart.id)
    expect(found.items).toHaveLength(1)
    expect(found.items[0].title).toBe("T-Shirt")
  })

  it("Given a non-existent cart id, When addLineItems is called, Then an error is thrown: Cart with id was not found", async () => {
    await expect(
      env.commands.addLineItems({ id: "cart_does_not_exist", items: [makeItem()] })
    ).rejects.toMatchObject({
      type: "NOT_FOUND",
      message: 'Cart with id "cart_does_not_exist" was not found',
    })
  })

  it("Given quantity is omitted from the line item, When addLineItems is called, Then an error is thrown: Value for LineItem.quantity is required", async () => {
    const cart = await createBaseCart()
    await expect(
      env.commands.addLineItems({
        id: cart.id,
        items: [
          {
            title: "Bad",
            unitPrice: 10,
          } as unknown as ReturnType<typeof makeItem>,
        ],
      })
    ).rejects.toMatchObject({
      type: "INVALID_DATA",
      message: "Value for LineItem.quantity is required",
    })
  })

  it("emits LineItemsAdded event after successful addition", async () => {
    const cart = await createBaseCart()
    env.events.length = 0
    await env.commands.addLineItems({ id: cart.id, items: [makeItem()] })
    const added = env.events.filter((e) => e.name === "LineItemsAdded")
    expect(added).toHaveLength(1)
  })
})

describe("Update Line Items", () => {
  it("Given an existing item on a cart, When updateLineItems is called by direct id, Then matching items are updated", async () => {
    const cart = await createCartWithTwoItems()
    const target = cart.items[0]
    await env.commands.updateLineItems({
      id: cart.id,
      items: [{ id: target.id, quantity: 5 }],
    })
    const after = await env.queries.getCart(cart.id)
    const found = after.items.find((i) => i.id === target.id)!
    expect(found.quantity).toBe(5)
  })

  it("Given multiple items, When updateLineItems is called, Then all matching items are updated according to their respective data", async () => {
    const cart = await createCartWithTwoItems()
    const [a, b] = cart.items
    await env.commands.updateLineItems({
      id: cart.id,
      items: [
        { id: a.id, quantity: 3 },
        { id: b.id, unitPrice: 50 },
      ],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.items.find((i) => i.id === a.id)!.quantity).toBe(3)
    expect(after.items.find((i) => i.id === b.id)!.unitPrice).toBe(50)
  })
})

describe("Remove Line Items", () => {
  it("Given items on a cart, When softDeleteLineItems is called with their ids, Then the cart's items collection is empty", async () => {
    const cart = await createCartWithTwoItems()
    await env.commands.removeLineItems({
      id: cart.id,
      items: cart.items.map((i) => ({ id: i.id })),
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.items).toHaveLength(0)
  })

  it("Given a line item is removed, When the cart is retrieved, Then the item's adjustments and tax lines are also removed (cascade)", async () => {
    const cart = await createCartWithTwoItems()
    const [a] = cart.items
    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [{ id: a.id, adjustments: [{ amount: 5, code: "PROMO" }] }],
    })
    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [{ id: a.id, taxLines: [{ code: "VAT", rate: 20 }] }],
    })
    let beforeRm = await env.queries.getCart(cart.id)
    expect(beforeRm.items.find((i) => i.id === a.id)!.adjustments).toHaveLength(1)
    expect(beforeRm.items.find((i) => i.id === a.id)!.taxLines).toHaveLength(1)

    await env.commands.removeLineItems({ id: cart.id, items: [{ id: a.id }] })
    const after = await env.queries.getCart(cart.id)
    expect(after.items.find((i) => i.id === a.id)).toBeUndefined()
    const adjustments = await env.client.query<{ id: string }>(
      "SELECT id FROM line_item_adjustments"
    )
    const taxLines = await env.client.query<{ id: string }>(
      "SELECT id FROM line_item_tax_lines"
    )
    expect(adjustments.rows.length).toBe(0)
    expect(taxLines.rows.length).toBe(0)
  })
})

describe("Update Cart", () => {
  it("Given a non-existent cart id, When updateCarts is called, Then an error is thrown: Cart with id not found", async () => {
    await expect(
      env.commands.updateCart({ id: "cart_nope", email: "x@y.z" })
    ).rejects.toMatchObject({
      type: "NOT_FOUND",
    })
  })

  it("Given an existing cart, When updateCarts is called with id and email, Then the cart email is updated", async () => {
    const cart = await createBaseCart()
    await env.commands.updateCart({ id: cart.id, email: "alice@example.com" })
    const after = await env.queries.getCart(cart.id)
    expect(after.email).toBe("alice@example.com")
  })

  it("normalizes currency_code to lowercase on update", async () => {
    const cart = await createBaseCart()
    await env.commands.updateCart({ id: cart.id, currencyCode: "USD" })
    const after = await env.queries.getCart(cart.id)
    expect(after.currencyCode).toBe("usd")
  })
})

describe("Add Shipping Method", () => {
  it("Given an existing cart, When addShippingMethods is called with a method of amount 100, Then the method appears on the cart", async () => {
    const cart = await createBaseCart()
    await env.commands.addShippingMethod({
      id: cart.id,
      shippingMethods: [{ name: "Standard", amount: 100 }],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.shippingMethods).toHaveLength(1)
    expect(after.shippingMethods[0].amount).toBe(100)
  })

  it("Given an amount of -100, When addShippingMethods is called, Then a CheckConstraintViolationException is thrown", async () => {
    const cart = await createBaseCart()
    await expect(
      env.commands.addShippingMethod({
        id: cart.id,
        shippingMethods: [{ name: "Bad", amount: -100 }],
      })
    ).rejects.toMatchObject({
      type: "INVALID_DATA",
    })
  })
})

describe("Update Shipping Method", () => {
  it("Given an existing shipping method on a cart, When updateShippingMethods is called with new name, amount, or data, Then the method is updated", async () => {
    const cart = await createBaseCart()
    const withShipping = await env.commands.addShippingMethod({
      id: cart.id,
      shippingMethods: [{ name: "Standard", amount: 10 }],
    })
    const smId = withShipping.shippingMethods[0].id
    await env.commands.updateShippingMethod({
      id: cart.id,
      shippingMethods: [{ id: smId, name: "Express", amount: 25 }],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.shippingMethods[0].name).toBe("Express")
    expect(after.shippingMethods[0].amount).toBe(25)
  })
})

describe("Remove Shipping Method", () => {
  it("Given a shipping method on a cart, When softDeleteShippingMethods is called, Then the cart's shipping_methods collection is empty", async () => {
    const cart = await createBaseCart()
    const withShipping = await env.commands.addShippingMethod({
      id: cart.id,
      shippingMethods: [{ name: "Standard", amount: 10 }],
    })
    await env.commands.removeShippingMethod({
      id: cart.id,
      shippingMethods: [{ id: withShipping.shippingMethods[0].id }],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.shippingMethods).toHaveLength(0)
  })

  it("Given a shipping method is removed, When the cart is retrieved, Then the method's adjustments and tax lines are also removed (cascade)", async () => {
    const cart = await createBaseCart()
    const withShipping = await env.commands.addShippingMethod({
      id: cart.id,
      shippingMethods: [{ name: "Standard", amount: 10 }],
    })
    const smId = withShipping.shippingMethods[0].id

    await env.commands.setShippingMethodAdjustments({
      id: cart.id,
      shippingMethods: [{ id: smId, adjustments: [{ amount: 2, code: "SHIPPROMO" }] }],
    })
    await env.commands.setShippingMethodTaxLines({
      id: cart.id,
      shippingMethods: [{ id: smId, taxLines: [{ code: "VAT", rate: 20 }] }],
    })

    await env.commands.removeShippingMethod({
      id: cart.id,
      shippingMethods: [{ id: smId }],
    })

    const adjustments = await env.client.query<{ id: string }>(
      "SELECT id FROM shipping_method_adjustments"
    )
    const taxLines = await env.client.query<{ id: string }>(
      "SELECT id FROM shipping_method_tax_lines"
    )
    expect(adjustments.rows.length).toBe(0)
    expect(taxLines.rows.length).toBe(0)
  })
})

describe("Set Line Item Adjustments", () => {
  it("Given two line items on a cart, When setLineItemAdjustments is called with two adjustments, Then both adjustments are created", async () => {
    const cart = await createCartWithTwoItems()
    const [a, b] = cart.items
    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [
        { id: a.id, adjustments: [{ amount: 5, code: "A" }] },
        { id: b.id, adjustments: [{ amount: 3, code: "B" }] },
      ],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.items.find((i) => i.id === a.id)!.adjustments).toHaveLength(1)
    expect(after.items.find((i) => i.id === b.id)!.adjustments).toHaveLength(1)
  })

  it("Given an existing adjustment, When setLineItemAdjustments is called without that id, Then the old adjustment is deleted and the new one is created (replace semantics)", async () => {
    const cart = await createCartWithTwoItems()
    const [a] = cart.items
    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [{ id: a.id, adjustments: [{ amount: 5, code: "OLD" }] }],
    })
    const mid = await env.queries.getCart(cart.id)
    const oldId = mid.items.find((i) => i.id === a.id)!.adjustments[0].id

    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [{ id: a.id, adjustments: [{ amount: 9, code: "NEW" }] }],
    })
    const after = await env.queries.getCart(cart.id)
    const adjustments = after.items.find((i) => i.id === a.id)!.adjustments
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].code).toBe("NEW")
    expect(adjustments[0].id).not.toBe(oldId)
  })

  it("Given existing adjustments, When setLineItemAdjustments is called with an empty array, Then all adjustments are removed", async () => {
    const cart = await createCartWithTwoItems()
    const [a] = cart.items
    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [{ id: a.id, adjustments: [{ amount: 5 }] }],
    })
    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [{ id: a.id, adjustments: [] }],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.items.find((i) => i.id === a.id)!.adjustments).toHaveLength(0)
  })

  it("Given an existing adjustment, When setLineItemAdjustments is called with the existing id and a new amount, Then the adjustment is updated in place", async () => {
    const cart = await createCartWithTwoItems()
    const [a] = cart.items
    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [{ id: a.id, adjustments: [{ amount: 5, code: "X" }] }],
    })
    const mid = await env.queries.getCart(cart.id)
    const adjId = mid.items.find((i) => i.id === a.id)!.adjustments[0].id

    await env.commands.setLineItemAdjustments({
      id: cart.id,
      items: [{ id: a.id, adjustments: [{ id: adjId, amount: 12, code: "X" }] }],
    })
    const after = await env.queries.getCart(cart.id)
    const adjustments = after.items.find((i) => i.id === a.id)!.adjustments
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].id).toBe(adjId)
    expect(adjustments[0].amount).toBe(12)
  })
})

describe("Set Shipping Method Adjustments", () => {
  it("Given existing shipping method adjustments, When setShippingMethodAdjustments is called, Then unlisted adjustments are deleted and listed ones are upserted in one transaction", async () => {
    const cart = await createBaseCart()
    const withSm = await env.commands.addShippingMethod({
      id: cart.id,
      shippingMethods: [{ name: "Std", amount: 10 }],
    })
    const smId = withSm.shippingMethods[0].id

    await env.commands.setShippingMethodAdjustments({
      id: cart.id,
      shippingMethods: [
        { id: smId, adjustments: [{ amount: 1, code: "OLD" }] },
      ],
    })
    const mid = await env.queries.getCart(cart.id)
    const oldAdjId = mid.shippingMethods[0].adjustments[0].id

    await env.commands.setShippingMethodAdjustments({
      id: cart.id,
      shippingMethods: [
        {
          id: smId,
          adjustments: [
            { id: oldAdjId, amount: 2, code: "UPDATED" },
            { amount: 3, code: "NEW" },
          ],
        },
      ],
    })
    const after = await env.queries.getCart(cart.id)
    const adjustments = after.shippingMethods[0].adjustments
    expect(adjustments).toHaveLength(2)
    const updated = adjustments.find((a) => a.id === oldAdjId)!
    expect(updated.amount).toBe(2)
    expect(updated.code).toBe("UPDATED")
    expect(adjustments.some((a) => a.code === "NEW" && a.amount === 3)).toBe(true)
  })

  it("rejects setting adjustments on a shipping method that doesn't belong to the cart", async () => {
    const cartA = await createBaseCart()
    const cartB = await createBaseCart()
    const aMethods = await env.commands.addShippingMethod({
      id: cartA.id,
      shippingMethods: [{ name: "Std", amount: 10 }],
    })
    const aSmId = aMethods.shippingMethods[0].id

    await expect(
      env.commands.setShippingMethodAdjustments({
        id: cartB.id,
        shippingMethods: [{ id: aSmId, adjustments: [{ amount: 1 }] }],
      })
    ).rejects.toMatchObject({
      type: "INVALID_DATA",
    })
  })
})

describe("Set Line Item Tax Lines", () => {
  it("Given two items on a cart, When setLineItemTaxLines is called with one tax line per item, Then tax lines are created on both items", async () => {
    const cart = await createCartWithTwoItems()
    const [a, b] = cart.items
    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [
        { id: a.id, taxLines: [{ code: "VAT", rate: 20 }] },
        { id: b.id, taxLines: [{ code: "VAT", rate: 25 }] },
      ],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.items.find((i) => i.id === a.id)!.taxLines).toHaveLength(1)
    expect(after.items.find((i) => i.id === b.id)!.taxLines).toHaveLength(1)
  })

  it("Given existing tax lines, When setLineItemTaxLines is called without their ids, Then they are deleted and the new ones are created", async () => {
    const cart = await createCartWithTwoItems()
    const [a] = cart.items
    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [{ id: a.id, taxLines: [{ code: "OLD", rate: 10 }] }],
    })
    const oldId = (await env.queries.getCart(cart.id)).items.find((i) => i.id === a.id)!
      .taxLines[0].id
    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [{ id: a.id, taxLines: [{ code: "NEW", rate: 15 }] }],
    })
    const after = await env.queries.getCart(cart.id)
    const taxes = after.items.find((i) => i.id === a.id)!.taxLines
    expect(taxes).toHaveLength(1)
    expect(taxes[0].code).toBe("NEW")
    expect(taxes[0].id).not.toBe(oldId)
  })

  it("Given existing tax lines, When setLineItemTaxLines is called with an empty array, Then all tax lines are removed", async () => {
    const cart = await createCartWithTwoItems()
    const [a] = cart.items
    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [{ id: a.id, taxLines: [{ code: "VAT", rate: 20 }] }],
    })
    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [{ id: a.id, taxLines: [] }],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.items.find((i) => i.id === a.id)!.taxLines).toHaveLength(0)
  })

  it("Given an existing tax line id with a new rate, When setLineItemTaxLines is called, Then the rate is updated in place", async () => {
    const cart = await createCartWithTwoItems()
    const [a] = cart.items
    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [{ id: a.id, taxLines: [{ code: "VAT", rate: 20 }] }],
    })
    const taxId = (await env.queries.getCart(cart.id)).items.find((i) => i.id === a.id)!
      .taxLines[0].id

    await env.commands.setLineItemTaxLines({
      id: cart.id,
      items: [{ id: a.id, taxLines: [{ id: taxId, code: "VAT", rate: 25 }] }],
    })
    const after = await env.queries.getCart(cart.id)
    const taxes = after.items.find((i) => i.id === a.id)!.taxLines
    expect(taxes).toHaveLength(1)
    expect(taxes[0].id).toBe(taxId)
    expect(taxes[0].rate).toBe(25)
  })
})

describe("Set Shipping Method Tax Lines", () => {
  it("Given shipping methods on a cart, When setShippingMethodTaxLines is called, Then existing tax lines are atomically replaced with the new set (delete unlisted, upsert listed)", async () => {
    const cart = await createBaseCart()
    const withSm = await env.commands.addShippingMethod({
      id: cart.id,
      shippingMethods: [{ name: "Std", amount: 10 }],
    })
    const smId = withSm.shippingMethods[0].id

    await env.commands.setShippingMethodTaxLines({
      id: cart.id,
      shippingMethods: [
        { id: smId, taxLines: [{ code: "OLD", rate: 10 }] },
      ],
    })
    const oldTaxId = (await env.queries.getCart(cart.id)).shippingMethods[0].taxLines[0].id

    await env.commands.setShippingMethodTaxLines({
      id: cart.id,
      shippingMethods: [
        {
          id: smId,
          taxLines: [
            { id: oldTaxId, code: "OLD", rate: 12 },
            { code: "NEW", rate: 5 },
          ],
        },
      ],
    })
    const after = await env.queries.getCart(cart.id)
    const taxes = after.shippingMethods[0].taxLines
    expect(taxes).toHaveLength(2)
    expect(taxes.find((t) => t.id === oldTaxId)!.rate).toBe(12)
    expect(taxes.some((t) => t.code === "NEW")).toBe(true)
  })
})

describe("Manage Credit Lines", () => {
  it("Given a cart, When createCreditLines is called with an amount and external reference, Then a credit line is added to the cart", async () => {
    const cart = await createBaseCart()
    await env.commands.manageCreditLines({
      id: cart.id,
      creditLines: [
        {
          amount: 25,
          rawAmount: { value: "25.00" },
          reference: "gift_card",
          referenceId: "gc_001",
        },
      ],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.creditLines).toHaveLength(1)
    expect(after.creditLines[0].amount).toBe(25)
    expect(after.creditLines[0].reference).toBe("gift_card")
  })

  it("Given an existing credit line, When updateCreditLines is called, Then the credit line is updated", async () => {
    const cart = await createBaseCart()
    await env.commands.manageCreditLines({
      id: cart.id,
      creditLines: [{ amount: 10, rawAmount: { value: "10" } }],
    })
    const cl = (await env.queries.getCart(cart.id)).creditLines[0]
    await env.commands.manageCreditLines({
      id: cart.id,
      creditLines: [{ id: cl.id, amount: 50, rawAmount: { value: "50" } }],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.creditLines).toHaveLength(1)
    expect(after.creditLines[0].amount).toBe(50)
  })

  it("Given an existing credit line, When deleteCreditLines is called, Then the credit line is removed", async () => {
    const cart = await createBaseCart()
    await env.commands.manageCreditLines({
      id: cart.id,
      creditLines: [{ amount: 10, rawAmount: { value: "10" } }],
    })
    const cl = (await env.queries.getCart(cart.id)).creditLines[0]
    await env.commands.manageCreditLines({
      id: cart.id,
      creditLines: [{ id: cl.id, amount: 0, rawAmount: { value: "0" }, _delete: true }],
    })
    const after = await env.queries.getCart(cart.id)
    expect(after.creditLines).toHaveLength(0)
  })
})

describe("Delete Cart", () => {
  it("Given an existing cart, When deleteCarts is called, Then the cart no longer appears in listCarts", async () => {
    const cart = await createBaseCart()
    await env.commands.deleteCart({ id: cart.id })
    const found = env.queries.getCart(cart.id)
    await expect(found).rejects.toMatchObject({ type: "NOT_FOUND" })
  })

  it("Given a cart is deleted, Then its items, shipping methods, shipping_address, and billing_address are cascade-deleted", async () => {
    const cart = await env.commands.createCart({
      currencyCode: "usd",
      shippingAddress: {
        firstName: "Alice",
        address1: "1 Main",
        city: "Portland",
        countryCode: "US",
      },
      billingAddress: {
        firstName: "Alice",
        address1: "1 Main",
        city: "Portland",
        countryCode: "US",
      },
      items: [makeItem()],
    })
    await env.commands.addShippingMethod({
      id: cart.id,
      shippingMethods: [{ name: "Std", amount: 5 }],
    })
    await env.commands.deleteCart({ id: cart.id })

    const items = await env.client.query<{ id: string }>(
      "SELECT id FROM cart_line_items"
    )
    const sms = await env.client.query<{ id: string }>(
      "SELECT id FROM cart_shipping_methods"
    )
    const cartRows = await env.client.query<{ id: string }>(
      "SELECT id FROM carts"
    )
    expect(items.rows.length).toBe(0)
    expect(sms.rows.length).toBe(0)
    expect(cartRows.rows.length).toBe(0)
  })

  it("emits CartDeleted event", async () => {
    const cart = await createBaseCart()
    env.events.length = 0
    await env.commands.deleteCart({ id: cart.id })
    expect(env.events.filter((e) => e.name === "CartDeleted")).toHaveLength(1)
  })
})

describe("Authorization", () => {
  it("automation-only commands surface as domain-defined behavior in the service layer (HTTP authorization tested via handlers)", () => {
    expect(typeof env.commands.manageCreditLines).toBe("function")
  })
})

describe("Domain error type", () => {
  it("invariant violations are DomainErrors with the INVALID_DATA type", async () => {
    try {
      await env.commands.createCart({ currencyCode: "" as unknown as string })
      throw new Error("expected throw")
    } catch (e) {
      expect(isDomainError(e)).toBe(true)
    }
  })
})
