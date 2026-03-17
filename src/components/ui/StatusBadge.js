import { ChevronDown } from "lucide-react"

export const STATUS_CONFIG = {
  draft:            { label: "Brouillon",    bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" },
  sent:             { label: "Envoyé",       bg: "#EFF6FF", text: "#3B82F6", dot: "#3B82F6" },
  viewed:           { label: "Vu",           bg: "#EFF6FF", text: "#3B82F6", dot: "#3B82F6" },
  accepted:         { label: "Accepté",      bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A" },
  waiting_deposit:  { label: "Acompte dû",   bg: "#FFF7ED", text: "#EA580C", dot: "#EA580C" },
  deposit_received: { label: "Acompte reçu", bg: "#FFF7ED", text: "#EA580C", dot: "#EA580C" },
  in_progress:      { label: "En cours",     bg: "#FAF5FF", text: "#9333EA", dot: "#9333EA" },
  waiting_balance:  { label: "Solde dû",     bg: "#FEFCE8", text: "#CA8A04", dot: "#CA8A04" },
  completed:        { label: "Réalisé",      bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A" },
  refused:          { label: "Refusé",       bg: "#FEF2F2", text: "#EF4444", dot: "#EF4444" },
  rejected:         { label: "Refusé",       bg: "#FEF2F2", text: "#EF4444", dot: "#EF4444" },
}

export default function StatusBadge({ status, onClick }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.draft

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity ${onClick ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
      {s.label}
      {onClick && <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />}
    </button>
  )
}
