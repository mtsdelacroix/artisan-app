"use client"

import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { CheckCircle, X, AlertTriangle, Info } from "lucide-react"

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

const ICONS = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: { bg: "#ECFDF5", border: "#D1FAE5", text: "#065F46" },
  error:   { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
  info:    { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
}

function ToastItem({ toast, onRemove }) {
  const Icon = ICONS[toast.type] || ICONS.info
  const s = STYLES[toast.type] || STYLES.info

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3000)
    return () => clearTimeout(timer)
  }, [toast, onRemove])

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl animate-[slideUp_0.25s_ease-out]"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text, boxShadow: "var(--shadow-card)" }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="p-0.5 hover:opacity-70 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-28 left-5 right-5 z-[100] flex flex-col gap-2 max-w-lg mx-auto pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onRemove={removeToast} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
