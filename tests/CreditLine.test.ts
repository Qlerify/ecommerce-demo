import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import { addCreditLine, removeCreditLine } from '../src/commands/creditLines.ts';

describe('CreditLineAdded', () => {
  const C = criteriaFor('CreditLineAdded');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const out = await addCreditLine(db, {
      id: cart.id,
      creditLines: [{ amount: 10, reference: 'refund', referenceId: 'ref_01' }],
    });
    expect(out.creditLines).toHaveLength(1);
    expect(out.creditLines[0]).toMatchObject({ amount: 10, reference: 'refund' });
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const out = await addCreditLine(db, {
      id: cart.id,
      creditLines: [
        { amount: 10, reference: 'refund', referenceId: 'ref_01' },
        { amount: 25, reference: 'gift_card', referenceId: 'gc_01' },
        { amount: 5, reference: 'store_credit', referenceId: 'sc_01' },
      ],
    });
    expect(out.creditLines).toHaveLength(3);
  });
});

describe('CreditLineRemoved', () => {
  const C = criteriaFor('CreditLineRemoved');
  let db: any;
  afterEach(async () => db && db.destroy());

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const seeded = await addCreditLine(db, {
      id: cart.id,
      creditLines: [{ amount: 10, reference: 'refund', referenceId: 'ref_01' }],
    });
    const out = await removeCreditLine(db, {
      id: cart.id,
      creditLines: [{ id: seeded.creditLines[0].id }],
    });
    expect(out.creditLines).toHaveLength(0);
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const seeded = await addCreditLine(db, {
      id: cart.id,
      creditLines: [
        { amount: 10, reference: 'refund' },
        { amount: 25, reference: 'gift_card' },
      ],
    });
    const out = await removeCreditLine(db, {
      id: cart.id,
      creditLines: seeded.creditLines.map((c: any) => ({ id: c.id })),
    });
    expect(out.creditLines).toHaveLength(0);
    // Soft-delete: rows should still exist with deleted_at set
    const raw = await db('credit_line').where({ cart_id: cart.id });
    expect(raw).toHaveLength(2);
    expect(raw.every((r: any) => r.deleted_at !== null)).toBe(true);
  });
});
