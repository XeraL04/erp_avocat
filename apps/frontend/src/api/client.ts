import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

interface RequeteEnAttente {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

let estEnTrainDeRafraichir = false;
let fileAttente: RequeteEnAttente[] = [];

const traiterFileAttente = (erreur: Error | null, nouveauToken = ''): void => {
  fileAttente.forEach((promesse) => {
    if (erreur) {
      promesse.reject(erreur);
    } else {
      promesse.resolve(nouveauToken);
    }
  });
  fileAttente = [];
};

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (erreur) => Promise.reject(erreur)
);

// Routes exclues du mécanisme de refresh automatique
const ROUTES_EXCLUES = ['/auth/login', '/auth/refresh', '/auth/logout'];

apiClient.interceptors.response.use(
  (reponse) => reponse,
  async (erreur: AxiosError) => {
    const requeteOriginale = erreur.config as InternalAxiosRequestConfig & {
      _reessaye?: boolean;
    };

    if (erreur.response?.status !== 401 || requeteOriginale._reessaye) {
      return Promise.reject(erreur);
    }

    // ✅ Exclure login, refresh et logout — laisser l'erreur remonter telle quelle
    if (ROUTES_EXCLUES.some((route) => requeteOriginale.url?.includes(route))) {
      return Promise.reject(erreur);
    }

    if (estEnTrainDeRafraichir) {
      return new Promise<string>((resolve, reject) => {
        fileAttente.push({ resolve, reject });
      }).then((nouveauToken) => {
        if (requeteOriginale.headers) {
          requeteOriginale.headers.Authorization = `Bearer ${nouveauToken}`;
        }
        requeteOriginale._reessaye = true;
        return apiClient(requeteOriginale);
      });
    }

    estEnTrainDeRafraichir = true;
    requeteOriginale._reessaye = true;

    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { accessToken: string };
      }>('/auth/refresh');

      const nouveauToken = data.data.accessToken;
      useAuthStore.getState().definirAccessToken(nouveauToken);
      traiterFileAttente(null, nouveauToken);

      if (requeteOriginale.headers) {
        requeteOriginale.headers.Authorization = `Bearer ${nouveauToken}`;
      }
      return apiClient(requeteOriginale);
    } catch (erreurRefresh) {
      traiterFileAttente(erreurRefresh as Error);
      useAuthStore.getState().deconnecter();
      return Promise.reject(erreurRefresh);
    } finally {
      estEnTrainDeRafraichir = false;
    }
  }
);

export default apiClient;
