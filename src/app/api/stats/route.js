import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ACCEPTED_STATUSES = ["accepted", "waiting_deposit", "deposit_received", "in_progress", "waiting_balance", "completed"]

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const accessToken = searchParams.get("accessToken")
  const period = searchParams.get("period") || "3months"

  if (!accessToken) return NextResponse.json({ error: "accessToken requis" }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { data: artisan } = await supabase.from("artisans").select("id").eq("user_id", user.id).single()
  if (!artisan) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 })

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, status, total_incl_vat, created_at, sent_at, viewed_at")
    .eq("artisan_id", artisan.id)
    .neq("status", "draft")
    .gte("created_at", sixMonthsAgo.toISOString())

  const allQuotes = quotes || []

  // Period start for acceptance/distribution KPIs
  let periodStart
  switch (period) {
    case "month": periodStart = new Date(now.getFullYear(), now.getMonth(), 1); break
    case "3months": periodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1); break
    case "year": periodStart = new Date(now.getFullYear(), 0, 1); break
    default: periodStart = sixMonthsAgo
  }

  const periodQuotes = allQuotes.filter(q => new Date(q.created_at) >= periodStart)

  // KPI 1 — CA current month vs previous month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const monthlyRevenue = allQuotes
    .filter(q => ACCEPTED_STATUSES.includes(q.status) && new Date(q.created_at) >= currentMonthStart)
    .reduce((sum, q) => sum + (q.total_incl_vat || 0), 0)

  const prevMonthRevenue = allQuotes
    .filter(q => ACCEPTED_STATUSES.includes(q.status) &&
      new Date(q.created_at) >= prevMonthStart && new Date(q.created_at) <= prevMonthEnd)
    .reduce((sum, q) => sum + (q.total_incl_vat || 0), 0)

  const revenueGrowth = prevMonthRevenue === 0
    ? (monthlyRevenue > 0 ? 100 : 0)
    : Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)

  // KPI 2 — Acceptance rate (period)
  const periodAccepted = periodQuotes.filter(q => ACCEPTED_STATUSES.includes(q.status)).length
  const periodRefused = periodQuotes.filter(q => q.status === "refused").length
  const periodPending = periodQuotes.filter(q => ["sent", "viewed"].includes(q.status)).length
  const acceptanceRate = periodQuotes.length > 0 ? Math.round((periodAccepted / periodQuotes.length) * 100) : 0

  // KPI 3 — All pending quotes (global, not period-filtered)
  const { data: pendingQuotes } = await supabase
    .from("quotes")
    .select("id")
    .eq("artisan_id", artisan.id)
    .in("status", ["sent", "viewed"])

  const waitingQuotes = (pendingQuotes || []).length

  // KPI 4 — Avg view delay (hours)
  const viewedQuotes = allQuotes.filter(q => q.viewed_at && q.sent_at)
  const avgViewHours = viewedQuotes.length > 0
    ? Math.round(viewedQuotes.reduce((sum, q) =>
        sum + (new Date(q.viewed_at) - new Date(q.sent_at)) / 3600000, 0
      ) / viewedQuotes.length * 10) / 10
    : null

  // Bar chart — monthly CA (6 months)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const mQuotes = allQuotes.filter(q => {
      const d = new Date(q.created_at)
      return d >= mStart && d <= mEnd && ACCEPTED_STATUSES.includes(q.status)
    })
    const label = mStart.toLocaleDateString("fr-FR", { month: "short" })
    monthlyData.push({
      month: label.charAt(0).toUpperCase() + label.slice(1, 3),
      revenue: Math.round(mQuotes.reduce((sum, q) => sum + (q.total_incl_vat || 0), 0)),
      count: mQuotes.length,
    })
  }

  // Donut — distribution (period)
  const distributionData = [
    { name: "Acceptés", value: periodAccepted, color: "#16a34a" },
    { name: "Refusés", value: periodRefused, color: "#dc2626" },
    { name: "En attente", value: periodPending, color: "#9ca3af" },
  ].filter(d => d.value > 0)

  return NextResponse.json({
    monthlyRevenue,
    prevMonthRevenue,
    revenueGrowth,
    acceptanceRate,
    waitingQuotes,
    avgViewHours,
    periodTotal: periodQuotes.length,
    monthlyData,
    distributionData,
  })
}
