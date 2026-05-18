export const formatMoney = (amount: number, currencyCode = "USD"): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      currencyDisplay: "narrowSymbol",
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currencyCode.toUpperCase()}`
  }
}

export const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
