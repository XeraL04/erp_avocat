import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Users, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { getTenantDetail } from '@/api/superadmin.api';
import {
  couleurStatutTenant,
  libellePlan,
  formaterDate,
} from '@/lib/utils';

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['superadmin', 'tenant', id],
    queryFn: () => getTenantDetail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      {/* Navigation retour */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/superadmin/tenants')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{tenant.nom}</h2>
          <p className="text-sm text-muted-foreground">slug : {tenant.slug}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={couleurStatutTenant(tenant.statut)}>
            {tenant.statut}
          </Badge>
          <Badge variant="outline">{libellePlan(tenant.plan)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Informations du cabinet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              {tenant.email}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              {tenant.telephone}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-muted-foreground">Début essai</p>
                <p className="font-medium">
                  {tenant.dateDebutEssai
                    ? formaterDate(tenant.dateDebutEssai)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Fin essai</p>
                <p className="font-medium">
                  {tenant.dateFinEssai
                    ? formaterDate(tenant.dateFinEssai)
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compteurs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilisation du plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Dossiers</span>
                <span className="font-medium">
                  {tenant.compteurs.dossiers} /{' '}
                  {tenant.limites.maxDossiers === -1
                    ? '∞'
                    : tenant.limites.maxDossiers}
                </span>
              </div>
              {tenant.limites.maxDossiers !== -1 && (
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (tenant.compteurs.dossiers /
                          tenant.limites.maxDossiers) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Utilisateurs</span>
                <span className="font-medium">
                  {tenant.compteurs.utilisateurs} /{' '}
                  {tenant.limites.maxUtilisateurs === -1
                    ? '∞'
                    : tenant.limites.maxUtilisateurs}
                </span>
              </div>
              {tenant.limites.maxUtilisateurs !== -1 && (
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (tenant.compteurs.utilisateurs /
                          tenant.limites.maxUtilisateurs) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilisateurs du cabinet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Utilisateurs ({tenant.utilisateurs?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tenant.utilisateurs?.length ? (
            <p className="text-sm text-muted-foreground">
              Aucun utilisateur dans ce cabinet.
            </p>
          ) : (
            <div className="space-y-2">
              {tenant.utilisateurs.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{u.nom}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {u.role}
                    </Badge>
                    {!u.actif && (
                      <Badge variant="destructive">Inactif</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}