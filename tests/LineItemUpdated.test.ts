import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import { addLineItem, updateLineItem } from '../src/commands/lineItems.ts';

const C = criteriaFor('LineItemUpdated');

describe('LineItemUpdated', () => {
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Mouse', quantity: 1, unitPrice: 100 }],
    });
    const liId = cart.lineItems[0].id;
    const updated = await updateLineItem(db, {
      id: cart.id,
      lineItems: [{ id: liId, title: 'Wireless Mouse Pro' }],
    });
    expect(updated.lineItems[0].title).toBe('Wireless Mouse Pro');
  });

  it(C[1], async () => {
    // "via a cart id selector" — the matching selector is (id, cart_id), so updating with both
    // should still resolve and update the matching line item.
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Mouse', quantity: 1, unitPrice: 100 }],
    });
    const liId = cart.lineItems[0].id;
    const updated = await updateLineItem(db, {
      id: cart.id,
      lineItems: [{ id: liId, title: 'Renamed' }],
    });
    expect(updated.lineItems[0].title).toBe('Renamed');
  });

  it(C[2], async () => {
    db = await freshDb();
    const cartA = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    const cartB = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'B', quantity: 1, unitPrice: 20 }],
    });
    const updatedA = await updateLineItem(db, {
      id: cartA.id,
      lineItems: [{ id: cartA.lineItems[0].id, title: 'A2' }],
    });
    const updatedB = await updateLineItem(db, {
      id: cartB.id,
      lineItems: [{ id: cartB.lineItems[0].id, title: 'B2' }],
    });
    expect(updatedA.lineItems[0].title).toBe('A2');
    expect(updatedB.lineItems[0].title).toBe('B2');
  });
});
