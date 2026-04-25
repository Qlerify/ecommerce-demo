import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import { setLineItemTaxLines } from '../src/commands/lineItems.ts';

const C = criteriaFor('LineItemTaxLinesSet');

describe('LineItemTaxLinesSet', () => {
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
    const out = await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: cart.lineItems.map((li: any) => ({
        id: li.id,
        taxLines: [{ code: 'VAT', rate: 20 }],
      })),
    });
    for (const li of out.lineItems) {
      expect(li.taxLines).toHaveLength(1);
      expect(li.taxLines[0]).toMatchObject({ code: 'VAT', rate: 20 });
    }
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    const li = cart.lineItems[0];
    await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [{ id: li.id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [{ id: li.id, taxLines: [{ code: 'GST', rate: 5 }] }],
    });
    expect(out.lineItems[0].taxLines).toHaveLength(1);
    expect(out.lineItems[0].taxLines[0]).toMatchObject({ code: 'GST', rate: 5 });
  });

  it(C[2], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    const li = cart.lineItems[0];
    await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [{ id: li.id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [{ id: li.id, taxLines: [] }],
    });
    expect(out.lineItems[0].taxLines).toHaveLength(0);
  });

  it(C[3], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'A', quantity: 1, unitPrice: 10 }],
    });
    const li = cart.lineItems[0];
    const initial = await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [
        {
          id: li.id,
          taxLines: [
            { code: 'VAT', rate: 20 },
            { code: 'GST', rate: 5 },
          ],
        },
      ],
    });
    const [t1, t2] = initial.lineItems[0].taxLines;
    const out = await setLineItemTaxLines(db, {
      id: cart.id,
      lineItems: [
        {
          id: li.id,
          taxLines: [
            { id: t1.id, code: 'VAT', rate: 21, description: 'updated' }, // updated
            { code: 'SALES', rate: 7 }, // new
            // t2 omitted -> deleted
          ],
        },
      ],
    });
    const tls = out.lineItems[0].taxLines;
    expect(tls).toHaveLength(2);
    const updated = tls.find((t: any) => t.id === t1.id);
    const inserted = tls.find((t: any) => t.id !== t1.id);
    expect(updated).toMatchObject({ code: 'VAT', rate: 21, description: 'updated' });
    expect(inserted).toMatchObject({ code: 'SALES', rate: 7 });
    expect(tls.find((t: any) => t.id === t2.id)).toBeUndefined();
  });
});
