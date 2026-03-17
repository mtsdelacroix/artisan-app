import { cardShadow } from "@/styles/design-system"

export default function StatCard({ label, value, subtext, icon: Icon, brandColor }) {
  return (
    <div
      className="bg-white rounded-2xl p-5 card-hover"
      style={cardShadow}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">{label}</p>
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${brandColor || '#2563eb'}15` }}
          >
            <Icon className="w-[18px] h-[18px]" style={{ color: brandColor || '#2563eb' }} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[#0F172A] tracking-tight">{value}</p>
      {subtext && <p className="text-xs text-[#94A3B8] mt-1.5">{subtext}</p>}
    </div>
  )
}
