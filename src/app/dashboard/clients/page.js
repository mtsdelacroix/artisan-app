"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Search, Edit2, Trash2, Loader2, Users, X, Save, ChevronRight, Phone, Mail, MapPin } from "lucide-react"

const EMPTY_FORM = { name: "", email: "", phone: "", address: "", vat_number: "", notes: "" }

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState(null) // null | "create" | { client object }
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const router = useRouter()

  useEffect(() => {
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
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("artisan_id", artisanId)
      .order("name")
    setClients(data || [])
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setModal("create")
  }

  const openEdit = (client) => {
    setForm({ name: client.name, email: client.email || "", phone: client.phone || "", address: client.address || "", notes: client.notes || "", vat_number: client.vat_number || "" })
    setModal(client)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Le nom est requis."); return }
    setIsSaving(true)
    if (modal === "create") {
      const { error } = await supabase.from("clients").insert({
        artisan_id: profile.id,
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        vat_number: form.vat_number || null,
        notes: form.notes || null,
      })
      if (error) alert("Erreur : " + error.message)
      else { await loadClients(profile.id); setModal(null) }
    } else {
      const { error } = await supabase.from("clients").update({
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        vat_number: form.vat_number || null,
        notes: form.notes || null,
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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Modal créer / modifier */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal === "create" ? "Nouveau client" : "Modifier le client"}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="M. Dupont" autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="client@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+32..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rue de la Gare 12, 1420 Braine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° TVA (B2B)</label>
                <input
                  type="text" value={form.vat_number}
                  onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="BE 0123.456.789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Infos utiles sur ce client..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSave} disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer ce client ?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium text-gray-900">{deleteConfirm.name}</span> sera supprimé du carnet. Les devis existants ne seront pas affectés.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Retour</span>
              </button>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-bold text-gray-900">Carnet clients</h1>
                <span className="text-sm text-gray-400">({clients.length})</span>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />Nouveau client
            </button>
          </div>
        </div>
      </header>

      <main className="py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{search ? "Aucun client trouvé" : "Carnet vide"}</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? "Essayez un autre terme" : "Ajoutez votre premier client ou créez un devis pour le générer automatiquement"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filtered.map(client => (
              <div key={client.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-700 font-semibold">{client.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-medium text-gray-900 truncate">{client.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {client.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />{client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />{client.phone}
                      </span>
                    )}
                    {client.address && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 shrink-0" />{client.address}
                      </span>
                    )}
                    {client.vat_number && (
                      <span className="text-xs text-gray-500">TVA : {client.vat_number}</span>
                    )}
                    {!client.email && !client.phone && !client.address && !client.vat_number && (
                      <span className="text-xs text-gray-400">Aucune coordonnée</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/dashboard/quotes?client=${encodeURIComponent(client.name)}`)}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Voir les devis de ce client"
                  >
                    Devis<ChevronRight className="w-3 h-3" />
                  </button>
                  <button onClick={() => openEdit(client)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Modifier">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(client)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
