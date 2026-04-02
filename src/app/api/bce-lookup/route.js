// API BCE (Banque Carrefour des Entreprises)
// Lookup par numéro TVA (BE0123456789) ou nom d'entreprise

function formatKBOResponse(data, isSingle) {
  const items = isSingle ? [data] : (Array.isArray(data) ? data : data?.results || [])
  return items
    .filter(Boolean)
    .map(company => ({
      name: company.name || company.denomination || "",
      vat: company.enterprise_number
        ? "BE" + String(company.enterprise_number).replace(/[^0-9]/g, "")
        : (company.vat_number || ""),
      address: [
        company.street,
        company.house_number,
        company.zip && company.city ? `${company.zip} ${company.city}` : (company.city || ""),
      ].filter(Boolean).join(", "),
      legal_form: company.juridical_form || company.legal_form || "",
      active: company.status === "Active" || company.active === true,
    }))
    .filter(c => c.name)
}

function formatBOSAResponse(data) {
  // BOSA format varies — normalise
  const items = Array.isArray(data)
    ? data
    : (data?.enterprises || data?.results || (data?.enterprise_number ? [data] : []))
  return items
    .filter(Boolean)
    .map(e => {
      const name =
        e.denominations?.find(d => d.language === "FR")?.denomination ||
        e.denominations?.[0]?.denomination ||
        e.name || ""
      const addr = e.addresses?.[0]
      const address = addr
        ? [addr.street_fr || addr.street, addr.house_number, addr.zipcode && addr.municipality_fr ? `${addr.zipcode} ${addr.municipality_fr}` : ""].filter(Boolean).join(", ")
        : ""
      return {
        name,
        vat: e.enterprise_number ? "BE" + String(e.enterprise_number).replace(/[^0-9]/g, "") : "",
        address,
        legal_form: e.juridical_form || "",
        active: e.status === "Active" || !e.status,
      }
    })
    .filter(c => c.name)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  if (!query || query.trim().length < 2) {
    return Response.json([], { status: 200 })
  }

  const cleanQuery = query.replace(/[\s.]/g, "").toUpperCase()
  const isVatNumber = /^(BE)?0[0-9]{9}$/.test(cleanQuery)

  // Essai primaire : kbodata.app
  try {
    let url
    if (isVatNumber) {
      const vatNumber = cleanQuery.replace(/^BE/, "")
      url = `https://api.kbodata.app/company/${vatNumber}`
    } else {
      url = `https://api.kbodata.app/search?q=${encodeURIComponent(query.trim())}&limit=5`
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    })

    if (res.ok) {
      const data = await res.json()
      const formatted = formatKBOResponse(data, isVatNumber)
      if (formatted.length > 0) return Response.json(formatted)
    }
  } catch {
    // Timeout ou erreur réseau → fallback
  }

  // Fallback : BOSA open data
  try {
    const cleanVat = cleanQuery.replace(/^BE/, "")
    const bceUrl = isVatNumber
      ? `https://opendata.bosa.be/api/bce/v2/enterprise/${cleanVat}`
      : `https://opendata.bosa.be/api/bce/v2/search?q=${encodeURIComponent(query.trim())}&lang=fr&limit=5`

    const bceRes = await fetch(bceUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    })

    if (bceRes.ok) {
      const bceData = await bceRes.json()
      const formatted = formatBOSAResponse(bceData)
      if (formatted.length > 0) return Response.json(formatted)
    }
  } catch {
    // Silencieux
  }

  return Response.json([])
}
