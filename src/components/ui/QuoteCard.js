import { STATUS_CONFIG } from "./StatusBadge"
import { Send, Camera, Copy, MoreHorizontal, Loader2, Eye } from "lucide-react"

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
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days} jours`
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
    return new Date(dateStr).toLocaleDateString("fr-BE")
  }

  const status = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft
  const price = formatPrice
    ? formatPrice(quote.total_incl_vat)
    : `${quote.total_incl_vat?.toFixed(2)} €`

  const actionBtnStyle = {
    width: 36, height: 36,
    borderRadius: 10,
    border: "none",
    background: "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    color: "#94A3B8",
    transition: "background 0.15s, color 0.15s",
    flexShrink: 0,
  }

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 20,
      padding: 20,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      border: "1.5px solid #F5F0E8",
      minWidth: 0,
      overflow: "hidden",
    }}>

      {/* Ligne 1 : référence + montant */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: "#94A3B8", letterSpacing: "0.08em",
            textTransform: "uppercase", whiteSpace: "nowrap",
          }}>
            {quoteRef}
          </span>
          {quote.viewed_at && (
            <Eye size={12} style={{ color: "#F59E0B", flexShrink: 0 }} />
          )}
          {quote.internal_notes && (
            <span style={{ fontSize: 11, flexShrink: 0 }}>📝</span>
          )}
          {(quote.job_photos?.[0]?.count ?? 0) > 0 && (
            <span style={{ fontSize: 11, flexShrink: 0 }}>📸</span>
          )}
        </div>
        <span style={{
          fontSize: 18, fontWeight: 800,
          color: "#0F172A", whiteSpace: "nowrap",
          flexShrink: 0, marginLeft: 12,
          fontFamily: "'Bebas Neue', 'Figtree', sans-serif",
          letterSpacing: "0.5px",
        }}>
          {price}
        </span>
      </div>

      {/* Ligne 2 : nom client */}
      <p style={{
        fontSize: 16, fontWeight: 700,
        color: "#0F172A", margin: "0 0 4px 0",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {quote.client_name}
      </p>

      {/* Ligne 3 : titre devis */}
      <p style={{
        fontSize: 13, color: "#64748B",
        margin: "0 0 14px 0",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {quote.title}
      </p>

      {/* Ligne 4 : date + badge statut */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16,
        gap: 8,
      }}>
        <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
          {timeAgo(quote.created_at)}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 12px", borderRadius: 20,
          fontSize: 12, fontWeight: 700,
          backgroundColor: status.bg, color: status.text,
          whiteSpace: "nowrap", flexShrink: 0,
          fontFamily: "'Figtree', sans-serif",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: status.dot, flexShrink: 0,
          }} />
          {status.label}
        </span>
      </div>

      {/* Séparateur */}
      <div style={{ height: 1, background: "#F5F0E8", marginBottom: 14 }} />

      {/* Ligne 5 : actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {onSend && (
          <button
            onClick={(e) => { e.stopPropagation(); onSend(quote) }}
            disabled={sendingId === quote.id}
            title="Envoyer le devis"
            style={{
              ...actionBtnStyle,
              opacity: sendingId === quote.id ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              if (sendingId !== quote.id) {
                e.currentTarget.style.background = "rgba(245,158,11,0.1)"
                e.currentTarget.style.color = "#F59E0B"
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "#94A3B8"
            }}
          >
            {sendingId === quote.id
              ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              : <Send size={15} />}
          </button>
        )}
        {onPhotos && (
          <button
            onClick={(e) => { e.stopPropagation(); onPhotos(quote) }}
            title="Photos du chantier"
            style={actionBtnStyle}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(245,158,11,0.1)"
              e.currentTarget.style.color = "#F59E0B"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "#94A3B8"
            }}
          >
            <Camera size={15} />
          </button>
        )}
        {onNotes && (
          <button
            onClick={(e) => { e.stopPropagation(); onNotes(quote) }}
            title="Dupliquer"
            style={actionBtnStyle}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(245,158,11,0.1)"
              e.currentTarget.style.color = "#F59E0B"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "#94A3B8"
            }}
          >
            <Copy size={15} />
          </button>
        )}
        {onMenu && (
          <button
            onClick={(e) => { e.stopPropagation(); onMenu(e, quote) }}
            title="Plus d'actions"
            style={actionBtnStyle}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(245,158,11,0.1)"
              e.currentTarget.style.color = "#F59E0B"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "#94A3B8"
            }}
          >
            <MoreHorizontal size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
