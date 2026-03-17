"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Save, Loader2, Package, Pencil } from "lucide-react"

const UNITS = ["unité", "heure", "forfait", "m²", "ml", "kg"]

export default function ProductsPage() {
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ name: "", unit_price: "", unit: "unité" })
  const [editingId, setEditingId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: profileData } = await supabase.from("artisans").select("*").eq("user_id", user.id).single()
      if (!profileData) { router.push("/dashboard"); return }
      setProfile(profileData)
      const { data: productsData } = await supabase.from("products").select("*").eq("artisan_id", profileData.id).order("name")
      setProducts(productsData || [])
      setIsLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!form.name || !form.unit_price) return
    setIsSaving(true)
    if (editingId) {
      const { error } = await supabase.from("products").update({
        name: form.name,
        unit_price: parseFloat(form.unit_price),
        unit: form.unit,
      }).eq("id", editingId)
      if (!error) {
        setProducts(products.map(p => p.id === editingId ? { ...p, name: form.name, unit_price: parseFloat(form.unit_price), unit: form.unit } : p))
      }
    } else {
      const { data, error } = await supabase.from("products").insert({
        artisan_id: profile.id,
        name: form.name,
        unit_price: parseFloat(form.unit_price),
        unit: form.unit,
      }).select().single()
      if (!error && data) setProducts([...products, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setForm({ name: "", unit_price: "", unit: "unité" })
    setEditingId(null)
    setIsSaving(false)
  }

  const handleEdit = (product) => {
    setForm({ name: product.name, unit_price: String(product.unit_price), unit: product.unit })
    setEditingId(product.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = async (id) => {
    await supabase.from("products").delete().eq("id", id)
    setProducts(products.filter(p => p.id !== id))
  }

  const handleCancel = () => {
    setForm({ name: "", unit_price: "", unit: "unité" })
    setEditingId(null)
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Mes produits & services</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Formulaire ajout / édition */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editingId ? "Modifier le produit" : "Ajouter un produit / service"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Main d'oeuvre electricien"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire (EUR)</label>
              <input
                type="number"
                value={form.unit_price}
                onChange={e => setForm({ ...form, unit_price: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !form.name || !form.unit_price}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "Modifier" : "Ajouter"}
            </button>
            {editingId && (
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-200 text-gray-600 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Annuler
              </button>
            )}
          </div>
        </div>

        {/* Liste des produits */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">
              {products.length} produit{products.length !== 1 ? "s" : ""} dans le catalogue
            </p>
          </div>
          {products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun produit pour le moment</p>
              <p className="text-gray-400 text-sm mt-1">Ajoutez vos prestations habituelles pour les retrouver dans vos devis vocaux</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map(product => (
                <div key={product.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{parseFloat(product.unit_price).toFixed(2)} EUR / {product.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(product)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
