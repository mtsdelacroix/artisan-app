"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Upload, Loader2, ImageIcon, X } from "lucide-react"

export default function LogoUpload({ currentLogoUrl, userId, onLogoUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentLogoUrl || null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError("Le logo ne doit pas dépasser 2 MB")
      return
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setError("Format accepté : PNG, JPG, WEBP ou SVG")
      return
    }

    setError(null)
    setUploading(true)

    try {
      const ext = file.name.split(".").pop()
      const filePath = `${userId}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath)

      // Timestamp pour bypass cache navigateur
      const previewUrl = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from("artisans")
        .update({ logo_url: publicUrl })
        .eq("user_id", userId)

      if (updateError) throw updateError

      setPreview(previewUrl)
      onLogoUpdate?.(publicUrl)
    } catch (err) {
      setError("Erreur upload : " + err.message)
    }

    setUploading(false)
    // Reset input pour permettre re-upload du même fichier
    e.target.value = ""
  }

  const handleRemove = async () => {
    setError(null)
    setUploading(true)
    try {
      // On efface juste logo_url en base (le fichier reste dans Storage)
      await supabase.from("artisans").update({ logo_url: null }).eq("user_id", userId)
      setPreview(null)
      onLogoUpdate?.(null)
    } catch (err) {
      setError("Erreur suppression : " + err.message)
    }
    setUploading(false)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Logo de l'entreprise</label>

      {/* Preview */}
      {preview ? (
        <div className="relative inline-block">
          <div className="w-48 h-24 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center p-3 overflow-hidden">
            <img
              src={preview}
              alt="Logo entreprise"
              style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }}
            />
          </div>
          <button
            onClick={handleRemove}
            disabled={uploading}
            title="Supprimer le logo"
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="w-48 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-gray-50">
          <ImageIcon className="w-6 h-6 text-gray-300" />
          <p className="text-xs text-gray-400">Aucun logo</p>
        </div>
      )}

      {/* Bouton upload */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {uploading
          ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          : <Upload className="w-4 h-4 text-blue-600" />
        }
        {uploading ? "Upload en cours..." : preview ? "Changer le logo" : "Uploader un logo"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">PNG, JPG, WEBP ou SVG · max 2 MB</p>
    </div>
  )
}
