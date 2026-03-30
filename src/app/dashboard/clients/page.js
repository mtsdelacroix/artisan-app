"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  Plus, Search, Edit2, Trash2, Loader2,
  X, Save, ChevronRight, Phone, Mail, MapPin
} from "lucide-react"

const EMPTY_FORM = { name: "", email: "", phone: "", address: "", vat_number: "", notes: "" }
const ACCENT = "#F59E0B"
const ACCENT_LIGHT = "rgba(245,158,11,0.10)"
const ACCENT_BORDER = "rgba(245,158,11,0.22)"

export default function ClientsPage() {
  const [clients, setClients]           = useState([])
  const [isLoading, setIsLoading]       = useState(true)
  const [mounted, setMounted]           = useState(false)
  const [profile, setProfile]           = useState(null)
  const [search, setSearch]             = useState("")
  const [modal, setModal]               = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [isSaving, setIsSaving]         = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: profileData } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
      setProfile(profileData)
      if (profileData) await loadClients(profileData.id)
      setIsLoading(false)
    }
    load()
  }, [router])

  const loadClients = async (artisanId) => {
    const { data } = await supabase.from("clients").select("*").eq("artisan_id", artisanId).order("name")
    setClients(data || [])
  }

  const openCreate = () => { setForm(EMPTY_FORM); setModal("create") }
  const openEdit   = (client) => {
    setForm({ name: client.name, email: client.email || "", phone: client.phone || "", address: client.address || "", notes: client.notes || "", vat_number: client.vat_number || "" })
    setModal(client)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Le nom est requis."); return }
    setIsSaving(true)
    if (modal === "create") {
      const { error } = await supabase.from("clients").insert({
        artisan_id: profile.id, name: form.name.trim(),
        email: form.email || null, phone: form.phone || null,
        address: form.address || null, vat_number: form.vat_number || null, notes: form.notes || null,
      })
      if (error) alert("Erreur : " + error.message)
      else { await loadClients(profile.id); setModal(null) }
    } else {
      const { error } = await supabase.from("clients").update({
        name: form.name.trim(), email: form.email || null, phone: form.phone || null,
        address: form.address || null, vat_number: form.vat_number || null, notes: form.notes || null,
      }).eq("id", modal.id)
      if (error) alert("Erreur : " + error.message)
      else {
        setClients(prev => prev.map(c => c.id === modal.id ? { ...c, ...form, name: form.name.trim(), vat_number: form.vat_number || null } : c))
        setModal(null)
      }
    }
    setIsSaving(false)
  }

  const handleDelete = async (clientId) => {
    const { error } = await supabase.from("clients").delete().eq("id", clientId)
    if (error) alert("Erreur : " + error.message)
    else { setClients(prev => prev.filter(c => c.id !== clientId)); setDeleteConfirm(null) }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const getInitials = (name) => {
    const parts = name.trim().split(" ").filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const inputStyle = {
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
  }
  const labelStyle = {
    display: "block", fontSize: 10, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    color: "#94A3B8", marginBottom: 5,
    fontFamily: "'Figtree', sans-serif",
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

        .cp-root { min-height: 100dvh; background: #FDFAF5; font-family: 'Figtree', sans-serif; -webkit-font-smoothing: antialiased; }
        .cp-inner { max-width: 480px; margin: 0 auto; padding: 0 20px 100px; opacity: 0; transform: translateY(14px); transition: opacity 0.45s ease, transform 0.45s ease; }
        .cp-inner.in { opacity: 1; transform: translateY(0); }

        /* Header */
        .cp-header { padding-top: 52px; padding-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .cp-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: #0F172A; letter-spacing: 1.5px; line-height: 1; }
        .cp-title-count { font-size: 14px; font-weight: 600; color: #94A3B8; margin-left: 8px; vertical-align: middle; font-family: 'Figtree', sans-serif; letter-spacing: 0; }
        .cp-new-btn {
          display: flex; align-items: center; gap: 7px;
          height: 42px; padding: 0 18px;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          border: none; border-radius: 12px;
          font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 1.5px;
          color: #FFFFFF; cursor: pointer; flex-shrink: 0;
          box-shadow: 0 3px 12px rgba(245,158,11,0.32);
          transition: transform 0.15s, box-shadow 0.15s;
          position: relative; overflow: hidden;
        }
        .cp-new-btn::after { content: ''; position: absolute; top: 0; left: -100%; width: 55%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent); animation: cp-shimmer 3.5s ease-in-out infinite; }
        @keyframes cp-shimmer { 0% { left: -100%; } 50%, 100% { left: 160%; } }
        .cp-new-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 20px rgba(245,158,11,0.48); }
        .cp-new-btn:active { transform: translateY(0) scale(0.98); }

        /* Search */
        .cp-search-wrap { position: relative; margin-bottom: 16px; }
        .cp-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94A3B8; display: flex; align-items: center; pointer-events: none; }
        .cp-search { width: 100%; height: 48px; background: #FFFFFF; border: 1.5px solid #F0EDE6; border-radius: 14px; padding: 0 40px 0 42px; font-family: 'Figtree', sans-serif; font-size: 14px; color: #0F172A; outline: none; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none; box-sizing: border-box; }
        .cp-search::placeholder { color: #CBD5E1; }
        .cp-search:focus { border-color: rgba(245,158,11,0.4); box-shadow: 0 0 0 3px rgba(245,158,11,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        .cp-search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: #E2E8F0; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748B; transition: background 0.15s; }
        .cp-search-clear:hover { background: #CBD5E1; }

        /* Results label */
        .cp-results { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: #94A3B8; margin-bottom: 12px; font-family: 'Figtree', sans-serif; }

        /* Client card */
        .cp-card { background: #FFFFFF; border-radius: 20px; padding: 18px 20px; margin-bottom: 10px; border: 1.5px solid #F5F0E8; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 14px; cursor: default; transition: box-shadow 0.2s, transform 0.15s; }
        .cp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .cp-avatar { width: 46px; height: 46px; border-radius: 14px; background: rgba(245,158,11,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: #D97706; letter-spacing: 1px; }
        .cp-info { flex: 1; min-width: 0; }
        .cp-name { font-size: 15px; font-weight: 700; color: #0F172A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; }
        .cp-meta { display: flex; flex-direction: column; gap: 2px; }
        .cp-meta-row { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #64748B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cp-vat-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; background: #F1F5F9; color: #64748B; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 4px; width: fit-content; }
        .cp-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .cp-action-btn { width: 34px; height: 34px; border-radius: 9px; border: 1.5px solid #F0EDE6; background: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #94A3B8; transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .cp-action-btn:hover { background: rgba(245,158,11,0.08); color: #F59E0B; border-color: rgba(245,158,11,0.25); }
        .cp-action-btn.danger:hover { background: #FEF2F2; color: #EF4444; border-color: #FECACA; }
        .cp-quotes-btn { display: flex; align-items: center; gap: 3px; padding: 0 10px; height: 34px; border-radius: 9px; border: 1.5px solid #F0EDE6; background: #FFFFFF; font-family: 'Figtree', sans-serif; font-size: 11px; font-weight: 700; color: #94A3B8; cursor: pointer; transition: background 0.15s, color 0.15s; white-space: nowrap; }
        .cp-quotes-btn:hover { background: rgba(245,158,11,0.08); color: #F59E0B; border-color: rgba(245,158,11,0.25); }

        /* Empty state */
        .cp-empty { background: #FFFFFF; border-radius: 20px; padding: 52px 20px; text-align: center; border: 1.5px solid #F5F0E8; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .cp-empty-emoji { font-size: 48px; margin-bottom: 12px; }
        .cp-empty-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: #0F172A; letter-spacing: 1px; margin-bottom: 6px; }
        .cp-empty-sub { font-size: 13px; color: #94A3B8; }

        /* Modal */
        .cp-modal-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(15,23,42,0.38); backdrop-filter: blur(3px); display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 640px) { .cp-modal-backdrop { align-items: center; } }
        .cp-modal { background: #FFFFFF; border-radius: 24px 24px 0 0; width: 100%; max-width: 460px; padding: 24px; animation: cp-slide-up 0.25s ease-out; max-height: 92dvh; overflow-y: auto; }
        @media (min-width: 640px) { .cp-modal { border-radius: 20px; margin: 16px; } }
        @keyframes cp-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cp-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .cp-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: #0F172A; letter-spacing: 1px; }
        .cp-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: #F1F5F9; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .cp-modal-close:hover { background: #E2E8F0; }
        .cp-modal-field { margin-bottom: 12px; }
        .cp-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
        .cp-modal-input { width: 100%; height: 44px; background: #FFFFFF; border: 1.5px solid #F0EDE6; border-radius: 10px; padding: 0 12px; font-family: 'Figtree', sans-serif; font-size: 14px; color: #0F172A; outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none; }
        .cp-modal-input:focus { border-color: rgba(245,158,11,0.5); box-shadow: 0 0 0 3px rgba(245,158,11,0.08); }
        .cp-modal-input::placeholder { color: #CBD5E1; }
        .cp-modal-textarea { width: 100%; padding: 10px 12px; background: #FFFFFF; border: 1.5px solid #F0EDE6; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 14px; color: #0F172A; outline: none; resize: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .cp-modal-textarea:focus { border-color: rgba(245,158,11,0.5); box-shadow: 0 0 0 3px rgba(245,158,11,0.08); }
        .cp-modal-textarea::placeholder { color: #CBD5E1; }
        .cp-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .cp-btn-cancel { flex: 1; height: 48px; border-radius: 12px; border: none; background: #F1F5F9; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; color: #334155; cursor: pointer; transition: background 0.15s; }
        .cp-btn-cancel:hover { background: #E2E8F0; }
        .cp-btn-save { flex: 1; height: 48px; border-radius: 12px; border: none; background: linear-gradient(135deg, #F59E0B, #D97706); font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 3px 12px rgba(245,158,11,0.3); transition: transform 0.15s, box-shadow 0.15s; }
        .cp-btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(245,158,11,0.45); }
        .cp-btn-save:disabled { opacity: 0.45; cursor: not-allowed; }
        .cp-btn-delete { flex: 1; height: 48px; border-radius: 12px; border: none; background: #EF4444; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; transition: background 0.15s; }
        .cp-btn-delete:hover { background: #DC2626; }

        /* Noise */
        .cp-noise { position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.018; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 192px; }
      `}</style>

      <div className="cp-noise" aria-hidden="true" />

      {/* ── Modal créer / modifier ── */}
      {modal !== null && (
        <div className="cp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="cp-modal">
            <div className="cp-modal-header">
              <div className="cp-modal-title">
                {modal === "create" ? "NOUVEAU CLIENT" : "MODIFIER LE CLIENT"}
              </div>
              <button className="cp-modal-close" onClick={() => setModal(null)}>
                <X size={14} color="#64748B" />
              </button>
            </div>

            <div className="cp-modal-field">
              <label style={labelStyle}>Nom *</label>
              <input
                className="cp-modal-input" type="text" value={form.name} autoFocus
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="M. Dupont"
              />
            </div>

            <div className="cp-modal-grid">
              <div>
                <label style={labelStyle}>Email</label>
                <input className="cp-modal-input" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))}
                  placeholder="client@email.com" />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input className="cp-modal-input" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+32..." />
              </div>
            </div>

            <div className="cp-modal-field">
              <label style={labelStyle}>Adresse</label>
              <input className="cp-modal-input" type="text" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Rue de la Gare 12, 1420 Braine" />
            </div>

            <div className="cp-modal-field">
              <label style={labelStyle}>N° TVA (B2B)</label>
              <input className="cp-modal-input" type="text" value={form.vat_number}
                onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))}
                placeholder="BE 0123.456.789" />
            </div>

            <div className="cp-modal-field">
              <label style={labelStyle}>Notes internes</label>
              <textarea className="cp-modal-textarea" value={form.notes} rows={2}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Infos utiles sur ce client..." />
            </div>

            <div className="cp-modal-actions">
              <button className="cp-btn-cancel" onClick={() => setModal(null)}>Annuler</button>
              <button className="cp-btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  : <Save size={16} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression ── */}
      {deleteConfirm && (
        <div className="cp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}>
          <div className="cp-modal" style={{ maxWidth: 400 }}>
            <div className="cp-modal-header">
              <div className="cp-modal-title">SUPPRIMER CE CLIENT</div>
              <button className="cp-modal-close" onClick={() => setDeleteConfirm(null)}>
                <X size={14} color="#64748B" />
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 6 }}>
              Voulez-vous supprimer définitivement :
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{deleteConfirm.name}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 24 }}>
              Les devis existants ne seront pas affectés.
            </p>
            <div className="cp-modal-actions">
              <button className="cp-btn-cancel" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="cp-btn-delete" onClick={() => handleDelete(deleteConfirm.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <div className="cp-root">
        <div className={`cp-inner${mounted ? " in" : ""}`}>

          {/* ── Header ── */}
          <div className="cp-header">
            <div>
              <div className="cp-title">
                MES CLIENTS
                <span className="cp-title-count">{clients.length}</span>
              </div>
            </div>
            <button className="cp-new-btn" onClick={openCreate}>
              <Plus size={16} strokeWidth={3} />
              NOUVEAU
            </button>
          </div>

          {/* ── Search ── */}
          <div className="cp-search-wrap">
            <div className="cp-search-icon"><Search size={16} /></div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email ou téléphone..."
              className="cp-search"
            />
            {search && (
              <button className="cp-search-clear" onClick={() => setSearch("")}>
                <X size={11} />
              </button>
            )}
          </div>

          {/* ── Results count ── */}
          {search && filtered.length > 0 && (
            <div className="cp-results">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</div>
          )}

          {/* ── Client list ── */}
          {filtered.length === 0 ? (
            <div className="cp-empty">
              <div className="cp-empty-emoji">{search ? "🔍" : "👥"}</div>
              <div className="cp-empty-title">
                {search ? "AUCUN CLIENT TROUVÉ" : "AUCUN CLIENT"}
              </div>
              <div className="cp-empty-sub">
                {search
                  ? "Essayez un autre terme de recherche"
                  : "Ajoutez votre premier client ou créez un devis pour le générer automatiquement"}
              </div>
              {!search && (
                <button
                  onClick={openCreate}
                  style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 7, height: 42, padding: "0 20px", background: `linear-gradient(135deg, ${ACCENT}, #D97706)`, border: "none", borderRadius: 12, fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: "1.5px", color: "#fff", cursor: "pointer", boxShadow: "0 3px 12px rgba(245,158,11,0.3)" }}
                >
                  <Plus size={15} strokeWidth={3} />AJOUTER UN CLIENT
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((client) => (
                <div key={client.id} className="cp-card">
                  {/* Avatar */}
                  <div className="cp-avatar">{getInitials(client.name)}</div>

                  {/* Info */}
                  <div className="cp-info">
                    <div className="cp-name">{client.name}</div>
                    <div className="cp-meta">
                      {client.email && (
                        <div className="cp-meta-row">
                          <Mail size={11} color="#94A3B8" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="cp-meta-row">
                          <Phone size={11} color="#94A3B8" style={{ flexShrink: 0 }} />
                          <a href={`tel:${client.phone}`} style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }} onClick={e => e.stopPropagation()}>{client.phone}</a>
                        </div>
                      )}
                      {client.address && (
                        <div className="cp-meta-row">
                          <MapPin size={11} color="#94A3B8" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{client.address}</span>
                        </div>
                      )}
                      {!client.email && !client.phone && !client.address && (
                        <span style={{ fontSize: 12, color: "#CBD5E1" }}>Aucune coordonnée</span>
                      )}
                    </div>
                    {client.vat_number && (
                      <div className="cp-vat-badge">TVA · {client.vat_number}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="cp-actions">
                    <button
                      className="cp-quotes-btn"
                      onClick={() => router.push(`/dashboard/quotes?client=${encodeURIComponent(client.name)}`)}
                      title="Voir les devis de ce client"
                    >
                      Devis <ChevronRight size={12} />
                    </button>
                    <button className="cp-action-btn" onClick={() => openEdit(client)} title="Modifier">
                      <Edit2 size={14} />
                    </button>
                    <button className="cp-action-btn danger" onClick={() => setDeleteConfirm(client)} title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
