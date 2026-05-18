import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { requireRole, type Role } from "../../auth/role.js"
import { eventBus } from "../../events/bus.js"
import type { CommandService } from "./commands.js"
import { DomainError, isDomainError } from "./errors.js"
import type { QueryService } from "./queries.js"

const handleError = (e: unknown, reply: FastifyReply) => {
  if (isDomainError(e)) {
    const status =
      e.type === "NOT_FOUND"
        ? 404
        : e.type === "CONFLICT"
          ? 409
          : e.type === "NOT_ALLOWED"
            ? 403
            : 400
    return reply.code(status).send({ error: e.type, message: e.message, details: e.details })
  }
  reply.log.error(e)
  return reply.code(500).send({ error: "INTERNAL_ERROR", message: "Unexpected error" })
}

const wrap =
  <T>(action: (body: T, req: FastifyRequest) => Promise<unknown>) =>
  async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await action(req.body as T, req)
      return reply.send(result)
    } catch (e) {
      return handleError(e, reply)
    }
  }

const customerLane: Role[] = ["Customer", "Admin"]
const automationLane: Role[] = ["Automation", "Admin"]

export const registerCartRoutes = (
  app: FastifyInstance,
  commands: CommandService,
  queries: QueryService
) => {
  app.get(
    "/api/carts",
    async (req: FastifyRequest<{ Querystring: Record<string, string> }>, reply) => {
      try {
        const q = req.query
        const carts = await queries.listCarts({
          customerId: q.customerId,
          regionId: q.regionId,
          salesChannelId: q.salesChannelId,
          completed:
            q.completed === "true" ? true : q.completed === "false" ? false : undefined,
          limit: q.limit ? Number(q.limit) : 50,
          offset: q.offset ? Number(q.offset) : 0,
        })
        return reply.send({ carts })
      } catch (e) {
        return handleError(e, reply)
      }
    }
  )

  app.get(
    "/api/carts/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      try {
        const cart = await queries.getCart(req.params.id)
        return reply.send({ cart })
      } catch (e) {
        return handleError(e, reply)
      }
    }
  )

  app.get(
    "/api/line-items",
    async (req: FastifyRequest<{ Querystring: Record<string, string> }>, reply) => {
      try {
        const items = await queries.listLineItems({
          cartId: req.query.cartId,
          variantId: req.query.variantId,
          productId: req.query.productId,
        })
        return reply.send({ items })
      } catch (e) {
        return handleError(e, reply)
      }
    }
  )

  app.get(
    "/api/shipping-methods",
    async (req: FastifyRequest<{ Querystring: Record<string, string> }>, reply) => {
      try {
        const shippingMethods = await queries.listShippingMethods({
          cartId: req.query.cartId,
          shippingOptionId: req.query.shippingOptionId,
        })
        return reply.send({ shippingMethods })
      } catch (e) {
        return handleError(e, reply)
      }
    }
  )

  app.get(
    "/api/credit-lines",
    async (req: FastifyRequest<{ Querystring: Record<string, string> }>, reply) => {
      try {
        const creditLines = await queries.listCreditLines({
          cartId: req.query.cartId,
          reference: req.query.reference,
          referenceId: req.query.referenceId,
        })
        return reply.send({ creditLines })
      } catch (e) {
        return handleError(e, reply)
      }
    }
  )

  app.get("/api/events", async (_req, reply) => {
    return reply.send({ events: eventBus.recent(50) })
  })

  app.post(
    "/api/carts",
    { preHandler: requireRole(customerLane) },
    wrap(async (body) => {
      const cart = await commands.createCart(body as never)
      return { cart }
    })
  )

  app.patch(
    "/api/carts/:id",
    { preHandler: requireRole(customerLane) },
    wrap(async (body, req) => {
      const params = (req.params as { id: string })
      const cart = await commands.updateCart({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.delete<{ Params: { id: string } }>(
    "/api/carts/:id",
    { preHandler: requireRole(automationLane) },
    async (req, reply) => {
      try {
        const result = await commands.deleteCart({ id: req.params.id })
        return reply.send({ ...result, deleted: true })
      } catch (e) {
        return handleError(e, reply)
      }
    }
  )

  app.post(
    "/api/carts/:id/line-items",
    { preHandler: requireRole(customerLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.addLineItems({ ...(body as object), id: params.id } as never)
      return { cart }
    })
  )

  app.patch(
    "/api/carts/:id/line-items",
    { preHandler: requireRole(customerLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.updateLineItems({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/line-items/remove",
    { preHandler: requireRole(customerLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.removeLineItems({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/shipping-methods",
    { preHandler: requireRole(customerLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.addShippingMethod({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.patch(
    "/api/carts/:id/shipping-methods",
    { preHandler: requireRole(customerLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.updateShippingMethod({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/shipping-methods/remove",
    { preHandler: requireRole(customerLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.removeShippingMethod({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/line-items/adjustments/set",
    { preHandler: requireRole(automationLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.setLineItemAdjustments({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/shipping-methods/adjustments/set",
    { preHandler: requireRole(automationLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.setShippingMethodAdjustments({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/line-items/tax-lines/set",
    { preHandler: requireRole(automationLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.setLineItemTaxLines({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/shipping-methods/tax-lines/set",
    { preHandler: requireRole(automationLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.setShippingMethodTaxLines({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )

  app.post(
    "/api/carts/:id/credit-lines",
    { preHandler: requireRole(automationLane) },
    wrap(async (body, req) => {
      const params = req.params as { id: string }
      const cart = await commands.manageCreditLines({
        ...(body as object),
        id: params.id,
      } as never)
      return { cart }
    })
  )
}

export { DomainError }
