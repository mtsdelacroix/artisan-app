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
  const [brandColor, setBrandColor] = useState("#2563eb")

  // Load brand_color and set as CSS variable
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
      <main style={{paddingLeft: '20px', paddingRight: '20px', paddingTop: '16px', paddingBottom: '112px', maxWidth: '512px', margin: '0 auto', width: '100%'}}>
        {children}
      </main>
      <AgentModal />

      {/* Bottom Navigation — glassmorphism */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bottom-nav"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center gap-1 px-4 py-1.5 transition-all duration-150"
              >
                {/* Active dot indicator */}
                {active && (
                  <span
                    className="absolute -top-0.5 w-1 h-1 rounded-full"
                    style={{ backgroundColor: brandColor }}
                  />
                )}
                <Icon
                  className="w-5 h-5 transition-colors duration-150"
                  style={{ color: active ? brandColor : "#94A3B8" }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className="text-[10px] transition-colors duration-150"
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
        </div>
      </nav>
    </>
  )
}
