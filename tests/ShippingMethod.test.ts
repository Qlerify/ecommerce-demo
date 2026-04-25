import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import {
  addShippingMethod,
  removeShippingMethod,
  setShippingMethodAdjustments,
  setShippingMethodTaxLines,
} from '../src/commands/shippingMethods.ts';

describe('ShippingMethodAdded', () => {
  const C = criteriaFor('ShippingMethodAdded');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const out = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Standard', amount: 100 }],
    });
    expect(out.shippingMethods).toHaveLength(1);
    expect(out.shippingMethods[0]).toMatchObject({ name: 'Standard', amount: 100 });
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    await expect(
      addShippingMethod(db, {
        id: cart.id,
        shippingMethods: [{ name: 'Negative', amount: -1 }],
      }),
    ).rejects.toMatchObject({ code: 'check-constraint' });
  });

  it(C[2], async () => {
    db = await freshDb();
    const cartA = await createCart(db, { currencyCode: 'EUR' });
    const cartB = await createCart(db, { currencyCode: 'EUR' });
    const a = await addShippingMethod(db, {
      id: cartA.id,
      shippingMethods: [{ name: 'A', amount: 5 }],
    });
    const b = await addShippingMethod(db, {
      id: cartB.id,
      shippingMethods: [{ name: 'B', amount: 7 }],
    });
    expect(a.shippingMethods).toHaveLength(1);
    expect(a.shippingMethods[0].name).toBe('A');
    expect(b.shippingMethods).toHaveLength(1);
    expect(b.shippingMethods[0].name).toBe('B');
  });
});

describe('ShippingMethodTaxLinesSet', () => {
  const C = criteriaFor('ShippingMethodTaxLinesSet');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [
        { name: 'Std', amount: 5 },
        { name: 'Exp', amount: 15 },
      ],
    });
    const out = await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: withSm.shippingMethods.map((sm: any) => ({
        id: sm.id,
        taxLines: [{ code: 'VAT', rate: 20 }],
      })),
    });
    for (const sm of out.shippingMethods) {
      expect(sm.taxLines).toHaveLength(1);
    }
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Std', amount: 5 }],
    });
    const sm = withSm.shippingMethods[0];
    await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, taxLines: [{ code: 'GST', rate: 5 }] }],
    });
    expect(out.shippingMethods[0].taxLines).toHaveLength(1);
    expect(out.shippingMethods[0].taxLines[0]).toMatchObject({ code: 'GST', rate: 5 });
  });

  it(C[2], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Std', amount: 5 }],
    });
    const sm = withSm.shippingMethods[0];
    await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, taxLines: [{ code: 'VAT', rate: 20 }] }],
    });
    const out = await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, taxLines: [] }],
    });
    expect(out.shippingMethods[0].taxLines).toHaveLength(0);
  });

  it(C[3], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Std', amount: 5 }],
    });
    const sm = withSm.shippingMethods[0];
    const seeded = await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [
        {
          id: sm.id,
          taxLines: [
            { code: 'VAT', rate: 20 },
            { code: 'GST', rate: 5 },
          ],
        },
      ],
    });
    const [t1, t2] = seeded.shippingMethods[0].taxLines;
    const out = await setShippingMethodTaxLines(db, {
      id: cart.id,
      shippingMethods: [
        {
          id: sm.id,
          taxLines: [
            { id: t1.id, code: 'VAT', rate: 21 },
            { code: 'SALES', rate: 7 },
          ],
        },
      ],
    });
    const tls = out.shippingMethods[0].taxLines;
    expect(tls).toHaveLength(2);
    expect(tls.find((t: any) => t.id === t1.id)).toMatchObject({ code: 'VAT', rate: 21 });
    expect(tls.find((t: any) => t.id !== t1.id)).toMatchObject({ code: 'SALES', rate: 7 });
    expect(tls.find((t: any) => t.id === t2.id)).toBeUndefined();
  });
});

describe('ShippingMethodAdjSet', () => {
  const C = criteriaFor('ShippingMethodAdjSet');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [
        { name: 'Std', amount: 5 },
        { name: 'Exp', amount: 15 },
      ],
    });
    const out = await setShippingMethodAdjustments(db, {
      id: cart.id,
      shippingMethods: withSm.shippingMethods.map((sm: any) => ({
        id: sm.id,
        adjustments: [{ amount: 1, code: 'FREESHIP' }],
      })),
    });
    for (const sm of out.shippingMethods) {
      expect(sm.adjustments).toHaveLength(1);
    }
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Std', amount: 5 }],
    });
    const sm = withSm.shippingMethods[0];
    await setShippingMethodAdjustments(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, adjustments: [{ amount: 1, code: 'A' }] }],
    });
    const out = await setShippingMethodAdjustments(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, adjustments: [{ amount: 2, code: 'B' }] }],
    });
    expect(out.shippingMethods[0].adjustments).toHaveLength(1);
    expect(out.shippingMethods[0].adjustments[0]).toMatchObject({ amount: 2, code: 'B' });
  });

  it(C[2], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Std', amount: 5 }],
    });
    const sm = withSm.shippingMethods[0];
    await setShippingMethodAdjustments(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, adjustments: [{ amount: 1 }] }],
    });
    const out = await setShippingMethodAdjustments(db, {
      id: cart.id,
      shippingMethods: [{ id: sm.id, adjustments: [] }],
    });
    expect(out.shippingMethods[0].adjustments).toHaveLength(0);
  });

  it(C[3], async () => {
    db = await freshDb();
    const cartA = await createCart(db, { currencyCode: 'EUR' });
    const cartB = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cartA.id,
      shippingMethods: [{ name: 'A', amount: 5 }],
    });
    const sm = withSm.shippingMethods[0];
    await expect(
      setShippingMethodAdjustments(db, {
        id: cartB.id,
        shippingMethods: [{ id: sm.id, adjustments: [{ amount: 1 }] }],
      }),
    ).rejects.toMatchObject({ code: 'ownership' });
  });
});

describe('ShippingMethodRemoved', () => {
  const C = criteriaFor('ShippingMethodRemoved');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ name: 'Std', amount: 5 }],
    });
    const out = await removeShippingMethod(db, {
      id: cart.id,
      shippingMethods: [{ id: withSm.shippingMethods[0].id }],
    });
    expect(out.shippingMethods).toHaveLength(0);
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const withSm = await addShippingMethod(db, {
      id: cart.id,
      shippingMethods: [
        { name: 'A', amount: 5 },
        { name: 'B', amount: 10 },
        { name: 'C', amount: 15 },
      ],
    });
    const out = await removeShippingMethod(db, {
      id: cart.id,
      shippingMethods: withSm.shippingMethods.map((sm: any) => ({ id: sm.id })),
    });
    expect(out.shippingMethods).toHaveLength(0);
  });
});
