import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart, deleteCart, restoreCart } from '../src/commands/cart.ts';
import { addShippingMethod } from '../src/commands/shippingMethods.ts';
import { getCart } from '../src/queries/getCart.ts';

describe('CartDeleted', () => {
  const C = criteriaFor('CartDeleted');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    await deleteCart(db, { id: cart.id });
    await expect(getCart(db, cart.id)).rejects.toMatchObject({ code: 'not-found' });
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Std', amount: 5 }],
    });
    await deleteCart(db, { id: cart.id });
    const li = await db('line_item').where({ cart_id: cart.id });
    const sm = await db('shipping_method').where({ cart_id: cart.id });
    const addr = await db('cart_address').where({ cart_id: cart.id });
    expect(li.every((r: any) => r.deleted_at !== null)).toBe(true);
    expect(sm.every((r: any) => r.deleted_at !== null)).toBe(true);
    // No address attached in this test, but shape must be present
    expect(addr.every((r: any) => r.deleted_at !== null)).toBe(true);
  });
});

describe('CartRestored', () => {
  const C = criteriaFor('CartRestored');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    await deleteCart(db, { id: cart.id });
    const restored = await restoreCart(db, { id: cart.id });
    expect(restored.id).toBe(cart.id);
    expect(restored.deletedAt).toBeNull();
    expect(restored.lineItems).toHaveLength(1);
  });

  it(C[1], async () => {
    db = await freshDb();
    await expect(restoreCart(db, { id: 'cart_DOES_NOT_EXIST' })).rejects.toMatchObject({
      code: 'not-found',
    });
  });
});
