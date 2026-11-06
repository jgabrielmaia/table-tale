import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import * as authApi from './api';
import type { OAuthProvider } from './providers';
import { resolveLocalBypass } from './localBypass';

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

  // One automatic dev sign-in per page load; an explicit sign-out must not log straight back in.
  const bypassAttempted = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      let current = data.session;
      const bypass = current || bypassAttempted.current ? null : resolveLocalBypass();
      if (bypass) {
        bypassAttempted.current = true;
        console.info('[auth] LocalAuthBypass active: signing in the local dev account (development + localhost only).');
        const result = await supabase.auth.signInWithPassword(bypass);
        if (result.error) console.warn('[auth] LocalAuthBypass sign-in failed; falling back to the normal login flow.', result.error.message);
        else current = result.data.session;
        if (!active) return;
      }
      setSession(current);
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
    bypassAttempted.current = true;
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
