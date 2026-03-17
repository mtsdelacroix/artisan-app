"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2, User, Car, Star, FileText, Wand2, MessageSquare, Building2, Mic, MicOff, RotateCcw } from "lucide-react"
import LogoUpload from "@/components/LogoUpload"

const CGV_BELGE_DEFAUT = `CONDITIONS GÉNÉRALES DE VENTE

1. VALIDITÉ DU DEVIS
Le présent devis est valable 30 jours à compter de sa date d'émission. Passé ce délai, les prix et conditions peuvent être révisés.

2. CONDITIONS DE PAIEMENT
Paiement à 30 jours date de facture. Tout retard de paiement entraîne de plein droit l'application d'intérêts de retard au taux légal belge majoré de 2%, ainsi qu'une indemnité forfaitaire de 10% du montant impayé (minimum 40 EUR).

3. RÉSERVE DE PROPRIÉTÉ
Les matériaux et fournitures livrés restent la propriété de l'entreprise jusqu'au paiement intégral du prix convenu.

4. RÉCLAMATIONS
Toute réclamation relative aux travaux effectués doit être notifiée par écrit (courrier recommandé ou email) dans les 8 jours ouvrables suivant la réception des travaux.

5. RESPONSABILITÉ
Notre responsabilité est limitée au montant du présent devis. Nous déclinons toute responsabilité pour les dommages indirects ou consécutifs.

6. DROIT APPLICABLE ET JURIDICTION
Tout litige relatif au présent contrat est soumis au droit belge. Compétence exclusive est attribuée aux tribunaux du ressort du siège social du prestataire.`

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [departureCity, setDepartureCity] = useState("")
  const [freeKm, setFreeKm] = useState(0)
  const [pricePerKm, setPricePerKm] = useState(0)
  const [logoUrl, setLogoUrl] = useState(null)
  const [brandColor, setBrandColor] = useState("#2563eb")
  const [googleReviewUrl, setGoogleReviewUrl] = useState("")
  const [vatNumber, setVatNumber] = useState("")
  const [bceNumber, setBceNumber] = useState("")
  const [iban, setIban] = useState("")
  const [bic, setBic] = useState("")
  const [legalForm, setLegalForm] = useState("")
  const [addressStreet, setAddressStreet] = useState("")
  const [addressPostalCode, setAddressPostalCode] = useState("")
  const [addressCity, setAddressCity] = useState("")
  const [defaultMessage, setDefaultMessage] = useState("")
  const [defaultConditions, setDefaultConditions] = useState("")
  const [isListeningMsg, setIsListeningMsg] = useState(false)
  const [isFormattingMsg, setIsFormattingMsg] = useState(false)
  const msgRecognitionRef = useRef(null)

  const router = useRouter()

  const DEFAULT_MSG_TEMPLATE = `Bonjour [Prénom client],\n\nVeuillez trouver ci-joint notre devis pour les travaux convenus.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n[Nom artisan]`

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
    recognition.onend = async () => {
      setIsListeningMsg(false)
      if (!final.trim()) return
      setIsFormattingMsg(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch("/api/format-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: final.trim(), accessToken: session?.access_token }),
        })
        const data = await res.json()
        if (res.ok && data.text) setDefaultMessage(data.text)
      } catch {}
      setIsFormattingMsg(false)
    }
    recognition.start()
    setIsListeningMsg(true)
  }

  const stopMsgListening = () => msgRecognitionRef.current?.stop()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUserId(user.id)
      const { data } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
      if (data) {
        setProfile(data)
        setFirstName(data.first_name || "")
        setLastName(data.last_name || "")
        setPhone(data.phone || "")
        setBusinessName(data.business_name || "")
        setDepartureCity(data.departure_city || "")
        setFreeKm(data.free_km || 0)
        setPricePerKm(data.price_per_km || 0)
        setLogoUrl(data.logo_url || null)
        setBrandColor(data.brand_color || "#2563eb")
        setGoogleReviewUrl(data.google_review_url || "")
        setVatNumber(data.vat_number || "")
        setBceNumber(data.bce_number || "")
        setIban(data.iban || "")
        setBic(data.bic || "")
        setLegalForm(data.legal_form || "")
        setAddressStreet(data.address_street || "")
        setAddressPostalCode(data.address_postal_code || "")
        setAddressCity(data.address_city || "")
        setDefaultMessage(data.default_message || "")
        setDefaultConditions(data.default_conditions || "")
      }
      setIsLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    setIsSaving(true)
    setSuccess(false)
    setSaveError(null)
    const { error } = await supabase.from("artisans").update({
      first_name: firstName,
      last_name: lastName,
      phone,
      business_name: businessName,
      departure_city: departureCity,
      free_km: freeKm,
      price_per_km: pricePerKm,
      brand_color: brandColor,
      google_review_url: googleReviewUrl || null,
      vat_number: vatNumber || null,
      bce_number: bceNumber || null,
      iban: iban || null,
      bic: bic || null,
      legal_form: legalForm || null,
      address_street: addressStreet || null,
      address_postal_code: addressPostalCode || null,
      address_city: addressCity || null,
      default_message: defaultMessage || null,
      default_conditions: defaultConditions || null,
    }).eq("id", profile.id)
    if (error) setSaveError(error.message)
    else setSuccess(true)
    setIsSaving(false)
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Mon profil</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Profil mis a jour avec succes !
          </div>
        )}
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Erreur : {saveError}
          </div>
        )}

        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <LogoUpload
            currentLogoUrl={logoUrl}
            userId={userId}
            onLogoUpdate={(url) => setLogoUrl(url)}
          />
        </div>

        {/* Couleur de marque */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Couleur de marque</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white"
            />
            <span className="text-sm text-gray-500 font-mono">{brandColor}</span>
            <div
              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              Aperçu
            </div>
          </div>
          <p className="text-xs text-gray-400">Appliquée sur l'en-tête et les accents de vos devis.</p>
        </div>

        {/* Google Reviews */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />Lien Google Reviews
          </label>
          <input
            type="url"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            placeholder="https://g.page/r/votre-lien-google"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400">
            Trouvez votre lien dans Google Business Profile → Demander des avis.<br/>
            Envoyé automatiquement à vos clients quand vous marquez un chantier comme réalisé.
          </p>
        </div>

        {/* Infos générales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />Informations generales
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l entreprise</label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Informations légales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />Informations légales
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
              <input type="text" value={legalForm} onChange={e => setLegalForm(e.target.value)} placeholder="SRL, SA, Indépendant..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° TVA</label>
              <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="BE 0123.456.789" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° BCE / KBO</label>
              <input type="text" value={bceNumber} onChange={e => setBceNumber(e.target.value)} placeholder="0123.456.789" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder="BE68 5390 0754 7034" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BIC / SWIFT</label>
              <input type="text" value={bic} onChange={e => setBic(e.target.value)} placeholder="GEBABEBB" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rue et numéro</label>
            <input type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="Rue de la Gare 12" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input type="text" value={addressPostalCode} onChange={e => setAddressPostalCode(e.target.value)} placeholder="1420" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="Braine-l'Alleud" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Ces informations apparaissent sur vos devis PDF.</p>
        </div>

        {/* Frais de déplacement */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600" />Frais de deplacement
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Utilises par l assistant vocal pour calculer automatiquement les frais de devis.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville de depart</label>
            <input
              type="text"
              value={departureCity}
              onChange={e => setDepartureCity(e.target.value)}
              placeholder="Ex: Wavre"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilometres offerts</label>
              <input
                type="number"
                value={freeKm}
                onChange={e => setFreeKm(parseInt(e.target.value) || 0)}
                onFocus={e => e.target.select()}
                min="0"
                placeholder="0"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">0 = tout est facture</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix par km (EUR)</label>
              <input
                type="number"
                value={pricePerKm}
                onChange={e => setPricePerKm(parseFloat(e.target.value) || 0)}
                onFocus={e => e.target.select()}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Message d'accompagnement par défaut */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />Message d'accompagnement du devis
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDefaultMessage(DEFAULT_MSG_TEMPLATE)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                title="Remettre le modèle par défaut"
              >
                <RotateCcw className="w-3 h-3" />Modèle
              </button>
              <button
                type="button"
                onClick={isListeningMsg ? stopMsgListening : startMsgListening}
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
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />Reformatage par Claude...
            </div>
          )}
          <textarea
            value={defaultMessage}
            onChange={(e) => setDefaultMessage(e.target.value)}
            placeholder="Ex: Bonjour [Prénom client],&#10;&#10;Veuillez trouver ci-joint votre devis...&#10;&#10;Cordialement,&#10;[Nom artisan]"
            rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <p className="text-xs text-gray-400">
            Pré-rempli à chaque envoi de devis. Variables disponibles : <span className="font-mono">[Prénom client]</span>, <span className="font-mono">[Nom artisan]</span>, <span className="font-mono">[Numéro devis]</span>. Modifiable à chaque envoi.
          </p>
        </div>

        {/* CGV par défaut */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />Conditions générales de vente (CGV)
            </label>
            <button
              type="button"
              onClick={() => setDefaultConditions(CGV_BELGE_DEFAUT)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <Wand2 className="w-3 h-3" />Générer CGV type belge
            </button>
          </div>
          <textarea
            value={defaultConditions}
            onChange={(e) => setDefaultConditions(e.target.value)}
            placeholder="Vos conditions générales de vente seront pré-remplies sur chaque nouveau devis..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
          />
          <p className="text-xs text-gray-400">
            Pré-remplies automatiquement sur chaque nouveau devis. Modifiables devis par devis.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder le profil
        </button>
      </main>
    </div>
  )
}
