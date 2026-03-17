"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Save, Loader2, User, FileText, Calculator, Mic, MicOff, Sparkles, Search, BookUser, X } from "lucide-react"

export default function NewQuotePage() {
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // Formulaire devis
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

  // Carnet clients
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

  // Assistant vocal
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [voiceSummary, setVoiceSummary] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
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

      // Pré-remplissage depuis l'agent vocal (one-shot)
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

  // Nettoyage recognition au démontage
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Recherche client en temps réel (debounced)
  useEffect(() => {
    if (clientSearch.length < 2 || !profile) {
      setSearchResults([])
      return
    }
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

  const clearClientSelection = () => {
    setClientId(null)
    setSaveClient(false)
  }

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

  // ── Web Speech API ──────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par ce navigateur. Utilisez Chrome ou Edge.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition

    let finalTranscript = ""

    recognition.onresult = (event) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " "
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setTranscript(finalTranscript + interim)
    }

    recognition.onerror = (event) => {
      // Essai fallback fr-FR si fr-BE non supporté
      if (event.error === "language-not-supported") {
        recognition.lang = "fr-FR"
        recognition.start()
        return
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscript.trim()) {
        handleVoiceProcessing(finalTranscript.trim())
      }
    }

    recognition.start()
    setIsListening(true)
    setTranscript("")
    setVoiceSummary(null)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  // ── Envoi à Claude ──────────────────────────────────────────────────
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
      if (!res.ok || data.error) {
        alert("Erreur assistant vocal : " + (data.error || "inconnu"))
        setIsProcessing(false)
        return
      }

      // Pré-remplir les lignes du devis
      if (data.lines?.length > 0) {
        setItems(data.lines.map(l => ({
          label: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          vat_rate: l.tva_rate !== undefined ? l.tva_rate : null,
        })))
      }

      // Pré-remplir les champs du devis
      if (data.title && !title) setTitle(data.title)
      if (data.description && !description) setDescription(data.description)

      // Pré-remplir les champs client
      if (data.client_name && !clientName) setClientName(data.client_name)
      if (data.client_email && !clientEmail) setClientEmail(data.client_email)
      if (data.client_phone && !clientPhone) setClientPhone(data.client_phone)
      if (data.client_address && !clientAddress) setClientAddress(data.client_address)
      else if (data.detected_city && !clientAddress) setClientAddress(data.detected_city)
      if (data.client_vat_number) setClientVatNumber(data.client_vat_number)

      // Notes
      if (data.notes && !notes) setNotes(data.notes)

      // Conditions : si Claude en a générées, elles remplacent le défaut du profil
      if (data.conditions) setConditions(data.conditions)

      // Client trouvé/créé dans le carnet
      if (data.client_id) {
        setClientId(data.client_id)
        setSaveClient(false)
      }

      // Résumé vocal
      setVoiceSummary({
        linesCount: data.lines?.length || 0,
        detectedCity: data.detected_city,
        travelKm: data.travel_distance_km,
        travelCost: data.travel_cost,
      })
    } catch (err) {
      alert("Erreur réseau : " + err.message)
    }
    setIsProcessing(false)
  }

  // ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>)
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Profil en cours de creation...</p>
          <p className="text-gray-400 text-sm mt-1">Veuillez patienter quelques instants puis recharger la page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Retour</span>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => handleSave("draft")} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />Brouillon
              </button>
              <button onClick={() => handleSave("draft")} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Sauvegarder
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Nouveau devis</h2>

        {/* ── ASSISTANT VOCAL ── */}
        <div className="bg-white rounded-xl border-2 border-blue-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Assistant vocal</h3>
            <span className="text-xs text-gray-400 ml-1">Décrivez le chantier à voix haute</span>
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Bouton micro */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 shadow-red-500/40"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
              } disabled:opacity-50`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
              )}
              {isListening
                ? <MicOff className="w-8 h-8 text-white relative z-10" />
                : <Mic className="w-8 h-8 text-white relative z-10" />
              }
            </button>

            <p className="text-sm text-gray-500">
              {isProcessing
                ? "Analyse en cours..."
                : isListening
                  ? "Parlez... cliquez pour arrêter"
                  : "Cliquez pour dicter le chantier"
              }
            </p>

            {/* Transcription temps réel */}
            {(isListening || transcript) && (
              <div className="w-full max-w-2xl bg-gray-50 rounded-lg p-4 text-sm text-gray-700 min-h-[60px] border border-gray-200">
                {transcript || <span className="text-gray-400 italic">En attente de votre voix...</span>}
              </div>
            )}

            {/* Loader processing */}
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Claude analyse votre description...</span>
              </div>
            )}

            {/* Résumé après traitement */}
            {voiceSummary && (
              <div className="w-full max-w-2xl bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm font-medium text-blue-900">
                  {voiceSummary.linesCount} ligne{voiceSummary.linesCount !== 1 ? "s" : ""} générée{voiceSummary.linesCount !== 1 ? "s" : ""}
                  {voiceSummary.detectedCity && ` · Chantier : ${voiceSummary.detectedCity}`}
                  {voiceSummary.travelKm && ` · Déplacement : ${voiceSummary.travelKm} km`}
                  {voiceSummary.travelCost > 0 && ` · ${voiceSummary.travelCost.toFixed(2)} EUR`}
                </p>
                <p className="text-xs text-blue-700 mt-1">Le formulaire a été pré-rempli — vérifiez et ajustez si nécessaire</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />Informations du devis
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre du devis *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Remplacement tableau electrique" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description du travail</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Decrivez les travaux a realiser..." rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />Client
              </h3>

              {/* Recherche dans le carnet */}
              {!clientId && (
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true) }}
                      onFocus={() => clientSearch.length >= 2 && setShowClientDrop(true)}
                      onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                      placeholder="Rechercher dans le carnet clients..."
                      className="w-full pl-10 pr-4 py-2.5 border border-blue-200 bg-blue-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showClientDrop && clientSearch.length >= 2 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {isSearching ? (
                          <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                            <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                            Recherche...
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="divide-y divide-gray-100">
                            {searchResults.map(c => (
                              <button
                                key={c.id}
                                onMouseDown={() => selectClient(c)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                              >
                                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                                <p className="text-xs text-gray-500">{[c.email, c.phone].filter(Boolean).join(" · ") || "Aucune coordonnée"}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-400 italic">
                            Aucun client trouvé — les infos seront enregistrées comme nouveau client
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openClientModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
                  >
                    <BookUser className="w-4 h-4" />
                    Carnet
                  </button>
                </div>
              )}

              {/* Modal carnet clients */}
              {showClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <BookUser className="w-5 h-5 text-blue-600" />Carnet clients
                      </h3>
                      <button onClick={() => setShowClientModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-4 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          placeholder="Filtrer les clients..."
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {isLoadingClients ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                      ) : allClients.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-10">Aucun client enregistré</p>
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
                              onClick={() => { selectClient(c); setShowClientModal(false) }}
                              className="w-full text-left px-5 py-3.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{[c.email, c.phone].filter(Boolean).join(" · ") || "Aucune coordonnée"}</p>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Badge client sélectionné depuis le carnet */}
              {clientId && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <BookUser className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-green-800 font-medium">Issu du carnet clients</span>
                  <button onClick={clearClientSelection} className="ml-auto text-xs text-green-600 hover:text-green-800 underline">Dissocier</button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client *</label>
                  <input type="text" value={clientName} onChange={(e) => { setClientName(e.target.value); clearClientSelection() }} placeholder="M. Dupont" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value.toLowerCase())} placeholder="client@email.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                  <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+32 4XX XX XX XX" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse du chantier</label>
                  <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Rue de la Gare 12, 1420 Braine" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° TVA client (B2B)</label>
                  <input type="text" value={clientVatNumber} onChange={(e) => setClientVatNumber(e.target.value)} placeholder="BE 0123.456.789" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Checkbox "Enregistrer dans le carnet" */}
              {!clientId && clientName && (
                <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveClient}
                    onChange={e => setSaveClient(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Enregistrer ce client dans le carnet</span>
                </label>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />Lignes du devis
              </h3>
              <div className="hidden sm:grid grid-cols-12 gap-2 mb-2 px-1">
                <p className="col-span-5 text-xs font-medium text-gray-500 uppercase">Description</p>
                <p className="col-span-2 text-xs font-medium text-gray-500 uppercase">Qté</p>
                <p className="col-span-2 text-xs font-medium text-gray-500 uppercase">Prix unit.</p>
                <p className="col-span-1 text-xs font-medium text-gray-500 uppercase">TVA</p>
                <p className="col-span-1 text-xs font-medium text-gray-500 uppercase text-right">Total</p>
                <p className="col-span-1"></p>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index}>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" value={item.label} onChange={(e) => updateItem(index, "label", e.target.value)} placeholder="Ex: Main d oeuvre, Materiel..." className="col-span-12 sm:col-span-5 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} min="0" step="0.5" className="col-span-4 sm:col-span-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="number" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} min="0" step="0.01" className="col-span-4 sm:col-span-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <select
                        value={item.vat_rate === null || item.vat_rate === undefined ? "" : String(item.vat_rate)}
                        onChange={(e) => updateItem(index, "vat_rate", e.target.value === "" ? null : parseFloat(e.target.value))}
                        className="col-span-3 sm:col-span-1 px-2 py-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Défaut</option>
                        <option value="6">6%</option>
                        <option value="21">21%</option>
                        <option value="0">0% Autoliq.</option>
                      </select>
                      <p className="col-span-0 sm:col-span-1 text-sm font-medium text-gray-900 text-right hidden sm:block">{(item.quantity * item.unit_price).toFixed(2)}</p>
                      <button onClick={() => removeItem(index)} className="col-span-1 p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {item.vat_rate === 0 && (
                      <p className="text-xs text-amber-600 mt-1 ml-1">Autoliquidation — art. 51 §2 CTVA belge (B2B)</p>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 text-gray-600 font-medium rounded-lg text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Plus className="w-4 h-4" />Ajouter une ligne
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Parametres</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA</label>
                  <select value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value={6}>6% (renovation plus de 10 ans)</option>
                    <option value={21}>21% (standard)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validite (jours)</label>
                  <input type="number" value={validityDays} onChange={(e) => setValidityDays(parseInt(e.target.value))} onFocus={e => e.target.select()} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarques spécifiques à ce devis..." rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conditions générales</label>
                  <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Conditions de vente..." rows={5} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recapitulatif</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total HTVA</span>
                  <span className="font-medium text-gray-900">{subtotal.toFixed(2)} EUR</span>
                </div>
                {hasAutoliquidation && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600">Dont autoliquidation (0%)</span>
                    <span className="font-medium text-amber-700">{autoliquidationTotal.toFixed(2)} EUR</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TVA</span>
                  <span className="font-medium text-gray-900">{vatAmount.toFixed(2)} EUR</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total TTC</span>
                    <span className="text-xl font-bold text-blue-600">{total.toFixed(2)} EUR</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Emetteur</h3>
              <p className="text-sm font-medium text-blue-800">{profile?.business_name}</p>
              <p className="text-sm text-blue-700">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-sm text-blue-700">{profile?.phone}</p>
              <p className="text-sm text-blue-700">{profile?.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
