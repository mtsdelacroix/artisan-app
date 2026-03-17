import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { clientName, clientEmail, subject, message, accessToken } = await request.json()

    if (!clientEmail || !message || !accessToken) {
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

    const { data: artisan } = await supabase
      .from("artisans")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!artisan) return NextResponse.json({ error: "Artisan introuvable" }, { status: 404 })

    // Reformater le message avec Claude
    const fmtMsg = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `Tu es un assistant pour artisans belges. Reformate ce message en email professionnel concis. Commence directement par le corps du message (sans "Bonjour" ni signature, l'artisan les gère). Corrige les fautes, améliore le style, mais conserve exactement les informations. Réponds UNIQUEMENT avec le texte reformaté, sans commentaire.`,
      messages: [{ role: "user", content: message }],
    })
    const formattedMessage = fmtMsg.content[0]?.type === "text" ? fmtMsg.content[0].text.trim() : message

    const brandColor = artisan.brand_color || "#2563eb"
    const artisanName = artisan.business_name || `${artisan.first_name || ""} ${artisan.last_name || ""}`.trim()
    const emailSubject = subject || `Message de ${artisanName}`

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${brandColor};padding:28px 40px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${artisanName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:15px;color:#2d3748;">Bonjour${clientName ? ` ${clientName}` : ""},</p>
            <p style="margin:0 0 28px;font-size:14px;color:#4a5568;line-height:1.8;white-space:pre-wrap;">${formattedMessage}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
            <p style="margin:0;font-size:13px;color:#718096;">${artisanName}</p>
            ${artisan.phone ? `<p style="margin:4px 0 0;font-size:12px;color:#a0aec0;">${artisan.phone}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafc;padding:14px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">Message envoyé via Artisan App</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendError } = await resend.emails.send({
      from: `${artisanName} <onboarding@resend.dev>`,
      to: clientEmail,
      ...(artisan.email ? { replyTo: artisan.email } : {}),
      subject: emailSubject,
      html,
    })

    if (sendError) {
      return NextResponse.json({ error: "Erreur envoi : " + sendError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("send-custom-email error:", error)
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 })
  }
}
