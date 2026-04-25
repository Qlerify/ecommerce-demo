import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb, sampleAddress, altAddress } from './_helpers.ts';
import { createCart, setBillingAddress, setShippingAddress } from '../src/commands/cart.ts';

describe('ShippingAddressSet', () => {
  const C = criteriaFor('ShippingAddressSet');
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await setShippingAddress(db, { id: cart.id, shippingAddress: sampleAddress });
    expect(updated.shippingAddress?.address1).toBe(sampleAddress.address1);
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR', shippingAddress: sampleAddress });
    const updated = await setShippingAddress(db, { id: cart.id, shippingAddress: altAddress });
    expect(updated.shippingAddress?.address1).toBe(altAddress.address1);
    expect(updated.shippingAddress?.firstName).toBe(altAddress.firstName);
  });
});

describe('BillingAddressSet', () => {
  const C = criteriaFor('BillingAddressSet');
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await setBillingAddress(db, { id: cart.id, billingAddress: sampleAddress });
    expect(updated.billingAddress?.address1).toBe(sampleAddress.address1);
  });

  it(C[1], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR', billingAddress: sampleAddress });
    const updated = await setBillingAddress(db, { id: cart.id, billingAddress: altAddress });
    expect(updated.billingAddress?.address1).toBe(altAddress.address1);
  });
});
