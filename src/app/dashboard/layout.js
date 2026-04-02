"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { House, FileText, Users, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import AgentModal from "@/components/AgentModal"

const NAV_ITEMS = [
  { href: "/dashboard",         label: "Dashboard", icon: House },
  { href: "/dashboard/quotes",  label: "Devis",     icon: FileText },
  { href: "/dashboard/clients", label: "Clients",   icon: Users },
  { href: "/dashboard/profile", label: "Profil",    icon: User },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const [brandColor, setBrandColor] = useState("#F59E0B")

  useEffect(() => {
    const loadBrand = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("artisans").select("brand_color").eq("user_id", user.id).single()
      if (data?.brand_color) {
        setBrandColor(data.brand_color)
        document.documentElement.style.setProperty("--brand-color", data.brand_color)
        const hex = data.brand_color.replace("#", "")
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        document.documentElement.style.setProperty("--brand-color-10", `rgba(${r},${g},${b},0.10)`)
        document.documentElement.style.setProperty("--brand-color-30", `rgba(${r},${g},${b},0.30)`)
      }
    }
    loadBrand()
  }, [])

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@400;500;600;700;800&display=swap');

        .nav-tab {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 16px;
          text-decoration: none;
          transition: opacity 0.15s;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-tab:active {
          opacity: 0.7;
        }

        .nav-dot {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #F59E0B;
        }

        .nav-label {
          font-family: 'Figtree', sans-serif;
          font-size: 10px;
          line-height: 1;
          letter-spacing: 0.01em;
          transition: color 0.15s, font-weight 0.15s;
        }
      `}</style>

      <main style={{
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 16,
        paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        maxWidth: 512,
        margin: "0 auto",
        width: "100%",
      }}>
        {children}
      </main>

      <AgentModal />

      {/* Bottom Navigation */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 40,
      }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="nav-tab"
            >
              {active && <span className="nav-dot" />}

              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                style={{
                  color: active ? brandColor : "#94A3B8",
                  transition: "color 0.15s",
                  flexShrink: 0,
                }}
              />

              <span
                className="nav-label"
                style={{
                  color: active ? brandColor : "#94A3B8",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
