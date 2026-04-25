import { describe, it, expect, afterEach } from 'vitest';
import { criteriaFor, freshDb } from './_helpers.ts';
import { createCart, updateCart } from '../src/commands/cart.ts';

const C = criteriaFor('CartUpdated');

describe('CartUpdated', () => {
  let db: any;
  afterEach(async () => {
    if (db) await db.destroy();
  });

  it(C[0], async () => {
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await updateCart(db, { id: cart.id, email: 'alice@example.com' });
    expect(updated.email).toBe('alice@example.com');
  });

  it(C[1], async () => {
    // "via a matching selector" — interpret as updating by id, which is the matching selector.
    db = await freshDb();
    const cart = await createCart(db, { currencyCode: 'EUR' });
    const updated = await updateCart(db, { id: cart.id, locale: 'fr-FR' });
    expect(updated.locale).toBe('fr-FR');
  });

  it(C[2], async () => {
    db = await freshDb();
    await expect(updateCart(db, { id: 'cart_DOES_NOT_EXIST', email: 'x@y.z' })).rejects.toMatchObject({
      code: 'not-found',
    });
  });
});
