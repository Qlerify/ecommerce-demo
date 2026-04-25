import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import { removeLineItem } from '../src/commands/lineItems.ts';

const C = criteriaFor('LineItemRemoved');

describe('LineItemRemoved', () => {
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
    const removed = await removeLineItem(db, {
      id: cart.id,
      lineItems: [{ id: cart.lineItems[0].id }],
    });
    expect(removed.lineItems).toHaveLength(0);
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [
        { title: 'A', quantity: 1, unitPrice: 10 },
        { title: 'B', quantity: 1, unitPrice: 20 },
        { title: 'C', quantity: 1, unitPrice: 30 },
      ],
    });
    const removed = await removeLineItem(db, {
      id: cart.id,
      lineItems: cart.lineItems.map((l: any) => ({ id: l.id })),
    });
    expect(removed.lineItems).toHaveLength(0);
  });
});
