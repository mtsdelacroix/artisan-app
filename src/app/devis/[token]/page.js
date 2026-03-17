"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useParams, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Clock, Send, Loader2, FileText, Eye } from "lucide-react"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATUS_CONFIG = {
  draft:    { label: "Brouillon",  color: "text-gray-500",  bg: "bg-gray-100",  icon: Clock },
  sent:     { label: "En attente", color: "text-blue-600",  bg: "bg-blue-50",   icon: Send },
  viewed:   { label: "Consulté",   color: "text-amber-600", bg: "bg-amber-50",  icon: Eye },
  accepted: { label: "Accepté",    color: "text-green-700", bg: "bg-green-50",  icon: CheckCircle },
  rejected: { label: "Refusé",     color: "text-red-600",   bg: "bg-red-50",    icon: XCircle },
}

function formatNum(n) {
  return (parseFloat(n) || 0).toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PublicQuotePage() {
  const { token } = useParams()
  const searchParams = useSearchParams()
  const urlAction = searchParams.get("action") // 'accept' | 'reject'

  const [quote, setQuote]         = useState(null)
  const [artisan, setArtisan]     = useState(null)
  const [quoteRef, setQuoteRef]   = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound]   = useState(false)

  // UI état réponse
  const [pendingAction, setPendingAction] = useState(null) // 'accepted' | 'rejected'
  const [clientMessage, setClientMessage] = useState("")
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [responded, setResponded]         = useState(false)

  const loadQuote = useCallback(async () => {
    const { data: q, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("token", token)
      .single()

    if (error || !q) { setNotFound(true); setIsLoading(false); return }

    const { data: a } = await supabase
      .from("artisans")
      .select("*")
      .eq("id", q.artisan_id)
      .single()

    // Calcul numéro séquentiel
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", q.artisan_id)
      .lte("created_at", q.created_at)
    const year = new Date(q.created_at).getFullYear()
    setQuoteRef(`DEV-${year}-${String(count ?? 1).padStart(3, "0")}`)

    setQuote(q)
    setArtisan(a)
    setIsLoading(false)

    // Marquer comme vu si première visite et statut 'sent'
    if (q.status === "sent" && !q.viewed_at) {
      await supabase
        .from("quotes")
        .update({ viewed_at: new Date().toISOString(), status: "viewed" })
        .eq("token", token)
      setQuote(prev => ({ ...prev, status: "viewed", viewed_at: new Date().toISOString() }))
    }

    // Pré-sélection depuis URL param
    if (urlAction === "accept") setPendingAction("accepted")
    if (urlAction === "reject") setPendingAction("rejected")
  }, [token, urlAction])

  useEffect(() => { loadQuote() }, [loadQuote])

  const handleRespond = async () => {
    if (!pendingAction) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/quote-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: pendingAction, message: clientMessage }),
      })
      const data = await res.json()
      if (!res.ok) { alert("Erreur : " + (data.error || "inconnu")); return }
      setQuote(prev => ({ ...prev, status: pendingAction }))
      setResponded(true)
    } catch (err) {
      alert("Erreur réseau : " + err.message)
    }
    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Devis introuvable</h1>
          <p className="text-gray-500">Ce lien est invalide ou le devis a été supprimé.</p>
        </div>
      </div>
    )
  }

  const items = Array.isArray(quote.items) ? quote.items : []
  const subtotal = quote.subtotal_excl_vat ?? items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const vat = quote.total_vat ?? items.reduce((s, i) => {
    const rate = (i.vat_rate !== null && i.vat_rate !== undefined) ? i.vat_rate : (quote.vat_rate ?? 21)
    return s + (i.quantity * i.unit_price) * (rate / 100)
  }, 0)
  const total = quote.total_incl_vat ?? subtotal + vat
  const autoliquidationTotal = items.filter(i => i.vat_rate === 0).reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const hasAutoliquidation = autoliquidationTotal > 0
  const brandColor = artisan?.brand_color || "#2563eb"
  const artisanName = artisan?.business_name || `${artisan?.first_name || ""} ${artisan?.last_name || ""}`.trim()
  const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft
  const StatusIcon = statusCfg.icon
  const canRespond = quote.status === "sent" || quote.status === "viewed"
  const issueDate = new Date(quote.created_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" })
  const validUntil = new Date(new Date(quote.created_at).getTime() + (quote.validity_days || 30) * 86400000)
    .toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" })

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* En-tête artisan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          <div style={{ background: brandColor }} className="px-6 py-5 flex items-start justify-between">
            <div>
              {artisan?.logo_url && (
                <div className="mb-3 w-32 h-14 bg-white rounded-lg flex items-center justify-center p-1.5 overflow-hidden">
                  <img
                    src={artisan.logo_url}
                    alt={artisanName}
                    style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }}
                  />
                </div>
              )}
              <p className="text-xl font-bold text-white">{artisanName}</p>
              <p className="text-sm text-blue-200 mt-0.5">
                {artisan?.first_name} {artisan?.last_name}
                {artisan?.phone ? ` · ${artisan.phone}` : ""}
              </p>
              {artisan?.email && <p className="text-sm text-blue-200">{artisan.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-300 uppercase tracking-widest mb-1">Devis</p>
              <p className="text-2xl font-bold text-white">{quoteRef}</p>
              <p className="text-xs text-blue-200 mt-1">Émis le {issueDate}</p>
              <p className="text-xs text-blue-200">Valable jusqu'au {validUntil}</p>
            </div>
          </div>

          {/* Statut */}
          <div className={`px-6 py-2.5 flex items-center gap-2 ${statusCfg.bg}`}>
            <StatusIcon className={`w-4 h-4 ${statusCfg.color}`} />
            <span className={`text-sm font-medium ${statusCfg.color}`}>
              {quote.status === "accepted" ? "Vous avez accepté ce devis" :
               quote.status === "rejected" ? "Vous avez refusé ce devis" :
               statusCfg.label}
            </span>
          </div>
        </div>

        {/* Info artisan + client */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Prestataire</p>
            <p className="font-semibold text-gray-900">{artisanName}</p>
            <p className="text-sm text-gray-600">{artisan?.first_name} {artisan?.last_name}</p>
            {artisan?.address_street && <p className="text-sm text-gray-500 mt-1">{artisan.address_street}</p>}
            {(artisan?.address_postal_code || artisan?.address_city) && (
              <p className="text-sm text-gray-500">{artisan?.address_postal_code} {artisan?.address_city}</p>
            )}
            {artisan?.vat_number && <p className="text-sm text-gray-500 mt-1">TVA : {artisan.vat_number}</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</p>
            <p className="font-semibold text-gray-900">{quote.client_name}</p>
            {quote.client_email && <p className="text-sm text-gray-500">{quote.client_email}</p>}
            {quote.client_phone && <p className="text-sm text-gray-500">{quote.client_phone}</p>}
            {quote.client_address && <p className="text-sm text-gray-500 mt-1">{quote.client_address}</p>}
            {quote.client_vat_number && <p className="text-sm text-gray-500 mt-1">TVA : {quote.client_vat_number}</p>}
          </div>
        </div>

        {/* Objet */}
        {quote.title && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Objet</p>
            <p className="text-lg font-semibold text-gray-900">{quote.title}</p>
            {quote.description && <p className="text-sm text-gray-500 mt-1">{quote.description}</p>}
          </div>
        )}

        {/* Tableau des prestations */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Détail des prestations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: brandColor }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-white uppercase tracking-wide" style={{ width: "55%" }}>Description</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide" style={{ width: "12%" }}>Qté</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide" style={{ width: "16%" }}>Prix unit.</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-white uppercase tracking-wide" style={{ width: "17%" }}>Total HTVA</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan="4" className="px-5 py-6 text-center text-gray-400 text-sm">Aucune ligne</td></tr>
                ) : items.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-5 py-3 text-sm text-gray-700">{item.label || item.description}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-right">{formatNum(item.quantity)}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-right">{formatNum(item.unit_price)} €</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800 text-right">{formatNum(item.quantity * item.unit_price)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total HTVA</span><span>{formatNum(subtotal)} €</span>
                </div>
                {hasAutoliquidation && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Dont autoliquidation (0%)</span><span>{formatNum(autoliquidationTotal)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TVA</span><span>{formatNum(vat)} €</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white px-4 py-2 rounded-lg" style={{ background: brandColor }}>
                  <span>Total TTC</span><span>{formatNum(total)} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Mention légale autoliquidation */}
        {hasAutoliquidation && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Mention légale TVA</p>
            <p className="text-sm text-amber-700">Autoliquidation — En application de l'article 51 §2 du Code de la TVA belge, la taxe sur la valeur ajoutée est due par le cocontractant.</p>
          </div>
        )}

        {/* Conditions générales */}
        {quote.conditions && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Conditions générales de vente</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.conditions}</p>
          </div>
        )}

        {/* Section réponse client */}
        {canRespond && !responded && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
            {!pendingAction ? (
              <>
                <p className="text-base font-semibold text-gray-900 mb-1">Votre réponse</p>
                <p className="text-sm text-gray-500 mb-5">Acceptez ou refusez ce devis. L'artisan sera notifié immédiatement.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setPendingAction("accepted")}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 text-white font-semibold rounded-xl transition-colors text-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    <CheckCircle className="w-5 h-5" />Accepter ce devis
                  </button>
                  <button
                    onClick={() => setPendingAction("rejected")}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
                  >
                    <XCircle className="w-5 h-5 text-red-400" />Refuser ce devis
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${pendingAction === "accepted" ? "bg-green-50" : "bg-red-50"}`}>
                  {pendingAction === "accepted"
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  }
                  <p className={`text-sm font-medium ${pendingAction === "accepted" ? "text-green-700" : "text-red-600"}`}>
                    {pendingAction === "accepted" ? "Vous souhaitez accepter ce devis" : "Vous souhaitez refuser ce devis"}
                  </p>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message pour l'artisan (optionnel)</label>
                <textarea
                  value={clientMessage}
                  onChange={e => setClientMessage(e.target.value)}
                  rows={3}
                  placeholder="Ajoutez un commentaire si vous le souhaitez..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingAction(null)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleRespond}
                    disabled={isSubmitting}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 font-semibold rounded-xl transition-colors text-sm text-white disabled:opacity-60 ${
                      pendingAction === "accepted" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {isSubmitting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : pendingAction === "accepted" ? "Confirmer l'acceptation" : "Confirmer le refus"
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Confirmation après réponse */}
        {responded && (
          <div className={`rounded-2xl border p-6 mb-4 ${quote.status === "accepted" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-3">
              {quote.status === "accepted"
                ? <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                : <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              }
              <div>
                <p className={`text-base font-semibold ${quote.status === "accepted" ? "text-green-800" : "text-red-700"}`}>
                  {quote.status === "accepted" ? "Devis accepté !" : "Devis refusé"}
                </p>
                <p className={`text-sm mt-0.5 ${quote.status === "accepted" ? "text-green-600" : "text-red-500"}`}>
                  {quote.status === "accepted"
                    ? "L'artisan a été notifié et prendra contact avec vous prochainement."
                    : "L'artisan a été notifié de votre décision."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message déjà répondu */}
        {(quote.status === "accepted" || quote.status === "rejected") && !responded && (
          <div className={`rounded-2xl border p-5 mb-4 ${quote.status === "accepted" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-3">
              {quote.status === "accepted"
                ? <CheckCircle className="w-6 h-6 text-green-600" />
                : <XCircle className="w-6 h-6 text-gray-400" />
              }
              <p className={`text-sm font-medium ${quote.status === "accepted" ? "text-green-700" : "text-gray-600"}`}>
                {quote.status === "accepted" ? "Vous avez accepté ce devis ✅" : "Vous avez refusé ce devis"}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-6">
          Devis {quoteRef} · Généré par Artisan App
        </p>
      </div>
    </div>
  )
}
