import { cardShadow } from "@/styles/design-system"

export default function EmptyState({ emoji = "📄", title, subtitle, action, actionLabel, brandColor }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-8 bg-white rounded-2xl"
      style={cardShadow}
    >
      <span className="text-5xl mb-5">{emoji}</span>
      <p className="text-base font-bold text-[#0F172A] text-center tracking-tight">{title}</p>
      {subtitle && <p className="text-sm text-[#94A3B8] mt-1.5 text-center leading-relaxed">{subtitle}</p>}
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-6 inline-flex items-center gap-2 px-6 h-[48px] text-white font-semibold rounded-[14px] text-sm tracking-[0.01em] transition-all duration-150 active:scale-[0.98]"
          style={{ backgroundColor: brandColor || '#2563eb' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
