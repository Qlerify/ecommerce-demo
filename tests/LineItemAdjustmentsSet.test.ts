import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import { setLineItemAdjustments } from '../src/commands/lineItems.ts';

const C = criteriaFor('LineItemAdjustmentsSet');

describe('LineItemAdjustmentsSet', () => {
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [
        { title: 'A', quantity: 1, unitPrice: 10 },
        { title: 'B', quantity: 1, unitPrice: 20 },
      ],
    });
    const out = await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: cart.lineItems.map((li: any) => ({
        id: li.id,
        adjustments: [{ amount: 1, code: 'WELCOME' }],
      })),
    });
    for (const li of out.lineItems) {
      expect(li.adjustments).toHaveLength(1);
      expect(li.adjustments[0]).toMatchObject({ amount: 1, code: 'WELCOME' });
    }
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    const li = cart.lineItems[0];
    await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: [{ id: li.id, adjustments: [{ amount: 1, code: 'A' }] }],
    });
    const out = await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: [{ id: li.id, adjustments: [{ amount: 2, code: 'B' }] }],
    });
    expect(out.lineItems[0].adjustments).toHaveLength(1);
    expect(out.lineItems[0].adjustments[0]).toMatchObject({ amount: 2, code: 'B' });
  });

  it(C[2], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [
        { title: 'A', quantity: 1, unitPrice: 10 },
        { title: 'B', quantity: 1, unitPrice: 20 },
      ],
    });
    await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: cart.lineItems.map((li: any) => ({
        id: li.id,
        adjustments: [{ amount: 1, code: 'A' }],
      })),
    });
    const out = await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: cart.lineItems.map((li: any) => ({ id: li.id, adjustments: [] })),
    });
    for (const li of out.lineItems) {
      expect(li.adjustments).toHaveLength(0);
    }
  });

  it(C[3], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    const li = cart.lineItems[0];
    const seeded = await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: [{ id: li.id, adjustments: [{ amount: 1, code: 'INIT' }] }],
    });
    const adjA = seeded.lineItems[0].adjustments[0];
    const out = await setLineItemAdjustments(db, {
      id: cart.id,
      lineItems: [
        {
          id: li.id,
          adjustments: [{ id: adjA.id, amount: 5, code: 'CHANGED' }],
        },
      ],
    });
    expect(out.lineItems[0].adjustments).toHaveLength(1);
    expect(out.lineItems[0].adjustments[0]).toMatchObject({
      id: adjA.id,
      amount: 5,
      code: 'CHANGED',
    });
  });
});
