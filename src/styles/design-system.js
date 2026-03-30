// ── Premium Design Tokens (Qonto / Pennylane style) ──

export const DS = {
  // Layout
  page: "min-h-screen bg-[#F7F8FA]",
  container: "max-w-lg mx-auto",

  // Cards — soft shadow, no heavy borders
  card: "bg-white rounded-2xl p-5",
  cardLg: "bg-white rounded-2xl p-6",

  // Typography
  pageTitle: "text-xl font-bold text-[#0F172A] tracking-tight",
  sectionTitle: "text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3",
  bigNumber: "text-4xl font-black text-[#0F172A] tracking-tight",
  body: "text-sm text-[#64748B] leading-relaxed",
  label: "text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-1.5 block",

  // Buttons — 52px height, 14px radius
  btnPrimary: "w-full h-[52px] rounded-[14px] font-semibold text-white text-sm tracking-[0.01em] transition-all duration-150 active:scale-[0.98]",
  btnSecondary: "w-full h-[52px] rounded-[14px] font-semibold text-[#334155] text-sm bg-[#F1F5F9] tracking-[0.01em] transition-all duration-150 active:scale-[0.98] hover:bg-[#E2E8F0]",
  btnDanger: "w-full h-[52px] rounded-[14px] font-semibold text-[#EF4444] text-sm bg-[#FEF2F2] tracking-[0.01em] transition-all duration-150 active:scale-[0.98] hover:bg-[#FEE2E2]",
  btnIcon: "w-10 h-10 rounded-xl flex items-center justify-center bg-[#F1F5F9] transition-all duration-150 active:scale-95 hover:bg-[#E2E8F0]",

  // Inputs — 52px height, 12px radius
  input: "w-full h-[52px] px-4 rounded-xl border-[1.5px] border-[#E8ECF0] text-sm bg-[#FAFAFA] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[var(--brand-color)] focus:shadow-[0_0_0_3px_var(--brand-color-10)] transition-all duration-150",
  textarea: "w-full px-4 py-3.5 rounded-xl border-[1.5px] border-[#E8ECF0] text-sm bg-[#FAFAFA] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[var(--brand-color)] focus:shadow-[0_0_0_3px_var(--brand-color-10)] transition-all duration-150 resize-none",

  // Badge
  badge: "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
}

// Card shadow as inline style (CSS variable reference)
export const cardShadow = { boxShadow: "var(--shadow-card)" }
export const cardHoverShadow = { boxShadow: "var(--shadow-card-hover)" }
export const dropdownShadow = { boxShadow: "var(--shadow-dropdown)" }
