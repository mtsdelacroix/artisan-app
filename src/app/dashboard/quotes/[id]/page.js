"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, FileText, Calculator,
  Check, Banknote, Wrench, Download, CircleCheck, Mic, MicOff,
  Copy, Mail, Send, X, RotateCcw, Settings, ChevronDown, Pencil, Camera
} from "lucide-react"
import PhotoGallery from "@/components/PhotoGallery"

const ACCENT = "#F59E0B"
const ACCENT_LIGHT = "rgba(245,158,11,0.10)"
const ACCENT_BORDER = "rgba(245,158,11,0.25)"

export default function EditQuotePage() {
  const [profile, setProfile]                   = useState(null)
  const [userId, setUserId]                     = useState(null)
  const [isLoading, setIsLoading]               = useState(true)
  const [isSaving, setIsSaving]                 = useState(false)
  const [isMarkingDone, setIsMarkingDone]       = useState(false)
  const [isTransitioning, setIsTransitioning]   = useState(false)
  const [isDuplicating, setIsDuplicating]       = useState(false)
  const [quoteRef, setQuoteRef]                 = useState("")
  const [toast, setToast]                       = useState(null)
  const [internalNotes, setInternalNotes]       = useState("")
  const [isSavingNote, setIsSavingNote]         = useState(false)
  const [isFormattingNote, setIsFormattingNote] = useState(false)
  const [isListeningNote, setIsListeningNote]   = useState(false)
  const noteRecognitionRef = useRef(null)

  const [clientName, setClientName]           = useState("")
  const [clientEmail, setClientEmail]         = useState("")
  const [clientPhone, setClientPhone]         = useState("")
  const [clientAddress, setClientAddress]     = useState("")
  const [clientVatNumber, setClientVatNumber] = useState("")
  const [title, setTitle]                     = useState("")
  const [description, setDescription]         = useState("")
  const [vatRate, setVatRate]                 = useState(21)
  const [validityDays, setValidityDays]       = useState(30)
  const [notes, setNotes]                     = useState("")
  const [conditions, setConditions]           = useState("")
  const [items, setItems]                     = useState([{ label: "", quantity: 1, unit_price: 0, vat_rate: null }])
  const [status, setStatus]                   = useState("draft")
  const [viewedAt, setViewedAt]               = useState(null)
  const [clientMessage, setClientMessage]     = useState("")
  const [showSendModal, setShowSendModal]     = useState(false)
  const [sendMessage, setSendMessage]         = useState("")
  const [isSendingQuote, setIsSendingQuote]   = useState(false)
  const [isListeningMsg, setIsListeningMsg]   = useState(false)
  const [isFormattingMsg, setIsFormattingMsg] = useState(false)
  const sendMsgRecognitionRef = useRef(null)
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("tab")
    return ["quote","photos","notes"].includes(t) ? t : "quote"
  })
  const [menuOpen, setMenuOpen]                   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef(null)

  const router = useRouter()
  const params = useParams()
  const quoteId = params.id

  const STATUS_PIPELINE = [
    { key: "draft",            label: "Brouillon" },
    { key: "sent",             label: "Envoyé" },
    { key: "viewed",           label: "Vu" },
    { key: "accepted",         label: "Accepté" },
    { key: "waiting_deposit",  label: "Att. acompte" },
    { key: "deposit_received", label: "Acompte reçu" },
    { key: "in_progress",      label: "En cours" },
    { key: "waiting_balance",  label: "Att. solde" },
    { key: "completed",        label: "Réalisé" },
  ]

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  useEffect(() => {
    const loadQuote = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUserId(user.id)
      const { data: profileData } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
      setProfile(profileData)
      const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", quoteId).single()
      if (error || !quote) { router.push("/dashboard/quotes"); return }
      if (quote.artisan_id !== profileData?.id) { router.push("/dashboard/quotes"); return }
      const { count } = await supabase.from("quotes").select("id", { count: "exact", head: true }).eq("artisan_id", quote.artisan_id).lte("created_at", quote.created_at)
      const year = new Date(quote.created_at).getFullYear()
      setQuoteRef(`DEV-${year}-${String(count ?? 1).padStart(3, "0")}`)
      setClientName(quote.client_name || "")
      setClientEmail(quote.client_email || "")
      setClientPhone(quote.client_phone || "")
      setClientAddress(quote.client_address || "")
      setClientVatNumber(quote.client_vat_number || "")
      setTitle(quote.title || "")
      setDescription(quote.description || "")
      setVatRate(quote.vat_rate ?? 21)
      setValidityDays(quote.validity_days ?? 30)
      setNotes(quote.notes || "")
      setConditions(quote.conditions || "")
      setInternalNotes(quote.internal_notes || "")
      setStatus(quote.status || "draft")
      setViewedAt(quote.viewed_at || null)
      setClientMessage(quote.client_message || "")
      setItems(
        Array.isArray(quote.items) && quote.items.length > 0
          ? quote.items.map(it => ({ ...it, vat_rate: it.vat_rate !== undefined ? it.vat_rate : null }))
          : [{ label: "", quantity: 1, unit_price: 0, vat_rate: null }]
      )
      setIsLoading(false)
    }
    loadQuote()
  }, [quoteId, router])

  const addItem    = () => setItems([...items, { label: "", quantity: 1, unit_price: 0 }])
  const removeItem = (i) => { if (items.length === 1) return; setItems(items.filter((_, idx) => idx !== i)) }
  const updateItem = (i, field, value) => { const n = [...items]; n[i][field] = value; setItems(n) }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const vatAmount = items.reduce((sum, item) => {
    const rate = (item.vat_rate !== null && item.vat_rate !== undefined) ? item.vat_rate : vatRate
    return sum + (item.quantity * item.unit_price) * (rate / 100)
  }, 0)
  const total = subtotal + vatAmount
  const autoliquidationTotal = items.filter(i => i.vat_rate === 0).reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const hasAutoliquidation = autoliquidationTotal > 0

  const handleSave = async () => {
    if (!profile) { alert("Profil non chargé."); return }
    if (!title || !clientName) { alert("Veuillez remplir au minimum le titre et le nom du client."); return }
    setIsSaving(true)
    const { error } = await supabase.from("quotes").update({
      client_name: clientName, client_email: clientEmail, client_phone: clientPhone,
      client_address: clientAddress, client_vat_number: clientVatNumber || null,
      title, description, items: items.filter(item => item.label),
      vat_rate: vatRate, validity_days: validityDays, notes, conditions: conditions || null,
      subtotal_excl_vat: subtotal, total_vat: vatAmount, total_incl_vat: total, status,
    }).eq("id", quoteId)
    if (error) { alert("Erreur lors de la sauvegarde : " + error.message) }
    else { showToast("Devis sauvegardé !") }
    setIsSaving(false)
  }

  const handleStatusTransition = async (newStatus) => {
    setIsTransitioning(true)
    try {
      if (newStatus === "completed") {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch("/api/send-review-request", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId, accessToken: session?.access_token }),
        })
        const data = await res.json()
        if (!res.ok) { alert("Erreur : " + (data.error || "inconnu")); setIsTransitioning(false); return }
        setStatus("completed")
        showToast("Chantier réalisé — email d'avis envoyé au client")
      } else {
        const { error } = await supabase.from("quotes").update({ status: newStatus, status_updated_at: new Date().toISOString() }).eq("id", quoteId)
        if (error) { alert("Erreur : " + error.message); setIsTransitioning(false); return }
        setStatus(newStatus)
        const labels = { waiting_deposit: "En attente d'acompte", deposit_received: "Acompte reçu", in_progress: "Chantier démarré", waiting_balance: "En attente du solde" }
        showToast(labels[newStatus] || "Statut mis à jour")
      }
    } catch (err) { alert("Erreur réseau : " + err.message) }
    setIsTransitioning(false)
  }

  const handleSaveNote = async () => {
    if (!quoteId) return
    setIsSavingNote(true)
    await supabase.from("quotes").update({ internal_notes: internalNotes || null }).eq("id", quoteId)
    setIsSavingNote(false)
  }

  const handleFormatNote = async (rawText) => {
    setIsFormattingNote(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/format-note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText, accessToken: session?.access_token }) })
      const data = await res.json()
      if (res.ok && data.text) setInternalNotes(data.text)
    } catch {}
    setIsFormattingNote(false)
  }

  const startNoteListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Reconnaissance vocale non supportée. Utilisez Chrome."); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"; recognition.continuous = true; recognition.interimResults = false
    noteRecognitionRef.current = recognition
    let final = ""
    recognition.onresult = (event) => { for (let i = event.resultIndex; i < event.results.length; i++) { if (event.results[i].isFinal) final += event.results[i][0].transcript + " " } }
    recognition.onerror = (e) => { if (e.error === "language-not-supported") { recognition.lang = "fr-FR"; recognition.start(); return } setIsListeningNote(false) }
    recognition.onend = () => { setIsListeningNote(false); if (final.trim()) handleFormatNote(final.trim()) }
    recognition.start(); setIsListeningNote(true)
  }
  const stopNoteListening = () => noteRecognitionRef.current?.stop()

  const buildDefaultMessage = () => {
    if (!profile?.default_message) return ""
    const firstName = clientName.split(" ").find(w => w.length > 1) || clientName
    const artisanName = profile.business_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    return profile.default_message.replace(/\[Prénom client\]/g, firstName).replace(/\[Nom artisan\]/g, artisanName).replace(/\[Numéro devis\]/g, quoteRef)
  }

  const openSendModal = () => {
    if (!clientEmail) { alert("Veuillez renseigner l'email du client avant d'envoyer."); return }
    setSendMessage(buildDefaultMessage()); setShowSendModal(true)
  }
  const closeSendModal = () => { setShowSendModal(false); sendMsgRecognitionRef.current?.stop(); setIsListeningMsg(false) }

  const startSendMsgListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Reconnaissance vocale non supportée. Utilisez Chrome."); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"; recognition.continuous = true; recognition.interimResults = false
    sendMsgRecognitionRef.current = recognition
    let final = ""
    recognition.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript + " " } }
    recognition.onerror = (e) => { if (e.error === "language-not-supported") { recognition.lang = "fr-FR"; recognition.start(); return } setIsListeningMsg(false) }
    recognition.onend = async () => {
      setIsListeningMsg(false)
      if (!final.trim()) return
      setIsFormattingMsg(true)
      try {
        const artisanName = profile?.business_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
        const { data: { session: fmtSession } } = await supabase.auth.getSession()
        const res = await fetch("/api/format-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText: final.trim(), context: { clientName, artisanName, quoteNumber: quoteRef }, accessToken: fmtSession?.access_token }) })
        const data = await res.json()
        if (res.ok && data.text) setSendMessage(data.text)
      } catch {}
      setIsFormattingMsg(false)
    }
    recognition.start(); setIsListeningMsg(true)
  }
  const stopSendMsgListening = () => sendMsgRecognitionRef.current?.stop()

  const handleSendQuote = async () => {
    if (!clientEmail) return
    setIsSendingQuote(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/send-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId, accessToken: session?.access_token, message: sendMessage || undefined }) })
      const data = await res.json()
      if (!res.ok) { alert("Erreur envoi : " + (data.error || "inconnu")) }
      else { setStatus("sent"); closeSendModal(); showToast("Devis envoyé par email !") }
    } catch (err) { alert("Erreur réseau : " + err.message) }
    setIsSendingQuote(false)
  }

  const handleDuplicate = async () => {
    if (!profile) return
    setIsDuplicating(true)
    try {
      const { data: newQuote, error } = await supabase.from("quotes").insert({
        artisan_id: profile.id, title: `${title} (copie)`, description, client_name: clientName,
        client_email: clientEmail, client_phone: clientPhone, client_address: clientAddress,
        client_vat_number: clientVatNumber || null, items: items.filter(it => it.label),
        vat_rate: vatRate, validity_days: validityDays, notes, conditions: conditions || null,
        subtotal_excl_vat: subtotal, total_vat: vatAmount, total_incl_vat: total, status: "draft",
      }).select().single()
      if (error) { alert("Erreur duplication : " + error.message); return }
      showToast("Devis dupliqué avec succès !")
      setTimeout(() => router.push(`/dashboard/quotes/${newQuote.id}`), 1200)
    } catch (err) { alert("Erreur : " + err.message) }
    setIsDuplicating(false)
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    try {
      const { error } = await supabase.from("quotes").delete().eq("id", quoteId)
      if (error) { alert("Erreur suppression : " + error.message); return }
      router.push("/dashboard/quotes")
    } catch (err) { alert("Erreur : " + err.message) }
  }

  const handleDownloadPdf = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/generate-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId, accessToken: session?.access_token }) })
      if (!res.ok) { const e = await res.json(); alert("Erreur PDF : " + (e.error || "inconnu")); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = `${quoteRef}.pdf`; a.click(); URL.revokeObjectURL(url)
    } catch (err) { alert("Erreur réseau : " + err.message) }
  }

  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const handleEscape = (e) => { if (e.key === "Escape") setMenuOpen(false) }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => { document.removeEventListener("mousedown", handleClickOutside); document.removeEventListener("keydown", handleEscape) }
  }, [])

  // ── helpers ──────────────────────────────────────────────────────────
  const fmtPrice = (n) => n != null ? new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n) : "—"

  const inputStyle = {
    width: "100%", height: 44,
    background: "#FFFFFF",
    border: "1.5px solid #F0EDE6",
    borderRadius: 10,
    padding: "0 12px",
    fontFamily: "'Figtree', sans-serif",
    fontSize: 14, color: "#0F172A",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  }
  const textareaStyle = {
    ...inputStyle,
    height: "auto",
    padding: "10px 12px",
    resize: "none",
  }
  const selectStyle = { ...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }
  const labelStyle = {
    display: "block",
    fontSize: 10, fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94A3B8",
    marginBottom: 5,
    fontFamily: "'Figtree', sans-serif",
  }
  const cardStyle = {
    background: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    border: "1.5px solid #F5F0E8",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  }
  const cardTitleStyle = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 16,
    color: "#0F172A",
    letterSpacing: "1px",
    marginBottom: 16,
    display: "flex", alignItems: "center", gap: 8,
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#FDFAF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@300;400;500;600;700&display=swap');`}</style>
        <Loader2 style={{ width: 28, height: 28, color: ACCENT, animation: "spin 1s linear infinite" }} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@300;400;500;600;700&display=swap');
        .qd-root { min-height: 100dvh; background: #FDFAF5; font-family: 'Figtree', sans-serif; -webkit-font-smoothing: antialiased; }
        .qd-inner { max-width: 520px; margin: 0 auto; padding: 0 20px 100px; }
        .qd-input:focus { border-color: rgba(245,158,11,0.5) !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.08) !important; }
        .qd-input option { background: #fff; color: #0F172A; }
        .qd-tab-btn { flex: 1; padding: 10px 6px; border-radius: 9px; border: none; font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s, color 0.2s; }
        .qd-tab-btn.active { background: #F59E0B; color: #fff; box-shadow: 0 2px 8px rgba(245,158,11,0.3); }
        .qd-tab-btn.inactive { background: transparent; color: #94A3B8; }
        .qd-tab-btn.inactive:hover { background: #F5F0E8; color: #64748B; }
        .qd-action-btn { display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 16px; border-radius: 10px; border: none; font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s; }
        .qd-action-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .qd-action-btn:active:not(:disabled) { transform: translateY(0); }
        .qd-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .qd-icon-btn { width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid #F0EDE6; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748B; transition: background 0.15s, color 0.15s; }
        .qd-icon-btn:hover { background: #FDF8EF; color: #F59E0B; }
        .qd-pipeline-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 13px; flex-shrink: 0; transition: background 0.2s; }
        .qd-pipeline-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; text-align: center; white-space: nowrap; }
        .qd-pipeline-line { height: 2px; flex: 1; margin: 0 3px; }
        .qd-item-row { display: grid; grid-template-columns: 1fr 60px 80px 70px 32px; gap: 6px; align-items: center; margin-bottom: 8px; }
        @media (max-width: 400px) { .qd-item-row { grid-template-columns: 1fr 48px 70px 60px 28px; gap: 4px; } }
        .qd-modal-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(15,23,42,0.4); backdrop-filter: blur(3px); display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 640px) { .qd-modal-backdrop { align-items: center; } }
        .qd-modal { background: #fff; border-radius: 24px 24px 0 0; width: 100%; max-width: 480px; padding: 24px; animation: qd-slide-up 0.25s ease-out; }
        @media (min-width: 640px) { .qd-modal { border-radius: 20px; margin: 16px; } }
        @keyframes qd-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .qd-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: #0F172A; letter-spacing: 1px; }
        .qd-btn-cancel { flex: 1; height: 46px; border-radius: 12px; border: none; background: #F1F5F9; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; color: #334155; cursor: pointer; transition: background 0.15s; }
        .qd-btn-cancel:hover { background: #E2E8F0; }
        .qd-btn-primary { flex: 1; height: 46px; border-radius: 12px; border: none; background: linear-gradient(135deg, #F59E0B, #D97706); font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 3px 12px rgba(245,158,11,0.3); transition: transform 0.15s, box-shadow 0.15s; }
        .qd-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(245,158,11,0.45); }
        .qd-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
        .qd-btn-danger { flex: 1; height: 46px; border-radius: 12px; border: none; background: #EF4444; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; }
        .qd-textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #F0EDE6; background: #FFFFFF; font-family: 'Figtree', sans-serif; font-size: 14px; color: #0F172A; outline: none; resize: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .qd-textarea:focus { border-color: rgba(245,158,11,0.5); box-shadow: 0 0 0 3px rgba(245,158,11,0.08); }
        .qd-textarea::placeholder { color: #CBD5E1; }
        .qd-noise { position: fixed; inset: 0; pointer-events: none; z-index: 200; opacity: 0.018; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 192px; }
      `}</style>

      <div className="qd-noise" aria-hidden="true" />

      {/* ── Delete confirm modal ── */}
      {showDeleteConfirm && (
        <div className="qd-modal-backdrop">
          <div className="qd-modal">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div className="qd-modal-title">SUPPRIMER LE DEVIS</div>
              <button style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#F1F5F9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowDeleteConfirm(false)}>
                <X size={14} color="#64748B" />
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 6 }}>Voulez-vous supprimer définitivement :</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{quoteRef} — {title}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 24 }}>Cette action est irréversible.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="qd-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
              <button className="qd-btn-danger" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send modal ── */}
      {showSendModal && (
        <div className="qd-modal-backdrop">
          <div className="qd-modal">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div className="qd-modal-title">ENVOYER {quoteRef}</div>
              <button style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#F1F5F9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeSendModal}>
                <X size={14} color="#64748B" />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={labelStyle}>À</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{clientName}</p>
              <p style={{ fontSize: 13, color: ACCENT, fontWeight: 500 }}>{clientEmail}</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={labelStyle}>Message</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() => setSendMessage(buildDefaultMessage())}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, border: "1.5px solid #F0EDE6", background: "#FAFAF8", fontSize: 11, fontWeight: 700, color: "#64748B", cursor: "pointer", fontFamily: "Figtree, sans-serif" }}
                  ><RotateCcw size={11} />Défaut</button>
                  <button
                    onClick={isListeningMsg ? stopSendMsgListening : startSendMsgListening}
                    disabled={isFormattingMsg}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: isListeningMsg ? "#EF4444" : ACCENT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                  >
                    {isListeningMsg ? <MicOff size={14} color="#fff" /> : <Mic size={14} color="#fff" />}
                  </button>
                </div>
              </div>
              {isFormattingMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ACCENT, marginBottom: 8 }}>
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />Reformatage par Claude...
                </div>
              )}
              <textarea className="qd-textarea" value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={6} placeholder="Message optionnel pour le client..." />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="qd-btn-cancel" onClick={closeSendModal}>Annuler</button>
              <button className="qd-btn-primary" onClick={handleSendQuote} disabled={isSendingQuote}>
                {isSendingQuote ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "#0F172A", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", whiteSpace: "nowrap", fontFamily: "Figtree, sans-serif" }}>
          <CircleCheck size={16} style={{ color: "#34D399", flexShrink: 0 }} />{toast}
        </div>
      )}

      <div className="qd-root">
        <div className="qd-inner">

          {/* ── Header ── */}
          <div style={{ paddingTop: 48, paddingBottom: 16 }}>
            <button
              onClick={() => router.push("/dashboard/quotes")}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 13, fontWeight: 600, marginBottom: 14, padding: 0, fontFamily: "Figtree, sans-serif" }}
            >
              <ArrowLeft size={14} />Mes devis
            </button>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: "1px", color: ACCENT }}>{quoteRef}</span>
                </div>
                <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#0F172A", letterSpacing: "1px", lineHeight: 1.1, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {title || "SANS TITRE"}
                </h1>
                {clientName && (
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                    {clientName}
                    {clientPhone && (
                      <> · <a href={`tel:${clientPhone}`} style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>{clientPhone}</a></>
                    )}
                  </p>
                )}
              </div>

              {/* Actions row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingTop: 2 }}>
                {["draft","sent"].includes(status) && (
                  <button
                    onClick={openSendModal}
                    disabled={!clientEmail}
                    className="qd-action-btn"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #D97706)`, color: "#fff", boxShadow: "0 3px 12px rgba(245,158,11,0.3)" }}
                    title={clientEmail ? "Envoyer le devis" : "Email client manquant"}
                  >
                    <Send size={14} /><span style={{ display: "none" }}>Envoyer</span>
                  </button>
                )}
                <button className="qd-icon-btn" onClick={handleDownloadPdf} title="Télécharger PDF">
                  <Download size={16} />
                </button>
                <div style={{ position: "relative" }} ref={menuRef}>
                  <button
                    className="qd-icon-btn"
                    onClick={() => setMenuOpen(o => !o)}
                    style={menuOpen ? { background: "#FDF8EF", color: ACCENT, borderColor: ACCENT_BORDER } : {}}
                  >
                    <Settings size={16} />
                  </button>
                  {menuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 30, background: "#fff", borderRadius: 14, padding: 6, minWidth: 175, boxShadow: "0 8px 28px rgba(0,0,0,0.13)", border: "1.5px solid #F0EDE6" }}>
                      <button
                        onClick={() => { setActiveTab("quote"); setMenuOpen(false) }}
                        style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FAFAF8"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <Pencil size={14} color="#94A3B8" />Modifier
                      </button>
                      <button
                        onClick={() => { handleDuplicate(); setMenuOpen(false) }}
                        disabled={isDuplicating}
                        style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, opacity: isDuplicating ? 0.5 : 1 }}
                        onMouseEnter={e => { if (!isDuplicating) e.currentTarget.style.background = "#FAFAF8" }}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {isDuplicating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "#94A3B8" }} /> : <Copy size={14} color="#94A3B8" />}
                        Dupliquer
                      </button>
                      <div style={{ height: 1, background: "#F5F0E8", margin: "4px 8px" }} />
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false) }}
                        style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <Trash2 size={14} />Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Status pipeline ── */}
          {status !== "refused" && status !== "rejected" && (
            <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", overflow: "hidden" }}>
                {STATUS_PIPELINE.map((step, idx) => {
                  const currentIdx = STATUS_PIPELINE.findIndex(s => s.key === status)
                  const isDone = idx < currentIdx
                  const isCurrent = idx === currentIdx
                  return (
                    <div key={step.key} style={{ display: "flex", alignItems: "center", flex: idx < STATUS_PIPELINE.length - 1 ? "1" : "none", minWidth: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div
                          className="qd-pipeline-dot"
                          style={{
                            background: isDone ? ACCENT : isCurrent ? ACCENT_LIGHT : "#F1F5F9",
                            color: isDone ? "#fff" : isCurrent ? ACCENT : "#94A3B8",
                            border: isCurrent ? `2px solid ${ACCENT}` : "none",
                          }}
                        >
                          {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                        </div>
                        <span
                          className="qd-pipeline-label"
                          style={{ color: isCurrent ? ACCENT : isDone ? "#64748B" : "#CBD5E1", display: window?.innerWidth > 400 ? "block" : "none" }}
                        >{step.label}</span>
                      </div>
                      {idx < STATUS_PIPELINE.length - 1 && (
                        <div className="qd-pipeline-line" style={{ background: idx < currentIdx ? ACCENT : "#F0EDE6" }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Contextual action banners ── */}
          {["sent","viewed"].includes(status) && (
            <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: "0 0 2px" }}>Devis {status === "viewed" ? "consulté par le client" : "envoyé"}</p>
                <p style={{ fontSize: 12, color: "#B45309", margin: 0 }}>Vous pouvez le marquer comme accepté si le client vous confirme verbalement.</p>
              </div>
              <button
                className="qd-action-btn"
                onClick={() => handleStatusTransition("accepted")}
                disabled={isTransitioning}
                style={{ background: "#16A34A", color: "#fff", flexShrink: 0 }}
              >
                {isTransitioning ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                Accepté
              </button>
            </div>
          )}
          {status === "accepted" && (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: "0 0 10px" }}>Devis accepté — prochaine étape ?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button className="qd-action-btn" onClick={() => handleStatusTransition("waiting_deposit")} disabled={isTransitioning} style={{ background: ACCENT, color: "#fff" }}>
                  {isTransitioning ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Banknote size={14} />}Att. acompte
                </button>
                <button className="qd-action-btn" onClick={() => handleStatusTransition("in_progress")} disabled={isTransitioning} style={{ background: "#fff", color: "#15803D", border: "1.5px solid #BBF7D0" }}>
                  <Wrench size={14} />Démarrer direct
                </button>
              </div>
            </div>
          )}
          {status === "waiting_deposit" && (
            <div style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#9A3412", margin: "0 0 2px" }}>En attente de l'acompte</p>
                <p style={{ fontSize: 12, color: "#EA580C", margin: 0 }}>Confirmez la réception pour démarrer le chantier.</p>
              </div>
              <button className="qd-action-btn" onClick={() => handleStatusTransition("deposit_received")} disabled={isTransitioning} style={{ background: ACCENT, color: "#fff", flexShrink: 0 }}>
                {isTransitioning ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}Reçu ✓
              </button>
            </div>
          )}
          {status === "deposit_received" && (
            <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: "0 0 2px" }}>Acompte reçu</p>
                <p style={{ fontSize: 12, color: "#B45309", margin: 0 }}>Vous pouvez démarrer le chantier.</p>
              </div>
              <button className="qd-action-btn" onClick={() => handleStatusTransition("in_progress")} disabled={isTransitioning} style={{ background: "#7C3AED", color: "#fff", flexShrink: 0 }}>
                {isTransitioning ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Wrench size={14} />}Démarrer
              </button>
            </div>
          )}
          {status === "in_progress" && (
            <div style={{ background: "#FAF5FF", border: "1.5px solid #E9D5FF", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#6B21A8", margin: "0 0 2px" }}>Chantier en cours</p>
                <p style={{ fontSize: 12, color: "#9333EA", margin: 0 }}>Passez en attente de solde une fois terminé.</p>
              </div>
              <button className="qd-action-btn" onClick={() => handleStatusTransition("waiting_balance")} disabled={isTransitioning} style={{ background: "#CA8A04", color: "#fff", flexShrink: 0 }}>
                {isTransitioning ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Banknote size={14} />}Att. solde
              </button>
            </div>
          )}
          {status === "waiting_balance" && (
            <div style={{ background: "#FEFCE8", border: "1.5px solid #FDE047", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#713F12", margin: "0 0 2px" }}>En attente du solde</p>
                <p style={{ fontSize: 12, color: "#CA8A04", margin: 0 }}>Marquez comme réalisé quand le solde est encaissé.</p>
              </div>
              <button className="qd-action-btn" onClick={() => handleStatusTransition("completed")} disabled={isTransitioning} style={{ background: "#059669", color: "#fff", flexShrink: 0 }}>
                {isTransitioning ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}Réalisé ✓
              </button>
            </div>
          )}
          {status === "completed" && (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: "0 0 2px" }}>✓ Chantier réalisé</p>
              <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>Email d'avis Google envoyé au client.</p>
            </div>
          )}

          {/* ── Tabs ── */}
          <div style={{ display: "flex", background: "#FFFFFF", border: "1.5px solid #F5F0E8", borderRadius: 12, padding: 3, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {[{ key: "quote", label: "📄 Devis" }, { key: "photos", label: "📸 Photos" }, { key: "notes", label: "📝 Notes" }].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`qd-tab-btn ${activeTab === key ? "active" : "inactive"}`}>{label}</button>
            ))}
          </div>

          {/* ── Onglet Devis ── */}
          {activeTab === "quote" && (
            <div>
              {/* Consulté / message client */}
              {(viewedAt || clientMessage) && (
                <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                  {viewedAt && (
                    <p style={{ fontSize: 13, color: "#92400E", margin: "0 0 4px" }}>
                      👁 Consulté le {new Date(viewedAt).toLocaleDateString("fr-BE")} à {new Date(viewedAt).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {clientMessage && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#B45309", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>💬 Message du client</p>
                      <p style={{ fontSize: 13, color: "#92400E", fontStyle: "italic", margin: 0 }}>"{clientMessage}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Client info */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}><FileText size={15} color={ACCENT} />CLIENT</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Nom *</label>
                    <input className="qd-input" style={{ ...inputStyle }} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jean Dupont" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input className="qd-input" style={{ ...inputStyle }} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value.toLowerCase())} placeholder="jean@exemple.be" />
                  </div>
                  <div>
                    <label style={labelStyle}>Téléphone</label>
                    <input className="qd-input" style={{ ...inputStyle }} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+32 4..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Adresse chantier</label>
                    <input className="qd-input" style={{ ...inputStyle }} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Rue, Ville" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>N° TVA client (B2B)</label>
                    <input className="qd-input" style={{ ...inputStyle }} value={clientVatNumber} onChange={e => setClientVatNumber(e.target.value)} placeholder="BE 0123.456.789" />
                  </div>
                </div>
              </div>

              {/* Détails devis */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}><FileText size={15} color={ACCENT} />DÉTAILS DU DEVIS</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Titre *</label>
                  <input className="qd-input" style={{ ...inputStyle }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Nettoyage vitres, Installation..." />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Description</label>
                  <textarea className="qd-input" style={{ ...textareaStyle }} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Résumé des travaux..." />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>TVA (%)</label>
                    <select className="qd-input" style={{ ...selectStyle }} value={vatRate} onChange={e => setVatRate(Number(e.target.value))}>
                      <option value={6}>6%</option><option value={12}>12%</option><option value={21}>21%</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Validité (jours)</label>
                    <input className="qd-input" style={{ ...inputStyle }} type="number" value={validityDays} onChange={e => setValidityDays(Number(e.target.value))} onFocus={e => e.target.select()} min={1} />
                  </div>
                </div>
              </div>

              {/* Lignes devis */}
              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={cardTitleStyle}><Calculator size={15} color={ACCENT} />LIGNES DU DEVIS</div>
                  <button
                    onClick={addItem}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: ACCENT_LIGHT, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Figtree, sans-serif" }}
                  >
                    <Plus size={13} strokeWidth={3} />Ajouter
                  </button>
                </div>

                {/* Column headers */}
                <div className="qd-item-row" style={{ marginBottom: 4 }}>
                  {["Description", "Qté", "Prix unit.", "TVA", ""].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i === 1 ? "center" : i === 2 ? "right" : "left" }}>{h}</span>
                  ))}
                </div>

                {items.map((item, i) => (
                  <div key={i}>
                    <div className="qd-item-row">
                      <input className="qd-input" style={{ ...inputStyle, height: 38, fontSize: 13 }} value={item.label} onChange={e => updateItem(i, "label", e.target.value)} placeholder="Description..." />
                      <input className="qd-input" style={{ ...inputStyle, height: 38, fontSize: 13, textAlign: "center", padding: "0 6px" }} type="number" min="0" step="0.5" value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} />
                      <input className="qd-input" style={{ ...inputStyle, height: 38, fontSize: 13, textAlign: "right", padding: "0 8px" }} type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} />
                      <select className="qd-input" style={{ ...selectStyle, height: 38, fontSize: 12, padding: "0 6px" }} value={item.vat_rate === null || item.vat_rate === undefined ? "" : String(item.vat_rate)} onChange={e => updateItem(i, "vat_rate", e.target.value === "" ? null : parseFloat(e.target.value))}>
                        <option value="">Déf.</option><option value="6">6%</option><option value="21">21%</option><option value="0">0%</option>
                      </select>
                      <button onClick={() => removeItem(i)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#CBD5E1", flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#EF4444"}
                        onMouseLeave={e => e.currentTarget.style.color = "#CBD5E1"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {item.vat_rate === 0 && (
                      <p style={{ fontSize: 11, color: "#B45309", marginBottom: 6, marginLeft: 2 }}>Autoliquidation — art. 51 §2 CTVA belge (B2B)</p>
                    )}
                  </div>
                ))}

                {/* Récapitulatif */}
                <div style={{ borderTop: "1.5px solid #F5F0E8", marginTop: 12, paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", marginBottom: 6 }}>
                    <span>Sous-total HTVA</span><span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} €</span>
                  </div>
                  {hasAutoliquidation && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#B45309", marginBottom: 6 }}>
                      <span>Dont autoliquidation (0%)</span><span>{autoliquidationTotal.toFixed(2)} €</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", marginBottom: 10 }}>
                    <span>TVA</span><span style={{ fontWeight: 600 }}>{vatAmount.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: ACCENT_LIGHT, borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${ACCENT_BORDER}` }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: "#0F172A", letterSpacing: "1px" }}>TOTAL TTC</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: ACCENT, letterSpacing: "0.5px" }}>{total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Notes + CGV */}
              <div style={cardStyle}>
                <div style={{ marginBottom: 16 }}>
                  <div style={cardTitleStyle}>NOTES</div>
                  <textarea className="qd-input qd-textarea" style={{ ...textareaStyle }} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarques spécifiques à ce devis..." />
                </div>
                <div>
                  <div style={cardTitleStyle}>CONDITIONS GÉNÉRALES</div>
                  <textarea className="qd-input qd-textarea" style={{ ...textareaStyle, fontFamily: "monospace", fontSize: 12 }} rows={6} value={conditions} onChange={e => setConditions(e.target.value)} placeholder="Conditions de vente..." />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{ width: "100%", height: 54, background: `linear-gradient(135deg, ${ACCENT}, #D97706)`, border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: "2px", color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(245,158,11,0.3)", opacity: isSaving ? 0.6 : 1, marginBottom: 20 }}
              >
                {isSaving ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
                SAUVEGARDER
              </button>
            </div>
          )}

          {/* ── Onglet Photos ── */}
          {activeTab === "photos" && (
            status === "draft" ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "48px 20px" }}>
                <Camera size={40} style={{ color: "#E2E8F0", marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Photos non disponibles en brouillon</p>
                <p style={{ fontSize: 13, color: "#94A3B8" }}>Envoyez le devis pour activer la galerie photos</p>
              </div>
            ) : profile && userId ? (
              <PhotoGallery quoteId={quoteId} artisanId={profile.id} userId={userId} />
            ) : null
          )}

          {/* ── Onglet Notes ── */}
          {activeTab === "notes" && (
            <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 20, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#92400E", letterSpacing: "1px", marginBottom: 2 }}>NOTES INTERNES</div>
                  <p style={{ fontSize: 11, color: "#B45309", margin: 0 }}>Jamais visibles du client — ni sur le devis, ni dans les emails</p>
                </div>
                <button
                  onClick={isListeningNote ? stopNoteListening : startNoteListening}
                  disabled={isFormattingNote}
                  style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: isListeningNote ? "#EF4444" : ACCENT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, position: "relative", opacity: isFormattingNote ? 0.5 : 1 }}
                >
                  {isListeningNote ? <MicOff size={16} color="#fff" /> : <Mic size={16} color="#fff" />}
                </button>
              </div>
              {isFormattingNote && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#B45309", marginBottom: 10 }}>
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />Reformatage par Claude...
                </div>
              )}
              <textarea
                className="qd-textarea"
                style={{ ...textareaStyle, background: "#FFFFFF", border: "1.5px solid #FDE68A" }}
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                onBlur={handleSaveNote}
                rows={8}
                placeholder="État du chantier, matériaux utilisés, à facturer en plus, prochaine intervention..."
              />
              {isSavingNote && <p style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>Sauvegarde...</p>}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
