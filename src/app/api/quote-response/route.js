import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { withRateLimit } from "@/lib/withRateLimit"
import { generalRatelimit } from "@/lib/ratelimit"

export async function POST(request) {
  return withRateLimit(request, generalRatelimit, async (req) => {
    try {
      const { token, action, message } = await req.json()

    if (!token || !["accepted", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Vérifier que le devis existe et peut encore être répondu
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("token", token)
      .single()

    if (fetchError || !quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
    }

    if (!["sent", "viewed"].includes(quote.status)) {
      return NextResponse.json({ error: "Ce devis a déjà reçu une réponse" }, { status: 409 })
    }

    // Mettre à jour le statut
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: action,
        responded_at: new Date().toISOString(),
        client_message: message || null,
      })
      .eq("token", token)

    if (updateError) {
      return NextResponse.json({ error: "Erreur mise à jour : " + updateError.message }, { status: 500 })
    }

    // Récupérer les infos artisan pour l'email de notification
    const { data: artisan } = await supabase
      .from("artisans")
      .select("*")
      .eq("id", quote.artisan_id)
      .single()

    // Envoyer email de notification à l'artisan
    if (artisan?.email && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const isAccepted = action === "accepted"
      const artisanName = artisan.business_name || `${artisan.first_name} ${artisan.last_name}`

      const subject = isAccepted
        ? `✅ Devis accepté – ${quote.client_name}`
        : `❌ Devis refusé – ${quote.client_name}`

      const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${isAccepted ? "#16a34a" : "#dc2626"};padding:28px 40px;">
            <p style="margin:0;font-size:24px;">
              ${isAccepted ? "✅" : "❌"}
            </p>
            <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff;">
              Devis ${isAccepted ? "accepté" : "refusé"}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;font-size:15px;color:#2d3748;">Bonjour ${artisanName},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.7;">
              <strong>${quote.client_name}</strong> a ${isAccepted ? "accepté" : "refusé"} votre devis.
            </p>
            <table cellpadding="0" cellspacing="0" style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;width:100%;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a0aec0;font-weight:600;">Devis concerné</p>
                  <p style="margin:0 0 2px;font-size:16px;font-weight:700;color:#1e3a5f;">${quote.title}</p>
                  <p style="margin:0 0 2px;font-size:13px;color:#718096;">Client : ${quote.client_name}</p>
                  <p style="margin:0;font-size:13px;color:#718096;">Montant TTC : <strong>${(quote.total_incl_vat || 0).toFixed(2)} €</strong></p>
                </td>
              </tr>
            </table>
            ${message ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#92400e;font-weight:600;">Message du client</p>
              <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">${message}</p>
            </div>
            ` : ""}
            <p style="margin:0;font-size:13px;color:#718096;">Connectez-vous à votre espace Artisan App pour gérer ce devis.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafc;padding:14px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">Artisan App · Notification automatique</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: artisan.email,
        subject,
        html: emailHtml,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("quote-response error:", error)
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 })
  }
  })
}
