import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UtilisateurProfil } from '@/types';

interface EtatAuth {
  // accessToken en mémoire uniquement — jamais persisté
  accessToken: string | null;
  // Profil utilisateur persisté en sessionStorage (perdu à la fermeture)
  utilisateur: UtilisateurProfil | null;
  estAuthentifie: boolean;

  // Actions
  connecter: (accessToken: string, utilisateur: UtilisateurProfil) => void;
  deconnecter: () => void;
  definirAccessToken: (token: string) => void;
  definirUtilisateur: (utilisateur: UtilisateurProfil) => void;
}

export const useAuthStore = create<EtatAuth>()(
  persist(
    (set) => ({
      accessToken: null,
      utilisateur: null,
      estAuthentifie: false,

      // Appelé après un login réussi
      connecter: (accessToken, utilisateur) =>
        set({
          accessToken,
          utilisateur,
          estAuthentifie: true,
        }),

      // Appelé après logout ou refresh échoué
      deconnecter: () =>
        set({
          accessToken: null,
          utilisateur: null,
          estAuthentifie: false,
        }),

      // Appelé par l'intercepteur axios après un refresh réussi
      definirAccessToken: (token) => set({ accessToken: token, estAuthentifie: true }),

      // Mise à jour du profil (ex: changement de nom)
      definirUtilisateur: (utilisateur) => set({ utilisateur }),
    }),
    {
      name: 'erp-avocat-auth',
      // sessionStorage — effacé à la fermeture du navigateur
      storage: createJSONStorage(() => sessionStorage),
      // NE PAS persister l'accessToken — il est en mémoire uniquement
      partialize: (state) => ({
        utilisateur: state.utilisateur,
        estAuthentifie: state.estAuthentifie,
      }),
    }
  )
);
