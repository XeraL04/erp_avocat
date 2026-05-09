import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Building2, Check, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { listerInstitutionsPersonnalisees } from '@/api/institutionPersonnalisee.api';

interface Props {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function InputInstitution({ value, onChange, disabled }: Props) {
  const [saisie, setSaisie] = useState(value);
  const [ouvert, setOuvert] = useState(false);
  const [focusList, setFocusList] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [recherche] = useDebounce(saisie, 250);

  // Sync valeur externe → saisie locale
  useEffect(() => {
    setSaisie(value);
  }, [value]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['institutions-personnalisees', recherche],
    queryFn: () => listerInstitutionsPersonnalisees(recherche),
    enabled: ouvert,
    staleTime: 30_000,
  });

  // Fermer en cliquant dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOuvert(false);
        setFocusList(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectionner = (nom: string) => {
    setSaisie(nom);
    onChange(nom);
    setOuvert(false);
    setFocusList(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!ouvert || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusList((i) => Math.min(i + 1, afficher.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusList((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusList >= 0) {
      e.preventDefault();
      selectionner(afficher[focusList]);
    } else if (e.key === 'Escape') {
      setOuvert(false);
      setFocusList(-1);
    }
  };

  // Suggestions filtrées — exclure la valeur exacte déjà saisie
  const afficher = suggestions.filter((s) => s.toLowerCase() !== saisie.toLowerCase().trim());

  const estNouvelle =
    saisie.trim() && !suggestions.some((s) => s.toLowerCase() === saisie.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      {/* Input avec icône */}
      <div className="relative">
        <Building2
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={saisie}
          disabled={disabled}
          placeholder="ex : Tribunal de Skikda"
          className="h-9 pl-9 text-sm"
          onChange={(e) => {
            setSaisie(e.target.value);
            onChange(e.target.value);
            setOuvert(true);
            setFocusList(-1);
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={ouvert && afficher.length > 0}
          aria-haspopup="listbox"
        />
      </div>

      {/* ── Dropdown suggestions ──────────────────────────────── */}
      {ouvert && afficher.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border/60 bg-popover shadow-md">
          <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
            {afficher.map((nom, i) => (
              <li
                key={nom}
                role="option"
                aria-selected={i === focusList}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                  i === focusList
                    ? 'bg-accent text-accent-foreground'
                    : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectionner(nom);
                }}
              >
                {/* Check si déjà sélectionnée, sinon Building2 discret */}
                {nom === value ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <Building2
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                )}
                {nom}
              </li>
            ))}
          </ul>

          {/* Pied de dropdown — raccourcis clavier */}
          <div className="border-t border-border/60 px-3 py-1.5">
            <p className="text-xs text-muted-foreground/70">
              ↵ Valider · ↑↓ Naviguer · Échap Fermer
            </p>
          </div>
        </div>
      )}

      {/* ── Hint "sera enregistrée" ────────────────────────────── */}
      {estNouvelle && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />
          Cette institution sera enregistrée pour les prochains dossiers.
        </p>
      )}
    </div>
  );
}
