import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Users,
  Phone,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTable } from '@/components/ui/skeleton-table';

import { listerClients, supprimerClient } from '@/api/client.api';
import { nomAffiche } from '@/lib/utils';
import type { Client, TypeClient } from '@/types';
import DialogCreerClient from '@/components/admin/DialogCreerClient';
import DialogModifierClient from '@/components/admin/DialogModifierClient';

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ClientsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('clients');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  // Config badge type client — traduite
  const TYPE_CLIENT_CONFIG: Record<string, { label: string; varCouleur: string; varBg: string }> = {
    physique: {
      label: t('natural_person'),
      varCouleur: 'var(--status-essai)',
      varBg: 'var(--status-essai-bg)',
    },
    morale: {
      label: t('legal_person'),
      varCouleur: 'var(--plan-pro)',
      varBg: 'var(--plan-pro-bg)',
    },
  };

  // ─── Filtres ────────────────────────────────────────────────────
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState<TypeClient | 'tous'>('tous');
  const [page, setPage] = useState(1);
  const [rechercheDebounced] = useDebounce(recherche, 300);

  // ─── Dialogs ────────────────────────────────────────────────────
  const [dialogCreer, setDialogCreer] = useState(false);
  const [clientAModifier, setClientAModifier] = useState<Client | null>(null);
  const [clientASupprimer, setClientASupprimer] = useState<Client | null>(null);

  // ─── Query ──────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['cabinet', 'clients', rechercheDebounced, filtreType, page],
    queryFn: () =>
      listerClients({
        q: rechercheDebounced || undefined,
        type: filtreType === 'tous' ? undefined : filtreType,
        page,
        limit: 20,
      }),
  });

  const clients = data?.data ?? [];
  const meta = data?.meta;
  const filtresActifs = !!(recherche || filtreType !== 'tous');

  // ─── Suppression ────────────────────────────────────────────────
  const { mutate: supprimer, isPending: suppression } = useMutation({
    mutationFn: () => supprimerClient(clientASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
      toast.success(t('archived'));
      setClientASupprimer(null);
    },
    onError: () => toast.error(tc('error')),
  });

  const reinitialiserFiltres = useCallback(() => {
    setRecherche('');
    setFiltreType('tous');
    setPage(1);
  }, []);

  return (
    <div className="space-y-6 px-1">
      {/* ── En-tête ── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        <div className="space-y-0.5">
          <h2 className="text-xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {meta
              ? estRTL
                ? `${meta.total} ${meta.total > 1 ? 'عملاء' : 'عميل'} في المجموع`
                : `${meta.total} client${meta.total > 1 ? 's' : ''} au total`
              : estRTL
                ? 'إدارة قائمة عملائك'
                : 'Gestion de votre clientèle'}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogCreer(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('new_client')}
        </Button>
      </div>

      {/* ── Filtres ── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-2 sm:flex-row sm:items-center"
        style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}
      >
        {/* Champ recherche */}
        <div className="relative flex-1">
          <Search
            className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground ${estRTL ? 'right-3' : 'left-3'}`}
            aria-hidden="true"
          />
          <Input
            placeholder={t('search_placeholder')}
            className={`h-9 text-sm ${estRTL ? 'pr-8.5 pl-9' : 'pl-8.5 pr-9'}`}
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(1);
            }}
          />
          {recherche && (
            <button
              onClick={() => {
                setRecherche('');
                setPage(1);
              }}
              className={`absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground ${estRTL ? 'left-2.5' : 'right-2.5'}`}
              aria-label={estRTL ? 'مسح البحث' : 'Effacer la recherche'}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtre type */}
        <Select
          value={filtreType}
          onValueChange={(v) => {
            setFiltreType(v as TypeClient | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full text-sm sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">{t('all_types')}</SelectItem>
            <SelectItem value="physique">{t('natural_person')}</SelectItem>
            <SelectItem value="morale">{t('legal_person')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset filtres */}
        {filtresActifs && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={reinitialiserFiltres}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {estRTL ? 'إعادة ضبط' : 'Réinitialiser'}
          </Button>
        )}
      </div>

      {/* ── Liste ── */}
      <div
        className="animate-fade-up opacity-0"
        style={{ animationDelay: '120ms', animationFillMode: 'forwards' }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading && <SkeletonTable />}

            {!isLoading && clients.length === 0 && (
              <EmptyState
                icone={Users}
                titre={filtresActifs ? t('no_clients_filtered') : t('no_clients')}
                description={filtresActifs ? t('no_clients_filtered_desc') : t('no_clients_desc')}
                action={
                  !filtresActifs
                    ? { label: t('new_client'), onClick: () => setDialogCreer(true), icone: Plus }
                    : undefined
                }
              />
            )}

            {!isLoading && clients.length > 0 && (
              <div className="divide-y divide-border">
                {clients.map((client, i) => {
                  const cfgType = TYPE_CLIENT_CONFIG[client.type] ?? {
                    label: client.type,
                    varCouleur: 'var(--muted-foreground)',
                    varBg: 'var(--muted)',
                  };

                  return (
                    <div
                      key={client._id}
                      className="animate-fade-up opacity-0 group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                      style={{
                        animationDelay: `${160 + i * 35}ms`,
                        animationFillMode: 'forwards',
                      }}
                      onClick={() => navigate(`/cabinet/clients/${client._id}`)}
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 transition-all duration-200 group-hover:bg-primary/14 group-hover:scale-105">
                        {client.type === 'morale' ? (
                          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                        ) : (
                          <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                        )}
                      </div>

                      {/* Infos */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{nomAffiche(client)}</p>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {client.telephone}
                          </span>
                          {client.email && (
                            <span className="hidden truncate sm:block">{client.email}</span>
                          )}
                        </div>
                      </div>

                      {/* Badge type */}
                      <span
                        className="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex"
                        style={{ color: cfgType.varCouleur, backgroundColor: cfgType.varBg }}
                      >
                        {cfgType.label}
                      </span>

                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`${tc('actions')} ${nomAffiche(client)}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={estRTL ? 'start' : 'end'} className="w-40">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setClientAModifier(client);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            {tc('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClientASupprimer(client);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {estRTL ? 'أرشفة' : 'Archiver'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {tc('page')} {meta.page} {tc('of')} {meta.totalPages}
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                {meta.total}{' '}
                {estRTL
                  ? meta.total > 1
                    ? 'عملاء'
                    : 'عميل'
                  : `client${meta.total > 1 ? 's' : ''}`}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label={estRTL ? 'الصفحة السابقة' : 'Page précédente'}
                >
                  {estRTL ? (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label={estRTL ? 'الصفحة التالية' : 'Page suivante'}
                >
                  {estRTL ? (
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Dialogs ── */}
      <DialogCreerClient ouvert={dialogCreer} onFermer={() => setDialogCreer(false)} />

      {clientAModifier && (
        <DialogModifierClient client={clientAModifier} onFermer={() => setClientAModifier(null)} />
      )}

      {/* AlertDialog suppression */}
      <AlertDialog open={!!clientASupprimer} onOpenChange={(o) => !o && setClientASupprimer(null)}>
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{clientASupprimer && nomAffiche(clientASupprimer)}</strong>{' '}
              {t('delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppression}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={suppression} onClick={() => supprimer()}>
                {suppression
                  ? estRTL
                    ? 'جاري الأرشفة…'
                    : 'Archivage…'
                  : estRTL
                    ? 'أرشفة'
                    : 'Archiver'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
