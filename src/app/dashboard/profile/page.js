"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  Save, Loader2, User, Car, Star, FileText, Wand2,
  MessageSquare, Building2, Mic, MicOff, RotateCcw,
  CircleCheck, ArrowLeft
} from "lucide-react"
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

const ACCENT = "#F59E0B"
const DEFAULT_MSG_TEMPLATE = `Bonjour [Prénom client],\n\nVeuillez trouver ci-joint notre devis pour les travaux convenus.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n[Nom artisan]`

export default function ProfilePage() {
  const [profile, setProfile]               = useState(null)
  const [userId, setUserId]                 = useState(null)
  const [isLoading, setIsLoading]           = useState(true)
  const [mounted, setMounted]               = useState(false)
  const [isSaving, setIsSaving]             = useState(false)
  const [toast, setToast]                   = useState(null)

  const [firstName, setFirstName]           = useState("")
  const [lastName, setLastName]             = useState("")
  const [phone, setPhone]                   = useState("")
  const [businessName, setBusinessName]     = useState("")
  const [trade, setTrade]                   = useState("")
  const [departureCity, setDepartureCity]   = useState("")
  const [freeKm, setFreeKm]                 = useState(0)
  const [pricePerKm, setPricePerKm]         = useState(0)
  const [logoUrl, setLogoUrl]               = useState(null)
  const [brandColor, setBrandColor]         = useState("#F59E0B")
  const [googleReviewUrl, setGoogleReviewUrl] = useState("")
  const [vatNumber, setVatNumber]           = useState("")
  const [bceNumber, setBceNumber]           = useState("")
  const [iban, setIban]                     = useState("")
  const [bic, setBic]                       = useState("")
  const [legalForm, setLegalForm]           = useState("")
  const [addressStreet, setAddressStreet]   = useState("")
  const [addressPostalCode, setAddressPostalCode] = useState("")
  const [addressCity, setAddressCity]       = useState("")
  const [defaultMessage, setDefaultMessage] = useState("")
  const [defaultConditions, setDefaultConditions] = useState("")

  const [isListeningMsg, setIsListeningMsg]     = useState(false)
  const [isFormattingMsg, setIsFormattingMsg]   = useState(false)
  const msgRecognitionRef = useRef(null)

  const router = useRouter()

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const startMsgListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Reconnaissance vocale non supportée. Utilisez Chrome."); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "fr-BE"; recognition.continuous = true; recognition.interimResults = false
    msgRecognitionRef.current = recognition
    let final = ""
    recognition.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript + " " } }
    recognition.onerror = (e) => { if (e.error === "language-not-supported") { recognition.lang = "fr-FR"; recognition.start(); return } setIsListeningMsg(false) }
    recognition.onend = async () => {
      setIsListeningMsg(false)
      if (!final.trim()) return
      setIsFormattingMsg(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch("/api/format-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText: final.trim(), accessToken: session?.access_token }) })
        const data = await res.json()
        if (res.ok && data.text) setDefaultMessage(data.text)
      } catch {}
      setIsFormattingMsg(false)
    }
    recognition.start(); setIsListeningMsg(true)
  }
  const stopMsgListening = () => msgRecognitionRef.current?.stop()

  useEffect(() => {
    setMounted(true)
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
        setTrade(data.trade || "")
        setDepartureCity(data.departure_city || "")
        setFreeKm(data.free_km || 0)
        setPricePerKm(data.price_per_km || 0)
        setLogoUrl(data.logo_url || null)
        setBrandColor(data.brand_color || "#F59E0B")
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
    const { error } = await supabase.from("artisans").update({
      first_name: firstName, last_name: lastName, phone, business_name: businessName,
      trade: trade || null,
      departure_city: departureCity, free_km: freeKm, price_per_km: pricePerKm,
      brand_color: brandColor, google_review_url: googleReviewUrl || null,
      vat_number: vatNumber || null, bce_number: bceNumber || null,
      iban: iban || null, bic: bic || null, legal_form: legalForm || null,
      address_street: addressStreet || null, address_postal_code: addressPostalCode || null,
      address_city: addressCity || null,
      default_message: defaultMessage || null, default_conditions: defaultConditions || null,
    }).eq("id", profile.id)
    if (error) showToast("Erreur : " + error.message, "err")
    else showToast("Profil mis à jour avec succès !")
    setIsSaving(false)
  }

  // ── shared styles ────────────────────────────────────────────────────
  const inputSt = {
    width: "100%", height: 44,
    background: "#FFFFFF",
    border: "1.5px solid #F0EDE6",
    borderRadius: 10,
    padding: "0 12px",
    fontFamily: "'Figtree', sans-serif",
    fontSize: 14, color: "#0F172A",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
    WebkitAppearance: "none", appearance: "none",
  }
  const labelSt = {
    display: "block", fontSize: 10, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    color: "#94A3B8", marginBottom: 5,
    fontFamily: "'Figtree', sans-serif",
  }
  const cardSt = {
    background: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    border: "1.5px solid #F5F0E8",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  }
  const cardTitleSt = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 16, color: "#0F172A",
    letterSpacing: "1px", marginBottom: 16,
    display: "flex", alignItems: "center", gap: 8,
  }
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }

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
        .pp-root { min-height: 100dvh; background: #FDFAF5; font-family: 'Figtree', sans-serif; -webkit-font-smoothing: antialiased; }
        .pp-inner { max-width: 520px; margin: 0 auto; padding: 0 20px 100px; opacity: 0; transform: translateY(14px); transition: opacity 0.45s ease, transform 0.45s ease; }
        .pp-inner.in { opacity: 1; transform: translateY(0); }
        .pp-input:focus { border-color: rgba(245,158,11,0.5) !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.08) !important; }
        .pp-input::placeholder { color: #CBD5E1; }
        .pp-input option { background: #fff; color: #0F172A; }
        .pp-textarea { width: 100%; padding: 10px 12px; background: #FFFFFF; border: 1.5px solid #F0EDE6; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 14px; color: #0F172A; outline: none; resize: vertical; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .pp-textarea:focus { border-color: rgba(245,158,11,0.5); box-shadow: 0 0 0 3px rgba(245,158,11,0.08); }
        .pp-textarea::placeholder { color: #CBD5E1; }
        .pp-mono { font-family: 'Courier New', monospace; font-size: 12px; }
        .pp-save-btn { width: 100%; height: 56px; background: linear-gradient(135deg, #F59E0B, #D97706); border: none; border-radius: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 2px; color: #fff; cursor: pointer; box-shadow: 0 4px 18px rgba(245,158,11,0.32); transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s; position: relative; overflow: hidden; }
        .pp-save-btn::after { content: ''; position: absolute; top: 0; left: -100%; width: 55%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); animation: pp-shimmer 3.5s ease-in-out infinite; }
        @keyframes pp-shimmer { 0% { left: -100%; } 50%, 100% { left: 160%; } }
        .pp-save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(245,158,11,0.48); }
        .pp-save-btn:active:not(:disabled) { transform: translateY(0); }
        .pp-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pp-help { font-size: 11px; color: #94A3B8; margin-top: 6px; line-height: 1.5; }
        .pp-noise { position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.018; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 192px; }
      `}</style>

      <div className="pp-noise" aria-hidden="true" />

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, background: toast.type === "err" ? "#EF4444" : "#0F172A",
          color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          whiteSpace: "nowrap", fontFamily: "Figtree, sans-serif",
        }}>
          <CircleCheck size={16} style={{ color: toast.type === "err" ? "#FECACA" : "#34D399", flexShrink: 0 }} />
          {toast.msg}
        </div>
      )}

      <div className="pp-root">
        <div className={`pp-inner${mounted ? " in" : ""}`}>

          {/* ── Header ── */}
          <div style={{ paddingTop: 52, paddingBottom: 20 }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 13, fontWeight: 600, marginBottom: 14, padding: 0, fontFamily: "Figtree, sans-serif" }}
            >
              <ArrowLeft size={14} />Dashboard
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#0F172A", letterSpacing: "1.5px", lineHeight: 1 }}>
                MON PROFIL
              </div>
              <button className="pp-save-btn" onClick={handleSave} disabled={isSaving} style={{ width: "auto", height: 42, padding: "0 20px", fontSize: 16, letterSpacing: "1.5px", borderRadius: 12, flexShrink: 0 }}>
                {isSaving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                SAUVEGARDER
              </button>
            </div>
          </div>

          {/* ── Card 0 : Logo ── */}
          <div style={cardSt}>
            <div style={cardTitleSt}><User size={15} color={ACCENT} />LOGO DE L'ENTREPRISE</div>
            <LogoUpload
              currentLogoUrl={logoUrl}
              userId={userId}
              onLogoUpdate={(url) => setLogoUrl(url)}
            />
          </div>

          {/* ── Card 1 : Informations personnelles ── */}
          <div style={cardSt}>
            <div style={cardTitleSt}><User size={15} color={ACCENT} />INFORMATIONS PERSONNELLES</div>
            <div style={grid2}>
              <div>
                <label style={labelSt}>Prénom</label>
                <input className="pp-input" style={inputSt} type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" />
              </div>
              <div>
                <label style={labelSt}>Nom</label>
                <input className="pp-input" style={inputSt} type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelSt}>Téléphone</label>
              <input className="pp-input" style={inputSt} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+32 4XX XX XX XX" />
            </div>
            <div>
              <label style={labelSt}>Métier</label>
              <select className="pp-input" style={inputSt} value={trade} onChange={e => setTrade(e.target.value)}>
                <option value="">— Sélectionner —</option>
                <option value="electricien">Electricien</option>
                <option value="plombier">Plombier / Chauffagiste</option>
                <option value="peintre">Peintre</option>
                <option value="menuisier">Menuisier</option>
                <option value="macon">Maçon</option>
                <option value="couvreur">Couvreur</option>
                <option value="nettoyage">Nettoyage professionnel</option>
                <option value="autre">Autre métier du bâtiment</option>
              </select>
            </div>
          </div>

          {/* ── Card 2 : Mon entreprise ── */}
          <div style={cardSt}>
            <div style={cardTitleSt}><Building2 size={15} color={ACCENT} />MON ENTREPRISE</div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelSt}>Nom de l'entreprise</label>
              <input className="pp-input" style={inputSt} type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Dupont Électricité SRL" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelSt}>Rue et numéro</label>
              <input className="pp-input" style={inputSt} type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="Rue de la Gare 12" />
            </div>
            <div style={{ ...grid2, marginBottom: 10 }}>
              <div>
                <label style={labelSt}>Code postal</label>
                <input className="pp-input" style={inputSt} type="text" value={addressPostalCode} onChange={e => setAddressPostalCode(e.target.value)} placeholder="1420" />
              </div>
              <div>
                <label style={labelSt}>Ville</label>
                <input className="pp-input" style={inputSt} type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="Braine-l'Alleud" />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelSt}>Forme juridique</label>
              <input className="pp-input" style={inputSt} type="text" value={legalForm} onChange={e => setLegalForm(e.target.value)} placeholder="SRL, SA, Indépendant..." />
            </div>
            <div style={{ ...grid2, marginBottom: 10 }}>
              <div>
                <label style={labelSt}>Numéro TVA</label>
                <input className="pp-input" style={inputSt} type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="BE 0123.456.789" />
              </div>
              <div>
                <label style={labelSt}>N° BCE / KBO</label>
                <input className="pp-input" style={inputSt} type="text" value={bceNumber} onChange={e => setBceNumber(e.target.value)} placeholder="0123.456.789" />
              </div>
            </div>
            <div style={grid2}>
              <div>
                <label style={labelSt}>IBAN</label>
                <input className="pp-input" style={inputSt} type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder="BE68 5390 0754 7034" />
              </div>
              <div>
                <label style={labelSt}>BIC / SWIFT</label>
                <input className="pp-input" style={inputSt} type="text" value={bic} onChange={e => setBic(e.target.value)} placeholder="GEBABEBB" />
              </div>
            </div>
            <p className="pp-help">Ces informations apparaissent sur vos devis PDF.</p>
          </div>

          {/* ── Card 3 : Apparence des devis ── */}
          <div style={cardSt}>
            <div style={cardTitleSt}><FileText size={15} color={ACCENT} />APPARENCE DES DEVIS</div>

            {/* Color picker */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Couleur de marque</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={e => setBrandColor(e.target.value)}
                    style={{ width: 52, height: 44, borderRadius: 10, border: "1.5px solid #F0EDE6", cursor: "pointer", padding: 3, background: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className="pp-input"
                    style={{ ...inputSt, fontFamily: "monospace", fontSize: 13 }}
                    type="text"
                    value={brandColor}
                    onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBrandColor(e.target.value) }}
                    placeholder="#F59E0B"
                  />
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: brandColor, flexShrink: 0, boxShadow: `0 3px 10px ${brandColor}55`, border: "1.5px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.5px", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>Ap.</span>
                </div>
              </div>
              <p className="pp-help">Appliquée sur l'en-tête et les accents de vos devis PDF.</p>
            </div>

            {/* Message accompagnement */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ ...labelSt, margin: 0 }}>Message d'accompagnement</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() => setDefaultMessage(DEFAULT_MSG_TEMPLATE)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: "1.5px solid #F0EDE6", background: "#FAFAF8", fontSize: 11, fontWeight: 700, color: "#64748B", cursor: "pointer", fontFamily: "Figtree, sans-serif" }}
                  ><RotateCcw size={11} />Modèle</button>
                  <button
                    onClick={isListeningMsg ? stopMsgListening : startMsgListening}
                    disabled={isFormattingMsg}
                    style={{ width: 34, height: 34, borderRadius: 9, border: "none", background: isListeningMsg ? "#EF4444" : ACCENT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: isFormattingMsg ? 0.5 : 1, position: "relative" }}
                  >
                    {isListeningMsg ? <MicOff size={15} color="#fff" /> : <Mic size={15} color="#fff" />}
                  </button>
                </div>
              </div>
              {isFormattingMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ACCENT, marginBottom: 8 }}>
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />Reformatage par Claude...
                </div>
              )}
              <textarea
                className="pp-textarea"
                value={defaultMessage}
                onChange={e => setDefaultMessage(e.target.value)}
                rows={5}
                placeholder={`Bonjour [Prénom client],\n\nVeuillez trouver ci-joint votre devis...\n\nCordialement,\n[Nom artisan]`}
              />
              <p className="pp-help">Variables : <code style={{ background: "#F5F0E8", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>[Prénom client]</code>, <code style={{ background: "#F5F0E8", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>[Nom artisan]</code>, <code style={{ background: "#F5F0E8", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>[Numéro devis]</code></p>
            </div>
          </div>

          {/* ── Card 4 : CGV ── */}
          <div style={cardSt}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={cardTitleSt}><FileText size={15} color={ACCENT} />CONDITIONS GÉNÉRALES</div>
              <button
                onClick={() => setDefaultConditions(CGV_BELGE_DEFAUT)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9, border: "none", background: "rgba(245,158,11,0.10)", color: "#D97706", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Figtree, sans-serif", flexShrink: 0 }}
              >
                <Wand2 size={13} />CGV type belge
              </button>
            </div>
            <textarea
              className="pp-textarea pp-mono"
              value={defaultConditions}
              onChange={e => setDefaultConditions(e.target.value)}
              rows={8}
              placeholder="Vos conditions générales de vente seront pré-remplies sur chaque nouveau devis..."
            />
            <p className="pp-help">Pré-remplies automatiquement sur chaque nouveau devis. Modifiables devis par devis.</p>
          </div>

          {/* ── Card 5 : Google Reviews ── */}
          <div style={cardSt}>
            <div style={cardTitleSt}><Star size={15} color={ACCENT} />AVIS CLIENTS</div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelSt}>Lien Google Reviews</label>
              <input
                className="pp-input"
                style={inputSt}
                type="url"
                value={googleReviewUrl}
                onChange={e => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/votre-lien"
              />
            </div>
            <p className="pp-help">
              Trouvez votre lien dans Google Business Profile → Demander des avis.<br />
              Envoyé automatiquement quand vous marquez un chantier comme réalisé.
            </p>
          </div>

          {/* ── Card 6 : Tarification déplacements ── */}
          <div style={cardSt}>
            <div style={cardTitleSt}><Car size={15} color={ACCENT} />TARIFICATION DÉPLACEMENTS</div>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 14 }}>
              Utilisés par l'assistant vocal pour calculer automatiquement les frais.
            </p>
            <div style={{ marginBottom: 10 }}>
              <label style={labelSt}>Ville de départ</label>
              <input className="pp-input" style={inputSt} type="text" value={departureCity} onChange={e => setDepartureCity(e.target.value)} placeholder="Ex : Wavre" />
            </div>
            <div style={grid2}>
              <div>
                <label style={labelSt}>Km offerts</label>
                <input className="pp-input" style={inputSt} type="number" value={freeKm} onChange={e => setFreeKm(parseInt(e.target.value) || 0)} onFocus={e => e.target.select()} min="0" placeholder="0" />
                <p className="pp-help" style={{ marginTop: 4 }}>0 = tout facturé</p>
              </div>
              <div>
                <label style={labelSt}>Prix / km (€)</label>
                <input className="pp-input" style={inputSt} type="number" value={pricePerKm} onChange={e => setPricePerKm(parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} min="0" step="0.01" placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* ── Bouton Sauvegarder bas de page ── */}
          <button className="pp-save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              : <Save size={20} />}
            SAUVEGARDER LE PROFIL
          </button>

        </div>
      </div>
    </>
  )
}
