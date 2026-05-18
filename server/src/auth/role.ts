import type { FastifyReply, FastifyRequest } from "fastify"

export type Role = "Customer" | "Automation" | "Admin"

export const allRoles: Role[] = ["Customer", "Automation", "Admin"]

declare module "fastify" {
  interface FastifyRequest {
    role?: Role
  }
}

export const resolveRole = (req: FastifyRequest): Role => {
  const header = req.headers["x-role"]
  const raw = Array.isArray(header) ? header[0] : header
  if (raw && allRoles.includes(raw as Role)) return raw as Role
  return (process.env.DEFAULT_ROLE as Role) ?? "Customer"
}

export const attachRole = async (req: FastifyRequest, _reply: FastifyReply) => {
  req.role = resolveRole(req)
}

export const requireRole = (allowed: Role[]) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const role = req.role ?? resolveRole(req)
    if (!allowed.includes(role)) {
      return reply.code(403).send({
        error: "Forbidden",
        message: `Role '${role}' is not permitted for this action. Allowed roles: ${allowed.join(", ")}.`,
      })
    }
  }
}
