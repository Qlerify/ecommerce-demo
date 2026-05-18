import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import * as schema from "./schema.js"
import { schemaDdl } from "./schema-ddl.js"

const dbPath = process.env.PGLITE_PATH ?? "./.pglite"

let pgliteInstance: PGlite | null = null

export const getPglite = (): PGlite => {
  if (!pgliteInstance) {
    pgliteInstance = new PGlite(process.env.PGLITE_MEMORY === "1" ? undefined : dbPath)
  }
  return pgliteInstance
}

export const createDb = () => {
  const client = getPglite()
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

let migrated = false

export const migrate = async (_db: Db) => {
  if (migrated) return
  const client = getPglite()
  await client.exec(schemaDdl)
  migrated = true
}

export const resetDb = async (_db: Db) => {
  const client = getPglite()
  await client.exec(`
    TRUNCATE TABLE
      shipping_method_tax_lines,
      shipping_method_adjustments,
      line_item_tax_lines,
      line_item_adjustments,
      cart_credit_lines,
      cart_shipping_methods,
      cart_line_items,
      carts
    RESTART IDENTITY CASCADE;
  `)
}
