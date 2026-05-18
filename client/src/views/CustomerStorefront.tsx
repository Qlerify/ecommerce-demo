import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { products, shippingOptions, type Product, type Variant } from "../catalog"
import { formatMoney } from "../format"
import type { CartWithTotals } from "../types"

type Props = {
  onToast: (tone: "success" | "error" | "info", title: string, description?: string) => void
}

export const CustomerStorefront = ({ onToast }: Props) => {
  const [cart, setCart] = useState<CartWithTotals | null>(null)
  const [loading, setLoading] = useState(false)
  const [pickedVariants, setPickedVariants] = useState<Record<string, string>>({})

  const ensureCart = async () => {
    if (cart) return cart
    setLoading(true)
    try {
      const list = await api.listCarts()
      const open = list.carts.find(
        (c) => !c.completedAt && c.email !== null
      )
      if (open) {
        const full = await api.getCart(open.id)
        setCart(full.cart)
        return full.cart
      }
      const created = await api.createCart({
        email: "shopper@example.com",
        currencyCode: "USD",
        locale: "en-US",
        salesChannelId: "sc_storefront",
      })
      const full = await api.getCart(created.cart.id)
      setCart(full.cart)
      return full.cart
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ensureCart().catch((e) => onToast("error", "Could not load cart", String(e.message)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = async (id: string) => {
    const full = await api.getCart(id)
    setCart(full.cart)
  }

  const addToCart = async (product: Product, variant: Variant) => {
    try {
      const current = await ensureCart()
      await api.addLineItems(current.id, [
        {
          title: product.title,
          subtitle: product.subtitle,
          thumbnail: product.thumbnail,
          quantity: 1,
          unitPrice: variant.price,
          compareAtUnitPrice: variant.compareAtPrice,
          productId: product.id,
          productTitle: product.title,
          productHandle: product.handle,
          variantId: variant.id,
          variantSku: variant.sku,
          variantTitle: variant.title,
        },
      ])
      await refresh(current.id)
      onToast("success", `Added to cart`, `${product.title} – ${variant.title}`)
    } catch (e) {
      onToast("error", "Could not add to cart", (e as Error).message)
    }
  }

  const updateQuantity = async (lineItemId: string, quantity: number) => {
    if (!cart) return
    try {
      if (quantity <= 0) {
        await api.removeLineItems(cart.id, [{ id: lineItemId }])
      } else {
        await api.updateLineItems(cart.id, [{ id: lineItemId, quantity }])
      }
      await refresh(cart.id)
    } catch (e) {
      onToast("error", "Could not update item", (e as Error).message)
    }
  }

  const remove = async (lineItemId: string) => {
    if (!cart) return
    try {
      await api.removeLineItems(cart.id, [{ id: lineItemId }])
      await refresh(cart.id)
      onToast("info", "Removed from cart")
    } catch (e) {
      onToast("error", "Could not remove item", (e as Error).message)
    }
  }

  const pickShippingMethod = async (optionId: string) => {
    if (!cart) return
    const opt = shippingOptions.find((s) => s.id === optionId)
    if (!opt) return
    try {
      for (const sm of cart.shippingMethods) {
        await api.removeShippingMethod(cart.id, [{ id: sm.id }])
      }
      await api.addShippingMethod(cart.id, [
        { name: opt.name, amount: opt.amount, shippingOptionId: opt.id },
      ])
      await refresh(cart.id)
      onToast("success", "Shipping method updated", opt.name)
    } catch (e) {
      onToast("error", "Could not update shipping", (e as Error).message)
    }
  }

  const groupedCollections = useMemo(() => {
    const byCollection: Record<string, Product[]> = {}
    for (const p of products) {
      byCollection[p.collection] = byCollection[p.collection] ?? []
      byCollection[p.collection].push(p)
    }
    return Object.entries(byCollection)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <div className="space-y-10">
        {groupedCollections.map(([collection, items]) => (
          <section key={collection}>
            <header className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">{collection}</h2>
              <span className="text-sm text-ink-500">{items.length} pieces</span>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((product) => {
                const selectedId = pickedVariants[product.id] ?? product.variants[0].id
                const variant =
                  product.variants.find((v) => v.id === selectedId) ?? product.variants[0]
                return (
                  <div key={product.id} className="card overflow-hidden">
                    <div className="aspect-square w-full overflow-hidden bg-ink-100">
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-semibold">{product.title}</h3>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatMoney(variant.price, cart?.currencyCode ?? "USD")}
                          </div>
                          {variant.compareAtPrice ? (
                            <div className="text-xs text-ink-400 line-through">
                              {formatMoney(
                                variant.compareAtPrice,
                                cart?.currencyCode ?? "USD"
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-ink-500">{product.subtitle}</p>
                      <p className="mt-2 text-xs text-ink-500 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {product.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() =>
                              setPickedVariants({ ...pickedVariants, [product.id]: v.id })
                            }
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition ${
                              v.id === variant.id
                                ? "bg-ink-900 text-white ring-ink-900"
                                : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-100"
                            }`}
                          >
                            {v.title}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => addToCart(product, variant)}
                        disabled={loading}
                        className="btn-primary mt-4 w-full"
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="lg:sticky lg:top-6 self-start">
        <CartPanel
          cart={cart}
          loading={loading}
          onUpdateQuantity={updateQuantity}
          onRemove={remove}
          onPickShipping={pickShippingMethod}
        />
      </aside>
    </div>
  )
}

const CartPanel = ({
  cart,
  loading,
  onUpdateQuantity,
  onRemove,
  onPickShipping,
}: {
  cart: CartWithTotals | null
  loading: boolean
  onUpdateQuantity: (id: string, q: number) => void
  onRemove: (id: string) => void
  onPickShipping: (optionId: string) => void
}) => {
  const currency = cart?.currencyCode ?? "USD"
  const isEmpty = !cart || cart.items.length === 0
  const selectedShipping = cart?.shippingMethods[0]
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-ink-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Your cart</h3>
          {cart ? <span className="pill">{cart.items.length} items</span> : null}
        </div>
        {cart?.email ? (
          <p className="text-xs text-ink-500 mt-1">For {cart.email}</p>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="p-6 text-center text-sm text-ink-500">
          Your cart is empty. Add something from the catalog.
        </div>
      ) : (
        <div className="divide-y divide-ink-100">
          {cart!.items.map((it) => (
            <div key={it.id} className="flex gap-3 p-4">
              {it.thumbnail ? (
                <img
                  src={it.thumbnail}
                  alt={it.title}
                  className="h-16 w-16 rounded-lg object-cover ring-1 ring-ink-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-ink-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate font-medium">{it.title}</div>
                  <div className="text-sm font-semibold">
                    {formatMoney(it.itemTotal ?? it.unitPrice * it.quantity, currency)}
                  </div>
                </div>
                <div className="text-xs text-ink-500">{it.variantTitle}</div>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQuantity(it.id, it.quantity - 1)}
                    className="h-7 w-7 rounded-md bg-ink-100 text-ink-700 hover:bg-ink-200"
                    aria-label="Decrement"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium tabular-nums">
                    {it.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(it.id, it.quantity + 1)}
                    className="h-7 w-7 rounded-md bg-ink-100 text-ink-700 hover:bg-ink-200"
                    aria-label="Increment"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onRemove(it.id)}
                    className="ml-auto text-xs text-ink-500 hover:text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart && !isEmpty ? (
        <div className="border-t border-ink-100 p-4 space-y-3">
          <div>
            <label className="label">Shipping method</label>
            <div className="grid grid-cols-1 gap-2">
              {shippingOptions.map((opt) => {
                const active = selectedShipping?.shippingOptionId === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => onPickShipping(opt.id)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-ink-200 hover:bg-ink-50"
                    }`}
                  >
                    <span>{opt.name}</span>
                    <span className="font-semibold">
                      {opt.amount === 0 ? "Free" : formatMoney(opt.amount, currency)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <CartSummary cart={cart} loading={loading} />
        </div>
      ) : null}
    </div>
  )
}

const CartSummary = ({ cart, loading }: { cart: CartWithTotals; loading: boolean }) => {
  const t = cart.totals
  const currency = cart.currencyCode
  return (
    <div className="space-y-1.5 text-sm">
      <Row label="Items" value={formatMoney(t.itemSubtotal, currency)} />
      {t.itemDiscountTotal > 0 ? (
        <Row
          label="Item discounts"
          value={`− ${formatMoney(t.itemDiscountTotal, currency)}`}
          tone="muted"
        />
      ) : null}
      <Row label="Shipping" value={formatMoney(t.shippingTotal, currency)} />
      {t.taxTotal > 0 ? (
        <Row label="Tax" value={formatMoney(t.taxTotal, currency)} tone="muted" />
      ) : null}
      {t.creditLineTotal > 0 ? (
        <Row
          label="Credits applied"
          value={`− ${formatMoney(t.creditLineTotal, currency)}`}
          tone="muted"
        />
      ) : null}
      <div className="mt-2 flex items-baseline justify-between border-t border-ink-100 pt-2">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-semibold">{formatMoney(t.total, currency)}</span>
      </div>
      <button className="btn-primary mt-2 w-full" disabled={loading}>
        Checkout
      </button>
    </div>
  )
}

const Row = ({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "muted"
}) => (
  <div className="flex items-baseline justify-between">
    <span className={tone === "muted" ? "text-ink-500" : "text-ink-700"}>{label}</span>
    <span className={tone === "muted" ? "text-ink-500" : "text-ink-800 tabular-nums"}>
      {value}
    </span>
  </div>
)
