import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { transcript, artisanId, accessToken } = await request.json()

    if (!transcript || !artisanId || !accessToken) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Auth via accessToken
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    // Charger artisan
    const { data: artisan } = await supabase
      .from("artisans")
      .select("*")
      .eq("id", artisanId)
      .single()

    if (!artisan) return NextResponse.json({ error: "Artisan introuvable" }, { status: 404 })

    // Charger 10 clients récents pour aider Claude à reconnaître les noms
    const { data: recentClients } = await supabase
      .from("clients")
      .select("name, email")
      .eq("artisan_id", artisanId)
      .order("created_at", { ascending: false })
      .limit(10)

    const clientsContext = recentClients?.length > 0
      ? recentClients.map(c => `- ${c.name}${c.email ? ` (${c.email})` : ""}`).join("\n")
      : "Aucun client enregistré"

    const systemPrompt = `Tu es un assistant vocal intelligent pour artisans belges. Tu reçois une transcription vocale d'un artisan et tu dois comprendre son intention et extraire les informations pertinentes.

ARTISAN CONNECTÉ :
- Nom : ${artisan.first_name || ""} ${artisan.last_name || ""}
- Entreprise : ${artisan.business_name || ""}

CLIENTS RÉCENTS (pour reconnaissance de noms) :
${clientsContext}

ACTIONS DISPONIBLES :
1. create_client — Créer ou enregistrer un nouveau client dans le carnet
2. send_email — Envoyer un email personnalisé à un client (toujours requires_confirmation: true)
3. create_quote — Créer un nouveau devis (redirige vers le formulaire)
4. add_note — Ajouter une note interne au dernier devis
5. unknown — Intention incompréhensible ou hors périmètre

RÈGLES DE CLASSIFICATION :
- Si l'artisan parle d'ajouter, enregistrer, créer un client → create_client
- Si l'artisan parle d'envoyer un email, message, courrier à quelqu'un → send_email (requires_confirmation: true OBLIGATOIRE)
- Si l'artisan parle de créer un devis, faire un devis, nouveau chantier → create_quote
- Si l'artisan veut noter quelque chose, ajouter une remarque sur un chantier → add_note
- Sinon → unknown

CHAMPS DATA SELON L'ACTION :

create_client: { "name": string, "email": string|null, "phone": string|null, "address": string|null, "vat_number": string|null }
send_email: { "client_name": string, "client_email": string|null, "subject": string, "message": string }
create_quote: { "client_name": string|null, "client_email": string|null, "client_phone": string|null, "client_address": string|null, "title": string|null, "description": string|null, "notes": string|null }
add_note: { "note": string }
unknown: {}

Réponds UNIQUEMENT avec un JSON brut, sans backticks, sans markdown, sans texte avant ou après.

Format strict :
{
  "action": "create_client|send_email|create_quote|add_note|unknown",
  "requires_confirmation": boolean,
  "confidence": number,
  "data": { ... },
  "human_summary": "description en français de ce qui va se passer",
  "needs_clarification": null
}`

    // Appel Claude
    const message = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: `Commande vocale de l'artisan : "${transcript}"` }],
    })

    const rawText = message.content[0]?.type === "text" ? message.content[0].text : ""

    let parsed
    try {
      let cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      const start = cleaned.indexOf("{")
      const end = cleaned.lastIndexOf("}")
      if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1)
      }
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: "Réponse Claude non parseable", raw: rawText }, { status: 500 })
    }

    // Exécution des actions immédiates
    const { action, data } = parsed

    if (action === "create_client") {
      // Vérifier doublon
      const { data: existing } = await supabase
        .from("clients")
        .select("id, name")
        .eq("artisan_id", artisanId)
        .ilike("name", data.name?.trim() || "")
        .limit(1)

      if (existing?.length > 0) {
        return NextResponse.json({
          ...parsed,
          executed: false,
          human_summary: `Le client "${data.name}" existe déjà dans votre carnet`,
        })
      }

      const { error: insertError } = await supabase.from("clients").insert({
        artisan_id: artisanId,
        name: data.name?.trim(),
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        vat_number: data.vat_number || null,
      })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ ...parsed, executed: true, result: { created: true } })
    }

    if (action === "add_note") {
      // Chercher le devis le plus récent
      const { data: recentQuote, error: quoteError } = await supabase
        .from("quotes")
        .select("id, internal_notes, title")
        .eq("artisan_id", artisanId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (quoteError || !recentQuote) {
        return NextResponse.json({
          ...parsed,
          executed: false,
          human_summary: "Aucun devis trouvé pour ajouter une note",
        })
      }

      // Formater la note avec Claude
      const fmtMsg = await ai.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: `Tu es un assistant pour artisans. Reformate cette note interne dictée vocalement de manière claire et professionnelle, corrige les fautes, mais conserve exactement le sens. Réponds UNIQUEMENT avec le texte corrigé, sans commentaire.`,
        messages: [{ role: "user", content: data.note }],
      })
      const formattedNote = fmtMsg.content[0]?.type === "text" ? fmtMsg.content[0].text.trim() : data.note

      // Append à notes existantes
      const today = new Date().toLocaleDateString("fr-BE")
      const existing = recentQuote.internal_notes || ""
      const newNotes = existing
        ? `${existing}\n\n---\n${today} : ${formattedNote}`
        : `${today} : ${formattedNote}`

      await supabase.from("quotes").update({ internal_notes: newNotes }).eq("id", recentQuote.id)

      return NextResponse.json({
        ...parsed,
        executed: true,
        result: { quoteTitle: recentQuote.title },
        human_summary: `Note ajoutée au devis "${recentQuote.title}"`,
      })
    }

    // send_email, create_quote, unknown → retourner sans exécuter
    return NextResponse.json({ ...parsed, executed: false })

  } catch (error) {
    console.error("agent error:", error)
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 })
  }
}
