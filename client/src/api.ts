import type { Cart, CartWithTotals, DomainEvent } from "./types"

let currentRole: "Customer" | "Automation" | "Admin" = "Customer"
export const setRole = (r: typeof currentRole) => {
  currentRole = r
}
export const getRole = () => currentRole

const fetchJson = async <T,>(input: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-role": currentRole,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail: { error?: string; message?: string } = {}
    try {
      detail = await res.json()
    } catch {}
    const err = new Error(detail.message ?? `Request failed: ${res.status}`)
    ;(err as { type?: string }).type = detail.error
    throw err
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  listCarts: () => fetchJson<{ carts: CartWithTotals[] }>("/api/carts"),
  getCart: (id: string) => fetchJson<{ cart: CartWithTotals }>(`/api/carts/${id}`),
  createCart: (body: Record<string, unknown>) =>
    fetchJson<{ cart: Cart }>("/api/carts", { method: "POST", body: JSON.stringify(body) }),
  updateCart: (id: string, body: Record<string, unknown>) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCart: (id: string) =>
    fetchJson<{ id: string; deleted: true }>(`/api/carts/${id}`, { method: "DELETE" }),
  addLineItems: (cartId: string, items: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/line-items`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  updateLineItems: (cartId: string, items: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/line-items`, {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),
  removeLineItems: (cartId: string, items: { id: string }[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/line-items/remove`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  addShippingMethod: (cartId: string, shippingMethods: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/shipping-methods`, {
      method: "POST",
      body: JSON.stringify({ shippingMethods }),
    }),
  updateShippingMethod: (cartId: string, shippingMethods: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/shipping-methods`, {
      method: "PATCH",
      body: JSON.stringify({ shippingMethods }),
    }),
  removeShippingMethod: (cartId: string, shippingMethods: { id: string }[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/shipping-methods/remove`, {
      method: "POST",
      body: JSON.stringify({ shippingMethods }),
    }),
  setLineItemAdjustments: (cartId: string, items: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/line-items/adjustments/set`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  setShippingMethodAdjustments: (cartId: string, shippingMethods: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/shipping-methods/adjustments/set`, {
      method: "POST",
      body: JSON.stringify({ shippingMethods }),
    }),
  setLineItemTaxLines: (cartId: string, items: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/line-items/tax-lines/set`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  setShippingMethodTaxLines: (cartId: string, shippingMethods: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/shipping-methods/tax-lines/set`, {
      method: "POST",
      body: JSON.stringify({ shippingMethods }),
    }),
  manageCreditLines: (cartId: string, creditLines: unknown[]) =>
    fetchJson<{ cart: Cart }>(`/api/carts/${cartId}/credit-lines`, {
      method: "POST",
      body: JSON.stringify({ creditLines }),
    }),
  recentEvents: () => fetchJson<{ events: DomainEvent[] }>("/api/events"),
}
