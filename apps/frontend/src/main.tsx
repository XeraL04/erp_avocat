import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from './App';
import { AxiosError } from 'axios';
import { Toaster } from '@/components/ui/sonner';

import './index.css';

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // "error" typé unknown → cast AxiosError pour lire .response.status
      retry: (failureCount, error: unknown) => {
        const statut = (error as AxiosError)?.response?.status;
        if (statut === 401 || statut === 403 || statut === 404) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5,
    },
  },
});

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);
