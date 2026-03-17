import { X } from "lucide-react"
import { DS } from "@/styles/design-system"

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Confirmer",
  children,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "primary",
  brandColor,
}) {
  if (!open) return null

  const confirmStyle = variant === "danger"
    ? { backgroundColor: "#FEF2F2", color: "#EF4444" }
    : { backgroundColor: brandColor || "#2563eb", color: "#FFFFFF" }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm sm:mx-4 p-6 animate-[slideUp_0.25s_ease-out]"
        style={{ boxShadow: "var(--shadow-dropdown)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[#0F172A] tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-[#94A3B8] hover:text-[#64748B] rounded-lg hover:bg-[#F1F5F9] transition-all duration-150">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={DS.btnSecondary}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="w-full h-[52px] rounded-[14px] font-semibold text-sm tracking-[0.01em] transition-all duration-150 active:scale-[0.98]"
            style={confirmStyle}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
