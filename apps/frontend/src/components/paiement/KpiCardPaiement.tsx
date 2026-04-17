import type { ReactNode } from 'react';

// Variantes sémantiques mappées sur les variables CSS du design system
const VARIANTES = {
  success: {
    color: 'var(--color-success)',
    bg: 'color-mix(in oklch, var(--color-success) 12%, transparent)',
  },
  warning: {
    color: 'var(--color-warning)',
    bg: 'color-mix(in oklch, var(--color-warning) 12%, transparent)',
  },
  primary: {
    color: 'var(--color-primary)',
    bg: 'color-mix(in oklch, var(--color-primary) 12%, transparent)',
  },
  muted: {
    color: 'var(--color-text-muted)',
    bg: 'color-mix(in oklch, var(--color-text-muted) 10%, transparent)',
  },
} as const;

export type KpiVariante = keyof typeof VARIANTES;

interface KpiCardProps {
  label: string;
  value: string;
  icone: ReactNode;
  variante: KpiVariante;
}

export default function KpiCardPaiement({ label, value, icone, variante }: KpiCardProps) {
  const { color, bg } = VARIANTES[variante];

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      {/* Icône dans un cercle coloré via variables CSS */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: bg, color }}
        aria-hidden="true"
      >
        {icone}
      </div>

      <div className="min-w-0">
        {/* FIX : title pour éviter la perte silencieuse de données financières */}
        <p className="truncate text-sm font-bold tabular-nums" style={{ color }} title={value}>
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
