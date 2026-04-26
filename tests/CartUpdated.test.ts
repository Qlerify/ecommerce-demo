import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart, updateCart } from '../src/commands/cart.ts';
import { setLineItemAdjustments, setLineItemTaxLines } from '../src/commands/lineItems.ts';
import { addShippingMethod, setShippingMethodTaxLines } from '../src/commands/shippingMethods.ts';
import { addCreditLine } from '../src/commands/creditLines.ts';
import { getCart } from '../src/queries/getCart.ts';

const C = criteriaFor('CartUpdated');

describe('CartUpdated', () => {
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await updateCart(db, { id: cart.id, email: 'alice@example.com' });
    expect(updated.email).toBe('alice@example.com');
  });

  it(C[1], async () => {
    // "via a matching selector" — interpret as updating by id, which is the matching selector.
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await updateCart(db, { id: cart.id, locale: 'fr-FR' });
    expect(updated.locale).toBe('fr-FR');
  });

  it(C[2], async () => {
    db = await freshDb();
    await expect(updateCart(db, { id: 'cart_DOES_NOT_EXIST', email: 'x@y.z' })).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it(C[3], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Widget', quantity: 2, unitPrice: 100 }],
    });
    await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [{ id: cart.lineItems[0].id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await getCart(db, cart.id);
    expect(out.subtotal).toBe(200);
    expect(out.itemTaxTotal).toBe(40);
    expect(out.taxTotal).toBe(40);
    expect(out.total).toBe(240);
  });

  it(C[4], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Widget', quantity: 2, unitPrice: 100 }],
    });
    await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: [{ id: cart.lineItems[0].id, adjustments: [{ amount: 20, code: 'WELCOME' }] }],
    });
    const out = await getCart(db, cart.id);
    expect(out.itemDiscountTotal).toBe(20);
    expect(out.discountTotal).toBeGreaterThanOrEqual(20);
    // total = subtotal - discounts + taxes (no taxes here)
    expect(out.total).toBe(out.subtotal - out.discountTotal + out.taxTotal);
    expect(out.total).toBe(180);
  });

  it(C[5], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Standard', amount: 50 }],
    });
    await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [{ id: withSm.shippingMethods[0].id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await getCart(db, cart.id);
    expect(out.shippingSubtotal).toBe(50);
    expect(out.shippingTaxTotal).toBe(10);
    expect(out.shippingTotal).toBe(60);
  });

  it(C[6], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Widget', quantity: 2, unitPrice: 100 }],
    });
    await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [{ id: cart.lineItems[0].id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Standard', amount: 50 }],
    });
    await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [{ id: withSm.shippingMethods[0].id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await getCart(db, cart.id);
    expect(out.itemTaxTotal).toBe(40);
    expect(out.shippingTaxTotal).toBe(10);
    expect(out.taxTotal).toBe(50);
  });

  it(C[7], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Widget', quantity: 1, unitPrice: 100 }],
    });
    await addCreditLine(db, {
      id: cart.id,
      creditLines: [{ amount: 25, reference: 'gift_card', referenceId: 'gc_01' }],
    });
    const out = await getCart(db, cart.id);
    expect(out.creditLineTotal).toBe(25);
    expect(out.total).toBe(75); // 100 subtotal - 25 credit
  });

  it(C[8], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const out = await getCart(db, cart.id);
    expect(out.subtotal).toBe(0);
    expect(out.taxTotal).toBe(0);
    expect(out.total).toBe(0);
  });

  it(C[9], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Widget', quantity: 1, unitPrice: 120, isTaxInclusive: true }],
    });
    await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [{ id: cart.lineItems[0].id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await getCart(db, cart.id);
    expect(out.lineItems[0].subtotal).toBe(100);
    expect(out.lineItems[0].taxTotal).toBe(20);
  });
});
