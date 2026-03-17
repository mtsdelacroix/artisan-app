"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Camera, X, Loader2 } from "lucide-react"

const MAX_PER_TYPE = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024
const COMPRESS_THRESHOLD = 2 * 1024 * 1024
const MAX_DIM = 1920

async function compressImage(file) {
  if (file.size <= COMPRESS_THRESHOLD) return file
  return new Promise((resolve) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM }
        else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      canvas.getContext("2d").drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })),
        "image/jpeg",
        0.85
      )
    }
    img.src = blobUrl
  })
}

function PhotoSection({ title, photos, onUpload, onDelete, onView, uploading, maxReached }) {
  const inputRef = useRef(null)
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <span className="text-xs text-gray-400">{photos.length}/{MAX_PER_TYPE}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square">
            <img
              src={photo.signedUrl}
              alt={photo.caption || title}
              className="w-full h-full object-cover rounded-lg cursor-pointer border border-gray-100"
              onClick={() => onView(photo.signedUrl)}
            />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-b-lg truncate">
                {photo.caption}
              </div>
            )}
            <button
              onClick={() => onDelete(photo)}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ))}
        {!maxReached && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}

export default function PhotoGallery({ quoteId, artisanId, userId }) {
  const [beforePhotos, setBeforePhotos] = useState([])
  const [afterPhotos, setAfterPhotos] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [uploading, setUploading] = useState(null)

  useEffect(() => {
    if (quoteId) loadPhotos()
  }, [quoteId])

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true })
    if (!data) return

    const withUrls = await Promise.all(
      data.map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from("job-photos")
          .createSignedUrl(photo.url, 3600)
        return { ...photo, signedUrl: signed?.signedUrl || "" }
      })
    )
    setBeforePhotos(withUrls.filter((p) => p.type === "before"))
    setAfterPhotos(withUrls.filter((p) => p.type === "after"))
  }

  const handleUpload = async (file, type) => {
    const current = type === "before" ? beforePhotos : afterPhotos
    if (current.length >= MAX_PER_TYPE) return
    if (file.size > MAX_FILE_SIZE) {
      alert(`Photo trop lourde (max 10 MB). La vôtre fait ${(file.size / 1024 / 1024).toFixed(1)} MB.`)
      return
    }
    setUploading(type)
    try {
      const compressed = await compressImage(file)
      const ext = compressed.name.split(".").pop()
      const filePath = `${userId}/${quoteId}/${type}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage.from("job-photos").upload(filePath, compressed)
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase.from("job_photos").insert({
        quote_id: quoteId,
        artisan_id: artisanId,
        type,
        url: filePath,
      })
      if (dbError) throw dbError

      await loadPhotos()
    } catch (err) {
      alert("Erreur upload : " + err.message)
    }
    setUploading(null)
  }

  const handleDelete = async (photo) => {
    if (!confirm("Supprimer cette photo ?")) return
    try {
      await supabase.storage.from("job-photos").remove([photo.url])
      await supabase.from("job_photos").delete().eq("id", photo.id)
      await loadPhotos()
    } catch (err) {
      alert("Erreur suppression : " + err.message)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-500" />
          Photos du chantier
          <span className="text-xs text-gray-400 font-normal">(usage interne uniquement)</span>
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Jamais visibles du client — ni dans les emails, ni sur le PDF</p>
      </div>

      <div className="flex gap-6">
        <PhotoSection
          title="Avant"
          photos={beforePhotos}
          onUpload={(file) => handleUpload(file, "before")}
          onDelete={handleDelete}
          onView={setLightbox}
          uploading={uploading === "before"}
          maxReached={beforePhotos.length >= MAX_PER_TYPE}
        />
        <PhotoSection
          title="Après"
          photos={afterPhotos}
          onUpload={(file) => handleUpload(file, "after")}
          onDelete={handleDelete}
          onView={setLightbox}
          uploading={uploading === "after"}
          maxReached={afterPhotos.length >= MAX_PER_TYPE}
        />
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Photo chantier" className="max-w-full max-h-full object-contain p-4" />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
