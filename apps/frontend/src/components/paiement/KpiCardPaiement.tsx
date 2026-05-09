import type { ReactNode } from 'react';

const VARIANTES = {
  success: {
    color: 'var(--color-success)',
    bg: 'color-mix(in oklch, var(--color-success) 10%, transparent)',
  },
  warning: {
    color: 'var(--color-warning)',
    bg: 'color-mix(in oklch, var(--color-warning) 10%, transparent)',
  },
  primary: {
    color: 'var(--color-primary)',
    bg: 'color-mix(in oklch, var(--color-primary) 10%, transparent)',
  },
  muted: {
    color: 'var(--color-text-muted)',
    bg: 'color-mix(in oklch, var(--color-text-muted) 8%, transparent)',
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
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      {/* Icône */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: bg, color }}
        aria-hidden="true"
      >
        {icone}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold tabular-nums leading-tight"
          style={{ color }}
          title={value}
        >
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}
