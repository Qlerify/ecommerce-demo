# Medusa Cart (Generated)

Generated from the Qlerify workflow **Medusa Cart** (`workflowId: 75d19947-1b0a-4e4b-a8dd-570862681788`).

This is a standalone implementation of the **Cart** bounded context from Medusa, generated directly from the domain model. It is intentionally decoupled from the Medusa monorepo so you can evolve it independently.

## Stack

- **Server**: Node 20 + TypeScript + Fastify + Drizzle ORM + PGlite (in-process Postgres) + Vitest
- **Client**: React + Vite + Tailwind CSS
- **Persistence**: PGlite — a full Postgres engine running in-process. No external server, no Docker. Swap the `DATABASE_URL` to point at a hosted Postgres for production.

## Layout

```
.qlerify/              source-of-truth: workflow.json and codegen.json anchor
server/                Fastify API + domain logic
  src/
    cart/cart/         Cart aggregate (types, invariants, commands, handlers, queries)
    db/                Drizzle schema + connection
    events/            in-process domain event bus
    auth/              pluggable auth middleware
    server.ts          Fastify app
    seed.ts            beautiful demo data
client/                React + Tailwind storefront and back-office
```

## Run it

```bash
pnpm install
pnpm seed         # one-time: load demo catalog and seed carts
pnpm dev          # starts server (4000) and client (5173)
```

Then open http://localhost:5173.

## Test

```bash
pnpm test
```

Tests are generated 1:1 from the model's Given-When-Then acceptance criteria. They are the source-of-truth contract; do not weaken them. If a test fails, the bug is in the code, not the test.

## Authentication

`server/src/auth/role.ts` reads the caller's role from the `x-role` header. This is a **pluggable middleware**: swap it for JWT / session / OAuth before deploying. Handler code does not change.

## Roles

- **Customer** — owns cart-level mutations (create, update, line items, shipping methods)
- **Automation** — owns derived mutations (adjustments, tax lines, credit lines, deletion)

## Re-generating

The `.qlerify/workflow.json` is the cached domain model. `.qlerify/codegen.json` records the stack + persistence decisions so future runs of the code-generation skill apply model deltas as targeted patches instead of regenerating from scratch.
