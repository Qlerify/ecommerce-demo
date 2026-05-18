export type DomainEventName =
  | "CartCreated"
  | "CartUpdated"
  | "CartDeleted"
  | "LineItemsAdded"
  | "LineItemsUpdated"
  | "LineItemsRemoved"
  | "ShippingMethodAdded"
  | "ShippingMethodUpdated"
  | "ShippingMethodRemoved"
  | "LineItemAdjustmentsSet"
  | "ShippingMethodAdjustmentsSet"
  | "LineItemTaxLinesSet"
  | "ShippingMethodTaxLinesSet"
  | "CreditLinesUpdated"

export type DomainEvent<T = unknown> = {
  name: DomainEventName
  cartId: string
  occurredAt: string
  payload: T
}

type Handler = (event: DomainEvent) => void | Promise<void>

class EventBus {
  private handlers: Map<DomainEventName | "*", Set<Handler>> = new Map()
  private history: DomainEvent[] = []
  private historyLimit = 500

  on(name: DomainEventName | "*", handler: Handler): () => void {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set())
    this.handlers.get(name)!.add(handler)
    return () => this.handlers.get(name)?.delete(handler)
  }

  async emit<T>(name: DomainEventName, cartId: string, payload: T): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      name,
      cartId,
      occurredAt: new Date().toISOString(),
      payload,
    }
    this.history.push(event as DomainEvent)
    if (this.history.length > this.historyLimit) {
      this.history.splice(0, this.history.length - this.historyLimit)
    }
    const specific = this.handlers.get(name) ?? new Set()
    const wildcard = this.handlers.get("*") ?? new Set()
    for (const h of specific) await h(event as DomainEvent)
    for (const h of wildcard) await h(event as DomainEvent)
    return event
  }

  recent(limit = 50): DomainEvent[] {
    return this.history.slice(-limit).reverse()
  }
}

export const eventBus = new EventBus()
