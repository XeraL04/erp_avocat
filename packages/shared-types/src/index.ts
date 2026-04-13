// Types partagés entre frontend et backend

export type Role = 'admin' | 'assistant';

export type TypeClient = 'physique' | 'morale';

export type TypeDossier = 'civil' | 'penal' | 'commercial' | 'administratif' | 'autre';

export type StatutDossier = 'en_cours' | 'suspendu' | 'cloture';

export type StatutPaiement = 'non_paye' | 'partiel' | 'paye';

export type ModePaiement = 'cash' | 'virement' | 'ccp';

export type StatutFacture = 'brouillon' | 'emise' | 'payee';

export type TypeEvenement = 'audience' | 'rdv' | 'rappel';

export type StatutEtape = 'termine' | 'en_attente';

export type TypeDocument = 'contrat' | 'jugement' | 'piece' | 'autre';

// Interface de réponse API standardisée
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
