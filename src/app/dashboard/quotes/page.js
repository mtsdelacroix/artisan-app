"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  Plus, Loader2, Download, Trash2, Edit,
  Copy, Search, X,
} from "lucide-react"
import { dropdownShadow } from "@/styles/design-system"
import { STATUS_CONFIG } from "@/components/ui/StatusBadge"
import QuoteCard from "@/components/ui/QuoteCard"
import EmptyState from "@/components/ui/EmptyState"
import ConfirmModal from "@/components/ui/ConfirmModal"

const FILTERS = [
  { value: "all",         label: "Tous" },
  { value: "draft",       label: "Brouillon" },
  { value: "sent",        label: "Envoyé" },
  { value: "viewed",      label: "Vu" },
  { value: "accepted",    label: "Accepté" },
  { value: "in_progress", label: "En cours" },
  { value: "completed",   label: "Réalisé" },
  { value: "refused",     label: "Refusé" },
]

export default function QuotesPage() {
  const [quotes, setQuotes]               = useState([])
  const [profile, setProfile]             = useState(null)
  const [isLoading, setIsLoading]         = useState(true)
  const [mounted, setMounted]             = useState(false)
  const [filter, setFilter]               = useState("all")
  const [searchQuery, setSearchQuery]     = useState("")
  const [downloadingId, setDownloadingId] = useState(null)
  const [sendingId, setSendingId]         = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmSend, setConfirmSend]     = useState(null)
  const [statusMenuId, setStatusMenuId]   = useState(null)
  const [duplicatingId, setDuplicatingId] = useState(null)
  const [openMenuId, setOpenMenuId]       = useState(null)
  const [menuPos, setMenuPos]             = useState(null)
  const router = useRouter()

  const brandColor = "#F59E0B"

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    const { data: profileData } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
    setProfile(profileData)
    if (profileData) {
      const { data: all } = await supabase
        .from("quotes").select("*, job_photos(count)")
        .eq("artisan_id", profileData.id)
        .order("created_at", { ascending: true })
      const numbered = (all || []).map((q, i) => {
        const year = new Date(q.created_at).getFullYear()
        return { ...q, quoteRef: `DEV-${year}-${String(i + 1).padStart(3, "0")}` }
      })
      setQuotes(numbered.reverse())
    }
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  useEffect(() => {
    const close = () => setStatusMenuId(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [])

  const handleDownloadPdf = async (quote) => {
    setDownloadingId(quote.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id, accessToken: session?.access_token }),
      })
      if (!res.ok) { const e = await res.json(); alert("Erreur PDF : " + (e.error || "inconnu")); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || `${quote.quoteRef}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert("Erreur réseau : " + err.message) }
    setDownloadingId(null)
  }

  const handleSendEmail = async () => {
    if (!confirmSend) return
    const quote = confirmSend
    setConfirmSend(null)
    setSendingId(quote.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id, accessToken: session?.access_token }),
      })
      const data = await res.json()
      if (!res.ok) { alert("Erreur envoi : " + (data.error || "inconnu")) }
      else { setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: "sent" } : q)) }
    } catch (err) { alert("Erreur réseau : " + err.message) }
    setSendingId(null)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setConfirmDelete(null)
    const { error } = await supabase.from("quotes").delete().eq("id", id)
    if (error) { alert("Erreur suppression : " + error.message) }
    else { setQuotes(prev => prev.filter(q => q.id !== id)) }
  }

  const handleDuplicate = async (quote) => {
    setDuplicatingId(quote.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase.from("artisans").select("id").eq("user_id", user.id).single()
      const { data: newQuote, error } = await supabase.from("quotes").insert({
        artisan_id: profileData.id,
        title: `${quote.title} (copie)`,
        description: quote.description,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_address: quote.client_address,
        client_vat_number: quote.client_vat_number || null,
        items: quote.items,
        vat_rate: quote.vat_rate,
        validity_days: quote.validity_days,
        notes: quote.notes,
        conditions: quote.conditions,
        subtotal_excl_vat: quote.subtotal_excl_vat,
        total_vat: quote.total_vat,
        total_incl_vat: quote.total_incl_vat,
        status: "draft",
      }).select().single()
      if (error) { alert("Erreur duplication : " + error.message); return }
      router.push(`/dashboard/quotes/${newQuote.id}`)
    } catch (err) { alert("Erreur : " + err.message) }
    setDuplicatingId(null)
  }

  const handleStatusChange = async (quoteId, newStatus) => {
    setStatusMenuId(null)
    const { error } = await supabase.from("quotes").update({
      status: newStatus,
      status_updated_at: new Date().toISOString(),
    }).eq("id", quoteId)
    if (error) { alert("Erreur mise à jour statut : " + error.message); return }
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q))
  }

  // Filter + search
  let filtered = filter === "all" ? quotes : quotes.filter(q => q.status === filter)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(quote =>
      quote.title?.toLowerCase().includes(q) ||
      quote.client_name?.toLowerCase().includes(q) ||
      quote.quoteRef?.toLowerCase().includes(q)
    )
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#FDFAF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@300;400;500;600;700&display=swap');`}</style>
        <Loader2 style={{ width: 28, height: 28, color: "#F59E0B", animation: "spin 1s linear infinite" }} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@300;400;500;600;700&display=swap');

        .qp-root {
          min-height: 100dvh;
          background: #FDFAF5;
          font-family: 'Figtree', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .qp-inner {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 20px 100px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .qp-inner.in { opacity: 1; transform: translateY(0); }

        /* ── Header ── */
        .qp-header {
          padding-top: 52px;
          padding-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .qp-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          color: #0F172A;
          letter-spacing: 1.5px;
          line-height: 1;
        }
        .qp-new-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 42px;
          padding: 0 18px;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          border: none;
          border-radius: 12px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          letter-spacing: 1.5px;
          color: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(245,158,11,0.32);
          transition: transform 0.15s, box-shadow 0.15s;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .qp-new-btn::after {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          animation: qp-shimmer 3.5s ease-in-out infinite;
        }
        @keyframes qp-shimmer {
          0% { left: -100%; }
          50%, 100% { left: 160%; }
        }
        .qp-new-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 20px rgba(245,158,11,0.48); }
        .qp-new-btn:active { transform: translateY(0) scale(0.98); }

        /* ── Search ── */
        .qp-search-wrap {
          position: relative;
          margin-bottom: 14px;
        }
        .qp-search-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          display: flex; align-items: center;
          pointer-events: none;
        }
        .qp-search-clear {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: #E2E8F0;
          border: none; border-radius: 50%;
          width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #64748B;
          transition: background 0.15s;
        }
        .qp-search-clear:hover { background: #CBD5E1; }
        .qp-search {
          width: 100%; height: 48px;
          background: #FFFFFF;
          border: 1.5px solid #F0EDE6;
          border-radius: 14px;
          padding: 0 40px 0 42px;
          font-family: 'Figtree', sans-serif;
          font-size: 14px; color: #0F172A;
          outline: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none; appearance: none;
        }
        .qp-search::placeholder { color: #CBD5E1; }
        .qp-search:focus {
          border-color: rgba(245,158,11,0.4);
          box-shadow: 0 0 0 3px rgba(245,158,11,0.08), 0 1px 3px rgba(0,0,0,0.05);
        }

        /* ── Filter chips ── */
        .qp-chips {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 20px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          /* extend to edges */
          margin-left: -20px;
          margin-right: -20px;
          padding-left: 20px;
          padding-right: 20px;
        }
        .qp-chips::-webkit-scrollbar { display: none; }
        .qp-chip {
          flex-shrink: 0;
          height: 34px;
          padding: 0 14px;
          border-radius: 20px;
          border: none;
          font-family: 'Figtree', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.1s;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .qp-chip.active {
          background: #F59E0B;
          color: #FFFFFF;
          box-shadow: 0 2px 10px rgba(245,158,11,0.35);
        }
        .qp-chip.inactive {
          background: #FFFFFF;
          color: #64748B;
          border: 1.5px solid #F0EDE6;
        }
        .qp-chip.inactive:hover { background: #FDF8EF; color: #0F172A; transform: translateY(-1px); }
        .qp-chip-count {
          font-size: 10px;
          font-weight: 800;
          opacity: 0.6;
        }

        /* ── Quote list ── */
        .qp-list { display: flex; flex-direction: column; gap: 10px; }

        /* ── Results count ── */
        .qp-results-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: #94A3B8;
          margin-bottom: 12px;
          font-family: 'Figtree', sans-serif;
        }

        /* ── Dropdown ── */
        .qp-dropdown {
          position: fixed; z-index: 60;
          background: #FFFFFF;
          border-radius: 16px;
          padding: 6px;
          min-width: 190px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06);
          border: 1.5px solid #F0EDE6;
        }
        .qp-dropdown-item {
          width: 100%; text-align: left;
          padding: 10px 12px;
          border-radius: 10px; border: none;
          background: transparent;
          font-family: 'Figtree', sans-serif;
          font-size: 14px; font-weight: 500; color: #334155;
          cursor: pointer;
          display: flex; align-items: center; gap: 10px;
          transition: background 0.1s;
        }
        .qp-dropdown-item:hover { background: #FAFAF8; }
        .qp-dropdown-item:disabled { opacity: 0.45; cursor: not-allowed; }
        .qp-dropdown-item.danger { color: #EF4444; }
        .qp-dropdown-item.danger:hover { background: #FEF2F2; }
        .qp-dropdown-sep { height: 1px; background: #F5F0E8; margin: 4px 8px; }

        /* ── Status menu ── */
        .qp-status-menu {
          position: absolute;
          right: 0; top: 8px;
          z-index: 20;
          background: #FFFFFF;
          border-radius: 14px;
          padding: 6px;
          min-width: 155px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border: 1.5px solid #F0EDE6;
        }
        .qp-status-item {
          width: 100%; text-align: left;
          padding: 8px 10px; border-radius: 8px; border: none;
          background: transparent;
          font-family: 'Figtree', sans-serif;
          font-size: 12px; font-weight: 700;
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; color: #334155;
          transition: background 0.1s;
        }
        .qp-status-item:hover { background: #FAFAF8; }

        /* ── Noise ── */
        .qp-noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.018;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 192px;
        }
      `}</style>

      <div className="qp-noise" aria-hidden="true" />

      {/* ── Dropdown backdrop ── */}
      {openMenuId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 59 }} onClick={() => { setOpenMenuId(null); setMenuPos(null) }} />
      )}

      {/* ── Dropdown actions ── */}
      {openMenuId && menuPos && (() => {
        const quote = quotes.find(q => q.id === openMenuId)
        if (!quote) return null
        return (
          <div className="qp-dropdown" style={{ top: menuPos.top, right: menuPos.right }} onClick={e => e.stopPropagation()}>
            <button className="qp-dropdown-item" onClick={() => { setOpenMenuId(null); setMenuPos(null); router.push(`/dashboard/quotes/${quote.id}`) }}>
              <Edit size={15} color="#94A3B8" />Modifier
            </button>
            <button className="qp-dropdown-item" disabled={duplicatingId === quote.id} onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDuplicate(quote) }}>
              {duplicatingId === quote.id
                ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite", color: "#94A3B8" }} />
                : <Copy size={15} color="#94A3B8" />}
              Dupliquer
            </button>
            <button className="qp-dropdown-item" disabled={downloadingId === quote.id} onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDownloadPdf(quote) }}>
              {downloadingId === quote.id
                ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite", color: "#94A3B8" }} />
                : <Download size={15} color="#94A3B8" />}
              PDF
            </button>
            <div className="qp-dropdown-sep" />
            <button className="qp-dropdown-item danger" onClick={() => { setOpenMenuId(null); setMenuPos(null); setConfirmDelete(quote) }}>
              <Trash2 size={15} />Supprimer
            </button>
          </div>
        )
      })()}

      {/* ── Modal suppression ── */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer le devis"
        confirmLabel="Supprimer"
        variant="danger"
        brandColor={brandColor}
      >
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 4 }}>Voulez-vous supprimer définitivement :</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{confirmDelete?.quoteRef} — {confirmDelete?.title}</p>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>Client : {confirmDelete?.client_name}</p>
      </ConfirmModal>

      {/* ── Modal envoi ── */}
      <ConfirmModal
        open={!!confirmSend}
        onClose={() => setConfirmSend(null)}
        onConfirm={handleSendEmail}
        title="Envoyer le devis"
        confirmLabel="Envoyer"
        brandColor={brandColor}
      >
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 6 }}>Envoyer à :</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{confirmSend?.client_name}</p>
        <p style={{ fontSize: 13, color: "#F59E0B", fontWeight: 500 }}>{confirmSend?.client_email}</p>
      </ConfirmModal>

      <div className="qp-root">
        <div className={`qp-inner${mounted ? " in" : ""}`}>

          {/* ── Header ── */}
          <div className="qp-header">
            <div className="qp-title">MES DEVIS</div>
            <button className="qp-new-btn" onClick={() => router.push("/dashboard/new-quote")}>
              <Plus size={16} strokeWidth={3} />
              NOUVEAU
            </button>
          </div>

          {/* ── Search bar ── */}
          <div className="qp-search-wrap">
            <div className="qp-search-icon">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par client, titre, référence..."
              className="qp-search"
            />
            {searchQuery && (
              <button className="qp-search-clear" onClick={() => setSearchQuery("")}>
                <X size={11} />
              </button>
            )}
          </div>

          {/* ── Filter chips ── */}
          <div className="qp-chips">
            {FILTERS.map(f => {
              const count = f.value === "all" ? quotes.length : quotes.filter(q => q.status === f.value).length
              const active = filter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`qp-chip ${active ? "active" : "inactive"}`}
                >
                  {f.label}
                  <span className="qp-chip-count">{count}</span>
                </button>
              )
            })}
          </div>

          {/* ── Results count ── */}
          {(searchQuery || filter !== "all") && filtered.length > 0 && (
            <div className="qp-results-label">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </div>
          )}

          {/* ── Quote cards ── */}
          {filtered.length === 0 ? (
            <EmptyState
              emoji={filter !== "all" || searchQuery ? "🔍" : "📄"}
              title={filter !== "all" || searchQuery ? "Aucun devis trouvé" : "Aucun devis pour l'instant"}
              subtitle={filter !== "all" || searchQuery ? "Essayez un autre filtre ou terme de recherche" : "Créez votre premier devis !"}
              action={filter === "all" && !searchQuery ? () => router.push("/dashboard/new-quote") : undefined}
              actionLabel="Créer un devis"
              brandColor={brandColor}
            />
          ) : (
            <div className="qp-list">
              {filtered.map((quote, idx) => (
                <div key={quote.id} style={{ position: "relative" }}>
                  <div onClick={() => router.push(`/dashboard/quotes/${quote.id}`)} style={{ cursor: "pointer" }}>
                    <QuoteCard
                      quote={quote}
                      quoteRef={quote.quoteRef}
                      onSend={(q) => {
                        if (!q.client_email) { alert("Veuillez renseigner l'email du client."); return }
                        setConfirmSend(q)
                      }}
                      onPhotos={(q) => router.push(`/dashboard/quotes/${q.id}?tab=photos`)}
                      onNotes={(q) => router.push(`/dashboard/quotes/${q.id}?tab=notes`)}
                      onMenu={(e, q) => {
                        e.stopPropagation()
                        if (openMenuId === q.id) { setOpenMenuId(null); setMenuPos(null); return }
                        const rect = e.currentTarget.getBoundingClientRect()
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                        setOpenMenuId(q.id)
                      }}
                      sendingId={sendingId}
                      brandColor={brandColor}
                      index={idx}
                    />
                  </div>

                  {/* Status change menu */}
                  {statusMenuId === quote.id && (
                    <div className="qp-status-menu" onClick={e => e.stopPropagation()}>
                      {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                        <button
                          key={val}
                          onClick={() => handleStatusChange(quote.id, val)}
                          className="qp-status-item"
                          style={{ opacity: quote.status === val ? 0.38 : 1, cursor: quote.status === val ? "default" : "pointer" }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
