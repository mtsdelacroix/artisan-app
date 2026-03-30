"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  Plus, Loader2,
  Download, Trash2, Edit,
  Copy, Search,
} from "lucide-react"
import { DS, dropdownShadow } from "@/styles/design-system"
import { STATUS_CONFIG } from "@/components/ui/StatusBadge"
import QuoteCard from "@/components/ui/QuoteCard"
import EmptyState from "@/components/ui/EmptyState"
import ConfirmModal from "@/components/ui/ConfirmModal"
import PageHeader from "@/components/ui/PageHeader"

const FILTERS = [
  { value: "all",            label: "Tous" },
  { value: "draft",          label: "Brouillon" },
  { value: "sent",           label: "Envoyé" },
  { value: "viewed",         label: "Vu" },
  { value: "accepted",       label: "Accepté" },
  { value: "in_progress",    label: "En cours" },
  { value: "completed",      label: "Réalisé" },
  { value: "refused",        label: "Refusé" },
]

export default function QuotesPage() {
  const [quotes, setQuotes]               = useState([])
  const [profile, setProfile]             = useState(null)
  const [isLoading, setIsLoading]         = useState(true)
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

  const brandColor = profile?.brand_color || "#2563eb"

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

  useEffect(() => { loadData() }, [loadData])

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

  if (isLoading) {
    return <div className={`${DS.page} flex items-center justify-center`}><Loader2 className="w-7 h-7 animate-spin" style={{ color: brandColor }} /></div>
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

  return (
    <div className={DS.page}>
      {/* ── Dropdown backdrop ── */}
      {openMenuId && (
        <div className="fixed inset-0 z-[59]" onClick={() => { setOpenMenuId(null); setMenuPos(null) }} />
      )}

      {/* ── Dropdown actions ── */}
      {openMenuId && menuPos && (() => {
        const quote = quotes.find(q => q.id === openMenuId)
        if (!quote) return null
        return (
          <div
            className="fixed z-[60] bg-white rounded-2xl py-2 min-w-[190px]"
            style={{ top: menuPos.top, right: menuPos.right, ...dropdownShadow }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); router.push(`/dashboard/quotes/${quote.id}`) }} className="w-full text-left px-4 py-2.5 text-sm text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors duration-100">
              <Edit className="w-4 h-4 text-[#94A3B8]" />Modifier
            </button>
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDuplicate(quote) }} disabled={duplicatingId === quote.id} className="w-full text-left px-4 py-2.5 text-sm text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors duration-100 disabled:opacity-50">
              {duplicatingId === quote.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4 text-[#94A3B8]" />}Dupliquer
            </button>
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDownloadPdf(quote) }} disabled={downloadingId === quote.id} className="w-full text-left px-4 py-2.5 text-sm text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors duration-100 disabled:opacity-50">
              {downloadingId === quote.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#94A3B8]" />}PDF
            </button>
            <div className="h-px bg-[#F1F5F9] my-1 mx-3" />
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); setConfirmDelete(quote) }} className="w-full text-left px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-3 transition-colors duration-100">
              <Trash2 className="w-4 h-4" />Supprimer
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
        <p className="text-sm text-[#64748B] mb-1">Voulez-vous supprimer définitivement :</p>
        <p className="font-semibold text-[#0F172A] mb-1">{confirmDelete?.quoteRef} — {confirmDelete?.title}</p>
        <p className="text-sm text-[#94A3B8]">Client : {confirmDelete?.client_name}</p>
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
        <p className="text-sm text-[#64748B] mb-2">Envoyer à :</p>
        <p className="font-semibold text-[#0F172A] mb-1">{confirmSend?.client_name}</p>
        <p className="text-sm" style={{ color: brandColor }}>{confirmSend?.client_email}</p>
      </ConfirmModal>

      <div className={DS.container}>
        {/* ── Header ── */}
        <div className="pt-8">
          <PageHeader
            title="Mes devis"
            action={() => router.push("/dashboard/new-quote")}
            actionLabel="Nouveau"
            actionIcon={Plus}
            brandColor={brandColor}
          />
        </div>

        {/* ── Search bar ── */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un devis..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 transition-all duration-150"
            style={{ boxShadow: "var(--shadow-card)", focusRing: brandColor }}
          />
        </div>

        {/* ── Filter chips (scrollable) ── */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {FILTERS.map(f => {
            const count = f.value === "all" ? quotes.length : quotes.filter(q => q.status === f.value).length
            const active = filter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="shrink-0 h-[34px] px-4 rounded-[20px] text-[12px] font-semibold transition-all duration-150"
                style={active
                  ? { backgroundColor: brandColor, color: "#FFFFFF", boxShadow: `0 2px 8px ${brandColor}4D` }
                  : { backgroundColor: "#F1F5F9", color: "#64748B" }
                }
              >
                {f.label}
                <span
                  className="ml-1.5"
                  style={{ opacity: active ? 0.7 : 0.4 }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

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
          <div className="flex flex-col gap-3">
            {filtered.map((quote, idx) => (
              <div key={quote.id} className="relative">
                <div onClick={() => router.push(`/dashboard/quotes/${quote.id}`)} className="cursor-pointer">
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
                  <div
                    className="absolute right-0 top-2 z-20 bg-white rounded-2xl py-2 min-w-[150px]"
                    style={dropdownShadow}
                    onClick={e => e.stopPropagation()}
                  >
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <button
                        key={val}
                        onClick={() => handleStatusChange(quote.id, val)}
                        className={`w-full text-left px-3 py-2 text-[11px] font-semibold flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors duration-100 ${quote.status === val ? "opacity-40 cursor-default" : ""}`}
                      >
                        <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: cfg.dot }} />
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
  )
}
