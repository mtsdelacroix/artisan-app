"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Zap, Mail, Lock, User, Building2, Phone, ArrowRight, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [trade, setTrade] = useState("electricien")

  const trades = [
    { value: "electricien", label: "Electricien" },
    { value: "plombier", label: "Plombier / Chauffagiste" },
    { value: "peintre", label: "Peintre" },
    { value: "menuisier", label: "Menuisier" },
    { value: "macon", label: "Macon" },
    { value: "couvreur", label: "Couvreur" },
    { value: "nettoyage", label: "Nettoyage professionnel" },
    { value: "autre", label: "Autre metier du batiment" },
  ]

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard")
    }
    setIsLoading(false)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          business_name: businessName,
          trade,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
    setIsLoading(false)
  }

  const inputClass = "w-full h-12 pl-9 pr-4 rounded-xl border border-gray-200 text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
  const inputClassNoIcon = "w-full h-12 px-4 rounded-xl border border-gray-200 text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8"
      style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
            <Zap className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Artisan App</h1>
          <p className="text-blue-200 mt-1">Vos devis en 2 minutes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => { setIsLogin(true); setError(null); setSuccess(null) }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); setSuccess(null) }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}
            >
              Inscription
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                    <Mail size={15} />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                    <Lock size={15} />
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 caracteres" required className={inputClass} />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Se connecter
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                      <User size={15} />
                    </div>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" required className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                      <User size={15} />
                    </div>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" required className={inputClass} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l entreprise</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                    <Building2 size={15} />
                  </div>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Dupont Electricite" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metier</label>
                <select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClassNoIcon}>
                  {trades.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                    <Phone size={15} />
                  </div>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32 4XX XX XX XX" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                    <Mail size={15} />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400">
                    <Lock size={15} />
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 caracteres" required minLength={8} className={inputClass} />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Creer mon compte
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-blue-200 text-xs mt-6">2026 Artisan App</p>
      </div>
    </div>
  )
}
