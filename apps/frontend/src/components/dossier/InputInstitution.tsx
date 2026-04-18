import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Building2, Check } from 'lucide-react';
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
      setFocusList((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusList((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusList >= 0) {
      e.preventDefault();
      selectionner(suggestions[focusList]);
    } else if (e.key === 'Escape') {
      setOuvert(false);
      setFocusList(-1);
    }
  };

  // Suggestions filtrées — exclure la valeur exacte déjà saisie
  const afficher = suggestions.filter((s) => s.toLowerCase() !== saisie.toLowerCase().trim());

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={saisie}
          disabled={disabled}
          placeholder="Ex : Tribunal de Skikda"
          className="pl-9"
          onChange={(e) => {
            setSaisie(e.target.value);
            onChange(e.target.value);
            setOuvert(true);
            setFocusList(-1);
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      {/* Dropdown suggestions */}
      {ouvert && afficher.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
            {afficher.map((nom, i) => (
              <li
                key={nom}
                role="option"
                aria-selected={i === focusList}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                  i === focusList
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => {
                  e.preventDefault(); // évite blur avant click
                  selectionner(nom);
                }}
              >
                <Check
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    nom === value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {nom}
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-2">
            <p className="text-xs text-muted-foreground">↵ Valider · ↑↓ Naviguer · Échap Fermer</p>
          </div>
        </div>
      )}

      {/* Hint "sera enregistré" quand la valeur est nouvelle */}
      {saisie.trim() &&
        !suggestions.some((s) => s.toLowerCase() === saisie.trim().toLowerCase()) && (
          <p className="mt-1 text-xs text-muted-foreground">
            Cette institution sera enregistrée pour les prochains dossiers.
          </p>
        )}
    </div>
  );
}
