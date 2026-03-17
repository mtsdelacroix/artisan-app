#!/bin/bash

# Fichier 1 : .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://cevkketcqrxroqmupzbr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldmtrZXRjcXJ4cm9xbXVwemJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTU1MzgsImV4cCI6MjA4ODY3MTUzOH0.mrQiS56Qzs79lmtVwqrVglW9-MmuQ2G6p6TYjtv0oTI
EOF

# Fichier 2 : src/lib/supabase.js
cat > src/lib/supabase.js << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
EOF

# Fichier 3 : src/app/globals.css
cat > src/app/globals.css << 'EOF'
@import "tailwindcss";

:root {
  --color-brand: #1e40af;
  --color-brand-light: #3b82f6;
  --color-brand-dark: #1e3a8a;
  --color-accent: #f59e0b;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: var(--color-gray-50);
  color: var(--color-gray-900);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
EOF

# Fichier 4 : src/app/layout.js
cat > src/app/layout.js << 'EOF'
import "./globals.css";

export const metadata = {
  title: "Artisan App - Generateur de devis intelligent",
  description: "L assistant IA des artisans belges. Generez vos devis en 2 minutes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
EOF

# Fichier 5 : src/app/page.js
cat > src/app/page.js << 'EOF'
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/login")
}
EOF

echo "Tous les fichiers de base sont crees !"
