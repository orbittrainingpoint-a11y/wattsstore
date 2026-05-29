'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { User } from '@/types';

/** Current user via /auth/me. Returns null when unauthenticated. */
export function useAuth() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await api.get<User | null>('/auth/me')).data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60_000,
  });

  const logout = async () => {
    await api.post('/auth/logout');
    qc.setQueryData(['me'], null);
    qc.invalidateQueries();
  };

  return { user: data ?? null, isLoading, logout, refresh: () => qc.invalidateQueries({ queryKey: ['me'] }) };
}
