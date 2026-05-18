import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { formatMoney, formatRelative } from "../format"
import type { CartWithTotals, DomainEvent } from "../types"

type Props = {
  onToast: (tone: "success" | "error" | "info", title: string, description?: string) => void
}

export const AutomationConsole = ({ onToast }: Props) => {
  const [carts, setCarts] = useState<CartWithTotals[]>([])
  const [events, setEvents] = useState<DomainEvent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const [list, ev] = await Promise.all([api.listCarts(), api.recentEvents()])
      setCarts(list.carts)
      setEvents(ev.events)
      if (!selectedId && list.carts[0]) setSelectedId(list.carts[0].id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh().catch((e) => onToast("error", "Could not load", e.message))
    const t = setInterval(() => {
      refresh().catch(() => {})
    }, 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = useMemo(
    () => carts.find((c) => c.id === selectedId) ?? null,
    [carts, selectedId]
  )

  const applyPromotion = async (cart: CartWithTotals) => {
    try {
      await api.setLineItemAdjustments(
        cart.id,
        cart.items.map((i) => ({
          id: i.id,
          adjustments: [
            {
              amount: Math.round(i.unitPrice * i.quantity * 0.1 * 100) / 100,
              code: "SPRING10",
              description: "Spring 10% off",
              promotionId: "promo_spring10",
              providerId: "demo",
            },
          ],
        }))
      )
      await refresh()
      onToast("success", "Promotion applied", "SPRING10 (10% off all items)")
    } catch (e) {
      onToast("error", "Could not apply promotion", (e as Error).message)
    }
  }

  const clearPromotions = async (cart: CartWithTotals) => {
    try {
      await api.setLineItemAdjustments(
        cart.id,
        cart.items.map((i) => ({ id: i.id, adjustments: [] }))
      )
      await refresh()
      onToast("info", "Promotions cleared")
    } catch (e) {
      onToast("error", "Could not clear promotions", (e as Error).message)
    }
  }

  const applyVat = async (cart: CartWithTotals) => {
    const rate = cart.currencyCode === "eur" ? 20 : cart.currencyCode === "sek" ? 25 : 8.875
    try {
      await api.setLineItemTaxLines(
        cart.id,
        cart.items.map((i) => ({
          id: i.id,
          taxLines: [
            {
              code: cart.currencyCode === "eur" ? "VAT" : "SALES",
              rate,
              description: cart.currencyCode === "eur" ? "VAT" : "Sales Tax",
              providerId: "demo",
            },
          ],
        }))
      )
      if (cart.shippingMethods.length) {
        await api.setShippingMethodTaxLines(
          cart.id,
          cart.shippingMethods.map((sm) => ({
            id: sm.id,
            taxLines: [
              {
                code: cart.currencyCode === "eur" ? "VAT" : "SALES",
                rate,
                providerId: "demo",
              },
            ],
          }))
        )
      }
      await refresh()
      onToast("success", `Tax applied (${rate}%)`)
    } catch (e) {
      onToast("error", "Could not apply tax", (e as Error).message)
    }
  }

  const applyGiftCard = async (cart: CartWithTotals) => {
    try {
      await api.manageCreditLines(cart.id, [
        {
          amount: 25,
          rawAmount: { value: "25.00", precision: 2 },
          reference: "gift_card",
          referenceId: `gc_${Math.random().toString(36).slice(2, 8)}`,
        },
      ])
      await refresh()
      onToast("success", "Gift card applied", "$25.00 credit")
    } catch (e) {
      onToast("error", "Could not apply gift card", (e as Error).message)
    }
  }

  const clearGiftCards = async (cart: CartWithTotals) => {
    if (cart.creditLines.length === 0) {
      onToast("info", "No gift cards to clear")
      return
    }
    try {
      await api.manageCreditLines(
        cart.id,
        cart.creditLines.map((cl) => ({ id: cl.id, _delete: true }))
      )
      await refresh()
      onToast("info", "Gift cards cleared")
    } catch (e) {
      onToast("error", "Could not clear gift cards", (e as Error).message)
    }
  }

  const deleteCart = async (cart: CartWithTotals) => {
    try {
      await api.deleteCart(cart.id)
      setSelectedId(null)
      await refresh()
      onToast("info", "Cart deleted")
    } catch (e) {
      onToast("error", "Could not delete cart", (e as Error).message)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6">
      <aside className="card overflow-hidden">
        <div className="border-b border-ink-100 p-4">
          <h3 className="font-semibold">Open carts</h3>
          <p className="text-xs text-ink-500 mt-1">
            {carts.length} total · auto-refreshing
          </p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-ink-100">
          {carts.length === 0 ? (
            <div className="p-4 text-sm text-ink-500">
              No carts yet. Switch to the Customer storefront to create one.
            </div>
          ) : null}
          {carts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full flex-col items-start gap-1 p-4 text-left text-sm transition ${
                c.id === selectedId ? "bg-ink-50" : "hover:bg-ink-50"
              }`}
            >
              <div className="font-medium">{c.email ?? "guest cart"}</div>
              <div className="text-xs text-ink-500">
                {c.items.length} items · {c.currencyCode.toUpperCase()}
              </div>
              <div className="text-xs font-semibold tabular-nums">
                {formatMoney(c.totals.total, c.currencyCode)}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="space-y-4">
        {selected ? (
          <>
            <div className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold">{selected.email ?? "Guest cart"}</h2>
                  <p className="text-sm text-ink-500">
                    {selected.id} · v{selected.version} ·{" "}
                    {formatRelative(selected.updatedAt)}
                  </p>
                </div>
                <span className="pill">{selected.currencyCode.toUpperCase()}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => applyPromotion(selected)} className="btn-secondary">
                  Apply 10% promotion
                </button>
                <button onClick={() => clearPromotions(selected)} className="btn-ghost">
                  Clear promotions
                </button>
                <button onClick={() => applyVat(selected)} className="btn-secondary">
                  Apply tax
                </button>
                <button onClick={() => applyGiftCard(selected)} className="btn-secondary">
                  Apply $25 gift card
                </button>
                <button onClick={() => clearGiftCards(selected)} className="btn-ghost">
                  Clear gift cards
                </button>
                <button
                  onClick={() => deleteCart(selected)}
                  className="btn-danger ml-auto"
                >
                  Delete cart
                </button>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold">Line items</h3>
              {selected.items.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">No items yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-ink-100">
                  {selected.items.map((it) => (
                    <li key={it.id} className="flex items-start gap-3 py-3">
                      {it.thumbnail ? (
                        <img
                          src={it.thumbnail}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover ring-1 ring-ink-200"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-ink-100" />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between font-medium">
                          <span>{it.title}</span>
                          <span className="tabular-nums">
                            {formatMoney(
                              it.itemTotal ?? it.unitPrice * it.quantity,
                              selected.currencyCode
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-ink-500">
                          {it.variantTitle} · qty {it.quantity} ·{" "}
                          {formatMoney(it.unitPrice, selected.currencyCode)} ea
                        </div>
                        {it.adjustments.length > 0 ? (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {it.adjustments.map((a) => (
                              <span
                                key={a.id}
                                className="pill bg-accent-50 text-accent-700"
                              >
                                {a.code ?? "PROMO"} −
                                {formatMoney(a.amount, selected.currencyCode)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {it.taxLines.length > 0 ? (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {it.taxLines.map((t) => (
                              <span key={t.id} className="pill">
                                {t.code} {t.rate}%
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold">Shipping & credits</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {selected.shippingMethods.length === 0 ? (
                  <li className="text-ink-500">No shipping method selected.</li>
                ) : (
                  selected.shippingMethods.map((sm) => (
                    <li
                      key={sm.id}
                      className="flex items-baseline justify-between rounded-md bg-ink-50 px-3 py-2"
                    >
                      <span>{sm.name}</span>
                      <span className="tabular-nums">
                        {formatMoney(sm.amount, selected.currencyCode)}
                      </span>
                    </li>
                  ))
                )}
                {selected.creditLines.map((cl) => (
                  <li
                    key={cl.id}
                    className="flex items-baseline justify-between rounded-md bg-accent-50 px-3 py-2"
                  >
                    <span>
                      {cl.reference ?? "credit"}{" "}
                      <span className="text-xs text-ink-500">{cl.referenceId}</span>
                    </span>
                    <span className="tabular-nums">
                      − {formatMoney(cl.amount, selected.currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Total
                  label="Subtotal"
                  value={formatMoney(selected.totals.itemSubtotal, selected.currencyCode)}
                />
                <Total
                  label="Discounts"
                  value={`− ${formatMoney(selected.totals.itemDiscountTotal, selected.currencyCode)}`}
                />
                <Total
                  label="Shipping"
                  value={formatMoney(selected.totals.shippingTotal, selected.currencyCode)}
                />
                <Total
                  label="Tax"
                  value={formatMoney(selected.totals.taxTotal, selected.currencyCode)}
                />
                <Total
                  label="Credits"
                  value={`− ${formatMoney(selected.totals.creditLineTotal, selected.currencyCode)}`}
                />
                <Total
                  label="Total"
                  value={formatMoney(selected.totals.total, selected.currencyCode)}
                  strong
                />
              </div>
            </div>
          </>
        ) : (
          <div className="card p-12 text-center text-sm text-ink-500">
            Select a cart to inspect or trigger automation.
          </div>
        )}
      </main>

      <aside className="card overflow-hidden lg:sticky lg:top-6 self-start">
        <div className="border-b border-ink-100 p-4">
          <h3 className="font-semibold">Recent domain events</h3>
          <p className="text-xs text-ink-500 mt-1">
            In-process bus · {events.length} captured
          </p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-ink-100">
          {events.length === 0 ? (
            <div className="p-4 text-sm text-ink-500">No events yet.</div>
          ) : null}
          {events.slice(0, 30).map((e, idx) => (
            <div key={`${e.cartId}-${e.occurredAt}-${idx}`} className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{e.name}</span>
                <span className="text-xs text-ink-400">{formatRelative(e.occurredAt)}</span>
              </div>
              <div className="text-xs text-ink-500">{e.cartId}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

const Total = ({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) => (
  <div
    className={`flex items-baseline justify-between rounded-md px-3 py-2 ${
      strong ? "bg-ink-900 text-white" : "bg-ink-50"
    }`}
  >
    <span className={strong ? "font-semibold" : "text-ink-600"}>{label}</span>
    <span className="font-semibold tabular-nums">{value}</span>
  </div>
)
