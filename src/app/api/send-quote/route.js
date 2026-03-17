import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { buildQuoteHtml } from "../generate-pdf/template.js"

const LOCAL_CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Users/admin/Desktop/Google Chrome.app/Contents/MacOS/Google Chrome"

async function getBrowser() {
  if (process.env.NODE_ENV === "production") {
    const chromium = (await import("@sparticuz/chromium")).default
    const puppeteer = (await import("puppeteer-core")).default
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
  }

  const puppeteer = (await import("puppeteer-core")).default
  return puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: LOCAL_CHROME_PATH,
    headless: true,
  })
}

export async function POST(request) {
  try {
    const { quoteId, accessToken, message } = await request.json()

    if (!quoteId || !accessToken) {
      return NextResponse.json({ error: "quoteId et accessToken requis" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Clé API Resend non configurée" }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Client Supabase authentifié avec le token de l'utilisateur
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )

    // Récupère le devis
    let { data: quote, error: quoteError } = await supabase
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

    // Générer un token si le devis n'en a pas encore
    if (!quote.token) {
      const newToken = crypto.randomUUID()
      await supabase.from("quotes").update({ token: newToken }).eq("id", quoteId)
      quote = { ...quote, token: newToken }
    }

    // Récupère le profil artisan
    const { data: artisan, error: artisanError } = await supabase
      .from("artisans")
      .select("*")
      .eq("id", quote.artisan_id)
      .single()

    if (artisanError || !artisan) {
      return NextResponse.json({ error: "Profil artisan introuvable" }, { status: 404 })
    }

    // Numéro séquentiel du devis
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", quote.artisan_id)
      .lte("created_at", quote.created_at)

    const quoteNumber = count ?? 1
    const year = new Date(quote.created_at).getFullYear()
    const num = String(quoteNumber).padStart(3, "0")
    const quoteRef = `DEV-${year}-${num}`
    const filename = `devis-${quoteRef}.pdf`

    // URLs pour les boutons du client
    const quoteUrl    = `${appUrl}/devis/${quote.token}`
    const acceptUrl   = `${appUrl}/devis/${quote.token}?action=accept`
    const rejectUrl   = `${appUrl}/devis/${quote.token}?action=reject`

    // Génère le PDF via Puppeteer
    const html = buildQuoteHtml({ quote, artisan, quoteNumber })
    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    })
    await browser.close()

    // Résoudre le message final : customMessage > default_message artisan > texte standard
    const resolvedMessage = message || artisan.default_message || null

    const artisanName = artisan.business_name || `${artisan.first_name} ${artisan.last_name}`
    const artisanEmail = artisan.email || "devis@artisan-app.be"
    const fromAddress = `${artisanName} <onboarding@resend.dev>`

    const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${artisanName}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a8c4e0;">Devis professionnel</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:15px;color:#2d3748;">Bonjour${quote.client_name ? " " + quote.client_name : ""},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.7;">
              ${resolvedMessage ? `${resolvedMessage.replace(/\n/g, "<br>")}` : `Veuillez trouver ci-joint votre devis <strong>${quoteRef}</strong> — <em>${quote.title}</em>.<br>Vous pouvez également le consulter en ligne et y répondre directement.`}
            </p>
            <!-- Ref box -->
            <table cellpadding="0" cellspacing="0" style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;width:100%;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a0aec0;font-weight:600;">Référence</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e3a5f;">${quoteRef}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#718096;">${quote.title}</p>
                </td>
              </tr>
            </table>

            <!-- Lien voir en ligne -->
            <p style="margin:0 0 20px;text-align:center;">
              <a href="${quoteUrl}" style="display:inline-block;padding:10px 24px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
                Voir le devis en ligne
              </a>
            </p>

            <!-- Boutons accepter / refuser -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;width:100%;">
              <tr>
                <td style="padding:0 8px 0 0;width:50%;">
                  <a href="${acceptUrl}" style="display:block;padding:12px 0;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;text-align:center;">
                    ✅ Accepter le devis
                  </a>
                </td>
                <td style="padding:0 0 0 8px;width:50%;">
                  <a href="${rejectUrl}" style="display:block;padding:12px 0;background:#ffffff;color:#4a5568;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;text-align:center;border:1px solid #e2e8f0;">
                    ❌ Refuser le devis
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:12px;color:#a0aec0;text-align:center;">
              Le PDF est également disponible en pièce jointe.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a202c;">${artisanName}</p>
            ${artisan.phone ? `<p style="margin:0 0 2px;font-size:13px;color:#718096;">${artisan.phone}</p>` : ""}
            <p style="margin:0;font-size:13px;color:#718096;">${artisanEmail}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafc;padding:16px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">Email généré par Artisan App · ${quoteRef}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: quote.client_email,
      subject: `Votre devis – ${quote.title} – ${quoteRef}`,
      html: emailHtml,
      attachments: [{ filename, content: Buffer.from(pdfBuffer).toString("base64") }],
    })

    if (sendError) {
      return NextResponse.json({ error: "Erreur envoi email : " + sendError.message }, { status: 500 })
    }

    // Mise à jour du statut
    await supabase
      .from("quotes")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", quoteId)

    return NextResponse.json({ success: true, quoteRef })
  } catch (error) {
    console.error("send-quote error:", error)
    return NextResponse.json(
      { error: "Erreur serveur : " + error.message },
      { status: 500 }
    )
  }
}
