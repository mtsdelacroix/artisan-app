"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  TrendingUp, Clock, CheckCircle, Send, Loader2,
  Plus, Download, X, Mic, MicOff, Copy, Trash2, Edit,
  MoreVertical, Eye, ArrowUpRight, User
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { DS, cardShadow, dropdownShadow } from "@/styles/design-system"
import StatCard from "@/components/ui/StatCard"
import QuoteCard from "@/components/ui/QuoteCard"
import EmptyState from "@/components/ui/EmptyState"

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const [sendingId, setSendingId] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [isListeningMsg, setIsListeningMsg] = useState(false)
  const msgRecognitionRef = useRef(null)
  const [selectedPeriod, setSelectedPeriod] = useState("3months")
  const [dashStats, setDashStats] = useState(null)
  const [sessionToken, setSessionToken] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: { session } } = await supabase.auth.getSession()
      setSessionToken(session?.access_token)

      const { data: profileData } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
      setProfile(profileData)

      if (profileData) {
        const { data: quotesData } = await supabase.from("quotes").select("*").eq("artisan_id", profileData.id).order("created_at", { ascending: true })
        setQuotes(quotesData || [])
      }
      setIsLoading(false)
    }
    loadData()
  }, [router])

  const handleDownloadPdf = async (quoteId) => {
    setDownloadingId(quoteId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, accessToken: session?.access_token }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert("Erreur PDF : " + (err.error || "inconnu"))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || "devis.pdf"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert("Erreur réseau : " + err.message)
    }
    setDownloadingId(null)
  }

  const openSendModal = (quote) => {
    if (!quote.client_email) {
      alert("Veuillez renseigner l'email du client avant d'envoyer le devis.")
      return
    }
    setConfirmModal({ quoteId: quote.id, clientEmail: quote.client_email, clientName: quote.client_name, message: profile?.default_message || "" })
  }

  const startMsgListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Reconnaissance vocale non supportée. Utilisez Chrome."); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"
    recognition.continuous = true
    recognition.interimResults = false
    msgRecognitionRef.current = recognition
    let final = ""
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " "
      }
    }
    recognition.onerror = (e) => {
      if (e.error === "language-not-supported") { recognition.lang = "fr-FR"; recognition.start(); return }
      setIsListeningMsg(false)
    }
    recognition.onend = () => {
      setIsListeningMsg(false)
      if (final.trim()) setConfirmModal(prev => ({ ...prev, message: (prev.message ? prev.message + " " : "") + final.trim() }))
    }
    recognition.start()
    setIsListeningMsg(true)
  }

  const stopMsgListening = () => msgRecognitionRef.current?.stop()

  const handleSendEmail = async () => {
    if (!confirmModal) return
    const { quoteId, message } = confirmModal
    setConfirmModal(null)
    setIsListeningMsg(false)
    msgRecognitionRef.current?.stop()
    setSendingId(quoteId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, accessToken: session?.access_token, message: message || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert("Erreur envoi : " + (data.error || "inconnu"))
      } else {
        setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "sent" } : q))
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message)
    }
    setSendingId(null)
  }

  const handleDuplicate = async (quote) => {
    if (!profile) return
    try {
      const { data: newQuote, error } = await supabase.from("quotes").insert({
        artisan_id: profile.id,
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
        conditions: quote.conditions || null,
        subtotal_excl_vat: quote.subtotal_excl_vat,
        total_vat: quote.total_vat,
        total_incl_vat: quote.total_incl_vat,
        status: "draft",
      }).select().single()
      if (error) { alert("Erreur duplication : " + error.message); return }
      router.push(`/dashboard/quotes/${newQuote.id}`)
    } catch (err) {
      alert("Erreur : " + err.message)
    }
  }

  const handleDelete = async (quoteId) => {
    if (!confirm("Supprimer ce devis définitivement ?")) return
    const { error } = await supabase.from("quotes").delete().eq("id", quoteId)
    if (error) { alert("Erreur suppression : " + error.message); return }
    setQuotes(prev => prev.filter(q => q.id !== quoteId))
  }

  useEffect(() => {
    if (!sessionToken) return
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/stats?accessToken=${sessionToken}&period=${selectedPeriod}`)
        if (res.ok) setDashStats(await res.json())
      } catch (_) {}
    }
    fetchStats()
  }, [selectedPeriod, sessionToken])

  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return "—"
    return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(amount)
  }

  const getQuoteRef = (quote, index) => {
    const year = new Date(quote.created_at).getFullYear()
    return `DEV-${year}-${String(index + 1).padStart(3, "0")}`
  }

  const today = new Date()
  const dayName = today.toLocaleDateString("fr-BE", { weekday: "long" })
  const dateStr = today.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })
  const brandColor = profile?.brand_color || "#2563eb"

  if (isLoading) {
    return (
      <div className={`${DS.page} flex items-center justify-center`}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: brandColor }} />
      </div>
    )
  }

  return (
    <div className={DS.page}>
      {/* ── Send email modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-[slideUp_0.25s_ease-out]"
            style={dropdownShadow}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#0F172A] tracking-tight">Envoyer le devis</h3>
              <button onClick={() => { setConfirmModal(null); msgRecognitionRef.current?.stop(); setIsListeningMsg(false) }} className="p-1.5 text-[#94A3B8] hover:text-[#64748B] rounded-lg hover:bg-[#F1F5F9] transition-all duration-150">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#64748B] mb-1">Destinataire :</p>
            <p className="font-semibold text-[#0F172A]">{confirmModal.clientName}</p>
            <p className="text-sm mb-5" style={{ color: brandColor }}>{confirmModal.clientEmail}</p>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className={DS.label + " mb-0"}>Message</label>
                <button
                  onClick={isListeningMsg ? stopMsgListening : startMsgListening}
                  className="relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{ backgroundColor: isListeningMsg ? "#EF4444" : brandColor }}
                  title={isListeningMsg ? "Arrêter la dictée" : "Dicter le message"}
                >
                  {isListeningMsg && <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: "#EF4444" }} />}
                  {isListeningMsg ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 text-white" />}
                </button>
              </div>
              <textarea
                value={confirmModal.message}
                onChange={e => setConfirmModal(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                placeholder="Message optionnel pour le client..."
                className={DS.textarea}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmModal(null); msgRecognitionRef.current?.stop(); setIsListeningMsg(false) }}
                className={DS.btnSecondary}
              >
                Annuler
              </button>
              <button onClick={handleSendEmail} className={DS.btnPrimary} style={{ backgroundColor: brandColor }}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dropdown backdrop ── */}
      {openMenuId && (
        <div className="fixed inset-0 z-[59]" onClick={() => { setOpenMenuId(null); setMenuPos(null) }} />
      )}
      {openMenuId && menuPos && (() => {
        const quote = quotes.find(q => q.id === openMenuId)
        if (!quote) return null
        return (
          <div
            className="fixed z-[60] bg-white rounded-2xl py-2 min-w-[190px]"
            style={{ top: menuPos.top, right: menuPos.right, ...dropdownShadow }}
          >
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); router.push(`/dashboard/quotes/${quote.id}`) }} className="w-full text-left px-4 py-2.5 text-sm text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors duration-100">
              <Edit className="w-4 h-4 text-[#94A3B8]" />Modifier
            </button>
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDuplicate(quote) }} className="w-full text-left px-4 py-2.5 text-sm text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors duration-100">
              <Copy className="w-4 h-4 text-[#94A3B8]" />Dupliquer
            </button>
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDownloadPdf(quote.id) }} disabled={downloadingId === quote.id} className="w-full text-left px-4 py-2.5 text-sm text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors duration-100 disabled:opacity-50">
              {downloadingId === quote.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#94A3B8]" />}PDF
            </button>
            <div className="h-px bg-[#F1F5F9] my-1 mx-3" />
            <button onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDelete(quote.id) }} className="w-full text-left px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-3 transition-colors duration-100">
              <Trash2 className="w-4 h-4" />Supprimer
            </button>
          </div>
        )
      })()}

      <div>
        {/* ── Header ── */}
        <div className="pt-8 pb-1 animate-fadeUp">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8] font-medium capitalize">{dayName} {dateStr}</p>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mt-0.5">
                Bonjour, {profile?.first_name}
              </h1>
            </div>
            <button
              onClick={() => router.push("/dashboard/profile")}
              className={DS.btnIcon}
            >
              <User className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>
        </div>

        {/* ── Hero CA card (Qonto style) ── */}
        <div
          className="rounded-2xl mt-6 mb-6 relative overflow-hidden animate-fadeUp"
          style={{
            padding: '20px',
            paddingLeft: '20px',
            width: '100%',
            boxSizing: 'border-box',
            background: `linear-gradient(135deg, ${brandColor}08, transparent)`,
            ...cardShadow,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">CA ce mois</p>
              <p className="text-4xl font-black text-[#0F172A] tracking-tight">
                {dashStats ? formatPrice(dashStats.monthlyRevenue) : "—"}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {dashStats && dashStats.prevMonthRevenue > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      backgroundColor: dashStats.revenueGrowth >= 0 ? "#ECFDF5" : "#FEF2F2",
                      color: dashStats.revenueGrowth >= 0 ? "#059669" : "#DC2626",
                    }}
                  >
                    {dashStats.revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(dashStats.revenueGrowth)}% vs mois dernier
                  </span>
                )}
                {dashStats && dashStats.prevMonthRevenue === 0 && (
                  <span className="text-[11px] text-[#94A3B8]">Premier mois</span>
                )}
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}12` }}
            >
              <ArrowUpRight className="w-5 h-5" style={{ color: brandColor }} />
            </div>
          </div>
        </div>

        {/* ── Period selector ── */}
        <div
          className="flex gap-1 bg-white rounded-xl p-1 mb-5"
          style={cardShadow}
        >
          {[
            { key: "month", label: "Ce mois" },
            { key: "3months", label: "3 mois" },
            { key: "6months", label: "6 mois" },
            { key: "year", label: "Année" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedPeriod(key)}
              className={`flex-1 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all duration-150 ${
                selectedPeriod === key
                  ? "text-white"
                  : "text-[#94A3B8] hover:text-[#64748B]"
              }`}
              style={selectedPeriod === key ? { backgroundColor: brandColor } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── KPI Grid 2x2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <StatCard
            label="CA ce mois"
            value={dashStats ? formatPrice(dashStats.monthlyRevenue) : "—"}
            subtext={dashStats?.prevMonthRevenue > 0 ? `${dashStats.revenueGrowth >= 0 ? "+" : ""}${dashStats.revenueGrowth}%` : undefined}
            icon={TrendingUp}
            brandColor={brandColor}
          />
          <StatCard
            label="Taux acceptation"
            value={dashStats ? `${dashStats.acceptanceRate}%` : "—"}
            subtext={`sur ${dashStats?.periodTotal ?? 0} devis`}
            icon={CheckCircle}
            brandColor={brandColor}
          />
          <StatCard
            label="En attente"
            value={dashStats ? dashStats.waitingQuotes : "—"}
            subtext="devis sans réponse"
            icon={Clock}
            brandColor={brandColor}
          />
          <StatCard
            label="Délai ouverture"
            value={dashStats?.avgViewHours != null ? `${dashStats.avgViewHours}h` : "—"}
            subtext="délai moyen lecture"
            icon={Eye}
            brandColor={brandColor}
          />
        </div>

        {/* ── Bar Chart ── */}
        <div className="bg-white rounded-2xl p-5 mb-6" style={cardShadow}>
          <p className={DS.sectionTitle}>CA — 6 derniers mois</p>
          {dashStats?.monthlyData ? (
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashStats.monthlyData} barSize={20} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis hide={true} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString("fr-BE")} €`, "CA"]}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 13 }}
                  />
                  <Bar dataKey="revenue" fill={brandColor} radius={[6, 6, 0, 0]} opacity={0.9} minPointSize={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '14px' }}>Chargement...</div>
          )}
        </div>

        {/* ── Google Reviews banner ── */}
        {profile && !profile.google_review_url && (
          <div
            className="bg-[#FFFBEB] rounded-2xl p-5 flex items-start gap-3.5 mb-6 animate-fadeUp"
            style={{ border: "1px solid #FEF3C7" }}
          >
            <span className="text-2xl mt-0.5">⭐</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#92400E]">Google Reviews</p>
              <p className="text-[13px] text-[#B45309] mt-0.5 leading-relaxed">Ajoutez votre lien pour recevoir des avis automatiquement</p>
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="mt-2.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                style={{ color: brandColor }}
              >
                Configurer →
              </button>
            </div>
          </div>
        )}

        {/* ── New quote CTA ── */}
        <button
          onClick={() => router.push("/dashboard/new-quote")}
          className={`${DS.btnPrimary} flex items-center justify-center gap-2 mb-8`}
          style={{ backgroundColor: brandColor }}
        >
          <Plus className="w-5 h-5" />
          Nouveau devis
        </button>

        {/* ── Recent quotes ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className={DS.sectionTitle + " mb-0"}>Derniers devis</p>
            <button
              onClick={() => router.push("/dashboard/quotes")}
              className="text-[11px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
              style={{ color: brandColor }}
            >
              Voir tout →
            </button>
          </div>

          {quotes.length === 0 ? (
            <EmptyState
              emoji="📄"
              title="Aucun devis pour l'instant"
              subtitle="Créez votre premier devis !"
              action={() => router.push("/dashboard/new-quote")}
              actionLabel="Créer un devis"
              brandColor={brandColor}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {[...quotes].reverse().slice(0, 5).map((quote, idx) => {
                const globalIdx = quotes.indexOf(quote)
                const quoteRef = getQuoteRef(quote, globalIdx)
                return (
                  <div key={quote.id} onClick={() => router.push(`/dashboard/quotes/${quote.id}`)} className="cursor-pointer">
                    <QuoteCard
                      quote={quote}
                      quoteRef={quoteRef}
                      onSend={openSendModal}
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
                      formatPrice={formatPrice}
                      brandColor={brandColor}
                      index={idx}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
