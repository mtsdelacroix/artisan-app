import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { rawText } = await request.json()
    if (!rawText) return NextResponse.json({ error: "rawText manquant" }, { status: 400 })

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `Tu es un assistant pour artisans. L'artisan t'envoie une note interne dictée vocalement, avec possibles fautes de transcription ou d'orthographe. Reformate ce texte de manière claire et professionnelle, corrige les fautes, mais conserve exactement le sens et les informations. Réponds UNIQUEMENT avec le texte corrigé, sans commentaire, sans guillemets, sans explication.`,
      messages: [{ role: "user", content: rawText }],
    })

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : rawText
    return NextResponse.json({ text })
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 })
  }
}
