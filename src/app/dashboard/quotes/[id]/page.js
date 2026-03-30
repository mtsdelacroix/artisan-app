"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileText, Calculator, Check, Banknote, Wrench, Download, CircleCheck, Mic, MicOff, Copy, Mail, Send, X, RotateCcw, Settings, ChevronDown, Pencil, Camera } from "lucide-react"
import PhotoGallery from "@/components/PhotoGallery"

export default function EditQuotePage() {
  const [profile, setProfile]       = useState(null)
  const [userId, setUserId]         = useState(null)
  const [isLoading, setIsLoading]   = useState(true)
  const [isSaving, setIsSaving]           = useState(false)
  const [isMarkingDone, setIsMarkingDone] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [quoteRef, setQuoteRef]           = useState("")
  const [toast, setToast]                 = useState(null)
  const [internalNotes, setInternalNotes] = useState("")
  const [isSavingNote, setIsSavingNote]   = useState(false)
  const [isFormattingNote, setIsFormattingNote] = useState(false)
  const [isListeningNote, setIsListeningNote]   = useState(false)
  const noteRecognitionRef = useRef(null)

  // Champs du formulaire
  const [clientName, setClientName]             = useState("")
  const [clientEmail, setClientEmail]           = useState("")
  const [clientPhone, setClientPhone]           = useState("")
  const [clientAddress, setClientAddress]       = useState("")
  const [clientVatNumber, setClientVatNumber]   = useState("")
  const [title, setTitle]                 = useState("")
  const [description, setDescription]     = useState("")
  const [vatRate, setVatRate]             = useState(21)
  const [validityDays, setValidityDays]   = useState(30)
  const [notes, setNotes]                 = useState("")
  const [conditions, setConditions]       = useState("")
  const [items, setItems]                 = useState([{ label: "", quantity: 1, unit_price: 0, vat_rate: null }])
  const [status, setStatus]               = useState("draft")
  const [viewedAt, setViewedAt]           = useState(null)
  const [clientMessage, setClientMessage] = useState("")
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendMessage, setSendMessage]     = useState("")
  const [isSendingQuote, setIsSendingQuote] = useState(false)
  const [isListeningMsg, setIsListeningMsg] = useState(false)
  const [isFormattingMsg, setIsFormattingMsg] = useState(false)
  const sendMsgRecognitionRef = useRef(null)
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab]           = useState(() => {
    const t = searchParams.get("tab")
    return ["quote","photos","notes"].includes(t) ? t : "quote"
  })
  const [menuOpen, setMenuOpen]             = useState(false)
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

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const loadQuote = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUserId(user.id)

      const { data: profileData } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
      setProfile(profileData)

      const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", quoteId).single()
      if (error || !quote) { router.push("/dashboard/quotes"); return }

      // Vérification que ce devis appartient bien à cet artisan
      if (quote.artisan_id !== profileData?.id) { router.push("/dashboard/quotes"); return }

      // Calcul numéro séquentiel
      const { count } = await supabase
        .from("quotes").select("id", { count: "exact", head: true })
        .eq("artisan_id", quote.artisan_id)
        .lte("created_at", quote.created_at)
      const year = new Date(quote.created_at).getFullYear()
      setQuoteRef(`DEV-${year}-${String(count ?? 1).padStart(3, "0")}`)

      // Pré-remplissage
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

  const addItem = () => setItems([...items, { label: "", quantity: 1, unit_price: 0 }])
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
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_address: clientAddress,
      client_vat_number: clientVatNumber || null,
      title,
      description,
      items: items.filter(item => item.label),
      vat_rate: vatRate,
      validity_days: validityDays,
      notes,
      conditions: conditions || null,
      subtotal_excl_vat: subtotal,
      total_vat: vatAmount,
      total_incl_vat: total,
      status,
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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId, accessToken: session?.access_token }),
        })
        const data = await res.json()
        if (!res.ok) { alert("Erreur : " + (data.error || "inconnu")); setIsTransitioning(false); return }
        setStatus("completed")
        showToast("Chantier réalisé — email d'avis envoyé au client")
      } else {
        const { error } = await supabase.from("quotes").update({
          status: newStatus,
          status_updated_at: new Date().toISOString(),
        }).eq("id", quoteId)
        if (error) { alert("Erreur : " + error.message); setIsTransitioning(false); return }
        setStatus(newStatus)
        const labels = {
          waiting_deposit: "En attente d'acompte",
          deposit_received: "Acompte reçu",
          in_progress: "Chantier démarré",
          waiting_balance: "En attente du solde",
        }
        showToast(labels[newStatus] || "Statut mis à jour")
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message)
    }
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
      const res = await fetch("/api/format-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, accessToken: session?.access_token }),
      })
      const data = await res.json()
      if (res.ok && data.text) setInternalNotes(data.text)
    } catch {}
    setIsFormattingNote(false)
  }

  const startNoteListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Reconnaissance vocale non supportée. Utilisez Chrome."); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"
    recognition.continuous = true
    recognition.interimResults = false
    noteRecognitionRef.current = recognition
    let final = ""
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + " "
      }
    }
    recognition.onerror = (e) => {
      if (e.error === "language-not-supported") { recognition.lang = "fr-FR"; recognition.start(); return }
      setIsListeningNote(false)
    }
    recognition.onend = () => {
      setIsListeningNote(false)
      if (final.trim()) handleFormatNote(final.trim())
    }
    recognition.start()
    setIsListeningNote(true)
  }

  const stopNoteListening = () => noteRecognitionRef.current?.stop()

  const buildDefaultMessage = () => {
    if (!profile?.default_message) return ""
    const firstName = clientName.split(" ").find(w => w.length > 1) || clientName
    const artisanName = profile.business_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    return profile.default_message
      .replace(/\[Prénom client\]/g, firstName)
      .replace(/\[Nom artisan\]/g, artisanName)
      .replace(/\[Numéro devis\]/g, quoteRef)
  }

  const openSendModal = () => {
    if (!clientEmail) { alert("Veuillez renseigner l'email du client avant d'envoyer."); return }
    setSendMessage(buildDefaultMessage())
    setShowSendModal(true)
  }

  const closeSendModal = () => {
    setShowSendModal(false)
    sendMsgRecognitionRef.current?.stop()
    setIsListeningMsg(false)
  }

  const startSendMsgListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Reconnaissance vocale non supportée. Utilisez Chrome."); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"
    recognition.continuous = true
    recognition.interimResults = false
    sendMsgRecognitionRef.current = recognition
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
    recognition.onend = async () => {
      setIsListeningMsg(false)
      if (!final.trim()) return
      setIsFormattingMsg(true)
      try {
        const artisanName = profile?.business_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
        const { data: { session: fmtSession } } = await supabase.auth.getSession()
        const res = await fetch("/api/format-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText: final.trim(),
            context: { clientName, artisanName, quoteNumber: quoteRef },
            accessToken: fmtSession?.access_token,
          }),
        })
        const data = await res.json()
        if (res.ok && data.text) setSendMessage(data.text)
      } catch {}
      setIsFormattingMsg(false)
    }
    recognition.start()
    setIsListeningMsg(true)
  }

  const stopSendMsgListening = () => sendMsgRecognitionRef.current?.stop()

  const handleSendQuote = async () => {
    if (!clientEmail) return
    setIsSendingQuote(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          accessToken: session?.access_token,
          message: sendMessage || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert("Erreur envoi : " + (data.error || "inconnu"))
      } else {
        setStatus("sent")
        closeSendModal()
        showToast("Devis envoyé par email !")
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message)
    }
    setIsSendingQuote(false)
  }

  const handleDuplicate = async () => {
    if (!profile) return
    setIsDuplicating(true)
    try {
      const { data: newQuote, error } = await supabase.from("quotes").insert({
        artisan_id: profile.id,
        title: `${title} (copie)`,
        description,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_address: clientAddress,
        client_vat_number: clientVatNumber || null,
        items: items.filter(it => it.label),
        vat_rate: vatRate,
        validity_days: validityDays,
        notes,
        conditions: conditions || null,
        subtotal_excl_vat: subtotal,
        total_vat: vatAmount,
        total_incl_vat: total,
        status: "draft",
      }).select().single()
      if (error) { alert("Erreur duplication : " + error.message); return }
      showToast("Devis dupliqué avec succès !")
      setTimeout(() => router.push(`/dashboard/quotes/${newQuote.id}`), 1200)
    } catch (err) {
      alert("Erreur : " + err.message)
    }
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const handleEscape = (e) => { if (e.key === "Escape") setMenuOpen(false) }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const handleDownloadPdf = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, accessToken: session?.access_token }),
      })
      if (!res.ok) { const e = await res.json(); alert("Erreur PDF : " + (e.error || "inconnu")); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${quoteRef}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert("Erreur réseau : " + err.message) }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Modal suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Supprimer ce devis ?</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Le devis <strong>{quoteRef}</strong> — <em>{title}</em> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'envoi */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />Envoyer le devis {quoteRef}
              </h3>
              <button onClick={closeSendModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">À :</p>
                <p className="text-sm font-medium text-gray-900">{clientName} <span className="text-blue-600 font-normal">— {clientEmail}</span></p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Message d'accompagnement</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSendMessage(buildDefaultMessage())}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                      title="Remettre le message par défaut"
                    >
                      <RotateCcw className="w-3 h-3" />Défaut
                    </button>
                    <button
                      type="button"
                      onClick={isListeningMsg ? stopSendMsgListening : startSendMsgListening}
                      disabled={isFormattingMsg}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${isListeningMsg ? "bg-red-500" : "bg-blue-600 hover:bg-blue-700"}`}
                      title={isListeningMsg ? "Arrêter la dictée" : "Dicter le message"}
                    >
                      {isListeningMsg && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />}
                      {isListeningMsg ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>
                {isFormattingMsg && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                    <Loader2 className="w-3 h-3 animate-spin" />Reformatage par Claude...
                  </div>
                )}
                <textarea
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  rows={6}
                  placeholder="Message optionnel pour le client..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={closeSendModal}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendQuote}
                disabled={isSendingQuote}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSendingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-lg flex items-center gap-2">
          <CircleCheck className="w-4 h-4 text-green-400 shrink-0" />{toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <button
                onClick={() => router.push("/dashboard/quotes")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />Mes devis
              </button>
              <h1 className="text-base font-bold text-gray-900 truncate">
                <span className="font-mono text-gray-400 text-sm mr-2">{quoteRef}</span>{title || "Sans titre"}
              </h1>
              {clientName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {clientName}
                  {clientPhone && (
                    <> · <a href={`tel:${clientPhone}`} className="text-blue-600 hover:underline">{clientPhone}</a></>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-1">
              {/* Envoyer — visible en draft ou sent */}
              {["draft", "sent"].includes(status) && (
                <button
                  onClick={openSendModal}
                  disabled={!clientEmail}
                  style={{ backgroundColor: profile?.brand_color || "#2563eb" }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-white font-medium rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                  title={clientEmail ? "Envoyer le devis par email" : "Email client manquant"}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              )}

              {/* PDF */}
              <button
                onClick={handleDownloadPdf}
                className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                title="Télécharger PDF"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* ⚙️ Actions menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Actions</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[160px]">
                    <button
                      onClick={() => { setActiveTab("quote"); setMenuOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                    >
                      <Pencil className="w-4 h-4 text-gray-400" />Modifier
                    </button>
                    <button
                      onClick={() => { handleDuplicate(); setMenuOpen(false) }}
                      disabled={isDuplicating}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />Dupliquer
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                    >
                      <Trash2 className="w-4 h-4" />Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6">

        {/* Barre de progression */}
        {status !== "refused" && status !== "rejected" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center">
              {STATUS_PIPELINE.map((step, idx) => {
                const currentIdx = STATUS_PIPELINE.findIndex(s => s.key === status)
                const isDone = idx < currentIdx
                const isCurrent = idx === currentIdx
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none min-w-0">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isDone    ? "bg-blue-600 text-white" :
                        isCurrent ? "bg-blue-50 text-blue-700 border-2 border-blue-500" :
                                    "bg-gray-100 text-gray-400"
                      }`}>
                        {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1 hidden sm:block whitespace-nowrap font-medium ${
                        isCurrent ? "text-blue-700" : isDone ? "text-gray-500" : "text-gray-300"
                      }`}>{step.label}</span>
                    </div>
                    {idx < STATUS_PIPELINE.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 ${idx < currentIdx ? "bg-blue-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions contextuelles selon statut */}
        {["sent", "viewed"].includes(status) && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">Devis {status === "viewed" ? "consulté par le client" : "envoyé"}</p>
              <p className="text-xs text-blue-600 mt-0.5">Vous pouvez le marquer comme accepté si le client vous confirme verbalement.</p>
            </div>
            <button
              onClick={() => handleStatusTransition("accepted")}
              disabled={isTransitioning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ml-4 shrink-0"
            >
              {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Marquer comme accepté
            </button>
          </div>
        )}
        {status === "accepted" && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm font-semibold text-green-800 mb-3">Devis accepté — quelle est la prochaine étape ?</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => handleStatusTransition("waiting_deposit")} disabled={isTransitioning}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Marquer en attente d'acompte
              </button>
              <button onClick={() => handleStatusTransition("in_progress")} disabled={isTransitioning}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 text-sm font-semibold rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50">
                <Wrench className="w-4 h-4" />Démarrer sans acompte
              </button>
            </div>
          </div>
        )}
        {status === "waiting_deposit" && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-800">En attente de l'acompte</p>
              <p className="text-xs text-orange-600 mt-0.5">Confirmez la réception pour démarrer le chantier.</p>
            </div>
            <button onClick={() => handleStatusTransition("deposit_received")} disabled={isTransitioning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ml-4 shrink-0">
              {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Acompte reçu ✓
            </button>
          </div>
        )}
        {status === "deposit_received" && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Acompte reçu</p>
              <p className="text-xs text-amber-600 mt-0.5">Vous pouvez démarrer le chantier.</p>
            </div>
            <button onClick={() => handleStatusTransition("in_progress")} disabled={isTransitioning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ml-4 shrink-0">
              {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              Démarrer le chantier
            </button>
          </div>
        )}
        {status === "in_progress" && (
          <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-800">Chantier en cours</p>
              <p className="text-xs text-violet-600 mt-0.5">Passez en attente de solde une fois les travaux terminés.</p>
            </div>
            <button onClick={() => handleStatusTransition("waiting_balance")} disabled={isTransitioning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ml-4 shrink-0">
              {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              En attente de solde
            </button>
          </div>
        )}
        {status === "waiting_balance" && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-800">En attente du solde</p>
              <p className="text-xs text-yellow-600 mt-0.5">Marquez comme réalisé quand le solde est encaissé — email d'avis Google envoyé automatiquement.</p>
            </div>
            <button onClick={() => handleStatusTransition("completed")} disabled={isTransitioning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ml-4 shrink-0">
              {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Marquer comme réalisé ✓
            </button>
          </div>
        )}
        {status === "completed" && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-semibold text-emerald-800">✓ Chantier réalisé</p>
            <p className="text-xs text-emerald-600 mt-0.5">Email d'avis Google envoyé au client.</p>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-0 mb-6 border-b border-gray-200">
          {[
            { key: "quote",  label: "Devis",  emoji: "📄" },
            { key: "photos", label: "Photos", emoji: "📸" },
            { key: "notes",  label: "Notes",  emoji: "📝" },
          ].map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* ── Onglet Devis ── */}
        {activeTab === "quote" && (
          <div className="space-y-6">

            {/* Vu le + message client */}
            {(viewedAt || clientMessage) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                {viewedAt && (
                  <p className="text-sm text-blue-800">
                    👁 Consulté le {new Date(viewedAt).toLocaleDateString("fr-BE")} à {new Date(viewedAt).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {clientMessage && (
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-1">💬 Message du client :</p>
                    <p className="text-sm text-blue-900 italic">"{clientMessage}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Infos client */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />Informations client
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nom *</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jean Dupont" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value.toLowerCase())} placeholder="jean@exemple.be" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+32 4..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Adresse chantier</label>
                  <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Rue de l'Église 12, Liège" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">N° TVA client (B2B)</label>
                  <input value={clientVatNumber} onChange={e => setClientVatNumber(e.target.value)} placeholder="BE 0123.456.789" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* Détails */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />Détails du devis
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Titre *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nettoyage vitres, Installation tableau..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Résumé des travaux..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">TVA (%)</label>
                    <select value={vatRate} onChange={e => setVatRate(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value={6}>6%</option>
                      <option value={12}>12%</option>
                      <option value={21}>21%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Validité (jours)</label>
                    <input type="number" value={validityDays} onChange={e => setValidityDays(Number(e.target.value))} onFocus={e => e.target.select()} min={1} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lignes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />Lignes du devis
                </h3>
                <button onClick={addItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" />Ajouter
                </button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-2 mb-1">
                  <p className="col-span-5 text-xs font-medium text-gray-400">Description</p>
                  <p className="col-span-2 text-xs font-medium text-gray-400 text-center">Qté</p>
                  <p className="col-span-2 text-xs font-medium text-gray-400 text-right">Prix unit.</p>
                  <p className="col-span-2 text-xs font-medium text-gray-400 text-center">TVA</p>
                </div>
                {items.map((item, i) => (
                  <div key={i}>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <input
                        className="col-span-5 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={item.label}
                        onChange={e => updateItem(i, "label", e.target.value)}
                        placeholder="Description..."
                      />
                      <input
                        type="number" min="0" step="0.5"
                        className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={item.quantity}
                        onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                      />
                      <input
                        type="number" min="0" step="0.01"
                        className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={item.unit_price}
                        onChange={e => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                      />
                      <select
                        value={item.vat_rate === null || item.vat_rate === undefined ? "" : String(item.vat_rate)}
                        onChange={e => updateItem(i, "vat_rate", e.target.value === "" ? null : parseFloat(e.target.value))}
                        className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">Défaut</option>
                        <option value="6">6%</option>
                        <option value="21">21%</option>
                        <option value="0">0% Autoliq.</option>
                      </select>
                      <button onClick={() => removeItem(i)} className="col-span-1 flex justify-center text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {item.vat_rate === 0 && (
                      <p className="text-xs text-amber-600 mt-1 ml-1">Autoliquidation — art. 51 §2 CTVA belge (B2B)</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total HTVA</span><span>{subtotal.toFixed(2)} €</span>
                </div>
                {hasAutoliquidation && (
                  <div className="flex justify-between text-amber-600">
                    <span>Dont autoliquidation (0%)</span><span>{autoliquidationTotal.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>TVA</span><span>{vatAmount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total TTC</span><span>{total.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Notes + Conditions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Notes</h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Remarques spécifiques à ce devis..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Conditions générales</h3>
                <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={6} placeholder="Conditions de vente..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono" />
              </div>
            </div>

            {/* Sauvegarde */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* ── Onglet Photos ── */}
        {activeTab === "photos" && (
          status === "draft" ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Camera className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Photos non disponibles en brouillon</p>
              <p className="text-sm text-gray-400 mt-1">Envoyez le devis pour activer la galerie photos</p>
            </div>
          ) : profile && userId ? (
            <PhotoGallery quoteId={quoteId} artisanId={profile.id} userId={userId} />
          ) : null
        )}

        {/* ── Onglet Notes ── */}
        {activeTab === "notes" && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-amber-900">Notes internes</h3>
                <p className="text-xs text-amber-600 mt-0.5">Jamais visibles du client — ni sur le devis, ni dans les emails, ni sur le PDF</p>
              </div>
              <button
                onClick={isListeningNote ? stopNoteListening : startNoteListening}
                disabled={isFormattingNote}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  isListeningNote ? "bg-red-500 hover:bg-red-600" : "bg-amber-600 hover:bg-amber-700"
                } disabled:opacity-50`}
                title={isListeningNote ? "Arrêter la dictée" : "Dicter la note (reformatée par IA)"}
              >
                {isListeningNote && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />}
                {isListeningNote ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 text-white" />}
              </button>
            </div>
            {isFormattingNote && (
              <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">
                <Loader2 className="w-3 h-3 animate-spin" />Reformatage par Claude...
              </div>
            )}
            <textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              onBlur={handleSaveNote}
              rows={8}
              placeholder="État du chantier, matériaux utilisés, à facturer en plus, prochaine intervention..."
              className="w-full px-3 py-2 border border-amber-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
            />
            {isSavingNote && <p className="text-xs text-amber-500 mt-1">Sauvegarde...</p>}
          </div>
        )}

      </main>
    </div>
  )
}
