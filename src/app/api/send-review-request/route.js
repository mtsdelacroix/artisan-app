import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { withRateLimit } from "@/lib/withRateLimit"
import { emailRatelimit } from "@/lib/ratelimit"

export async function POST(request) {
  return withRateLimit(request, emailRatelimit, async (req) => {
    try {
      const { quoteId, accessToken } = await req.json()

      if (!quoteId || !accessToken) {
        return NextResponse.json({ error: "quoteId et accessToken requis" }, { status: 400 })
      }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Clé API Resend non configurée" }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
    }
    if (!quote.client_email) {
      return NextResponse.json({ error: "Email du client manquant" }, { status: 400 })
    }

    const { data: artisan, error: artisanError } = await supabase
      .from("artisans")
      .select("*")
      .eq("id", quote.artisan_id)
      .single()

    if (artisanError || !artisan) {
      return NextResponse.json({ error: "Profil artisan introuvable" }, { status: 404 })
    }

    // Référence devis
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", quote.artisan_id)
      .lte("created_at", quote.created_at)
    const year = new Date(quote.created_at).getFullYear()
    const quoteRef = `DEV-${year}-${String(count ?? 1).padStart(3, "0")}`

    const artisanName = artisan.business_name || `${artisan.first_name} ${artisan.last_name}`
    const brandColor = artisan.brand_color || "#1e3a5f"
    const clientFirstName = quote.client_name?.split(" ")[0] || quote.client_name || ""

    // Marquer le devis comme réalisé
    const now = new Date().toISOString()
    await supabase
      .from("quotes")
      .update({ status: "completed", completed_at: now, review_request_sent_at: now })
      .eq("id", quoteId)

    // Construire l'email selon si google_review_url existe
    const hasGoogleUrl = !!artisan.google_review_url
    const subject = `Merci pour votre confiance${clientFirstName ? ", " + clientFirstName : ""} !`

    const emailHtml = buildReviewHtml({
      artisanName,
      clientName: quote.client_name,
      quoteRef,
      quoteTitle: quote.title,
      brandColor,
      googleReviewUrl: artisan.google_review_url || null,
      artisanEmail: artisan.email || null,
    })

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendError } = await resend.emails.send({
      from: `${artisanName} <onboarding@resend.dev>`,
      to: quote.client_email,
      subject,
      html: emailHtml,
      ...(artisan.email && !hasGoogleUrl ? { replyTo: artisan.email } : {}),
    })

    if (sendError) {
      return NextResponse.json({ error: "Erreur envoi email : " + sendError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("send-review-request error:", error)
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 })
  }
  })
}

function buildReviewHtml({ artisanName, clientName, quoteRef, quoteTitle, brandColor, googleReviewUrl, artisanEmail }) {
  const clientSection = googleReviewUrl
    ? `<p style="margin:0 0 28px;text-align:center;">
         <a href="${googleReviewUrl}" style="display:inline-block;padding:14px 36px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;">
           ⭐ Laisser un avis Google
         </a>
       </p>`
    : `<p style="margin:0 0 28px;font-size:14px;color:#4a5568;line-height:1.7;text-align:center;">
         Vous pouvez nous laisser un avis sur Google ou simplement répondre à cet email —<br>
         votre retour compte beaucoup pour nous.${artisanEmail ? `<br><br><a href="mailto:${artisanEmail}" style="color:${brandColor};font-weight:600;">${artisanEmail}</a>` : ""}
       </p>`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${brandColor};padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:28px;">🎉</p>
            <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${artisanName}</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Chantier terminé · ${quoteRef}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 36px;">
            <p style="margin:0 0 16px;font-size:16px;color:#2d3748;">Bonjour${clientName ? " " + clientName : ""},</p>
            <p style="margin:0 0 20px;font-size:14px;color:#4a5568;line-height:1.7;">
              Nous tenions à vous remercier pour votre confiance dans le cadre de votre projet
              <strong>${quoteTitle || ""}</strong>.<br>
              C'est toujours un plaisir de travailler avec des clients sérieux et attentifs.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#4a5568;line-height:1.7;">
              Si vous avez été satisfait(e) de notre travail, un avis nous aiderait beaucoup à faire connaître notre activité.
              Cela ne prend qu'une minute et ça compte énormément pour nous !
            </p>
            ${clientSection}
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a202c;">${artisanName}</p>
            ${artisanEmail ? `<p style="margin:0;font-size:13px;color:#718096;">${artisanEmail}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafc;padding:14px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">Merci encore pour votre confiance · Artisan App</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
