import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Knex } from 'knex';
import { DomainError } from '../domain/errors.ts';
import * as cartCmd from '../commands/cart.ts';
import * as liCmd from '../commands/lineItems.ts';
import * as smCmd from '../commands/shippingMethods.ts';
import * as clCmd from '../commands/creditLines.ts';
import { getCart } from '../queries/getCart.ts';
import {
  getAvailableShippingOptions,
  getExternalCreditSources,
  getProductCatalog,
  listCarts,
  listDeletedCarts,
} from '../queries/readModels.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '..', '..', 'web');

function statusFor(code: string): number {
  switch (code) {
    case 'required-field':
      return 400;
    case 'check-constraint':
      return 422;
    case 'not-found':
      return 404;
    case 'ownership':
      return 422;
    case 'conflict':
      return 409;
    default:
      return 500;
  }
}

function wrap(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await fn(req, res);
      if (!res.headersSent) res.json(out);
    } catch (e) {
      next(e);
    }
  };
}

export function makeApp(db: Knex) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(webDir));

  // Queries
  app.get('/queries/product-catalog', wrap(async () => getProductCatalog(db)));
  app.get(
    '/queries/shipping-options',
    wrap(async (req) => getAvailableShippingOptions(db, req.query.regionId as string | undefined)),
  );
  app.get(
    '/queries/credit-sources',
    wrap(async (req) =>
      getExternalCreditSources(db, req.query.customerId as string | undefined),
    ),
  );
  app.get(
    '/queries/carts',
    wrap(async (req) => {
      const d = req.query.deleted;
      let deleted: boolean | undefined;
      if (d === 'true') deleted = true;
      else if (d === 'false') deleted = false;
      return listCarts(db, { deleted });
    }),
  );
  app.get('/queries/carts/deleted', wrap(async () => listDeletedCarts(db)));
  app.get(
    '/queries/cart/:id',
    wrap(async (req) => getCart(db, req.params.id, { includeDeleted: req.query.includeDeleted === 'true' })),
  );

  // Commands — cart lifecycle
  app.post('/commands/cart/create', wrap(async (req) => cartCmd.createCart(db, req.body)));
  app.post('/commands/cart/update', wrap(async (req) => cartCmd.updateCart(db, req.body)));
  app.post('/commands/cart/set-shipping-address', wrap(async (req) => cartCmd.setShippingAddress(db, req.body)));
  app.post('/commands/cart/set-billing-address', wrap(async (req) => cartCmd.setBillingAddress(db, req.body)));
  app.post('/commands/cart/delete', wrap(async (req) => cartCmd.deleteCart(db, req.body)));
  app.post('/commands/cart/restore', wrap(async (req) => cartCmd.restoreCart(db, req.body)));

  // Commands — line items
  app.post('/commands/line-item/add', wrap(async (req) => liCmd.addLineItem(db, req.body)));
  app.post('/commands/line-item/update', wrap(async (req) => liCmd.updateLineItem(db, req.body)));
  app.post('/commands/line-item/remove', wrap(async (req) => liCmd.removeLineItem(db, req.body)));
  app.post('/commands/line-item/set-tax-lines', wrap(async (req) => liCmd.setLineItemTaxLines(db, req.body)));
  app.post('/commands/line-item/set-adjustments', wrap(async (req) => liCmd.setLineItemAdjustments(db, req.body)));

  // Commands — shipping methods
  app.post('/commands/shipping-method/add', wrap(async (req) => smCmd.addShippingMethod(db, req.body)));
  app.post('/commands/shipping-method/remove', wrap(async (req) => smCmd.removeShippingMethod(db, req.body)));
  app.post(
    '/commands/shipping-method/set-tax-lines',
    wrap(async (req) => smCmd.setShippingMethodTaxLines(db, req.body)),
  );
  app.post(
    '/commands/shipping-method/set-adjustments',
    wrap(async (req) => smCmd.setShippingMethodAdjustments(db, req.body)),
  );

  // Commands — credit lines
  app.post('/commands/credit-line/add', wrap(async (req) => clCmd.addCreditLine(db, req.body)));
  app.post('/commands/credit-line/remove', wrap(async (req) => clCmd.removeCreditLine(db, req.body)));

  // Error handler — must come last and use 4-arg signature
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError) {
      res.status(statusFor(err.code)).json({ error: err.toJSON() });
      return;
    }
    // SQLite/PG check-constraint surfaces as engine-specific error; map roughly
    const msg = String(err?.message ?? err);
    if (/CHECK constraint failed|violates check constraint/i.test(msg)) {
      res.status(422).json({ error: { code: 'check-constraint', message: msg } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'internal', message: msg } });
  });

  return app;
}
