import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import * as schema from "../../db/schema.js"
import { schemaDdl } from "../../db/schema-ddl.js"
import { makeCartRepository } from "./repository.js"
import { makeCommandService } from "./commands.js"
import { makeQueryService } from "./queries.js"
import { eventBus, type DomainEvent } from "../../events/bus.js"

export type TestEnv = {
  client: PGlite
  db: ReturnType<typeof drizzle<typeof schema>>
  repo: ReturnType<typeof makeCartRepository>
  commands: ReturnType<typeof makeCommandService>
  queries: ReturnType<typeof makeQueryService>
  events: DomainEvent[]
  cleanup: () => Promise<void>
}

export const setupTestEnv = async (): Promise<TestEnv> => {
  const client = new PGlite()
  await client.exec(schemaDdl)
  const db = drizzle(client, { schema })

  const repo = makeCartRepository(db)
  const commands = makeCommandService(repo)
  const queries = makeQueryService(db, repo)

  const events: DomainEvent[] = []
  const off = eventBus.on("*", (e) => {
    events.push(e)
  })

  return {
    client,
    db,
    repo,
    commands,
    queries,
    events,
    cleanup: async () => {
      off()
      await client.close()
    },
  }
}
