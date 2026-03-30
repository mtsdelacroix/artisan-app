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
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
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
      if (!res.ok) { const err = await res.json(); alert("Erreur PDF : " + (err.error || "inconnu")); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || "devis.pdf"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert("Erreur réseau : " + err.message) }
    setDownloadingId(null)
  }

  const openSendModal = (quote) => {
    if (!quote.client_email) { alert("Veuillez renseigner l'email du client avant d'envoyer le devis."); return }
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
      if (!res.ok) { alert("Erreur envoi : " + (data.error || "inconnu")) }
      else { setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "sent" } : q)) }
    } catch (err) { alert("Erreur réseau : " + err.message) }
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
    } catch (err) { alert("Erreur : " + err.message) }
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
  const brandColor = "#F59E0B"

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

        .db-root {
          min-height: 100dvh;
          background: #FDFAF5;
          font-family: 'Figtree', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .db-inner {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 20px 100px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .db-inner.in { opacity: 1; transform: translateY(0); }

        /* ── Header ── */
        .db-header {
          padding-top: 52px;
          padding-bottom: 4px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .db-date {
          font-size: 12px;
          font-weight: 500;
          color: #94A3B8;
          text-transform: capitalize;
          margin-bottom: 2px;
          letter-spacing: 0.01em;
        }
        .db-greeting {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          color: #0F172A;
          letter-spacing: 1.5px;
          line-height: 1;
        }
        .db-greeting em { color: #F59E0B; font-style: normal; }
        .db-profile-btn {
          flex-shrink: 0;
          width: 42px; height: 42px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1.5px solid #F0EDE6;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .db-profile-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

        /* ── Hero card ── */
        .db-hero {
          margin-top: 24px;
          margin-bottom: 20px;
          background: #FFFFFF;
          border-radius: 20px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04);
        }
        .db-hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }
        .db-hero-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94A3B8;
          margin-bottom: 10px;
        }
        .db-hero-amount {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 52px;
          color: #0F172A;
          letter-spacing: 1px;
          line-height: 1;
          margin-bottom: 10px;
        }
        .db-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }
        .db-hero-icon {
          position: absolute;
          top: 20px; right: 20px;
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(245,158,11,0.35);
        }

        /* ── Period selector ── */
        .db-period {
          display: flex;
          background: #FFFFFF;
          border-radius: 12px;
          padding: 3px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1.5px solid #F0EDE6;
        }
        .db-period-btn {
          flex: 1;
          padding: 8px 6px;
          border-radius: 9px;
          border: none;
          background: transparent;
          font-family: 'Figtree', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
          color: #94A3B8;
        }
        .db-period-btn.active {
          background: #F59E0B;
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(245,158,11,0.32);
        }

        /* ── KPI Grid ── */
        .db-kpi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }
        .db-kpi {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 16px;
          min-width: 0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1.5px solid #F5F0E8;
          position: relative;
        }
        .db-kpi-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94A3B8;
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .db-kpi-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 30px;
          color: #0F172A;
          line-height: 1;
          letter-spacing: 0.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 4px;
        }
        .db-kpi-sub {
          font-size: 11px;
          color: #94A3B8;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .db-kpi-dot {
          position: absolute;
          top: 14px; right: 14px;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #F59E0B;
          opacity: 0.5;
        }

        /* ── Chart section ── */
        .db-section {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1.5px solid #F5F0E8;
        }
        .db-section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          color: #0F172A;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .db-section-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .db-see-all {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #F59E0B;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'Figtree', sans-serif;
        }

        /* ── Google Reviews banner ── */
        .db-reviews-banner {
          background: #FFFBEB;
          border: 1.5px solid #FDE68A;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }
        .db-reviews-banner-text { flex: 1; }
        .db-reviews-title { font-size: 13px; font-weight: 700; color: #92400E; margin-bottom: 2px; }
        .db-reviews-sub { font-size: 12px; color: #B45309; line-height: 1.5; }
        .db-reviews-cta {
          margin-top: 8px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #F59E0B;
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: 'Figtree', sans-serif;
        }

        /* ── New quote button ── */
        .db-new-quote-btn {
          width: 100%;
          height: 58px;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          border: none;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(245,158,11,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .db-new-quote-btn::after {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: db-shimmer 3.5s ease-in-out infinite;
        }
        @keyframes db-shimmer {
          0% { left: -100%; }
          50%, 100% { left: 160%; }
        }
        .db-new-quote-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(245,158,11,0.5); }
        .db-new-quote-btn:active { transform: translateY(0) scale(0.99); }
        .db-new-quote-label {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          color: #FFFFFF;
          letter-spacing: 2px;
        }

        /* ── Modal ── */
        .db-modal-backdrop {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: flex-end;
          background: rgba(15,23,42,0.35);
          backdrop-filter: blur(3px);
        }
        @media (min-width: 640px) { .db-modal-backdrop { align-items: center; justify-content: center; } }
        .db-modal {
          background: #FFFFFF;
          border-radius: 24px 24px 0 0;
          width: 100%; padding: 24px;
          animation: db-slide-up 0.25s ease-out;
        }
        @media (min-width: 640px) { .db-modal { border-radius: 20px; max-width: 440px; margin: 16px; } }
        @keyframes db-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .db-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .db-modal-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px; color: #0F172A; letter-spacing: 1px;
        }
        .db-modal-close {
          width: 32px; height: 32px;
          border-radius: 8px; border: none;
          background: #F1F5F9; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .db-modal-close:hover { background: #E2E8F0; }
        .db-modal-label {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.09em;
          color: #94A3B8; margin-bottom: 6px; display: block;
          font-family: 'Figtree', sans-serif;
        }
        .db-modal-textarea {
          width: 100%; padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid #E2E8F0;
          background: #FAFAFA;
          font-family: 'Figtree', sans-serif;
          font-size: 14px; color: #0F172A;
          outline: none; resize: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .db-modal-textarea:focus {
          border-color: rgba(245,158,11,0.5);
          box-shadow: 0 0 0 3px rgba(245,158,11,0.08);
        }
        .db-modal-textarea::placeholder { color: #CBD5E1; }
        .db-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .db-btn-cancel {
          flex: 1; height: 48px; border-radius: 12px;
          border: none; background: #F1F5F9;
          font-family: 'Figtree', sans-serif;
          font-size: 14px; font-weight: 600; color: #334155;
          cursor: pointer; transition: background 0.15s;
        }
        .db-btn-cancel:hover { background: #E2E8F0; }
        .db-btn-send {
          flex: 1; height: 48px; border-radius: 12px;
          border: none; background: linear-gradient(135deg, #F59E0B, #D97706);
          font-family: 'Figtree', sans-serif;
          font-size: 14px; font-weight: 700; color: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(245,158,11,0.3);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .db-btn-send:hover { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(245,158,11,0.45); }

        /* ── Dropdown menu ── */
        .db-dropdown {
          position: fixed; z-index: 60;
          background: #FFFFFF;
          border-radius: 16px;
          padding: 6px;
          min-width: 190px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
          border: 1.5px solid #F0EDE6;
        }
        .db-dropdown-item {
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
        .db-dropdown-item:hover { background: #FAFAF8; }
        .db-dropdown-item.danger { color: #EF4444; }
        .db-dropdown-item.danger:hover { background: #FEF2F2; }
        .db-dropdown-sep { height: 1px; background: #F5F0E8; margin: 4px 8px; }

        /* ── Quotes section ── */
        .db-quotes-list { display: flex; flex-direction: column; gap: 10px; }

        /* ── Noise overlay ── */
        .db-noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.018;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 192px;
        }
      `}</style>

      <div className="db-noise" aria-hidden="true" />

      {/* ── Send email modal ── */}
      {confirmModal && (
        <div className="db-modal-backdrop">
          <div className="db-modal">
            <div className="db-modal-header">
              <div className="db-modal-title">ENVOYER LE DEVIS</div>
              <button
                className="db-modal-close"
                onClick={() => { setConfirmModal(null); msgRecognitionRef.current?.stop(); setIsListeningMsg(false) }}
              >
                <X size={16} color="#64748B" />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span className="db-modal-label">Destinataire</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{confirmModal.clientName}</p>
              <p style={{ fontSize: 13, color: "#F59E0B", fontWeight: 500 }}>{confirmModal.clientEmail}</p>
            </div>
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="db-modal-label" style={{ margin: 0 }}>Message</span>
                <button
                  onClick={isListeningMsg ? stopMsgListening : startMsgListening}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "none",
                    background: isListeningMsg ? "#EF4444" : "#F59E0B",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", position: "relative",
                  }}
                >
                  {isListeningMsg && (
                    <span style={{
                      position: "absolute", inset: 0, borderRadius: 8,
                      background: "#EF4444", opacity: 0.3,
                      animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite",
                    }} />
                  )}
                  {isListeningMsg
                    ? <MicOff size={15} color="#FFFFFF" style={{ position: "relative", zIndex: 1 }} />
                    : <Mic size={15} color="#FFFFFF" />
                  }
                </button>
              </div>
              <textarea
                value={confirmModal.message}
                onChange={e => setConfirmModal(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                placeholder="Message optionnel pour le client..."
                className="db-modal-textarea"
              />
            </div>
            <div className="db-modal-actions">
              <button
                className="db-btn-cancel"
                onClick={() => { setConfirmModal(null); msgRecognitionRef.current?.stop(); setIsListeningMsg(false) }}
              >
                Annuler
              </button>
              <button className="db-btn-send" onClick={handleSendEmail}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dropdown backdrop & menu ── */}
      {openMenuId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 59 }} onClick={() => { setOpenMenuId(null); setMenuPos(null) }} />
      )}
      {openMenuId && menuPos && (() => {
        const quote = quotes.find(q => q.id === openMenuId)
        if (!quote) return null
        return (
          <div className="db-dropdown" style={{ top: menuPos.top, right: menuPos.right }}>
            <button className="db-dropdown-item" onClick={() => { setOpenMenuId(null); setMenuPos(null); router.push(`/dashboard/quotes/${quote.id}`) }}>
              <Edit size={15} color="#94A3B8" />Modifier
            </button>
            <button className="db-dropdown-item" onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDuplicate(quote) }}>
              <Copy size={15} color="#94A3B8" />Dupliquer
            </button>
            <button className="db-dropdown-item" onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDownloadPdf(quote.id) }} disabled={downloadingId === quote.id} style={{ opacity: downloadingId === quote.id ? 0.5 : 1 }}>
              {downloadingId === quote.id ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={15} color="#94A3B8" />}PDF
            </button>
            <div className="db-dropdown-sep" />
            <button className="db-dropdown-item danger" onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDelete(quote.id) }}>
              <Trash2 size={15} />Supprimer
            </button>
          </div>
        )
      })()}

      <div className="db-root">
        <div className={`db-inner${mounted ? " in" : ""}`}>

          {/* ── Header ── */}
          <div className="db-header">
            <div>
              <div className="db-date">{dayName} {dateStr}</div>
              <div className="db-greeting">
                Bonjour, <em>{profile?.first_name || "—"}</em>
              </div>
            </div>
            <button className="db-profile-btn" onClick={() => router.push("/dashboard/profile")}>
              <User size={18} color="#64748B" />
            </button>
          </div>

          {/* ── Hero CA card ── */}
          <div className="db-hero">
            <div className="db-hero-label">CA CE MOIS</div>
            <div className="db-hero-amount">
              {dashStats ? formatPrice(dashStats.monthlyRevenue) : "—"}
            </div>
            {dashStats && dashStats.prevMonthRevenue > 0 && (
              <div
                className="db-hero-badge"
                style={{
                  background: dashStats.revenueGrowth >= 0 ? "#ECFDF5" : "#FEF2F2",
                  color: dashStats.revenueGrowth >= 0 ? "#059669" : "#DC2626",
                }}
              >
                {dashStats.revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(dashStats.revenueGrowth)}% vs mois dernier
              </div>
            )}
            {dashStats && dashStats.prevMonthRevenue === 0 && (
              <span style={{ fontSize: 11, color: "#94A3B8" }}>Premier mois</span>
            )}
            <div className="db-hero-icon">
              <ArrowUpRight size={20} color="#FFFFFF" strokeWidth={2.5} />
            </div>
          </div>

          {/* ── Period selector ── */}
          <div className="db-period">
            {[
              { key: "month", label: "Ce mois" },
              { key: "3months", label: "3 mois" },
              { key: "6months", label: "6 mois" },
              { key: "year", label: "Année" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedPeriod(key)}
                className={`db-period-btn${selectedPeriod === key ? " active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── KPI Grid 2x2 ── */}
          <div className="db-kpi-grid">
            <div className="db-kpi">
              <div className="db-kpi-dot" />
              <div className="db-kpi-label">CA ce mois</div>
              <div className="db-kpi-value">{dashStats ? formatPrice(dashStats.monthlyRevenue) : "—"}</div>
              {dashStats?.prevMonthRevenue > 0 && (
                <div className="db-kpi-sub" style={{ color: dashStats.revenueGrowth >= 0 ? "#059669" : "#DC2626" }}>
                  {dashStats.revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(dashStats.revenueGrowth)}%
                </div>
              )}
            </div>
            <div className="db-kpi">
              <div className="db-kpi-dot" />
              <div className="db-kpi-label">Taux acceptation</div>
              <div className="db-kpi-value">{dashStats ? `${dashStats.acceptanceRate}%` : "—"}</div>
              <div className="db-kpi-sub">sur {dashStats?.periodTotal ?? 0} devis</div>
            </div>
            <div className="db-kpi">
              <div className="db-kpi-dot" />
              <div className="db-kpi-label">En attente</div>
              <div className="db-kpi-value">{dashStats ? dashStats.waitingQuotes : "—"}</div>
              <div className="db-kpi-sub">devis sans réponse</div>
            </div>
            <div className="db-kpi">
              <div className="db-kpi-dot" />
              <div className="db-kpi-label">Délai ouverture</div>
              <div className="db-kpi-value">{dashStats?.avgViewHours != null ? `${dashStats.avgViewHours}h` : "—"}</div>
              <div className="db-kpi-sub">délai moyen lecture</div>
            </div>
          </div>

          {/* ── Bar Chart ── */}
          <div className="db-section">
            <div className="db-section-title">CA — 6 DERNIERS MOIS</div>
            {dashStats?.monthlyData ? (
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashStats.monthlyData} barSize={20} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis hide={true} />
                    <Tooltip
                      formatter={(value) => [`${value.toLocaleString("fr-BE")} €`, "CA"]}
                      contentStyle={{
                        borderRadius: 12, border: "1.5px solid #F0EDE6",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        fontSize: 13, fontFamily: "Figtree, sans-serif",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#F59E0B" radius={[6, 6, 0, 0]} opacity={0.9} minPointSize={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#CBD5E1", fontSize: 14 }}>
                Chargement...
              </div>
            )}
          </div>

          {/* ── Google Reviews banner ── */}
          {profile && !profile.google_review_url && (
            <div className="db-reviews-banner">
              <span style={{ fontSize: 22, marginTop: 1 }}>⭐</span>
              <div className="db-reviews-banner-text">
                <div className="db-reviews-title">Google Reviews</div>
                <div className="db-reviews-sub">Ajoutez votre lien pour recevoir des avis automatiquement</div>
                <button className="db-reviews-cta" onClick={() => router.push("/dashboard/profile")}>
                  Configurer →
                </button>
              </div>
            </div>
          )}

          {/* ── New quote CTA ── */}
          <button className="db-new-quote-btn" onClick={() => router.push("/dashboard/new-quote")}>
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <span className="db-new-quote-label">NOUVEAU DEVIS</span>
          </button>

          {/* ── Recent quotes ── */}
          <div>
            <div className="db-section-row">
              <div className="db-section-title" style={{ marginBottom: 0 }}>DERNIERS DEVIS</div>
              <button className="db-see-all" onClick={() => router.push("/dashboard/quotes")}>
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
              <div className="db-quotes-list">
                {[...quotes].reverse().slice(0, 5).map((quote, idx) => {
                  const globalIdx = quotes.indexOf(quote)
                  const quoteRef = getQuoteRef(quote, globalIdx)
                  return (
                    <div key={quote.id} onClick={() => router.push(`/dashboard/quotes/${quote.id}`)} style={{ cursor: "pointer" }}>
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
    </>
  )
}
