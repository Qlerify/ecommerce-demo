import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { freshDb } from './_helpers.ts';
import { makeApp } from '../src/http/app.ts';

describe('HTTP layer', () => {
  let db: any;
  afterEach(async () => db && db.destroy());

  it('GET /queries/product-catalog returns 200 + JSON array', async () => {
    db = await freshDb();
    const res = await request(makeApp(db)).get('/queries/product-catalog');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /queries/shipping-options returns seeded options', async () => {
    db = await freshDb();
    const res = await request(makeApp(db)).get('/queries/shipping-options');
    expect(res.status).toBe(200);
    expect(res.body.map((o: any) => o.id).sort()).toEqual(['so_exp', 'so_ovn', 'so_std']);
  });

  it('GET /queries/credit-sources returns seeded sources', async () => {
    db = await freshDb();
    const res = await request(makeApp(db)).get('/queries/credit-sources');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('POST /commands/cart/create returns 200 with new cart id', async () => {
    db = await freshDb();
    const res = await request(makeApp(db))
      .post('/commands/cart/create')
      .send({ currencyCode: 'EUR' });
    expect(res.status).toBe(200);
    expect(res.body.id).toMatch(/^cart_/);
    expect(res.body.currencyCode).toBe('eur');
  });

  it('POST /commands/cart/create without currencyCode → 400 required-field', async () => {
    db = await freshDb();
    const res = await request(makeApp(db)).post('/commands/cart/create').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'required-field', field: 'currency_code' });
  });

  it('GET /queries/cart/:id for missing cart → 404 not-found', async () => {
    db = await freshDb();
    const res = await request(makeApp(db)).get('/queries/cart/cart_DOES_NOT_EXIST');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not-found');
  });

  it('POST /commands/shipping-method/add with negative amount → 422 check-constraint', async () => {
    db = await freshDb();
    const app = makeApp(db);
    const cart = (await request(app).post('/commands/cart/create').send({ currencyCode: 'EUR' })).body;
    const res = await request(app)
      .post('/commands/shipping-method/add')
      .send({ id: cart.id, shippingMethods: [{ name: 'X', amount: -1 }] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('check-constraint');
  });

  it('full happy path: create → add line items → set shipping → fetch', async () => {
    db = await freshDb();
    const app = makeApp(db);
    const cart = (await request(app).post('/commands/cart/create').send({ currencyCode: 'EUR' })).body;

    await request(app)
      .post('/commands/line-item/add')
      .send({ id: cart.id, lineItems: [{ title: 'Mouse', quantity: 2, unitPrice: 19.99 }] })
      .expect(200);

    await request(app)
      .post('/commands/cart/set-shipping-address')
      .send({
        id: cart.id,
        shippingAddress: { firstName: 'Alice', address1: '1 Main', countryCode: 'US' },
      })
      .expect(200);

    const fetched = (await request(app).get(`/queries/cart/${cart.id}`)).body;
    expect(fetched.lineItems).toHaveLength(1);
    expect(fetched.shippingAddress.firstName).toBe('Alice');
    expect(fetched.itemCount).toBe(2);
    expect(fetched.total).toBeCloseTo(2 * 19.99, 2);
  });

  it('GET /queries/carts lists carts including newly created', async () => {
    db = await freshDb();
    const app = makeApp(db);
    await request(app).post('/commands/cart/create').send({ currencyCode: 'EUR' });
    await request(app).post('/commands/cart/create').send({ currencyCode: 'USD' });
    const res = await request(app).get('/queries/carts');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('POST /commands/cart/delete then /commands/cart/restore round-trips', async () => {
    db = await freshDb();
    const app = makeApp(db);
    const cart = (await request(app).post('/commands/cart/create').send({ currencyCode: 'EUR' })).body;
    await request(app).post('/commands/cart/delete').send({ id: cart.id }).expect(200);
    await request(app).get(`/queries/cart/${cart.id}`).expect(404);
    const restored = await request(app).post('/commands/cart/restore').send({ id: cart.id });
    expect(restored.status).toBe(200);
    expect(restored.body.id).toBe(cart.id);
  });
});
