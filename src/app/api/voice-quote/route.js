import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import { withRateLimit } from "@/lib/withRateLimit"
import { aiRatelimit } from "@/lib/ratelimit"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getDistanceKm(origin, destination) {
  if (!origin || !destination || !process.env.GOOGLE_MAPS_API_KEY) return null
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin + ", Belgique")}&destinations=${encodeURIComponent(destination + ", Belgique")}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=fr&units=metric`
    const res = await fetch(url)
    const data = await res.json()
    if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
      return Math.round(data.rows[0].elements[0].distance.value / 1000)
    }
  } catch {
    // Google Maps indisponible, on continue sans frais de déplacement
  }
  return null
}

export async function POST(request) {
  return withRateLimit(request, aiRatelimit, async (req) => {
    try {
      const { transcript, products, departure_city, free_km, price_per_km, accessToken } = await req.json()

      if (!accessToken) {
        return NextResponse.json({ error: "accessToken requis" }, { status: 401 })
      }

      if (!transcript) {
        return NextResponse.json({ error: "transcript manquant" }, { status: 400 })
      }

    const catalogText = products?.length > 0
      ? products.map(p => `- ${p.name} : ${p.unit_price} EUR/${p.unit}`).join("\n")
      : "Aucun produit dans le catalogue (crée des lignes libres avec prix estimés)."

    const systemPrompt = `Tu es un assistant de facturation pour artisans belges. Tu réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant, aucun texte après, aucun backtick, aucun bloc markdown. Juste le JSON brut directement.

À partir d'une description orale d'un chantier, tu génères un devis structuré complet.

Catalogue des produits de l'artisan :
${catalogText}

Paramètres de déplacement :
- Ville de départ : ${departure_city || "non définie"}
- Kilomètres offerts : ${free_km || 0} km
- Prix par km supplémentaire : ${price_per_km || 0} EUR

Règles pour les lignes du devis :
- Si la prestation correspond à un produit du catalogue → utilise EXACTEMENT le nom du produit catalogue
- Si la prestation ne correspond à aucun produit du catalogue → description courte (3-5 mots maximum)
- Détecte les quantités (ex: "8 baies vitrées" → quantité: 8, "une journée" → quantité: 1)
- Si aucune quantité mentionnée → quantité: 1
- Prix unitaire : utilise le prix du catalogue si disponible, sinon estime un prix raisonnable pour un artisan belge
- NE PAS inclure de ligne "Frais de déplacement" dans les lignes — calculé automatiquement par le système

Règles pour le champ "conditions" :
- Si le texte mentionne des conditions générales ou demande de les générer → génère des CGV conformes à la législation belge incluant : délai de paiement 30 jours, validité du devis 30 jours, clause de réserve de propriété, droit applicable belge, tribunaux belges compétents
- Si aucune mention de conditions → renvoie une chaîne vide ""

Règles pour le taux de TVA global (tva_rate) :
- TOUJOURS renseigner un nombre (jamais null)
- 6% pour travaux immobiliers sur logement de plus de 10 ans
- 21% par défaut pour tous les autres cas
- Adapte selon le contexte du texte vocal

Règles pour le taux TVA par ligne (ligne.tva_rate) :
- Par défaut, ne pas mettre de tva_rate sur une ligne (null = utilise le taux global)
- Si l'artisan mentionne "autoliquidation", "TVA 0%", "cocontractant", "sans TVA" pour une prestation spécifique → mettre tva_rate: 0 sur CETTE ligne uniquement
- tva_rate: 0 signifie autoliquidation (régime B2B belge, article 51 §2 du Code de la TVA)

Règles pour le numéro TVA client (client_vat_number) :
- Si l'artisan mentionne un numéro TVA client (ex: "BE 0123.456.789", "TVA BE0123456789") → extraire et placer dans client_vat_number
- Sinon → null

