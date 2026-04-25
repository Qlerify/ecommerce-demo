import { makeApp } from './http/app.ts';
import { makeKnex } from './db/knex.ts';

const db = makeKnex();
const app = makeApp(db);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`cart-demo listening on http://localhost:${port}`);
});
