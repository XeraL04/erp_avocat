import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypeDocument = 'contrat' | 'jugement' | 'piece' | 'autre';

export interface DocumentFichier {
  _id: string;
  nom: string;
  type: TypeDocument;
  url: string; // "uploads/tenantId/filename.pdf"
  cloudinaryId: string; // nom de fichier local (MVP)
  taille: number; // en bytes
  description?: string;
  dossier: { _id: string; reference: string; titre: string; type: string };
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentPayload {
  fichier: File;
  nom: string;
  type: TypeDocument;
  dossierId: string;
  description?: string;
}

export interface ParamsDocuments {
  type?: TypeDocument;
  page?: number;
  limit?: number;
}

export interface ReponsePagineeDocuments {
  documents: DocumentFichier[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** GET /cabinet/dossiers/:id/documents */
export async function listerDocumentsDossier(dossierId: string): Promise<DocumentFichier[]> {
  const res = await apiClient.get<{ success: true; data: { documents: DocumentFichier[] } }>(
    `/cabinet/dossiers/${dossierId}/documents`
  );
  return res.data.data.documents;
}

export async function listerTousDocuments(
  params?: ParamsDocuments
): Promise<ReponsePagineeDocuments> {
  const res = await apiClient.get<{
    success: true;
    data: { documents: DocumentFichier[] };
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>('/cabinet/documents', { params });

  return {
    documents: res.data.data.documents,
    meta: res.data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/** POST /cabinet/documents/upload — multipart/form-data, champ "fichier" */
export async function uploadDocument(payload: UploadDocumentPayload): Promise<DocumentFichier> {
  const formData = new FormData();
  formData.append('fichier', payload.fichier);
  formData.append('nom', payload.nom);
  formData.append('type', payload.type);
  formData.append('dossierId', payload.dossierId);
  if (payload.description) formData.append('description', payload.description);

  // Ne pas forcer Content-Type : Axios set le boundary automatiquement
  const res = await apiClient.post<{ success: true; data: { document: DocumentFichier } }>(
    '/cabinet/documents/upload',
    formData,
    {
      headers: { 'Content-Type': undefined }, // ← supprime le application/json par défaut
    }
  );
  return res.data.data.document;
}

/** DELETE /cabinet/documents/:id — admin uniquement */
export async function supprimerDocument(id: string): Promise<void> {
  await apiClient.delete(`/cabinet/documents/${id}`);
}

/**
 * Construit l'URL complète pour visualiser / télécharger un fichier.
 * Le backend sert les uploads via express.static('/uploads').
 * urlRelative = "uploads/tenantId/filename.pdf"
 */
export function construireUrlDocument(urlRelative: string): string {
  // Normalise le chemin : retire les slashes en début, backslashes Windows, puis remet un /
  const chemin = urlRelative
    .replace(/\\/g, '/') // backslashes Windows → slash
    .replace(/^\/+/, ''); // retire le(s) slash(es) initiaux s'il y en a

  return `/${chemin}`; // toujours une seule barre → /uploads/tenantId/file.pdf
}
