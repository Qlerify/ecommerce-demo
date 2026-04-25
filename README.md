# Cart Domain Demo

An Express + SQLite implementation of the `Cart` bounded context defined in
`cart-domain-model.json`. Built to be portable to PostgreSQL by swapping the
Knex driver — no domain or query code needs to change.

## Quick start

```bash
npm install
npm run reset      # create schema + seed product/shipping/credit fixtures
npm start          # http://localhost:3000
npm test           # 49 GWT cases + 10 HTTP cases (~1s)
```

Open `http://localhost:3000` for the demo UI: a three-pane catalog / cart /
cart-switcher.

## Layout

```
src/
  domain/       errors, ID generation, repo helpers
  commands/     18 command handlers (CreateCart, AddLineItem, …)
  queries/      5 read models (GetCart, GetProductCatalog, …)
  http/         Express router + error→HTTP mapping
  db/
    knex.ts     driver factory (DB_DRIVER=sqlite | pg)
    migrations/ ordered, work on both engines
    seeds/      product_catalog, shipping_option, credit_source
web/            single-page vanilla-JS UI (Tailwind via CDN)
tests/          one test file per domain event + http.test.ts
```

## Switching to PostgreSQL

```bash
export DB_DRIVER=pg
export DATABASE_URL=postgres://user:pass@localhost:5432/cart
npm run migrate
npm run seed
npm start
```

Portability seams that let this work without code changes:

- All SQL goes through Knex; no engine-specific strings outside migrations.
- IDs are generated in app code (`cart_…`, `cali_…`), not by the DB.
- JSON fields stored as `TEXT` — Postgres can later be migrated to `jsonb`.
- Soft-delete via `deleted_at` rather than partial indexes or triggers.

## Tests

The test suite has two layers:

- **Domain (Vitest, ~49 cases).** One file per domain event in `tests/`,
  each `it(...)` named with the literal `acceptanceCriteria` string from
  `cart-domain-model.json`. Each case runs against a fresh `:memory:` SQLite
  with seeded fixtures. Calls command functions directly — no HTTP layer.
- **HTTP (Vitest + Supertest, ~10 cases).** `tests/http.test.ts`. Boots the
  Express app against a fresh DB and asserts on status codes, content types,
  and route wiring.

Run a subset:

```bash
npx vitest run tests/CartCreated.test.ts
npx vitest run tests/http.test.ts
```

## Domain shape

- **Aggregate root:** `Cart`
- **Child entities** (own lifecycle, soft-deleted with cart):
  `LineItem`, `ShippingMethod`, `CreditLine`
- **Value objects** (replaced wholesale, not patched): `Address`,
  `LineItemAdjustment`, `LineItemTaxLine`, `ShippingMethodAdjustment`,
  `ShippingMethodTaxLine`
- **External read models** (seeded as fixtures, not a real bounded context):
  `product_catalog`, `shipping_option`, `credit_source`

Set-replace semantics for tax lines and adjustments: rows whose `id` appears
in the payload are upserted, rows whose `id` is absent are deleted, new rows
get a fresh prefixed id. All mutations run inside a single transaction.

## HTTP API

| Verb | Path                                          | Notes                          |
| ---- | --------------------------------------------- | ------------------------------ |
| GET  | `/queries/product-catalog`                    | seeded products                |
| GET  | `/queries/shipping-options?regionId=…`        |                                |
| GET  | `/queries/credit-sources?customerId=…`        |                                |
| GET  | `/queries/carts?deleted=true|false`           | list/filter carts              |
| GET  | `/queries/cart/:id?includeDeleted=true`       |                                |
| POST | `/commands/cart/create`                       | requires `currencyCode`        |
| POST | `/commands/cart/update`                       |                                |
| POST | `/commands/cart/set-shipping-address`         |                                |
| POST | `/commands/cart/set-billing-address`          |                                |
| POST | `/commands/cart/delete`                       | soft-delete + cascade          |
| POST | `/commands/cart/restore`                      | restores cascade-deleted kids  |
| POST | `/commands/line-item/{add,update,remove}`     |                                |
| POST | `/commands/line-item/set-{tax-lines,adjustments}` | set-replace             |
| POST | `/commands/shipping-method/{add,remove}`      |                                |
| POST | `/commands/shipping-method/set-{tax-lines,adjustments}` |                      |
| POST | `/commands/credit-line/{add,remove}`          |                                |

Error envelope: `{ error: { code, message, field? } }`.
Codes: `required-field` (400), `not-found` (404), `check-constraint` (422),
`ownership` (422), `conflict` (409).
