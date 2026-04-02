"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, Trash2, Loader2, User, FileText, Calculator,
  Mic, MicOff, Sparkles, Search, BookUser, X, CheckCircle, Building2,
} from "lucide-react"

const ACCENT = "#F59E0B"
const ACCENT_LIGHT = "rgba(245,158,11,0.10)"
const ACCENT_BORDER = "rgba(245,158,11,0.22)"

const inputStyle = {
  width: "100%",
  height: 52,
  padding: "0 16px",
  background: "#F0F4FF",
  border: "1.5px solid #E8ECF0",
  borderRadius: 12,
  fontSize: 16,
  color: "#0F172A",
  fontFamily: "'Figtree', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 6,
  fontFamily: "'Figtree', sans-serif",
}

const cardStyle = {
  background: "#FFFFFF",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  border: "1.5px solid #F5F0E8",
  marginBottom: 16,
}

const cardTitleStyle = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 18,
  letterSpacing: "0.08em",
  color: "#0F172A",
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
}

export default function NewQuotePage() {
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [clientVatNumber, setClientVatNumber] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [vatRate, setVatRate] = useState(21)
  const [validityDays, setValidityDays] = useState(30)
  const [notes, setNotes] = useState("")
  const [conditions, setConditions] = useState("")
  const [items, setItems] = useState([{ label: "", quantity: 1, unit_price: 0, vat_rate: null }])

  const [clientId, setClientId] = useState(null)
  const [clientSearch, setClientSearch] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [saveClient, setSaveClient] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [allClients, setAllClients] = useState([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [modalSearch, setModalSearch] = useState("")

  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [voiceSummary, setVoiceSummary] = useState(null)
  const recognitionRef = useRef(null)

  // Confirmation vocale interactive
  const [confirmMode, setConfirmMode] = useState(false)
  const [confirmFields, setConfirmFields] = useState([])
  const [confirmIndex, setConfirmIndex] = useState(0)
  const [pendingData, setPendingData] = useState(null)
  const [isConfirmListening, setIsConfirmListening] = useState(false)
  const [confirmTranscript, setConfirmTranscript] = useState("")
  const confirmRecognitionRef = useRef(null)

  // BCE lookup
  const [bceResults, setBceResults] = useState([])
  const [bceLoading, setBceLoading] = useState(false)
  const [showBceDrop, setShowBceDrop] = useState(false)
  const [bceQuery, setBceQuery] = useState("")

  useEffect(() => {
    setMounted(true)
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
      setProfile(data)
      if (data) {
        const { data: productsData } = await supabase.from("products").select("*").eq("artisan_id", data.id).order("name")
        setProducts(productsData || [])
        if (data.default_conditions) setConditions(data.default_conditions)
      }
      setIsLoading(false)
      try {
        const prefill = localStorage.getItem("agent_prefill")
        if (prefill) {
          const d = JSON.parse(prefill)
          if (d.client_name) setClientName(d.client_name)
          if (d.client_email) setClientEmail(d.client_email)
          if (d.client_phone) setClientPhone(d.client_phone)
          if (d.client_address) setClientAddress(d.client_address)
          if (d.title) setTitle(d.title)
          if (d.description) setDescription(d.description)
          if (d.notes) setNotes(d.notes)
          localStorage.removeItem("agent_prefill")
        }
      } catch (_) {}
    }
    loadProfile()
  }, [router])

  useEffect(() => {
    return () => { if (recognitionRef.current) recognitionRef.current.stop() }
  }, [])

  useEffect(() => {
    if (clientSearch.length < 2 || !profile) { setSearchResults([]); return }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name, email, phone, address, vat_number")
        .eq("artisan_id", profile.id)
        .or(`name.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%,phone.ilike.%${clientSearch}%`)
        .limit(5)
      setSearchResults(data || [])
      setIsSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [clientSearch, profile])

  const addItem = () => setItems([...items, { label: "", quantity: 1, unit_price: 0, vat_rate: null }])
  const removeItem = (index) => { if (items.length === 1) return; setItems(items.filter((_, i) => i !== index)) }
  const updateItem = (index, field, value) => { const newItems = [...items]; newItems[index][field] = value; setItems(newItems) }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const vatAmount = items.reduce((sum, item) => {
    const rate = item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : vatRate
    return sum + (item.quantity * item.unit_price) * (rate / 100)
  }, 0)
  const total = subtotal + vatAmount
  const autoliquidationTotal = items
    .filter(item => item.vat_rate === 0)
    .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const hasAutoliquidation = autoliquidationTotal > 0

  const selectClient = (client) => {
    setClientId(client.id)
    setClientName(client.name)
    setClientEmail(client.email || "")
    setClientPhone(client.phone || "")
    setClientAddress(client.address || "")
    setClientVatNumber(client.vat_number || "")
    setClientSearch("")
    setShowClientDrop(false)
    setSaveClient(false)
  }

  const clearClientSelection = () => { setClientId(null); setSaveClient(false) }

  const openClientModal = async () => {
    setShowClientModal(true)
    setModalSearch("")
    setIsLoadingClients(true)
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, address, vat_number")
      .eq("artisan_id", profile.id)
      .order("name")
    setAllClients(data || [])
    setIsLoadingClients(false)
  }

  const handleSave = async (status = "draft") => {
    if (!profile) { alert("Profil artisan non chargé."); return }
    if (!title || !clientName) { alert("Veuillez remplir au minimum le titre et le nom du client."); return }
    setIsSaving(true)
    let resolvedClientId = clientId
    if (!resolvedClientId && saveClient && clientName) {
      const { data: newClient } = await supabase.from("clients").insert({
        artisan_id: profile.id,
        name: clientName.trim(),
        email: clientEmail || null,
        phone: clientPhone || null,
        address: clientAddress || null,
      }).select().single()
      if (newClient) resolvedClientId = newClient.id
    }
    const quoteData = {
      artisan_id: profile.id,
      client_id: resolvedClientId || null,
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
      sent_at: status === "sent" ? new Date().toISOString() : null,
    }
    const { error } = await supabase.from("quotes").insert(quoteData)
    if (error) { alert("Erreur lors de la sauvegarde : " + error.message) }
    else { router.push("/dashboard") }
    setIsSaving(false)
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("La reconnaissance vocale n'est pas supportée. Utilisez Chrome ou Edge."); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition
    let finalTranscript = ""
    recognition.onresult = (event) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) { finalTranscript += event.results[i][0].transcript + " " }
        else { interim += event.results[i][0].transcript }
      }
      setTranscript(finalTranscript + interim)
    }
    recognition.onerror = (event) => {
      if (event.error === "language-not-supported") { recognition.lang = "fr-FR"; recognition.start(); return }
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscript.trim()) handleVoiceProcessing(finalTranscript.trim())
    }
    recognition.start()
    setIsListening(true)
    setTranscript("")
    setVoiceSummary(null)
  }

  const stopListening = () => { if (recognitionRef.current) recognitionRef.current.stop() }

  // ── BCE Lookup ──────────────────────────────────────────────────────
  const handleBCELookup = async (query) => {
    if (!query || query.trim().length < 2) return
    setBceLoading(true)
    setBceResults([])
    setShowBceDrop(true)
    try {
      const res = await fetch(`/api/bce-lookup?query=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setBceResults(Array.isArray(data) ? data : [])
    } catch {
      setBceResults([])
    }
    setBceLoading(false)
  }

  const selectBCEResult = (company) => {
    if (company.name) setClientName(company.name)
    if (company.vat) setClientVatNumber(company.vat)
    if (company.address) setClientAddress(company.address)
    setBceResults([])
    setShowBceDrop(false)
    setBceQuery("")
    clearClientSelection()
  }

  // ── Confirmation vocale interactive ─────────────────────────────────
  const fillFormFromData = (data) => {
    if (data.lines?.length > 0) {
      setItems(data.lines.map(l => ({ label: l.description, quantity: l.quantity, unit_price: l.unit_price, vat_rate: l.tva_rate !== undefined ? l.tva_rate : null })))
    }
    if (data.title && !title) setTitle(data.title)
    if (data.description && !description) setDescription(data.description)
    if (data.client_name) setClientName(data.client_name)
    if (data.client_email) setClientEmail(data.client_email)
    if (data.client_phone) setClientPhone(data.client_phone)
    if (data.client_address) setClientAddress(data.client_address)
    else if (data.detected_city && !clientAddress) setClientAddress(data.detected_city)
    if (data.client_vat_number) setClientVatNumber(data.client_vat_number)
    if (data.notes && !notes) setNotes(data.notes)
    if (data.conditions) setConditions(data.conditions)
    if (data.client_id) { setClientId(data.client_id); setSaveClient(false) }
    setVoiceSummary({ linesCount: data.lines?.length || 0, detectedCity: data.detected_city, travelKm: data.travel_distance_km, travelCost: data.travel_cost })
  }

  const startConfirmListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"
    recognition.continuous = false
    recognition.interimResults = false
    confirmRecognitionRef.current = recognition
    recognition.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript || ""
      setConfirmTranscript(text)
      handleConfirmAnswer(text)
    }
    recognition.onerror = () => setIsConfirmListening(false)
    recognition.onend = () => setIsConfirmListening(false)
    recognition.start()
    setIsConfirmListening(true)
    setConfirmTranscript("")
  }

  const handleConfirmAnswer = async (userResponse) => {
    const currentField = confirmFields[confirmIndex]
    if (!currentField) return

    try {
      const res = await fetch("/api/analyze-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentField.question,
          originalValue: currentField.value,
          userResponse,
        }),
      })
      const analysis = await res.json()

      const updatedData = { ...pendingData }
      if (!analysis.confirmed) {
        updatedData[currentField.field] = analysis.correctedValue
        setPendingData(updatedData)
      }

      const nextIndex = confirmIndex + 1
      if (nextIndex < confirmFields.length) {
        setConfirmIndex(nextIndex)
        setConfirmTranscript("")
      } else {
        fillFormFromData(updatedData)
        setConfirmMode(false)
        setConfirmFields([])
        setConfirmIndex(0)
        setPendingData(null)
      }
    } catch {
      // En cas d'erreur, on confirme et on passe au suivant
      const nextIndex = confirmIndex + 1
      if (nextIndex < confirmFields.length) {
        setConfirmIndex(nextIndex)
      } else {
        fillFormFromData(pendingData)
        setConfirmMode(false)
      }
    }
  }

  const skipConfirmation = () => {
    fillFormFromData(pendingData)
    setConfirmMode(false)
    setConfirmFields([])
    setConfirmIndex(0)
    setPendingData(null)
  }

  const handleVoiceProcessing = async (text) => {
    setIsProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/voice-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          products,
          departure_city: profile?.departure_city || "",
          free_km: profile?.free_km || 0,
          price_per_km: profile?.price_per_km || 0,
          accessToken: session?.access_token,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { alert("Erreur assistant vocal : " + (data.error || "inconnu")); setIsProcessing(false); return }
      if (data.needs_confirmation && data.confirmation_fields?.length > 0) {
        // Mode confirmation interactive
        setPendingData(data)
        setConfirmFields(data.confirmation_fields)
        setConfirmIndex(0)
        setConfirmMode(true)
      } else {
        fillFormFromData(data)
      }
    } catch (err) { alert("Erreur réseau : " + err.message) }
    setIsProcessing(false)
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <Loader2 size={28} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
        <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: "#64748B", fontWeight: 600 }}>Profil en cours de création...</p>
        <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#94A3B8" }}>Veuillez patienter puis recharger la page</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@400;500;600;700;800&display=swap');

        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.6 } 100% { transform: scale(2.2); opacity: 0 } }
        @keyframes nq-fadein { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes shimmer {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }

        .nq-page { opacity: 0; }
        .nq-page.nq-mounted { animation: nq-fadein 0.35s ease forwards; }

        .nq-input:focus {
          border-color: ${ACCENT} !important;
          background: #FFFBF0 !important;
          outline: none;
        }

        .nq-select:focus {
          border-color: ${ACCENT} !important;
          outline: none;
        }

        .nq-item-row {
          background: #FAFAF8;
          border-radius: 14px;
          padding: 14px;
          border: 1.5px solid #F0EDE6;
          margin-bottom: 10px;
        }

        .nq-item-row:last-child { margin-bottom: 0; }

        .nq-remove-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #CBD5E1;
          padding: 4px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background 0.15s;
        }
        .nq-remove-btn:hover { color: #EF4444; background: rgba(239,68,68,0.08); }

        .nq-add-btn {
          width: 100%;
          height: 48px;
          background: none;
          border: 1.5px dashed ${ACCENT_BORDER};
          border-radius: 12px;
          cursor: pointer;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 0.08em;
          color: ${ACCENT};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
          transition: background 0.15s, border-color 0.15s;
        }
        .nq-add-btn:hover { background: ${ACCENT_LIGHT}; border-color: ${ACCENT}; }

        .nq-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Figtree', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #94A3B8;
          padding: 0;
          transition: color 0.15s;
        }
        .nq-back-btn:hover { color: #0F172A; }

        .nq-mic-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s, opacity 0.15s;
        }
        .nq-mic-btn:hover { transform: scale(1.05); }
        .nq-mic-btn:active { transform: scale(0.95); }

        .nq-client-result-btn {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          padding: 12px 14px;
          border-bottom: 1px solid #F5F0E8;
          transition: background 0.12s;
        }
        .nq-client-result-btn:last-child { border-bottom: none; }
        .nq-client-result-btn:hover { background: ${ACCENT_LIGHT}; }

        .nq-draft-btn {
          flex: 1;
          height: 52px;
          background: #F1F5F9;
          border: 1.5px solid #E8ECF0;
          border-radius: 14px;
          cursor: pointer;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 17px;
          letter-spacing: 0.08em;
          color: #64748B;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s;
        }
        .nq-draft-btn:hover:not(:disabled) { background: #E2E8F0; }
        .nq-draft-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .nq-save-btn {
          flex: 2;
          height: 52px;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          background-size: 200% auto;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 17px;
          letter-spacing: 0.08em;
          color: white;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 14px rgba(245,158,11,0.35);
          transition: box-shadow 0.15s, transform 0.15s;
          animation: shimmer 3s linear infinite;
        }
        .nq-save-btn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(245,158,11,0.5); transform: translateY(-1px); }
        .nq-save-btn:active:not(:disabled) { transform: translateY(0); }
        .nq-save-btn:disabled { opacity: 0.5; cursor: not-allowed; animation: none; }

        .nq-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          margin-top: 14px;
          padding: 12px 14px;
          background: ${ACCENT_LIGHT};
          border-radius: 12px;
          border: 1px solid ${ACCENT_BORDER};
        }

        .nq-modal-client-btn {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          padding: 14px 20px;
          border-bottom: 1px solid #F5F0E8;
          transition: background 0.12s;
        }
        .nq-modal-client-btn:last-child { border-bottom: none; }
        .nq-modal-client-btn:hover { background: ${ACCENT_LIGHT}; }
      `}</style>

      <div className={`nq-page${mounted ? " nq-mounted" : ""}`}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <button className="nq-back-btn" onClick={() => router.push("/dashboard")}>
            <ArrowLeft size={16} />
            Retour
          </button>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            letterSpacing: "0.1em",
            color: "#0F172A",
            margin: 0,
          }}>
            NOUVEAU DEVIS
          </h1>
          <button
            className="nq-mic-btn"
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            title="Création vocale"
            style={{
              background: isListening
                ? "linear-gradient(135deg, #EF4444, #DC2626)"
                : `linear-gradient(135deg, ${ACCENT}, #D97706)`,
              boxShadow: isListening
                ? "0 4px 14px rgba(239,68,68,0.4)"
                : "0 4px 14px rgba(245,158,11,0.4)",
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            {isListening ? <MicOff size={18} color="white" /> : <Mic size={18} color="white" />}
          </button>
        </div>

        {/* ── VOICE SECTION ── */}
        {(isListening || isProcessing || transcript || voiceSummary) && (
          <div style={{
            ...cardStyle,
            border: `1.5px solid ${ACCENT_BORDER}`,
            background: "rgba(255,251,235,0.8)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Sparkles size={16} style={{ color: ACCENT }} />
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 16,
                letterSpacing: "0.08em",
                color: "#92400E",
              }}>
                {isProcessing ? "ANALYSE EN COURS..." : isListening ? "ÉCOUTE EN COURS..." : "RÉSULTAT VOCAL"}
              </span>
            </div>

            {isListening && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ position: "relative", width: 12, height: 12 }}>
                  <span style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "#EF4444", animation: "ping 1.2s ease-out infinite",
                  }} />
                  <span style={{ position: "absolute", inset: 2, borderRadius: "50%", background: "#EF4444" }} />
                </div>
                <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#92400E", fontWeight: 600 }}>
                  Parlez... cliquez sur le micro pour arrêter
                </span>
              </div>
            )}

            {isProcessing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={16} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
                <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#92400E" }}>
                  Claude analyse votre description...
                </span>
              </div>
            )}

            {transcript && (
              <div style={{
                background: "rgba(255,255,255,0.7)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#78350F",
                fontFamily: "'Figtree', sans-serif",
                lineHeight: 1.5,
                border: "1px solid rgba(245,158,11,0.15)",
                marginTop: 8,
              }}>
                {transcript}
              </div>
            )}

            {voiceSummary && !isProcessing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <CheckCircle size={16} style={{ color: "#16A34A", flexShrink: 0 }} />
                <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#15803D", fontWeight: 600 }}>
                  {voiceSummary.linesCount} ligne{voiceSummary.linesCount !== 1 ? "s" : ""} générée{voiceSummary.linesCount !== 1 ? "s" : ""}
                  {voiceSummary.detectedCity && ` · ${voiceSummary.detectedCity}`}
                  {voiceSummary.travelKm && ` · ${voiceSummary.travelKm} km`}
                  {voiceSummary.travelCost > 0 && ` · ${voiceSummary.travelCost.toFixed(2)} €`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── RECHERCHE CLIENT ── */}
        <div style={{ marginBottom: 16 }}>
          {!clientId ? (
            <div style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{
                  position: "absolute", left: 16, top: "50%",
                  transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none",
                }} />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true) }}
                  onFocus={() => clientSearch.length >= 2 && setShowClientDrop(true)}
                  onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                  placeholder="Rechercher un client existant..."
                  className="nq-input"
                  style={{ ...inputStyle, paddingLeft: 44, paddingRight: clientSearch ? 44 : 16 }}
                />
                {clientSearch && (
                  <button
                    onClick={() => { setClientSearch(""); setShowClientDrop(false); setSearchResults([]) }}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "#E2E8F0", border: "none", borderRadius: "50%",
                      width: 22, height: 22, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={12} color="#64748B" />
                  </button>
                )}
              </div>

              {showClientDrop && clientSearch.length >= 2 && (
                <div style={{
                  position: "absolute", zIndex: 30, width: "100%", top: "calc(100% + 6px)",
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: "1.5px solid #F5F0E8",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                  overflow: "hidden",
                }}>
                  {isSearching ? (
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <Loader2 size={14} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: 13, color: "#94A3B8", fontFamily: "'Figtree', sans-serif" }}>Recherche...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(c => (
                      <button key={c.id} onMouseDown={() => selectClient(c)} className="nq-client-result-btn">
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "'Figtree', sans-serif", margin: 0 }}>{c.name}</p>
                        <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'Figtree', sans-serif", margin: "2px 0 0 0" }}>
                          {[c.email, c.phone].filter(Boolean).join(" · ") || "Aucune coordonnée"}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: "14px 16px", fontSize: 13, color: "#94A3B8", fontFamily: "'Figtree', sans-serif", fontStyle: "italic" }}>
                      Aucun client trouvé — les infos seront enregistrées comme nouveau client
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px",
              background: "rgba(22,163,74,0.07)",
              border: "1.5px solid rgba(22,163,74,0.2)",
              borderRadius: 12,
            }}>
              <CheckCircle size={16} style={{ color: "#16A34A", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, fontWeight: 700, color: "#15803D", flex: 1 }}>
                Client existant ✓
              </span>
              <button
                onClick={clearClientSelection}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#94A3B8", padding: 4,
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── CARD INFORMATIONS CLIENT ── */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <User size={16} style={{ color: ACCENT }} />
            INFORMATIONS CLIENT
          </div>

          {/* Bouton carnet */}
          {!clientId && (
            <button
              type="button"
              onClick={openClientModal}
              style={{
                width: "100%", height: 44,
                background: ACCENT_LIGHT,
                border: `1.5px solid ${ACCENT_BORDER}`,
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "'Figtree', sans-serif",
                fontSize: 14, fontWeight: 700,
                color: "#92400E",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginBottom: 16,
                transition: "background 0.15s",
              }}
            >
              <BookUser size={15} style={{ color: ACCENT }} />
              Ouvrir le carnet clients
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Nom du client *</label>
              <input
                type="text" value={clientName}
                onChange={e => { setClientName(e.target.value); clearClientSelection() }}
                placeholder="M. Dupont"
                className="nq-input" style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={clientEmail}
                onChange={e => setClientEmail(e.target.value.toLowerCase())}
                placeholder="client@email.com"
                className="nq-input" style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input
                type="tel" value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+32 4XX XX XX XX"
                className="nq-input" style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Adresse du chantier</label>
              <input
                type="text" value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Rue de la Gare 12, 1420 Braine"
                className="nq-input" style={inputStyle}
              />
            </div>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>N° TVA client (B2B — optionnel)</label>
              <div style={{ display: "flex", gap: 8, position: "relative" }}>
                <input
                  type="text" value={clientVatNumber}
                  onChange={e => { setClientVatNumber(e.target.value); setBceQuery(e.target.value) }}
                  placeholder="BE 0123.456.789"
                  className="nq-input" style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleBCELookup(clientVatNumber || clientName)}
                  disabled={bceLoading}
                  title="Rechercher via BCE (Banque Carrefour des Entreprises)"
                  style={{
                    height: 52, padding: "0 14px",
                    background: ACCENT_LIGHT,
                    border: `1.5px solid ${ACCENT_BORDER}`,
                    borderRadius: 12,
                    cursor: bceLoading ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    whiteSpace: "nowrap",
                    fontFamily: "'Figtree', sans-serif",
                    fontSize: 13, fontWeight: 700,
                    color: "#92400E",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                >
                  {bceLoading
                    ? <Loader2 size={14} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
                    : <Building2 size={14} style={{ color: ACCENT }} />
                  }
                  BCE
                </button>
              </div>

              {/* Dropdown résultats BCE */}
              {showBceDrop && (bceLoading || bceResults.length > 0) && (
                <div style={{
                  position: "absolute", zIndex: 40, left: 0, right: 0, top: "calc(100% + 6px)",
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: "1.5px solid #F5F0E8",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                  overflow: "hidden",
                }}>
                  {bceLoading ? (
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <Loader2 size={14} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
                      <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#94A3B8" }}>Recherche BCE...</span>
                    </div>
                  ) : bceResults.length === 0 ? (
                    <div style={{ padding: "14px 16px", fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
                      Aucune entreprise trouvée
                    </div>
                  ) : (
                    <>
                      {bceResults.map((company, i) => (
                        <button
                          key={i}
                          onMouseDown={() => selectBCEResult(company)}
                          className="nq-client-result-btn"
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <p style={{ margin: 0, fontFamily: "'Figtree', sans-serif", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{company.name}</p>
                            {!company.active && (
                              <span style={{ fontSize: 11, background: "#FEE2E2", color: "#DC2626", borderRadius: 6, padding: "2px 6px", fontWeight: 700, flexShrink: 0 }}>Inactif</span>
                            )}
                          </div>
                          <p style={{ margin: "3px 0 0 0", fontFamily: "'Figtree', sans-serif", fontSize: 12, color: "#94A3B8" }}>
                            {[company.vat, company.address].filter(Boolean).join(" · ")}
                          </p>
                          {company.legal_form && (
                            <p style={{ margin: "2px 0 0 0", fontFamily: "'Figtree', sans-serif", fontSize: 11, color: "#CBD5E1" }}>{company.legal_form}</p>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => { setBceResults([]); setShowBceDrop(false) }}
                        style={{
                          width: "100%", padding: "8px 16px",
                          background: "#FAFAF8", border: "none",
                          fontFamily: "'Figtree', sans-serif", fontSize: 12, color: "#94A3B8",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <X size={12} /> Fermer
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {!clientId && clientName && (
            <label className="nq-checkbox">
              <input
                type="checkbox" checked={saveClient}
                onChange={e => setSaveClient(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: ACCENT, flexShrink: 0 }}
              />
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: 600, color: "#92400E" }}>
                Enregistrer ce client dans le carnet
              </span>
            </label>
          )}
        </div>

        {/* ── CARD DÉTAILS DU DEVIS ── */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <FileText size={16} style={{ color: ACCENT }} />
            DÉTAILS DU DEVIS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Titre du devis *</label>
              <input
                type="text" value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex : Remplacement tableau électrique"
                className="nq-input" style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Décrivez les travaux à réaliser..."
                rows={3}
                className="nq-input"
                style={{
                  ...inputStyle,
                  height: "auto",
                  padding: "14px 16px",
                  resize: "none",
                  lineHeight: 1.5,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>TVA globale</label>
                <select
                  value={vatRate}
                  onChange={e => setVatRate(parseFloat(e.target.value))}
                  className="nq-select"
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    WebkitAppearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px center",
                    paddingRight: 38,
                  }}
                >
                  <option value={6}>6% (rénovation)</option>
                  <option value={21}>21% (standard)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Validité (jours)</label>
                <input
                  type="number" value={validityDays}
                  onChange={e => setValidityDays(parseInt(e.target.value))}
                  onFocus={e => e.target.select()}
                  className="nq-input" style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD LIGNES DU DEVIS ── */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <Calculator size={16} style={{ color: ACCENT }} />
            LIGNES DU DEVIS
          </div>

          {items.map((item, index) => (
            <div key={index} className="nq-item-row">
              {/* Description */}
              <input
                type="text" value={item.label}
                onChange={e => updateItem(index, "label", e.target.value)}
                placeholder="Description de la prestation..."
                className="nq-input"
                style={{ ...inputStyle, height: 46, fontSize: 15, marginBottom: 10 }}
              />
              {/* Qty + Prix + TVA + Supprimer */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: "0 0 64px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Figtree', sans-serif", marginBottom: 4 }}>Qté</div>
                  <input
                    type="number" value={item.quantity}
                    onChange={e => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    min="0" step="0.5"
                    className="nq-input"
                    style={{ ...inputStyle, height: 44, fontSize: 15, padding: "0 10px", textAlign: "center" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Figtree', sans-serif", marginBottom: 4 }}>Prix unit. (€)</div>
                  <input
                    type="number" value={item.unit_price}
                    onChange={e => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    min="0" step="0.01"
                    className="nq-input"
                    style={{ ...inputStyle, height: 44, fontSize: 15, padding: "0 12px" }}
                  />
                </div>
                <div style={{ flex: "0 0 88px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Figtree', sans-serif", marginBottom: 4 }}>TVA</div>
                  <select
                    value={item.vat_rate === null || item.vat_rate === undefined ? "" : String(item.vat_rate)}
                    onChange={e => updateItem(index, "vat_rate", e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="nq-select"
                    style={{
                      ...inputStyle, height: 44, padding: "0 8px",
                      fontSize: 13,
                      appearance: "none", WebkitAppearance: "none",
                    }}
                  >
                    <option value="">Défaut</option>
                    <option value="6">6%</option>
                    <option value="12">12%</option>
                    <option value="21">21%</option>
                    <option value="0">0% Auto.</option>
                  </select>
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="nq-remove-btn"
                  style={{ marginTop: 20, flexShrink: 0 }}
                  title="Supprimer la ligne"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Total ligne + note autoliquidation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                {item.vat_rate === 0 ? (
                  <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: ACCENT, fontWeight: 600 }}>
                    Autoliquidation — art. 51 §2 CTVA belge (B2B)
                  </span>
                ) : <span />}
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, letterSpacing: "0.05em",
                  color: "#0F172A",
                }}>
                  {(item.quantity * item.unit_price).toFixed(2)} €
                </span>
              </div>
            </div>
          ))}

          <button className="nq-add-btn" onClick={addItem}>
            <Plus size={16} />
            AJOUTER UNE LIGNE
          </button>

          {/* Récapitulatif */}
          <div style={{
            marginTop: 16,
            padding: 16,
            background: "#FAFAF8",
            borderRadius: 14,
            border: "1.5px solid #F0EDE6",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#64748B" }}>Sous-total HTVA</span>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{subtotal.toFixed(2)} €</span>
            </div>
            {hasAutoliquidation && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: ACCENT }}>Dont autoliquidation (0%)</span>
                <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: 700, color: ACCENT }}>{autoliquidationTotal.toFixed(2)} €</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: "#64748B" }}>TVA</span>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{vatAmount.toFixed(2)} €</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingTop: 12, borderTop: "1.5px solid #F5F0E8",
            }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: "0.08em", color: "#0F172A" }}>TOTAL TTC</span>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 26, letterSpacing: "0.05em",
                color: ACCENT,
              }}>
                {total.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        {/* ── CARD CONDITIONS ── */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <FileText size={16} style={{ color: ACCENT }} />
            CONDITIONS GÉNÉRALES
          </div>
          <textarea
            value={conditions}
            onChange={e => setConditions(e.target.value)}
            placeholder="Conditions de vente..."
            rows={5}
            className="nq-input"
            style={{
              ...inputStyle,
              height: "auto",
              padding: "14px 16px",
              resize: "vertical",
              lineHeight: 1.5,
              fontFamily: "'Figtree', sans-serif",
              fontSize: 13,
            }}
          />
        </div>

        {/* ── BOUTONS BAS DE PAGE ── */}
        <div style={{ display: "flex", gap: 12, marginTop: 8, marginBottom: 8 }}>
          <button
            className="nq-draft-btn"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
            BROUILLON
          </button>
          <button
            className="nq-save-btn"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
          >
            {isSaving
              ? <Loader2 size={16} color="white" style={{ animation: "spin 1s linear infinite" }} />
              : null
            }
            GÉNÉRER ET ENVOYER
          </button>
        </div>
      </div>

      {/* ── MODAL CARNET CLIENTS ── */}
      {showClientModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "flex-end",
          background: "rgba(0,0,0,0.45)",
        }}>
          <div style={{
            width: "100%", maxHeight: "80vh",
            background: "#FFFFFF",
            borderRadius: "24px 24px 0 0",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
          }}>
            {/* Modal header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 20px 16px",
              borderBottom: "1px solid #F5F0E8",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BookUser size={18} style={{ color: ACCENT }} />
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 20, letterSpacing: "0.08em", color: "#0F172A",
                }}>
                  CARNET CLIENTS
                </span>
              </div>
              <button
                onClick={() => setShowClientModal(false)}
                style={{
                  background: "#F1F5F9", border: "none", cursor: "pointer",
                  borderRadius: "50%", width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={14} color="#64748B" />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #F5F0E8" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Filtrer les clients..."
                  autoFocus
                  className="nq-input"
                  style={{ ...inputStyle, paddingLeft: 42, height: 44, fontSize: 15 }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1, paddingBottom: "env(safe-area-inset-bottom)" }}>
              {isLoadingClients ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                  <Loader2 size={24} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
                </div>
              ) : allClients.length === 0 ? (
                <p style={{ textAlign: "center", padding: 40, fontFamily: "'Figtree', sans-serif", fontSize: 14, color: "#94A3B8" }}>
                  Aucun client enregistré
                </p>
              ) : (
                allClients
                  .filter(c =>
                    !modalSearch ||
                    c.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                    c.email?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                    c.phone?.includes(modalSearch)
                  )
                  .map(c => (
                    <button
                      key={c.id}
                      className="nq-modal-client-btn"
                      onClick={() => { selectClient(c); setShowClientModal(false) }}
                    >
                      <p style={{ margin: 0, fontFamily: "'Figtree', sans-serif", fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{c.name}</p>
                      <p style={{ margin: "3px 0 0 0", fontFamily: "'Figtree', sans-serif", fontSize: 12, color: "#94A3B8" }}>
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "Aucune coordonnée"}
                      </p>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMATION VOCALE ── */}
      {confirmMode && confirmFields.length > 0 && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          display: "flex", alignItems: "flex-end",
          background: "rgba(0,0,0,0.5)",
        }}>
          <div style={{
            width: "100%", maxWidth: 512,
            margin: "0 auto",
            background: "#FFFFFF",
            borderRadius: "24px 24px 0 0",
            padding: 24,
            boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
            paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          }}>
            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {confirmFields.map((_, i) => (
                  <div key={i} style={{
                    width: 28, height: 4, borderRadius: 2,
                    background: i <= confirmIndex ? ACCENT : "#E2E8F0",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: "#94A3B8" }}>
                {confirmIndex + 1}/{confirmFields.length}
              </span>
            </div>

            {/* Question */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: ACCENT_LIGHT,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <Mic size={20} style={{ color: ACCENT }} />
              </div>
              <p style={{
                fontFamily: "'Figtree', sans-serif",
                fontSize: 17, fontWeight: 700,
                color: "#0F172A",
                margin: 0, lineHeight: 1.4,
              }}>
                {confirmFields[confirmIndex]?.question}
              </p>
              {confirmTranscript && (
                <p style={{
                  marginTop: 10,
                  fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, color: "#64748B", fontStyle: "italic",
                }}>
                  Entendu : "{confirmTranscript}"
                </p>
              )}
            </div>

            {/* Boutons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button
                onClick={() => handleConfirmAnswer("oui")}
                style={{
                  flex: 1, height: 52,
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  border: "none", borderRadius: 14,
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 18, letterSpacing: "0.08em",
                  color: "white", cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
                }}
              >
                ✓ OUI
              </button>
              <button
                onClick={startConfirmListening}
                disabled={isConfirmListening}
                style={{
                  flex: 1, height: 52,
                  background: isConfirmListening ? "rgba(239,68,68,0.08)" : "#F1F5F9",
                  border: isConfirmListening ? "1.5px solid rgba(239,68,68,0.3)" : "1.5px solid #E2E8F0",
                  borderRadius: 14,
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 18, letterSpacing: "0.08em",
                  color: isConfirmListening ? "#DC2626" : "#64748B",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {isConfirmListening
                  ? <><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", animation: "ping 1.2s ease-out infinite" }} /> ÉCOUTE...</>
                  : <><Mic size={16} /> CORRIGER</>
                }
              </button>
            </div>

            <button
              onClick={skipConfirmation}
              style={{
                width: "100%", height: 40,
                background: "none", border: "none",
                fontFamily: "'Figtree', sans-serif",
                fontSize: 13, color: "#94A3B8",
                cursor: "pointer",
              }}
            >
              Ignorer les vérifications →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
