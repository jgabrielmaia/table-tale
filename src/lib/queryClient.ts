import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => failureCount < 2 && !/permiss|não encontrado/i.test(String(error)),
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });
}