Format de réponse JSON strict (respecte EXACTEMENT ces champs) :
{
  "title": "string",
  "description": "string",
  "client_name": "string ou null",
  "client_email": "string ou null",
  "client_phone": "string ou null",
  "client_address": "string ou null",
  "client_vat_number": "string ou null",
  "detected_city": "string ou null",
  "travel_distance_km": null,
  "travel_cost": 0,
  "tva_rate": number,
  "lines": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "total": number,
      "tva_rate": null
    }
  ],
  "notes": "string",
  "conditions": "string"
}`

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: `Description du chantier : "${transcript}"` }],
    })

    const rawText = message.content[0].type === "text" ? message.content[0].text : ""

    let result
    try {
      // Nettoie les backticks markdown si Claude en a quand même ajouté
      let cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      // Extraction défensive : trouve le premier { et le dernier }
      const start = cleaned.indexOf("{")
      const end = cleaned.lastIndexOf("}")
      if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1)
      }
      result = JSON.parse(cleaned)
      if (result.client_email) result.client_email = result.client_email.toLowerCase()
    } catch (e) {
      console.error("Réponse Claude non parseable:", rawText)
      return NextResponse.json({ error: "Réponse Claude non parseable", raw: rawText }, { status: 500 })
    }

    // Lookup / création client dans le carnet
    if (result.client_name) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: artisan } = await supabase.from("artisans").select("id").eq("user_id", user.id).single()
          if (artisan) {
            const { data: found } = await supabase
              .from("clients").select("*")
              .eq("artisan_id", artisan.id)
              .ilike("name", result.client_name.trim())
              .limit(1)
            if (found?.length > 0) {
              const c = found[0]
              result.client_id = c.id
              if (!result.client_email && c.email) result.client_email = c.email
              if (!result.client_phone && c.phone) result.client_phone = c.phone
              if (!result.client_address && c.address) result.client_address = c.address
            } else {
              const { data: newClient } = await supabase.from("clients").insert({
                artisan_id: artisan.id,
                name: result.client_name.trim(),
                email: result.client_email || null,
                phone: result.client_phone || null,
                address: result.client_address || result.detected_city || null,
                vat_number: result.client_vat_number || null,
              }).select().single()
              if (newClient) result.client_id = newClient.id
            }
          }
        }
      } catch (clientErr) {
        console.error("Client carnet error:", clientErr)
      }
    }

    // Calcul frais de déplacement via Google Maps
    if (result.detected_city && departure_city && price_per_km > 0) {
      const distanceKm = await getDistanceKm(departure_city, result.detected_city)
      if (distanceKm !== null) {
        result.travel_distance_km = distanceKm
        const billableKm = Math.max(0, distanceKm - (free_km || 0))
        result.travel_cost = parseFloat((billableKm * price_per_km).toFixed(2))
        if (result.travel_cost > 0) {
          result.lines.push({
            description: `Frais de déplacement (${distanceKm} km - ${free_km || 0} km offerts x ${price_per_km} EUR/km)`,
            quantity: 1,
            unit_price: result.travel_cost,
            total: result.travel_cost,
          })
        }
      }
    }

    // Détection des champs sensibles à confirmer
    const sensitiveFields = []

    if (result.client_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(result.client_email)) {
        sensitiveFields.push({
          field: "client_email",
          value: result.client_email,
          question: `J'ai compris l'email : "${result.client_email}" — c'est correct ?`,
        })
      }
    }

    if (result.client_name && !result.client_id) {
      sensitiveFields.push({
        field: "client_name",
        value: result.client_name,
        question: `Nouveau client : "${result.client_name}" — orthographe correcte ?`,
      })
    }

    if (result.client_address && !/\d{4}/.test(result.client_address)) {
      sensitiveFields.push({
        field: "client_address",
        value: result.client_address,
        question: `Adresse : "${result.client_address}" — c'est bien ça ?`,
      })
    }

    result.needs_confirmation = sensitiveFields.length > 0
    result.confirmation_fields = sensitiveFields

    return NextResponse.json(result)
  } catch (error) {
    console.error("voice-quote error:", error)
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 })
  }
  })
}
