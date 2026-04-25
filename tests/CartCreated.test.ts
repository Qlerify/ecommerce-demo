import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb, sampleAddress, altAddress } from './_helpers.ts';
import { createCart } from '../src/commands/cart.ts';
import { DomainError } from '../src/domain/errors.ts';

const C = criteriaFor('CartCreated');

describe('CartCreated', () => {
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    expect(cart.id).toMatch(/^cart_/);
    expect(cart.currencyCode).toBe('eur');
  });

  it(C[1], async () => {
    db = await freshDb();
    await expect(createCart(db, {})).rejects.toMatchObject({
      code: 'required-field',
      field: 'currency_code',
    });
  });

  it(C[2], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      billingAddress: sampleAddress,
      shippingAddress: altAddress,
    });
    expect(cart.billingAddress?.address1).toBe(sampleAddress.address1);
    expect(cart.shippingAddress?.address1).toBe(altAddress.address1);
  });

  it(C[3], async () => {
    db = await freshDb();
    const cart = await createCart(db, {
      currencyCode: 'EUR',
      lineItems: [{ title: 'Mouse', quantity: 1, unitPrice: 100 }],
    });
    expect(cart.lineItems).toHaveLength(1);
    expect(cart.lineItems[0]).toMatchObject({ title: 'Mouse', quantity: 1, unitPrice: 100 });
  });
});
