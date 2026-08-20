import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { showError } from '../store/toastStore.js';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: showError }),
  mutationCache: new MutationCache({ onError: showError }),
});
