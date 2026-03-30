import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { buildQuoteHtml } from "./template.js"
import { withRateLimit } from "@/lib/withRateLimit"
import { pdfRatelimit } from "@/lib/ratelimit"
import puppeteerCore from "puppeteer-core"
import chromium from "@sparticuz/chromium"

const isDev = process.env.NODE_ENV === "development"

async function getBrowser() {
  if (isDev) {
    // En local → puppeteer complet avec browser intégré
    const puppeteer = await import("puppeteer")
    return puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
  }

  // En production Vercel → puppeteer-core + @sparticuz/chromium
  const executablePath = await chromium.executablePath()
  return puppeteerCore.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  })
}

export async function POST(request) {
  return withRateLimit(request, pdfRatelimit, async (req) => {
    try {
      const { quoteId, accessToken } = await req.json()

      if (!quoteId || !accessToken) {
        return NextResponse.json({ error: "quoteId et accessToken requis" }, { status: 400 })
      }

    // Client Supabase authentifié avec le token de l'utilisateur
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )

    // Récupère le devis
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
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

    // Numéro séquentiel : combien de devis cet artisan a créés avant celui-ci (inclus)
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", quote.artisan_id)
      .lte("created_at", quote.created_at)

    const quoteNumber = count ?? 1

    // Génère le HTML
    const html = buildQuoteHtml({ quote, artisan, quoteNumber })

    // Lance Puppeteer et génère le PDF
    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    })

    await browser.close()

    // Nom du fichier
    const year = new Date(quote.created_at).getFullYear()
    const num = String(quoteNumber).padStart(3, "0")
    const filename = `devis-DEV-${year}-${num}.pdf`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error("generate-pdf error:", error)
    return NextResponse.json(
      { error: "Erreur génération PDF : " + error.message },
      { status: 500 }
    )
  }
  })
}
