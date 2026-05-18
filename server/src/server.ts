import Fastify from "fastify"
import cors from "@fastify/cors"
import { createDb, migrate } from "./db/connection.js"
import { attachRole } from "./auth/role.js"
import { makeCartRepository } from "./cart/cart/repository.js"
import { makeCommandService } from "./cart/cart/commands.js"
import { makeQueryService } from "./cart/cart/queries.js"
import { registerCartRoutes } from "./cart/cart/handlers.js"

export const buildApp = async () => {
  const app = Fastify({ logger: process.env.LOG !== "0" })
  await app.register(cors, { origin: true, credentials: true, exposedHeaders: ["x-role"] })

  app.addHook("preHandler", attachRole)

  const db = createDb()
  await migrate(db)

  const repo = makeCartRepository(db)
  const commands = makeCommandService(repo)
  const queries = makeQueryService(db, repo)

  registerCartRoutes(app, commands, queries)

  app.get("/health", async () => ({ status: "ok" }))

  return { app, db, commands, queries, repo }
}

const port = Number(process.env.PORT ?? 4000)
const isMain = import.meta.url === `file://${process.argv[1]}`

if (isMain) {
  buildApp().then(async ({ app }) => {
    try {
      await app.listen({ port, host: "0.0.0.0" })
      app.log.info(`server listening on http://localhost:${port}`)
    } catch (e) {
      app.log.error(e)
      process.exit(1)
    }
  })
}
