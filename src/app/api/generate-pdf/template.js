/**
 * Génère le HTML complet d'un devis professionnel.
 * @param {object} quote      - Données du devis (from Supabase)
 * @param {object} artisan    - Données de l'artisan
 * @param {number} quoteNumber - Numéro séquentiel du devis
 */
export function buildQuoteHtml({ quote, artisan, quoteNumber }) {
  const brandColor = artisan.brand_color || "#1e3a5f"
  const year = new Date(quote.created_at).getFullYear()
  const num = String(quoteNumber).padStart(3, "0")
  const quoteRef = `DEV-${year}-${num}`

  const issueDate = new Date(quote.created_at).toLocaleDateString("fr-BE", {
    day: "2-digit", month: "long", year: "numeric",
  })

  const validUntilDate = new Date(
    new Date(quote.created_at).getTime() + (quote.validity_days || 30) * 86400000
  ).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" })

  const items = Array.isArray(quote.items) ? quote.items : []

  const itemRows = items.map((item, i) => `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="td-desc">${escapeHtml(item.label || item.description || "")}</td>
      <td class="td-num">${formatNum(item.quantity)}</td>
      <td class="td-num">${formatNum(item.unit_price)} €</td>
      <td class="td-num td-total">${formatNum(item.quantity * item.unit_price)} €</td>
    </tr>
  `).join("")

  const subtotal = quote.subtotal_excl_vat ?? items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const vat = quote.total_vat ?? items.reduce((s, i) => {
    const rate = (i.vat_rate !== null && i.vat_rate !== undefined) ? i.vat_rate : (quote.vat_rate ?? 21)
    return s + (i.quantity * i.unit_price) * (rate / 100)
  }, 0)
  const total = quote.total_incl_vat ?? subtotal + vat
  const autoliquidationTotal = items.filter(i => i.vat_rate === 0).reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const hasAutoliquidation = autoliquidationTotal > 0

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Devis ${quoteRef}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 13px;
    color: #2d3748;
    background: #fff;
    padding: 40px 48px;
  }

  /* ─── EN-TÊTE ─────────────────────────────────────────── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 36px;
    padding-bottom: 24px;
    border-bottom: 3px solid ${brandColor};
  }

  .company-block .company-name {
    font-size: 22px;
    font-weight: 700;
    color: ${brandColor};
    margin-bottom: 4px;
  }

  .company-block .company-contact {
    font-size: 12px;
    color: #718096;
    line-height: 1.6;
  }

  .quote-ref-block {
    text-align: right;
  }

  .quote-ref-block .ref-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #718096;
    margin-bottom: 4px;
  }

  .quote-ref-block .ref-number {
    font-size: 24px;
    font-weight: 700;
    color: ${brandColor};
  }

  .quote-ref-block .ref-dates {
    font-size: 11px;
    color: #718096;
    margin-top: 6px;
    line-height: 1.7;
  }

  /* ─── BLOCS INFO ──────────────────────────────────────── */
  .info-section {
    display: flex;
    gap: 32px;
    margin-bottom: 32px;
  }

  .info-block {
    flex: 1;
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
  }

  .info-block .block-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #a0aec0;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .info-block p {
    font-size: 13px;
    color: #2d3748;
    line-height: 1.6;
  }

  .info-block .main-name {
    font-weight: 600;
    font-size: 14px;
    color: #1a202c;
  }

  /* ─── TABLEAU DES LIGNES ──────────────────────────────── */
  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #718096;
    font-weight: 600;
    margin-bottom: 10px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }

  thead tr {
    background: ${brandColor};
    color: #fff;
  }

  thead th {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
  }

  thead th.th-num { text-align: right; }

  .row-even { background: #fff; }
  .row-odd  { background: #f7fafc; }

  td { padding: 10px 14px; font-size: 13px; vertical-align: top; }

  .td-desc { color: #2d3748; }
  .td-num  { text-align: right; color: #4a5568; white-space: nowrap; }
  .td-total { font-weight: 600; color: #1a202c; }

  /* ─── RÉCAPITULATIF ───────────────────────────────────── */
  .recap-section {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 32px;
  }

  .recap-table {
    width: 280px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .recap-row {
    display: flex;
    justify-content: space-between;
    padding: 9px 16px;
    font-size: 13px;
    border-bottom: 1px solid #e2e8f0;
  }

  .recap-row:last-child { border-bottom: none; }

  .recap-row .label { color: #718096; }
  .recap-row .value { font-weight: 500; color: #2d3748; }

  .recap-row.total-row {
    background: ${brandColor};
    color: #fff;
  }

  .recap-row.total-row .label,
  .recap-row.total-row .value {
    color: #fff;
    font-weight: 700;
    font-size: 14px;
  }

  /* ─── NOTES ───────────────────────────────────────────── */
  .notes-section {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 24px;
  }

  .notes-section .block-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #a0aec0;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .notes-section p {
    font-size: 12px;
    color: #4a5568;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  /* ─── CONDITIONS ──────────────────────────────────────── */
  .conditions-section {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 40px;
  }

  .conditions-section .block-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #a0aec0;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .conditions-section p {
    font-size: 11px;
    color: #718096;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  /* ─── PIED DE PAGE ────────────────────────────────────── */
  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer p {
    font-size: 11px;
    color: #a0aec0;
  }

  .footer .signature-block {
    text-align: right;
    font-size: 11px;
    color: #a0aec0;
  }

  .footer .signature-line {
    border-bottom: 1px solid #cbd5e0;
    width: 180px;
    margin-top: 28px;
    margin-bottom: 4px;
  }
</style>
</head>
<body>

  <!-- EN-TÊTE -->
  <div class="header">
    <div class="company-block">
      ${artisan.logo_url ? `<div style="margin-bottom:10px;width:140px;height:56px;display:flex;align-items:center;"><img src="${artisan.logo_url}" alt="" style="max-width:140px;max-height:56px;width:auto;height:auto;object-fit:contain;display:block;" /></div>` : ""}
      <div class="company-name">${escapeHtml(artisan.business_name || "")}</div>
      <div class="company-contact">
        ${escapeHtml(artisan.first_name || "")} ${escapeHtml(artisan.last_name || "")}<br/>
        ${artisan.phone ? escapeHtml(artisan.phone) + "<br/>" : ""}
        ${artisan.email ? escapeHtml(artisan.email) : ""}
      </div>
    </div>
    <div class="quote-ref-block">
      <div class="ref-label">Devis</div>
      <div class="ref-number">${quoteRef}</div>
      <div class="ref-dates">
        Émis le : ${issueDate}<br/>
        Valable jusqu'au : ${validUntilDate}
      </div>
    </div>
  </div>

  <!-- INFOS ARTISAN + CLIENT -->
  <div class="info-section">
    <div class="info-block">
      <div class="block-title">Prestataire</div>
      <p class="main-name">${escapeHtml(artisan.business_name || "")}</p>
      <p>${escapeHtml(artisan.first_name || "")} ${escapeHtml(artisan.last_name || "")}</p>
      ${artisan.address_street ? `<p>${escapeHtml(artisan.address_street)}</p>` : ""}
      ${artisan.address_postal_code || artisan.address_city ? `<p>${escapeHtml(artisan.address_postal_code || "")} ${escapeHtml(artisan.address_city || "")}</p>` : ""}
      ${artisan.vat_number ? `<p>TVA : ${escapeHtml(artisan.vat_number)}</p>` : ""}
    </div>
    <div class="info-block">
      <div class="block-title">Client</div>
      <p class="main-name">${escapeHtml(quote.client_name || "")}</p>
      ${quote.client_email ? `<p>${escapeHtml(quote.client_email)}</p>` : ""}
      ${quote.client_phone ? `<p>${escapeHtml(quote.client_phone)}</p>` : ""}
      ${quote.client_address ? `<p>${escapeHtml(quote.client_address)}</p>` : ""}
      ${quote.client_vat_number ? `<p>TVA : ${escapeHtml(quote.client_vat_number)}</p>` : ""}
    </div>
  </div>

  <!-- OBJET DU DEVIS -->
  ${quote.title ? `
  <div style="margin-bottom: 20px;">
    <div class="section-title">Objet</div>
    <p style="font-size: 15px; font-weight: 600; color: #1a202c;">${escapeHtml(quote.title)}</p>
    ${quote.description ? `<p style="font-size: 12px; color: #718096; margin-top: 4px;">${escapeHtml(quote.description)}</p>` : ""}
  </div>
  ` : ""}

  <!-- TABLEAU DES LIGNES -->
  <div class="section-title">Détail des prestations</div>
  <table>
    <thead>
      <tr>
        <th style="width: 55%">Description</th>
        <th class="th-num" style="width: 12%">Qté</th>
        <th class="th-num" style="width: 16%">Prix unit.</th>
        <th class="th-num" style="width: 17%">Total HTVA</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="4" style="text-align:center;color:#a0aec0;padding:20px">Aucune ligne</td></tr>`}
    </tbody>
  </table>

  <!-- RÉCAPITULATIF -->
  <div class="recap-section">
    <div class="recap-table">
      <div class="recap-row">
        <span class="label">Sous-total HTVA</span>
        <span class="value">${formatNum(subtotal)} €</span>
      </div>
      ${hasAutoliquidation ? `
      <div class="recap-row" style="color:#b45309;">
        <span class="label" style="color:#b45309;">Dont autoliquidation (0%)</span>
        <span class="value" style="color:#b45309;">${formatNum(autoliquidationTotal)} €</span>
      </div>` : ""}
      <div class="recap-row">
        <span class="label">TVA</span>
        <span class="value">${formatNum(vat)} €</span>
      </div>
      <div class="recap-row total-row">
        <span class="label">Total TTC</span>
        <span class="value">${formatNum(total)} €</span>
      </div>
    </div>
  </div>

  ${hasAutoliquidation ? `
  <div style="margin-bottom:24px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
    <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#92400e;margin-bottom:4px;">Mention légale TVA</p>
    <p style="font-size:11px;color:#92400e;line-height:1.6;">Autoliquidation — En application de l'article 51 §2 du Code de la TVA belge, la taxe sur la valeur ajoutée est due par le cocontractant.</p>
  </div>` : ""}

  <!-- NOTES -->
  ${quote.notes ? `
  <div class="notes-section">
    <div class="block-title">Notes</div>
    <p>${escapeHtml(quote.notes)}</p>
  </div>
  ` : ""}

  <!-- CONDITIONS GÉNÉRALES -->
  ${quote.conditions ? `
  <div class="conditions-section">
    <div class="block-title">Conditions générales de vente</div>
    <p>${escapeHtml(quote.conditions)}</p>
  </div>
  ` : ""}

  <!-- PIED DE PAGE -->
  <div class="footer">
    <p>Devis généré par ${escapeHtml(artisan.business_name || "Artisan App")} · ${quoteRef}</p>
    <div class="signature-block">
      <div class="signature-line"></div>
      <p>Signature &amp; bon pour accord</p>
    </div>
  </div>

</body>
</html>`
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatNum(n) {
  return (parseFloat(n) || 0).toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
