import { useEffect } from "react"

export type ToastTone = "success" | "error" | "info"

export type ToastInput = {
  id?: string
  tone: ToastTone
  title: string
  description?: string
}

export type Toast = ToastInput & { id: string }

export const Toaster = ({
  toasts,
  dismiss,
}: {
  toasts: Toast[]
  dismiss: (id: string) => void
}) => {
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  )
}

const ToastItem = ({
  toast,
  dismiss,
}: {
  toast: Toast
  dismiss: (id: string) => void
}) => {
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, dismiss])

  const tone =
    toast.tone === "success"
      ? "ring-accent-400 bg-accent-50"
      : toast.tone === "error"
        ? "ring-rose-400 bg-rose-50"
        : "ring-ink-200 bg-white"

  return (
    <div
      className={`pointer-events-auto card flex w-80 items-start gap-3 p-4 ring-1 ${tone}`}
    >
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink-800">{toast.title}</div>
        {toast.description ? (
          <div className="mt-0.5 text-xs text-ink-600">{toast.description}</div>
        ) : null}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="text-ink-300 hover:text-ink-600"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
