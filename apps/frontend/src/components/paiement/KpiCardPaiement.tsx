interface KpiCardProps {
  label: string;
  value: string;
  icone: React.ReactNode;
  couleur: string;
  bg: string;
}

export default function KpiCardPaiement({ label, value, icone, couleur, bg }: KpiCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg} ${couleur}`}
      >
        {icone}
      </div>
      <div className="min-w-0">
        <p className={`truncate text-sm font-bold tabular-nums ${couleur}`}>{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
