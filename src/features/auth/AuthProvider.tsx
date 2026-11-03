import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import * as authApi from './api';
import type { OAuthProvider } from './providers';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  providers: string[];
  signInWithProvider: (provider: OAuthProvider, next?: string) => Promise<void>;
  signInWithMagicLink: (email: string, next?: string) => Promise<void>;
  linkProvider: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setIsLoading(false);
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // User-scoped caches must never leak between accounts.
        queryClient.invalidateQueries();
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    return {
      session,
      user,
      isLoading,
      providers: (user?.identities ?? []).map((i) => i.provider),
      signInWithProvider: authApi.signInWithProvider,
      signInWithMagicLink: authApi.signInWithMagicLink,
      linkProvider: authApi.linkProviderIdentity,
      signOut,
    };
  }, [session, isLoading, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
