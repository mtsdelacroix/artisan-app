"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, Mic, MicOff, CheckCircle, XCircle, AlertCircle, X, Send } from "lucide-react"

const SILENCE_MS = 2000

export default function AgentModal() {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalState, setModalState] = useState("idle") // idle | listening | processing | confirmation | success | error
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [agentResult, setAgentResult] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const autoCloseTimerRef = useRef(null)
  const finalTranscriptRef = useRef("")

  // Charger le profil (brand_color uniquement)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("artisans").select("id, brand_color").eq("user_id", user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      clearTimeout(silenceTimerRef.current)
      clearTimeout(autoCloseTimerRef.current)
    }
  }, [])

  const resetSilenceTimer = () => {
    clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop()
    }, SILENCE_MS)
  }

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
    finalTranscriptRef.current = ""

    recognition.onstart = () => {
      resetSilenceTimer()
    }

    recognition.onresult = (event) => {
      resetSilenceTimer()
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + " "
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setTranscript(finalTranscriptRef.current)
      setInterimTranscript(interim)
    }

    recognition.onerror = (event) => {
      if (event.error === "language-not-supported") {
        recognition.lang = "fr-FR"
        recognition.start()
        return
      }
      clearTimeout(silenceTimerRef.current)
      setModalState("error")
      setAgentResult({ error: "Erreur microphone : " + event.error })
    }

    recognition.onend = () => {
      clearTimeout(silenceTimerRef.current)
      setInterimTranscript("")
      const final = finalTranscriptRef.current.trim()
      if (final) {
        setModalState("processing")
        handleAgentCall(final)
      } else {
        setModalState("idle")
      }
    }

    recognition.start()
    setModalState("listening")
    setTranscript("")
    setInterimTranscript("")
  }

  const stopListening = () => {
    clearTimeout(silenceTimerRef.current)
    recognitionRef.current?.stop()
  }

  const handleAgentCall = async (text) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          artisanId: profile?.id,
          accessToken: session?.access_token,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setModalState("error")
        setAgentResult({ error: data.error || "Erreur inconnue" })
        return
      }

      setAgentResult(data)

      if (data.action === "send_email" && data.requires_confirmation) {
        setModalState("confirmation")
      } else if (data.action === "create_quote") {
        try {
          localStorage.setItem("agent_prefill", JSON.stringify(data.data || {}))
        } catch (_) {}
        closeModal()
        router.push("/dashboard/new-quote")
      } else if (data.action === "unknown") {
        setModalState("error")
      } else {
        setModalState("success")
        scheduleAutoClose()
      }
    } catch (err) {
      setModalState("error")
      setAgentResult({ error: err.message })
    }
  }

  const handleConfirmSend = async () => {
    if (!agentResult?.data) return
    setIsSendingEmail(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/send-custom-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: agentResult.data.client_name,
          clientEmail: agentResult.data.client_email,
          subject: agentResult.data.subject,
          message: agentResult.data.message,
          accessToken: session?.access_token,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAgentResult(prev => ({ ...prev, error: data.error }))
        setModalState("error")
      } else {
        setAgentResult(prev => ({ ...prev, human_summary: `Email envoyé à ${agentResult.data.client_name || agentResult.data.client_email}` }))
        setModalState("success")
        scheduleAutoClose()
      }
    } catch (err) {
      setModalState("error")
      setAgentResult(prev => ({ ...prev, error: err.message }))
    }
    setIsSendingEmail(false)
  }

  const scheduleAutoClose = () => {
    clearTimeout(autoCloseTimerRef.current)
    autoCloseTimerRef.current = setTimeout(() => closeModal(), 3000)
  }

  const closeModal = () => {
    recognitionRef.current?.stop()
    clearTimeout(silenceTimerRef.current)
    clearTimeout(autoCloseTimerRef.current)
    setIsModalOpen(false)
    setModalState("idle")
    setTranscript("")
    setInterimTranscript("")
    setAgentResult(null)
    finalTranscriptRef.current = ""
  }

  const handleFabClick = () => {
    setIsModalOpen(true)
    setModalState("idle")
    setTranscript("")
    setInterimTranscript("")
    setAgentResult(null)
    finalTranscriptRef.current = ""
    // Démarrer l'écoute immédiatement
    setTimeout(() => startListening(), 100)
  }

  const brandColor = profile?.brand_color || "#2563eb"

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={handleFabClick}
        className="fixed z-40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 select-none"
        style={{
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px) + 16px)",
          right: "20px",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          backgroundColor: brandColor,
          opacity: 0.82,
          boxShadow: `0 4px 16px ${brandColor}40`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.82")}
        aria-label="Assistant vocal"
        title="Assistant vocal IA"
      >
        <Mic size={20} color="white" />
      </button>

      {/* Bottom sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={closeModal}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl min-h-[320px] max-h-[85vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="px-6 pb-8 pt-2 flex-1 flex flex-col">

              {/* ── IDLE ── */}
              {modalState === "idle" && (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <p className="text-sm text-gray-500 text-center">Appuyez sur le micro pour dicter une commande</p>
                  <button
                    onClick={startListening}
                    className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg text-white transition-transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Mic className="w-8 h-8" />
                  </button>
                  <p className="text-xs text-gray-400 text-center max-w-xs">
                    Exemples : "Créer le client Jean Dupont" · "Ajouter une note sur le dernier devis" · "Envoyer un email à Marie"
                  </p>
                </div>
              )}

              {/* ── LISTENING ── */}
              {modalState === "listening" && (
                <div className="flex flex-col items-center gap-4 flex-1">
                  <p className="text-sm font-medium text-gray-700">Je vous écoute...</p>

                  {/* Bouton micro avec pulsation */}
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: brandColor }} />
                    <button
                      onClick={stopListening}
                      className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      <MicOff className="w-8 h-8" />
                    </button>
                  </div>

                  {/* Transcription en temps réel */}
                  {(transcript || interimTranscript) ? (
                    <div className="w-full bg-gray-50 rounded-xl p-4 text-sm min-h-[60px]">
                      <span className="text-gray-800">{transcript}</span>
                      <span className="text-gray-400 italic">{interimTranscript}</span>
                    </div>
                  ) : (
                    <div className="w-full bg-gray-50 rounded-xl p-4 text-sm min-h-[60px] flex items-center justify-center">
                      <span className="text-gray-400 italic">En attente de votre voix...</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">Arrêt automatique après 2 secondes de silence</p>
                </div>
              )}

              {/* ── PROCESSING ── */}
              {modalState === "processing" && (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin" style={{ color: brandColor }} />
                  <p className="text-sm font-medium text-gray-700">L'IA analyse votre demande...</p>
                  {transcript && (
                    <div className="w-full bg-gray-50 rounded-xl p-4 text-sm text-gray-600 italic">
                      "{transcript.trim()}"
                    </div>
                  )}
                </div>
              )}

              {/* ── CONFIRMATION ── */}
              {modalState === "confirmation" && agentResult && (
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-sm font-semibold text-gray-900">Confirmation requise</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800">{agentResult.human_summary}</p>
                  </div>

                  {agentResult.data && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                      {agentResult.data.client_name && (
                        <p className="text-sm"><span className="text-gray-500">Destinataire :</span> <span className="font-medium text-gray-800">{agentResult.data.client_name}</span></p>
                      )}
                      {agentResult.data.client_email ? (
                        <p className="text-sm"><span className="text-gray-500">Email :</span> <span className="font-medium text-gray-800">{agentResult.data.client_email}</span></p>
                      ) : (
                        <p className="text-sm text-red-500">⚠ Email manquant — renseignez-le dans la fiche client avant d'envoyer</p>
                      )}
                      {agentResult.data.subject && (
                        <p className="text-sm"><span className="text-gray-500">Objet :</span> <span className="font-medium text-gray-800">{agentResult.data.subject}</span></p>
                      )}
                      {agentResult.data.message && (
                        <p className="text-sm text-gray-600 italic mt-2 line-clamp-3">"{agentResult.data.message}"</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 mt-auto">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleConfirmSend}
                      disabled={isSendingEmail || !agentResult.data?.client_email}
                      className="flex-1 px-4 py-3 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: brandColor }}
                    >
                      {isSendingEmail
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</>
                        : <><Send className="w-4 h-4" />Confirmer l'envoi</>
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* ── SUCCESS ── */}
              {modalState === "success" && agentResult && (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900">Action exécutée</p>
                    <p className="text-sm text-gray-500 mt-1">{agentResult.human_summary}</p>
                  </div>
                  <p className="text-xs text-gray-400">Fermeture automatique dans 3 secondes</p>
                </div>
              )}

              {/* ── ERROR ── */}
              {modalState === "error" && (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <XCircle className="w-12 h-12 text-red-400" />
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900">Je n'ai pas compris</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {agentResult?.error || "Pouvez-vous reformuler votre demande ?"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setModalState("idle")
                      setAgentResult(null)
                      setTranscript("")
                      finalTranscriptRef.current = ""
                    }}
                    className="px-6 py-2.5 text-white text-sm font-medium rounded-xl transition-colors"
                    style={{ backgroundColor: brandColor }}
                  >
                    Réessayer
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
