export const QUOTE_STATUSES = {
  draft:            { label: "Brouillon",      bg: "bg-gray-100",   text: "text-gray-600"   },
  sent:             { label: "Envoyé",          bg: "bg-blue-100",   text: "text-blue-600"   },
  viewed:           { label: "Vu",              bg: "bg-blue-100",   text: "text-blue-600"   },
  accepted:         { label: "Accepté",         bg: "bg-green-100",  text: "text-green-600"  },
  refused:          { label: "Refusé",          bg: "bg-red-100",    text: "text-red-600"    },
  rejected:         { label: "Refusé",          bg: "bg-red-100",    text: "text-red-600"    },
  waiting_deposit:  { label: "Att. acompte",    bg: "bg-orange-100", text: "text-orange-600" },
  deposit_received: { label: "Acompte reçu",    bg: "bg-orange-100", text: "text-orange-600" },
  in_progress:      { label: "En cours",        bg: "bg-purple-100", text: "text-purple-700" },
  waiting_balance:  { label: "Att. solde",      bg: "bg-yellow-100", text: "text-yellow-700" },
  completed:        { label: "Réalisé",         bg: "bg-green-100",  text: "text-green-600"  },
}

export function getStatusStyle(status) {
  return QUOTE_STATUSES[status] || QUOTE_STATUSES.draft
}
