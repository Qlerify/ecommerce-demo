import { useCallback, useState } from "react"
import { CustomerStorefront } from "./views/CustomerStorefront"
import { AutomationConsole } from "./views/AutomationConsole"
import { Toaster, type Toast, type ToastTone } from "./components/Toast"
import { setRole, getRole } from "./api"

type Lane = "Customer" | "Automation"

export const App = () => {
  const [lane, setLane] = useState<Lane>(getRole() === "Automation" ? "Automation" : "Customer")
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = useCallback((tone: ToastTone, title: string, description?: string) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, tone, title, description }])
  }, [])
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const switchLane = (next: Lane) => {
    setRole(next)
    setLane(next)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-ink-900 flex items-center justify-center text-white text-sm font-bold">
              M
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Medusa Cart</div>
              <div className="text-xs text-ink-500">
                Cart bounded context · generated from Qlerify
              </div>
            </div>
          </div>
          <nav className="inline-flex rounded-lg bg-ink-100 p-1 text-sm">
            <button
              onClick={() => switchLane("Customer")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                lane === "Customer" ? "bg-white shadow-sm" : "text-ink-500 hover:text-ink-700"
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => switchLane("Automation")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                lane === "Automation"
                  ? "bg-white shadow-sm"
                  : "text-ink-500 hover:text-ink-700"
              }`}
            >
              Automation
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {lane === "Customer" ? (
          <CustomerStorefront onToast={pushToast} />
        ) : (
          <AutomationConsole onToast={pushToast} />
        )}
      </main>

      <Toaster toasts={toasts} dismiss={dismissToast} />
    </div>
  )
}
