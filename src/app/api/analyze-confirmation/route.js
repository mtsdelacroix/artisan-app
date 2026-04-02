import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Analyse une réponse vocale de confirmation (oui/non/correction)
// Entrée : { question, originalValue, userResponse }
// Sortie : { confirmed: bool, correctedValue: string }

export async function POST(request) {
  try {
    const { question, originalValue, userResponse } = await request.json()

    if (!userResponse || !originalValue) {
      return Response.json({ confirmed: true, correctedValue: originalValue })
    }

    const systemPrompt = `Tu analyses une réponse vocale de confirmation. L'utilisateur devait confirmer ou corriger une valeur.

Règles :
- Si la réponse contient "oui", "ouais", "correct", "c'est ça", "parfait", "ok", "bien", "exactement" → confirmed: true, correctedValue = valeur originale
- Si la réponse contient "non", "faux", "pas", "erreur", ou contient une correction explicite → confirmed: false + extraire la valeur corrigée du texte
- En cas de doute → confirmed: true (ne pas bloquer le flux)

Réponds UNIQUEMENT en JSON brut sans backticks :
{"confirmed": true/false, "correctedValue": "valeur"}`

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 128,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Question posée : "${question}"\nValeur originale : "${originalValue}"\nRéponse utilisateur : "${userResponse}"`,
      }],
    })

    const raw = message.content[0]?.text?.trim() || ""
    let cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1)

    const parsed = JSON.parse(cleaned)
    return Response.json({
      confirmed: Boolean(parsed.confirmed),
      correctedValue: parsed.correctedValue || originalValue,
    })
  } catch {
    // En cas d'erreur on confirme par défaut pour ne pas bloquer
    const { originalValue } = await request.json().catch(() => ({}))
    return Response.json({ confirmed: true, correctedValue: originalValue || "" })
  }
}
