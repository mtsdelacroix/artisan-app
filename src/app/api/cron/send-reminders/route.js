import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

export async function GET(request) {
  // Sécurité : vérifier le secret Vercel Cron
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquant" }, { status: 500 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY manquant" }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const now = new Date()

  // Récupère tous les devis envoyés, non vus
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("*, artisans(*)")
    .eq("status", "sent")
    .is("viewed_at", null)
    .not("client_email", "is", null)
    .not("sent_at", "is", null)

  if (error) {
    console.error("send-reminders: fetch error", JSON.stringify(error))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent1 = 0, sent2 = 0

  for (const quote of quotes ?? []) {
    const artisan = quote.artisans
    if (!artisan || !quote.token) continue

    const sentAt = new Date(quote.sent_at)
    const daysSinceSent = (now - sentAt) / 86400000
    const artisanName = artisan.business_name || `${artisan.first_name} ${artisan.last_name}`
    const quoteUrl = `${appUrl}/devis/${quote.token}`

    // Calcul référence
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", quote.artisan_id)
      .lte("created_at", quote.created_at)
    const year = new Date(quote.created_at).getFullYear()
    const quoteRef = `DEV-${year}-${String(count ?? 1).padStart(3, "0")}`

    // ── Relance 1 : J+3 ──────────────────────────────────
    if (daysSinceSent >= 3 && !quote.reminder_1_sent_at) {
      const subject = `Votre devis ${quoteRef} est disponible`
      const html = buildReminderHtml({
        artisanName,
        clientName: quote.client_name,
        quoteRef,
        quoteTitle: quote.title,
        quoteUrl,
        isSecond: false,
        brandColor: artisan.brand_color || "#1e3a5f",
      })

      const { error: sendError } = await resend.emails.send({
        from: `${artisanName} <onboarding@resend.dev>`,
        to: quote.client_email,
        subject,
        html,
        ...(artisan.email ? { replyTo: artisan.email } : {}),
      })

      if (!sendError) {
        await supabase.from("quotes").update({ reminder_1_sent_at: now.toISOString() }).eq("id", quote.id)
        sent1++
      }
    }

    // ── Relance 2 : J+7 ──────────────────────────────────
    if (daysSinceSent >= 7 && !quote.reminder_2_sent_at) {
      const subject = `Rappel : votre devis ${quoteRef} vous attend`
      const html = buildReminderHtml({
        artisanName,
        clientName: quote.client_name,
        quoteRef,
        quoteTitle: quote.title,
        quoteUrl,
        isSecond: true,
        brandColor: artisan.brand_color || "#1e3a5f",
      })

      const { error: sendError } = await resend.emails.send({
        from: `${artisanName} <onboarding@resend.dev>`,
        to: quote.client_email,
        subject,
        html,
        ...(artisan.email ? { replyTo: artisan.email } : {}),
      })

      if (!sendError) {
        await supabase.from("quotes").update({ reminder_2_sent_at: now.toISOString() }).eq("id", quote.id)
        sent2++
      }
    }
  }

  return NextResponse.json({ success: true, sent1, sent2, checked: quotes?.length ?? 0 })
}

function buildReminderHtml({ artisanName, clientName, quoteRef, quoteTitle, quoteUrl, isSecond, brandColor }) {
  const greeting = `Bonjour${clientName ? " " + clientName : ""},`
  const body = isSecond
    ? `Nous revenons vers vous au sujet de notre devis <strong>${quoteRef}</strong> — <em>${quoteTitle || ""}</em>.<br>
       N'hésitez pas à nous contacter pour toute question. Ce message est notre dernier rappel, nous restons bien sûr disponibles.`
    : `Avez-vous eu le temps de consulter notre devis <strong>${quoteRef}</strong> — <em>${quoteTitle || ""}</em> ?<br>
       Cliquez sur le bouton ci-dessous pour le consulter et nous donner votre réponse.`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${brandColor};padding:28px 40px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${artisanName}</p>
            <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);">${isSecond ? "Dernier rappel" : "Rappel"} — Devis en attente</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:15px;color:#2d3748;">${greeting}</p>
            <p style="margin:0 0 28px;font-size:14px;color:#4a5568;line-height:1.7;">${body}</p>
            <p style="margin:0 0 32px;text-align:center;">
              <a href="${quoteUrl}" style="display:inline-block;padding:12px 32px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">
                Consulter le devis →
              </a>
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
            <p style="margin:0;font-size:13px;color:#718096;">${artisanName}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafc;padding:14px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">Rappel automatique · ${quoteRef} · Artisan App</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
