import { makeKnex } from './knex.ts';
import { seed as seedFixtures } from './seeds/001_fixtures.ts';
import * as init from './migrations/001_init.ts';

const cmd = process.argv[2];

async function migrate() {
  const k = makeKnex();
  await init.up(k);
  await k.destroy();
  console.log('migrated');
}

async function seed() {
  const k = makeKnex();
  await seedFixtures(k);
  await k.destroy();
  console.log('seeded');
}

async function reset() {
  const k = makeKnex();
  try {
    await init.down(k);
  } catch {
    // ignore
  }
  await init.up(k);
  await seedFixtures(k);
  await k.destroy();
  console.log('reset');
}

const dispatch: Record<string, () => Promise<void>> = { migrate, seed, reset };
const fn = dispatch[cmd ?? ''];
if (!fn) {
  console.error(`usage: cli.ts <migrate|seed|reset>`);
  process.exit(1);
}
fn().catch((e) => {
  console.error(e);
  process.exit(1);
});
