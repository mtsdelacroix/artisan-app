"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Zap, Mail, Lock, User, Building2, Phone, ArrowRight, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [trade, setTrade] = useState("electricien")

  useEffect(() => { setMounted(true) }, [])

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
    if (error) { setError(error.message) } else { router.push("/dashboard") }
    setIsLoading(false)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName, phone, business_name: businessName, trade } },
    })
    if (authError) { setError(authError.message); setIsLoading(false); return }
    router.push("/dashboard")
    setIsLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@300;400;500;600;700&display=swap');

        .lp-root {
          min-height: 100dvh;
          display: flex;
          background: #F7F8FA;
          font-family: 'Figtree', sans-serif;
          overflow: hidden;
        }

        /* ── LEFT PANEL ── */
        .lp-left {
          display: none;
          position: relative;
          flex: 1;
          background: #FFFFFF;
          overflow: hidden;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
        }
        @media (min-width: 1024px) { .lp-left { display: flex; } }

        .lp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(245,158,11,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.07) 1px, transparent 1px);
          background-size: 52px 52px;
        }
        .lp-grid::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 65% 65% at 50% 50%, transparent 35%, #FFFFFF 100%);
        }

        .lp-glow1 {
          position: absolute;
          width: 480px; height: 480px;
          background: radial-gradient(circle, rgba(245,158,11,0.13) 0%, transparent 70%);
          border-radius: 50%;
          top: -120px; right: -120px;
          animation: lp-drift 9s ease-in-out infinite;
        }
        .lp-glow2 {
          position: absolute;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%);
          border-radius: 50%;
          bottom: 80px; left: -60px;
          animation: lp-drift 13s ease-in-out infinite reverse;
        }
        @keyframes lp-drift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(24px,-32px) scale(1.06); }
          66%      { transform: translate(-18px,22px) scale(0.94); }
        }

        .lp-divider {
          position: absolute; right: 0; top: 0; bottom: 0; width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(245,158,11,0.25) 30%, rgba(245,158,11,0.25) 70%, transparent);
        }
        .lp-vtxt {
          position: absolute; right: 1.5rem; top: 50%;
          transform: translateY(-50%) rotate(90deg);
          font-family: 'Bebas Neue', sans-serif;
          font-size: 10px; letter-spacing: 5px;
          color: rgba(0,0,0,0.08); z-index: 5; white-space: nowrap;
        }

        .lp-brand { position: relative; z-index: 10; }
        .lp-logo-wrap {
          display: inline-flex; align-items: center; justify-content: center;
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border-radius: 14px; margin-bottom: 1.75rem;
          box-shadow: 0 0 40px rgba(245,158,11,0.45);
        }
        .lp-wordmark {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(72px, 8.5vw, 116px);
          line-height: 0.88; color: #0F172A; letter-spacing: 3px;
          margin-bottom: 1.5rem;
        }
        .lp-wordmark em { color: #F59E0B; font-style: normal; }
        .lp-tagline { font-size: 1.05rem; color: #6B7280; line-height: 1.65; max-width: 320px; }

        .lp-stats { position: relative; z-index: 10; }
        .lp-stats-row { display: flex; gap: 0.875rem; flex-wrap: wrap; }
        .lp-stat {
          background: #F7F8FA;
          border: 1px solid #E2E8F0;
          border-radius: 12px; padding: 1rem 1.25rem;
        }
        .lp-stat-val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.1rem; color: #F59E0B; line-height: 1; margin-bottom: 0.2rem;
        }
        .lp-stat-lbl {
          font-size: 0.72rem; color: #6B7280;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .lp-quote {
          margin-top: 1.5rem;
          padding: 1.25rem 1.25rem;
          background: rgba(245,158,11,0.05);
          border: 1px solid rgba(245,158,11,0.14);
          border-radius: 12px;
        }
        .lp-quote p { font-size: 0.875rem; color: #4B5563; line-height: 1.65; font-style: italic; margin-bottom: 0.6rem; }
        .lp-quote-author { font-size: 0.75rem; color: #F59E0B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }

        /* ── RIGHT PANEL ── */
        .lp-right {
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          width: 100%; padding: 2rem 1.25rem;
          background: #F7F8FA; position: relative;
        }
        @media (min-width: 1024px) {
          .lp-right { width: 490px; min-width: 490px; padding: 3rem 3.5rem; }
        }

        .lp-form-wrap {
          width: 100%; max-width: 400px;
          opacity: 0; transform: translateY(18px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .lp-form-wrap.in { opacity: 1; transform: translateY(0); }

        /* Mobile brand bar */
        .lp-mob-brand {
          display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem;
        }
        @media (min-width: 1024px) { .lp-mob-brand { display: none; } }
        .lp-mob-logo {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 22px rgba(245,158,11,0.32);
          flex-shrink: 0;
        }
        .lp-mob-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.5rem; color: #0F172A; letter-spacing: 1px; line-height: 1;
        }
        .lp-mob-sub { font-size: 0.72rem; color: #6B7280; margin-top: 1px; }

        .lp-heading {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.1rem; color: #0F172A; letter-spacing: 1px; line-height: 1;
          margin-bottom: 0.3rem;
        }
        .lp-subheading { font-size: 0.875rem; color: #6B7280; margin-bottom: 1.75rem; }

        /* Toggle */
        .lp-toggle {
          display: flex;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 10px; padding: 3px; margin-bottom: 1.75rem;
        }
        .lp-tab {
          flex: 1; padding: 0.6rem; border-radius: 7px;
          border: none; background: transparent;
          color: #4B5563; font-family: 'Figtree', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        }
        .lp-tab.on {
          background: #F59E0B; color: #09090B;
          box-shadow: 0 2px 10px rgba(245,158,11,0.38);
        }

        /* Field */
        .lp-field { margin-bottom: 0.875rem; }
        .lp-label {
          display: block; font-size: 0.72rem; font-weight: 700;
          color: #4B5563; text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 0.35rem;
        }
        .lp-icon-wrap {
          position: relative;
        }
        .lp-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%); color: #94A3B8;
          pointer-events: none; display: flex; align-items: center; z-index: 1;
          transition: color 0.2s;
        }
        .lp-icon-wrap:focus-within .lp-icon { color: #F59E0B; }
        .lp-input {
          width: 100%; height: 48px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 9px; color: #0F172A;
          font-family: 'Figtree', sans-serif; font-size: 0.9rem;
          padding: 0 14px 0 38px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none; appearance: none;
        }
        .lp-input.bare { padding-left: 14px; }
        .lp-input::placeholder { color: #CBD5E1; }
        .lp-input:focus {
          border-color: rgba(245,158,11,0.55);
          box-shadow: 0 0 0 3px rgba(245,158,11,0.09);
          background: #FAFAFA;
        }
        .lp-input option { background: #FFFFFF; color: #0F172A; }

        .lp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

        /* Submit */
        .lp-btn {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          border: none; border-radius: 10px;
          color: #09090B; font-family: 'Figtree', sans-serif;
          font-size: 0.95rem; font-weight: 700; letter-spacing: 0.03em;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-top: 1.25rem; position: relative; overflow: hidden;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 18px rgba(245,158,11,0.32);
        }
        .lp-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.18), transparent);
          opacity: 0; transition: opacity 0.2s;
        }
        .lp-btn::after {
          content: ''; position: absolute; top: 0; left: -100%;
          width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          animation: lp-shimmer 3s ease-in-out infinite;
        }
        @keyframes lp-shimmer {
          0% { left: -100%; }
          50%, 100% { left: 160%; }
        }
        .lp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(245,158,11,0.48); }
        .lp-btn:hover:not(:disabled)::before { opacity: 1; }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* Alerts */
        .lp-err {
          background: rgba(239,68,68,0.09); border: 1px solid rgba(239,68,68,0.22);
          border-radius: 8px; padding: 0.7rem 1rem;
          color: #DC2626; font-size: 0.83rem; margin-bottom: 1rem;
        }
        .lp-ok {
          background: rgba(16,185,129,0.09); border: 1px solid rgba(16,185,129,0.22);
          border-radius: 8px; padding: 0.7rem 1rem;
          color: #059669; font-size: 0.83rem; margin-bottom: 1rem;
        }

        /* Scroll */
        .lp-scroll {
          max-height: calc(100dvh - 210px);
          overflow-y: auto; overflow-x: hidden;
          scrollbar-width: thin; scrollbar-color: rgba(245,158,11,0.25) transparent;
          padding-right: 2px;
        }
        @media (min-width: 1024px) { .lp-scroll { max-height: calc(100dvh - 170px); } }
        .lp-scroll::-webkit-scrollbar { width: 3px; }
        .lp-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.28); border-radius: 2px; }

        /* Footer */
        .lp-footer { text-align: center; font-size: 0.72rem; color: #94A3B8; margin-top: 1.5rem; }

        /* Noise */
        .lp-noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 200; opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 192px;
        }
      `}</style>

      <div className="lp-noise" aria-hidden="true" />

      <div className="lp-root">

        {/* ── LEFT PANEL ── */}
        <div className="lp-left">
          <div className="lp-grid" />
          <div className="lp-glow1" />
          <div className="lp-glow2" />
          <div className="lp-divider" />
          <div className="lp-vtxt">ARTISAN APP • DEVIS PROFESSIONNELS • 2026</div>

          <div className="lp-brand">
            <div className="lp-logo-wrap">
              <Zap size={26} color="#09090B" strokeWidth={2.5} />
            </div>
            <div className="lp-wordmark">
              ARTISAN<br /><em>APP</em>
            </div>
            <p className="lp-tagline">
              L'outil des pros qui construisent l'avenir.<br />
              Devis professionnels en 2 minutes chrono.
            </p>
          </div>

          <div className="lp-stats">
            <div className="lp-stats-row">
              <div className="lp-stat">
                <div className="lp-stat-val">500+</div>
                <div className="lp-stat-lbl">Artisans actifs</div>
              </div>
              <div className="lp-stat">
                <div className="lp-stat-val">2min</div>
                <div className="lp-stat-lbl">Par devis</div>
              </div>
              <div className="lp-stat">
                <div className="lp-stat-val">98%</div>
                <div className="lp-stat-lbl">Satisfaction</div>
              </div>
            </div>
            <div className="lp-quote">
              <p>"Avant je perdais 2h par devis. Maintenant c'est 5 minutes. Artisan App m'a sauve la mise."</p>
              <div className="lp-quote-author">Marc D. — Electricien, Bruxelles</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lp-right">
          <div className={`lp-form-wrap${mounted ? ' in' : ''}`}>

            {/* Mobile brand */}
            <div className="lp-mob-brand">
              <div className="lp-mob-logo">
                <Zap size={20} color="#09090B" strokeWidth={2.5} />
              </div>
              <div>
                <div className="lp-mob-name">ARTISAN APP</div>
                <div className="lp-mob-sub">Devis professionnels</div>
              </div>
            </div>

            <div className="lp-heading">{isLogin ? 'BIENVENUE' : 'REJOIGNEZ-NOUS'}</div>
            <div className="lp-subheading">
              {isLogin ? 'Connectez-vous a votre espace pro' : 'Creez votre compte artisan gratuitement'}
            </div>

            <div className="lp-toggle">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); setSuccess(null) }}
                className={`lp-tab${isLogin ? ' on' : ''}`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null); setSuccess(null) }}
                className={`lp-tab${!isLogin ? ' on' : ''}`}
              >
                Inscription
              </button>
            </div>

            {error && <div className="lp-err">{error}</div>}
            {success && <div className="lp-ok">{success}</div>}

            <div className="lp-scroll">
              {isLogin ? (
                <form onSubmit={handleLogin}>
                  <div className="lp-field">
                    <label className="lp-label">Email</label>
                    <div className="lp-icon-wrap">
                      <div className="lp-icon"><Mail size={15} /></div>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com" required className="lp-input" />
                    </div>
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">Mot de passe</label>
                    <div className="lp-icon-wrap">
                      <div className="lp-icon"><Lock size={15} /></div>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 caracteres" required className="lp-input" />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="lp-btn">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                    Se connecter
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignup}>
                  <div className="lp-grid2">
                    <div className="lp-field">
                      <label className="lp-label">Prenom</label>
                      <div className="lp-icon-wrap">
                        <div className="lp-icon"><User size={15} /></div>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Jean" required className="lp-input" />
                      </div>
                    </div>
                    <div className="lp-field">
                      <label className="lp-label">Nom</label>
                      <div className="lp-icon-wrap">
                        <div className="lp-icon"><User size={15} /></div>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                          placeholder="Dupont" required className="lp-input" />
                      </div>
                    </div>
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">Nom de l'entreprise</label>
                    <div className="lp-icon-wrap">
                      <div className="lp-icon"><Building2 size={15} /></div>
                      <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Dupont Electricite" required className="lp-input" />
                    </div>
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">Metier</label>
                    <select value={trade} onChange={(e) => setTrade(e.target.value)} className="lp-input bare">
                      {trades.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">Telephone</label>
                    <div className="lp-icon-wrap">
                      <div className="lp-icon"><Phone size={15} /></div>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        placeholder="+32 4XX XX XX XX" required className="lp-input" />
                    </div>
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">Email</label>
                    <div className="lp-icon-wrap">
                      <div className="lp-icon"><Mail size={15} /></div>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com" required className="lp-input" />
                    </div>
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">Mot de passe</label>
                    <div className="lp-icon-wrap">
                      <div className="lp-icon"><Lock size={15} /></div>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 caracteres" required minLength={8} className="lp-input" />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="lp-btn">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                    Creer mon compte
                  </button>
                </form>
              )}
            </div>

            <div className="lp-footer">© 2026 Artisan App — Tous droits reserves</div>
          </div>
        </div>

      </div>
    </>
  )
}
