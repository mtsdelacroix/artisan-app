import StatusBadge from "./StatusBadge"
import { FileText, Send, Camera, Copy, MoreHorizontal, Loader2, Eye } from "lucide-react"

export default function QuoteCard({
  quote,
  quoteRef,
  onSend,
  onPhotos,
  onNotes,
  onMenu,
  sendingId,
  formatPrice,
  brandColor,
  index = 0,
}) {
  const bc = brandColor || "#2563eb"

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days} jours`
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
    return new Date(dateStr).toLocaleDateString("fr-BE")
  }

  return (
    <div
      className={`bg-white rounded-2xl p-4 card-hover animate-fadeUp opacity-0 border border-gray-100/80 stagger-${Math.min(index + 1, 10)}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)" }}
    >
      {/* Header: icon + info + price */}
      <div className="flex items-start gap-3.5">
        {/* Document icon — larger */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${bc}12` }}
        >
          <FileText size={22} style={{ color: bc }} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{quoteRef}</span>
            {quote.viewed_at && <Eye className="w-3 h-3 text-amber-400" />}
            {quote.internal_notes && <span className="text-[10px]">📝</span>}
            {(quote.job_photos?.[0]?.count ?? 0) > 0 && <span className="text-[10px]">📸</span>}
          </div>
          <p className="font-semibold text-gray-900 truncate text-sm">{quote.client_name}</p>
          <p className="text-sm text-gray-500 truncate mt-0.5">{quote.title}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">{timeAgo(quote.created_at)}</span>
        </div>

        {/* Price — right aligned */}
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-gray-900 tracking-tight">
            {formatPrice ? formatPrice(quote.total_incl_vat) : `${quote.total_incl_vat?.toFixed(2)} €`}
          </p>
        </div>
      </div>

      {/* Actions + Status */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1">
          {onSend && (
            <button
              onClick={(e) => { e.stopPropagation(); onSend(quote) }}
              disabled={sendingId === quote.id}
              title="Envoyer le devis"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                quote.client_email
                  ? "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                  : "text-gray-200 cursor-not-allowed"
              }`}
            >
              {sendingId === quote.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          )}
          {onPhotos && (
            <button
              onClick={(e) => { e.stopPropagation(); onPhotos(quote) }}
              title="Photos du chantier"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-all duration-150"
            >
              <Camera size={14} />
            </button>
          )}
          {onNotes && (
            <button
              onClick={(e) => { e.stopPropagation(); onNotes(quote) }}
              title="Dupliquer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 transition-all duration-150"
            >
              <Copy size={14} />
            </button>
          )}
          {onMenu && (
            <button
              onClick={(e) => { e.stopPropagation(); onMenu(e, quote) }}
              title="Plus d'actions"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
            >
              <MoreHorizontal size={14} />
            </button>
          )}
        </div>
        <StatusBadge status={quote.status} />
      </div>
    </div>
  )
}
