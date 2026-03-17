export default function PageHeader({ title, action, actionLabel, actionIcon: ActionIcon, brandColor, children }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{title}</h1>
      {action && (
        <button
          onClick={action}
          className="inline-flex items-center gap-2 px-4 h-10 text-white font-semibold rounded-xl text-sm tracking-[0.01em] transition-all duration-150 active:scale-95"
          style={{ backgroundColor: brandColor || '#2563eb' }}
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {actionLabel}
        </button>
      )}
      {children}
    </div>
  )
}
