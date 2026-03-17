import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { rawText, context } = await request.json()
    if (!rawText) return NextResponse.json({ error: "rawText manquant" }, { status: 400 })

    const ctx = context || {}
    const contextInfo = [
      ctx.clientName ? `Destinataire : ${ctx.clientName}` : null,
      ctx.artisanName ? `Artisan : ${ctx.artisanName}` : null,
      ctx.quoteNumber ? `Numéro de devis : ${ctx.quoteNumber}` : null,
    ].filter(Boolean).join(" | ")

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `Tu es un assistant pour artisans belges. L'artisan t'envoie un message d'accompagnement pour un devis, dicté vocalement avec possibles fautes de transcription ou d'orthographe.${contextInfo ? `\n\nContexte : ${contextInfo}.` : ""}

Reformate ce message de manière professionnelle et chaleureuse, corrige les fautes, structure correctement les paragraphes. Conserve exactement le sens et les informations. Le ton doit être professionnel mais humain, pas trop formel.

Réponds UNIQUEMENT avec le texte corrigé et formaté, sans commentaire, sans guillemets, sans explication.`,
      messages: [{ role: "user", content: rawText }],
    })

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : rawText
    return NextResponse.json({ text })
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 })
  }
}
