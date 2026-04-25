import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import { addLineItem } from '../src/commands/lineItems.ts';

const C = criteriaFor('LineItemAdded');

describe('LineItemAdded', () => {
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await addLineItem(db, {
      id: cart.id,
      lineItems: [{ title: 'Mouse', quantity: 1, unitPrice: 100 }],
    });
    expect(updated.lineItems).toHaveLength(1);
    expect(updated.lineItems[0]).toMatchObject({ title: 'Mouse', quantity: 1, unitPrice: 100 });
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await addLineItem(db, {
      id: cart.id,
      lineItems: [
        { title: 'Mouse', quantity: 1, unitPrice: 100 },
        { title: 'Cable', quantity: 2, unitPrice: 10 },
        { title: 'Stand', quantity: 1, unitPrice: 50 },
      ],
    });
    expect(updated.lineItems).toHaveLength(3);
    expect(updated.lineItems.map((l: any) => l.title).sort()).toEqual(['Cable', 'Mouse', 'Stand']);
  });

  it(C[2], async () => {
    db = await freshDb();
    await expect(
      addLineItem(db, {
        id: 'cart_DOES_NOT_EXIST',
        lineItems: [{ title: 'Mouse', quantity: 1, unitPrice: 100 }],
      }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it(C[3], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    await expect(
      addLineItem(db, {
        id: cart.id,
        lineItems: [{ title: 'Mouse', unitPrice: 100 } as any],
      }),
    ).rejects.toMatchObject({ code: 'required-field', field: 'quantity' });
  });
});
